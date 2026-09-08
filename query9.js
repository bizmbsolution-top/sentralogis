require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL });

async function check() {
  await client.connect();
  const res = await client.query("SELECT id, status FROM wh_internal_movements WHERE tenant_id = '78846049-fb63-45a9-93da-3af3fea5b587' AND status = 'PENDING'");
  console.log('Pending internal movements:', res.rows.length);
  await client.end();
}
check().catch(console.error);
