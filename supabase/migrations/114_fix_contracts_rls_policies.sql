-- Migration: 114_fix_contracts_rls_policies
-- Description: Fix RLS policies for contracts-related tables to use public.get_my_tenant_id() instead of profiles.tenant_id (which does not exist)

-- 1. Fix public.md_storage_contracts RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.md_storage_contracts TO authenticated;
DROP POLICY IF EXISTS tenant_isolation_md_storage_contracts ON public.md_storage_contracts;
CREATE POLICY tenant_isolation_md_storage_contracts ON public.md_storage_contracts
  FOR ALL
  TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- 2. Fix public.md_contract_warehouses RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.md_contract_warehouses TO authenticated;
DROP POLICY IF EXISTS tenant_isolation_md_contract_warehouses ON public.md_contract_warehouses;
CREATE POLICY tenant_isolation_md_contract_warehouses ON public.md_contract_warehouses
  FOR ALL
  TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- 3. Fix public.md_billing_rates RLS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.md_billing_rates TO authenticated;
DROP POLICY IF EXISTS tenant_isolation_md_billing_rates ON public.md_billing_rates;
CREATE POLICY tenant_isolation_md_billing_rates ON public.md_billing_rates
  FOR ALL
  TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
