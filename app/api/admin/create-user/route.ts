import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { email, password, full_name, organization_id, role, sbu_access: req_sbu_access, assigned_warehouse_id, assigned_region_id } = await req.json();

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

    // 2. Tentukan SBU Access
    let sbuAccess: string[] = req_sbu_access || [];
    if (!req_sbu_access) {
      if (role === 'cs_trucking') sbuAccess = ['trucking'];
      else if (role === 'cs_customs') sbuAccess = ['clearances'];
      else if (role === 'cs_forwarding') sbuAccess = ['forwarding'];
      else if (role === 'admin' || role === 'admin_company' || role === 'superadmin') sbuAccess = ['trucking', 'clearances', 'forwarding'];
    }

    // 3. Insert ke tabel profiles
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: authUser.user.id,
        full_name: full_name,
        role: role || 'admin_company',
        organization_id: organization_id || null,
        sbu_access: sbuAccess,
        updated_at: new Date().toISOString()
      });

    if (profileError) {
       console.error("Profile Insert Error:", profileError);
       return NextResponse.json({ message: "Gagal Insert Profile: " + profileError.message }, { status: 400 });
    }

    // 4. Sinkronisasi ke wo_organization_users jika ada organization_id
    if (organization_id) {
       const { data: org } = await supabaseAdmin.from('organizations').select('tenant_id').eq('id', organization_id).single();
       if (org && org.tenant_id) {
          await supabaseAdmin.from('wo_organization_users').upsert({
            tenant_id: org.tenant_id,
            organization_id: organization_id,
            user_id: authUser.user.id,
            role_code: role || 'viewer',
            assigned_warehouse_id: assigned_warehouse_id, assigned_region_id: assigned_region_id || null
          }, { onConflict: 'organization_id, user_id, role_code' });
       }
    }

    return NextResponse.json({ message: "User created successfully", userId: authUser.user.id });
  } catch (error: any) {
    console.error("Create User Error:", error);
    return NextResponse.json({ message: error.message }, { status: 500 });
  }
}
