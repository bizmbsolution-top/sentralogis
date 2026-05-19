-- Recreate fleet_inspections table with all columns
-- Eksekusi ini di Supabase SQL Editor

DROP TABLE IF EXISTS fleet_inspections;

CREATE TABLE fleet_inspections (
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

-- Disable RLS for driver portal access
ALTER TABLE fleet_inspections DISABLE ROW LEVEL SECURITY;