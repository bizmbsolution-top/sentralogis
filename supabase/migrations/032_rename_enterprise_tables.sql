-- Migration 032: Rename enterprise tables → wo_ prefix to avoid conflict with existing trucking tables
-- Restore old trucking work_orders, wo_items, job_orders that were accidentally dropped in 030
-- Eksekusi di Supabase SQL Editor

-- ============================================
-- 1. RENAME enterprise tables to wo_ prefix
-- ============================================
ALTER TABLE IF EXISTS organizations RENAME TO wo_organizations;
ALTER TABLE IF EXISTS organization_users RENAME TO wo_organization_users;
ALTER TABLE IF EXISTS work_orders RENAME TO wo_work_orders;
ALTER TABLE IF EXISTS work_order_items RENAME TO wo_work_order_items;
ALTER TABLE IF EXISTS job_orders RENAME TO wo_job_orders;
ALTER TABLE IF EXISTS job_order_items RENAME TO wo_job_order_items;
ALTER TABLE IF EXISTS inventory_ledger RENAME TO wo_inventory_ledger;
ALTER TABLE IF EXISTS status_history RENAME TO wo_status_history;
ALTER TABLE IF EXISTS audit_logs RENAME TO wo_audit_logs;
ALTER TABLE IF EXISTS monitoring_events RENAME TO wo_monitoring_events;
ALTER TABLE IF EXISTS workflow_instances RENAME TO wo_workflow_instances;

-- ============================================
-- 2. RENAME INDEXES (drop old, create new)
-- ============================================
-- Organizations
DROP INDEX IF EXISTS idx_orgs_tenant; CREATE INDEX idx_wo_orgs_tenant ON wo_organizations(tenant_id);
DROP INDEX IF EXISTS idx_orgs_parent; CREATE INDEX idx_wo_orgs_parent ON wo_organizations(parent_org_id);

-- Organization Users
DROP INDEX IF EXISTS idx_org_users_tenant; CREATE INDEX idx_wo_org_users_tenant ON wo_organization_users(tenant_id);
DROP INDEX IF EXISTS idx_org_users_org; CREATE INDEX idx_wo_org_users_org ON wo_organization_users(organization_id);
DROP INDEX IF EXISTS idx_org_users_user; CREATE INDEX idx_wo_org_users_user ON wo_organization_users(user_id);
DROP INDEX IF EXISTS idx_org_users_warehouse; CREATE INDEX idx_wo_org_users_warehouse ON wo_organization_users(assigned_warehouse_id);

-- Work Orders
DROP INDEX IF EXISTS idx_wo_tenant; CREATE INDEX idx_wo2_tenant ON wo_work_orders(tenant_id);
DROP INDEX IF EXISTS idx_wo_org; CREATE INDEX idx_wo2_org ON wo_work_orders(originating_org_id);
DROP INDEX IF EXISTS idx_wo_assigned; CREATE INDEX idx_wo2_assigned ON wo_work_orders(assigned_org_id);
DROP INDEX IF EXISTS idx_wo_type; CREATE INDEX idx_wo2_type ON wo_work_orders(wo_type);
DROP INDEX IF EXISTS idx_wo_status; CREATE INDEX idx_wo2_status ON wo_work_orders(status);
DROP INDEX IF EXISTS idx_wo_correlation; CREATE INDEX idx_wo2_correlation ON wo_work_orders(correlation_id);
DROP INDEX IF EXISTS idx_wo_created; CREATE INDEX idx_wo2_created ON wo_work_orders(created_at DESC);

-- WO Items
DROP INDEX IF EXISTS idx_wo_items_wo; CREATE INDEX idx_wo2_items_wo ON wo_work_order_items(work_order_id);
DROP INDEX IF EXISTS idx_wo_items_sku; CREATE INDEX idx_wo2_items_sku ON wo_work_order_items(product_sku_id);

