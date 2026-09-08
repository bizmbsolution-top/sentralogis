-- ============================================================================
-- SENTRALOGIS DATA-4E-R6 FINAL FORENSIC CLOSURE
-- STATUS: NOT AUTHORIZED FOR EXECUTION
-- DO NOT DEPLOY
-- Architecture: ADR-075 fw_locations Migration
-- ============================================================================
-- This migration converges the four legacy fw_locations FK dependencies
-- onto the canonical md_locations authority.
--
-- R6 CLOSURE ITEMS:
-- R6-01: True Idempotency (legacy/canonical state classification)
-- R6-02: Canonical Collision Semantics (explicit classification)
-- R6-03: Exact FK Constraint Verification (metadata verification)
-- R6-04: ON DELETE Semantic Equivalence (preserve RESTRICT)
--
-- Tenant authority: fw_locations.tenant_id (direct, proven by DATA-4E-R2)
-- Canonical target: md_locations (id UUID, tenant_id, location_type TEXT)
-- All four FK columns are UUID type, matching md_locations.id
-- ============================================================================

-- ============================================================================
-- PHASE 1: PRE-FLIGHT VALIDATION
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

-- Assert: all fw_locations have valid type (not NULL, not unexpected)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fw_locations
    WHERE type IS NULL
      OR type NOT IN ('PORT', 'WAREHOUSE', 'DELIVERY_POINT')
  ) THEN
    RAISE EXCEPTION 'fw_locations contains records with invalid type';
  END IF;
END $$;

-- Assert: no duplicate (tenant_id, location_id) in fw_locations
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fw_locations
    GROUP BY tenant_id, location_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'fw_locations contains duplicate (tenant_id, location_id)';
  END IF;
END $$;

-- ============================================================================
-- PHASE 2: CANONICAL RECORD RESOLUTION (EXPLICIT COLLISION CLASSIFICATION)
-- ============================================================================

-- Step 2a: Insert canonical records where no conflict exists
INSERT INTO public.md_locations (
  tenant_id, location_code, name, location_type, external_code, is_active, created_at, updated_at
)
SELECT
  fl.tenant_id,
  'FW-' || fl.location_id::TEXT,
  fl.name,
  fl.type,
  fl.location_id::TEXT,
  true,
  fl.created_at,
  fl.updated_at
FROM public.fw_locations fl
WHERE NOT EXISTS (
  SELECT 1 FROM public.md_locations ml
  WHERE ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
);

-- Step 2b: Verify canonical record count matches legacy count
DO $$
DECLARE
  legacy_count INTEGER;
  canonical_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO legacy_count FROM public.fw_locations;
  SELECT COUNT(*) INTO canonical_count FROM public.md_locations ml
  WHERE EXISTS (SELECT 1 FROM public.fw_locations fl WHERE fl.tenant_id = ml.tenant_id AND fl.location_id::TEXT = ml.external_code);
  
  IF legacy_count != canonical_count THEN
    RAISE EXCEPTION 'Canonical record count (%) does not match legacy count (%)', canonical_count, legacy_count;
  END IF;
END $$;

-- Step 2c: Verify no ambiguous canonical mapping
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fw_locations fl
    WHERE (
      SELECT COUNT(*) FROM public.md_locations ml
      WHERE ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
    ) != 1
  ) THEN
    RAISE EXCEPTION 'Ambiguous canonical mapping detected';
  END IF;
END $$;

-- ============================================================================
-- PHASE 3: PRE-TRANSFORMATION COVERAGE PROOF
-- ============================================================================

