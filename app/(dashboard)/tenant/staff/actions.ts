'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function createStaffAdmin(payload: {
  email: string;
  password: string;
  fullName: string;
  roleCode: string;
  tenantCode: string;
  sbuCode?: string | null;
  whatsapp?: string;
}) {
  try {
    console.log('[createStaffAdmin] Processing:', payload.email);

    // 1. Create/Update User via Admin API
    const { data: { users }, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = users.find(u => u.email === payload.email);

    let userId;
    if (existingUser) {
      const { data: updateData, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { 
          password: payload.password,
          user_metadata: { full_name: payload.fullName, role: payload.roleCode }
        }
      );
      if (updateError) throw updateError;
      userId = existingUser.id;
    } else {
      const { data: createData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: payload.email,
        password: payload.password,
        email_confirm: true,
        user_metadata: {
          full_name: payload.fullName,
          role: payload.roleCode
        }
      });
      if (authError) throw authError;
      userId = createData.user.id;
    }

    // 2. Sync to Business Tables (RPC)
    // We explicitly call the RPC to ensure data exists in tenant_users
    const { data: rpcResponse, error: rpcError } = await supabaseAdmin.rpc('add_tenant_staff', {
      p_tenant_code: payload.tenantCode,
      p_email: payload.email,
      p_full_name: payload.fullName,
      p_role_code: payload.roleCode,
      p_sbu_code: payload.sbuCode || null,
      p_whatsapp: payload.whatsapp || null,
      p_temp_password: payload.password
    });

    if (rpcError) throw rpcError;
    
    // Safety check on RPC response
    if (rpcResponse && rpcResponse.success === false) {
       throw new Error(rpcResponse.message || 'Database sync failed');
    }

    console.log('[createStaffAdmin] Success for:', payload.email);
    return { success: true, message: 'Staff successfully created and authorized.' };
  } catch (err: any) {
    console.error('[createStaffAdmin] Fatal Error:', err.message);
    return { success: false, message: err.message };
  }
}
