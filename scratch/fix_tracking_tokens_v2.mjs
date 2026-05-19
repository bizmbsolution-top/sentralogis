import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function fixTokens() {
  const { data: jos, error } = await supabase.from('job_orders').select('id, tracking_token').is('tracking_token', null);
  
  if (error) {
    console.error(error);
    return;
  }

  console.log(`Found ${jos.length} JOs without tracking tokens.`);

  for (const jo of jos) {
    const newToken = crypto.randomUUID();
    const { error: updateError } = await supabase.from('job_orders').update({ tracking_token: newToken }).eq('id', jo.id);
    if (updateError) console.error(`Failed to update JO ${jo.id}`, updateError);
    else console.log(`Updated JO ${jo.id} with token ${newToken}`);
  }
}

fixTokens();
