
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkStatus() {
  const { data: wos, error: woError } = await supabase
    .from('work_orders')
    .select('id, wo_number, status, notes, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5);

  if (woError) {
    console.error('WO Error:', woError);
    return;
  }

  console.log('--- WORK ORDERS ---');
  console.table(wos);

  for (const wo of wos) {
    const { data: items, error: itemError } = await supabase
      .from('wo_items')
      .select('id, item_code, status, item_data')
      .eq('wo_id', wo.id);
    
    if (itemError) {
      console.error('Item Error:', itemError);
      continue;
    }

    console.log(`Items for ${wo.wo_number}:`);
    console.table(items.map(i => ({
      id: i.id,
      item_code: i.item_code,
      status: i.status,
      rejection_note: i.item_data?.rejection_note || 'None'
    })));
  }
}

checkStatus();
