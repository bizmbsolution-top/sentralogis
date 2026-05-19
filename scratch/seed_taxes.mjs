import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function seedTaxes() {
  console.log('Attempting to seed md_taxes...');
  
  const taxes = [
    { name: 'PPN 1.1%', rate: 1.1, type: 'VAT', description: 'PPN Jasa Logistik 1.1%' },
    { name: 'PPN 11%', rate: 11, type: 'VAT', description: 'PPN Standar 11%' },
    { name: 'PPH 23 (2%)', rate: -2, type: 'WHT', description: 'PPH 23 Jasa 2% (Pengurang)' },
    { name: 'PPN 1.1% + PPH 23', rate: -0.9, type: 'VAT-WHT', description: 'Net Tax (1.1% - 2%)' }
  ];

  for (const tax of taxes) {
    const { data, error } = await supabase.from('md_taxes').upsert(tax, { onConflict: 'name' });
    if (error) {
      console.error(`Error seeding ${tax.name}:`, error.message);
    } else {
      console.log(`Successfully seeded: ${tax.name}`);
    }
  }
}

seedTaxes();