-- Job Orders
DROP INDEX IF EXISTS idx_jo_tenant; CREATE INDEX idx_wo2_jo_tenant ON wo_job_orders(tenant_id);
DROP INDEX IF EXISTS idx_jo_wo; CREATE INDEX idx_wo2_jo_wo ON wo_job_orders(work_order_id);
DROP INDEX IF EXISTS idx_jo_exec_org; CREATE INDEX idx_wo2_jo_exec_org ON wo_job_orders(executing_org_id);
DROP INDEX IF EXISTS idx_jo_type; CREATE INDEX idx_wo2_jo_type ON wo_job_orders(jo_type);
DROP INDEX IF EXISTS idx_jo_status; CREATE INDEX idx_wo2_jo_status ON wo_job_orders(status);
DROP INDEX IF EXISTS idx_jo_assigned; CREATE INDEX idx_wo2_jo_assigned ON wo_job_orders(assigned_to);
DROP INDEX IF EXISTS idx_jo_correlation; CREATE INDEX idx_wo2_jo_correlation ON wo_job_orders(correlation_id);
DROP INDEX IF EXISTS idx_jo_warehouse; CREATE INDEX idx_wo2_jo_warehouse ON wo_job_orders(assigned_warehouse_id);

-- JO Items
DROP INDEX IF EXISTS idx_jo_items_jo; CREATE INDEX idx_wo2_jo_items_jo ON wo_job_order_items(job_order_id);
DROP INDEX IF EXISTS idx_jo_items_sku; CREATE INDEX idx_wo2_jo_items_sku ON wo_job_order_items(product_sku_id);
DROP INDEX IF EXISTS idx_jo_items_inv; CREATE INDEX idx_wo2_jo_items_inv ON wo_job_order_items(inventory_id);

-- Inventory Ledger
DROP INDEX IF EXISTS idx_ledger_sku; CREATE INDEX idx_wo2_ledger_sku ON wo_inventory_ledger(product_sku_id, created_at DESC);
DROP INDEX IF EXISTS idx_ledger_wh; CREATE INDEX idx_wo2_ledger_wh ON wo_inventory_ledger(warehouse_id, created_at DESC);
DROP INDEX IF EXISTS idx_ledger_bin; CREATE INDEX idx_wo2_ledger_bin ON wo_inventory_ledger(bin_id, created_at DESC);
DROP INDEX IF EXISTS idx_ledger_correlation; CREATE INDEX idx_wo2_ledger_correlation ON wo_inventory_ledger(correlation_id);
DROP INDEX IF EXISTS idx_ledger_jo; CREATE INDEX idx_wo2_ledger_jo ON wo_inventory_ledger(job_order_id);
DROP INDEX IF EXISTS idx_ledger_created; CREATE INDEX idx_wo2_ledger_created ON wo_inventory_ledger(created_at DESC);

-- Status History
DROP INDEX IF EXISTS idx_status_entity; CREATE INDEX idx_wo2_status_entity ON wo_status_history(entity_type, entity_id, created_at DESC);
DROP INDEX IF EXISTS idx_status_correlation; CREATE INDEX idx_wo2_status_correlation ON wo_status_history(correlation_id);
DROP INDEX IF EXISTS idx_status_tenant; CREATE INDEX idx_wo2_status_tenant ON wo_status_history(tenant_id, created_at DESC);

-- Audit Logs
DROP INDEX IF EXISTS idx_audit_entity; CREATE INDEX idx_wo2_audit_entity ON wo_audit_logs(entity_type, entity_id, performed_at DESC);
DROP INDEX IF EXISTS idx_audit_correlation; CREATE INDEX idx_wo2_audit_correlation ON wo_audit_logs(correlation_id);
DROP INDEX IF EXISTS idx_audit_tenant; CREATE INDEX idx_wo2_audit_tenant ON wo_audit_logs(tenant_id, performed_at DESC);

-- Monitoring
DROP INDEX IF EXISTS idx_monitoring_tenant; CREATE INDEX idx_wo2_monitoring_tenant ON wo_monitoring_events(tenant_id, created_at DESC);
DROP INDEX IF EXISTS idx_monitoring_unresolved; CREATE INDEX idx_wo2_monitoring_unresolved ON wo_monitoring_events(is_acknowledged, severity, created_at DESC);

