-- Migration 072: Inbound Damage Control & Unloading Sessions v2
-- 1. wh_unloading_sessions — timer-based unloading tracking with pause/resume for KPI
-- 2. wh_inbound_damage_records — per-item damage with 2 statements (Why + What) + photos + decisions
-- 3. Overage columns on wh_inbound_receipt_items
-- 4. Add CHECKING_DONE status, total_unloading_minutes

-- ============================================
-- 1. UNLOADING SESSIONS (Timer-based, with pause/resume)
-- ============================================
CREATE TABLE IF NOT EXISTS wh_unloading_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id      UUID NOT NULL REFERENCES wh_inbound_receipts(id) ON DELETE CASCADE,
  session_number  INT NOT NULL,
  start_time      TIMESTAMPTZ NOT NULL,
  end_time        TIMESTAMPTZ,
  pause_reason    TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_unloading_sessions_receipt_session
  ON wh_unloading_sessions(receipt_id, session_number);

CREATE INDEX IF NOT EXISTS idx_unloading_sessions_receipt
  ON wh_unloading_sessions(receipt_id);

-- ============================================
-- 2. INBOUND DAMAGE RECORDS (2-statement model)
-- ============================================
CREATE TABLE IF NOT EXISTS wh_inbound_damage_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id          UUID NOT NULL REFERENCES wh_inbound_receipts(id) ON DELETE CASCADE,
  receipt_item_id     UUID NOT NULL REFERENCES wh_inbound_receipt_items(id) ON DELETE CASCADE,
  qty                 NUMERIC(15,2) NOT NULL,

  -- Statement 1: WHY DAMAGE?
  damage_source       TEXT NOT NULL CHECK (damage_source IN ('TRANSPORTER', 'WAREHOUSE_STAFF')),
  source_notes        TEXT,
  source_photo_url    TEXT,

  -- Statement 2: WHAT IS DAMAGE?
  damage_condition    TEXT NOT NULL CHECK (damage_condition IN ('PACKAGE_DAMAGED_INTACT', 'PACKAGE_DAMAGED_MISSING')),
  condition_notes     TEXT,
  condition_photo_url TEXT,

  -- Decision (Admin review)
  decision            TEXT NOT NULL DEFAULT 'PENDING' CHECK (decision IN ('PENDING', 'ACCEPT_QUARANTINE', 'REJECT_RETURN')),
  decision_by         UUID REFERENCES profiles(id),
  decision_at         TIMESTAMPTZ,
  decision_notes      TEXT,
  quarantine_location_id UUID REFERENCES md_warehouse_locations(id),

  -- Metadata
  reported_by         UUID NOT NULL REFERENCES md_warehouse_staff(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wh_damage_records_receipt
  ON wh_inbound_damage_records(receipt_id);

CREATE INDEX IF NOT EXISTS idx_wh_damage_records_item
  ON wh_inbound_damage_records(receipt_item_id);

-- ============================================
-- 3. OVERAGE COLUMNS on wh_inbound_receipt_items
-- ============================================
ALTER TABLE wh_inbound_receipt_items
  ADD COLUMN IF NOT EXISTS over_decision  TEXT DEFAULT 'PENDING'
    CHECK (over_decision IN ('PENDING', 'ACCEPT_GOOD', 'REJECT'));

ALTER TABLE wh_inbound_receipt_items
  ADD COLUMN IF NOT EXISTS over_notes TEXT;

-- ============================================
-- 4. ADD total_unloading_minutes TO wh_inbound_receipts
-- ============================================
ALTER TABLE wh_inbound_receipts
  ADD COLUMN IF NOT EXISTS total_unloading_minutes NUMERIC(10,2);

-- ============================================
-- 5. UPDATE STATUS CONSTRAINT (add CHECKING_DONE)
-- ============================================
ALTER TABLE wh_inbound_receipts
  DROP CONSTRAINT IF EXISTS wh_inbound_receipts_status_check;

ALTER TABLE wh_inbound_receipts
  ADD CONSTRAINT wh_inbound_receipts_status_check
  CHECK (status IN (
    'EXPECTED', 'TRUCK_ARRIVED', 'UNLOADING', 'CHECKING',
    'CHECKING_DONE',
    'PUTAWAY_IN_PROGRESS',
    'COMPLETED'
  ));

-- ============================================
-- 6. RLS POLICIES (following existing patterns)
-- ============================================
ALTER TABLE wh_unloading_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE wh_inbound_damage_records ENABLE ROW LEVEL SECURITY;

-- Allow public access for PWA portal (same pattern as 071)
CREATE POLICY "Enable public ALL on unloading_sessions"
  ON wh_unloading_sessions FOR ALL USING (true);

CREATE POLICY "Enable public ALL on damage_records"
  ON wh_inbound_damage_records FOR ALL USING (true);

-- ============================================
-- 7. STORAGE BUCKET for damage photos (reuse inbound-docs)
--    Photos stored under inbound-docs/damage/ folder
--    (bucket already created in 070)
-- ============================================

SELECT '072_inbound_damage_control_v2 executed successfully' as result;
