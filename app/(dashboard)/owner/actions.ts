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
