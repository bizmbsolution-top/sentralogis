-- Migration: Fix job_routes timestamp columns to TIMESTAMPTZ
-- actual_arrival & actual_departure are currently timestamp without time zone
-- causing JS frontend to misinterpret them as local time (WIB) instead of UTC

ALTER TABLE job_routes
  ALTER COLUMN actual_arrival TYPE TIMESTAMPTZ USING actual_arrival AT TIME ZONE 'UTC',
  ALTER COLUMN actual_departure TYPE TIMESTAMPTZ USING actual_departure AT TIME ZONE 'UTC';

-- geofence_triggered_at is referenced in code but missing from DB
ALTER TABLE job_routes ADD COLUMN IF NOT EXISTS geofence_triggered_at TIMESTAMPTZ;
