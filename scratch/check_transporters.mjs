import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
)

async function checkFleetTransporter() {
  console.log('Checking md_fleets columns...')
  const { data, error } = await supabase.from('md_fleets').select('*').limit(1)
  if (error) console.error(error)
  else console.log('md_fleets columns:', Object.keys(data[0] || {}))

  console.log('\nChecking md_transporters columns...')
  const { data: t, error: te } = await supabase.from('md_transporters').select('*').limit(1)
  if (te) console.error(te)
  else console.log('md_transporters columns:', Object.keys(t[0] || {}))
}

checkFleetTransporter()
