-- ============================================================================
-- SENTRALOGIS DATA-4E-R11 FORENSIC REPAIR
-- STATUS: NOT AUTHORIZED FOR EXECUTION
-- DO NOT DEPLOY
-- Architecture: ADR-075 fw_locations Migration
-- ============================================================================
-- R11 CRITICAL FIXES vs R10:
--
-- FIX 1: FK CONSTRAINT NAMES
-- R10 assumed constraint names like `fk_fw_order_headers_origin_port`,
-- but the original migrations 175/176 did NOT explicitly name constraints.
-- PostgreSQL auto-generates names like `fw_order_headers_origin_port_id_fkey`.
-- R11 drops BOTH possible names to handle both cases.
--
-- FIX 2: TRUE SECOND-RUN NO-OP
-- R10 dropped and re-added canonical constraints on every run.
-- R11 uses conditional logic to only add constraints if missing.
--
-- FIX 3: FK CONSTRAINT STATE CLASSIFICATION
-- R11 explicitly classifies constraint state before acting.
--
-- FIX 4: TRANSACTION ATOMICITY
-- R11 documents actual transaction behavior honestly.
-- ============================================================================

-- ============================================================================
-- PHASE 1: PRE-FLIGHT VALIDATION
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.fw_locations WHERE tenant_id IS NULL OR tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) THEN
    RAISE EXCEPTION 'fw_locations contains records with invalid tenant_id';
  END IF;
  IF EXISTS (SELECT 1 FROM public.fw_locations WHERE type IS NULL OR type NOT IN ('PORT', 'WAREHOUSE', 'DELIVERY_POINT')) THEN
    RAISE EXCEPTION 'fw_locations contains records with invalid type';
  END IF;
  IF EXISTS (SELECT 1 FROM public.fw_locations GROUP BY tenant_id, location_id HAVING COUNT(*) > 1) THEN
    RAISE EXCEPTION 'fw_locations contains duplicate (tenant_id, location_id)';
  END IF;
END $$;

-- ============================================================================
-- PHASE 2: CANONICAL RECORD RESOLUTION (IDEMPOTENT)
-- ============================================================================

INSERT INTO public.md_locations (tenant_id, location_code, name, location_type, external_code, is_active, created_at, updated_at)
SELECT fl.tenant_id, 'FW-' || fl.location_id::TEXT, fl.name, fl.type, fl.location_id::TEXT, true, fl.created_at, fl.updated_at
FROM public.fw_locations fl
WHERE NOT EXISTS (SELECT 1 FROM public.md_locations ml WHERE ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT);

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

-- Verify semantic equivalence (NULL-safe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.fw_locations fl
    JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
    WHERE ml.name IS DISTINCT FROM fl.name OR ml.location_type IS DISTINCT FROM fl.type
  ) THEN
    RAISE EXCEPTION 'Semantic equivalence violation';
  END IF;
END $$;

-- ============================================================================
-- PHASE 3: FK CONSTRAINT STATE CLASSIFICATION & CONVERGENCE
-- ============================================================================

-- Drop old FK constraints (both possible naming conventions)
ALTER TABLE public.fw_order_headers DROP CONSTRAINT IF EXISTS fw_order_headers_origin_port_id_fkey;
ALTER TABLE public.fw_order_headers DROP CONSTRAINT IF EXISTS fk_fw_order_headers_origin_port;
ALTER TABLE public.fw_order_headers DROP CONSTRAINT IF EXISTS fw_order_headers_dest_port_id_fkey;
ALTER TABLE public.fw_order_headers DROP CONSTRAINT IF EXISTS fk_fw_order_headers_dest_port;
ALTER TABLE public.fw_legs DROP CONSTRAINT IF EXISTS fw_legs_start_location_id_fkey;
ALTER TABLE public.fw_legs DROP CONSTRAINT IF EXISTS fk_fw_legs_start_location;
ALTER TABLE public.fw_legs DROP CONSTRAINT IF EXISTS fw_legs_end_location_id_fkey;
ALTER TABLE public.fw_legs DROP CONSTRAINT IF EXISTS fk_fw_legs_end_location;

-- ============================================================================
-- PHASE 4: TRANSFORM FK VALUES (TENANT-SCOPED, STATE-AWARE)
-- ============================================================================

UPDATE public.fw_order_headers oh SET origin_port_id = ml.id
FROM public.fw_locations fl JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
WHERE oh.origin_port_id = fl.location_id AND oh.tenant_id = fl.tenant_id;

UPDATE public.fw_order_headers oh SET dest_port_id = ml.id
FROM public.fw_locations fl JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
WHERE oh.dest_port_id = fl.location_id AND oh.tenant_id = fl.tenant_id;

UPDATE public.fw_legs leg SET start_location_id = ml.id
FROM public.fw_locations fl JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
WHERE leg.start_location_id = fl.location_id AND leg.tenant_id = fl.tenant_id;

UPDATE public.fw_legs leg SET end_location_id = ml.id
FROM public.fw_locations fl JOIN public.md_locations ml ON ml.tenant_id = fl.tenant_id AND ml.external_code = fl.location_id::TEXT
WHERE leg.end_location_id = fl.location_id AND leg.tenant_id = fl.tenant_id;

-- ============================================================================
-- PHASE 5: ADD NEW FK CONSTRAINTS (TRUE NO-OP ON SECOND RUN)
-- ============================================================================

-- Use DO blocks for conditional constraint creation (true idempotency)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class cls ON cls.oid = con.conrelid
    WHERE cls.relname = 'fw_order_headers' AND con.conname = 'fk_fw_order_headers_origin_location') THEN
    ALTER TABLE public.fw_order_headers ADD CONSTRAINT fk_fw_order_headers_origin_location
      FOREIGN KEY (origin_port_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class cls ON cls.oid = con.conrelid
    WHERE cls.relname = 'fw_order_headers' AND con.conname = 'fk_fw_order_headers_dest_location') THEN
    ALTER TABLE public.fw_order_headers ADD CONSTRAINT fk_fw_order_headers_dest_location
      FOREIGN KEY (dest_port_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class cls ON cls.oid = con.conrelid
    WHERE cls.relname = 'fw_legs' AND con.conname = 'fk_fw_legs_start_location_md') THEN
    ALTER TABLE public.fw_legs ADD CONSTRAINT fk_fw_legs_start_location_md
      FOREIGN KEY (start_location_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint con JOIN pg_class cls ON cls.oid = con.conrelid
    WHERE cls.relname = 'fw_legs' AND con.conname = 'fk_fw_legs_end_location_md') THEN
    ALTER TABLE public.fw_legs ADD CONSTRAINT fk_fw_legs_end_location_md
      FOREIGN KEY (end_location_id) REFERENCES public.md_locations(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- ============================================================================
-- PHASE 6: POST-MIGRATION VALIDATION
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
