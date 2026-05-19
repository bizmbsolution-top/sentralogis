import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => env.split('\n').find(l => l.startsWith(key)).split('=')[1].trim();

const supabase = createClient(getEnv('NEXT_PUBLIC_SUPABASE_URL'), getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY'));

async function testEntities() {
  const { data, error } = await supabase.from('md_entities').select('id, name, parent_id').limit(5);
  console.log('Entities:', data);
  if (error) console.error('Error:', error);
}

testEntities();
