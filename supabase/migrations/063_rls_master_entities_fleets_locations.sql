-- Migration 063: Add RLS tenant isolation to md_entities, md_fleets, md_locations
-- These master tables had NO RLS — any authenticated user could read all tenants' data

-- ============================================
-- 1. md_entities (customers, vendors, transporters)
-- ============================================
ALTER TABLE IF EXISTS public.md_entities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "md_entities_tenant_isolation" ON public.md_entities;
CREATE POLICY "md_entities_tenant_isolation" ON public.md_entities
FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- ============================================
-- 2. md_fleets
-- ============================================
ALTER TABLE IF EXISTS public.md_fleets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "md_fleets_tenant_isolation" ON public.md_fleets;
CREATE POLICY "md_fleets_tenant_isolation" ON public.md_fleets
FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- ============================================
-- 3. md_locations
-- ============================================
ALTER TABLE IF EXISTS public.md_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "md_locations_tenant_isolation" ON public.md_locations;
CREATE POLICY "md_locations_tenant_isolation" ON public.md_locations
FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

-- ============================================
-- 4. md_drivers (also likely missing RLS)
-- ============================================
ALTER TABLE IF EXISTS public.md_drivers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "md_drivers_tenant_isolation" ON public.md_drivers;
CREATE POLICY "md_drivers_tenant_isolation" ON public.md_drivers
FOR ALL USING (
  tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())
);

SELECT '063_rls_master_entities_fleets_locations OK' AS result;