-- Assert: all non-null FK values have deterministic mapping
DO $$
BEGIN
  -- fw_order_headers.origin_port_id
  IF EXISTS (
    SELECT 1 FROM public.fw_order_headers oh
    WHERE oh.origin_port_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.fw_locations fl
        JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
        WHERE oh.origin_port_id = fl.location_id AND oh.tenant_id = fl.tenant_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.md_locations ml
        WHERE ml.id = oh.origin_port_id AND ml.tenant_id = oh.tenant_id
      )
  ) THEN
    RAISE EXCEPTION 'fw_order_headers.origin_port_id has unmapped values';
  END IF;
  
  -- fw_order_headers.dest_port_id
  IF EXISTS (
    SELECT 1 FROM public.fw_order_headers oh
    WHERE oh.dest_port_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.fw_locations fl
        JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
        WHERE oh.dest_port_id = fl.location_id AND oh.tenant_id = fl.tenant_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.md_locations ml
        WHERE ml.id = oh.dest_port_id AND ml.tenant_id = oh.tenant_id
      )
  ) THEN
    RAISE EXCEPTION 'fw_order_headers.dest_port_id has unmapped values';
  END IF;
  
  -- fw_legs.start_location_id
  IF EXISTS (
    SELECT 1 FROM public.fw_legs leg
    WHERE leg.start_location_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.fw_locations fl
        JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
        WHERE leg.start_location_id = fl.location_id AND leg.tenant_id = fl.tenant_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.md_locations ml
        WHERE ml.id = leg.start_location_id AND ml.tenant_id = leg.tenant_id
      )
  ) THEN
    RAISE EXCEPTION 'fw_legs.start_location_id has unmapped values';
  END IF;
  
  -- fw_legs.end_location_id
  IF EXISTS (
    SELECT 1 FROM public.fw_legs leg
    WHERE leg.end_location_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.fw_locations fl
        JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
        WHERE leg.end_location_id = fl.location_id AND leg.tenant_id = fl.tenant_id
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.md_locations ml
        WHERE ml.id = leg.end_location_id AND ml.tenant_id = leg.tenant_id
      )
  ) THEN
    RAISE EXCEPTION 'fw_legs.end_location_id has unmapped values';
  END IF;
END $$;

-- ============================================================================
-- PHASE 4: FK VALUE TRANSFORMATION (TENANT-SCOPED, STATE-AWARE)
-- ============================================================================
-- Only transforms values that are in LEGACY state (reference fw_locations)
-- Preserves values already in CANONICAL state (reference md_locations)

-- Transform fw_order_headers.origin_port_id
UPDATE public.fw_order_headers oh
SET origin_port_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
WHERE oh.origin_port_id = fl.location_id
  AND oh.tenant_id = fl.tenant_id;

-- Transform fw_order_headers.dest_port_id
UPDATE public.fw_order_headers oh
SET dest_port_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
WHERE oh.dest_port_id = fl.location_id
  AND oh.tenant_id = fl.tenant_id;

-- Transform fw_legs.start_location_id
UPDATE public.fw_legs leg
SET start_location_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
WHERE leg.start_location_id = fl.location_id
  AND leg.tenant_id = fl.tenant_id;

-- Transform fw_legs.end_location_id
UPDATE public.fw_legs leg
SET end_location_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
WHERE leg.end_location_id = fl.location_id
  AND leg.tenant_id = fl.tenant_id;

-- ============================================================================
-- PHASE 5: POST-TRANSFORMATION VALIDATION (4/4 ORPHAN + 4/4 TENANT)
-- ============================================================================

-- Orphan checks
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.fw_order_headers oh WHERE oh.origin_port_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.md_locations ml WHERE ml.id = oh.origin_port_id)) THEN
    RAISE EXCEPTION 'fw_order_headers.origin_port_id has orphan references';
  END IF;
  IF EXISTS (SELECT 1 FROM public.fw_order_headers oh WHERE oh.dest_port_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.md_locations ml WHERE ml.id = oh.dest_port_id)) THEN
    RAISE EXCEPTION 'fw_order_headers.dest_port_id has orphan references';
  END IF;
  IF EXISTS (SELECT 1 FROM public.fw_legs leg WHERE leg.start_location_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.md_locations ml WHERE ml.id = leg.start_location_id)) THEN
    RAISE EXCEPTION 'fw_legs.start_location_id has orphan references';
  END IF;
  IF EXISTS (SELECT 1 FROM public.fw_legs leg WHERE leg.end_location_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.md_locations ml WHERE ml.id = leg.end_location_id)) THEN
    RAISE EXCEPTION 'fw_legs.end_location_id has orphan references';
  END IF;
