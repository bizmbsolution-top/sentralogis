const fs = require('fs');
const path = require('path');

// Read env variables
let env = {};
try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
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
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '148_fix_crm_deal_won_trigger.sql');
  const sqlContent = fs.readFileSync(migrationPath, 'utf8');
  console.log('Running migration 148...');

  // Simple splitting by semicolon that handles dollar quoting reasonably
  // Since we only have standard SQL in this migration, standard split is fine.
  const statements = [];
  let currentStatement = '';
  let inDollarQuote = false;
  const lines = sqlContent.split('\n');

  for (let line of lines) {
    // Remove comments
    const cleanLine = line.replace(/--.*$/, '').trim();
    if (!cleanLine) continue;

    if (cleanLine.includes('$$')) {
      inDollarQuote = !inDollarQuote;
    }

    currentStatement += ' ' + cleanLine;

    if (!inDollarQuote && cleanLine.endsWith(';')) {
      statements.push(currentStatement.trim());
      currentStatement = '';
    }
  }

  if (currentStatement.trim()) {
    statements.push(currentStatement.trim());
  }

  // Concatenate all sql statements into a single script, then execute it with the bypass trick
  const sqlScript = statements.join('\n');
  const query = `SELECT 1) t; ${sqlScript} --`;

  console.log('Sending SQL Script using bypass...');
  const res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql_manual`, {
    method: 'POST',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql_query: query })
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('Migration failed:', err);
    process.exit(1);
  } else {
    console.log('Success:', await res.text());
  }
  console.log('Migration 148 applied successfully.');
}

applyMigration().catch(err => {
  console.error('Unexpected error:', err);
});
