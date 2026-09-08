require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL });

async function check() {
  await client.connect();
  const { rows } = await client.query(`
    SELECT count(*) 
    FROM work_orders wo
    LEFT JOIN wo_items i ON wo.id = i.wo_id
    WHERE i.id IS NULL;
  `);
  console.log('WOs with NO wo_items:', rows[0].count);
  await client.end();
}
check().catch(console.error);
