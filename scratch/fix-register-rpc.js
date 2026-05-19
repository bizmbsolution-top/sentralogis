const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const vars = {};
env.split('\n').forEach(l => {
  const [k, ...v] = l.split('=');
  if (k && k.trim()) vars[k.trim()] = v.join('=').trim();
});

async function main() {
  const supabaseUrl = vars.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = vars.SUPABASE_SERVICE_ROLE_KEY;

  const sql = `
CREATE OR REPLACE FUNCTION public.register_tenant_test(
  p_tenant_name text, 
  p_tenant_code text, 
  p_admin_email text, 
  p_admin_full_name text, 
  p_subscription_tier text DEFAULT 'free'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_owner_id UUID;
    v_tenant_id UUID;
    v_temp_password TEXT;
    v_new_user_id UUID;
BEGIN
    SELECT id INTO v_owner_id FROM auth.users WHERE email = 'admin1@sentralogis.com';
    IF v_owner_id IS NULL THEN
        RETURN json_build_object('success', false, 'message', 'Owner tidak ditemukan');
    END IF;
    
    IF EXISTS (SELECT 1 FROM public.tenants WHERE tenant_code = p_tenant_code) THEN
        RETURN json_build_object('success', false, 'message', 'Tenant code sudah digunakan');
    END IF;
    
    SELECT id INTO v_new_user_id FROM auth.users WHERE email = p_admin_email;
    
    IF v_new_user_id IS NULL THEN
        v_new_user_id := gen_random_uuid();
        v_temp_password := encode(gen_random_bytes(4), 'hex');
        
        INSERT INTO auth.users (
            id, email, encrypted_password, email_confirmed_at,
            raw_app_meta_data, raw_user_meta_data, created_at, updated_at
        ) VALUES (
            v_new_user_id, p_admin_email,
            crypt(v_temp_password, gen_salt('bf')), NOW(),
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('full_name', p_admin_full_name, 'role', 'tenant_admin', 'tenant_code', p_tenant_code),
            NOW(), NOW()
        );
        
        -- Use ON CONFLICT to handle the handle_new_user trigger race condition
        INSERT INTO public.profiles (
            id, full_name, email, role, is_active, created_at, updated_at
        ) VALUES (
            v_new_user_id, p_admin_full_name, p_admin_email, 'tenant_admin', true, NOW(), NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            full_name = EXCLUDED.full_name,
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            is_active = EXCLUDED.is_active,
            updated_at = NOW();
        
    ELSE
        v_temp_password := encode(gen_random_bytes(4), 'hex');
        UPDATE auth.users 
        SET encrypted_password = crypt(v_temp_password, gen_salt('bf')),
            email_confirmed_at = NOW(), updated_at = NOW()
        WHERE id = v_new_user_id;
    END IF;
    
    INSERT INTO public.tenants (
        tenant_code, name, user_id, subscription_tier, token_balance, status, created_at, updated_at
    ) VALUES (
        p_tenant_code, p_tenant_name, v_new_user_id, p_subscription_tier, 100, 'active', NOW(), NOW()
    ) RETURNING id INTO v_tenant_id;
    
    UPDATE public.profiles SET tenant_id = v_tenant_id WHERE id = v_new_user_id;
    
    RETURN json_build_object(
        'success', true,
        'tenant_id', v_tenant_id,
        'tenant_code', p_tenant_code,
        'user_id', v_new_user_id,
        'admin_user_id', v_new_user_id,
        'temp_password', v_temp_password,
        'message', 'Tenant berhasil dibuat. Password: ' || v_temp_password
    );
END;
$$;
`;

  // Use the Supabase REST SQL endpoint directly
  const res = await fetch(supabaseUrl + '/rest/v1/rpc/exec_sql_manual', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceKey,
      'Authorization': 'Bearer ' + serviceKey
    },
    body: JSON.stringify({ sql_query: sql })
  });
  
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
  
  if (res.status !== 200) {
    // Fallback: try pg_query endpoint
    console.log('\nTrying direct SQL via /pg endpoint...');
    const res2 = await fetch(supabaseUrl + '/pg', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': 'Bearer ' + serviceKey
      },
      body: JSON.stringify({ query: sql })
    });
    console.log('PG Status:', res2.status);
    console.log('PG Response:', await res2.text());
  }
}

main().catch(console.error);
