import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
)

async function checkSchema() {
  // Check job_tracking columns
  const { data: tracking } = await supabase.from('job_tracking').select('*').limit(1)
  console.log('Job Tracking Sample:', tracking?.[0] ? Object.keys(tracking[0]) : 'Empty')

  // Check job_routes columns
  const { data: routes } = await supabase.from('job_routes').select('*').limit(1)
  console.log('Job Routes Sample:', routes?.[0] ? Object.keys(routes[0]) : 'Empty')
}

checkSchema()
