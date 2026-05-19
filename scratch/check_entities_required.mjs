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

async function checkEntitiesSchema() {
  const { data, error } = await supabase.rpc('exec_sql_manual', {
    sql_query: "SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'md_entities' AND is_nullable = 'NO'"
  });
  console.log('Required columns in md_entities:', data);
}

checkEntitiesSchema();
