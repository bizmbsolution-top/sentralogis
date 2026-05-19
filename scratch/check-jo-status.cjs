const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  const { data, error } = await supabase
    .from('job_orders')
    .select('id, status, is_doc_finished, is_cost_finished, pod_status, pod_document_url, created_at, updated_at')
    .eq('jo_number', 'SL-BYD PD INDAH-0526-001/TR01/ADA-001')
    .single();

  console.log("Error:", error);
  console.log("Data:", data);
}
run();
