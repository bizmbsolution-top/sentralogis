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

async function testFinalQuery() {
  const { data, error } = await supabase
    .from('job_orders')
    .select(`
      *,
      md_drivers (name, phone),
      md_fleets (plate_number, vehicle_type:md_fleet_types(name)),
      wo_item:wo_item_id (
        item_data,
        wo:work_orders (
          wo_number,
          customer:md_entities (name)
        )
      )
    `)
    .limit(5)

  if (error) {
    console.log("FINAL QUERY ERROR:", JSON.stringify(error, null, 2))
  } else {
    console.log("FINAL QUERY SUCCESS. Count:", data.length)
    if (data.length > 0) {
      console.log("Sample JO:", data[0].jo_number)
      console.log("Customer:", data[0].wo_item?.wo?.customer?.name)
    }
  }
}

testFinalQuery()
