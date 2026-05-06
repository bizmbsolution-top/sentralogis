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

async function debugDate() {
  const joNumber = 'WO/05/2026/002-ITM-01-001'
  
  // 1. Ambil JO & WO details
  const { data: jo } = await supabase
    .from('job_orders')
    .select('*, wo_items(*, work_orders(*))')
    .eq('jo_number', joNumber)
    .single()

  if (jo) {
    console.log("Execution Date in work_orders:", jo.wo_items?.work_orders?.execution_date)
    console.log("Execution Date in item_data:", jo.wo_items?.item_data?.execution_date)
  }
}

debugDate()
