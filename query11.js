require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL });

async function check() {
  await client.connect();
  const { rows } = await client.query("SELECT event_object_table, trigger_name FROM information_schema.triggers WHERE event_object_table LIKE 'wh_%'");
  console.log(rows);
  await client.end();
}
check().catch(console.error);
