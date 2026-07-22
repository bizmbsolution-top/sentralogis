'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const getAdminClient = () => {
  return createClient(supabaseUrl, serviceRoleKey)
}

function getDateRange(period: 'weekly' | 'monthly' | 'quarterly' | 'yearly') {
  const now = new Date()
  let start: Date
  switch (period) {
    case 'weekly': start = new Date(now); start.setDate(now.getDate() - 7); break
    case 'monthly': start = new Date(now); start.setMonth(now.getMonth() - 1); break
    case 'quarterly': start = new Date(now); start.setMonth(now.getMonth() - 3); break
    case 'yearly': start = new Date(now); start.setFullYear(now.getFullYear() - 1); break
  }
  return { start: start.toISOString(), end: now.toISOString() }
}

function getPreviousDateRange(period: 'weekly' | 'monthly' | 'quarterly' | 'yearly') {
  const now = new Date()
  let start: Date, end: Date
  const duration = {
    weekly: 7, monthly: 30, quarterly: 90, yearly: 365
  }[period]
  end = new Date(now)
  end.setDate(end.getDate() - duration)
  start = new Date(end)
  start.setDate(start.getDate() - duration)
  return { start: start.toISOString(), end: end.toISOString() }
}

// ============================================
// HERO METRICS
// ============================================

export async function getHeroMetrics(period: 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly') {
  const admin = getAdminClient()
  const { start, end } = getDateRange(period)
  const prev = getPreviousDateRange(period)

  try {
    const [
      revenue, prevRevenue,
      tokensBurned, prevTokensBurned,
      activeUsers, prevActiveUsers,
      totalTenants, newTenants,
      totalJOs, completedJOs,
      totalFiles
    ] = await Promise.all([
      // Current revenue
      admin.from('topup_requests').select('total_amount, tokens').gte('created_at', start).lte('created_at', end).eq('status', 'approved'),
      // Previous revenue
      admin.from('topup_requests').select('total_amount').gte('created_at', prev.start).lte('created_at', prev.end).eq('status', 'approved'),
      // Current tokens burned (completed JOs)
      admin.from('job_orders').select('id').gte('completed_at', start).lte('completed_at', end).in('status', ['COMPLETED', 'PEKERJAAN SELESAI', 'SELESAI', 'DONE', 'PAID']),
      // Previous tokens burned
      admin.from('job_orders').select('id').gte('completed_at', prev.start).lte('completed_at', prev.end).in('status', ['COMPLETED', 'PEKERJAAN SELESAI', 'SELESAI', 'DONE', 'PAID']),
      // Active users (signed in during period)
      admin.from('profiles').select('id').gte('last_sign_in_at', start).lte('last_sign_in_at', end).eq('is_active', true),
      // Previous active users
      admin.from('profiles').select('id').gte('last_sign_in_at', prev.start).lte('last_sign_in_at', prev.end).eq('is_active', true),
      // Total tenants
      admin.from('tenants').select('id'),
      // New tenants in period
      admin.from('tenants').select('id').gte('created_at', start).lte('created_at', end),
      // Total JOs
      admin.from('job_orders').select('id').gte('created_at', start).lte('created_at', end),
      // Completed JOs
      admin.from('job_orders').select('id').gte('created_at', start).lte('created_at', end).in('status', ['COMPLETED', 'PEKERJAAN SELESAI', 'SELESAI', 'DONE', 'PAID']),
      // Storage files
      admin.from('documents').select('id'),
    ])

    const calcGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0
      return ((current - previous) / previous) * 100
    }

    const currentRevenue = revenue.data?.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0) || 0
    const prevRevenueVal = prevRevenue.data?.reduce((sum, r) => sum + (Number(r.total_amount) || 0), 0) || 0
    const tokensSold = revenue.data?.reduce((sum, r) => sum + (Number(r.tokens) || 0), 0) || 0

    return {
      success: true,
      revenue: currentRevenue,
      revenueGrowth: calcGrowth(currentRevenue, prevRevenueVal),
      tokensSold,
      tokensBurned: tokensBurned.data?.length || 0,
      tokensBurnedGrowth: calcGrowth(tokensBurned.data?.length || 0, prevTokensBurned.data?.length || 0),
      activeUsers: activeUsers.data?.length || 0,
      activeUsersGrowth: calcGrowth(activeUsers.data?.length || 0, prevActiveUsers.data?.length || 0),
      totalTenants: totalTenants.data?.length || 0,
      newTenants: newTenants.data?.length || 0,
      totalJOs: totalJOs.data?.length || 0,
      completedJOs: completedJOs.data?.length || 0,
      joCompletionRate: totalJOs.data?.length ? ((completedJOs.data?.length || 0) / totalJOs.data?.length) * 100 : 0,
      totalFiles: totalFiles.data?.length || 0,
      period,
      range: { start, end }
    }
  } catch (error: any) {
    console.error('getHeroMetrics error:', error)
    return { success: false, revenue: 0, revenueGrowth: 0, tokensSold: 0, tokensBurned: 0, tokensBurnedGrowth: 0, activeUsers: 0, activeUsersGrowth: 0, totalTenants: 0, newTenants: 0, totalJOs: 0, completedJOs: 0, joCompletionRate: 0, totalFiles: 0, period, range: { start, end } }
  }
}

