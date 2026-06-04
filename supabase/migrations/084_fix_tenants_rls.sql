-- Fix RLS for tenants table

ALTER TABLE IF EXISTS public.tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenants_read_access" ON public.tenants;
CREATE POLICY "tenants_read_access" ON public.tenants
FOR SELECT USING (
  id = public.get_my_tenant_id() OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "tenants_owner_update" ON public.tenants;
CREATE POLICY "tenants_owner_update" ON public.tenants
FOR UPDATE USING (
  user_id = auth.uid()
);

SELECT '084_fix_tenants_rls OK' AS result;
