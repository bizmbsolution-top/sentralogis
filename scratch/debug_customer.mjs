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

async function debugCustomer() {
  const { data, error } = await supabase
    .from('work_orders')
    .select('*, md_entities(*)')
    .limit(1)

  if (error) {
    console.log("MD_ENTITIES JOIN ERROR:", error.message)
    const { data: d2, error: e2 } = await supabase.from('work_orders').select('*, customer:customer_id(*)').limit(1)
    if (e2) console.log("CUSTOMER:CUSTOMER_ID JOIN ERROR:", e2.message)
    else console.log("CUSTOMER:CUSTOMER_ID JOIN SUCCESS")
  } else {
    console.log("MD_ENTITIES JOIN SUCCESS")
  }
}

debugCustomer()
