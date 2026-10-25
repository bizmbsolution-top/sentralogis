import { NextRequest, NextResponse } from 'next/server';
import { CopilotEngine } from '@/src/platforms/copilot/engine/CopilotEngine';
import { OperationalContext } from '@/src/platforms/copilot/context/OperationalContext';
import { TenantContext } from '@/src/platforms/copilot/context/TenantContext';
import { UserContext } from '@/src/platforms/copilot/context/UserContext';
import { PermissionContext } from '@/src/platforms/copilot/context/PermissionContext';
import { ConversationContext } from '@/src/platforms/copilot/context/ConversationContext';
import { WorkspaceContext } from '@/src/platforms/copilot/context/WorkspaceContext';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { assertPermission } from '@/lib/application/identity/resolver';
import { createFoundationContext } from '@/lib/copilot/foundation/integration';
import { OperationalSummaryProvider } from '@/lib/copilot/read/summary-provider';
import { ConversationService } from '@/lib/copilot/conversation/service';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function POST(req: NextRequest) {
  try {
    const ctx = await resolveSessionIdentity(null, req);
    assertPermission(ctx, 'copilot:read');

    const body = await req.json();
    const { 
      message, 
      activeContext = {},
      image = null,
      conversationId: reqConversationId = null,
      idempotencyKey = null,
    } = body;

    let inputText = message || '';

    if (image && image.filename && image.data) {
      if (process.env.NODE_ENV !== 'production') {
        const { MockVisionAdapter } = await import(
          '@/src/platforms/copilot/intelligence/adapters/MockVisionAdapter'
        );
        const extractedText = await MockVisionAdapter.extractTextFromImage(
          image.filename,
          image.mimeType || 'image/png',
          image.data
        );
        inputText += `\n[SYSTEM ENRICHED OCR TEXT FROM ${image.filename}]:\n${extractedText}`;
      }
    }

    if (!inputText.trim()) {
      return NextResponse.json({ error: 'Message or image required' }, { status: 400 });
    }

    // Determine target persistent conversation ID (if enabled / provided)
    let persistentConversationId: string | null = reqConversationId || activeContext.conversationId || null;

    // Persist incoming user message if conversation ID and idempotency key are provided
    if (persistentConversationId && idempotencyKey) {
      try {
        await ConversationService.appendUserMessage(ctx, {
          conversationId: persistentConversationId,
          content: inputText,
          idempotencyKey,
          language: 'id',
        });
      } catch (persistErr) {
        // If conversation not found or access denied, log warning and continue without failing whole request
        console.warn('[Copilot API] Failed to persist user message:', persistErr);
      }
    }

    const foundationContext = createFoundationContext(ctx);

    let userFullName: string | null = null;
    try {
      const { data: tu } = await (supabaseAdmin as any)
        .from('tenant_users')
        .select('full_name')
        .eq('user_id', ctx.userId)
        .eq('tenant_id', ctx.tenantId)
        .maybeSingle();
      if (tu?.full_name?.trim()) {
        userFullName = tu.full_name.trim();
      } else {
        const { data: prof } = await (supabaseAdmin as any)
          .from('profiles')
          .select('full_name')
          .eq('id', ctx.userId)
          .maybeSingle();
        if (prof?.full_name?.trim()) {
          userFullName = prof.full_name.trim();
        }
      }
    } catch {
      // Continue without failing
    }

    const context = OperationalContext.create({
      tenant: TenantContext.create({ id: foundationContext.identity.tenantId, timezone: 'Asia/Jakarta' }),
      user: UserContext.create({
        id: foundationContext.identity.userId,
        displayName: userFullName || foundationContext.identity.userId,
        roles: [foundationContext.identity.role],
      }),
      permissions: PermissionContext.create(ctx.permissions || []),
      conversation: ConversationContext.create({
        conversationId: persistentConversationId || 'default-session',
        conversationMemory: activeContext.orderFlowState ? { orderFlowState: activeContext.orderFlowState } : {},
      }),
      workspace: WorkspaceContext.create(activeContext.workspace || {})
    });

    let response: any;
    let isPipelineError = false;

    try {
      response = await CopilotEngine.processCommand(inputText, context, ctx);
    } catch (engineErr: any) {
      console.error('[Copilot API] CopilotEngine processCommand failed:', engineErr);
      isPipelineError = true;
      response = {
        type: 'clarification',
        content: 'Layanan pemrosesan AI sedang mengalami gangguan sementara. Silakan coba kembali nanti.',
        metrics: {
          intentResolutionMs: 0,
          entityResolutionMs: 0,
          validationMs: 0,
          planningMs: 0,
          totalResponseMs: 0,
        },
      };
    }

    if (response && typeof response === 'object') {
      const rememberedFlow = context.conversation.getMemory('orderFlowState');
      if (rememberedFlow !== undefined) {
        response.orderFlowState = rememberedFlow;
      }
    }

    // Persist assistant message response if conversation ID is active
    if (persistentConversationId) {
      try {
        const assistantContent = response.content || (response as any).message || '';
        const isErrorOutcome = isPipelineError || response.content?.includes('gangguan') || response.content?.includes('antrean tinggi');
        await ConversationService.appendAssistantMessage(ctx, {
          conversationId: persistentConversationId,
          content: assistantContent,
          language: 'id',
          metadata: {
            type: response.type,
            intent: (response as any).intent,
            metrics: response.metrics,
            status: isErrorOutcome ? 'ERROR' : 'SUCCESS',
            errorDetails: isErrorOutcome ? 'Upstream or processing degradation' : undefined,
          },
        });
      } catch (persistErr) {
        console.warn('[Copilot API] Failed to persist assistant message:', persistErr);
      }
    }

    const [operationalSummary] = await Promise.all([
      OperationalSummaryProvider.getSummary(foundationContext).catch(() => null),
    ]);

    return NextResponse.json({
      success: !isPipelineError,
      response: response,
      conversationId: persistentConversationId,
      read: {
        operationalSummary,
      }
    });

  } catch (error: any) {
    console.error('Copilot API Error:', error);
    const msg = error?.message || 'Internal Server Error';
    const isUnauth = error?.statusCode === 401 || msg.includes('Unauthenticated') || msg.includes('no valid session');
    const isForbidden = error?.statusCode === 403 || msg.includes('Unauthorized') || msg.includes('Forbidden') || msg.includes('Permission');

    const status = isUnauth ? 401 : isForbidden ? 403 : 500;
    return NextResponse.json({ success: false, error: msg }, { status });
  }
}
