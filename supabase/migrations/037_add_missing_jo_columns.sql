-- Migration 037: Add missing columns to job_orders for JO lifecycle tracking
-- These were referenced by the API but never created in the table
-- Eksekusi di Supabase SQL Editor

ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS loaded_at TIMESTAMPTZ;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS unloaded_at TIMESTAMPTZ;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS driver_response_at TIMESTAMPTZ;
ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS rejection_note TEXT;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

SELECT '037_missing_jo_columns OK' AS result;
