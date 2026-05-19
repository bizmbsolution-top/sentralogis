ALTER TABLE public.md_drivers ADD COLUMN IF NOT EXISTS pin VARCHAR(4);

CREATE TABLE IF NOT EXISTS public.fleet_inspections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fleet_id UUID REFERENCES public.md_fleets(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.md_drivers(id) ON DELETE CASCADE,
    odometer INT NOT NULL,
    odometer_photo_url TEXT,
    physical_photo_url TEXT,
    inspection_data JSONB NOT NULL DEFAULT '[]',
    score INT DEFAULT 0,
    status VARCHAR(20) CHECK (status IN ('fit', 'grounded')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    tenant_id UUID
);

CREATE TABLE IF NOT EXISTS public.driver_attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES public.md_drivers(id) ON DELETE CASCADE,
    fleet_id UUID REFERENCES public.md_fleets(id) ON DELETE SET NULL,
    attendance_type VARCHAR(20) CHECK (attendance_type IN ('start_shift', 'end_shift')),
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    clock_in_out_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.driver_performance_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES public.md_drivers(id) ON DELETE CASCADE,
    log_type VARCHAR(20) CHECK (log_type IN ('mileage', 'incident', 'point_reward', 'point_penalty')),
    value DECIMAL(12,2) DEFAULT 0,
    reference_id UUID,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.fleet_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_performance_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select for all" ON public.fleet_inspections;
CREATE POLICY "Allow select for all" ON public.fleet_inspections FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert for all" ON public.fleet_inspections;
CREATE POLICY "Allow insert for all" ON public.fleet_inspections FOR INSERT WITH CHECK (true);
