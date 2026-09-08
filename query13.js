require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL });

async function check() {
  await client.connect();
  const { rows } = await client.query(`
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_name = 'work_orders';
  `);
  console.log(rows.map(r => r.column_name));
  await client.end();
}
check().catch(console.error);
