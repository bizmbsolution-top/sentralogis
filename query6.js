require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL });

async function check() {
  await client.connect();
  const { rows } = await client.query("SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public' AND routine_name = 'execute_internal_movement'");
  console.log("execute_internal_movement RPC exists:", rows.length > 0);
  await client.end();
}
check().catch(console.error);