// ============================================
// REVENUE TIMELINE (for sparkline)
// ============================================

export async function getRevenueTimeline(days: number = 30) {
  const admin = getAdminClient()
  const now = new Date()
  const start = new Date(now)
  start.setDate(start.getDate() - days)

  try {
    const { data, error } = await admin
      .from('topup_requests')
      .select('total_amount, created_at')
      .gte('created_at', start.toISOString())
      .eq('status', 'approved')
      .order('created_at', { ascending: true })

    if (error) throw error

    // Group by day
    const daily: Record<string, number> = {}
    data?.forEach(r => {
      const day = new Date(r.created_at).toISOString().split('T')[0]
      daily[day] = (daily[day] || 0) + (Number(r.total_amount) || 0)
    })

    const timeline = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      timeline.push({ date: key, amount: daily[key] || 0 })
    }

    return { success: true, timeline, total: timeline.reduce((s, d) => s + d.amount, 0) }
  } catch (error: any) {
    console.error('getRevenueTimeline error:', error)
    return { success: false, timeline: [], total: 0 }
  }
}

// ============================================
// TOKEN USAGE BY TENANT
// ============================================

export async function getTokenUsageByTenant(period: 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly') {
  const admin = getAdminClient()
  const { start, end } = getDateRange(period)

  try {
    // 1. Get completed JOs (consumed tokens) per tenant
    const { data: jobs, error: jobsError } = await admin
      .from('job_orders')
      .select('id, tenant_id, completed_at')
      .gte('completed_at', start)
      .lte('completed_at', end)
      .in('status', ['COMPLETED', 'PEKERJAAN SELESAI', 'SELESAI', 'DONE', 'PAID'])

    if (jobsError) throw jobsError

    const consumedByTenant: Record<string, number> = {}
    jobs?.forEach(j => {
      const tid = j.tenant_id
      consumedByTenant[tid] = (consumedByTenant[tid] || 0) + 1
    })

    // [AI] Use tenants.token_balance as single source of truth instead of SUM(token_transactions)
    // This matches what fetchTenantsAdmin() and the tenant dashboard display
    const tenantIds = Object.keys(consumedByTenant)
    const balances: Record<string, number> = {}
    const tenantNames: Record<string, string> = {}

    if (tenantIds.length > 0) {
      // Get balances from tenants.token_balance (single source of truth)
      const { data: tenants, error: tError } = await admin
        .from('tenants')
        .select('id, name, tenant_code, token_balance')
        .in('id', tenantIds)

      if (!tError && tenants) {
        tenants.forEach(t => {
          balances[t.id] = Number(t.token_balance) || 0
          tenantNames[t.id] = t.name || t.tenant_code
        })
      }
    }

    const result = tenantIds.map(id => {
      const remaining = balances[id] || 0
      const consumed = consumedByTenant[id] || 0
      const total = remaining + consumed
      return { tenant_id: id, tenant_name: tenantNames[id] || 'Unknown', total, remaining, consumed }
    }).sort((a, b) => b.total - a.total)

    return { success: true, byTenant: result, total: jobs?.length || 0 }
  } catch (error: any) {
    console.error('getTokenUsageByTenant error:', error)
    return { success: false, byTenant: [], total: 0 }
  }
}

// ============================================
// REVENUE BY TENANT
// ============================================

