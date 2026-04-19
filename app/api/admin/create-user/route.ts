import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { email, password, full_name, organization_id, role } = await req.json();

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const siteUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !siteUrl) {
      return NextResponse.json({ message: "Konfigurasi server (Service Role Key) belum lengkap." }, { status: 500 });
    }

    const supabaseAdmin = createClient(siteUrl, serviceKey);

    // 1. Create User di Supabase Auth
    const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    });

    if (authError) {
       console.error("Auth Admin Error:", authError);
       return NextResponse.json({ message: "Gagal Create Auth: " + authError.message }, { status: 400 });
    }

    // 2. Tentukan SBU Access berdasarkan Role
    let sbuAccess: string[] = [];
    if (role === 'cs_trucking') sbuAccess = ['trucking'];
    else if (role === 'cs_customs') sbuAccess = ['clearances'];
    else if (role === 'cs_forwarding') sbuAccess = ['forwarding'];
    else if (role === 'admin' || role === 'admin_company' || role === 'superadmin') sbuAccess = ['trucking', 'clearances', 'forwarding'];

    // 3. Insert ke tabel profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authUser.user.id,
        full_name: full_name,
        role: role || 'admin_company',
        organization_id: organization_id,
        sbu_access: sbuAccess,
        updated_at: new Date()
      });

    if (profileError) {
       console.error("Profile Insert Error:", profileError);
       return NextResponse.json({ message: "Gagal Insert Profile: " + profileError.message }, { status: 400 });
    }

    return NextResponse.json({ message: "User created successfully", userId: authUser.user.id });
  } catch (error: any) {
    console.error("Create User Error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
