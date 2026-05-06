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

async function checkRelationships() {
  // Try to fetch with a very broad join to see error messages or success
  const { data, error } = await supabase
    .from('job_orders')
    .select('*, job_tracking(*)')
    .limit(1)
  
  if (error) {
    console.log("Relationship check failed:", error.message)
  } else {
    console.log("Relationship check success with 'job_tracking'")
  }
}

checkRelationships()
