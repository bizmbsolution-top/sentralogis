const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testInsert() {
  // Get an existing entity id first
  const entRes = await fetch(`${supabaseUrl}/rest/v1/md_entities?select=id,tenant_id,name&limit=1`, {
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`
    }
  });
  const entities = await entRes.json();
  if (!entities.length) {
    console.log('No entities found to test insert');
    return;
  }
  const ent = entities[0];
  console.log('Testing insert with entity:', ent.name, ent.id);

  const testEmail = `test.portal.${Date.now()}@example.com`;
  const insertRes = await fetch(`${supabaseUrl}/rest/v1/md_customer_users`, {
    method: 'POST',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({
      tenant_id: ent.tenant_id,
      customer_id: ent.id,
      email: testEmail,
      full_name: 'Test Customer PIC',
      whatsapp: '08123456789'
    })
  });

  console.log('Insert status:', insertRes.status);
  const data = await insertRes.json();
  console.log('Insert result:', data);

  if (insertRes.ok && data[0]?.id) {
    // Clean up test record
    await fetch(`${supabaseUrl}/rest/v1/md_customer_users?id=eq.${data[0].id}`, {
      method: 'DELETE',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`
      }
    });
    console.log('Cleaned up test record successfully.');
  }
}

testInsert().catch(console.error);
