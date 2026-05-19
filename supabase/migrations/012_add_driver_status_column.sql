-- Add status column to md_drivers for tracking availability
-- Eksekusi ini di Supabase SQL Editor

-- Add status column (same as md_fleets)
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'available';

-- Update existing drivers with is_working=true to have status=on_duty
UPDATE md_drivers SET status = 'on_duty' WHERE is_working = true;

-- Create index for status lookup
CREATE INDEX IF NOT EXISTS idx_md_drivers_status ON md_drivers(status);

-- Show current status
SELECT status, COUNT(*) as count FROM md_drivers GROUP BY status;