-- Add driver profile photo and performance tracking columns
-- Eksekusi ini di Supabase SQL Editor

-- 1. Add photo column to md_drivers
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- 2. Add trust/reputation columns for future use
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS trust_score INTEGER DEFAULT 50;
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS total_jobs_completed INTEGER DEFAULT 0;
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS total_km_driven NUMERIC(15, 2) DEFAULT 0;
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS incident_count INTEGER DEFAULT 0;
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS last_review_date TIMESTAMPTZ;

-- 3. Create driver_kpi_history table for tracking KPI over time
CREATE TABLE IF NOT EXISTS driver_kpi_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id UUID NOT NULL REFERENCES md_drivers(id) ON DELETE CASCADE,
  tenant_id UUID,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  jobs_completed INTEGER DEFAULT 0,
  on_time_delivery_rate DECIMAL(5,2) DEFAULT 0,
  inspection_pass_rate DECIMAL(5,2) DEFAULT 0,
  avg_score DECIMAL(5,2) DEFAULT 0,
  km_driven NUMERIC(15,2) DEFAULT 0,
  incident_count INTEGER DEFAULT 0,
  trust_score INTEGER DEFAULT 50,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Disable RLS for now
ALTER TABLE driver_kpi_history DISABLE ROW LEVEL SECURITY;