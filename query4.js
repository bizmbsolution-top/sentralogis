require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL });

async function check() {
  await client.connect();
  const { rows } = await client.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name");
  console.log(rows.map(r => r.table_name).filter(t => t.includes('log') || t.includes('sync') || t.includes('error')));
  await client.end();
}
check().catch(console.error);
