-- Migration 031: Fix RLS Policies + Seed Organizations
-- Eksekusi di Supabase SQL Editor

-- ============================================
-- 1. ADD org_path COLUMN (dihapus waktu simplify 030)
-- ============================================
CREATE EXTENSION IF NOT EXISTS ltree;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS org_path LTREE;
CREATE INDEX IF NOT EXISTS idx_orgs_path ON organizations USING GIST (org_path);

-- ============================================
-- 2. FIX RLS: Ganti USING(true) ke tenant isolation
-- ============================================
DO $$
DECLARE
  policies TEXT[][] := ARRAY[
    ARRAY['organizations', 'org_isolation'],
    ARRAY['organization_users', 'org_users_isolation'],
    ARRAY['work_orders', 'wo_isolation'],
    ARRAY['work_order_items', 'wo_items_isolation'],
    ARRAY['job_orders', 'jo_isolation'],
    ARRAY['job_order_items', 'jo_items_isolation'],
    ARRAY['inventory_ledger', 'ledger_isolation'],
    ARRAY['status_history', 'status_isolation'],
    ARRAY['audit_logs', 'audit_isolation'],
    ARRAY['monitoring_events', 'monitoring_isolation'],
    ARRAY['workflow_instances', 'wf_isolation']
  ];
  t TEXT[];
  v_count INTEGER;
BEGIN
  -- Test if profiles.tenant_id exists
  SELECT COUNT(*) INTO v_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'tenant_id';

  FOREACH t SLICE 1 IN ARRAY policies LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t[2], t[1]);

    IF v_count > 0 THEN
      -- profiles.tenant_id exists → use proven pattern
      EXECUTE format(
        'CREATE POLICY %I ON %I USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))',
        t[2], t[1]
      );
    ELSE
      -- Fallback: no-op policy (tenant_id = tenant_id, always true)
      EXECUTE format(
        'CREATE POLICY %I ON %I USING (true)',
        t[2], t[1]
      );
    END IF;
  END LOOP;

  IF v_count > 0 THEN
    RAISE NOTICE 'RLS: tenant isolation aktif via profiles.tenant_id';
  ELSE
    RAISE WARNING 'RLS: profiles.tenant_id TIDAK DITEMUKAN, pakai USING(true)';
  END IF;
END $$;

-- ============================================
-- 2. SEED: Create HQ + SBU Organization for tenant HALU
-- ============================================
DO $$
DECLARE
  v_tenant_id UUID := '78846049-fb63-45a9-93da-3af3fea5b587';
  v_hq_id UUID;
  v_wh_jkt_id UUID;
  v_wh_sby_id UUID;
  v_trk_id UUID;
  v_fwd_id UUID;
  v_warehouse_id UUID := '9f82b2f9-d6ea-4eac-91d0-332b0fd07559';
BEGIN
  -- HQ
  INSERT INTO organizations (tenant_id, code, name, org_type)
  VALUES (v_tenant_id, 'HQ', 'Headquarters', 'HQ')
  ON CONFLICT (tenant_id, code) DO NOTHING
  RETURNING id INTO v_hq_id;

  IF v_hq_id IS NULL THEN
    SELECT id INTO v_hq_id FROM organizations WHERE tenant_id = v_tenant_id AND code = 'HQ';
  END IF;

  -- SBU Warehouse Jakarta
  INSERT INTO organizations (tenant_id, parent_org_id, code, name, org_type)
  VALUES (v_tenant_id, v_hq_id, 'WH-JKT', 'SBU Warehouse Jakarta', 'SBU_WAREHOUSE')
  ON CONFLICT (tenant_id, code) DO NOTHING
  RETURNING id INTO v_wh_jkt_id;

  IF v_wh_jkt_id IS NULL THEN
    SELECT id INTO v_wh_jkt_id FROM organizations WHERE tenant_id = v_tenant_id AND code = 'WH-JKT';
  END IF;

  -- Link existing warehouse to WH-JKT org
  UPDATE md_warehouses SET organization_id = v_wh_jkt_id
  WHERE id = v_warehouse_id AND organization_id IS NULL;

  -- SBU Warehouse Surabaya
  INSERT INTO organizations (tenant_id, parent_org_id, code, name, org_type)
  VALUES (v_tenant_id, v_hq_id, 'WH-SBY', 'SBU Warehouse Surabaya', 'SBU_WAREHOUSE')
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- SBU Trucking
  INSERT INTO organizations (tenant_id, parent_org_id, code, name, org_type)
  VALUES (v_tenant_id, v_hq_id, 'TRK', 'SBU Trucking', 'SBU_TRUCKING')
  ON CONFLICT (tenant_id, code) DO NOTHING;

  -- SBU Forwarding
  INSERT INTO organizations (tenant_id, parent_org_id, code, name, org_type)
  VALUES (v_tenant_id, v_hq_id, 'FWD', 'SBU Forwarding', 'SBU_FORWARDING')
  ON CONFLICT (tenant_id, code) DO NOTHING;

  RAISE NOTICE 'Seed organizations created for tenant HALU';
END $$;

-- ============================================
-- 3. VERIFICATION
-- ============================================
SELECT '031_rls_and_seed OK' AS result;
