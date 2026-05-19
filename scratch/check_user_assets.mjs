import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nsvkewvmzivudkcczhnk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5zdmtld3Zteml2dWRrY2N6aG5rIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDc3Mjc2MywiZXhwIjoyMDkwMzQ4NzYzfQ.7ZDrwe28fRKFsbxZMzvpAqwDE39Iwk5ZZXWX_pLp8T8';
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserAssets() {
  const tenantId = '78846049-fb63-45a9-93da-3af3fea5b587';

  // 1. Get entities for this tenant
  const { data: entities } = await supabase
    .from('md_entities')
    .select('id, name, is_customer, is_vendor')
    .eq('tenant_id', tenantId);

  console.log('Entities found:', entities?.length);
  entities?.forEach(e => console.log(`- ${e.name} (ID: ${e.id}, Cust: ${e.is_customer}, Vend: ${e.is_vendor})`));

  // 2. Check fleets entity_id
  const { data: fleets } = await supabase
    .from('md_fleets')
    .select('plate_number, entity_id')
    .eq('tenant_id', tenantId);

  console.log('Fleets entity mapping:');
  fleets?.forEach(f => console.log(`- ${f.plate_number}: EntityID ${f.entity_id}`));

  // 3. Check drivers entity_id
  const { data: drivers } = await supabase
    .from('md_drivers')
    .select('name, entity_id')
    .eq('tenant_id', tenantId);

  console.log('Drivers entity mapping:');
  drivers?.forEach(d => console.log(`- ${d.name}: EntityID ${d.entity_id}`));
}

checkUserAssets();
