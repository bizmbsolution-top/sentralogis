require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL });

async function check() {
  await client.connect();
  const res = await client.query("SELECT id, status, task_type FROM wh_tasks");
  const statuses = res.rows.map(r => r.status);
  console.log('Statuses in wh_tasks:', [...new Set(statuses)]);
  
  const res2 = await client.query("SELECT id, status FROM wh_repacking_orders");
  const repackingStatuses = res2.rows.map(r => r.status);
  console.log('Statuses in wh_repacking_orders:', [...new Set(repackingStatuses)]);

  const res3 = await client.query("SELECT id, status FROM wh_internal_movements");
  const internalMovementStatuses = res3.rows.map(r => r.status);
  console.log('Statuses in wh_internal_movements:', [...new Set(internalMovementStatuses)]);

  await client.end();
}
check().catch(console.error);
