import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
)

async function checkTables() {
  console.log('Checking job_tracking...')
  const { data: jt, error: jte } = await supabase.from('job_tracking').select('*').limit(1)
  if (jte) console.error('job_tracking error:', jte)
  else console.log('job_tracking columns:', Object.keys(jt[0] || {}))

  console.log('\nChecking tracking_updates...')
  const { data: tu, error: tue } = await supabase.from('tracking_updates').select('*').limit(1)
  if (tue) console.error('tracking_updates error:', tue)
  else console.log('tracking_updates columns:', Object.keys(tu[0] || {}))
}

checkTables()
