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

async function testFixedQuery() {
  const { data, error } = await supabase
    .from('job_orders')
    .select(`
      *,
      md_drivers (name, phone),
      md_fleets (plate_number, vehicle_type:md_fleet_types(type_name)),
      wo_item:wo_item_id (
        item_data,
        wo:work_orders (
          wo_number,
          customer:md_entities (name)
        )
      )
    `)
    .limit(1)

  if (error) {
    console.log("FIXED QUERY ERROR:", JSON.stringify(error, null, 2))
  } else {
    console.log("FIXED QUERY SUCCESS")
    console.log("Type Name:", data[0].md_fleets?.vehicle_type?.type_name)
  }
}

testFixedQuery()
