import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables');
  console.log('URL:', !!supabaseUrl);
  console.log('KEY:', !!supabaseServiceKey);
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupTables() {
  console.log('Checking MDM tables and inserting seed data...');
  
  try {
    const { data, error } = await supabase.from('md_fleet_master').insert([
      { fleet_type: 'Blind Van', fleet_code: 'BVAN', fleet_brand: 'Daihatsu', fleet_model: 'Gran Max' },
      { fleet_type: 'CDE Box', fleet_code: 'CDEB', fleet_brand: 'Isuzu', fleet_model: 'Elf' },
      { fleet_type: 'CDD Box', fleet_code: 'CDDB', fleet_brand: 'Mitsubishi', fleet_model: 'Canter' }
    ]).select();
    
    if (error) {
      if (error.code === '42P01') {
        console.error('TABLE_MISSING: Tables do not exist yet. Please run the SQL in Supabase Editor first.');
      } else if (error.code === '23505') {
        console.log('Seed data already exists.');
      } else {
        console.error('Error:', error.message);
      }
    } else {
      console.log('Seed data inserted successfully:', data.length, 'rows');
    }
  } catch (e) {
    console.error('Setup failed:', e);
  }
}

setupTables();
