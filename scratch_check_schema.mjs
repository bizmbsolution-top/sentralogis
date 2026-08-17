import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/job_tracking?limit=1';
  const res = await fetch(url, {
    headers: {
      apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      'Prefer': 'return=representation'
    }
  });
  const data = await res.json();
  console.log(Object.keys(data[0] || {}));
}
run();
