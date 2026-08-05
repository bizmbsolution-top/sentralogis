-- Store latest GPS position per fleet from EasyGo (or any provider)
-- Used by fleet-performance live status dashboard
CREATE TABLE IF NOT EXISTS public.fleet_gps_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fleet_id UUID NOT NULL REFERENCES public.md_fleets(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    speed DOUBLE PRECISION DEFAULT 0,
    heading DOUBLE PRECISION DEFAULT 0,
    address TEXT,
    gps_time TIMESTAMPTZ,
    status_vehicle INTEGER DEFAULT 0, -- 0=parking, 1=idle, 2=driving
    engine_on BOOLEAN DEFAULT false,
    fuel_level DOUBLE PRECISION,
    odometer DOUBLE PRECISION,
    provider VARCHAR(50) DEFAULT 'easygo',
    raw_json JSONB,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(fleet_id)
);

CREATE INDEX IF NOT EXISTS idx_fleet_gps_status_tenant ON public.fleet_gps_status(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fleet_gps_status_fleet ON public.fleet_gps_status(fleet_id);

ALTER TABLE public.fleet_gps_status ENABLE ROW LEVEL SECURITY;

-- Service role can do everything
CREATE POLICY "Service role full access" ON public.fleet_gps_status
    FOR ALL USING (true) WITH CHECK (true);
