const fs = require('fs');
const path = require('path');

// Read env variables
let env = {};
try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim();
  });
} catch (e) {
  console.error('Error reading .env.local file:', e.message);
  process.exit(1);
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

async function applyMigration() {
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '146_add_sbu_metadata_to_quotation_items.sql');
  const sqlContent = fs.readFileSync(migrationPath, 'utf8');
  console.log('Running migration 146...');

  const statements = sqlContent
    .replace(/--.*$/gm, '') // Remove single line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi line comments
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const sql of statements) {
    const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql_manual`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql_query: sql + ';' })
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Statement failed:', sql.substring(0, 80) + '...', err);
    } else {
      console.log('Success:', sql.substring(0, 80).replace(/\n/g, ' ') + '...');
    }
  }
  console.log('Migration 146 applied successfully.');
}

applyMigration().catch(err => {
  console.error('Unexpected error:', err);
});
