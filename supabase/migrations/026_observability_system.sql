-- Observability System — Audit Trail, Status History, and Monitoring tables
-- Eksekusi di Supabase SQL Editor

-- ============================================
-- 1. AUDIT LOGS — Permanent business activity history
-- ============================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  user_id UUID,
  user_name TEXT,
  reference_type TEXT,
  reference_id TEXT,
  correlation_id TEXT,
  severity TEXT NOT NULL DEFAULT 'low' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  old_data JSONB,
  new_data JSONB,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_module ON audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_reference ON audit_logs(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_correlation ON audit_logs(correlation_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON audit_logs(severity);

-- Auto-archive: keep 90 days of audit logs, archive older ones
-- (archive logic handled by cleanup cron job)

-- ============================================
-- 2. STATUS HISTORY — Historical workflow visibility
-- ============================================

-- 2a. Job Order Status History
CREATE TABLE IF NOT EXISTS job_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id UUID NOT NULL REFERENCES job_orders(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  correlation_id TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_job_status_history_job ON job_status_history(job_order_id);
CREATE INDEX IF NOT EXISTS idx_job_status_history_changed ON job_status_history(changed_at DESC);

-- 2b. Shipment Status History (for forwarding module)
CREATE TABLE IF NOT EXISTS shipment_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  correlation_id TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_shipment_status_history_shipment ON shipment_status_history(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_status_history_changed ON shipment_status_history(changed_at DESC);

-- 2c. Inventory Movement History (for WMS module)
CREATE TABLE IF NOT EXISTS inventory_movement_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID,
  warehouse_id UUID,
  old_quantity NUMERIC(15, 2),
  new_quantity NUMERIC(15, 2) NOT NULL,
  movement_type TEXT NOT NULL,
  reference_type TEXT,
  reference_id TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  correlation_id TEXT,
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_inventory_movement_item ON inventory_movement_history(item_id);
CREATE INDEX IF NOT EXISTS idx_inventory_movement_changed ON inventory_movement_history(changed_at DESC);

-- ============================================
-- 3. MONITORING CHECKS LOG — Track cron execution results
-- ============================================
CREATE TABLE IF NOT EXISTS monitoring_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  check_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pass', 'fail', 'warning')),
  module TEXT,
  message TEXT,
  details JSONB,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_monitoring_checks_type ON monitoring_checks(check_type);
CREATE INDEX IF NOT EXISTS idx_monitoring_checks_status ON monitoring_checks(status);
CREATE INDEX IF NOT EXISTS idx_monitoring_checks_checked ON monitoring_checks(checked_at DESC);

-- Auto-cleanup: monitoring_checks older than 30 days can be archived
