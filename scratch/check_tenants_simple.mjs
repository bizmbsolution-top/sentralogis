import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkTenants() {
  const { data, error, count } = await supabase
    .from('tenants')
    .select('*', { count: 'exact' })

  if (error) {
    console.error('Error fetching tenants:', error)
  } else {
    console.log('Tenant count:', count)
    console.log('Tenants:', JSON.stringify(data, null, 2))
  }
}

checkTenants()
