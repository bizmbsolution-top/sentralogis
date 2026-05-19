import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTaxes() {
  console.log('Checking md_taxes table...');
  const { data, error } = await supabase.from('md_taxes').select('*');
  
  if (error) {
    console.error('Error fetching md_taxes:', error.message);
    if (error.code === '42P01') {
      console.log('RESULT: Table md_taxes DOES NOT EXIST.');
    }
  } else {
    console.log('RESULT: Table md_taxes EXISTS.');
    console.log(`Found ${data.length} tax records.`);
    console.table(data.map(t => ({ name: t.name, rate: t.rate })));
  }
}

checkTaxes();
