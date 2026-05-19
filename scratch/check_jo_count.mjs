const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function test() {
  const table = 'job_orders';
  const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=id`, {
    headers: {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Range': '0-0',
      'Prefer': 'count=exact'
    }
  });
  console.log(`${table} status:`, res.status);
  console.log(`${table} count:`, res.headers.get('content-range'));
}

test();
