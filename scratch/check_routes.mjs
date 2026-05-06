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

async function checkRoutes() {
  const joNumber = 'WO/05/2026/002-ITM-01-001'
  
  // 1. Cari JO ID
  const { data: jo } = await supabase
    .from('job_orders')
    .select('id, jo_number')
    .eq('jo_number', joNumber)
    .single()

  if (!jo) {
    console.log("Job Order not found:", joNumber)
    return
  }

  // 2. Cari rute
  const { data: routes, error } = await supabase
    .from('job_routes')
    .select('*')
    .eq('job_order_id', jo.id)

  if (error) {
    console.error("Error fetching routes:", error.message)
  } else {
    console.log(`Found ${routes.length} routes for JO ${joNumber}:`)
    console.table(routes.map(r => ({ seq: r.sequence, loc: r.location_name, type: r.stop_type })))
  }
}

checkRoutes()
