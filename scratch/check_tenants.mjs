import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

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
    console.log('Tenants:', data)
  }
}

checkTenants()
