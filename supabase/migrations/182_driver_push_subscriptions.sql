-- [AI] Push Notification infrastructure for Driver PWA
-- Stores push subscription per driver (1 device = 1 driver)

-- Add push subscription column to md_drivers
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS push_subscription JSONB;
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;
ALTER TABLE md_drivers ADD COLUMN IF NOT EXISTS last_device_login TIMESTAMPTZ;

-- Index for fast lookup by push subscription
CREATE INDEX IF NOT EXISTS idx_md_drivers_push_subscription ON md_drivers USING gin (push_subscription) WHERE push_subscription IS NOT NULL;
