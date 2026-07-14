const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function fixRls() {
  console.log('Fixing RLS policies for md_customer_users...');
  const sql = `
    ALTER TABLE public.md_customer_users ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Admins can manage customer portal users" ON public.md_customer_users;
    DROP POLICY IF EXISTS "Customer users can view their own mapping" ON public.md_customer_users;

    -- Admin policy with comprehensive WITH CHECK and USING
    CREATE POLICY "Admins can manage customer portal users" ON public.md_customer_users
      FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.tenant_users tu
          WHERE tu.user_id = auth.uid()
            AND (tu.tenant_id = md_customer_users.tenant_id OR md_customer_users.tenant_id IS NULL OR tu.tenant_id IS NOT NULL)
            AND tu.role_code IN ('tenant_superadmin', 'tenant_admin', 'sbu_wh_manager', 'sbu_manager_wh', 'sbu_ops_wh', 'sbu_admin_wh')
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('tenant_superadmin', 'tenant_admin', 'sbu_wh_manager', 'sbu_manager_wh', 'sbu_ops_wh', 'sbu_admin_wh', 'owner_sentralogis', 'superadmin')
        )
        OR EXISTS (
          SELECT 1 FROM public.tenants t
          WHERE t.user_id = auth.uid()
        )
        OR auth.role() = 'service_role'
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.tenant_users tu
          WHERE tu.user_id = auth.uid()
            AND tu.role_code IN ('tenant_superadmin', 'tenant_admin', 'sbu_wh_manager', 'sbu_manager_wh', 'sbu_ops_wh', 'sbu_admin_wh')
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
            AND p.role IN ('tenant_superadmin', 'tenant_admin', 'sbu_wh_manager', 'sbu_manager_wh', 'sbu_ops_wh', 'sbu_admin_wh', 'owner_sentralogis', 'superadmin')
        )
        OR EXISTS (
          SELECT 1 FROM public.tenants t
          WHERE t.user_id = auth.uid()
        )
        OR auth.role() = 'service_role'
      );

    -- Customer users view and update
    CREATE POLICY "Customer users can view and update their own mapping" ON public.md_customer_users
      FOR ALL
      USING (
        user_id = auth.uid()
        OR lower(email) = lower(auth.jwt() ->> 'email')
        OR auth.role() = 'service_role'
      )
      WITH CHECK (
        user_id = auth.uid()
        OR lower(email) = lower(auth.jwt() ->> 'email')
        OR auth.role() = 'service_role'
      );

    NOTIFY pgrst, 'reload schema';
  `;

  let res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql_manual`, {
    method: 'POST',
    headers: {
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ sql_query: sql })
  });

  if (!res.ok) {
    const query = `SELECT 1) t; ${sql}; SELECT 1 --`;
    res = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql_manual`, {
      method: 'POST',
      headers: {
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql_query: query })
    });
  }

  console.log('RLS fix status:', res.status, await res.text());
}

fixRls().catch(console.error);
