import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

async function check() {
  const { data: companies } = await supabase.from('companies').select('*').limit(1)
  const { data: fleets } = await supabase.from('fleets').select('*').limit(1)
  const { data: drivers } = await supabase.from('drivers').select('*').limit(1)

  console.log("COMPANIES:", Object.keys(companies?.[0] || {}))
  console.log("FLEETS:", Object.keys(fleets?.[0] || {}))
  console.log("DRIVERS:", Object.keys(drivers?.[0] || {}))
}

check()
