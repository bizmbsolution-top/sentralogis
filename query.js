require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL });

async function check() {
  await client.connect();
  const { rows: columns } = await client.query("SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND (column_name ILIKE '%error%' OR column_name ILIKE '%status%')");
  
  for (const c of columns) {
    if (c.table_name.startsWith('wh_') || c.table_name === 'offline_sync_queue' || c.table_name === 'sync_logs') {
      try {
        const { rows } = await client.query(`SELECT count(*) FROM "${c.table_name}" WHERE "${c.column_name}"::text ILIKE '%error%' OR "${c.column_name}"::text ILIKE '%fail%'`);
        if (rows[0] && parseInt(rows[0].count) > 0) {
          console.log(c.table_name, c.column_name, rows[0].count);
          const { rows: errs } = await client.query(`SELECT * FROM "${c.table_name}" WHERE "${c.column_name}"::text ILIKE '%error%' OR "${c.column_name}"::text ILIKE '%fail%' LIMIT 3`);
          console.log(errs);
        }
      } catch(e) {}
    }
  }
  await client.end();
}
check().catch(console.error);
