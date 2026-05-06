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

async function debugQuery() {
  // Test a simple select first
  const { data: simple, error: err1 } = await supabase.from('job_orders').select('*').limit(1)
  if (err1) console.error("Simple select error:", err1)
  else console.log("Simple select success")

  // Test with one join at a time to find the culprit
  const { error: err2 } = await supabase.from('job_orders').select('*, md_drivers(*)').limit(1)
  if (err2) console.log("Join md_drivers error:", err2.message)
  
  const { error: err3 } = await supabase.from('job_orders').select('*, md_fleets(*)').limit(1)
  if (err3) console.log("Join md_fleets error:", err3.message)

  const { error: err4 } = await supabase.from('job_orders').select('*, wo_item:wo_item_id(*)').limit(1)
  if (err4) console.log("Join wo_item error:", err4.message)
}

debugQuery()
