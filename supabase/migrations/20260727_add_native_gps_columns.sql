-- Add columns for Native Android Background GPS Engine
ALTER TABLE public.job_tracking
ADD COLUMN IF NOT EXISTS accuracy NUMERIC,
ADD COLUMN IF NOT EXISTS speed NUMERIC,
ADD COLUMN IF NOT EXISTS heading NUMERIC,
ADD COLUMN IF NOT EXISTS battery_level NUMERIC,
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'pwa';

-- Also add to tracking_updates if needed for real-time map syncing
ALTER TABLE public.tracking_updates
ADD COLUMN IF NOT EXISTS accuracy NUMERIC,
ADD COLUMN IF NOT EXISTS speed NUMERIC,
ADD COLUMN IF NOT EXISTS heading NUMERIC,
ADD COLUMN IF NOT EXISTS battery_level NUMERIC,
ADD COLUMN IF NOT EXISTS source VARCHAR(50) DEFAULT 'pwa';
