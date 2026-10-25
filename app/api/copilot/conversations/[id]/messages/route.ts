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
  if (msg.includes('Conversation not found')) {
    return 404;
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

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const parsedLimit = limitParam ? parseInt(limitParam, 10) : undefined;
    const limit = parsedLimit && Number.isFinite(parsedLimit) && parsedLimit > 0 ? parsedLimit : undefined;

    const messages = await ConversationService.listMessages(ctx, conversationId, limit);

    return NextResponse.json({
      success: true,
      conversation,
      data: messages,
    });
  } catch (error: any) {
    console.error('[API /api/copilot/conversations/[id]/messages] GET Error:', error);
    const status = toHttpErrorStatus(error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to load messages' },
      { status }
    );
  }
}
