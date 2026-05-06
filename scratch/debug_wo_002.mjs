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

async function debugSpecificWO() {
  const woNumber = 'WO/05/2026/002'
  console.log("Debugging WO:", woNumber)

  const { data: wo } = await supabase.from('work_orders').select('id').eq('wo_number', woNumber).single()
  if (!wo) {
    console.log("WO not found")
    return
  }

  const { data: items } = await supabase.from('wo_items').select('id').eq('wo_id', wo.id)
  const itemIds = items.map(i => i.id)

  const { data: jos } = await supabase.from('job_orders').select('id, jo_number').in('wo_item_id', itemIds)
  console.log("JOs for this WO:", jos)

  for (const jo of jos || []) {
    const { data: logs } = await supabase.from('job_tracking').select('*').eq('job_order_id', jo.id)
    console.log(`Logs for JO ${jo.jo_number}:`, logs?.length || 0)
  }
}

debugSpecificWO()
