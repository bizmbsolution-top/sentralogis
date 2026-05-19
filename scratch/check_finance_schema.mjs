import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
)

async function checkExtraCosts() {
  console.log('Checking extra_costs schema...')
  const { data, error } = await supabase.from('extra_costs').select('*').limit(1)
  if (error) {
    console.error('Error:', error)
  } else {
    console.log('extra_costs columns:', Object.keys(data[0] || {}))
    console.log('Sample row:', data[0])
  }

  console.log('\nChecking job_orders finance columns...')
  const { data: jo, error: joe } = await supabase.from('job_orders').select('*').limit(1)
  if (joe) {
    console.error('Error:', joe)
  } else {
    console.log('job_orders finance related columns:', Object.keys(jo[0] || {}).filter(c => 
      c.includes('price') || c.includes('cost') || c.includes('advance') || c.includes('payout') || c.includes('status')
    ))
  }
}

checkExtraCosts()
