import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const checkData = async () => {
  const res = await fetch(`${supabaseUrl}/rest/v1/wh_transfer_orders?select=*,wh_outbound_shipments(wo_item_id)`, {
    headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
  });
  const text = await res.text();
  console.log(text);
};

checkData();
