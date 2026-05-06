import { createClient } from '@supabase/supabase-api'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function checkActiveJOs() {
  const { data, error } = await supabase
    .from('job_orders')
    .select('id, jo_number, status, tenant_id')
    .in('status', ['accepted', 'in_progress'])
  
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('Active JOs:', data)
  }
}

checkActiveJOs()
