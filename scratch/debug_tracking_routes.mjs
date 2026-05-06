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

async function debugTracking() {
  const { data, error } = await supabase
    .from('job_orders')
    .select('*, job_routes(*)')
    .limit(1)

  if (error) {
    console.log("JOB_ROUTES JOIN ERROR:", error.message)
  } else {
    console.log("JOB_ROUTES JOIN SUCCESS")
  }
}

debugTracking()
