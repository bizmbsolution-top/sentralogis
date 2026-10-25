-- SENTRALOGIS — LEVEL 3.40 CANONICAL BASELINE IMPLEMENTATION
-- TARGET: SENTRALOGIS-TEST ONLY (project ref kfagaaggfwkqqwlzhdxm)
-- AUTHORIZATION: Level 3.40 canonical baseline implementation, TEST only
-- RATIFIED DECISIONS: H-4 (entity_code uniqueness), H-7 (preserve get_my_tenant_id behavior)
--
-- SCOPE: ADDITIVE ONLY.
-- This migration does NOT create, drop, alter, truncate, or delete any existing object.
-- All five foundational objects (tenants, tenant_users, md_tenants, md_entities,
-- get_my_tenant_id) already exist in TEST and are PRESERVED AS-IS.
--
-- This migration adds ONLY the canonical design elements that are absent from the
-- existing TEST physical state and were ratified in Levels 3.38/3.39:
--
--   1. H-4: partial unique index on md_entities(tenant_id, entity_code)
--      WHERE entity_code IS NOT NULL  (ratified HUMAN DECISION H-4)
--
--   2. idx_tenants_user_id: partial index on tenants(user_id) WHERE user_id IS NOT NULL
--      (canonical design from Level 3.39 §6; absent from TEST)
--
-- EXPLICITLY NOT ADDED (verified present in TEST, preserved as-is):
--   - tenants, tenant_users, md_tenants, md_entities tables (exist, compatible)
--   - get_my_tenant_id() function (exists, LANGUAGE plpgsql, SECURITY DEFINER,
--     SET search_path TO '', no is_active filter — H-7 preserved per ratification)
--   - fn_sync_md_tenants() function (exists, SECURITY DEFINER, SET search_path TO '')
--   - trg_tenants_sync_md_tenants trigger (exists, enabled)
--   - RLS policies on all four foundational tables (exist, enabled)
--   - tenants_status_check, md_tenants_status_check CHECK constraints (exist)
--   - uq_tenants_code, uq_md_tenant_code, uq_tenant_user_membership
--     unique indexes (exist)
--   - idx_tenants_status, idx_md_tenants_status, idx_tenant_users_tenant,
--     idx_tenant_users_user, idx_md_entities_tenant, idx_md_entities_parent,
--     idx_md_entities_vendor_tenant indexes (exist)
--
-- SAFETY: IF NOT EXISTS guards make this migration a logical no-op on re-run.
-- Single transaction. No destructive operations.

BEGIN;

-- ---------------------------------------------------------------------------
-- H-4 RATIFICATION: tenant-scoped entity_code uniqueness on md_entities
-- ---------------------------------------------------------------------------
-- Level 3.39 §14 + §9: canonical design mandates UNIQUE(tenant_id, entity_code)
-- when entity_code is non-NULL, implemented as a partial unique index.
--
-- PREFLIGHT VERIFIED (read-only, TEST):
--   SELECT tenant_id, entity_code, COUNT(*) FROM md_entities
--   WHERE entity_code IS NOT NULL GROUP BY tenant_id, entity_code HAVING COUNT(*) > 1;
--   -> 0 rows. No duplicate entity_codes exist. Index is safe to apply.
--
-- HUMAN DECISION H-4: APPROVED for implementation.
-- ---------------------------------------------------------------------------

CREATE UNIQUE INDEX IF NOT EXISTS uq_md_entities_tenant_code
    ON public.md_entities(tenant_id, entity_code)
    WHERE entity_code IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Canonical partial index on tenants(user_id) — Level 3.39 §6
-- ---------------------------------------------------------------------------
-- Absent from TEST physical state. Additive only. Mirrors the canonical design
-- for owner-branch lookups in get_my_tenant_id().
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_tenants_user_id
    ON public.tenants(user_id)
    WHERE user_id IS NOT NULL;

COMMIT;