export async function getRevenueByTenant(period: 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly') {
  const admin = getAdminClient()
  const { start, end } = getDateRange(period)

  try {
    const { data: topups, error } = await admin
      .from('topup_requests')
      .select('tenant_id, tokens, total_amount')
      .gte('created_at', start)
      .lte('created_at', end)
      .eq('status', 'approved')

    if (error) throw error

    const byTenant: Record<string, { amount: number, tokens: number }> = {}
    topups?.forEach(t => {
      const tid = t.tenant_id
      if (!byTenant[tid]) byTenant[tid] = { amount: 0, tokens: 0 }
      byTenant[tid].amount += Number(t.total_amount) || 0
      byTenant[tid].tokens += Number(t.tokens) || 0
    })

    const tenantIds = Object.keys(byTenant)
    const tenantNames: Record<string, string> = {}
    if (tenantIds.length > 0) {
      const { data: tenants } = await admin.from('tenants').select('id, name, tenant_code').in('id', tenantIds)
      tenants?.forEach(t => { tenantNames[t.id] = t.name || t.tenant_code })
    }

    const result = Object.entries(byTenant)
      .map(([id, data]) => ({ tenant_id: id, tenant_name: tenantNames[id] || 'Unknown', ...data }))
      .sort((a, b) => b.amount - a.amount)

    return { success: true, byTenant: result, total: topups?.reduce((s, t) => s + (Number(t.total_amount) || 0), 0) || 0 }
  } catch (error: any) {
    console.error('getRevenueByTenant error:', error)
    return { success: false, byTenant: [], total: 0 }
  }
}

// ============================================
// STORAGE USAGE PER TENANT
// ============================================

export async function getStorageByTenant() {
  const admin = getAdminClient()

  try {
    const { data: documents, error: docError } = await admin
      .from('documents')
      .select('id, job_order_id')
    
    if (docError) throw docError

    // Get tenant_id from job_orders
    const joIds = [...new Set(documents?.map(d => d.job_order_id).filter(Boolean))]
    const joTenantMap: Record<string, string> = {}
    if (joIds.length > 0) {
      const { data: jos } = await admin.from('job_orders').select('id, tenant_id').in('id', joIds)
      jos?.forEach(j => { joTenantMap[j.id] = j.tenant_id })
    }

    const byTenant: Record<string, number> = {}
    documents?.forEach(d => {
      const tid = joTenantMap[d.job_order_id]
      if (tid) byTenant[tid] = (byTenant[tid] || 0) + 1
    })

    // Also count POD photos from job_orders
    const { data: josWithPod } = await admin
      .from('job_orders')
      .select('tenant_id, pod_photo_url')
      .not('pod_photo_url', 'is', null)
    
    josWithPod?.forEach(j => {
      const tid = j.tenant_id
      byTenant[tid] = (byTenant[tid] || 0) + 1
    })

    const tenantIds = Object.keys(byTenant)
    const tenantNames: Record<string, string> = {}
    if (tenantIds.length > 0) {
      const { data: tenants } = await admin.from('tenants').select('id, name, tenant_code').in('id', tenantIds)
      tenants?.forEach(t => { tenantNames[t.id] = t.name || t.tenant_code })
    }

    const result = Object.entries(byTenant)
      .map(([id, files]) => ({ tenant_id: id, tenant_name: tenantNames[id] || 'Unknown', files }))
      .sort((a, b) => b.files - a.files)

    const totalFiles = result.reduce((s, t) => s + t.files, 0)

    return { success: true, byTenant: result, totalFiles, supabaseLimit: 1000, usagePercent: (totalFiles / 1000) * 100 }
  } catch (error: any) {
    console.error('getStorageByTenant error:', error)
    return { success: false, byTenant: [], totalFiles: 0, supabaseLimit: 1000, usagePercent: 0 }
  }
}

// ============================================
// ACTIVE USERS PER TENANT
// ============================================

export async function getActiveUsersByTenant(period: 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly') {
  const admin = getAdminClient()
  const { start, end } = getDateRange(period)

  try {
    const { data: profiles, error } = await admin
      .from('profiles')
      .select('id, full_name, email, role, tenant_id, last_sign_in_at, is_active')
      .eq('is_active', true)

    if (error) throw error

    const tenantIds = [...new Set(profiles?.map(p => p.tenant_id).filter(Boolean))]
    const tenantNames: Record<string, string> = {}
    if (tenantIds.length > 0) {
      const { data: tenants } = await admin.from('tenants').select('id, name, tenant_code').in('id', tenantIds)
      tenants?.forEach(t => { tenantNames[t.id] = t.name || t.tenant_code })
    }

    const byTenant: Record<string, { count: number, users: any[] }> = {}
    profiles?.forEach(p => {
      const tid = p.tenant_id || 'no_tenant'
      if (!byTenant[tid]) byTenant[tid] = { count: 0, users: [] }
      byTenant[tid].count++
      byTenant[tid].users.push({
        id: p.id, name: p.full_name, email: p.email, role: p.role,
        last_sign_in: p.last_sign_in_at
      })
    })

    const result = Object.entries(byTenant)
      .map(([id, data]) => ({ tenant_id: id, tenant_name: tenantNames[id] || 'No Tenant', count: data.count, users: data.users }))
      .sort((a, b) => b.count - a.count)

    return { success: true, byTenant: result, totalUsers: profiles?.length || 0 }
  } catch (error: any) {
    console.error('getActiveUsersByTenant error:', error)
    return { success: false, byTenant: [], totalUsers: 0 }
  }
}

