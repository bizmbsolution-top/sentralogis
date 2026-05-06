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

async function migrateAllOldData() {
  // 1. Ambil semua JO yang tidak punya rute
  const { data: jobOrders } = await supabase
    .from('job_orders')
    .select('*, wo_items(*)')

  if (!jobOrders) return

  for (const jo of jobOrders) {
    const { data: routes } = await supabase.from('job_routes').select('id').eq('job_order_id', jo.id)
    
    if (routes?.length === 0 && jo.wo_items) {
      console.log(`Migrating JO: ${jo.jo_number}`)
      const itemData = jo.wo_items.item_data
      
      const newRoutes = [
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

      const { error } = await supabase.from('job_routes').insert(newRoutes)
      if (error) console.error(`Error migrating ${jo.jo_number}:`, error.message)
    }
  }
  console.log("All migrations finished.")
}

migrateAllOldData()
