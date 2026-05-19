const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.log('Missing env vars');
  process.exit(1);
}

async function test() {
  const tables = ['add_costs', 'extra_costs'];
  for (const table of tables) {
    const res = await fetch(`${supabaseUrl}/rest/v1/${table}?select=count`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Range-Unit': 'items',
        'Range': '0-0'
      }
    });
    console.log(`${table} count status:`, res.status);
    if (res.ok) {
       const contentRange = res.headers.get('Content-Range');
       console.log(`${table} count:`, contentRange);
    } else {
       const text = await res.text();
       console.log(`${table} error:`, text);
    }
  }
}

test();
