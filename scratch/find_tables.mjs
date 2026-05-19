import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
)

async function listAllTables() {
  const { data, error } = await supabase.from('pg_catalog.pg_tables').select('tablename').eq('schemaname', 'public')
  // Above might fail due to permissions, let's try a different way
  const commonTables = ['job_orders', 'extra_costs', 'tracking_updates', 'md_fleets', 'job_attachments', 'operational_documents', 'pod_documents']
  for (const t of commonTables) {
      const { error } = await supabase.from(t).select('id').limit(1)
      if (!error) console.log(`Table exists: ${t}`)
  }
}

listAllTables()
