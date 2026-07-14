-- Migration 118: Add Meeting Check-in and Status columns to crm_activities

ALTER TABLE public.crm_activities
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'COMPLETED',
  ADD COLUMN IF NOT EXISTS check_in_location TEXT,
  ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS check_in_lat NUMERIC(10, 7),
  ADD COLUMN IF NOT EXISTS check_in_lng NUMERIC(10, 7);

-- Existing records are automatically set to 'COMPLETED' because of the DEFAULT.
-- Scheduled future meetings will have status = 'SCHEDULED'
-- When they check in, it becomes 'IN_PROGRESS'
-- When they save the MOM, it becomes 'COMPLETED'
