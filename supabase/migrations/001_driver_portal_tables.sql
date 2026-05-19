-- Driver Portal Database Schema
-- Eksekusi ini di Supabase SQL Editor

-- 1. Tambah kolom PIN ke md_drivers jika belum ada
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS pin TEXT;

-- 2. Driver Attendance - Pencatatan absensi shift
-- Jika tabel sudah ada, tambahkan kolom baru
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_attendance' AND column_name = 'status') THEN
    CREATE TABLE IF NOT EXISTS driver_attendance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      driver_id UUID NOT NULL REFERENCES md_drivers(id) ON DELETE CASCADE,
      fleet_id UUID REFERENCES md_fleets(id) ON DELETE SET NULL,
      check_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      check_out TIMESTAMPTZ,
      status TEXT NOT NULL DEFAULT 'CHECK_IN' CHECK (status IN ('CHECK_IN', 'CHECK_OUT')),
      attendance_type TEXT,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- 3. Fleet Inspections - Checklist kelaikan armada
CREATE TABLE IF NOT EXISTS fleet_inspections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES md_drivers(id) ON DELETE CASCADE,
  fleet_id UUID NOT NULL REFERENCES md_fleets(id) ON DELETE CASCADE,
  odometer_photo_url TEXT,
  odometer_value NUMERIC(12, 2),
  condition_photo_url TEXT,
  rem_ok BOOLEAN NOT NULL DEFAULT false,
  rem_notes TEXT,
  lampu_ok BOOLEAN NOT NULL DEFAULT false,
  lampu_notes TEXT,
  ban_ok BOOLEAN NOT NULL DEFAULT false,
  ban_notes TEXT,
  wiper_ok BOOLEAN NOT NULL DEFAULT false,
  wiper_notes TEXT,
  kemudi_ok BOOLEAN NOT NULL DEFAULT false,
  kemudi_notes TEXT,
  total_score NUMERIC(3, 0) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'GROUNDED' CHECK (status IN ('LAYAK JALAN', 'GROUNDED')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Driver Performance Logs - Logbook KM & Safety Incident
CREATE TABLE IF NOT EXISTS driver_performance_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES md_drivers(id) ON DELETE CASCADE,
  job_order_id UUID REFERENCES job_orders(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('KM_LOG', 'SAFETY_INCIDENT')),
  km_start NUMERIC(12, 2),
  km_end NUMERIC(12, 2),
  total_km NUMERIC(12, 2),
  incident_type TEXT,
  incident_description TEXT,
  incident_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable RLS (opsional - bisa diaktifkan jika perlu)
-- ALTER TABLE driver_attendance ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE fleet_inspections ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE driver_performance_logs ENABLE ROW LEVEL SECURITY;