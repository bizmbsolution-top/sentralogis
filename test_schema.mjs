import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import WebSocket from 'ws';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
  global: { fetch: fetch },
  realtime: { transport: WebSocket }
});

async function run() {
  const tryQuery = async (table) => {
    const { data, error } = await supabase.from(table).select('*').limit(1);
    if (error) console.log(table, 'error:', error.message);
    else console.log(table, 'columns:', data?.[0] ? Object.keys(data[0]) : 'empty table');
  };

  await tryQuery('warehouse_inventory');
  await tryQuery('location_inventory');
  await tryQuery('inventory');
  await tryQuery('tally_sheet_items');
}
run();
