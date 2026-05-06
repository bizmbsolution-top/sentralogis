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

async function checkTime() {
  const joNumber = 'WO/05/2026/003-ITM-01-001'
  
  const { data: jo } = await supabase
    .from('job_orders')
    .select('*, wo_items(*)')
    .eq('jo_number', joNumber)
    .single()

  if (jo) {
    console.log("Full Item Data:", JSON.stringify(jo.wo_items?.item_data, null, 2))
  }
}

checkTime()
