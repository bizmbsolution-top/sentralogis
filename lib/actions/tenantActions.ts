"use server";

import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type AdminClient = ReturnType<typeof createClient>;

let cachedAdmin: AdminClient | null = null;

const getAdminClient = (): AdminClient => {
  if (cachedAdmin) return cachedAdmin;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing Supabase Admin configuration");
  }
  cachedAdmin = createClient(supabaseUrl, serviceRoleKey);
  return cachedAdmin;
};

export async function getActiveTenants() {
  console.log('[GET_ACTIVE_TENANTS] Start');
  try {
    const admin = getAdminClient();
    
    console.log('[GET_ACTIVE_TENANTS] Fetching tenants table...');
    const { data: tenantsData, error: tenantsError } = await admin
      .from('tenants')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (tenantsError) {
      console.error('[GET_ACTIVE_TENANTS] DB Error (tenants):', tenantsError);
      throw new Error(`Tenants fetch failed: ${tenantsError.message}`);
    }

    console.log(`[GET_ACTIVE_TENANTS] Found ${tenantsData?.length || 0} tenants`);
    if (!tenantsData || tenantsData.length === 0) {
      return [];
    }

    const userIds = tenantsData.map(t => t.user_id).filter(Boolean);
    
    let profileMap = new Map();
    if (userIds.length > 0) {
      console.log('[GET_ACTIVE_TENANTS] Fetching profiles for user IDs...');
      const { data: profilesData, error: profilesError } = await admin
        .from('profiles')
        .select('id, email, full_name')
        .in('id', userIds);

      if (profilesError) {
        console.error('[GET_ACTIVE_TENANTS] DB Error (profiles):', profilesError);
      } else if (profilesData) {
        profileMap = new Map(profilesData.map(p => [p.id, p]));
      }
    }

    console.log('[GET_ACTIVE_TENANTS] Mapping data and returning');
    return tenantsData.map((t: any) => ({
      tenant_code: t.tenant_code || 'N/A',
      name: t.name || 'Unknown Node',
      subscription_tier: t.subscription_tier || 'N/A',
      token_balance: t.token_balance || 0,
      admin_email: profileMap.get(t.user_id)?.email || 'N/A',
      admin_name: profileMap.get(t.user_id)?.full_name || 'N/A',
      created_at: t.created_at || new Date().toISOString()
    }));
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GET_ACTIVE_TENANTS] Critical Exception:', errMsg);
    throw new Error(errMsg || "Failed to sync executive console");
  }
}

export async function getTenantByUserId(userId: string) {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from('tenants')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('Error in getTenantByUserId:', error);
    throw new Error(error.message || "Operational node data unreachable");
  }
}

export async function adminResetPassword(requestId: string, newPassword: any) {
  console.log(`[ADMIN_RESET] Mencoba reset password untuk Request: ${requestId}`);
  try {
    const admin = getAdminClient();
    // 1. Ambil detail request untuk mendapatkan email
    const { data: reqData, error: fetchError } = await admin
      .from('reset_password_requests')
      .select('admin_email')
      .eq('id', requestId)
      .single();

    if (fetchError || !reqData) throw new Error("Data permintaan tidak ditemukan");

    console.log(`[ADMIN_RESET] Mencari identitas: ${reqData.admin_email}`);
    
    const { data: usersData, error: listError } = await admin.auth.admin.listUsers();
    
    if (listError) {
      console.error('[ADMIN_RESET] Supabase Admin Error:', listError);
      throw new Error(`Koneksi database gagal (500). Silakan coba lagi dalam beberapa saat.`);
    }

    const targetUser = usersData.users.find(u => 
      u.email?.trim().toLowerCase() === reqData.admin_email.trim().toLowerCase()
    );
    
    if (!targetUser) {
      const { data: profData } = await admin
        .from('profiles')
        .select('id')
        .eq('email', reqData.admin_email)
        .single();
      
      if (profData?.id) {
        const { data: userData } = await admin.auth.admin.getUserById(profData.id);
        if (userData?.user) {
          return await executePasswordUpdate(admin, userData.user.id, requestId, newPassword);
        }
      }

      throw new Error(`User ${reqData.admin_email} tidak ditemukan. Silakan hubungi tim IT.`);
    }

    return await executePasswordUpdate(admin, targetUser.id, requestId, newPassword);
  } catch (error: any) {
    console.error('[ADMIN_RESET] Critical:', error.message);
    throw new Error(error.message);
  }
}