// ============================================
// NEW TENANTS MONTHLY
// ============================================

export async function getNewTenantsMonthly(months: number = 12) {
  const admin = getAdminClient()
  const now = new Date()
  const startDate = new Date(now)
  startDate.setMonth(now.getMonth() - months)

  try {
    const { data: tenants, error } = await admin
      .from('tenants')
      .select('id, name, tenant_code, created_at')
      .gte('created_at', startDate.toISOString())
      .order('created_at', { ascending: true })

    if (error) throw error

    const monthlyData: Record<string, { count: number, tenants: any[] }> = {}
    tenants?.forEach(t => {
      const date = new Date(t.created_at)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      if (!monthlyData[monthKey]) monthlyData[monthKey] = { count: 0, tenants: [] }
      monthlyData[monthKey].count++
      monthlyData[monthKey].tenants.push({ id: t.id, name: t.name || t.tenant_code, created_at: t.created_at })
    })

    const result = []
    for (let i = months - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const monthName = d.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' })
      result.push({ month: monthKey, label: monthName, count: monthlyData[monthKey]?.count || 0, tenants: monthlyData[monthKey]?.tenants || [] })
    }

    return { success: true, totalNew: result.reduce((s, m) => s + m.count, 0), monthly: result }
  } catch (error: any) {
    console.error('getNewTenantsMonthly error:', error)
    return { success: false, totalNew: 0, monthly: [] }
  }
}

// ============================================
// SBU TYPE BREAKDOWN
// ============================================

export async function getSbuBreakdown(period: 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly') {
  const admin = getAdminClient()
  const { start, end } = getDateRange(period)

  try {
    const { data: works, error } = await admin
      .from('work_orders')
      .select('id, sbu_type, status')
      .gte('created_at', start)
      .lte('created_at', end)

    if (error) throw error

    const bySbu: Record<string, { total: number, completed: number }> = {}
    works?.forEach(w => {
      const type = w.sbu_type || 'unknown'
      if (!bySbu[type]) bySbu[type] = { total: 0, completed: 0 }
      bySbu[type].total++
      if (['completed', 'paid', 'closed'].includes(w.status?.toLowerCase())) bySbu[type].completed++
    })

    const result = Object.entries(bySbu).map(([type, data]) => ({
      sbu_type: type,
      ...data,
      completion_rate: data.total ? (data.completed / data.total) * 100 : 0
    }))

    return { success: true, bySbu: result }
  } catch (error: any) {
    console.error('getSbuBreakdown error:', error)
    return { success: false, bySbu: [] }
  }
}

// ============================================
// TOP PENDING TOP-UPS
// ============================================

export async function getPendingTopups() {
  const admin = getAdminClient()
  try {
    const { data, error } = await admin
      .from('topup_requests')
      .select('id, tenant_id, tokens, total_amount, created_at, status')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) throw error

    const tenantIds = [...new Set(data?.map(d => d.tenant_id).filter(Boolean))]
    const tenantNames: Record<string, string> = {}
    if (tenantIds.length > 0) {
      const { data: tenants } = await admin.from('tenants').select('id, name, tenant_code').in('id', tenantIds)
      tenants?.forEach(t => { tenantNames[t.id] = t.name || t.tenant_code })
    }

    const result = data?.map(d => ({
      ...d,
      tenant_name: tenantNames[d.tenant_id] || 'Unknown',
      hours_pending: Math.floor((Date.now() - new Date(d.created_at).getTime()) / (1000 * 60 * 60))
    })) || []

    return { success: true, pending: result }
  } catch (error: any) {
    console.error('getPendingTopups error:', error)
    return { success: false, pending: [] }
  }
}

// ============================================
// COMBINED DASHBOARD
// ============================================

export async function getOwnerDashboard(period: 'weekly' | 'monthly' | 'quarterly' | 'yearly' = 'monthly') {
  const [hero, revenueTimeline, tokenUsage, revenueByTenant, storage, activeUsers, newTenants, sbuBreakdown, pendingTopups] = await Promise.all([
    getHeroMetrics(period),
    getRevenueTimeline(30),
    getTokenUsageByTenant(period),
    getRevenueByTenant(period),
    getStorageByTenant(),
    getActiveUsersByTenant(period),
    getNewTenantsMonthly(12),
    getSbuBreakdown(period),
    getPendingTopups()
  ])

  return { success: true, hero, revenueTimeline, tokenUsage, revenueByTenant, storage, activeUsers, newTenants, sbuBreakdown, pendingTopups, period }
}
