import { NextRequest, NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { assertPermission } from '@/lib/application/identity/resolver';
import { ConversationService } from '@/lib/copilot/conversation/service';

function toHttpErrorStatus(error: any): number {
  const msg = String(error?.message || '');
  if (error?.statusCode === 401 || msg.includes('Unauthenticated') || msg.includes('no valid session')) {
    return 401;
  }
  if (error?.statusCode === 403 || msg.includes('Permission') || msg.includes('Forbidden') || msg.includes('Unauthorized')) {
    return 403;
  }
  return 500;
}

export async function GET(req: NextRequest) {
  try {
    const ctx = await resolveSessionIdentity(null, req);
    assertPermission(ctx, 'copilot:read');

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const scopeParam = searchParams.get('scope') as any;
    const parsedLimit = limitParam ? parseInt(limitParam, 10) : 50;
    const limit = Number.isFinite(parsedLimit) && parsedLimit > 0 ? Math.min(parsedLimit, 100) : 50;

    const conversations = await ConversationService.listConversations(ctx, {
      limit,
      scope: scopeParam || undefined,
    });

    return NextResponse.json({
      success: true,
      data: conversations,
    });
  } catch (error: any) {
    console.error('[API /api/copilot/conversations] GET Error:', error);
    const status = toHttpErrorStatus(error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load conversations' },
      { status }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await resolveSessionIdentity(null, req);
    assertPermission(ctx, 'copilot:read');

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }

    const conversation = await ConversationService.createConversation(ctx, {
      title: body.title,
      scope: body.scope,
    });

    return NextResponse.json({
      success: true,
      data: conversation,
    });
  } catch (error: any) {
    console.error('[API /api/copilot/conversations] POST Error:', error);
    const status = toHttpErrorStatus(error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create conversation' },
      { status }
    );
  }
}
