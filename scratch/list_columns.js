import { createAdminClient } from '../lib/supabase/admin.js';

async function listColumns() {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('md_fleets')
    .select('*')
    .limit(1);

  if (error) console.error(error);
  else console.log('Columns:', Object.keys(data[0] || {}));
}

listColumns();
