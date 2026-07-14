import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const url = `${supabaseUrl}/rest/v1/md_warehouse_locations?select=code&warehouse_id=eq.9f82b2f9-d6ea-4eac-91d0-332b0fd07559`;

fetch(url, {
  headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` }
})
.then(r => r.json())
.then(d => console.log(JSON.stringify(d, null, 2)));
