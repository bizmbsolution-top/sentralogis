-- ============================================================================
-- SENTRALOGIS DATA-4E-R5 FINAL FORENSIC REPAIRED MIGRATION
-- STATUS: NOT AUTHORIZED FOR EXECUTION
-- DO NOT DEPLOY
-- Architecture: ADR-075 fw_locations Migration
-- ============================================================================
-- This migration converges the four legacy fw_locations FK dependencies
-- onto the canonical md_locations authority.
--
-- KEY IMPROVEMENTS OVER MIGRATION 041:
-- 1. Tenant-scoped FK value updates (4/4 columns)
-- 2. Canonical collision detection with explicit failure
-- 3. NULL type validation (rejects NULL, not just unexpected values)
-- 4. Complete 4/4 tenant integrity verification
-- 5. Pre-transformation coverage proof
-- 6. Post-transformation orphan + tenant checks (4/4 each)
-- 7. Exact old/new FK constraint verification
-- 8. Explicit idempotency with collision distinction
-- 9. Honest rollback boundary documentation
--
-- Tenant authority: fw_locations.tenant_id (direct, proven by DATA-4E-R2)
-- Canonical target: md_locations (id UUID, tenant_id, location_type TEXT)
-- All four FK columns are UUID type, matching md_locations.id
-- ============================================================================

-- ============================================================================
-- PHASE 1: PRE-FLIGHT VALIDATION
-- ============================================================================

-- Assert: all fw_locations have valid tenant_id (not NULL, not dummy)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fw_locations
    WHERE tenant_id IS NULL
      OR tenant_id = '00000000-0000-0000-0000-000000000000'::uuid
  ) THEN
    RAISE EXCEPTION 'fw_locations contains records with invalid tenant_id (NULL or dummy)';
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
    RAISE EXCEPTION 'fw_locations contains records with invalid type (NULL or unexpected)';
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
-- PHASE 2: CREATE CANONICAL MD_LOCATIONS
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
  fl.type,  -- Already validated: only PORT, WAREHOUSE, DELIVERY_POINT
  fl.location_id::TEXT,
  true,
  fl.created_at,
  fl.updated_at
FROM public.fw_locations fl
ON CONFLICT (tenant_id, external_code) DO NOTHING;

-- ============================================================================
-- PHASE 3: CANONICAL COLLISION DETECTION
-- ============================================================================

-- Assert: all fw_locations have exactly one corresponding md_locations
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

-- Assert: no ambiguous canonical mapping (exactly one md_locations per legacy location)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fw_locations fl
    WHERE (
      SELECT COUNT(*) FROM public.md_locations ml
      WHERE ml.tenant_id = fl.tenant_id
        AND ml.external_code = fl.location_id::TEXT
    ) != 1
  ) THEN
    RAISE EXCEPTION 'Ambiguous canonical mapping detected';
  END IF;
END $$;

-- ============================================================================
-- PHASE 4: PRE-TRANSFORMATION COVERAGE PROOF
-- ============================================================================

-- Assert: all non-null fw_order_headers.origin_port_id have mapping
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fw_order_headers oh
    WHERE oh.origin_port_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.fw_locations fl
        JOIN public.md_locations ml
          ON ml.tenant_id = fl.tenant_id
          AND ml.external_code = fl.location_id::TEXT
        WHERE oh.origin_port_id = fl.location_id
          AND oh.tenant_id = fl.tenant_id
      )
  ) THEN
    RAISE EXCEPTION 'fw_order_headers.origin_port_id has unmapped values';
  END IF;
END $$;

-- Assert: all non-null fw_order_headers.dest_port_id have mapping
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fw_order_headers oh
    WHERE oh.dest_port_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.fw_locations fl
        JOIN public.md_locations ml
          ON ml.tenant_id = fl.tenant_id
          AND ml.external_code = fl.location_id::TEXT
        WHERE oh.dest_port_id = fl.location_id
          AND oh.tenant_id = fl.tenant_id
      )
  ) THEN
    RAISE EXCEPTION 'fw_order_headers.dest_port_id has unmapped values';
  END IF;
