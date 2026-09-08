-- ============================================================================
-- DATA-4E-R3 FORENSIC REPAIRED MIGRATION
-- STATUS: NOT AUTHORIZED FOR EXECUTION
-- DO NOT DEPLOY
-- Architecture: ADR-075 fw_locations Migration
-- ============================================================================
-- This migration converges the four legacy fw_locations FK dependencies
-- onto the canonical md_locations authority.
--
-- Tenant authority: fw_locations.tenant_id (direct, proven by DATA-4E-R2)
-- Canonical target: md_locations (id UUID, tenant_id, location_type TEXT)
--
-- Four FKs to converge:
--   1. fw_order_headers.origin_port_id → fw_locations.location_id
--   2. fw_order_headers.dest_port_id → fw_locations.location_id
--   3. fw_legs.start_location_id → fw_locations.location_id
--   4. fw_legs.end_location_id → fw_locations.location_id
-- ============================================================================

-- ============================================================================
-- STEP 1: Create canonical md_locations from fw_locations
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
    ELSE NULL  -- Will fail-safe if unexpected type exists
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
-- STEP 2: Pre-flight assertions
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

-- Assert: all fw_locations have corresponding md_locations
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
-- STEP 3: Converge FK — fw_order_headers.origin_port_id
-- ============================================================================

-- Drop old FK constraint
ALTER TABLE public.fw_order_headers
  DROP CONSTRAINT IF EXISTS fk_fw_order_headers_origin_port;

-- Add new FK constraint to md_locations
ALTER TABLE public.fw_order_headers
  ADD CONSTRAINT fk_fw_order_headers_origin_location
  FOREIGN KEY (origin_port_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;

-- ============================================================================
-- STEP 4: Converge FK — fw_order_headers.dest_port_id
-- ============================================================================

-- Drop old FK constraint
ALTER TABLE public.fw_order_headers
  DROP CONSTRAINT IF EXISTS fk_fw_order_headers_dest_port;

-- Add new FK constraint to md_locations
ALTER TABLE public.fw_order_headers
  ADD CONSTRAINT fk_fw_order_headers_dest_location
  FOREIGN KEY (dest_port_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;

-- ============================================================================
-- STEP 5: Converge FK — fw_legs.start_location_id
-- ============================================================================

-- Drop old FK constraint
ALTER TABLE public.fw_legs
  DROP CONSTRAINT IF EXISTS fk_fw_legs_start_location;

-- Add new FK constraint to md_locations
ALTER TABLE public.fw_legs
  ADD CONSTRAINT fk_fw_legs_start_location_md
  FOREIGN KEY (start_location_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;

-- ============================================================================
-- STEP 6: Converge FK — fw_legs.end_location_id
-- ============================================================================

-- Drop old FK constraint
ALTER TABLE public.fw_legs
  DROP CONSTRAINT IF EXISTS fk_fw_legs_end_location;

-- Add new FK constraint to md_locations
ALTER TABLE public.fw_legs
  ADD CONSTRAINT fk_fw_legs_end_location_md
  FOREIGN KEY (end_location_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;

-- ============================================================================
-- STEP 7: Verification
-- ============================================================================

-- Verify: all fw_order_headers.origin_port_id reference valid md_locations
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

-- Verify: all fw_order_headers.dest_port_id reference valid md_locations
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

-- Verify: all fw_legs.start_location_id reference valid md_locations
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

-- Verify: all fw_legs.end_location_id reference valid md_locations
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

NOTIFY pgrst, 'reload schema';
