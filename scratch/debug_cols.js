require('dotenv').config({ path: '.env.local' });
const headers = { 
  'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY, 
  'Authorization': 'Bearer ' + process.env.SUPABASE_SERVICE_ROLE_KEY, 
  'Content-Type': 'application/json' 
};
const sql = `
  SELECT table_name, column_name, data_type, character_maximum_length 
  FROM information_schema.columns 
  WHERE table_schema='public' 
    AND table_name IN ('wo_item_manifests', 'job_routes', 'wh_transfer_details', 'wh_outbound_shipment_items', 'wo_items', 'work_orders', 'job_orders')
    AND character_maximum_length IS NOT NULL AND character_maximum_length <= 100
  ORDER BY table_name, column_name
`;
fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/rpc/exec_sql_manual', { 
  method: 'POST', 
  headers, 
  body: JSON.stringify({ sql_query: sql }) 
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
