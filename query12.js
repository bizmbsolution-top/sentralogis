require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL });

async function check() {
  await client.connect();
  const { rows } = await client.query("SELECT * FROM wh_tasks WHERE error_message IS NOT NULL");
  console.log('Errors in wh_tasks:', rows.length);
  if (rows.length > 0) console.log(rows.slice(0,2));
  await client.end();
}
check().catch(console.error);
