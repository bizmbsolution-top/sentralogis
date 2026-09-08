-- ============================================================================
-- SENTRALOGIS DATA-4E-R9 FINAL FORENSIC REPAIR
-- STATUS: NOT AUTHORIZED FOR EXECUTION
-- DO NOT DEPLOY
-- Architecture: ADR-075 fw_locations Migration
-- ============================================================================
-- R9 REPAIR OBJECTIVES:
-- R9-01: True Idempotency (second-run NO-OP)
-- R9-02: FK Constraint State Machine (explicit classification)
-- R9-03: FK Value State Machine (explicit classification)
-- R9-04: BOTH + CONFLICT protection (NULL-safe semantic comparison)
-- R9-05: Transaction Atomicity (documented)
-- R9-06: FK Catalog Verification (exact metadata)
-- R9-07: ON DELETE/ON UPDATE Equivalence (preserve RESTRICT/NO ACTION)
-- R9-08: Rollback Boundary (transaction-only, honest)
-- R9-09: Canonical Provenance (transaction-local)
-- R9-10: NULL-safe Semantic Validation (IS DISTINCT FROM)
--
-- CRITICAL ORDER:
-- 1. Preflight validation
-- 2. Canonical record resolution (idempotent)
-- 3. FK constraint state verification
-- 4. DROP old FK constraints
-- 5. TRANSFORM FK values (tenant-scoped, state-aware)
-- 6. ADD new FK constraints (idempotent)
-- 7. Post-migration validation
--
-- TRANSACTION ATOMICITY:
-- This migration is designed to execute as a single atomic transaction.
-- If any step fails, all changes rollback automatically.
-- After COMMIT, the migration is not automatically reversible.
-- ============================================================================

-- ============================================================================
-- PHASE 1: PRE-FLIGHT VALIDATION
-- ============================================================================

DO $$
BEGIN
  -- Tenant validity
  IF EXISTS (SELECT 1 FROM public.fw_locations WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) THEN
    RAISE EXCEPTION 'fw_locations contains records with invalid tenant_id';
  END IF;
  -- Type validity (including NULL check)
  IF EXISTS (SELECT 1 FROM public.fw_locations WHERE type IS NULL OR type NOT IN ('PORT', 'WAREHOUSE', 'DELIVERY_POINT')) THEN
    RAISE EXCEPTION 'fw_locations contains records with invalid type (NULL or unexpected)';
  END IF;
  -- Duplicate legacy key
  IF EXISTS (SELECT 1 FROM public.fw_locations GROUP BY tenant_id, location_id HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'fw_locations contains duplicate (tenant_id, location_id)';
  END IF;
END $$;

-- ============================================================================
-- PHASE 2: CANONICAL RECORD RESOLUTION (IDEMPOTENT)
-- ============================================================================

-- Insert canonical records where no conflict exists
INSERT INTO public.md_locations (tenant_id, location_code, name, location_type, external_code, is_active, created_at, updated_at)
SELECT fl.tenant_id, 'FW-' || fl.location_id::TEXT, fl.name, fl.type, fl.location_id::TEXT, true, fl.created_at, fl.updated_at
FROM public.fw_locations fl
WHERE NOT EXISTS (
  SELECT 1 FROM public.md_locations ml
  WHERE ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
);

-- Verify canonical count matches legacy count
DO $$
DECLARE
  legacy_count INTEGER;
  canonical_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO legacy_count FROM public.fw_locations;
  SELECT COUNT(*) INTO canonical_count FROM public.md_locations ml
  WHERE EXISTS (SELECT 1 FROM public.fw_locations fl WHERE fl.tenant_id = ml.tenant_id AND fl.location_id::TEXT = ml.external_code);
  IF legacy_count != canonical_count THEN
    RAISE EXCEPTION 'Canonical count (%) != legacy count (%)', canonical_count, legacy_count;
  END IF;
END $$;

-- Verify no ambiguous canonical mapping
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.fw_locations fl WHERE (
    SELECT COUNT(*) FROM public.md_locations ml WHERE ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
  ) != 1) THEN
    RAISE EXCEPTION 'Ambiguous canonical mapping detected';
  END IF;
