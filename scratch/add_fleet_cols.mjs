import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8')
  .split('\n')
  .reduce((acc, line) => {
    const [key, ...val] = line.split('=');
    if (key && val) acc[key.trim()] = val.join('=').trim();
    return acc;
  }, {});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function addFleetColumns() {
  const sql = `
    ALTER TABLE md_fleets 
    ADD COLUMN IF NOT EXISTS engine_number VARCHAR(255),
    ADD COLUMN IF NOT EXISTS chassis_number VARCHAR(255),
    ADD COLUMN IF NOT EXISTS color VARCHAR(100);
  `;
  const { data, error } = await supabase.rpc('exec_sql_manual', {
    sql_query: sql
  });
  
  if (error) {
    console.error('Error adding columns:', error);
  } else {
    console.log('Columns added successfully or already exist.');
  }
}

addFleetColumns();