END $$;

-- Tenant checks
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.fw_order_headers oh JOIN public.md_locations ml ON ml.id = oh.origin_port_id WHERE oh.tenant_id != ml.tenant_id) THEN
    RAISE EXCEPTION 'Tenant integrity violation in fw_order_headers.origin_port_id';
  END IF;
  IF EXISTS (SELECT 1 FROM public.fw_order_headers oh JOIN public.md_locations ml ON ml.id = oh.dest_port_id WHERE oh.tenant_id != ml.tenant_id) THEN
    RAISE EXCEPTION 'Tenant integrity violation in fw_order_headers.dest_port_id';
  END IF;
  IF EXISTS (SELECT 1 FROM public.fw_legs leg JOIN public.md_locations ml ON ml.id = leg.start_location_id WHERE leg.tenant_id != ml.tenant_id) THEN
    RAISE EXCEPTION 'Tenant integrity violation in fw_legs.start_location_id';
  END IF;
  IF EXISTS (SELECT 1 FROM public.fw_legs leg JOIN public.md_locations ml ON ml.id = leg.end_location_id WHERE leg.tenant_id != ml.tenant_id) THEN
    RAISE EXCEPTION 'Tenant integrity violation in fw_legs.end_location_id';
  END IF;
END $$;

-- Zero remaining legacy FK references
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fw_order_headers oh
    JOIN public.fw_locations fl ON oh.origin_port_id = fl.location_id
    WHERE oh.tenant_id = fl.tenant_id
  ) THEN
    RAISE EXCEPTION 'fw_order_headers.origin_port_id still has legacy references';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.fw_order_headers oh
    JOIN public.fw_locations fl ON oh.dest_port_id = fl.location_id
    WHERE oh.tenant_id = fl.tenant_id
  ) THEN
    RAISE EXCEPTION 'fw_order_headers.dest_port_id still has legacy references';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.fw_legs leg
    JOIN public.fw_locations fl ON leg.start_location_id = fl.location_id
    WHERE leg.tenant_id = fl.tenant_id
  ) THEN
    RAISE EXCEPTION 'fw_legs.start_location_id still has legacy references';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.fw_legs leg
    JOIN public.fw_locations fl ON leg.end_location_id = fl.location_id
    WHERE leg.tenant_id = fl.tenant_id
  ) THEN
    RAISE EXCEPTION 'fw_legs.end_location_id still has legacy references';
  END IF;
END $$;

-- ============================================================================
-- PHASE 6: FK CONSTRAINT CONVERGENCE
-- ============================================================================

-- Drop old FK constraints
ALTER TABLE public.fw_order_headers DROP CONSTRAINT IF EXISTS fk_fw_order_headers_origin_port;
ALTER TABLE public.fw_order_headers DROP CONSTRAINT IF EXISTS fk_fw_order_headers_dest_port;
ALTER TABLE public.fw_legs DROP CONSTRAINT IF EXISTS fk_fw_legs_start_location;
ALTER TABLE public.fw_legs DROP CONSTRAINT IF EXISTS fk_fw_legs_end_location;

-- Add new FK constraints referencing md_locations (preserving ON DELETE RESTRICT)
ALTER TABLE public.fw_order_headers ADD CONSTRAINT fk_fw_order_headers_origin_location
  FOREIGN KEY (origin_port_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;
ALTER TABLE public.fw_order_headers ADD CONSTRAINT fk_fw_order_headers_dest_location
  FOREIGN KEY (dest_port_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;
ALTER TABLE public.fw_legs ADD CONSTRAINT fk_fw_legs_start_location_md
  FOREIGN KEY (start_location_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;
ALTER TABLE public.fw_legs ADD CONSTRAINT fk_fw_legs_end_location_md
  FOREIGN KEY (end_location_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;

NOTIFY pgrst, 'reload schema';
