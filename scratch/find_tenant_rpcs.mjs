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

async function findRPCs() {
  const { data, error } = await supabase.rpc('exec_sql_manual', {
    sql_query: "SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name LIKE '%tenant%'"
  })
  if (error) console.error(error)
  else console.log('Tenant RPCs:', data.map(r => r.routine_name))
}

findRPCs()
