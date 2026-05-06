import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

// Read .env.local manually
const env = fs.readFileSync('.env.local', 'utf8')
const getEnv = (key) => {
  const match = env.match(new RegExp(`${key}=(.*)`))
  return match ? match[1].trim() : null
}

const supabase = createClient(
  getEnv('NEXT_PUBLIC_SUPABASE_URL'),
  getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
)

async function checkData() {
  const { data, error } = await supabase
    .from('job_orders')
    .select('jo_number, driver_link_token')
    .order('created_at', { ascending: false })
    .limit(10)

  if (error) {
    console.error("Error:", error.message)
  } else {
    console.log("Recent Job Orders:")
    console.table(data)
  }
}

checkData()
