import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const fixDb = async () => {
  // 1. Find WO Item ID for HALU-TAM-0626-003/WH01
  const res = await fetch(`${supabaseUrl}/rest/v1/wo_items?select=id&item_code=eq.HALU-TAM-0626-003/WH01`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });
  const data = await res.json();
  if (!data || data.length === 0) return console.log("WO Item not found");
  const woItemId = data[0].id;

  // 2. Delete mistaken wh_outbound_shipments
  const delRes = await fetch(`${supabaseUrl}/rest/v1/wh_outbound_shipments?wo_item_id=eq.${woItemId}`, {
    method: 'DELETE',
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });
  console.log("Deleted old mistaken shipment:", delRes.status);
};

fixDb();
