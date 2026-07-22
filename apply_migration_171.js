const fs = require('fs');
const path = require('path');

let env = {};
try {
  const envFile = fs.readFileSync('.env.local', 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '');
  });
} catch (e) {
  process.exit(1);
}

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

async function applyMigration() {
  const migrationPath = path.join(__dirname, 'supabase', 'migrations', '171_fw_consolidations.sql');
  const sqlContent = fs.readFileSync(migrationPath, 'utf8');
  console.log('Running migration 171...');

  const statements = [];
  let currentStatement = '';
  let inDollarQuote = false;
  const lines = sqlContent.split('\n');

  for (let line of lines) {
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

  const sqlScript = statements.join('\n');
  
  for (let stmt of statements) {
    if (!stmt) continue;
    const query = `SELECT 1) t; ${stmt}; SELECT 1 --`;
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
      console.error('Statement failed:', stmt);
      console.error('Error:', err);
      process.exit(1);
    }
  }

  console.log('Migration 171 applied successfully.');
}

applyMigration().catch(err => {
  console.error('Unexpected error:', err);
});
