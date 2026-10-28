import crypto from 'crypto';
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
import { normalizeIdempotencyUuid } from '@/lib/copilot/conversation/repository';
import { CustomerIntentHandler } from '@/lib/copilot/customer/customer-intent-handler';
import { ConversationalOrderWorkspace } from '@/lib/copilot/workflow/conversational-order-workspace';
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

    // 1. Resolve or auto-create a persistent conversation owned by (tenantId, userId, scope)
    const candidateConvId: string | null = reqConversationId || activeContext.conversationId || null;
    const requestedScope = body.scope || activeContext.scope || null;
    const effectiveScope = ConversationService.resolveEffectiveScope(ctx, requestedScope);

    let persistentConversationId: string | null = candidateConvId;
    let conversationTitle: string | null = null;
    let wasConversationCreated = false;

    try {
      const ensured = await ConversationService.ensureConversationForTurn(
        ctx,
        candidateConvId,
        inputText,
        effectiveScope
      );
      persistentConversationId = ensured.conversation.id;
      conversationTitle = ensured.conversation.title;
      wasConversationCreated = ensured.created;
    } catch (ensureErr) {
      console.warn('[Copilot API] Could not ensure persistent conversation:', ensureErr);
    }

    // 2. Hydrate durable conversation state (orderFlowState, pendingCustomerRegistration, lastRegisteredCustomer)
    // from the conversation's latest assistant message in Supabase so multi-turn drafts survive
    // page navigation, refreshes, and serverless instance hops without re-executing mutations.
    let hydratedOrderFlowState = activeContext.orderFlowState || null;
    if (persistentConversationId && !wasConversationCreated) {
      try {
        const existingMsgs = await ConversationService.listMessages(ctx, persistentConversationId);
        const latestAssistant = [...existingMsgs]
          .reverse()
          .find((m) => m.role === 'assistant' && m.metadata?.conversationState);
        const savedState = latestAssistant?.metadata?.conversationState;
        if (savedState && typeof savedState === 'object') {
          if (savedState.pendingCustomerRegistration?.candidateName) {
            if (!CustomerIntentHandler.getPendingRegistration(ctx, persistentConversationId)) {
              CustomerIntentHandler.savePendingRegistration(
                ctx,
                savedState.pendingCustomerRegistration.candidateName,
                persistentConversationId
              );
            }
          } else if (savedState.pendingCustomerRegistration === null) {
            CustomerIntentHandler.clearPendingRegistration(ctx, persistentConversationId);
          }

          if (savedState.lastRegisteredCustomer?.id && savedState.lastRegisteredCustomer?.name) {
            if (!CustomerIntentHandler.getLastRegisteredCustomer(ctx, persistentConversationId)) {
              CustomerIntentHandler.saveLastRegisteredCustomer(
                ctx,
                savedState.lastRegisteredCustomer,
                persistentConversationId
              );
            }
          }

          if (!hydratedOrderFlowState && savedState.orderFlowState) {
            const s = savedState.orderFlowState;
            if (s.step && s.step !== 'CONFIRMED' && s.step !== 'CANCELLED') {
              hydratedOrderFlowState = s;
              ConversationalOrderWorkspace.saveSessionState(ctx, s, persistentConversationId);
            }
          }
        }
      } catch (hydrateErr) {
        console.warn('[Copilot API] Could not hydrate conversation state:', hydrateErr);
      }
    }

    // 3. Persist incoming user message with a valid UUID idempotency key
    const effectiveIdempotencyKey = normalizeIdempotencyUuid(idempotencyKey || crypto.randomUUID());
    if (persistentConversationId) {
      try {
        await ConversationService.appendUserMessage(ctx, {
          conversationId: persistentConversationId,
          content: inputText,
          idempotencyKey: effectiveIdempotencyKey,
          language: 'id',
        });
      } catch (persistErr) {
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
        conversationMemory: {
          ...(hydratedOrderFlowState ? { orderFlowState: hydratedOrderFlowState } : {}),
          scope: effectiveScope,
        },
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

    let updatedOrderFlowState: any = null;
    if (response && typeof response === 'object') {
      const rememberedFlow = context.conversation.getMemory('orderFlowState');
      if (rememberedFlow !== undefined) {
        response.orderFlowState = rememberedFlow;
        updatedOrderFlowState = rememberedFlow;
      } else if (persistentConversationId) {
        updatedOrderFlowState = ConversationalOrderWorkspace.getSessionState(ctx, undefined, persistentConversationId);
      }
    }

    // 4. Persist assistant message response with durable conversationState metadata
    if (persistentConversationId) {
      try {
        const assistantContent = response.content || (response as any).message || '';
        const isErrorOutcome = isPipelineError || response.content?.includes('gangguan') || response.content?.includes('antrean tinggi');
        const currentPendingReg = CustomerIntentHandler.getPendingRegistration(ctx, persistentConversationId);
        const currentLastCust = CustomerIntentHandler.getLastRegisteredCustomer(ctx, persistentConversationId);

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
            proposal: response.proposal || undefined,
            results: Array.isArray(response.results) ? response.results.slice(0, 10) : undefined,
            timeline: response.timeline || undefined,
            conversationState: {
              orderFlowState: updatedOrderFlowState || null,
              pendingCustomerRegistration: currentPendingReg || null,
              lastRegisteredCustomer: currentLastCust || null,
            },
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
      conversationTitle,
      scope: effectiveScope,
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
