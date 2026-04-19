import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    if (!userId) {
      return NextResponse.json({ message: "User ID wajib disertakan." }, { status: 400 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !siteUrl) {
      return NextResponse.json({ message: "Konfigurasi server (Service Role Key) belum lengkap." }, { status: 500 });
    }

    const supabaseAdmin = createClient(siteUrl, serviceKey);

    // 1. Delete Profile record first (to avoid FK issues if any)
    // In many schemas, profiles might be linked to other tables, so we should be careful.
    // But usually auth.users delete will cascade to profiles if defined as ON DELETE CASCADE.
    // Here we'll do it explicitly just in case.
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error("Profile Delete Error:", profileError);
      // We continue anyway to try deleting the auth user
    }

    // 2. Delete User dari Supabase Auth
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
       console.error("Auth Admin Delete Error:", authError);
       return NextResponse.json({ message: "Gagal menghapus User Auth: " + authError.message }, { status: 400 });
    }

    return NextResponse.json({ message: "User deleted successfully" });
  } catch (error: any) {
    console.error("Delete User Error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
