import { NextResponse } from 'next/server';
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
import { EntitySearchProvider } from '@/lib/copilot/read/entity-provider';

export async function POST(req: Request) {
  try {
    const ctx = await resolveSessionIdentity();
    assertPermission(ctx, 'commercial:read');

    const body = await req.json();
    const { 
      message, 
      activeContext = {},
      image = null 
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

    const foundationContext = createFoundationContext(ctx);

    const context = OperationalContext.create({
      tenant: TenantContext.create({ id: foundationContext.identity.tenantId, timezone: 'Asia/Jakarta' }),
      user: UserContext.create({ id: foundationContext.identity.userId, displayName: foundationContext.identity.userId, roles: [foundationContext.identity.role] }),
      permissions: PermissionContext.create(foundationContext.identity.permissions),
      conversation: ConversationContext.create({ conversationId: activeContext.conversationId || 'default-session' }),
      workspace: WorkspaceContext.create(activeContext.workspace || {})
    });

    const response = await CopilotEngine.processCommand(inputText, context, ctx);

    const [operationalSummary] = await Promise.all([
      OperationalSummaryProvider.getSummary(foundationContext).catch(() => null),
    ]);

    return NextResponse.json({
      success: true,
      response: response,
      read: {
        operationalSummary,
      }
    });

  } catch (error: any) {
    console.error('Copilot API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
