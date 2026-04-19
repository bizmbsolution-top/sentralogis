import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { userId, password, full_name, role } = await req.json();

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !siteUrl) {
      return NextResponse.json({ message: "Konfigurasi server (Service Role Key) belum lengkap." }, { status: 500 });
    }

    const supabaseAdmin = createClient(siteUrl, serviceKey);

    // 1. Update User di Supabase Auth (jika password ada)
    if (password && password.length >= 6) {
        const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            { password }
        );

        if (authError) {
           console.error("Auth Admin Update Error:", authError);
           return NextResponse.json({ message: "Gagal Update Auth: " + authError.message }, { status: 400 });
        }
    }

    // 2. Update Metadata jika perlu (metadata biasanya disimpan di auth juga)
    if (full_name) {
        await supabaseAdmin.auth.admin.updateUserById(userId, {
            user_metadata: { full_name }
        });
    }

    return NextResponse.json({ message: "User updated successfully" });
  } catch (error: any) {
    console.error("Update User Error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
