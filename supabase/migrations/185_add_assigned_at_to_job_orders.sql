-- [AI] Migration: Add auto-start and auto-complete tracking columns to job_orders
-- assigned_at: Tracks when JO was assigned (for 30-min auto-start timer)
-- departure_detected_at: Tracks when driver left final stop (for 30-min auto-complete grace)

-- Add assigned_at timestamp to job_orders
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ;

-- Add departure_detected_at timestamp for auto-complete grace period
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS departure_detected_at TIMESTAMPTZ;

-- Backfill: set assigned_at = created_at for existing ASSIGNED JOs
UPDATE job_orders 
SET assigned_at = COALESCE(updated_at, created_at) 
WHERE status = 'ASSIGNED' AND assigned_at IS NULL;

-- Index for auto-start cron query (ASSIGNED JOs older than 30 min)
CREATE INDEX IF NOT EXISTS idx_job_orders_autostart 
ON job_orders(status, assigned_at) 
WHERE status = 'ASSIGNED' AND assigned_at IS NOT NULL;

-- Index for auto-complete cron query (MENUNGGU SELESAI with departure > 30 min)
CREATE INDEX IF NOT EXISTS idx_job_orders_autocomplete 
ON job_orders(status, departure_detected_at) 
WHERE status = 'MENUNGGU SELESAI' AND departure_detected_at IS NOT NULL;
