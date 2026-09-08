-- ============================================================================
-- DATA-4E-R4 FORENSIC REPAIRED MIGRATION
-- STATUS: NOT AUTHORIZED FOR EXECUTION
-- DO NOT DEPLOY
-- Architecture: ADR-075 fw_locations Migration
-- ============================================================================
-- This migration converges the four legacy fw_locations FK dependencies
-- onto the canonical md_locations authority.
--
-- KEY DIFFERENCE FROM MIGRATION 040:
-- Migration 040 only created md_locations and changed FK constraints,
-- but did NOT transform the actual FK column values.
-- This migration (041) explicitly transforms the UUID values from
-- fw_locations.location_id to md_locations.id before changing constraints.
--
-- Tenant authority: fw_locations.tenant_id (direct, proven by DATA-4E-R2)
-- Canonical target: md_locations (id UUID, tenant_id, location_type TEXT)
-- All four FK columns are UUID type, matching md_locations.id
-- ============================================================================

-- ============================================================================
-- STEP 1: Pre-flight assertions
-- ============================================================================

-- Assert: all fw_locations have valid tenant_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fw_locations
    WHERE tenant_id IS NULL
      OR tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
  ) THEN
    RAISE EXCEPTION 'fw_locations contains records with invalid tenant_id';
  END IF;
END $$;

-- Assert: all fw_locations have valid type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fw_locations
    WHERE type NOT IN ('PORT', 'WAREHOUSE', 'DELIVERY_POINT')
  ) THEN
    RAISE EXCEPTION 'fw_locations contains unexpected type values';
  END IF;
END $$;

-- ============================================================================
-- STEP 2: Create canonical md_locations from fw_locations
-- ============================================================================
-- Idempotent: uses INSERT ... ON CONFLICT DO NOTHING
-- Tenant-safe: uses fw_locations.tenant_id directly
-- Deterministic: external_code = location_id::TEXT (unique per tenant)

INSERT INTO public.md_locations (
  tenant_id,
  location_code,
  name,
  location_type,
  external_code,
  is_active,
  created_at,
  updated_at
)
SELECT
  fl.tenant_id,
  'FW-' || fl.location_id::TEXT,
  fl.name,
  CASE fl.type
    WHEN 'PORT' THEN 'PORT'
    WHEN 'WAREHOUSE' THEN 'WAREHOUSE'
    WHEN 'DELIVERY_POINT' THEN 'DELIVERY_POINT'
  END,
  fl.location_id::TEXT,
  true,
  fl.created_at,
  fl.updated_at
FROM public.fw_locations fl
WHERE fl.tenant_id IS NOT NULL
  AND fl.tenant_id != '00000000-0000-0000-0000-000000000000'::uuid
ON CONFLICT (tenant_id, external_code) DO NOTHING;

-- ============================================================================
-- STEP 3: Verify all fw_locations have corresponding md_locations
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fw_locations fl
    WHERE NOT EXISTS (
      SELECT 1 FROM public.md_locations ml
      WHERE ml.tenant_id = fl.tenant_id
        AND ml.external_code = fl.location_id::TEXT
    )
  ) THEN
    RAISE EXCEPTION 'Some fw_locations do not have corresponding md_locations';
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Transform FK values — fw_order_headers.origin_port_id
-- ============================================================================
-- Old value: fw_locations.location_id
-- New value: md_locations.id (where md_locations.external_code = fw_locations.location_id::TEXT)

UPDATE public.fw_order_headers oh
SET origin_port_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml
  ON ml.tenant_id = fl.tenant_id
  AND ml.external_code = fl.location_id::TEXT
WHERE oh.origin_port_id = fl.location_id;

-- ============================================================================
-- STEP 5: Transform FK values — fw_order_headers.dest_port_id
-- ============================================================================

UPDATE public.fw_order_headers oh
SET dest_port_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml
  ON ml.tenant_id = fl.tenant_id
  AND ml.external_code = fl.location_id::TEXT
WHERE oh.dest_port_id = fl.location_id;

