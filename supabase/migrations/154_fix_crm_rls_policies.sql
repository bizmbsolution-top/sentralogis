-- Migration 154: Fix CRM tables RLS policies to use public.get_my_tenant_id()
-- Problem: Earlier migrations referenced `profiles.tenant_id` which does not exist or is null,
-- causing INSERT operations (like creating quotations) to fail with RLS violation.
-- Solution: Standardize CRM tables RLS policies to use `public.get_my_tenant_id()`.

-- 1. crm_deals
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_deals TO authenticated;
DROP POLICY IF EXISTS "tenant_isolation_crm_deals" ON public.crm_deals;
CREATE POLICY "tenant_isolation_crm_deals" ON public.crm_deals
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- 2. crm_activities
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_activities TO authenticated;
DROP POLICY IF EXISTS "tenant_isolation_crm_activities" ON public.crm_activities;
CREATE POLICY "tenant_isolation_crm_activities" ON public.crm_activities
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- 3. crm_quotations
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_quotations TO authenticated;
DROP POLICY IF EXISTS "tenant_isolation_crm_quotations" ON public.crm_quotations;
CREATE POLICY "tenant_isolation_crm_quotations" ON public.crm_quotations
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- 4. crm_quotation_items
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_quotation_items TO authenticated;
DROP POLICY IF EXISTS "tenant_isolation_crm_quotation_items" ON public.crm_quotation_items;
CREATE POLICY "tenant_isolation_crm_quotation_items" ON public.crm_quotation_items
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- 5. crm_sbu_customer_rates
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_sbu_customer_rates TO authenticated;
DROP POLICY IF EXISTS "tenant_isolation_crm_sbu_customer_rates" ON public.crm_sbu_customer_rates;
CREATE POLICY "tenant_isolation_crm_sbu_customer_rates" ON public.crm_sbu_customer_rates
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- 6. crm_quotation_sections
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_quotation_sections TO authenticated;
DROP POLICY IF EXISTS "tenant_isolation_crm_quotation_sections" ON public.crm_quotation_sections;
CREATE POLICY "tenant_isolation_crm_quotation_sections" ON public.crm_quotation_sections
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());
