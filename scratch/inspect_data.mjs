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

async function inspectData() {
  const { data } = await supabase
    .from('job_orders')
    .select(`
      *,
      md_fleets (
        *,
        md_fleet_types (*)
      )
    `)
    .limit(1)

  console.log("Full Fleet Data:", JSON.stringify(data[0].md_fleets, null, 2))
}

inspectData()
