import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
)

async function checkAcceptedJobs() {
  console.log('Searching for Driver Accepted jobs...')
  const { data, error } = await supabase.from('job_orders').select('jo_number, status, advance_status').or('status.eq.accepted,status.eq.ORDER DITERIMA')
  if (error) {
    console.error(error)
    return
  }
  console.log('Accepted Jobs in DB:', data)
}

checkAcceptedJobs()