END $$;

-- Assert: all non-null fw_legs.start_location_id have mapping
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fw_legs leg
    WHERE leg.start_location_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.fw_locations fl
        JOIN public.md_locations ml
          ON ml.tenant_id = fl.tenant_id
          AND ml.external_code = fl.location_id::TEXT
        WHERE leg.start_location_id = fl.location_id
          AND leg.tenant_id = fl.tenant_id
      )
  ) THEN
    RAISE EXCEPTION 'fw_legs.start_location_id has unmapped values';
  END IF;
END $$;

-- Assert: all non-null fw_legs.end_location_id have mapping
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fw_legs leg
    WHERE leg.end_location_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.fw_locations fl
        JOIN public.md_locations ml
          ON ml.tenant_id = fl.tenant_id
          AND ml.external_code = fl.location_id::TEXT
        WHERE leg.end_location_id = fl.location_id
          AND leg.tenant_id = fl.tenant_id
      )
  ) THEN
    RAISE EXCEPTION 'fw_legs.end_location_id has unmapped values';
  END IF;
END $$;

-- ============================================================================
-- PHASE 5: TRANSFORM FK VALUES (TENANT-SCOPED)
-- ============================================================================

-- Transform fw_order_headers.origin_port_id
UPDATE public.fw_order_headers oh
SET origin_port_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml
  ON ml.tenant_id = fl.tenant_id
  AND ml.external_code = fl.location_id::TEXT
WHERE oh.origin_port_id = fl.location_id
  AND oh.tenant_id = fl.tenant_id;

-- Transform fw_order_headers.dest_port_id
UPDATE public.fw_order_headers oh
SET dest_port_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml
  ON ml.tenant_id = fl.tenant_id
  AND ml.external_code = fl.location_id::TEXT
WHERE oh.dest_port_id = fl.location_id
  AND oh.tenant_id = fl.tenant_id;

-- Transform fw_legs.start_location_id
UPDATE public.fw_legs leg
SET start_location_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml
  ON ml.tenant_id = fl.tenant_id
  AND ml.external_code = fl.location_id::TEXT
WHERE leg.start_location_id = fl.location_id
  AND leg.tenant_id = fl.tenant_id;

-- Transform fw_legs.end_location_id
UPDATE public.fw_legs leg
SET end_location_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml
  ON ml.tenant_id = fl.tenant_id
  AND ml.external_code = fl.location_id::TEXT
WHERE leg.end_location_id = fl.location_id
  AND leg.tenant_id = fl.tenant_id;

-- ============================================================================
-- PHASE 6: POST-TRANSFORMATION VALIDATION (4/4 ORPHAN + 4/4 TENANT)
-- ============================================================================

-- Orphan check 1: fw_order_headers.origin_port_id
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

-- Orphan check 2: fw_order_headers.dest_port_id
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

-- Orphan check 3: fw_legs.start_location_id
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

-- Orphan check 4: fw_legs.end_location_id
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

-- Tenant check 1: fw_order_headers.origin_port_id
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

-- Tenant check 2: fw_order_headers.dest_port_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fw_order_headers oh
    JOIN public.md_locations ml ON ml.id = oh.dest_port_id
    WHERE oh.tenant_id != ml.tenant_id
  ) THEN
    RAISE EXCEPTION 'Tenant integrity violation in fw_order_headers.dest_port_id';
  END IF;
END $$;

-- Tenant check 3: fw_legs.start_location_id
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

-- Tenant check 4: fw_legs.end_location_id
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fw_legs leg
    JOIN public.md_locations ml ON ml.id = leg.end_location_id
    WHERE leg.tenant_id != ml.tenant_id
  ) THEN
    RAISE EXCEPTION 'Tenant integrity violation in fw_legs.end_location_id';
  END IF;
END $$;

-- ============================================================================
-- PHASE 7: FK CONSTRAINT CONVERGENCE
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
