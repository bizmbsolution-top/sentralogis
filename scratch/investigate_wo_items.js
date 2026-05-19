import { supabase } from '../lib/supabaseClient';

async function checkSchema() {
  const { data, error } = await supabase
    .from('wo_items')
    .select('*, md_fleet_types(name)')
    .limit(1);
  
  if (error) {
    console.log('Error with md_fleet_types:', error.message);
    const { data: d2, error: e2 } = await supabase
      .from('wo_items')
      .select('*')
      .limit(1);
    console.log('Columns in wo_items:', Object.keys(d2?.[0] || {}));
  } else {
    console.log('Success with md_fleet_types!');
  }
}

checkSchema();
