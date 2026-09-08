-- ==========================================
-- Migration 022: Finance Tenant Isolation
-- Date: 2026-08-31
-- Purpose: Add tenant_id to tenant-scoped finance tables,
--          backfill from job_orders, and replace unsafe
--          USING(true) RLS with tenant-isolated policies.
-- ==========================================

-- ==========================================
-- 1. add_costs
-- ==========================================
ALTER TABLE public.add_costs
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Backfill tenant_id from job_orders via job_order_id
UPDATE public.add_costs ac
SET tenant_id = jo.tenant_id
FROM public.job_orders jo
WHERE ac.job_order_id = jo.id
  AND ac.tenant_id IS NULL;

-- ==========================================
-- 2. finance_journals
-- ==========================================
ALTER TABLE public.finance_journals
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Backfill tenant_id from job_orders via job_order_id
UPDATE public.finance_journals fj
SET tenant_id = jo.tenant_id
FROM public.job_orders jo
WHERE fj.job_order_id = jo.id
  AND fj.tenant_id IS NULL;

-- ==========================================
-- 3. finance_journal_entries
-- ==========================================
ALTER TABLE public.finance_journal_entries
  ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- Backfill tenant_id from finance_journals via journal_id
UPDATE public.finance_journal_entries fje
SET tenant_id = fj.tenant_id
FROM public.finance_journals fj
WHERE fje.journal_id = fj.id
  AND fje.tenant_id IS NULL;

-- ==========================================
-- 4. Verify backfill completeness
-- ==========================================
DO $$
DECLARE
  v_unresolved_add_costs INT;
  v_unresolved_journals INT;
  v_unresolved_entries INT;
BEGIN
  SELECT count(*) INTO v_unresolved_add_costs FROM public.add_costs WHERE tenant_id IS NULL;
  SELECT count(*) INTO v_unresolved_journals FROM public.finance_journals WHERE tenant_id IS NULL;
  SELECT count(*) INTO v_unresolved_entries FROM public.finance_journal_entries WHERE tenant_id IS NULL;

  IF v_unresolved_add_costs > 0 OR v_unresolved_journals > 0 OR v_unresolved_entries > 0 THEN
    RAISE WARNING 'Finance tenant backfill incomplete: add_costs=% journals=% entries=%',
      v_unresolved_add_costs, v_unresolved_journals, v_unresolved_entries;
  END IF;
END $$;

-- ==========================================
-- 5. Enforce NOT NULL (only after backfill)
-- ==========================================
ALTER TABLE public.add_costs
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.finance_journals
  ALTER COLUMN tenant_id SET NOT NULL;

ALTER TABLE public.finance_journal_entries
  ALTER COLUMN tenant_id SET NOT NULL;

-- ==========================================
-- 6. Indexes
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_add_costs_tenant_id
  ON public.add_costs(tenant_id);

CREATE INDEX IF NOT EXISTS idx_finance_journals_tenant_id
  ON public.finance_journals(tenant_id);

CREATE INDEX IF NOT EXISTS idx_finance_journal_entries_tenant_id
  ON public.finance_journal_entries(tenant_id);

-- ==========================================
-- 7. Drop unsafe RLS policies
-- ==========================================
DROP POLICY IF EXISTS "Allow full access to add_costs for authenticated users" ON public.add_costs;
DROP POLICY IF EXISTS "Allow full access to finance tables for authenticated users" ON public.finance_coa;
DROP POLICY IF EXISTS "Allow full access to finance journals for authenticated users" ON public.finance_journals;

-- ==========================================
-- 8. Create tenant-isolated RLS policies
-- ==========================================

-- add_costs: tenant-scoped
CREATE POLICY "tenant_isolation_add_costs" ON public.add_costs
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- finance_journals: tenant-scoped
CREATE POLICY "tenant_isolation_finance_journals" ON public.finance_journals
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- finance_journal_entries: tenant-scoped
CREATE POLICY "tenant_isolation_finance_journal_entries" ON public.finance_journal_entries
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- finance_coa: global system reference data — read-only for authenticated users
CREATE POLICY "read_only_finance_coa" ON public.finance_coa
  FOR SELECT TO authenticated
  USING (true);

-- ==========================================
-- 9. Verification
-- ==========================================
SELECT 'finance_tenant_isolation' AS migration_name;
