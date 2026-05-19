import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
)

async function checkJOTransporters() {
  const { data, error } = await supabase
    .from('job_orders')
    .select('id, jo_number, md_fleets(md_entities(name, is_vendor))')
    .limit(10)
  
  if (error) console.error(error)
  else console.log(JSON.stringify(data, null, 2))
}

checkJOTransporters()
