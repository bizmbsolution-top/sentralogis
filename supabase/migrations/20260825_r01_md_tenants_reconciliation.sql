-- ============================================================================
-- Migration: 20260825_r01_md_tenants_reconciliation.sql
-- Stage R Prerequisite (R-P1) — Owner Authorization: C-1 RATIFIED (ADR-030, Option A)
-- REVISION 2 — incorporates static review adjustments #1–#4
-- (docs/architecture/SENTRALOGIS_RP1_STATIC_REVIEW.md) + verification V-T8/V-T9.
--
-- PURPOSE
--   Creates md_tenants as the CANONICAL IDENTITY PROJECTION of public.tenants
--   so that canonical foundation migrations 20260826_001 … 20260827_013
--   (which all REFERENCE public.md_tenants(id)) can be applied VERBATIM.
--
-- ARCHITECTURAL CONTRACT (ADR-030, ratified C-1)
--   1. tenants remains the SINGLE authoritative source of truth for tenant lifecycle.
--   2. md_tenants is a projection ONLY. It MUST NEVER be written by application code.
--      All writes flow exclusively through the sync triggers defined below.
--      authenticated users hold SELECT-only access (adjustment #2).
--   3. md_tenants.id === tenants.id  (deterministic 1:1 mapping by key preservation).
--   4. No tenant records, memberships, roles, ownership, profiles, auth.users,
--      or any operational data are modified by this migration.
--   5. Existing get_my_tenant_id() remains the production resolver, untouched.
--
-- ⚠️ OPERATIONAL CONSTRAINT — TENANT DELETE IS NOT A SUPPORTED BUSINESS OPERATION
--   Tenant lifecycle termination MUST use status = 'inactive'.
--   Reason: ratified migration 20260826_011 defines ON DELETE CASCADE for
--   cus_ceisa_preparations.tenant_id and cus_ceisa_validation_results.tenant_id.
--   A tenant DELETE whose only canonical data were CEISA rows would silently
--   cascade them away. All other 29 FK references are NO ACTION and would block
--   deletion correctly. Do NOT delete rows from public.tenants.
--
-- IDEMPOTENCY
--   Every statement is guarded (IF NOT EXISTS / OR REPLACE / deterministic UPSERT).
--   Re-running this file is a logical no-op; the backfill now SELF-HEALS any
--   projection drift (adjustment #1).
--
-- TRANSACTION SAFETY
--   Execute wrapped in a single transaction (psql -1 -f). Halt on first error.
--
-- CONCURRENCY
--   Additive DDL; no locks on legacy tables beyond brief catalog locks.
--   Backfill tolerates concurrent re-execution via ON CONFLICT (id) DO UPDATE
--   (last committed source state wins — identical to trigger semantics).
--   Trigger-sync tolerates duplicate events idempotently.
--
-- ROLLBACK (reversal script — run ONLY if authorized pre-canonical deployment)
--   BEGIN;
--     DROP TRIGGER IF EXISTS trg_tenants_sync_md_tenants ON public.tenants;
--     DROP FUNCTION IF EXISTS public.fn_sync_md_tenants();
--     DROP POLICY IF EXISTS md_tenants_read_own ON public.md_tenants;
--     DROP TABLE IF EXISTS public.md_tenants;
--   COMMIT;
--   (Safe only while zero canonical tables exist; once 001→013 are applied,
--    md_tenants carries 31 FK-referenced identities and MUST NOT be dropped —
--    PostgreSQL will refuse the DROP loudly, so no silent destruction is possible.)
--
-- DOCUMENTED DEVIATION FROM ORIGINAL SPEC (justified, unchanged in rev 2)
--   TENANCY_RECONCILIATION.md §4 specified tenant_code NOT NULL.
--   Implemented as NULLable with a PARTIAL UNIQUE index instead, because
--   public.tenants.tenant_code is itself nullable. A NOT NULL projection column
--   would cause AFTER-INSERT trigger failures (blocking tenant creation) for any
--   future tenant row lacking a code. Uniqueness preserved by the partial index.
--   Current live data: all 15 tenants have non-NULL codes.
--
-- COMPATIBILITY WITH 001→013
--   Those migrations require public.md_tenants(id UUID PRIMARY KEY, no default).
--   Shape below satisfies all 31 FK definitions (29 NO ACTION, 2 CASCADE in 011).
--   Applied verbatim afterwards. R-P1 executes BEFORE migration 002 (first referencer).
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. CANONICAL PROJECTION TABLE
--    NOTE: id has NO default — values always originate from tenants.id.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.md_tenants (
  id          UUID PRIMARY KEY,
  tenant_code VARCHAR(64),
  name        TEXT NOT NULL,
  status      TEXT NOT NULL DEFAULT 'active',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT md_tenants_status_check CHECK (status IN ('active','inactive'))
);

-- Partial uniqueness mirrors source semantics (codes optional, unique when present)
CREATE UNIQUE INDEX IF NOT EXISTS uq_md_tenant_code
  ON public.md_tenants(tenant_code)
  WHERE tenant_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_md_tenants_status ON public.md_tenants(status);

-- Adjustment #2: projection is read-only to application roles.
GRANT SELECT ON public.md_tenants TO authenticated;

-- ----------------------------------------------------------------------------
-- 2. RLS — read-own-row only. NO INSERT/UPDATE/DELETE policy exists, therefore
--    direct DML by authenticated users is denied regardless of grants
--    (RLS denies when no applicable policy). Writes flow exclusively through
--    the SECURITY DEFINER sync trigger and the service role.
-- ----------------------------------------------------------------------------
ALTER TABLE public.md_tenants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS md_tenants_tenant_isolation ON public.md_tenants;
DROP POLICY IF EXISTS md_tenants_read_own ON public.md_tenants;
CREATE POLICY md_tenants_read_own ON public.md_tenants
  FOR SELECT
  TO authenticated
  USING (
    id = public.get_my_tenant_id()
  );

REVOKE INSERT, UPDATE, DELETE ON public.md_tenants FROM authenticated;
REVOKE ALL ON public.md_tenants FROM anon;

-- ----------------------------------------------------------------------------
-- 3. SYNC FUNCTION (single entry point, recursion-guarded, SECURITY DEFINER
--    so mirror writes never fail due to RLS of the acting tenant user).
--    Adjustment #4: search_path hardened to EMPTY string — no user schema is
--    searchable inside the definer context. Built-ins (coalesce, now,
--    pg_trigger_depth) bind to pg_catalog, which PostgreSQL searches FIRST
--    implicitly even under an empty search_path. NOTE verified locally on
--    PostgreSQL 17/18: explicitly qualifying pg_catalog.coalesce(...) breaks
--    unknown-literal type resolution ('active'), so built-ins are deliberately
--    left unqualified while every APPLICATION object is fully qualified
--    (public.md_tenants). No dynamic SQL exists.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_sync_md_tenants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
BEGIN
  -- Recursion guard: never act on nested trigger firings.
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.md_tenants (id, tenant_code, name, status, created_at, updated_at)
    VALUES (
      NEW.id,
      NEW.tenant_code,
      NEW.name,
      COALESCE(NEW.status, 'active'),
      COALESCE(NEW.created_at, NOW()),
      COALESCE(NEW.updated_at,  NOW())
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NULL;

  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.md_tenants
       SET tenant_code = NEW.tenant_code,
           name        = NEW.name,
           status      = COALESCE(NEW.status, 'active'),
           updated_at  = COALESCE(NEW.updated_at, NOW())
     WHERE id = NEW.id;
    RETURN NULL;

  ELSIF TG_OP = 'DELETE' THEN
    -- Mirror delete. If any canonical table already references md_tenants(id)
    -- with NO ACTION/RESTRICT (as 001→013 define), the database itself blocks
    -- the tenant deletion — preserving referential integrity end-to-end.
    -- ⚠️ Per header constraint: tenant DELETE is not a supported operation anyway.
    DELETE FROM public.md_tenants WHERE id = OLD.id;
    RETURN NULL;
  END IF;

  RETURN NULL;
END;
$fn$;

-- Adjustment #3: hardening — EXECUTE revoked from PUBLIC and authenticated.
-- Trigger firings bypass EXECUTE privilege checks entirely, so synchronization
-- is unaffected; this only closes the direct-invocation surface completely.
REVOKE EXECUTE ON FUNCTION public.fn_sync_md_tenants() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.fn_sync_md_tenants() FROM authenticated;

-- ----------------------------------------------------------------------------
-- 4. SYNC TRIGGERS ON THE AUTHORITATIVE TABLE (tenants)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_tenants_sync_md_tenants ON public.tenants;
CREATE TRIGGER trg_tenants_sync_md_tenants
AFTER INSERT OR UPDATE OF name, tenant_code, status, updated_at OR DELETE
ON public.tenants
FOR EACH ROW
EXECUTE FUNCTION public.fn_sync_md_tenants();

-- ----------------------------------------------------------------------------
-- 5. DETERMINISTIC BACKFILL — adjustment #1: self-healing UPSERT.
--    Shared-PK identity preserved (conflict target is the key itself);
--    re-runs repair any projection drift instead of preserving stale data.
-- ----------------------------------------------------------------------------
INSERT INTO public.md_tenants AS m (id, tenant_code, name, status, created_at, updated_at)
SELECT
  t.id,
  t.tenant_code,
  t.name,
  COALESCE(t.status, 'active'),
  COALESCE(t.created_at, NOW()),
  COALESCE(t.updated_at,  NOW())
FROM public.tenants t
ON CONFLICT (id) DO UPDATE SET
  tenant_code = EXCLUDED.tenant_code,
  name        = EXCLUDED.name,
  status      = EXCLUDED.status,
  created_at  = EXCLUDED.created_at,
  updated_at  = EXCLUDED.updated_at;

NOTIFY pgrst, 'reload schema';

COMMIT;

-- ============================================================================
-- VERIFICATION SUITE (execute AFTER deployment — read-only assertions)
-- Owner-mandated proofs V-T1 … V-T7 + review-added V-T8/V-T9.
-- ============================================================================
-- -- V-T1: counts identical
-- SELECT (SELECT count(*) FROM public.tenants)      AS tenants_total,
--        (SELECT count(*) FROM public.md_tenants)   AS md_tenants_total,
--        (SELECT count(*) FROM public.tenants) = (SELECT count(*) FROM public.md_tenants) AS v_t1_pass;   -- expect true
--
-- -- V-T2: every tenants.id has EXACTLY ONE md_tenants.id
-- SELECT count(*) AS missing_or_duplicate
--   FROM public.tenants t
--   LEFT JOIN public.md_tenants m ON m.id = t.id
--  GROUP BY t.id
-- HAVING count(m.id) <> 1;                                              -- expect 0 rows
--
-- -- V-T3: no md_tenants orphan
-- SELECT count(*) AS orphans FROM public.md_tenants m
--   LEFT JOIN public.tenants t ON t.id = m.id
--  WHERE t.id IS NULL;                                                  -- expect 0
--
-- -- V-T4: IDs remain identical & field parity holds
-- SELECT count(*) AS parity_violations
--   FROM public.tenants t JOIN public.md_tenants m ON m.id = t.id
--  WHERE m.tenant_code IS DISTINCT FROM t.tenant_code
--     OR m.name        IS DISTINCT FROM t.name
--     OR m.status      IS DISTINCT FROM COALESCE(t.status,'active');    -- expect 0
--
-- -- V-T5: lifecycle authority remains in tenants — projection is trigger-fed only
-- SELECT tgname FROM pg_trigger
--  WHERE tgrelid = 'public.tenants'::regclass AND NOT tgisinternal;     -- expect trg_tenants_sync_md_tenants
-- SELECT prosrc LIKE '%md_tenants%' AS feeds_projection, prosecdef AS is_security_definer
--   FROM pg_proc WHERE proname = 'fn_sync_md_tenants';                  -- expect true,true
--
-- -- V-T6: sync behaviour correct (run inside a ROLLBACK-ed transaction!)
-- BEGIN;
--   UPDATE public.tenants SET name = name WHERE id = (SELECT id FROM public.tenants LIMIT 1);
--   SELECT count(*) AS mirror_updated
--     FROM public.md_tenants m JOIN public.tenants t ON t.id = m.id
--    WHERE m.updated_at >= t.updated_at - interval '2 seconds';         -- expect >=1
-- ROLLBACK;
--
-- -- V-T7: legacy execution untouched (row counts captured pre-deployment)
-- SELECT (SELECT count(*) FROM public.work_orders) AS work_orders,   -- expect 100
--        (SELECT count(*) FROM public.wo_items)   AS wo_items,      -- expect 96
--        (SELECT count(*) FROM public.job_orders) AS job_orders;    -- expect 248
--
-- ============================================================================
-- V-T8: NULL tenant_code behavioral parity (added per static review §13)
-- Entirely inside a transaction that ROLLBACKS — leaves ZERO test data behind.
-- ============================================================================
-- BEGIN;
--   CREATE TEMP TABLE vt8_guard ON COMMIT DROP AS SELECT 1 AS started;
--   INSERT INTO public.tenants (id, warehouse_id, name, tenant_code, status)
--   VALUES ('11111111-1111-1111-1111-111111111111',
--           (SELECT warehouse_id FROM public.tenants LIMIT 1),  -- reuse an existing FK value
--           'V-T8 TEMP PROBE', NULL, 'inactive');
--   -- 1..3: source exists, mirror exists, ids identical
--   SELECT t.id = m.id AS ids_identical,          -- expect true
--          m.tenant_code IS NULL AS code_null,    -- expect true (4)
--          t.name = m.name AS mirrored            -- expect true
--     FROM public.tenants t JOIN public.md_tenants m ON m.id = t.id
--    WHERE t.id = '11111111-1111-1111-1111-111111111111';
--   -- 5: reached here ⇒ no uniqueness failure occurred on NULL insert
-- ROLLBACK;  -- removes probe from BOTH tables atomically
--
-- ============================================================================
-- V-T9: security / RLS assertions (added per static review §13)
-- ============================================================================
-- -- V-T9.1: RLS enabled
-- SELECT rowsecurity FROM pg_tables
--  WHERE schemaname='public' AND tablename='md_tenants';                -- expect true
--
-- -- V-T9.2: authenticated CANNOT execute the definer function
-- SELECT has_function_privilege('authenticated',
--        'public.fn_sync_md_tenants()', 'EXECUTE');                     -- expect false
--
-- -- V-T9.3: exactly one SELECT policy
-- SELECT count(*) FROM pg_policies
--  WHERE schemaname='public' AND tablename='md_tenants' AND cmd='SELECT'; -- expect 1
--
-- -- V-T9.4: zero write policies
-- SELECT count(*) FROM pg_policies
--  WHERE schemaname='public' AND tablename='md_tenants'
--    AND cmd IN ('INSERT','UPDATE','DELETE','ALL');                      -- expect 0
--
-- -- V-T9.5: grants deny writes to authenticated
-- SELECT privilege_type FROM information_schema.role_table_grants
--  WHERE table_schema='public' AND table_name='md_tenants'
--    AND grantee='authenticated';                                        -- expect SELECT only
