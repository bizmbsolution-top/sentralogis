import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
)

async function checkStorage() {
  console.log('Checking storage buckets...')
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets()
  if (bucketError) {
    console.error('Bucket Error:', bucketError)
    return
  }
  console.log('Available Buckets:', buckets.map(b => b.name))

  if (buckets.find(b => b.name === 'documents')) {
    console.log('\nListing contents of "documents" bucket...')
    const { data: files, error: fileError } = await supabase.storage.from('documents').list('', { limit: 10 })
    if (fileError) {
       console.error('File Error:', fileError)
    } else {
       console.log('Files in root:', files.map(f => f.name))
    }
    
    const folders = ['payouts', 'operational_docs', 'billing_proofs']
    for (const folder of folders) {
       const { data: folderFiles } = await supabase.storage.from('documents').list(folder, { limit: 5 })
       console.log(`Files in "${folder}":`, folderFiles?.map(f => f.name) || [])
    }
  } else {
    console.warn('Bucket "documents" not found!')
  }
}

checkStorage()
