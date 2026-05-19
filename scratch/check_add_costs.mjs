import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function checkData() {
  const { data, error, count } = await supabase
    .from('add_costs')
    .select('*', { count: 'exact' })
  
  console.log('add_costs count:', count)
  console.log('Sample data:', data?.[0])
}

checkData()
