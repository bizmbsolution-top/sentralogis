import { NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { assertPermission } from '@/lib/application/identity/resolver';
import { ConversationService } from '@/lib/copilot/conversation/service';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveSessionIdentity();
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
    const status = error.message?.includes('Permission') ? 403 : 500;
    return NextResponse.json(
      { success: false, error: error.message },
      { status }
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveSessionIdentity();
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
    const status = error.message?.includes('Permission') ? 403 : 500;
    return NextResponse.json(
      { success: false, error: error.message },
      { status }
    );
  }
}
