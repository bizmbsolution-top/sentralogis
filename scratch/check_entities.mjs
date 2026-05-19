import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
)

async function checkEntities() {
  console.log('Checking md_entities types...')
  const { data, error } = await supabase.from('md_entities').select('type').limit(10)
  if (error) console.error(error)
  else console.log('md_entities types:', [...new Set(data.map(d => d.type))])

  console.log('\nChecking md_fleets entity join...')
  const { data: f, error: fe } = await supabase.from('md_fleets').select('plate_number, md_entities(name, type)').limit(5)
  if (fe) console.error(fe)
  else console.table(f)
}

checkEntities()
