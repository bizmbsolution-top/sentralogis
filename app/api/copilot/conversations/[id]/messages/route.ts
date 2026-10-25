import { NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { assertPermission } from '@/lib/application/identity/resolver';
import { ConversationService } from '@/lib/copilot/conversation/service';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ctx = await resolveSessionIdentity();
    assertPermission(ctx, 'copilot:read');

    const resolvedParams = await params;
    const conversationId = resolvedParams.id;

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : undefined;

    const messages = await ConversationService.listMessages(ctx, conversationId, limit);

    return NextResponse.json({
      success: true,
      data: messages,
    });
  } catch (error: any) {
    console.error('[API /api/copilot/conversations/[id]/messages] GET Error:', error);
    const status = error.message?.includes('Permission') ? 403 : 500;
    return NextResponse.json(
      { success: false, error: error.message },
      { status }
    );
  }
}
