-- Ground Staff Module
-- Tracks operational events at depot, factory, warehouse, terminal, port
-- Ground Staff = Operational Validator, NOT Driver

-- 1. Operational Sites (depots, factories, ports, terminals)
CREATE TABLE IF NOT EXISTS public.ground_sites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50),
  site_type VARCHAR(50) NOT NULL DEFAULT 'depot',
  address TEXT,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  geofence_radius_m INTEGER NOT NULL DEFAULT 150,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ground_sites_tenant ON public.ground_sites(tenant_id);
CREATE INDEX IF NOT EXISTS idx_ground_sites_location ON public.ground_sites(latitude, longitude);

-- 2. Ground Events (source of truth for operational timeline)
CREATE TABLE IF NOT EXISTS public.ground_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_order_id UUID NOT NULL REFERENCES public.job_orders(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  captured_by UUID REFERENCES auth.users(id),
  captured_by_name VARCHAR(255),
  site_id UUID REFERENCES public.ground_sites(id),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  photo_url TEXT,
  ocr_json JSONB DEFAULT '{}',
  ocr_confidence NUMERIC(5,2),
  match_method VARCHAR(50),
  matched_entity_id VARCHAR(255),
  notes TEXT,
  source VARCHAR(50) DEFAULT 'ground_staff',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ground_events_jo ON public.ground_events(job_order_id);
CREATE INDEX IF NOT EXISTS idx_ground_events_type ON public.ground_events(event_type);
CREATE INDEX IF NOT EXISTS idx_ground_events_site ON public.ground_events(site_id);
CREATE INDEX IF NOT EXISTS idx_ground_events_created ON public.ground_events(created_at);

-- 3. Ground Documents (attached to events)
CREATE TABLE IF NOT EXISTS public.ground_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ground_event_id UUID NOT NULL REFERENCES public.ground_events(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL,
  photo_url TEXT NOT NULL,
  ocr_result JSONB DEFAULT '{}',
  thumbnail_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ground_documents_event ON public.ground_documents(ground_event_id);

-- 4. Ground Staff Profiles
CREATE TABLE IF NOT EXISTS public.ground_staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ground_staff_tenant ON public.ground_staff_profiles(tenant_id);

-- 5. Driver Dispatched tracking (links dispatch to ground queue)
ALTER TABLE public.job_orders
ADD COLUMN IF NOT EXISTS dispatch_ready_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS dispatch_ready BOOLEAN DEFAULT false;

-- 6. Event type enum validation
CREATE TABLE IF NOT EXISTS public.ground_event_types (
  event_type VARCHAR(50) PRIMARY KEY,
  label VARCHAR(255) NOT NULL,
  requires_photo BOOLEAN DEFAULT false,
  requires_container BOOLEAN DEFAULT false,
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

INSERT INTO public.ground_event_types (event_type, label, requires_photo, requires_container, sort_order) VALUES
  ('GATE_IN_DEPOT', 'Gate In Depot', true, false, 1),
  ('GATE_OUT_DEPOT', 'Gate Out Depot', false, true, 2),
  ('GATE_IN_FACTORY', 'Gate In Factory', true, true, 3),
  ('GATE_OUT_FACTORY', 'Gate Out Factory', false, false, 4),
  ('GATE_IN_PORT', 'Gate In Port', true, true, 5),
  ('GATE_OUT_PORT', 'Gate Out Port', false, false, 6),
  ('LOADING_START', 'Loading Start', true, false, 7),
  ('LOADING_FINISH', 'Loading Finish', false, true, 8),
  ('DOCUMENT_HANDOVER', 'Document Handover', true, false, 9),
  ('CONTAINER_INSPECTION', 'Container Inspection', true, true, 10),
  ('DAMAGE_REPORT', 'Damage Report', true, true, 11),
  ('SEAL_INSPECTION', 'Seal Inspection', true, true, 12),
  ('POD', 'Proof of Delivery', true, false, 13)
ON CONFLICT (event_type) DO NOTHING;

-- RLS: ground_events
ALTER TABLE public.ground_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ground_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ground_staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ground_sites ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY ground_sites_tenant_isolation ON public.ground_sites
  USING (tenant_id = get_my_tenant_id());

CREATE POLICY ground_events_tenant_isolation ON public.ground_events
  USING (job_order_id IN (SELECT id FROM public.job_orders WHERE tenant_id = get_my_tenant_id()));

CREATE POLICY ground_documents_tenant_isolation ON public.ground_documents
  USING (ground_event_id IN (SELECT id FROM public.ground_events WHERE job_order_id IN (SELECT id FROM public.job_orders WHERE tenant_id = get_my_tenant_id())));

CREATE POLICY ground_staff_profiles_tenant_isolation ON public.ground_staff_profiles
  USING (tenant_id = get_my_tenant_id());
