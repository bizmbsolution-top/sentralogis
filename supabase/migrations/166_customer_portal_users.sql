-- Migration 166: Customer Portal Users mapping (`md_customer_users`)
-- Maps authentication users/emails to specific customer entities (`md_entities` where is_customer = true)

CREATE TABLE IF NOT EXISTS public.md_customer_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.md_entities(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  full_name TEXT,
  whatsapp TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, email)
);

CREATE INDEX IF NOT EXISTS idx_md_customer_users_tenant_customer ON public.md_customer_users(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_md_customer_users_email ON public.md_customer_users(email);
CREATE INDEX IF NOT EXISTS idx_md_customer_users_user_id ON public.md_customer_users(user_id);

ALTER TABLE public.md_customer_users ENABLE ROW LEVEL SECURITY;

-- Policy for tenant admins & managers to manage customer portal users
CREATE POLICY "Admins can manage customer portal users" ON public.md_customer_users
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tenant_users tu
      WHERE tu.user_id = auth.uid()
        AND tu.tenant_id = md_customer_users.tenant_id
        AND tu.role_code IN ('tenant_superadmin', 'tenant_admin', 'sbu_wh_manager', 'sbu_ops_wh', 'sbu_admin_wh')
    )
    OR EXISTS (
      SELECT 1 FROM public.tenants t
      WHERE t.user_id = auth.uid()
        AND t.id = md_customer_users.tenant_id
    )
    OR auth.role() = 'service_role'
  );

-- Policy for customer users to view their own record
CREATE POLICY "Customer users can view their own mapping" ON public.md_customer_users
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR lower(email) = lower(auth.jwt() ->> 'email')
    OR auth.role() = 'service_role'
  );
