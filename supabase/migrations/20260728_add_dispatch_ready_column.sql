-- Add dispatch_ready columns to job_orders (missed from migration 187)
ALTER TABLE public.job_orders
ADD COLUMN IF NOT EXISTS dispatch_ready_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dispatch_ready BOOLEAN DEFAULT false;

-- Index for ground staff queue lookup
CREATE INDEX IF NOT EXISTS idx_job_orders_dispatch_ready ON public.job_orders(dispatch_ready)
WHERE dispatch_ready = true;