-- ============================================================================
-- STEP 6: Transform FK values — fw_legs.start_location_id
-- ============================================================================

UPDATE public.fw_legs leg
SET start_location_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml
  ON ml.tenant_id = fl.tenant_id
  AND ml.external_code = fl.location_id::TEXT
WHERE leg.start_location_id = fl.location_id;

-- ============================================================================
-- STEP 7: Transform FK values — fw_legs.end_location_id
-- ============================================================================

UPDATE public.fw_legs leg
SET end_location_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml
  ON ml.tenant_id = fl.tenant_id
  AND ml.external_code = fl.location_id::TEXT
WHERE leg.end_location_id = fl.location_id;

-- ============================================================================
-- STEP 8: Post-value-migration assertions
-- ============================================================================

-- Assert: all fw_order_headers.origin_port_id reference valid md_locations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fw_order_headers oh
    WHERE oh.origin_port_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.md_locations ml WHERE ml.id = oh.origin_port_id
      )
  ) THEN
    RAISE EXCEPTION 'fw_order_headers.origin_port_id has orphan references';
  END IF;
END $$;

-- Assert: all fw_order_headers.dest_port_id reference valid md_locations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fw_order_headers oh
    WHERE oh.dest_port_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.md_locations ml WHERE ml.id = oh.dest_port_id
      )
  ) THEN
    RAISE EXCEPTION 'fw_order_headers.dest_port_id has orphan references';
  END IF;
END $$;

-- Assert: all fw_legs.start_location_id reference valid md_locations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fw_legs leg
    WHERE leg.start_location_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.md_locations ml WHERE ml.id = leg.start_location_id
      )
  ) THEN
    RAISE EXCEPTION 'fw_legs.start_location_id has orphan references';
  END IF;
END $$;

-- Assert: all fw_legs.end_location_id reference valid md_locations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fw_legs leg
    WHERE leg.end_location_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.md_locations ml WHERE ml.id = leg.end_location_id
      )
  ) THEN
    RAISE EXCEPTION 'fw_legs.end_location_id has orphan references';
  END IF;
END $$;

-- Assert: tenant integrity preserved
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fw_order_headers oh
    JOIN public.md_locations ml ON ml.id = oh.origin_port_id
    WHERE oh.tenant_id != ml.tenant_id
  ) THEN
    RAISE EXCEPTION 'Tenant integrity violation in fw_order_headers.origin_port_id';
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fw_legs leg
    JOIN public.md_locations ml ON ml.id = leg.start_location_id
    WHERE leg.tenant_id != ml.tenant_id
  ) THEN
    RAISE EXCEPTION 'Tenant integrity violation in fw_legs.start_location_id';
  END IF;
END $$;

-- ============================================================================
-- STEP 9: Replace old FK constraints with new constraints
-- ============================================================================

-- Drop old FK constraints
ALTER TABLE public.fw_order_headers
  DROP CONSTRAINT IF EXISTS fk_fw_order_headers_origin_port;

ALTER TABLE public.fw_order_headers
  DROP CONSTRAINT IF EXISTS fk_fw_order_headers_dest_port;

ALTER TABLE public.fw_legs
  DROP CONSTRAINT IF EXISTS fk_fw_legs_start_location;

ALTER TABLE public.fw_legs
  DROP CONSTRAINT IF EXISTS fk_fw_legs_end_location;

-- Add new FK constraints referencing md_locations
ALTER TABLE public.fw_order_headers
  ADD CONSTRAINT fk_fw_order_headers_origin_location
  FOREIGN KEY (origin_port_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;

ALTER TABLE public.fw_order_headers
  ADD CONSTRAINT fk_fw_order_headers_dest_location
  FOREIGN KEY (dest_port_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;

ALTER TABLE public.fw_legs
  ADD CONSTRAINT fk_fw_legs_start_location_md
  FOREIGN KEY (start_location_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;

ALTER TABLE public.fw_legs
  ADD CONSTRAINT fk_fw_legs_end_location_md
  FOREIGN KEY (end_location_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;

NOTIFY pgrst, 'reload schema';
