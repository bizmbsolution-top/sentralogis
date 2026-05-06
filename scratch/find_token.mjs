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

async function findToken() {
  const token = 'koqu728yhejace8yqvjfdb'
  const { data, error } = await supabase
    .from('job_orders')
    .select('jo_number, driver_link_token, tracking_token')
    .or(`driver_link_token.eq.${token},tracking_token.eq.${token}`)
    .maybeSingle()

  if (error) {
    console.error("Error:", error.message)
  } else if (data) {
    console.log("Token FOUND in database:")
    console.log(data)
  } else {
    console.log("Token NOT FOUND in database. This explains the 404.")
  }
}

findToken()
