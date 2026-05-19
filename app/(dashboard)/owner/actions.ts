'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const getAdminClient = () => {
  return createClient(supabaseUrl, serviceRoleKey)
}

export async function fetchTenantsAdmin() {
  const admin = getAdminClient()
  
  try {
    // Fetch tenants
    const { data: tenants, error: tError } = await admin
      .from('tenants')
      .select('*')
      .order('created_at', { ascending: false })

    if (tError) throw tError

    // Fetch all profiles to join in memory
    const { data: profiles, error: pError } = await admin
      .from('profiles')
      .select('id, email, full_name, whatsapp')

    if (pError) throw pError

    // Map profiles for quick lookup
    const profileMap = (profiles || []).reduce((acc: any, p: any) => {
      acc[p.id] = p
      return acc
    }, {})

    return { 
      success: true, 
      data: (tenants || []).map((t: any) => {
        const profile = profileMap[t.user_id] || {}
        return {
          id: t.id,
          tenant_code: t.tenant_code,
          name: t.name,
          subscription_tier: t.subscription_tier,
          token_balance: t.token_balance,
          user_id: t.user_id,
          status: t.status || 'active',
          admin_email: profile.email || t.email || 'N/A',
          admin_name: profile.full_name || 'N/A',
          whatsapp: (profile.whatsapp && !profile.whatsapp.includes('@')) ? profile.whatsapp : 'N/A',
          created_at: t.created_at
        }
      })
    }
  } catch (error: any) {
    console.error('fetchTenantsAdmin error:', error)
    return { success: false, message: error.message }
  }
}

export async function resetTenantPassword(userId: string, newPassword: string) {
  const admin = getAdminClient()
  
  try {
    const { error } = await admin.auth.admin.updateUserById(userId, {
      password: newPassword
    })

    if (error) throw error

    return { success: true, message: 'Password berhasil direset' }
  } catch (error: any) {
    console.error('resetTenantPassword error:', error)
    return { success: false, message: error.message }
  }
}

export async function fetchTenantHistory(tenantCode: string) {
  const admin = getAdminClient()
  try {
    const { data, error } = await admin
      .from('token_transactions')
      .select('*')
      .eq('tenant_code', tenantCode)
      .order('created_at', { ascending: false })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('fetchTenantHistory error:', error)
    return { success: false, message: error.message }
  }
}

export async function getLedgerStartingBalance(tenantCode: string, startDate: string) {
  const admin = getAdminClient()
  try {
    const { data, error } = await admin.rpc('exec_sql_manual', {
      sql_query: `SELECT COALESCE(SUM(amount), 0) as balance FROM public.token_transactions WHERE tenant_code = '${tenantCode}' AND created_at < '${startDate}T00:00:00Z'`
    })

    if (error) throw error
    // exec_sql_manual returns array of rows
    return { success: true, balance: data?.[0]?.balance || 0 }
  } catch (error: any) {
    console.error('getLedgerStartingBalance error:', error)
    return { success: false, balance: 0 }
  }
}

export async function toggleTenantStatus(tenantId: string, newStatus: 'active' | 'inactive') {
  const admin = getAdminClient()
  try {
    const { error } = await admin
      .from('tenants')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', tenantId)

    if (error) throw error
    return { success: true, message: `Tenant berhasil di-${newStatus === 'active' ? 'aktifkan' : 'nonaktifkan'}` }
  } catch (error: any) {
    console.error('toggleTenantStatus error:', error)
    return { success: false, message: error.message }
  }
}

// [AI] Register tenant directly via Supabase Admin API.
// The old RPC register_tenant_test has a race condition: the handle_new_user trigger
// auto-creates a profile row when auth.users is inserted, then the RPC tries to INSERT
// into profiles again → duplicate key error. This approach avoids that entirely.
export async function registerTenantAdmin(params: {
  tenant_name: string
  tenant_code: string
  admin_email: string
  admin_full_name: string
  subscription_tier: string
  whatsapp?: string
}) {
  const admin = getAdminClient()
  try {
    // 1. Check tenant code uniqueness
    const { data: existingTenant } = await admin
      .from('tenants')
      .select('id')
      .eq('tenant_code', params.tenant_code.toUpperCase())
      .maybeSingle()

    if (existingTenant) {
      return { success: false, message: 'Tenant code sudah digunakan' }
    }

    // 2. Check if email already exists
    const { data: existingUsers } = await admin.auth.admin.listUsers()
    const existingUser = existingUsers?.users?.find(u => u.email === params.admin_email)

    let userId: string
    const tempPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-4)

    if (existingUser) {
      // User exists — reuse their ID, reset password
      userId = existingUser.id
      await admin.auth.admin.updateUserById(userId, {
        password: tempPassword,
        email_confirm: true
      })
    } else {
      // 3. Create new auth user
      const { data: newUser, error: authError } = await admin.auth.admin.createUser({
        email: params.admin_email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          full_name: params.admin_full_name,
          role: 'tenant_admin',
          tenant_code: params.tenant_code.toUpperCase()
        }
      })

      if (authError) throw authError
      userId = newUser.user.id
    }

    // 4. Upsert profile (handles trigger race condition)
    const { error: profileError } = await admin
      .from('profiles')
      .upsert({
        id: userId,
        full_name: params.admin_full_name,
        email: params.admin_email,
        role: 'tenant_superadmin',
        is_active: true,
        whatsapp: params.whatsapp || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (profileError) {
      console.error('Profile upsert warning:', profileError.message)
      // Non-fatal — trigger may have created it
    }

    // 5. Create tenant
    const { data: tenantData, error: tenantError } = await admin
      .from('tenants')
      .insert({
        tenant_code: params.tenant_code.toUpperCase(),
        name: params.tenant_name,
        user_id: userId,
        warehouse_id: '9f82b2f9-d6ea-4eac-91d0-332b0fd07559',
        subscription_tier: params.subscription_tier,
        token_balance: 100,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single()

    if (tenantError) throw tenantError

    // 6. Link profile to tenant
    await admin
      .from('profiles')
      .update({ tenant_id: tenantData.id })
      .eq('id', userId)

    return {
      success: true,
      data: {
        success: true,
        tenant_id: tenantData.id,
        tenant_code: params.tenant_code.toUpperCase(),
        user_id: userId,
        admin_user_id: userId,
        temp_password: tempPassword,
        message: 'Tenant berhasil dibuat. Password: ' + tempPassword
      }
    }
  } catch (error: any) {
    console.error('registerTenantAdmin error:', error)
    return { success: false, message: error.message }
  }
}

