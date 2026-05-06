import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { userId, newPassword } = await request.json();
    
    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'Missing userId or newPassword' }, { status: 400 });
    }

    const supabaseAdmin = createAdminClient();

    // Reset password via Admin Auth API
    const { error } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (error) {
      console.error('[AdminAPI] Reset Password Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[AdminAPI] Server Error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
