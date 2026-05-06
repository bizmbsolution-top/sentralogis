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

async function debugWO() {
  const { data, error } = await supabase
    .from('wo_items')
    .select('*, work_orders(*)')
    .limit(1)

  if (error) {
    console.log("WO JOIN ERROR:", error.message)
    // Try different relationship name
    const { data: d2, error: e2 } = await supabase.from('wo_items').select('*, wo:wo_id(*)').limit(1)
    if (e2) console.log("WO:WO_ID JOIN ERROR:", e2.message)
    else console.log("WO:WO_ID JOIN SUCCESS")
  } else {
    console.log("WORK_ORDERS JOIN SUCCESS")
  }
}

debugWO()
