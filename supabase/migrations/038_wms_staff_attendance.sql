-- Migration 038: WMS Staff Attendance
-- Eksekusi di Supabase SQL Editor

-- ============================================
-- 1. WAREHOUSE STAFF ATTENDANCE TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS warehouse_staff_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  warehouse_id UUID NOT NULL REFERENCES md_warehouses(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out_time TIMESTAMPTZ,
  status TEXT DEFAULT 'CHECK_IN' CHECK (status IN ('CHECK_IN', 'CHECK_OUT')),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wsa_tenant ON warehouse_staff_attendance(tenant_id);
CREATE INDEX IF NOT EXISTS idx_wsa_warehouse ON warehouse_staff_attendance(warehouse_id);
CREATE INDEX IF NOT EXISTS idx_wsa_user ON warehouse_staff_attendance(user_id);
CREATE INDEX IF NOT EXISTS idx_wsa_date ON warehouse_staff_attendance(check_in_time DESC);

-- ============================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE warehouse_staff_attendance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Semua staf bisa membaca datanya sendiri atau admin bisa melihat semua data tenant
CREATE POLICY wsa_select_policy ON warehouse_staff_attendance
  FOR SELECT USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (
      user_id = auth.uid() 
      OR (SELECT role FROM profiles WHERE id = auth.uid()) IN ('superadmin', 'director', 'admin_sbu')
    )
  );

-- Staff hanya bisa insert/update datanya sendiri
CREATE POLICY wsa_insert_policy ON warehouse_staff_attendance
  FOR INSERT WITH CHECK (
    user_id = auth.uid() 
    AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY wsa_update_policy ON warehouse_staff_attendance
  FOR UPDATE USING (
    user_id = auth.uid()
    AND tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );
