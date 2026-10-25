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

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveSessionIdentity(null, req);
    assertPermission(ctx, 'copilot:read');

    const resolvedParams = await params;
    const conversationId = resolvedParams.id;

    const conversation = await ConversationService.getConversation(ctx, conversationId);
    if (!conversation) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: conversation,
    });
  } catch (error: any) {
    console.error('[API /api/copilot/conversations/[id]] GET Error:', error);
    const status = toHttpErrorStatus(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveSessionIdentity(null, req);
    assertPermission(ctx, 'copilot:read');

    const resolvedParams = await params;
    const conversationId = resolvedParams.id;

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON payload' },
        { status: 400 }
      );
    }

    const updated = await ConversationService.updateConversation(ctx, conversationId, {
      title: body.title,
      contextSummary: body.contextSummary,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error: any) {
    console.error('[API /api/copilot/conversations/[id]] PATCH Error:', error);
    const status = toHttpErrorStatus(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveSessionIdentity(null, req);
    assertPermission(ctx, 'copilot:read');

    const resolvedParams = await params;
    const conversationId = resolvedParams.id;

    const success = await ConversationService.deleteConversation(ctx, conversationId);
    if (!success) {
      return NextResponse.json(
        { success: false, error: 'Conversation not found or access denied' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error: any) {
    console.error('[API /api/copilot/conversations/[id]] DELETE Error:', error);
    const status = toHttpErrorStatus(error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status }
    );
  }
}
