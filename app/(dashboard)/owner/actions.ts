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

    // [AI] Fetch tenant_sbus to show which SBUs each tenant has activated
    const { data: sbus, error: sbuError } = await admin
      .from('tenant_sbus')
      .select('tenant_id, sbu_type, status')

    if (sbuError) throw sbuError

    // Map profiles for quick lookup
    const profileMap = (profiles || []).reduce((acc: any, p: any) => {
      acc[p.id] = p
      return acc
    }, {})

    // [AI] Map tenant_id → active SBU types (deduplicated)
    const sbuMap: Record<string, Set<string>> = {}
    ;(sbus || []).forEach((s: any) => {
      if (s.status === 'active') {
        if (!sbuMap[s.tenant_id]) sbuMap[s.tenant_id] = new Set()
        sbuMap[s.tenant_id].add(s.sbu_type)
      }
    })

    return { 
      success: true, 
      data: (tenants || []).map((t: any) => {
        const profile = profileMap[t.user_id] || {}
        return {
          id: t.id,
          tenant_code: t.tenant_code,
          name: t.name,
          logo_url: t.logo_url || null,
          subscription_tier: t.subscription_tier,
          token_balance: t.token_balance,
          user_id: t.user_id,
          status: t.status || 'active',
          admin_email: profile.email || t.email || 'N/A',
          admin_name: profile.full_name || 'N/A',
          whatsapp: (profile.whatsapp && !profile.whatsapp.includes('@')) ? profile.whatsapp : 'N/A',
          active_sbus: sbuMap[t.id] ? Array.from(sbuMap[t.id]) : [],
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

// ============================================
// TRANSACTIONS (Owner — all topup_requests + token_transactions)
// ============================================

export async function getAllTopupRequests(filters?: {
  status?: 'pending' | 'approved' | 'rejected';
  tenantId?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const admin = getAdminClient()
  try {
    let query = admin
      .from('topup_requests')
      .select(`
        *,
        tenants (
          id,
          name,
          tenant_code
        )
      `)
      .order('created_at', { ascending: false })

    if (filters?.status) {
      query = query.eq('status', filters.status)
    }
    if (filters?.tenantId) {
      query = query.eq('tenant_id', filters.tenantId)
    }
    if (filters?.dateFrom) {
      query = query.gte('created_at', filters.dateFrom)
    }
    if (filters?.dateTo) {
      query = query.lte('created_at', filters.dateTo)
    }

    const { data, error } = await query

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('getAllTopupRequests error:', error)
    return { success: false, message: error.message, data: [] }
  }
}

export async function getTransactionSummary() {
  const admin = getAdminClient()
  try {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [totalRevenue, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      admin.from('topup_requests').select('total_amount').gte('created_at', monthStart).eq('status', 'approved'),
      admin.from('topup_requests').select('id').eq('status', 'pending'),
      admin.from('topup_requests').select('id').eq('status', 'approved'),
      admin.from('topup_requests').select('id').eq('status', 'rejected'),
    ])

    const revenue = (totalRevenue.data || []).reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0)

    return {
      success: true,
      summary: {
        totalRevenueMonth: revenue,
        pendingCount: pendingCount.data?.length || 0,
        approvedCount: approvedCount.data?.length || 0,
        rejectedCount: rejectedCount.data?.length || 0,
      }
    }
  } catch (error: any) {
    console.error('getTransactionSummary error:', error)
    return { success: false, message: error.message, summary: { totalRevenueMonth: 0, pendingCount: 0, approvedCount: 0, rejectedCount: 0 } }
  }
}

export async function getTenantsList() {
  const admin = getAdminClient()
  try {
    const { data, error } = await admin
      .from('tenants')
      .select('id, name, tenant_code')
      .order('name', { ascending: true })

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('getTenantsList error:', error)
    return { success: false, message: error.message, data: [] }
  }
}

// ============================================
// TOKEN PRICES MANAGEMENT
// ============================================

export async function getTokenPrice() {
  const admin = getAdminClient()
  try {
    const { data, error } = await admin
      .from('token_prices')
      .select('*')
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) throw error
    
    return { 
      success: true, 
      price: data?.price_per_token || 1000,
      currency: data?.currency || 'IDR',
      effectiveFrom: data?.effective_from,
      notes: data?.notes
    }
  } catch (error: any) {
    console.error('getTokenPrice error:', error)
    return { success: false, price: 1000, currency: 'IDR' }
  }
}

export async function getTokenPriceHistory() {
  const admin = getAdminClient()
  try {
    const { data, error } = await admin
      .from('token_price_history')
      .select(`
        *,
        changed_by:profiles(full_name, email)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return { success: true, data: data || [] }
  } catch (error: any) {
    console.error('getTokenPriceHistory error:', error)
    return { success: false, data: [] }
  }
}

export async function updateTokenPrice(params: {
  newPrice: number
  reason?: string
  userId?: string
}) {
  const admin = getAdminClient()
  try {
    // 1. Get current price
    const { data: currentPrice } = await admin
      .from('token_prices')
      .select('price_per_token')
      .order('effective_from', { ascending: false })
      .limit(1)
      .maybeSingle()

    const oldPrice = currentPrice?.price_per_token || 1000

    // 2. End current price record
    await admin
      .from('token_prices')
      .update({ 
        effective_to: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .is('effective_to', null)

    // 3. Insert new price record
    await admin
      .from('token_prices')
      .insert({
        price_per_token: params.newPrice,
        currency: 'IDR',
        effective_from: new Date().toISOString(),
        updated_by: params.userId || null,
        notes: params.reason || 'Price updated'
      })

    // 4. Log to history
    await admin
      .from('token_price_history')
      .insert({
        old_price: oldPrice,
        new_price: params.newPrice,
        changed_by: params.userId || null,
        reason: params.reason || 'Price updated'
      })

    return { 
      success: true, 
      message: `Harga token berhasil diubah dari Rp ${oldPrice.toLocaleString()} ke Rp ${params.newPrice.toLocaleString()}` 
    }
  } catch (error: any) {
    console.error('updateTokenPrice error:', error)
    return { success: false, message: error.message }
  }
}

