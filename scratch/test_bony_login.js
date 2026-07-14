require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testLogin() {
  const email = 'bony@customer.com';
  const password = 'Password123!';

  console.log('Testing login via token endpoint with anon key...');
  const res = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      'apikey': anonKey,
      'Authorization': `Bearer ${anonKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: email,
      password: password
    })
  });

  console.log('Login status:', res.status);
  const data = await res.json();
  console.log('Login response:', JSON.stringify(data, null, 2));

  if (!res.ok) {
    console.log('\nLogin failed! Let\'s check user status in auth admin...');
    const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    });
    const listData = await listRes.json();
    const u = (listData?.users || []).find(x => x.email?.toLowerCase() === email.toLowerCase());
    console.log('User object in DB:', JSON.stringify(u, null, 2));

    // Let's force update password right now using PUT /admin/users/id
    if (u) {
      console.log('Forcing password update right now...');
      const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${u.id}`, {
        method: 'PUT',
        headers: {
          'apikey': serviceRoleKey,
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: password,
          email_confirm: true,
          user_metadata: { full_name: 'BONY', role: 'warehouse_customer' }
        })
      });
      console.log('PUT status:', updateRes.status, await updateRes.text());

      // Test login again
      const res2 = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });
      console.log('Second login status:', res2.status, await res2.text());
    }
  }
}

testLogin().catch(console.error);
