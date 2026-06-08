require('dotenv').config({path: '.env.local'});
const { createClient } = require('@supabase/supabase-js');
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function run() {
  const { data, error } = await supabase
        .from('wh_inbound_receipt_items')
        .select(`
          actual_good_qty, product_sku_id,
          product_sku:product_sku_id(id, sku_code, name)
        `);
  if (error) console.error('ERROR:', error);
  else console.log('DATA:', data.length);
}
run();
