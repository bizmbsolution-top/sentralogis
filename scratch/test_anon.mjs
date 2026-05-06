import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ3NzI3NjMsImV4cCI6MjA5MDM0ODc2M30.7zAR6x3qN6TcBKIQ2Ds3UlCxsAMRVmrroanxYXbpZ8g';

const supabase = createClient(supabaseUrl, anonKey);

async function testAnonRead() {
  console.log('--- Testing Anon Read (Tenants) ---');
  const { data, error } = await supabase.from('tenants').select('*');
  if (error) console.error('Error:', error);
  else console.log('Data found:', data.length);
}

testAnonRead();
