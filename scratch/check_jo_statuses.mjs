import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
)

async function checkJobOrderStatuses() {
  console.log('Fetching last 20 job orders statuses...')
  const { data, error } = await supabase
    .from('job_orders')
    .select('id, jo_number, status')
    .order('updated_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.table(data)
  
  const uniqueStatuses = [...new Set(data.map(j => j.status))]
  console.log('\nUnique Statuses found in last 20 JOs:', uniqueStatuses)
}

checkJobOrderStatuses()
