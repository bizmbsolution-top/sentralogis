require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL });

async function check() {
  await client.connect();
  const { rows } = await client.query("SELECT pg_get_functiondef(oid) FROM pg_proc WHERE proname = 'execute_internal_movement'");
  console.log(rows[0].pg_get_functiondef);
  await client.end();
}
check().catch(console.error);
