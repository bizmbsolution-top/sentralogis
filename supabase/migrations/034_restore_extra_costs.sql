-- Migration 034: Restore extra_costs table (dropped by CASCADE from job_orders in 030)
-- Also add missing FK columns to restored trucking tables
-- Eksekusi di Supabase SQL Editor

-- ============================================
-- 1. RESTORE extra_costs
-- ============================================
CREATE TABLE IF NOT EXISTS extra_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  jo_id UUID REFERENCES job_orders(id) ON DELETE CASCADE,
  cost_type TEXT NOT NULL,
  charge_type TEXT DEFAULT 'reimbursement',
  amount NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  is_billable BOOLEAN DEFAULT true,
  paid_by_entity TEXT,
  status TEXT DEFAULT 'draft',
  proof_url TEXT,
  decided_at TIMESTAMPTZ,
  tax_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_extra_costs_jo ON extra_costs(jo_id);
CREATE INDEX IF NOT EXISTS idx_extra_costs_status ON extra_costs(status);

ALTER TABLE extra_costs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS extra_costs_isolation ON extra_costs;
CREATE POLICY extra_costs_isolation ON extra_costs
  USING (true);

-- ============================================
-- 2. ADD MISSING COLUMNS TO RESTORED TABLES
-- ============================================
-- job_orders columns referenced by existing code
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS base_price NUMERIC DEFAULT 0;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS driver_share_percentage NUMERIC DEFAULT 40.0;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS purchase_price NUMERIC DEFAULT 0;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS vendor_invoice_amount NUMERIC DEFAULT 0;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS advance_amount NUMERIC DEFAULT 0;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS driver_payment_amount NUMERIC DEFAULT 0;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS is_doc_finished BOOLEAN DEFAULT false;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS is_cost_finished BOOLEAN DEFAULT false;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS transporter_id UUID;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS vendor_id UUID;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- work_orders columns
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS order_date DATE;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS execution_date DATE;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS execution_time TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS transporter_id UUID;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS notes TEXT;

-- wo_items columns
ALTER TABLE wo_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE wo_items ADD COLUMN IF NOT EXISTS max_jo_count INTEGER;
ALTER TABLE wo_items ADD COLUMN IF NOT EXISTS item_data JSONB;
ALTER TABLE wo_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 3. ADD FKs for restored columns
-- ============================================
ALTER TABLE job_orders DROP CONSTRAINT IF EXISTS fk_job_orders_transporter;
ALTER TABLE job_orders ADD CONSTRAINT fk_job_orders_transporter
  FOREIGN KEY (transporter_id) REFERENCES md_entities(id) ON DELETE SET NULL;

ALTER TABLE job_orders DROP CONSTRAINT IF EXISTS fk_job_orders_vendor;
ALTER TABLE job_orders ADD CONSTRAINT fk_job_orders_vendor
  FOREIGN KEY (vendor_id) REFERENCES md_entities(id) ON DELETE SET NULL;

ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS fk_work_orders_customer;
ALTER TABLE work_orders ADD CONSTRAINT fk_work_orders_customer
  FOREIGN KEY (customer_id) REFERENCES md_entities(id) ON DELETE SET NULL;

ALTER TABLE work_orders DROP CONSTRAINT IF EXISTS fk_work_orders_transporter;
ALTER TABLE work_orders ADD CONSTRAINT fk_work_orders_transporter
  FOREIGN KEY (transporter_id) REFERENCES md_entities(id) ON DELETE SET NULL;

-- ============================================
-- 4. ADD MISSING FK: wo_items.wo_id → work_orders.id
-- The FK was supposed to be created in migration 032 but was skipped
-- because CREATE TABLE IF NOT EXISTS didn't recreate the existing table.
-- First delete orphaned rows whose wo_id references deleted work_orders.
-- ============================================
-- Clean orphans before adding FKs
DELETE FROM job_orders jo
WHERE jo.wo_item_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM wo_items wi WHERE wi.id = jo.wo_item_id);

DELETE FROM extra_costs ec
WHERE NOT EXISTS (SELECT 1 FROM job_orders jo WHERE jo.id = ec.jo_id);

DELETE FROM wo_items wi
WHERE NOT EXISTS (SELECT 1 FROM work_orders wo WHERE wo.id = wi.wo_id);

ALTER TABLE wo_items DROP CONSTRAINT IF EXISTS wo_items_wo_id_fkey;
ALTER TABLE wo_items ADD CONSTRAINT wo_items_wo_id_fkey
  FOREIGN KEY (wo_id) REFERENCES work_orders(id) ON DELETE CASCADE;

-- ============================================
-- 5. VERIFICATION
-- ============================================
SELECT '034_restore_extra_costs OK' AS result;
