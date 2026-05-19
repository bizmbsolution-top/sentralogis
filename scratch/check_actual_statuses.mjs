import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
)

async function checkActualStatuses() {
  console.log('Fetching unique Job Order statuses...')
  const { data, error } = await supabase.from('job_orders').select('status')
  if (error) {
    console.error(error)
    return
  }
  
  const statusCounts = data.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1
    return acc
  }, {})
  
  console.log('Status Distribution:', statusCounts)

  console.log('\nChecking some samples for each status...')
  for (const status of Object.keys(statusCounts)) {
    const { data: sample } = await supabase.from('job_orders').select('jo_number, status, advance_status, is_doc_finished, is_cost_finished').eq('status', status).limit(1)
    console.log(`Sample [${status}]:`, sample?.[0])
  }
}

checkActualStatuses()
