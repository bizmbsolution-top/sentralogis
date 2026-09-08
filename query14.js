require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL });

async function check() {
  await client.connect();
  const { rows } = await client.query(`
    SELECT wo.id, wo.wo_number, i.sbu_type 
    FROM work_orders wo
    LEFT JOIN wo_items i ON wo.id = i.wo_id
    WHERE i.sbu_type = 'WAREHOUSE'
    LIMIT 5;
  `);
  console.log('WOs with WAREHOUSE items:', rows);
  
  const { rows: rows2 } = await client.query(`
    SELECT wo.id, wo.wo_number, i.sbu_type 
    FROM work_orders wo
    LEFT JOIN wo_items i ON wo.id = i.wo_id
    WHERE i.sbu_type = 'TRUCKING'
    LIMIT 5;
  `);
  console.log('WOs with TRUCKING items:', rows2);

  await client.end();
}
check().catch(console.error);
