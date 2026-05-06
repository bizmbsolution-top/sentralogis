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

async function backfillTracking() {
  console.log("Starting backfill for job_tracking...")

  // 1. Backfill from job_orders
  const { data: jos } = await supabase.from('job_orders').select('id, accepted_at, started_at, completed_at')
  for (const jo of jos || []) {
    if (jo.accepted_at) await supabase.from('job_tracking').insert({ job_order_id: jo.id, status_update: 'ACCEPTED', created_at: jo.accepted_at, notes: 'Auto-backfilled' })
    if (jo.started_at) await supabase.from('job_tracking').insert({ job_order_id: jo.id, status_update: 'IN_PROGRESS', created_at: jo.started_at, notes: 'Auto-backfilled' })
    if (jo.completed_at) await supabase.from('job_tracking').insert({ job_order_id: jo.id, status_update: 'COMPLETED', created_at: jo.completed_at, notes: 'Auto-backfilled' })
  }

  // 2. Backfill from job_routes
  const { data: routes } = await supabase.from('job_routes').select('id, job_order_id, actual_arrival, actual_departure, stop_type, location_name')
  for (const route of routes || []) {
    if (route.actual_arrival) await supabase.from('job_tracking').insert({ 
      job_order_id: route.job_order_id, 
      status_update: 'STOP_ARRIVED', 
      created_at: route.actual_arrival, 
      notes: `Arrived at ${route.location_name} (${route.stop_type})` 
    })
    if (route.actual_departure) await supabase.from('job_tracking').insert({ 
      job_order_id: route.job_order_id, 
      status_update: 'STOP_COMPLETED', 
      created_at: route.actual_departure, 
      notes: `Departed from ${route.location_name} (${route.stop_type})` 
    })
  }

  console.log("Backfill complete.")
}

backfillTracking()
