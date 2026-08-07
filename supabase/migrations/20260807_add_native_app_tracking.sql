-- Add native app tracking columns to md_drivers
ALTER TABLE md_drivers
ADD COLUMN IF NOT EXISTS has_native_app BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_app_version VARCHAR(20),
ADD COLUMN IF NOT EXISTS last_app_open_at TIMESTAMPTZ;

-- Index for quick lookup
CREATE INDEX IF NOT EXISTS idx_md_drivers_has_native_app ON md_drivers(has_native_app);
