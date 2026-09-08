import { NextResponse } from 'next/server';
import { resolveSessionIdentity } from '@/lib/application/identity/session-source';
import { assertPermission } from '@/lib/application/identity/resolver';
import { createFoundationContext } from '@/lib/copilot/foundation/integration';
import { NotificationInboxProvider } from '@/lib/copilot/read/notification-provider';

export async function GET() {
  try {
    const ctx = await resolveSessionIdentity();
    assertPermission(ctx, 'commercial:read');

    const foundationContext = createFoundationContext(ctx);

    const result = await NotificationInboxProvider.getInbox(foundationContext, {
      limit: 50,
    });

    return NextResponse.json({
      success: true,
      ...result,
      foundationVersion: foundationContext.version,
    });

  } catch (error: any) {
    console.error('Copilot Inbox API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
