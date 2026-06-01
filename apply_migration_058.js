const fs = require('fs');
const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)=(.*)$/);
  if(match) env[match[1].trim()] = match[2].trim();
});

async function applyMigration() {
  const sqlContent = fs.readFileSync('supabase/migrations/058_wms_advanced_workflow.sql', 'utf8');
  console.log('Running migration...');
  
  // Remove SQL comments and split
  const statements = sqlContent
    .replace(/--.*$/gm, '') // Remove single line comments
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove multi line comments
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const sql of statements) {
    const res = await fetch(`${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql_manual`, {
      method: 'POST',
      headers: {
        'apikey': env.SUPABASE_SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql_query: sql + ';' })
    });
    
    if (!res.ok) {
      const err = await res.text();
      console.error('Statement failed:', sql.substring(0, 50) + '...', err);
    } else {
      console.log('Success:', sql.substring(0, 50).replace(/\n/g, ' ') + '...');
    }
  }
  console.log('Migration finished.');
}
applyMigration();
