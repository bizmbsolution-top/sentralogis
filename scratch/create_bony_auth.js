const fs = require('fs');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function setupBony() {
  const email = 'bony@customer.com';
  const password = 'Password123!';
  console.log(`Checking/creating auth user for ${email}...`);

  // 1. Check if user exists via Auth Admin REST API
  let res = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    }
  });
  const listData = await res.json();
  let authUser = (listData?.users || []).find(u => u.email?.toLowerCase() === email.toLowerCase());

  if (!authUser) {
    console.log(`User ${email} not found in auth. Creating now...`);
    const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        password: password,
        email_confirm: true,
        user_metadata: { full_name: 'BONY', role: 'warehouse_customer' }
      })
    });
    if (!createRes.ok) {
      const err = await createRes.text();
      throw new Error(`Create user failed: ${err}`);
    }
    authUser = await createRes.json();
    console.log(`Auth user created ID: ${authUser.id}`);
  } else {
    console.log(`User already exists (${authUser.id}). Updating password...`);
    const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${authUser.id}`, {
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
    if (!updateRes.ok) {
      console.warn('Password update warning:', await updateRes.text());
    }
  }

  // 2. Link user_id in md_customer_users via PostgREST
  console.log(`Linking ${authUser.id} to md_customer_users where email = ${email}...`);
  const linkRes = await fetch(`${supabaseUrl}/rest/v1/md_customer_users?email=ilike.${encodeURIComponent(email)}`, {
    method: 'PATCH',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      user_id: authUser.id,
      is_active: true
    })
  });
  const linkedData = await linkRes.json();
  console.log(`md_customer_users updated:`, linkedData);

  // 3. Ensure profile exists in profiles table
  console.log(`Ensuring profile exists for ${authUser.id}...`);
  await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${authUser.id}`, {
    method: 'DELETE',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    }
  });

  await fetch(`${supabaseUrl}/rest/v1/profiles`, {
    method: 'POST',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      id: authUser.id,
      email: email,
      full_name: 'BONY',
      role: 'warehouse_customer',
      is_active: true
    })
  });

  console.log('\n=========================================');
  console.log('🎉 BONY PORTAL LOGIN IS READY!');
  console.log(`URL     : https://sentralogis.com/login`);
  console.log(`Email   : bony@customer.com`);
  console.log(`Password: ${password}`);
  console.log('=========================================');
}

setupBony().catch(console.error);
