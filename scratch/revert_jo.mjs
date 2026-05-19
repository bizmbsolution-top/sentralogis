import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function revertRecentInvoiced() {
  const { data, error } = await supabase
    .from('job_orders')
    .select('id, jo_number, status')
    .eq('status', 'invoiced')
    .order('updated_at', { ascending: false })
    .limit(1);

  if (error) {
    console.error('Error fetching:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No invoiced JO found.');
    return;
  }

  const jo = data[0];
  console.log(`Reverting JO: ${jo.jo_number} (${jo.id})`);

  const { error: updateError } = await supabase
    .from('job_orders')
    .update({ status: 'ready_for_billing' })
    .eq('id', jo.id);

  if (updateError) {
    console.error('Error updating:', updateError);
  } else {
    console.log('Successfully reverted to ready_for_billing');
  }
}

revertRecentInvoiced();
