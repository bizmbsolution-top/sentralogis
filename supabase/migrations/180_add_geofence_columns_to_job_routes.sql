-- Migration: Add geofence tracking columns to job_routes
-- These columns were added via Supabase dashboard but not tracked in migrations

-- Add actual_arrival timestamp to job_routes (when driver enters geofence radius)
ALTER TABLE job_routes ADD COLUMN IF NOT EXISTS actual_arrival TIMESTAMPTZ;

-- Add actual_departure timestamp to job_routes (when driver leaves geofence radius)
ALTER TABLE job_routes ADD COLUMN IF NOT EXISTS actual_departure TIMESTAMPTZ;

-- Add job_route_id to job_tracking to link tracking events to specific routes
ALTER TABLE job_tracking ADD COLUMN IF NOT EXISTS job_route_id UUID REFERENCES job_routes(id) ON DELETE SET NULL;

-- Add photo_url to job_tracking for POD photos
ALTER TABLE job_tracking ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create index for efficient geofence queries
CREATE INDEX IF NOT EXISTS idx_job_routes_status ON job_routes(job_order_id, status);
CREATE INDEX IF NOT EXISTS idx_job_tracking_route ON job_tracking(job_route_id);
