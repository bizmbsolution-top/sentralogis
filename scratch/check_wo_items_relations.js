const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, value] = line.split('=');
  if (key && value) env[key.trim()] = value.trim();
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function checkRelations() {
  console.log('--- Investigating wo_items relations ---');
  
  // Check relationship with work_orders
  const { data: woData, error: woError } = await supabase
    .from('wo_items')
    .select('id, work_orders!wo_id(*)') // Try explicit FK name
    .limit(1);
    
  if (woError) {
    console.log('❌ Relationship wo_items -> work_orders via wo_id failed:', woError.message);
    const { data: woData2, error: woError2 } = await supabase
      .from('wo_items')
      .select('id, work_orders(*)')
      .limit(1);
    if (woError2) {
      console.log('❌ Relationship wo_items -> work_orders via table name failed:', woError2.message);
    } else {
      console.log('✅ FOUND: wo_items -> work_orders via table name');
    }
  } else {
    console.log('✅ FOUND: wo_items -> work_orders via wo_id');
  }

  // Check item_data content
  const { data: itemData, error: itemError } = await supabase
    .from('wo_items')
    .select('id, item_data')
    .not('item_data', 'is', null)
    .limit(1);
  
  if (itemData && itemData[0]) {
    console.log('✅ item_data content:', itemData[0].item_data);
  }
}

checkRelations();
