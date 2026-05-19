import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8'
)

async function testUpload() {
  const content = 'test content'
  const blob = new Blob([content], { type: 'text/plain' })
  const file = new File([blob], 'test.txt', { type: 'text/plain' })
  
  console.log('Testing upload to "documents" bucket...')
  const { data, error } = await supabase.storage
    .from('documents')
    .upload('payouts/test_ai_upload.txt', file, { upsert: true })
    
  if (error) {
    console.error('Upload failed:', error)
  } else {
    console.log('Upload success:', data)
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl('payouts/test_ai_upload.txt')
    console.log('Public URL:', urlData.publicUrl)
  }
}

testUpload()
