-- Re-apply: ensure region_id column exists on work_orders
-- The original migration (20260804) may not have been applied to production.

-- 1. Master table
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

ALTER TABLE md_trucking_regions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tenant_read_regions" ON md_trucking_regions;
CREATE POLICY "tenant_read_regions" ON md_trucking_regions
  FOR SELECT USING (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS "tenant_write_regions" ON md_trucking_regions;
CREATE POLICY "tenant_write_regions" ON md_trucking_regions
  FOR ALL USING (tenant_id = public.get_my_tenant_id());

-- 2. Ensure region_id on work_orders
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES md_trucking_regions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_wo_region ON work_orders(tenant_id, region_id);

-- 3. Ensure assigned_region_id on wo_organization_users
ALTER TABLE wo_organization_users ADD COLUMN IF NOT EXISTS assigned_region_id UUID REFERENCES md_trucking_regions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_wo_org_region ON wo_organization_users(tenant_id, assigned_region_id);

-- 4. Ensure region_id on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES md_trucking_regions(id) ON DELETE SET NULL;

-- 5. Ensure region_id on tenant_users
ALTER TABLE tenant_users ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES md_trucking_regions(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_tu_region ON tenant_users(tenant_id, region_id);

-- 6. Verify (will show in migration output)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'work_orders' AND column_name = 'region_id'
  ) THEN
    RAISE NOTICE 'SUCCESS: work_orders.region_id column exists';
  ELSE
    RAISE WARNING 'FAILED: work_orders.region_id column still missing after migration';
  END IF;
END $$;
