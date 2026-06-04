-- Migration 083: Fix RLS for tenant_sbus to use get_my_tenant_id()
--
-- PROBLEM:
-- Migration 040 created a policy "tenant_sbus_isolation" that hardcoded a check against
-- "public.profiles.tenant_id". Not only does that column not exist or isn't reliably populated,
-- but it completely bypasses the get_my_tenant_id() helper, which we just updated in 082
-- to support Tenant Owners. Because of this old policy, Tenant Owners see 0 SBUs and
-- cannot insert new ones.
--
-- SOLUTION:
-- Drop the bad policy and recreate it using public.get_my_tenant_id() so that
-- both Tenant Owners (from `tenants` table) and Staff (from `tenant_users`) get access.

DROP POLICY IF EXISTS "tenant_sbus_isolation" ON public.tenant_sbus;

CREATE POLICY "tenant_sbus_tenant_isolation" ON public.tenant_sbus
FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

SELECT '083_fix_tenant_sbus_rls OK' AS result;
