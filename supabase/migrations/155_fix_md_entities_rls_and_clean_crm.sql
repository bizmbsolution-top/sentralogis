-- ============================================================
-- FIX: md_entities RLS + Clean CRM Data
-- Jalankan di Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. DIAGNOSTIC: Lihat semua policy aktif di md_entities
--    Cari policy "Enable public SELECT for entities" → ini yang bocor
SELECT policyname, qual
FROM pg_policies
WHERE tablename = 'md_entities';

-- 2. FIX: Drop policy berbahaya yang mengizinkan semua user lihat semua data
DROP POLICY IF EXISTS "Enable public SELECT for entities" ON public.md_entities;
DROP POLICY IF EXISTS "Enable public SELECT for drivers" ON public.md_drivers;
DROP POLICY IF EXISTS "Enable public SELECT for product skus" ON public.md_product_skus;
DROP POLICY IF EXISTS "Enable public UPDATE for inbound receipts" ON public.wh_inbound_receipts;

-- 3. VERIFY: Pastikan policy tenant_isolation masih ada
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'md_entities'
      AND policyname = 'md_entities_tenant_isolation'
  ) THEN
    CREATE POLICY "md_entities_tenant_isolation" ON public.md_entities
    FOR ALL TO authenticated
    USING (tenant_id = public.get_my_tenant_id())
    WITH CHECK (tenant_id = public.get_my_tenant_id());
    RAISE NOTICE 'Created md_entities_tenant_isolation policy';
  ELSE
    RAISE NOTICE 'md_entities_tenant_isolation already exists';
  END IF;
END $$;

-- 4. CLEAN: Reset semua CRM fields di md_entities
--    (sales_rep_id = NULL → leads hilang dari /commercial/leads)
UPDATE public.md_entities
SET crm_status = NULL, sales_rep_id = NULL
WHERE crm_status IS NOT NULL OR sales_rep_id IS NOT NULL;

-- 5. CLEAN: Hapus semua data CRM
TRUNCATE TABLE public.crm_activities CASCADE;
TRUNCATE TABLE public.crm_deals CASCADE;
TRUNCATE TABLE public.crm_quotations CASCADE;
TRUNCATE TABLE public.crm_quotation_items CASCADE;
TRUNCATE TABLE public.crm_sbu_customer_rates CASCADE;
TRUNCATE TABLE public.crm_quotation_sections CASCADE;
TRUNCATE TABLE public.crm_guest_links CASCADE;

-- 6. VERIFY: Pastikan policy "Enable public SELECT" sudah hilang
SELECT policyname, qual
FROM pg_policies
WHERE tablename = 'md_entities';

-- 7. RELOAD PostgREST cache
NOTIFY pgrst, 'reload schema';

SELECT 'DONE: RLS fixed, CRM data cleaned' AS result;
