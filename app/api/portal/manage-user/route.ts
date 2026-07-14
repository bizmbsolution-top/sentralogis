import { NextRequest, NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

// Helper to make direct requests to Supabase Auth & PostgREST with service role
async function restFetch(endpoint: string, options: any = {}) {
  const headers = {
    'apikey': serviceRoleKey,
    'Authorization': `Bearer ${serviceRoleKey}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };
  return fetch(`${supabaseUrl}${endpoint}`, { ...options, headers });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, id, tenant_id, customer_id, email, full_name, whatsapp, portal_password, is_active } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action parameter required' }, { status: 400 });
    }

    // 1. CREATE OR SET PASSWORD
    if (action === 'create' || action === 'update') {
      const cleanEmail = (email || '').toLowerCase().trim();
      const cleanPassword = portal_password || 'Password123!';

      if (!cleanEmail || !full_name || !customer_id) {
        return NextResponse.json({ error: 'Email, Nama Lengkap, dan Perusahaan wajib diisi.' }, { status: 400 });
      }

      // Check if user exists in auth.users
      const listRes = await restFetch('/auth/v1/admin/users');
      const listData = await listRes.json();
      let authUser = (listData?.users || []).find((u: any) => u.email?.toLowerCase() === cleanEmail);

      let authUserId = authUser?.id || null;

      if (!authUser) {
        // Create new user in auth.users
        const createRes = await restFetch('/auth/v1/admin/users', {
          method: 'POST',
          body: JSON.stringify({
            email: cleanEmail,
            password: cleanPassword,
            email_confirm: true,
            user_metadata: { full_name: full_name.trim(), role: 'warehouse_customer' }
          })
        });

        if (!createRes.ok) {
          const err = await createRes.text();
          return NextResponse.json({ error: `Gagal membuat akun login: ${err}` }, { status: 400 });
        }
        authUser = await createRes.json();
        authUserId = authUser.id;
      } else if (cleanPassword) {
        // Update existing user password & metadata
        const updateRes = await restFetch(`/auth/v1/admin/users/${authUser.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            password: cleanPassword,
            email_confirm: true,
            user_metadata: { full_name: full_name.trim(), role: 'warehouse_customer' }
          })
        });
        if (!updateRes.ok) {
          console.warn('Warning updating auth user:', await updateRes.text());
        }
        authUserId = authUser.id;
      }

      // Ensure profiles table record exists & has role warehouse_customer
      if (authUserId) {
        await restFetch(`/rest/v1/profiles?id=eq.${authUserId}`, { method: 'DELETE' });
        await restFetch('/rest/v1/profiles', {
          method: 'POST',
          headers: { 'Prefer': 'return=minimal' },
          body: JSON.stringify({
            id: authUserId,
            email: cleanEmail,
            full_name: full_name.trim(),
            role: 'warehouse_customer',
            is_active: is_active !== undefined ? is_active : true
          })
        });
      }

      // Insert or Update md_customer_users
      if (action === 'create') {
        const insRes = await restFetch('/rest/v1/md_customer_users', {
          method: 'POST',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify({
            tenant_id: tenant_id || null,
            customer_id: customer_id,
            user_id: authUserId,
            email: cleanEmail,
            full_name: full_name.trim(),
            whatsapp: whatsapp?.trim() || null,
            portal_password: cleanPassword,
            is_active: is_active !== undefined ? is_active : true
          })
        });

        if (!insRes.ok) {
          const errText = await insRes.text();
          if (errText.includes('23505') || errText.toLowerCase().includes('unique')) {
            return NextResponse.json({ error: 'Email PIC tersebut sudah terdaftar pada portal B2B!' }, { status: 400 });
          }
          return NextResponse.json({ error: `Gagal menyimpan data PIC ke database: ${errText}` }, { status: 400 });
        }

        const newRow = await insRes.json();
        return NextResponse.json({ success: true, data: newRow[0] || newRow });
      } else {
        // Update existing md_customer_users by id
        const updRes = await restFetch(`/rest/v1/md_customer_users?id=eq.${id}`, {
          method: 'PATCH',
          headers: { 'Prefer': 'return=representation' },
          body: JSON.stringify({
            customer_id: customer_id,
            user_id: authUserId,
            email: cleanEmail,
            full_name: full_name.trim(),
            whatsapp: whatsapp?.trim() || null,
            portal_password: cleanPassword,
            is_active: is_active !== undefined ? is_active : true
          })
        });

        if (!updRes.ok) {
          const errText = await updRes.text();
          return NextResponse.json({ error: `Gagal memperbarui data PIC: ${errText}` }, { status: 400 });
        }

        const updRow = await updRes.json();
        return NextResponse.json({ success: true, data: updRow[0] || updRow });
      }
    }

    // 2. DELETE
    if (action === 'delete') {
      if (!id) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

      // Get existing row to see if user_id should be deleted
      const getRes = await restFetch(`/rest/v1/md_customer_users?id=eq.${id}&select=user_id`);
      const getRows = await getRes.json();
      const targetUserId = getRows?.[0]?.user_id;

      // Delete from md_customer_users
      const delRes = await restFetch(`/rest/v1/md_customer_users?id=eq.${id}`, { method: 'DELETE' });
      if (!delRes.ok) {
        return NextResponse.json({ error: 'Gagal menghapus data PIC' }, { status: 400 });
      }

      // Optionally delete from auth.users if linked
      if (targetUserId) {
        await restFetch(`/auth/v1/admin/users/${targetUserId}`, { method: 'DELETE' });
        await restFetch(`/rest/v1/profiles?id=eq.${targetUserId}`, { method: 'DELETE' });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    console.error('Error in /api/portal/manage-user:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
