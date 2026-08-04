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
  warehouseId?: string | null;
  regionId?: string | null;
  whatsapp?: string;
  division?: string;
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

    // 3. Assign to Specific Warehouse or Division if provided
    if (payload.warehouseId || payload.division || payload.regionId) {
       const tenantUsersUpdate: any = {};
       if (payload.warehouseId) tenantUsersUpdate.warehouse_id = payload.warehouseId;
       if (payload.regionId) tenantUsersUpdate.region_id = payload.regionId;
       if (payload.division) tenantUsersUpdate.division = payload.division;

       const { error: tenantUsersError } = await supabaseAdmin
         .from('tenant_users')
         .update(tenantUsersUpdate)
         .eq('user_id', userId);
      
       if (tenantUsersError) {
         console.error('[createStaffAdmin] Failed to update tenant_users extra fields:', tenantUsersError);
       }

        // Also sync region_id to wo_organization_users as fallback (for HQ/CS roles that use org-based queries)
        if (payload.regionId) {
          const { data: tuData } = await supabaseAdmin
            .from('tenant_users')
            .select('tenant_id, user_id')
            .eq('user_id', userId)
            .maybeSingle();

          if (tuData?.tenant_id) {
            const { error: woOrgUpsertError } = await supabaseAdmin
              .from('wo_organization_users')
              .upsert({
                tenant_id: tuData.tenant_id,
                user_id: userId,
                organization_id: null,
                role_code: payload.roleCode || 'staff',
                assigned_region_id: payload.regionId,
              }, { onConflict: 'tenant_id, user_id' });

            if (woOrgUpsertError) {
              console.error('[createStaffAdmin] Failed to sync wo_organization_users:', woOrgUpsertError);
            }
          }
        }
    }

    console.log('[createStaffAdmin] Success for:', payload.email);
    return { success: true, message: 'Staff successfully created and authorized.' };
  } catch (err: any) {
    console.error('[createStaffAdmin] Fatal Error:', err.message);
    return { success: false, message: err.message };
  }
}

export async function deleteStaffAdmin(userId: string) {
  try {
    // Attempt to delete user via Admin Auth. 
    // Supabase will cascade delete to profiles and tenant_users if foreign keys have ON DELETE CASCADE.
    // If not, it will throw an error, which we catch.
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw error;
    
    return { success: true, message: 'Staff deleted successfully' };
  } catch (err: any) {
    console.error('[deleteStaffAdmin] Fatal Error:', err.message);
    return { success: false, message: err.message };
  }
}
