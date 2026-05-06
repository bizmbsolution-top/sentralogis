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

async function checkRLS() {
  const { data: policies } = await supabase.rpc('get_policies', { table_name: 'job_tracking' })
  console.log("Policies for job_tracking:", policies)
  
  // If RPC doesn't exist, try a simple query with anon key
  const anonSupabase = createClient(
    getEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
  )
  const { data, error } = await anonSupabase.from('job_tracking').select('id').limit(1)
  if (error) {
    console.log("ANON ACCESS ERROR:", error.message)
  } else {
    console.log("ANON ACCESS SUCCESS")
  }
}

checkRLS()
