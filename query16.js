require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL });

async function check() {
  await client.connect();
  const { rows } = await client.query("SELECT * FROM wh_staff_attendance WHERE tenant_id = '78846049-fb63-45a9-93da-3af3fea5b587' ORDER BY created_at DESC LIMIT 5");
  console.log(rows);
  await client.end();
}
check().catch(console.error);
