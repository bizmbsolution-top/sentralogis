import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8');
const vars = {};
env.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && v.length > 0) vars[k.trim()] = v.join('=').trim().replace(/^['"]|['"]$/g, '');
});

const supabase = createClient(vars.NEXT_PUBLIC_SUPABASE_URL, vars.SUPABASE_SERVICE_ROLE_KEY);

async function setupTestDriver() {
  console.log('Setting up test driver...');
  
  // 1. Get first driver
  const { data: drivers } = await supabase.from('md_drivers').select('*').limit(1);
  
  if (!drivers || drivers.length === 0) {
    console.log('No drivers found to setup.');
    return;
  }

  const driver = drivers[0];
  console.log('Updating driver:', driver.name || driver.full_name || driver.id);
  console.log('WhatsApp:', driver.whatsapp);

  // 2. Set PIN to 1234
  const { error } = await supabase
    .from('md_drivers')
    .update({ pin: '1234' })
    .eq('id', driver.id);

  if (error) {
    console.error('Error setting PIN:', error);
  } else {
    console.log('SUCCESS: PIN set to 1234 for driver.');
    console.log('Use WhatsApp:', driver.whatsapp, 'and PIN: 1234');
  }
}

setupTestDriver();
