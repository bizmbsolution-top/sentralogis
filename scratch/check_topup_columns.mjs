import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env.local', 'utf8')
const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'))
  return match ? match[1].trim() : null
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL')
const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkColumns() {
  const { data, error } = await supabase.rpc('exec_sql_manual', {
    sql_query: "SELECT tenant_id, status FROM wo_items LIMIT 5"
  })
  if (error) console.error(error)
  else console.log('Data:', JSON.stringify(data, null, 2))
}

checkColumns()
