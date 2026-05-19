import { createAdminClient } from '../lib/supabase/admin.js';

async function listBuckets() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage.listBuckets();

  if (error) {
    console.error('Error listing buckets:', error);
  } else {
    console.log('Available Buckets:', data.map(b => b.name));
  }
}

listBuckets();
