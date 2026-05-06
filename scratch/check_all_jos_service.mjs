import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const env = fs.readFileSync('.env.local', 'utf8')
const getEnv = (key) => env.match(new RegExp(`${key}=(.*)`))?.[1]?.trim()

const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('SUPABASE_SERVICE_ROLE_KEY'))

async function checkAllJOs() {
  const { data, error } = await supabase
    .from('job_orders')
    .select('id, jo_number, status, tenant_id')
    .order('updated_at', { ascending: false })
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('All JOs (Service Role):', data)
  }
}

checkAllJOs()
