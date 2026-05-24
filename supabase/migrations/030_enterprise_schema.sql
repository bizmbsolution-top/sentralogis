-- Migration 030: Enterprise Schema — Core Tables
-- Fresh run: drops any partial tables from previous attempts, then creates clean
-- Eksekusi di Supabase SQL Editor

-- ============================================
-- 0. CLEANUP — Drop tables from failed partial runs
-- ============================================
DROP TABLE IF EXISTS workflow_instances CASCADE;
DROP TABLE IF EXISTS monitoring_events CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS status_history CASCADE;
DROP TABLE IF EXISTS inventory_ledger CASCADE;
DROP TABLE IF EXISTS job_order_items CASCADE;
DROP TABLE IF EXISTS job_orders CASCADE;
DROP TABLE IF EXISTS work_order_items CASCADE;
DROP TABLE IF EXISTS work_orders CASCADE;
DROP TABLE IF EXISTS organization_users CASCADE;
DROP TABLE IF EXISTS organizations CASCADE;

-- ============================================
-- 1. EXTENSIONS
-- ============================================
CREATE EXTENSION IF NOT EXISTS ltree;

-- ============================================
-- 2. ORGANIZATIONS
-- ============================================
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  parent_org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  org_type TEXT NOT NULL,
  address TEXT,
  city TEXT,
  province TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  settings JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, code)
);

CREATE INDEX idx_orgs_tenant ON organizations(tenant_id);
CREATE INDEX idx_orgs_parent ON organizations(parent_org_id);

-- ============================================
-- 3. ORGANIZATION USERS
-- ============================================
CREATE TABLE organization_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  role_code TEXT NOT NULL,
  is_primary BOOLEAN DEFAULT false,
  assigned_warehouse_id UUID,
  is_active BOOLEAN NOT NULL DEFAULT true,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (organization_id, user_id, role_code)
);

CREATE INDEX idx_org_users_tenant ON organization_users(tenant_id);
CREATE INDEX idx_org_users_org ON organization_users(organization_id);
CREATE INDEX idx_org_users_user ON organization_users(user_id);
CREATE INDEX idx_org_users_warehouse ON organization_users(assigned_warehouse_id);

-- ============================================
-- 4. WORK ORDERS
-- ============================================
CREATE TABLE work_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  originating_org_id UUID NOT NULL REFERENCES organizations(id),
  assigned_org_id UUID REFERENCES organizations(id),
  wo_number TEXT NOT NULL,
  wo_type TEXT NOT NULL,
  priority TEXT DEFAULT 'NORMAL',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  reference_type TEXT,
  reference_id TEXT,
  description TEXT,
  notes TEXT,
  requested_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  target_date DATE,
  completed_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, wo_number)
);

CREATE INDEX idx_wo_tenant ON work_orders(tenant_id);
CREATE INDEX idx_wo_org ON work_orders(originating_org_id);
CREATE INDEX idx_wo_assigned ON work_orders(assigned_org_id);
CREATE INDEX idx_wo_type ON work_orders(wo_type);
CREATE INDEX idx_wo_status ON work_orders(status);
CREATE INDEX idx_wo_correlation ON work_orders(correlation_id);
CREATE INDEX idx_wo_created ON work_orders(created_at DESC);

-- ============================================
-- 5. WORK ORDER ITEMS
-- ============================================
CREATE TABLE work_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  line_number INTEGER NOT NULL,
  product_sku_id UUID,
  item_description TEXT,
  requested_quantity NUMERIC(15, 2),
  fulfilled_quantity NUMERIC(15, 2) DEFAULT 0,
  uom TEXT DEFAULT 'PCS',
  from_warehouse_id UUID,
  from_bin_id UUID,
  to_warehouse_id UUID,
  to_bin_id UUID,
  batch_number TEXT,
  expiry_date DATE,
  unit_cost NUMERIC(15, 2),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (work_order_id, line_number)
);

CREATE INDEX idx_wo_items_wo ON work_order_items(work_order_id);
CREATE INDEX idx_wo_items_sku ON work_order_items(product_sku_id);

