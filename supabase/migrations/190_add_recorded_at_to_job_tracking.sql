-- Add recorded_at column to store driver's phone wall-clock time
-- Falls back to created_at (server time) when not provided

ALTER TABLE public.job_tracking
ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ;

ALTER TABLE public.tracking_updates
ADD COLUMN IF NOT EXISTS recorded_at TIMESTAMPTZ;

-- Index for efficient telemetry queries by recorded time
CREATE INDEX IF NOT EXISTS idx_job_tracking_recorded_at
ON public.job_tracking(job_order_id, recorded_at);

CREATE INDEX IF NOT EXISTS idx_tracking_updates_recorded_at
ON public.tracking_updates(job_order_id, recorded_at);
