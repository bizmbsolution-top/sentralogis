import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
)

async function listTables() {
  const { data, error } = await supabase.rpc('get_tables') // Usually there is a helper for this or we just guess
  // If RPC doesn't exist, we check common names
  const tables = ['job_attachments', 'job_photos', 'job_documents', 'job_milestones']
  for (const t of tables) {
    const { data: sample, error: err } = await supabase.from(t).select('*').limit(1)
    if (!err) console.log(`Table found: ${t}`, sample?.[0] ? Object.keys(sample[0]) : 'Empty')
  }
}

listTables()
