require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL });

async function check() {
  await client.connect();
  const { rows } = await client.query("SELECT count(*) FROM offline_sync_queue");
  console.log("offline_sync_queue count:", rows[0]);
  await client.end();
}
check().catch(console.error);
