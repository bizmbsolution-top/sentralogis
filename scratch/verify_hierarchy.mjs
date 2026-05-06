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

async function verifyHierarchy() {
  const { data, error } = await supabase
    .from('job_orders')
    .select(`
      jo_number,
      tenant_id,
      tracking_token,
      wo_item:wo_item_id (
        work_orders (
          customer_id,
          md_entities:customer_id (name)
        )
      )
    `)
    .order('created_at', { ascending: false })
    .limit(3)

  if (data) {
    console.log("Hierarchy Verification:")
    data.forEach(jo => {
      console.log(`--- JO: ${jo.jo_number} ---`)
      console.log(`Tenant ID: ${jo.tenant_id}`)
      console.log(`Customer Name: ${jo.wo_item?.work_orders?.md_entities?.name}`)
    })
  }
}

verifyHierarchy()
