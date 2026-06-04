const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data: assignments } = await supabase.from('wh_jo_staff_assignments').select('*').limit(5);
  console.log("Assignments:", assignments);
  const { data: receipts } = await supabase.from('wh_inbound_receipts').select('id, receipt_number, status').limit(5);
  console.log("Receipts:", receipts);
}
check();
