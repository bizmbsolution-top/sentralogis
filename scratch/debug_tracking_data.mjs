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
  const { count, error } = await supabase.from('job_tracking').select('*', { count: 'exact', head: true })
  console.log("Total rows in job_tracking:", count)
  
  const { data: samples } = await supabase.from('job_tracking').select('*').limit(5)
  console.log("Samples:", samples)
}

debugTracking()
