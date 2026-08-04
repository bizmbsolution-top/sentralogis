-- Phase 3D Tracking Platform Schema
-- Extracted from Trucking Domain to decouple telemetry from Job Orders

CREATE TABLE IF NOT EXISTS public.tracking_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    reference_type VARCHAR(50) NOT NULL, -- e.g., 'JOB_ORDER', 'CONTAINER', 'SHIPMENT'
    reference_id UUID NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'COMPLETED', 'CANCELLED')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    -- Allow multiple sessions but typically one active per reference
    UNIQUE (reference_type, reference_id, status)
);

CREATE TABLE IF NOT EXISTS public.tracking_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.tracking_sessions(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    accuracy DOUBLE PRECISION,
    heading DOUBLE PRECISION,
    speed DOUBLE PRECISION,
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.geofence_zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.tracking_sessions(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    radius_meters INTEGER DEFAULT 500,
    zone_type VARCHAR(50) NOT NULL, -- e.g., 'PICKUP', 'DROPOFF', 'TRANSIT'
    location_name VARCHAR(255),
    reference_id UUID, -- Links to domain-specific entity like job_routes.id
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.geofence_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES public.tracking_sessions(id) ON DELETE CASCADE,
    zone_id UUID REFERENCES public.geofence_zones(id) ON DELETE CASCADE,
    event_type VARCHAR(20) NOT NULL CHECK (event_type IN ('ENTER', 'EXIT')),
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    recorded_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tracking_points_session_recorded ON public.tracking_points(session_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_geofence_events_session ON public.geofence_events(session_id, recorded_at);
