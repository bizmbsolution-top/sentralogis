-- SENTRALOGIS — LEVEL 3.46 DR1 CANONICAL FOUNDATIONAL CREATE TABLE MIGRATION
-- TARGET: SENTRALOGIS-TEST ONLY (project ref kfagaaggfwkqqwlzhdxm)
-- AUTHORIZATION: Level 3.46 DR1 canonical foundational CREATE TABLE migration implementation, TEST only
-- SOURCE DESIGN: docs/architecture/SENTRALOGIS_AI_COPILOT_PRODUCTION_INTEGRATION_LEVEL3_42_CANONICAL_FOUNDATIONAL_CREATE_TABLE_DESIGN.md
-- SOURCE DECISION: Level 3.45 Section 12 DECISION REQUIRED 1 (DR1) — RECOMMENDATION A
--
-- SCOPE: CANONICAL FUTURE LINEAGE ONLY.
-- This is NOT historical reconstruction. It does NOT claim to reproduce the original historical DDL
-- that created tenants, tenant_users, and md_entities outside version control.
--
-- DR1 RESOLUTION: CREATE TABLE IF NOT EXISTS (deviates from Level 3.43 D5 explicit-CREATE-TABLE
-- resolution). This deviation is DELIBERATE and REQUIRED for DR1:
--   - On the EXISTING populated TEST baseline: tables already exist, so IF NOT EXISTS makes
--     this migration a SAFE ADDITIVE NO-OP for table creation. No DROP, no recreation, no data loss.
--   - On a FRESH/empty database: IF NOT EXISTS still creates the tables normally, so the
--     migration remains fully reproducible as canonical forward lineage.
--   - This is the minimal change that unblocks fresh-database reproducibility WITHOUT falsifying
--     history and WITHOUT destroying existing TEST objects.
--
-- HISTORICAL MIGRATIONS: UNTOUCHED.
--   20260727115714, 20260727, 20260803, 20260804, 20260812 remain unresolved and untouched.
--   20260728, 20260806, 20260912, 20260912000001, 20260913 remain reconciled and untouched.
--   20260914_001 and 20260914_002 remain untouched.
--
-- EXISTING TEST CONDITION (Level 3.40/3.41/3.43 verified):
--   tenants, tenant_users, md_entities, md_tenants, get_my_tenant_id() ALREADY EXIST in TEST.
--   This migration is ADDITIVE and COMPATIBLE with that baseline.
--   On the existing TEST baseline it is a LOGICAL NO-OP for already-existing objects.
--   On a fresh database it establishes the complete canonical foundational schema.
--
-- SAFETY: Single transaction. No destructive operations. No data mutation.
--   No RLS policy changes. No function rewrites. No trigger recreation.

BEGIN;

-- =========================================================================
-- 1. tenants
-- Canonical owner of tenant lifecycle, identity, and isolation boundary (ADR-030).
-- IF NOT EXISTS: safe on existing TEST (table already exists) and fresh databases.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.tenants (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_code     VARCHAR(64),            -- CANONICAL: nullable unique
    name            TEXT NOT NULL,
    warehouse_id    UUID,                   -- LEGACY / COMPATIBILITY (H-1)
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'inactive')),
    user_id         UUID REFERENCES auth.users(id),  -- nullable owner link
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tenant-code uniqueness enforced when non-NULL (ADR-030).
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenants_tenant_code
    ON public.tenants(tenant_code)
    WHERE tenant_code IS NOT NULL;

-- Status lookup and owner-branch lookup in get_my_tenant_id().
CREATE INDEX IF NOT EXISTS idx_tenants_status ON public.tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_user_id
    ON public.tenants(user_id)
    WHERE user_id IS NOT NULL;

-- =========================================================================
-- 2. tenant_users
-- Canonical staff membership: auth.users <-> tenants (H-2 single-tenant).
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.tenant_users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
    role_code   TEXT,                       -- application-level validation; tenant_roles is separate legacy table
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- At most ONE active staff membership per user (H-2).
CREATE UNIQUE INDEX IF NOT EXISTS uq_tenant_users_user_active
    ON public.tenant_users(user_id)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_tenant_users_tenant_id ON public.tenant_users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_users_user_id ON public.tenant_users(user_id);

-- =========================================================================
-- 3. md_entities
-- Canonical party/master-data record. is_own is the SOLE authoritative
-- ownership classification (ADR-078). Role flags are transitional/compatibility
-- projections (ADR-077), NOT authoritative.
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.md_entities (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_code         TEXT,
    name                TEXT NOT NULL,
    legal_name          TEXT,
    tax_id              TEXT,
    email               TEXT,
    phone               TEXT,
    mobile              TEXT,
    whatsapp            TEXT,
    is_customer         BOOLEAN,            -- TRANSITIONAL / COMPATIBILITY (ADR-077)
    is_supplier         BOOLEAN,            -- TRANSITIONAL / COMPATIBILITY (ADR-077)
    is_vendor           BOOLEAN,            -- TRANSITIONAL / COMPATIBILITY (ADR-077)
    is_broker           BOOLEAN,            -- TRANSITIONAL / COMPATIBILITY (ADR-077)
    vendor_type         TEXT,               -- free-text (H-6)
    billing_directions  TEXT,
    billing_method      TEXT,
    tenant_id           UUID NOT NULL REFERENCES public.tenants(id),
    is_active           BOOLEAN NOT NULL DEFAULT true,
    notes               TEXT,
    created_by          UUID,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    parent_id           UUID REFERENCES public.md_entities(id),
    is_own              BOOLEAN,            -- CANONICAL (ADR-078): TRUE / FALSE / NULL
    payment_terms_days  INTEGER,
    payment_terms_type  TEXT,
    logo_url            TEXT,
    crm_status          TEXT,
    sales_rep_id        UUID,
    vendor_tenant_id    UUID REFERENCES public.tenants(id)  -- explicit exception (ADR-077)
);

-- H-4: tenant-scoped entity_code uniqueness when non-NULL.
CREATE UNIQUE INDEX IF NOT EXISTS uq_md_entities_tenant_code
    ON public.md_entities(tenant_id, entity_code)
    WHERE entity_code IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_md_entities_tenant_id ON public.md_entities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_md_entities_parent_id
    ON public.md_entities(parent_id)
    WHERE parent_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_md_entities_vendor_tenant_id
    ON public.md_entities(vendor_tenant_id)
    WHERE vendor_tenant_id IS NOT NULL;

COMMIT;