-- Workflow
DROP INDEX IF EXISTS idx_wf_correlation; CREATE INDEX idx_wo2_wf_correlation ON wo_workflow_instances(correlation_id);
DROP INDEX IF EXISTS idx_wf_status; CREATE INDEX idx_wo2_wf_status ON wo_workflow_instances(status, created_at DESC);
DROP INDEX IF EXISTS idx_wf_tenant; CREATE INDEX idx_wo2_wf_tenant ON wo_workflow_instances(tenant_id);

-- ============================================
-- 3. RESTORE old trucking tables (accidentally dropped in 030)
-- ============================================
-- These are the ORIGINAL trucking module tables, recreated from schema inference

-- work_orders (trucking) — customer orders with trucking operations
CREATE TABLE IF NOT EXISTS work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  wo_number TEXT NOT NULL,
  customer_id UUID,
  order_date DATE,
  execution_date DATE,
  execution_time TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  transporter_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, wo_number)
);

CREATE INDEX IF NOT EXISTS idx_truck_wo_tenant ON work_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_truck_wo_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_truck_wo_customer ON work_orders(customer_id);

-- wo_items (trucking) — line items per work order
CREATE TABLE IF NOT EXISTS wo_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  wo_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending',
  max_jo_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_truck_wo_items_wo ON wo_items(wo_id);
CREATE INDEX IF NOT EXISTS idx_truck_wo_items_status ON wo_items(status);

-- job_orders (trucking) — execution units per wo_item
CREATE TABLE IF NOT EXISTS job_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  wo_item_id UUID NOT NULL REFERENCES wo_items(id) ON DELETE CASCADE,
  jo_number TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  transporter_id UUID,
  fleet_id UUID,
  driver_id UUID,
  is_doc_finished BOOLEAN DEFAULT false,
  is_cost_finished BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, jo_number)
);

CREATE INDEX IF NOT EXISTS idx_truck_jo_item ON job_orders(wo_item_id);
CREATE INDEX IF NOT EXISTS idx_truck_jo_status ON job_orders(status);
CREATE INDEX IF NOT EXISTS idx_truck_jo_fleet ON job_orders(fleet_id);
CREATE INDEX IF NOT EXISTS idx_truck_jo_driver ON job_orders(driver_id);

-- ============================================
-- 4. RLS for restored trucking tables
-- ============================================
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tr_wo_isolation ON work_orders;
CREATE POLICY tr_wo_isolation ON work_orders
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

ALTER TABLE wo_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tr_wo_items_isolation ON wo_items;
CREATE POLICY tr_wo_items_isolation ON wo_items
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

ALTER TABLE job_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS tr_jo_isolation ON job_orders;
CREATE POLICY tr_jo_isolation ON job_orders
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- ============================================
-- 5. RLS for renamed enterprise tables
-- ============================================
DO $$
DECLARE
  policies TEXT[][] := ARRAY[
    ARRAY['wo_organizations', 'wo_org_isolation'],
    ARRAY['wo_organization_users', 'wo_org_users_isolation'],
    ARRAY['wo_work_orders', 'wo_work_orders_isolation'],
    ARRAY['wo_work_order_items', 'wo_work_order_items_isolation'],
    ARRAY['wo_job_orders', 'wo_job_orders_isolation'],
    ARRAY['wo_job_order_items', 'wo_job_order_items_isolation'],
    ARRAY['wo_inventory_ledger', 'wo_inventory_ledger_isolation'],
    ARRAY['wo_status_history', 'wo_status_history_isolation'],
    ARRAY['wo_audit_logs', 'wo_audit_logs_isolation'],
    ARRAY['wo_monitoring_events', 'wo_monitoring_events_isolation'],
    ARRAY['wo_workflow_instances', 'wo_workflow_instances_isolation']
  ];
  t TEXT[];
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'profiles'
    AND column_name = 'tenant_id';

  FOREACH t SLICE 1 IN ARRAY policies LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t[2], t[1]);
    IF v_count > 0 THEN
      EXECUTE format(
        'CREATE POLICY %I ON %I USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()))',
        t[2], t[1]
      );
    ELSE
      EXECUTE format('CREATE POLICY %I ON %I USING (true)', t[2], t[1]);
    END IF;
  END LOOP;
END $$;

-- ============================================
-- 6. VERIFICATION
-- ============================================
SELECT '032_rename_and_restore OK' AS result;
