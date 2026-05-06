import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  const tables = ['token_transactions', 'reset_password_requests', 'tenants'];
  for (const table of tables) {
    console.log(`--- Checking ${table} ---`);
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) console.error(`${table} error:`, error.message);
    else console.log(`${table} found!`);
  }
}

checkTables();
