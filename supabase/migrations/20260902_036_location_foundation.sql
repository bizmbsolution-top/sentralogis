-- ============================================================================
-- Migration: 20260902_036_location_foundation.sql
-- Description: DATA-3 Canonical Location Foundation
-- Architecture: ADR-070 Party Role Architecture (Location component)
-- ============================================================================

-- 1. Extend md_locations with hierarchy and type
ALTER TABLE public.md_locations
  ADD COLUMN IF NOT EXISTS location_type TEXT,
  ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.md_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS timezone TEXT,
  ADD COLUMN IF NOT EXISTS external_code TEXT;

-- 2. Indexes for location hierarchy and type
CREATE INDEX IF NOT EXISTS idx_md_locations_type ON public.md_locations(location_type);
CREATE INDEX IF NOT EXISTS idx_md_locations_parent ON public.md_locations(parent_id);
CREATE INDEX IF NOT EXISTS idx_md_locations_tenant_type ON public.md_locations(tenant_id, location_type);
CREATE INDEX IF NOT EXISTS idx_md_locations_external_code ON public.md_locations(external_code) WHERE external_code IS NOT NULL;

-- 3. Extend shp_shipments with POL/POD location references
ALTER TABLE public.shp_shipments
  ADD COLUMN IF NOT EXISTS pol_location_id UUID REFERENCES public.md_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS pod_location_id UUID REFERENCES public.md_locations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_shp_shipments_pol ON public.shp_shipments(pol_location_id) WHERE pol_location_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_shp_shipments_pod ON public.shp_shipments(pod_location_id) WHERE pod_location_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