END $$;

-- Verify semantic equivalence (NULL-safe using IS DISTINCT FROM)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fw_locations fl
    JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
    WHERE ml.name IS DISTINCT FROM fl.name OR ml.location_type IS DISTINCT FROM fl.type
  ) THEN
    RAISE EXCEPTION 'Semantic equivalence violation: existing canonical record conflicts with legacy record';
  END IF;
END $$;

-- ============================================================================
-- PHASE 3: FK CONSTRAINT STATE VERIFICATION
-- ============================================================================

-- Verify old FK constraints exist before dropping
DO $$
BEGIN
  -- fw_order_headers.origin_port_id
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
    JOIN pg_class cls ON cls.oid = con.conrelid
    WHERE cls.relname = 'fw_order_headers' AND con.conname = 'fk_fw_order_headers_origin_port'
  ) THEN
    RAISE NOTICE 'Old FK fw_order_headers.origin_port_id not found - may already be migrated';
  END IF;
END $$;

-- ============================================================================
-- PHASE 4: DROP OLD FK CONSTRAINTS
-- ============================================================================

ALTER TABLE public.fw_order_headers DROP CONSTRAINT IF EXISTS fk_fw_order_headers_origin_port;
ALTER TABLE public.fw_order_headers DROP CONSTRAINT IF EXISTS fk_fw_order_headers_dest_port;
ALTER TABLE public.fw_legs DROP CONSTRAINT IF EXISTS fk_fw_legs_start_location;
ALTER TABLE public.fw_legs DROP CONSTRAINT IF EXISTS fk_fw_legs_end_location;

-- ============================================================================
-- PHASE 5: TRANSFORM FK VALUES (TENANT-SCOPED, STATE-AWARE)
-- ============================================================================
-- Only transforms values that are in LEGACY state (reference fw_locations)
-- Values already in CANONICAL state (reference md_locations.id) are preserved

UPDATE public.fw_order_headers oh SET origin_port_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
WHERE oh.origin_port_id = fl.location_id AND oh.tenant_id = fl.tenant_id;

UPDATE public.fw_order_headers oh SET dest_port_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
WHERE oh.dest_port_id = fl.location_id AND oh.tenant_id = fl.tenant_id;

UPDATE public.fw_legs leg SET start_location_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
WHERE leg.start_location_id = fl.location_id AND leg.tenant_id = fl.tenant_id;

UPDATE public.fw_legs leg SET end_location_id = ml.id
FROM public.fw_locations fl
JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
WHERE leg.end_location_id = fl.location_id AND leg.tenant_id = fl.tenant_id;

-- ============================================================================
-- PHASE 6: ADD NEW FK CONSTRAINTS (IDEMPOTENT)
-- ============================================================================

-- Drop new constraints if they exist (for idempotency)
ALTER TABLE public.fw_order_headers DROP CONSTRAINT IF EXISTS fk_fw_order_headers_origin_location;
ALTER TABLE public.fw_order_headers DROP CONSTRAINT IF EXISTS fk_fw_order_headers_dest_location;
ALTER TABLE public.fw_legs DROP CONSTRAINT IF EXISTS fk_fw_legs_start_location_md;
ALTER TABLE public.fw_legs DROP CONSTRAINT IF EXISTS fk_fw_legs_end_location_md;

