-- Migration 20260804: Trucking Regions (Wilayah Kerja)
-- Creates md_trucking_regions master table and adds region columns to WO + org users + profiles

-- ============================================
-- 1. MASTER: md_trucking_regions
-- ============================================
CREATE TABLE IF NOT EXISTS public.md_trucking_regions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  name TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('PROVINCE', 'CITY')),
  parent_id UUID REFERENCES public.md_trucking_regions(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_trucking_regions_tenant ON md_trucking_regions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_trucking_regions_level ON md_trucking_regions(tenant_id, level);
CREATE INDEX IF NOT EXISTS idx_trucking_regions_parent ON md_trucking_regions(parent_id);

ALTER TABLE md_trucking_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_read_regions" ON md_trucking_regions
  FOR SELECT USING (tenant_id = public.get_my_tenant_id());

CREATE POLICY "tenant_write_regions" ON md_trucking_regions
  FOR ALL USING (tenant_id = public.get_my_tenant_id());

-- ============================================
-- 2. ALTER trucking work_orders — add region_id
-- ============================================
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES md_trucking_regions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_wo_region ON work_orders(tenant_id, region_id);

-- ============================================
-- 3. ALTER wo_organization_users — add assigned_region_id
-- ============================================
ALTER TABLE wo_organization_users ADD COLUMN IF NOT EXISTS assigned_region_id UUID REFERENCES md_trucking_regions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_wo_org_region ON wo_organization_users(tenant_id, assigned_region_id);

-- ============================================
-- 4. ALTER profiles — add region_id (fallback)
-- ============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES md_trucking_regions(id) ON DELETE SET NULL;

-- ============================================
-- 5. ALTER tenant_users — add region_id (for staff assignment)
-- ============================================
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES md_trucking_regions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tu_region ON tenant_users(tenant_id, region_id);
