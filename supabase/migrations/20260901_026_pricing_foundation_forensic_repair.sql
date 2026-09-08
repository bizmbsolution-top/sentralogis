-- ============================================================================
-- Migration: 20260901_026_pricing_foundation_forensic_repair.sql
-- Description: Phase 5C-1R Forensic Repair — Integrity Hardening
-- Ratified by: ADR-057 through ADR-064 (unchanged)
--
-- SCOPE (5C-1R forensic repair only):
--   1. Tenant relational lineage (composite FKs)
--   2. Database-authoritative version number allocation
--   3. ACTIVE version uniqueness (partial unique index)
--   4. Effective period integrity (CHECK constraint)
--   5. Remove implicit IDR default
--   6. Rate vs Version lifecycle semantics (documentation)
--
-- Non-destructive / additive / idempotent.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. TENANT RELATIONAL LINEAGE (composite FKs)
--    Ensure child records belong to the same tenant as their parent.
-- ----------------------------------------------------------------------------

-- Add composite UNIQUE on pricing_rates for composite FK reference
ALTER TABLE public.pricing_rates
  ADD CONSTRAINT uq_pricing_rates_id_tenant UNIQUE (id, tenant_id);

-- Add composite UNIQUE on pricing_rate_versions for composite FK reference
ALTER TABLE public.pricing_rate_versions
  ADD CONSTRAINT uq_pricing_rate_versions_id_tenant UNIQUE (id, tenant_id);

-- Add composite FK: pricing_rate_versions → pricing_rates
ALTER TABLE public.pricing_rate_versions
  ADD CONSTRAINT fk_pricing_rate_versions_rate_tenant
  FOREIGN KEY (rate_id, tenant_id)
  REFERENCES public.pricing_rates(id, tenant_id)
  ON DELETE CASCADE;

-- Add composite FK: pricing_rate_items → pricing_rate_versions
ALTER TABLE public.pricing_rate_items
  ADD CONSTRAINT fk_pricing_rate_items_version_tenant
  FOREIGN KEY (rate_version_id, tenant_id)
  REFERENCES public.pricing_rate_versions(id, tenant_id)
  ON DELETE CASCADE;

-- ----------------------------------------------------------------------------
-- 2. DATABASE-AUTHORITATIVE VERSION NUMBER ALLOCATION
--    Replace MAX(version_no) + 1 with concurrency-safe function.
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.next_pricing_rate_version(
  p_rate_id UUID,
  p_tenant_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_version INTEGER;
BEGIN
  SELECT COALESCE(MAX(version_no), 0) + 1
  INTO next_version
  FROM public.pricing_rate_versions
  WHERE rate_id = p_rate_id
    AND tenant_id = p_tenant_id
  FOR UPDATE;

  RETURN next_version;
END;
$$;

COMMENT ON FUNCTION public.next_pricing_rate_version IS
  '5C-1R: Database-authoritative, concurrency-safe version number allocator. Uses SELECT ... FOR UPDATE to prevent duplicate version numbers under concurrent requests.';

-- ----------------------------------------------------------------------------
-- 3. ACTIVE VERSION INVARIANT (partial unique index)
--    At most one ACTIVE version per rate per tenant.
-- ----------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS uq_pricing_rate_versions_active
  ON public.pricing_rate_versions(rate_id, tenant_id)
  WHERE status = 'ACTIVE';

COMMENT ON INDEX public.uq_pricing_rate_versions_active IS
  '5C-1R/ADR-059: At most one ACTIVE version per rate per tenant.';

-- ----------------------------------------------------------------------------
-- 4. EFFECTIVE PERIOD INTEGRITY
--    Ensure effective_from <= effective_to when both are specified.
-- ----------------------------------------------------------------------------

ALTER TABLE public.pricing_rate_versions
  ADD CONSTRAINT chk_pricing_rate_versions_effective_period
  CHECK (effective_to IS NULL OR effective_from <= effective_to);

COMMENT ON CONSTRAINT chk_pricing_rate_versions_effective_period ON public.pricing_rate_versions IS
  '5C-1R/ADR-059: effective_from must be <= effective_to when both are specified.';

-- ----------------------------------------------------------------------------
-- 5. REMOVE IMPLICIT IDR DEFAULT
--    Currency must be explicit per ADR-062.
-- ----------------------------------------------------------------------------

ALTER TABLE public.pricing_rate_items
  ALTER COLUMN currency DROP DEFAULT;

COMMENT ON COLUMN public.pricing_rate_items.currency IS
  '5C-1R/ADR-062: Explicit currency (no default). Caller MUST specify currency.';

-- ----------------------------------------------------------------------------
-- 6. RATE VS VERSION LIFECYCLE SEMANTICS (documentation)
--    Rate status controls logical rate lifecycle.
--    Version status controls version applicability lifecycle.
--    Valid combinations documented below.
-- ----------------------------------------------------------------------------

COMMENT ON COLUMN public.pricing_rates.status IS
  '5C-1R/ADR-058: Rate-level lifecycle. DRAFT=not yet usable; ACTIVE=rate is usable; SUPERSEDED=replaced by newer rate; INACTIVE=manually retired. A rate with ACTIVE status must have at least one ACTIVE version to be applicable.';

COMMENT ON COLUMN public.pricing_rate_versions.status IS
  '5C-1R/ADR-058/059: Version-level lifecycle. DRAFT=not yet applicable; ACTIVE=currently applicable (one per rate); SUPERSEDED=replaced by newer version; INACTIVE=manually retired. Rate=ACTIVE + Version=DRAFT means rate exists but version not yet applicable.';

COMMIT;
