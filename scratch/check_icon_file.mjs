import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
)

async function checkFile() {
  const path = 'fleet-icons/78846049-fb63-45a9-93da-3af3fea5b587/0.22401199382884063.png'
  const { data, error } = await supabase.storage.from('logos').list('fleet-icons/78846049-fb63-45a9-93da-3af3fea5b587')
  console.log('Files in folder:', data?.map(f => f.name))
}

checkFile()
