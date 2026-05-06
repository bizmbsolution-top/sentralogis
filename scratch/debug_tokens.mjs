import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkTokens() {
  const { data, error } = await supabase
    .from('job_orders')
    .select('id, jo_number, driver_link_token')
    .limit(10)

  if (error) {
    console.error("Error:", error.message)
  } else {
    console.log("Current Job Orders and Tokens:")
    console.table(data)
  }
}

checkTokens()
