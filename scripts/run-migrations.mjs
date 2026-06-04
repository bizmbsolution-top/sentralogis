import { createClient } from '@supabase/supabase-js';
import { readFileSync, existsSync } from 'fs';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runMigration(filePath) {
  const sql = readFileSync(filePath, 'utf8');
  console.log(`\n--- Running: ${filePath} ---`);

  // Try using the sql() method on supabase client
  try {
    const { data, error } = await supabase.rpc('exec_sql', { query_text: sql });
    if (error) throw error;
    console.log('Result:', data);
    return;
  } catch (e) {
    console.log(`rpc exec_sql failed: ${e.message}`);
  }

  // Fallback: use raw query via REST API
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
      },
      body: JSON.stringify({ query_text: sql }),
    });
    const text = await response.text();
    console.log('Response:', text.substring(0, 300));
    if (!response.ok) throw new Error(text);
  } catch (e) {
    console.log(`REST exec_sql failed: ${e.message}`);
    console.log('Cannot run migration automatically. Please run manually in Supabase SQL Editor.');
    
    // Print the SQL for manual execution
    console.log('\n=== SQL to execute manually ===');
    console.log(`-- ${filePath}`);
    console.log(sql.substring(0, 2000));
    console.log('...(truncated)');
    console.log('=== END SQL ===');
  }
}

const migrations = [
  'supabase/migrations/072_inbound_damage_control_v2.sql',
  'supabase/migrations/073_inbound_putaway_multi_zone.sql',
];

for (const file of migrations) {
  if (existsSync(file)) {
    await runMigration(file);
  } else {
    console.log(`File not found: ${file}`);
  }
}
