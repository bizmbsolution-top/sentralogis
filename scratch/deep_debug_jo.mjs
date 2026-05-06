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

async function deepDebug() {
  const joNumber = 'WO/05/2026/002-ITM-01-001'
  console.log("Deep Debugging JO:", joNumber)

  const { data: jo } = await supabase.from('job_orders').select('id, status').eq('jo_number', joNumber).single()
  if (!jo) return console.log("JO not found")

  const { data: routes } = await supabase.from('job_routes').select('*').eq('job_order_id', jo.id).order('sequence')
  console.log("Routes data:", routes.map(r => ({ seq: r.sequence, status: r.status, arr: r.actual_arrival, dep: r.actual_departure })))

  const { data: logs } = await supabase.from('job_tracking').select('*').eq('job_order_id', jo.id).order('created_at', { ascending: false })
  console.log("Logs in DB:", logs?.length || 0)
  if (logs && logs.length > 0) console.log("First log:", logs[0])
}

deepDebug()
