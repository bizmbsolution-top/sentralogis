import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf8')
const getEnv = (key) => {
  const match = env.match(new RegExp(`${key}=(.*)`))
  return match ? match[1].trim() : null
}

const supabase = createClient(
  getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

async function checkTenant() {
  const joNumber = 'WO/05/2026/002-ITM-01-001'
  
  // 1. Ambil Tenant ID dari JO
  const { data: jo } = await supabase
    .from('job_orders')
    .select('tenant_id')
    .eq('jo_number', joNumber)
    .single()

  if (!jo) return

  // 2. Ambil Nama Tenant
  const { data: tenant } = await supabase
    .from('md_tenants') // Menyesuaikan dengan standar prefix md_
    .select('name')
    .eq('id', jo.tenant_id)
    .single()

  if (tenant) {
    console.log("Tenant Name:", tenant.name)
  } else {
    // Coba tabel tanpa prefix jika gagal
    const { data: tenantAlt } = await supabase
      .from('tenants')
      .select('name')
      .eq('id', jo.tenant_id)
      .single()
    console.log("Tenant Name (Alt):", tenantAlt?.name)
  }
}

checkTenant()
