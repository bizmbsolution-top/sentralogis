-- Migration 20260811: Fix job_orders/work_orders/wo_items RLS + duplicate INTERNAL HQ entities
--
-- PROBLEM 1: RLS violation "new row violates row-level security policy for table job_orders"
--   - Old policies (migration 032) reference profiles.tenant_id which does NOT exist
--   - Fix: recreate with public.get_my_tenant_id() (same pattern as migrations 066/082/114/154)
-- PROBLEM 2: Duplicate "INTERNAL HQ" transporter in assignment selector (tenant ATM)
--   - cc3394e4 is the real internal entity (used by fleets/drivers/JOs)
--   - 7de8738d is an orphan duplicate (0 JOs)
--   - Fix: deactivate duplicate, mark real one is_own = true

-- ============================================
-- 1. Fix duplicate INTERNAL HQ entities (tenant ATM)
-- ============================================
UPDATE public.md_entities
SET is_own = true
WHERE id = 'cc3394e4-554a-49e6-95aa-8cf6fc41a8b3';

UPDATE public.md_entities
SET is_active = false
WHERE id = '7de8738d-9578-425b-9315-bf132e2b9e1b';

-- ============================================
-- 2. RLS: job_orders
-- ============================================
DROP POLICY IF EXISTS tr_jo_isolation ON public.job_orders;
DROP POLICY IF EXISTS jo_isolation ON public.job_orders;

CREATE POLICY tr_jo_isolation ON public.job_orders
FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_orders TO authenticated;

-- ============================================
-- 3. RLS: work_orders
-- ============================================
DROP POLICY IF EXISTS tr_wo_isolation ON public.work_orders;
DROP POLICY IF EXISTS wo_isolation ON public.work_orders;

CREATE POLICY tr_wo_isolation ON public.work_orders
FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_orders TO authenticated;

-- ============================================
-- 4. RLS: wo_items
-- ============================================
DROP POLICY IF EXISTS tr_wo_items_isolation ON public.wo_items;
DROP POLICY IF EXISTS wo_items_isolation ON public.wo_items;

CREATE POLICY tr_wo_items_isolation ON public.wo_items
FOR ALL TO authenticated
USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.wo_items TO authenticated;

-- ============================================
-- 4b. RLS: job_routes (draft flow inserts routes)
-- ============================================
DROP POLICY IF EXISTS job_routes_isolation ON public.job_routes;

CREATE POLICY job_routes_isolation ON public.job_routes
FOR ALL TO authenticated
USING (job_order_id IN (SELECT id FROM public.job_orders))
WITH CHECK (job_order_id IN (SELECT id FROM public.job_orders));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_routes TO authenticated;

-- ============================================
-- 5. Reload PostgREST cache
-- ============================================
NOTIFY pgrst, 'reload schema';

SELECT '20260811_fix_job_orders_rls_and_dup_entities OK' AS result;
