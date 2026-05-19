-- Add work tracking columns to md_drivers
-- Eksekusi ini di Supabase SQL Editor

-- Add tracking columns
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS is_working BOOLEAN DEFAULT false;
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS last_check_in TIMESTAMPTZ;
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS total_absensi INTEGER DEFAULT 0;
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS avg_inspection_score DECIMAL(5,2) DEFAULT 0;
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS total_inspections INTEGER DEFAULT 0;

-- Add index
CREATE INDEX IF NOT EXISTS idx_md_drivers_is_working ON md_drivers(is_working);
CREATE INDEX IF NOT EXISTS idx_md_drivers_tenant_working ON md_drivers(tenant_id, is_working) WHERE is_working = true;