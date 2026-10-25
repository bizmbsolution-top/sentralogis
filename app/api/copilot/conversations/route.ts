import { NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { assertPermission } from '@/lib/application/identity/resolver';
import { ConversationService } from '@/lib/copilot/conversation/service';

export async function GET(req: Request) {
  try {
    const ctx = await resolveSessionIdentity();
    assertPermission(ctx, 'copilot:read');

    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? parseInt(limitParam, 10) : 50;

    const conversations = await ConversationService.listConversations(ctx, { limit });

    return NextResponse.json({
      success: true,
      data: conversations,
    });
  } catch (error: any) {
    console.error('[API /api/copilot/conversations] GET Error:', error);
    const status = error.message?.includes('Permission') ? 403 : 500;
    return NextResponse.json(
      { success: false, error: error.message },
      { status }
    );
  }
}

export async function POST(req: Request) {
  try {
    const ctx = await resolveSessionIdentity();
    assertPermission(ctx, 'copilot:read');

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body is optional
    }

    const conversation = await ConversationService.createConversation(ctx, {
      title: body.title,
    });

    return NextResponse.json({
      success: true,
      data: conversation,
    });
  } catch (error: any) {
    console.error('[API /api/copilot/conversations] POST Error:', error);
    const status = error.message?.includes('Permission') ? 403 : 500;
    return NextResponse.json(
      { success: false, error: error.message },
      { status }
    );
  }
}
