import { createClient } from '@supabase/supabase-client'
import dotenv from 'dotenv'
dotenv.config()

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function checkTables() {
  const { data, error } = await supabase.from('extra_costs').select('*').limit(1)
  console.log('extra_costs:', { data, error })
  
  const { data: data2, error: error2 } = await supabase.from('add_costs').select('*').limit(1)
  console.log('add_costs:', { data: data2, error: error2 })
}

checkTables()
