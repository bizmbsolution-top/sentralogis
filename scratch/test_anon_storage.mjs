import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://nsvkewvmzivudkcczhnk.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NzI3NjMsImV4cCI6MjA5MDM0ODc2M30.7zAR6x3qN6TcBKIQ2Ds3UlCxsAMRVmrroanxYXbpZ8g'
)

async function testAnonUpload() {
  const content = 'test anon content'
  const blob = new Blob([content], { type: 'text/plain' })
  const file = new File([blob], 'test_anon.txt', { type: 'text/plain' })
  
  console.log('Testing ANON upload to "documents" bucket...')
  const { data, error } = await supabase.storage
    .from('documents')
    .upload('payouts/test_anon_upload.txt', file, { upsert: true })
    
  if (error) {
    console.error('ANON Upload failed:', error)
  } else {
    console.log('ANON Upload success:', data)
  }
}

testAnonUpload()
