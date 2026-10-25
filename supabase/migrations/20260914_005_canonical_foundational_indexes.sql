-- SENTRALOGIS - LEVEL 3.51 DR1 CANONICAL MIGRATION RESOLUTION - MIGRATION B
-- TARGET: SENTRALOGIS-TEST ONLY (project ref kfagaaggfwkqqwlzhdxm)
-- AUTHORIZATION: Level 3.51 execute migration 20260914_005 on TEST only
-- SOURCE: Level 3.48 DR1 canonical migration resolution design; Level 3.49 forensic preflight;
--         Level 3.50 execution report (004 applied: tenant_users.is_active now present)
--
-- PURPOSE: Establish the canonical index layer for the foundational tables.
--
-- PART 1 - Active-membership unique index (canonical, H-2):
--   uq_tenant_users_user_active  UNIQUE(user_id) WHERE is_active = true
--   This is the canonical one-active-membership-per-user predicate.
--   It is COMPLEMENTARY to the real UNIQUE constraint on tenant_users, which is
--   LEFT UNTOUCHED. Its exact constraint name must be re-verified on TEST at
--   execution time (Level 3.49 recorded it as uq_tenant_user_membership; a later
--   read-only inspection of a different environment recorded tenant_users_user_id_key).
--
-- PART 2 - Index-name reconciliation:
--   Six legacy indexes created outside version control exist under non-canonical names.
--   Each is renamed to its canonical name via DROP + CREATE. Verified in Level 3.49 that
--   none of these six is the backing index of any PRIMARY KEY, FOREIGN KEY, UNIQUE, or
--   CHECK constraint, so the rename is constraint-safe and data-preserving.
--   Each replacement preserves the EXACT columns, order, uniqueness, and predicate.
--
-- SAFE ON EXISTING TEST: IF NOT EXISTS + DROP IF EXISTS -> idempotent, converges names.
-- SAFE ON FRESH DATABASE: 20260914_003 already creates canonical indexes -> all no-ops.
--
-- SAFETY: single transaction. No data mutation. No column changes. No RLS changes.
--   No trigger changes. No function changes. No constraint changes.
--
-- PRE-EXECUTION REQUIREMENT (Level 3.51-CORRECTION): the six legacy index names and
--   their constraint-backing status MUST be re-verified on TEST immediately before
--   execution, because SENTRALOGIS-TEST is currently PAUSED (project status
--   INACTIVE) and its physical state cannot be re-verified while it is unreachable.

BEGIN;

-- =========================================================================
-- PART 1 - Canonical active-membership unique index
-- CORRECTION (Level 3.51-CORRECTION): the Level 3.51 execution report claimed this
-- index was already physically present. That claim is NOT verifiable: the prior
-- file-based attempt aborted with 42601 (schema-qualified index name) and the
-- follow-up unqualified diagnostic returned an AMBIGUOUS result that was never
-- confirmed by a clean read-only pg_indexes check. Level 3.49 section 5.4
-- (authoritative preflight) records it as ABSENT. CREATE UNIQUE INDEX IF NOT
-- EXISTS is idempotent, so creating it here is correct whether it is present or
-- absent. Index names MUST be unqualified; PostgreSQL rejects schema-qualified
-- index names with 42601. The table name may be schema-qualified.
-- =========================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_users_user_active
    ON public.tenant_users(user_id)
    WHERE is_active = true;

-- =========================================================================
-- PART 2 - Index-name reconciliation (6 legacy -> 6 canonical)
-- CRITICAL SYNTAX: Index names MUST be unqualified. PostgreSQL rejects
-- schema-qualified index names with error 42601. Table names may be
-- schema-qualified as public.<table>.
-- =========================================================================

-- tenants
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenants_tenant_code
    ON public.tenants(tenant_code)
    WHERE tenant_code IS NOT NULL;

DROP INDEX IF EXISTS uq_tenants_code;

-- tenant_users
CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id
    ON public.tenant_users(tenant_id);

DROP INDEX IF EXISTS idx_tenant_users_tenant;

CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id
    ON public.tenant_users(user_id);

DROP INDEX IF EXISTS idx_tenant_users_user;

-- md_entities
CREATE INDEX IF NOT EXISTS idx_md_entities_tenant_id
    ON public.md_entities(tenant_id);

DROP INDEX IF EXISTS idx_md_entities_tenant;

CREATE INDEX IF NOT EXISTS idx_md_entities_parent_id
    ON public.md_entities(parent_id)
    WHERE parent_id IS NOT NULL;

DROP INDEX IF EXISTS idx_md_entities_parent;

CREATE INDEX IF NOT EXISTS idx_md_entities_vendor_tenant_id
    ON public.md_entities(vendor_tenant_id)
    WHERE vendor_tenant_id IS NOT NULL;

DROP INDEX IF EXISTS idx_md_entities_vendor_tenant;

COMMIT;