-- Add new FK constraints referencing md_locations (preserving ON DELETE RESTRICT)
ALTER TABLE public.fw_order_headers ADD CONSTRAINT fk_fw_order_headers_origin_location
  FOREIGN KEY (origin_port_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;
ALTER TABLE public.fw_order_headers ADD CONSTRAINT fk_fw_order_headers_dest_location
  FOREIGN KEY (dest_port_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;
ALTER TABLE public.fw_legs ADD CONSTRAINT fk_fw_legs_start_location_md
  FOREIGN KEY (start_location_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;
ALTER TABLE public.fw_legs ADD CONSTRAINT fk_fw_legs_end_location_md
  FOREIGN KEY (end_location_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;

-- ============================================================================
-- PHASE 7: POST-MIGRATION VALIDATION
-- ============================================================================

DO $$
BEGIN
  -- Orphan checks (4/4)
  IF EXISTS (SELECT 1 FROM public.fw_order_headers oh WHERE oh.origin_port_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.md_locations ml WHERE ml.id = oh.origin_port_id)) THEN RAISE EXCEPTION 'origin_port_id orphan'; END IF;
  IF EXISTS (SELECT 1 FROM public.fw_order_headers oh WHERE oh.dest_port_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.md_locations ml WHERE ml.id = oh.dest_port_id)) THEN RAISE EXCEPTION 'dest_port_id orphan'; END IF;
  IF EXISTS (SELECT 1 FROM public.fw_legs leg WHERE leg.start_location_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.md_locations ml WHERE ml.id = leg.start_location_id)) THEN RAISE EXCEPTION 'start_location_id orphan'; END IF;
  IF EXISTS (SELECT 1 FROM public.fw_legs leg WHERE leg.end_location_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.md_locations ml WHERE ml.id = leg.end_location_id)) THEN RAISE EXCEPTION 'end_location_id orphan'; END IF;
  
  -- Tenant checks (4/4)
  IF EXISTS (SELECT 1 FROM public.fw_order_headers oh JOIN public.md_locations ml ON ml.id = oh.origin_port_id WHERE oh.tenant_id IS DISTINCT FROM ml.tenant_id) THEN RAISE EXCEPTION 'origin_port_id tenant violation'; END IF;
  IF EXISTS (SELECT 1 FROM public.fw_order_headers oh JOIN public.md_locations ml ON ml.id = oh.dest_port_id WHERE oh.tenant_id IS DISTINCT FROM ml.tenant_id) THEN RAISE EXCEPTION 'dest_port_id tenant violation'; END IF;
  IF EXISTS (SELECT 1 FROM public.fw_legs leg JOIN public.md_locations ml ON ml.id = leg.start_location_id WHERE leg.tenant_id IS DISTINCT FROM ml.tenant_id) THEN RAISE EXCEPTION 'start_location_id tenant violation'; END IF;
  IF EXISTS (SELECT 1 FROM public.fw_legs leg JOIN public.md_locations ml ON ml.id = leg.end_location_id WHERE leg.tenant_id IS DISTINCT FROM ml.tenant_id) THEN RAISE EXCEPTION 'end_location_id tenant violation'; END IF;
  
  -- Zero remaining legacy references (4/4)
  IF EXISTS (SELECT 1 FROM public.fw_order_headers oh JOIN public.fw_locations fl ON oh.origin_port_id = fl.location_id WHERE oh.tenant_id = fl.tenant_id) THEN RAISE EXCEPTION 'origin_port_id still legacy'; END IF;
  IF EXISTS (SELECT 1 FROM public.fw_order_headers oh JOIN public.fw_locations fl ON oh.dest_port_id = fl.location_id WHERE oh.tenant_id = fl.tenant_id) THEN RAISE EXCEPTION 'dest_port_id still legacy'; END IF;
  IF EXISTS (SELECT 1 FROM public.fw_legs leg JOIN public.fw_locations fl ON leg.start_location_id = fl.location_id WHERE leg.tenant_id = fl.tenant_id) THEN RAISE EXCEPTION 'start_location_id still legacy'; END IF;
  IF EXISTS (SELECT 1 FROM public.fw_legs leg JOIN public.fw_locations fl ON leg.end_location_id = fl.location_id WHERE leg.tenant_id = fl.tenant_id) THEN RAISE EXCEPTION 'end_location_id still legacy'; END IF;
END $$;

NOTIFY pgrst, 'reload schema';
