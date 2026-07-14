import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  console.log("Querying crm_activities...");
  const { data, error } = await supabase
    .from('crm_activities')
    .select(`id, activity_date, status, description, location, check_in_time, check_in_lat, check_in_lng, md_entities(name)`)
    .limit(1);

  if (error) {
    console.error("ERROR:", error);
  } else {
    console.log("DATA:", JSON.stringify(data, null, 2));
  }
}

testQuery();
