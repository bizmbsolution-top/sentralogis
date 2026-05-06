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

async function migrateOldData() {
  const joNumber = 'WO/05/2026/002-ITM-01-001'
  
  // 1. Ambil JO & Item data
  const { data: jo } = await supabase
    .from('job_orders')
    .select('*, wo_items(*)')
    .eq('jo_number', joNumber)
    .single()

  if (!jo || !jo.wo_items) return

  const itemData = jo.wo_items.item_data
  console.log("Item Data found:", itemData.shipper_name, "to", itemData.recipient_name)

  // 2. Jika rute kosong, kita buatkan rute dasar (Pickup & Dropoff)
  const { data: existingRoutes } = await supabase.from('job_routes').select('id').eq('job_order_id', jo.id)
  
  if (existingRoutes?.length === 0) {
    console.log("Generating default routes for old data...")
    const routes = [
      {
        job_order_id: jo.id,
        sequence: 1,
        stop_type: 'PICKUP',
        location_name: itemData.shipper_name || itemData.origin_name || 'ORIGIN',
        address: itemData.shipper_address || itemData.origin_address || 'Address not set',
        source_type: 'MD_LOCATION',
        source_id: 'LEGACY',
        status: 'pending'
      },
      {
        job_order_id: jo.id,
        sequence: 2,
        stop_type: 'DROPOFF',
        location_name: itemData.recipient_name || itemData.destination_name || 'DESTINATION',
        address: itemData.recipient_address || itemData.destination_address || 'Address not set',
        source_type: 'MD_LOCATION',
        source_id: 'LEGACY',
        status: 'pending'
      }
    ]

    const { error } = await supabase.from('job_routes').insert(routes)
    if (error) console.error("Migration Error:", error.message)
    else console.log("Migration Success! Please refresh driver phone.")
  } else {
    console.log("Routes already exist, no migration needed.")
  }
}

migrateOldData()