// Fungsi Helper untuk eksekusi update agar kode lebih bersih
async function executePasswordUpdate(admin: any, userId: string, requestId: string, newPassword: string) {
  const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
  if (updateError) throw updateError;

  const { error: statusError } = await admin
    .from('reset_password_requests')
    .update({ 
      status: 'completed', 
      processed_at: new Date().toISOString(),
      notes: 'Password direset via Jalur Cepat'
    })
    .eq('id', requestId);

  if (statusError) throw statusError;
  return { success: true };
}

export async function registerNewTenant(formData: any) {
  try {
    const admin = getAdminClient();
    const tempPassword = Math.random().toString(36).slice(-8);
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: formData.admin_email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name: formData.admin_full_name, role: 'tenant_admin' }
    });

    if (authError && !authError.message.includes('already registered')) throw authError;

    // Get User ID (either from new user or existing profile)
    let userId = authData?.user?.id;
    if (!userId) {
      const { data: existingProf } = await admin
        .from('profiles')
        .select('id')
        .eq('email', formData.admin_email)
        .single();
      userId = existingProf?.id;
      
      // If user exists, FORCE update their password to the new tempPassword
      if (userId) {
        console.log(`[REG] User exists, updating password for: ${formData.admin_email}`);
        await admin.auth.admin.updateUserById(userId, { 
          password: tempPassword,
          user_metadata: { full_name: formData.admin_full_name, role: 'tenant_admin' }
        });
      }
    }

    if (!userId) throw new Error("Could not identify user ID for registration");

    // 1. Sync Profile
    const { error: profError } = await admin.from('profiles').upsert({
      id: userId,
      email: formData.admin_email,
      full_name: formData.admin_full_name,
      role: 'tenant_admin',
      is_active: true
    });
    if (profError) throw profError;

    // 2. Create Tenant Record
    // Default warehouse_id from existing data if not provided
    const warehouseId = '9f82b2f9-d6ea-4eac-91d0-332b0fd07559'; 

    const { error: tenantError } = await admin.from('tenants').insert({
      name: formData.name,
      tenant_code: formData.tenant_code,
      user_id: userId,
      warehouse_id: warehouseId,
      status: 'active',
      subscription_tier: formData.subscription_tier || 'Starter',
      token_balance: 100
    });

    if (tenantError) {
      if (tenantError.message.includes('unique constraint')) {
        throw new Error(`Tenant code "${formData.tenant_code}" is already in use.`);
      }
      throw tenantError;
    }

    return { success: true, temp_password: tempPassword };
  } catch (error: any) {
    console.error('Registration Error:', error.message);
    throw new Error(error.message || "Registration Failure");
  }
}