-- ============================================
-- 6. JOB ORDERS
-- ============================================
CREATE TABLE job_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  work_order_id UUID NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
  work_order_item_id UUID,
  originating_org_id UUID NOT NULL REFERENCES organizations(id),
  executing_org_id UUID NOT NULL REFERENCES organizations(id),
  assigned_warehouse_id UUID,
  jo_number TEXT NOT NULL,
  jo_type TEXT NOT NULL,
  sequence_order INTEGER NOT NULL DEFAULT 0,
  depends_on_jo_id UUID,
  status TEXT NOT NULL DEFAULT 'PENDING',
  assigned_to UUID,
  assigned_fleet_id UUID,
  assigned_driver_id UUID,
  scheduled_start TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  sla_minutes INTEGER,
  requires_approval BOOLEAN DEFAULT false,
  approved_by UUID,
  approved_at TIMESTAMPTZ,
  notes TEXT,
  result JSONB DEFAULT '{}'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, jo_number)
);

CREATE INDEX idx_jo_tenant ON job_orders(tenant_id);
CREATE INDEX idx_jo_wo ON job_orders(work_order_id);
CREATE INDEX idx_jo_exec_org ON job_orders(executing_org_id);
CREATE INDEX idx_jo_type ON job_orders(jo_type);
CREATE INDEX idx_jo_status ON job_orders(status);
CREATE INDEX idx_jo_assigned ON job_orders(assigned_to);
CREATE INDEX idx_jo_correlation ON job_orders(correlation_id);
CREATE INDEX idx_jo_warehouse ON job_orders(assigned_warehouse_id);

-- ============================================
-- 7. JOB ORDER ITEMS
-- ============================================
CREATE TABLE job_order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id UUID NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  inventory_id UUID,
  product_sku_id UUID,
  from_bin_id UUID,
  to_bin_id UUID,
  requested_quantity NUMERIC(15, 2),
  actual_quantity NUMERIC(15, 2),
  uom TEXT DEFAULT 'PCS',
  batch_number TEXT,
  expiry_date DATE,
  lot_number TEXT,
  pallet_id TEXT,
  is_damaged BOOLEAN DEFAULT false,
  damage_notes TEXT,
  result JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_jo_items_jo ON job_order_items(job_order_id);
CREATE INDEX idx_jo_items_sku ON job_order_items(product_sku_id);
CREATE INDEX idx_jo_items_inv ON job_order_items(inventory_id);

-- ============================================
-- 8. INVENTORY LEDGER (Append-Only)
-- ============================================
CREATE TABLE inventory_ledger (
  id BIGSERIAL PRIMARY KEY,
  correlation_id UUID NOT NULL,
  tenant_id UUID NOT NULL,
  product_sku_id UUID NOT NULL,
  warehouse_id UUID NOT NULL,
  bin_id UUID,
  movement_type TEXT NOT NULL,
  movement_reason TEXT,
  quantity_change NUMERIC(15, 2) NOT NULL,
  quantity_before NUMERIC(15, 2),
  quantity_after NUMERIC(15, 2),
  batch_number TEXT,
  expiry_date DATE,
  lot_number TEXT,
  pallet_id TEXT,
  unit_cost NUMERIC(15, 2),
  total_cost NUMERIC(15, 2),
  source_document_type TEXT,
  source_document_id UUID,
  job_order_id UUID,
  job_order_item_id UUID,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ledger_sku ON inventory_ledger(product_sku_id, created_at DESC);
CREATE INDEX idx_ledger_wh ON inventory_ledger(warehouse_id, created_at DESC);
CREATE INDEX idx_ledger_bin ON inventory_ledger(bin_id, created_at DESC);
CREATE INDEX idx_ledger_correlation ON inventory_ledger(correlation_id);
CREATE INDEX idx_ledger_jo ON inventory_ledger(job_order_id);
CREATE INDEX idx_ledger_created ON inventory_ledger(created_at DESC);

-- ============================================
-- 9. STATUS HISTORY
-- ============================================
CREATE TABLE status_history (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL,
  correlation_id UUID,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  previous_status TEXT,
  new_status TEXT NOT NULL,
  reason TEXT,
  performed_by UUID,
  duration_in_previous_state INTERVAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_status_entity ON status_history(entity_type, entity_id, created_at DESC);
CREATE INDEX idx_status_correlation ON status_history(correlation_id);
CREATE INDEX idx_status_tenant ON status_history(tenant_id, created_at DESC);

-- ============================================
-- 10. AUDIT LOGS
-- ============================================
CREATE TABLE audit_logs (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID,
  correlation_id UUID,
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  operation TEXT NOT NULL,
  old_data JSONB,
  new_data JSONB,
  changed_fields TEXT[],
  performed_by UUID,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address TEXT,
  user_agent TEXT
);

CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id, performed_at DESC);
CREATE INDEX idx_audit_correlation ON audit_logs(correlation_id);
CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id, performed_at DESC);

