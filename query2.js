require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const client = new Client({ connectionString: process.env.DATABASE_URL || process.env.SUPABASE_DB_URL });

async function check() {
  await client.connect();
  const queries = [
    "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name ILIKE '%status%'",
    "SELECT table_name, column_name FROM information_schema.columns WHERE table_schema = 'public' AND column_name ILIKE '%error%'"
  ];
  
  let tablesWithError = new Set();
  
  for (const q of queries) {
    const { rows } = await client.query(q);
    for (const row of rows) {
      if (row.table_name.startsWith('wh_')) {
        try {
          const count = await client.query(`SELECT count(*) FROM "${row.table_name}" WHERE "${row.column_name}"::text ILIKE '%error%'`);
          if (parseInt(count.rows[0].count) > 0) {
            console.log(row.table_name, row.column_name, count.rows[0].count);
          }
        } catch(e) {}
      }
    }
  }
  await client.end();
}
check().catch(console.error);
