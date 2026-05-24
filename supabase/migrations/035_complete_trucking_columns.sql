-- Migration 035: Complete all missing columns on restored trucking tables
-- Covers all columns referenced by HQ + SBU pages found via codebase scan
-- Eksekusi di Supabase SQL Editor

-- ============================================
-- 1. work_orders — missing columns
-- ============================================
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS execution_date DATE;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS physical_doc_received BOOLEAN DEFAULT false;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS physical_doc_files JSONB;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS physical_doc_notes TEXT;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS physical_doc_collected_at TIMESTAMPTZ;

-- ============================================
-- 2. wo_items — missing columns
-- ============================================
ALTER TABLE wo_items ADD COLUMN IF NOT EXISTS item_code TEXT;
ALTER TABLE wo_items ADD COLUMN IF NOT EXISTS sbu_type TEXT;

-- ============================================
-- 3. job_orders — missing columns (LOTS)
-- ============================================
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS total_stops INTEGER DEFAULT 0;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS tracking_token TEXT;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS driver_phone TEXT;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS estimated_margin NUMERIC DEFAULT 0;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS wa_token TEXT;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS driver_link_token TEXT;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS advance_status TEXT DEFAULT 'pending';
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS pod_photo_url TEXT;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS pod_status TEXT DEFAULT 'pending';
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS advance_receipt_url TEXT;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS driver_revenue_share NUMERIC DEFAULT 0;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS driver_payment_status TEXT DEFAULT 'pending';
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS driver_paid_at TIMESTAMPTZ;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS wa_link_sent_at TIMESTAMPTZ;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS driver_response TEXT;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS transfer_proof_url TEXT;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS physical_doc_files JSONB;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS physical_doc_notes TEXT;

-- ============================================
-- 4. extra_costs — missing columns
-- ============================================
ALTER TABLE extra_costs ADD COLUMN IF NOT EXISTS paid_by_sbu TEXT;
ALTER TABLE extra_costs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- ============================================
-- 5. job_routes — ensure it exists
-- ============================================
CREATE TABLE IF NOT EXISTS job_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id UUID REFERENCES job_orders(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL DEFAULT 0,
  stop_type TEXT,
  source_type TEXT,
  source_id UUID,
  location_name TEXT,
  address TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  contact_name TEXT,
  contact_phone TEXT,
  status TEXT DEFAULT 'pending',
  distance_km DOUBLE PRECISION,
  duration_minutes INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_routes_jo ON job_routes(job_order_id);

ALTER TABLE job_routes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS job_routes_isolation ON job_routes;
CREATE POLICY job_routes_isolation ON job_routes USING (true);

-- ============================================
-- 6. VERIFICATION
-- ============================================
SELECT '035_complete_columns OK' AS result;