-- ============================================
-- 11. MONITORING EVENTS
-- ============================================
CREATE TABLE monitoring_events (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID,
  correlation_id UUID,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  source TEXT,
  title TEXT NOT NULL,
  description TEXT,
  affected_entity_type TEXT,
  affected_entity_id UUID,
  metric_name TEXT,
  metric_value NUMERIC(15, 2),
  threshold NUMERIC(15, 2),
  payload JSONB,
  is_acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID,
  acknowledged_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_monitoring_tenant ON monitoring_events(tenant_id, created_at DESC);
CREATE INDEX idx_monitoring_unresolved ON monitoring_events(is_acknowledged, severity, created_at DESC);

-- ============================================
-- 12. WORKFLOW INSTANCES
-- ============================================
CREATE TABLE workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  correlation_id UUID NOT NULL,
  workflow_name TEXT NOT NULL,
  workflow_version TEXT NOT NULL,
  trigger_entity_type TEXT,
  trigger_entity_id UUID,
  status TEXT NOT NULL,
  current_step TEXT,
  steps_completed INTEGER DEFAULT 0,
  steps_total INTEGER DEFAULT 0,
  context JSONB,
  result JSONB,
  error_message TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wf_correlation ON workflow_instances(correlation_id);
CREATE INDEX idx_wf_status ON workflow_instances(status, created_at DESC);
CREATE INDEX idx_wf_tenant ON workflow_instances(tenant_id);

-- ============================================
-- 13. LINK EXISTING WAREHOUSES TO ORGANIZATIONS
-- ============================================
ALTER TABLE md_warehouses ADD COLUMN IF NOT EXISTS organization_id UUID;
CREATE INDEX IF NOT EXISTS idx_md_warehouses_org ON md_warehouses(organization_id);

-- ============================================
-- 14. RLS POLICIES
-- ============================================
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_isolation ON organizations;
CREATE POLICY org_isolation ON organizations USING (true);

ALTER TABLE organization_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS org_users_isolation ON organization_users;
CREATE POLICY org_users_isolation ON organization_users USING (true);

ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wo_isolation ON work_orders;
CREATE POLICY wo_isolation ON work_orders USING (true);

ALTER TABLE work_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wo_items_isolation ON work_order_items;
CREATE POLICY wo_items_isolation ON work_order_items USING (true);

ALTER TABLE job_orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jo_isolation ON job_orders;
CREATE POLICY jo_isolation ON job_orders USING (true);

ALTER TABLE job_order_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS jo_items_isolation ON job_order_items;
CREATE POLICY jo_items_isolation ON job_order_items USING (true);

ALTER TABLE inventory_ledger ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ledger_isolation ON inventory_ledger;
CREATE POLICY ledger_isolation ON inventory_ledger USING (true);

ALTER TABLE status_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS status_isolation ON status_history;
CREATE POLICY status_isolation ON status_history USING (true);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_isolation ON audit_logs;
CREATE POLICY audit_isolation ON audit_logs USING (true);

ALTER TABLE monitoring_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS monitoring_isolation ON monitoring_events;
CREATE POLICY monitoring_isolation ON monitoring_events USING (true);

ALTER TABLE workflow_instances ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS wf_isolation ON workflow_instances;
CREATE POLICY wf_isolation ON workflow_instances USING (true);

-- ============================================
-- 15. SEQUENCES
-- ============================================
CREATE SEQUENCE IF NOT EXISTS seq_wo_number START 100000;
CREATE SEQUENCE IF NOT EXISTS seq_jo_number START 200000;

-- ============================================
-- 16. VERIFICATION
-- ============================================
SELECT '030_enterprise_schema OK' AS result;
