-- SENTRALOGIS — LEVEL 3.43 CANONICAL FOUNDATIONAL MIGRATION
-- TARGET: SENTRALOGIS-TEST ONLY (project ref kfagaaggfwkqqwlzhdxm)
-- AUTHORIZATION: Level 3.43 canonical foundational migration implementation, TEST only
-- SOURCE DESIGN: docs/architecture/SENTRALOGIS_AI_COPILOT_PRODUCTION_INTEGRATION_LEVEL3_42_CANONICAL_FOUNDATIONAL_CREATE_TABLE_DESIGN.md
--
-- SCOPE: CANONICAL FUTURE LINEAGE ONLY.
-- This is NOT historical reconstruction. It does NOT claim to reproduce the original historical DDL
-- that created tenants, tenant_users, and md_entities outside version control.
--
-- HISTORICAL MIGRATIONS: UNTOUCHED.
--   20260727115714, 20260727, 20260803, 20260804, 20260812 remain unresolved and untouched.
--   20260728, 20260806, 20260912, 20260912000001, 20260913 remain reconciled and untouched.
--   20260914_001 remains untouched.
--
-- EXISTING TEST CONDITION (Level 3.40/3.41 verified):
--   tenants, tenant_users, md_entities, md_tenants, get_my_tenant_id() ALREADY EXIST in TEST.
--   This migration is designed for FRESH-DATABASE reproducibility (canonical forward lineage).
--   It is NOT designed to ALTER the existing TEST schema.
--   On the existing TEST baseline, this migration is a LOGICAL NO-OP for table creation
--   (tables already exist) and must NOT be executed via the migration runner against the
--   populated TEST database. It is intended for a separately authorized empty database target.
--   D5 RESOLUTION: explicit CREATE TABLE (no IF NOT EXISTS) per Level 3.43 authorization.
--
-- SAFETY: Single transaction. No destructive operations. No data mutation.
--   No RLS policy changes. No function rewrites. No trigger recreation.

BEGIN;

-- =========================================================================
-- 1. tenants
-- Canonical owner of tenant lifecycle, identity, and isolation boundary (ADR-030).
-- =========================================================================
CREATE TABLE public.tenants (
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
CREATE UNIQUE INDEX uq_tenants_tenant_code
    ON public.tenants(tenant_code)
    WHERE tenant_code IS NOT NULL;

-- Status lookup and owner-branch lookup in get_my_tenant_id().
CREATE INDEX idx_tenants_status ON public.tenants(status);
CREATE INDEX idx_tenants_user_id
    ON public.tenants(user_id)
    WHERE user_id IS NOT NULL;

-- =========================================================================
-- 2. tenant_users
-- Canonical staff membership: auth.users <-> tenants (H-2 single-tenant).
-- =========================================================================
CREATE TABLE public.tenant_users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id),
    tenant_id   UUID NOT NULL REFERENCES public.tenants(id),
    role_code   TEXT,                       -- application-level validation; tenant_roles is separate legacy table
    is_active   BOOLEAN NOT NULL DEFAULT true,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- At most ONE active staff membership per user (H-2).
CREATE UNIQUE INDEX uq_tenant_users_user_active
    ON public.tenant_users(user_id)
    WHERE is_active = true;

CREATE INDEX idx_tenant_users_tenant_id ON public.tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_user_id ON public.tenant_users(user_id);

-- =========================================================================
-- 3. md_entities
-- Canonical party/master-data record. is_own is the SOLE authoritative
-- ownership classification (ADR-078). Role flags are transitional/compatibility
-- projections (ADR-077), NOT authoritative.
-- =========================================================================
CREATE TABLE public.md_entities (
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
CREATE UNIQUE INDEX uq_md_entities_tenant_code
    ON public.md_entities(tenant_id, entity_code)
    WHERE entity_code IS NOT NULL;

CREATE INDEX idx_md_entities_tenant_id ON public.md_entities(tenant_id);
CREATE INDEX idx_md_entities_parent_id
    ON public.md_entities(parent_id)
    WHERE parent_id IS NOT NULL;
CREATE INDEX idx_md_entities_vendor_tenant_id
    ON public.md_entities(vendor_tenant_id)
    WHERE vendor_tenant_id IS NOT NULL;

COMMIT;