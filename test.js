const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });
async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  const res = await client.query('SELECT r.id, r.sequence, r.location_name, r.latitude, r.longitude, r.status FROM job_routes r JOIN job_orders j ON r.job_order_id = j.id WHERE j.status = \'ASSIGNED\'');
  console.log('Routes:', res.rows);
  await client.end();
}
run();