export async function getPendingTopupRequests() {
  try {
    const admin = getAdminClient();
    const { data, error } = await admin
      .from('topup_requests')
      .select(`
        *,
        tenants (
          name,
          tenant_code,
          user_id
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Fetch profiles for WA join
    const { data: profiles } = await admin.from('profiles').select('id, whatsapp');
    const waMap = (profiles || []).reduce((acc: any, p: any) => {
      acc[p.id] = p.whatsapp;
      return acc;
    }, {});

    return (data || []).map(req => {
      const rawWA = waMap[req.tenants?.user_id] || 'N/A';
      return {
        ...req,
        name: req.tenants?.name || 'Unknown Cluster',
        tenant_code: req.tenants?.tenant_code || req.tenant_code,
        whatsapp: (rawWA && !rawWA.includes('@')) ? rawWA : 'N/A'
      };
    });
  } catch (error: any) {
    console.error('Error fetching topup requests:', error);
    throw new Error("Failed to sync settlement queue");
  }
}

export async function adminResetPasswordDirect(email: string, newPassword: any) {
  console.log(`[DIRECT_RESET] Reset password for: ${email}`);
  try {
    const admin = getAdminClient();
    
    // 1. Cari User di Auth secara efisien
    const { data: usersData, error: listError } = await admin.auth.admin.listUsers();
    
    if (listError) throw listError;

    const targetUser = usersData.users.find(u => 
      u.email?.trim().toLowerCase() === email.trim().toLowerCase()
    );
    
    let userId = targetUser?.id;

    if (!userId) {
      // Cek via profil jika tidak ada di list (mungkin karena limitasi listUsers)
      const { data: profData } = await admin
        .from('profiles')
        .select('id')
        .eq('email', email)
        .single();
      userId = profData?.id;
    }

    if (!userId) throw new Error(`User with email ${email} not found in system.`);

    // 2. UPDATE PASSWORD
    const { error: updateError } = await admin.auth.admin.updateUserById(userId, { password: newPassword });
    if (updateError) throw updateError;

    return { success: true };
  } catch (error: any) {
    console.error('[DIRECT_RESET] Critical:', error.message);
    throw new Error(error.message);
  }
}

export async function getAllProfilesAction() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    
    if (!supabaseUrl || !serviceRoleKey) {
      return { error: 'Environment variables missing' };
    }

    const admin = createClient(supabaseUrl, serviceRoleKey);

    // HANYA ambil kolom yang benar-benar ada
    const { data, error } = await admin
      .from('profiles')
      .select('id, email, full_name, whatsapp');
    
    if (error) {
      console.error('Server Action Error:', error);
      return { error: error.message, code: error.code };
    }

    if (!data || data.length === 0) {
      return { error: 'Table is empty' };
    }

    return (data || []).map(p => ({
      ...p,
      whatsapp: p.whatsapp || ''
    }));
  } catch (err: any) {
    console.error('Action Exception:', err);
    return { error: err.message || 'Unknown Exception' };
  }
}

export async function injectTokensAction(tenantCode: string, amount: number, note: string, requestId?: string, isReject?: boolean, reason?: string) {
  console.log(`[INJECT_TOKENS] Action: ${isReject ? 'REJECT' : 'APPROVE'} for ${tenantCode}`);
  try {
    const admin = getAdminClient();
    
    // 1. Ambil Tenant
    const { data: tenant, error: tError } = await admin
      .from('tenants')
      .select('id, token_balance')
      .eq('tenant_code', tenantCode)
      .single();

    if (tError) throw tError;

    if (isReject) {
      // PROSES PENOLAKAN
      if (requestId) {
        await admin
          .from('topup_requests')
          .update({ status: 'rejected', rejection_reason: reason || 'Manual rejection by owner' })
          .eq('id', requestId);
      }
      return { success: true, message: `Permintaan top-up dari ${tenantCode} telah ditolak.` };
    }

    // PROSES PERSETUJUAN (INJECTION)
    // Gunakan fungsi RPC manual_topup_tokens untuk memastikan atomisitas
    const { error: rpcError } = await admin.rpc('manual_topup_tokens', {
      p_tenant_code: tenantCode,
      p_amount_received: amount * 1000, // Multiply by 1000 because RPC divides by 1000
      p_note: note || 'Manual injection by owner'
    });

    if (rpcError) throw rpcError;

    // 4. Update status request menjadi approved
    if (requestId) {
      await admin
        .from('topup_requests')
        .update({ status: 'approved' })
        .eq('id', requestId);
    }

    return { success: true, message: `${amount} token berhasil disuntikkan secara otomatis.` };
  } catch (error: any) {
    console.error('[INJECT_TOKENS] Error:', error.message);
    throw new Error(error.message || "Gagal memproses transaksi");
  }
}

export async function grantTokenToTenant(tenantCode: string, amount: number, note: string) {
  console.log(`[GRANT_TOKEN] Manually granting ${amount} tokens to tenant: ${tenantCode}`);
  try {
    const admin = getAdminClient();
    
    // Gunakan RPC manual_topup_tokens untuk memastikan atomisitas
    const { error: rpcError } = await admin.rpc('manual_topup_tokens', {
      p_tenant_code: tenantCode,
      p_amount_received: amount * 1000,
      p_note: note || 'Manual grant by owner'
    });

    if (rpcError) throw rpcError;

    return { success: true, message: `${amount} token berhasil ditambahkan.` };
  } catch (error: any) {
    console.error('[GRANT_TOKEN] Error:', error.message);
    return { success: false, message: error.message || "Gagal memproses transaksi" };
  }
}
