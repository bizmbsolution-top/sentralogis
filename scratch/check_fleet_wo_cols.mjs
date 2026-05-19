import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
)

async function checkFleetAndWoColumns() {
  const tables = ['md_fleets', 'wo_items', 'md_entities']
  for (const table of tables) {
    console.log(`\nChecking ${table}...`)
    const { data, error } = await supabase.from(table).select('*').limit(1)
    if (error) {
      console.error(error)
      continue
    }
    console.log(`${table} columns:`, Object.keys(data[0] || {}))
  }
}

checkFleetAndWoColumns()
