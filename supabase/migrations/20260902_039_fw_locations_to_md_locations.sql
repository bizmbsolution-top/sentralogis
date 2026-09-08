-- ============================================================================
-- Migration: 20260902_039_fw_locations_to_md_locations.sql
-- Description: DATA-4E Track A — Migrate fw_locations to md_locations
-- Architecture: ADR-075 fw_locations Migration
-- ============================================================================

-- Step 1: Create md_locations records from fw_locations
INSERT INTO public.md_locations (tenant_id, location_code, name, location_type, external_code, created_at, updated_at)
SELECT
  e.tenant_id,
  'FW-' || fl.location_id::TEXT,
  fl.name,
  CASE fl.type
    WHEN 'PORT' THEN 'PORT'
    WHEN 'WAREHOUSE' THEN 'WAREHOUSE'
    WHEN 'DELIVERY_POINT' THEN 'DELIVERY_POINT'
  END,
  fl.location_id::TEXT,
  fl.created_at,
  fl.updated_at
FROM public.fw_locations fl
JOIN public.md_entities e ON e.id = (
  SELECT entity_id FROM public.md_fleets WHERE tenant_id = fl.tenant_id LIMIT 1
)
WHERE NOT EXISTS (
  SELECT 1 FROM public.md_locations ml WHERE ml.external_code = fl.location_id::TEXT
);

-- Step 2: Add new FK columns to fw_order_headers
ALTER TABLE public.fw_order_headers
  ADD COLUMN IF NOT EXISTS origin_location_id UUID REFERENCES public.md_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS dest_location_id UUID REFERENCES public.md_locations(id) ON DELETE SET NULL;

-- Step 3: Populate new columns from mapping
UPDATE public.fw_order_headers oh
SET origin_location_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml ON ml.external_code = fl.location_id::TEXT
WHERE oh.origin_port_id = fl.location_id;

UPDATE public.fw_order_headers oh
SET dest_location_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml ON ml.external_code = fl.location_id::TEXT
WHERE oh.dest_port_id = fl.location_id;

-- Step 4: Add new FK columns to fw_legs
ALTER TABLE public.fw_legs
  ADD COLUMN IF NOT EXISTS start_location_md_id UUID REFERENCES public.md_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS end_location_md_id UUID REFERENCES public.md_locations(id) ON DELETE SET NULL;

-- Step 5: Populate new columns from mapping
UPDATE public.fw_legs leg
SET start_location_md_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml ON ml.external_code = fl.location_id::TEXT
WHERE leg.start_location_id = fl.location_id;

UPDATE public.fw_legs leg
SET end_location_md_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml ON ml.external_code = fl.location_id::TEXT
WHERE leg.end_location_id = fl.location_id;

-- Step 6: Create indexes on new columns
CREATE INDEX IF NOT EXISTS idx_fw_order_headers_origin_location ON public.fw_order_headers(origin_location_id);
CREATE INDEX IF NOT EXISTS idx_fw_order_headers_dest_location ON public.fw_order_headers(dest_location_id);
CREATE INDEX IF NOT EXISTS idx_fw_legs_start_location_md ON public.fw_legs(start_location_md_id);
CREATE INDEX IF NOT EXISTS idx_fw_legs_end_location_md ON public.fw_legs(end_location_md_id);

NOTIFY pgrst, 'reload schema';
