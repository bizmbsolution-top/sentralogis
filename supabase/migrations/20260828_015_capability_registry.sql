-- ============================================================================
-- Migration: 20260828_015_capability_registry.sql
-- Description: U-05 Capability Registry Foundation (Phase 4B-3)
-- ADR-018 family · Backlog U-05 · Additive / idempotent / non-destructive
--
-- ARCHITECTURE DECISIONS (documented in U-05 report):
--   1. Capability DEFINITIONS are GLOBAL (what capabilities exist).
--      Capability AVAILABILITY stays tenant-scoped (future bindings — U-06+).
--   2. UNIQUE(capability_code) — machine-readable business identity,
--      never a UUID as business key.
--   3. Minimal lifecycle status: ACTIVE | INACTIVE (definition-level only).
--   4. Seeds are idempotent (ON CONFLICT DO NOTHING) and is_system=TRUE.
--   5. Legacy commercial_service_scopes is NOT mutated — soft-deprecated;
--      registry becomes the authoritative vocabulary going forward.
--
-- Rollback:
--   DROP TABLE IF EXISTS public.commercial_capability_registry;
--   DROP TYPE IF EXISTS ... (status uses TEXT + CHECK, so nothing else to drop)
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. REGISTRY TABLE (global — intentionally NO tenant_id)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.commercial_capability_registry (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capability_code TEXT NOT NULL,
  name            TEXT NOT NULL,
  description     TEXT,
  status          TEXT NOT NULL DEFAULT 'ACTIVE'
                  CONSTRAINT cap_registry_status_check CHECK (status IN ('ACTIVE', 'INACTIVE')),
  is_system       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cap_registry_code UNIQUE (capability_code),
  CONSTRAINT uq_cap_registry_name UNIQUE (name)
);

CREATE INDEX IF NOT EXISTS idx_cap_registry_status ON public.commercial_capability_registry(status);

-- ----------------------------------------------------------------------------
-- 2. IDEMPOTENT SEED — four canonical capabilities (repeat-safe)
-- ----------------------------------------------------------------------------
INSERT INTO public.commercial_capability_registry
  (capability_code, name, description, status, is_system)
VALUES
  ('CUSTOMS',    'Customs Clearance', 'Customs clearance and trade compliance capability (PPJK).',        'ACTIVE', TRUE),
  ('FORWARDING', 'Forwarding',        'Domestic/international freight forwarding (FCL/LCL, consol).',     'ACTIVE', TRUE),
  ('TRUCKING',   'Trucking',          'Land transportation execution capability.',                        'ACTIVE', TRUE),
  ('WAREHOUSE',  'Warehouse',         'Warehousing, storage, and fulfilment capability.',                 'ACTIVE', TRUE)
ON CONFLICT (capability_code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. GRANTS — read-only vocabulary for authenticated; NO direct writes from
--    application roles (registry mutates only via authorized migrations/admin).
-- ----------------------------------------------------------------------------
GRANT SELECT ON public.commercial_capability_registry TO authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.commercial_capability_registry FROM authenticated;
REVOKE ALL ON public.commercial_capability_registry FROM anon;

-- ----------------------------------------------------------------------------
-- 4. RLS — global definitions are readable by any authenticated principal.
-- ----------------------------------------------------------------------------
ALTER TABLE public.commercial_capability_registry ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cap_registry_read ON public.commercial_capability_registry;
CREATE POLICY cap_registry_read ON public.commercial_capability_registry
  FOR SELECT
  TO authenticated
  USING (TRUE);

COMMIT;

-- ============================================================================
-- VERIFICATION SUITE (read-only, run after deploy)
-- ============================================================================
-- -- V-R1: exactly four system rows
-- SELECT count(*) FROM public.commercial_capability_registry WHERE is_system;      -- expect 4
-- -- V-R2: codes unique & canonical
-- SELECT capability_code FROM public.commercial_capability_registry ORDER BY 1;    -- CUSTOMS,FORWARDING,TRUCKING,WAREHOUSE
-- -- V-R3: writes denied
-- SELECT has_table_privilege('authenticated','public.commercial_capability_registry','INSERT'); -- expect false
-- -- V-R4: seed idempotency (re-run section 2 → row count unchanged)
-- ============================================================================
