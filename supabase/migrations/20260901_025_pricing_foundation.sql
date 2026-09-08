-- ============================================================================
-- Migration: 20260901_025_pricing_foundation.sql
-- Description: Phase 5C-1 Pricing Foundation Implementation
-- Ratified by: ADR-057 (Pricing Domain Authority)
--              ADR-058 (Rate Master Model)
--              ADR-059 (Rate Versioning & Price Snapshot)
--              ADR-060 (Buy vs Sell Price Distinction)
--              ADR-062 (Currency & UOM in Pricing)
--
-- SCOPE (5C-1 "canonical foundation"):
--   1. pricing_rates canonical rate master (DB-generated UUID PK, rate_code,
--      capability_type, buy/sell side, currency, UOM, tenant isolation).
--   2. pricing_rate_versions versioned rate definitions (effective period,
--      status, audit metadata, UNIQUE tenant+rate+version).
--   3. pricing_rate_items charge definitions (charge basis, unit rate,
--      min/max charge, applicability conditions).
--   4. RLS on all pricing tables (tenant-scoped via get_my_tenant_id()).
--   5. No calculation engine, no charge commitment, no settlement interface.
--
-- NOT in scope (deferred to 5C-2 through 5C-7):
--   - Rate calculation engine
--   - Commercial charge commitment
--   - Price override workflow
--   - Quote/SO integration
--   - Legacy pricing migration
--   - Financial settlement interface
--
-- Non-destructive / additive / idempotent. Rollback notes per section.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. PRICING RATE STATUS ENUM (canonical lifecycle)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE com_pricing_rate_status AS ENUM (
    'DRAFT',
    'ACTIVE',
    'SUPERSEDED',
    'INACTIVE'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE com_pricing_rate_status IS
  '5C-1/ADR-058: Pricing rate version status. DRAFT=not yet active; ACTIVE=currently applicable; SUPERSEDED=replaced by newer version; INACTIVE=manually retired.';

-- ----------------------------------------------------------------------------
-- 2. PRICING RATE SIDE ENUM (buy vs sell distinction; ADR-060)
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE com_pricing_side AS ENUM (
    'SELL',
    'BUY'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE com_pricing_side IS
  '5C-1/ADR-060: Pricing side. SELL=customer-facing revenue; BUY=supplier/procurement cost.';

-- ----------------------------------------------------------------------------
-- 3. PRICING RATES (canonical rate master identity; ADR-058)
--    Rollback: DROP TABLE IF EXISTS public.pricing_rates;
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pricing_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  rate_code TEXT NOT NULL,
  capability_type TEXT NOT NULL CHECK (capability_type IN ('FORWARDING', 'CUSTOMS', 'TRUCKING', 'WAREHOUSE')),
  rate_description TEXT,
  status com_pricing_rate_status NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  CONSTRAINT uq_pricing_rate_code UNIQUE (tenant_id, rate_code)
);

COMMENT ON TABLE public.pricing_rates IS
  '5C-1/ADR-057/058: Canonical rate master identity. One logical rate per (tenant, rate_code). Capability-neutral — supports FORWARDING, CUSTOMS, TRUCKING, WAREHOUSE without separate engines.';

CREATE INDEX IF NOT EXISTS idx_pricing_rates_tenant ON public.pricing_rates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rates_capability ON public.pricing_rates(capability_type);
CREATE INDEX IF NOT EXISTS idx_pricing_rates_status ON public.pricing_rates(status);

-- ----------------------------------------------------------------------------
-- 4. PRICING RATE VERSIONS (versioned definitions; ADR-058/059)
--    Rollback: DROP TABLE IF EXISTS public.pricing_rate_versions;
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pricing_rate_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_id UUID NOT NULL REFERENCES public.pricing_rates(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  version_no INTEGER NOT NULL,
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_to DATE,
  status com_pricing_rate_status NOT NULL DEFAULT 'DRAFT',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  CONSTRAINT uq_pricing_rate_version UNIQUE (tenant_id, rate_id, version_no)
);

COMMENT ON TABLE public.pricing_rate_versions IS
  '5C-1/ADR-058/058: Rate versions. Each rate can have multiple versions with distinct effective periods. At most one ACTIVE version per rate at any timestamp (enforced by application logic + partial unique index).';

CREATE INDEX IF NOT EXISTS idx_pricing_rate_versions_rate ON public.pricing_rate_versions(rate_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rate_versions_tenant ON public.pricing_rate_versions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rate_versions_effective ON public.pricing_rate_versions(effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_pricing_rate_versions_status ON public.pricing_rate_versions(status);

-- ----------------------------------------------------------------------------
-- 5. PRICING RATE ITEMS (charge definitions; ADR-058/060/062)
--    Rollback: DROP TABLE IF EXISTS public.pricing_rate_items;
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pricing_rate_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rate_version_id UUID NOT NULL REFERENCES public.pricing_rate_versions(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  side com_pricing_side NOT NULL DEFAULT 'SELL',
  charge_basis TEXT NOT NULL,
  unit_of_measure TEXT NOT NULL,
  currency TEXT NOT NULL DEFAULT 'IDR',
  unit_rate NUMERIC(18,4) NOT NULL DEFAULT 0,
  min_charge NUMERIC(18,4),
  max_charge NUMERIC(18,4),
  applicability_conditions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

COMMENT ON TABLE public.pricing_rate_items IS
  '5C-1/ADR-058/060/062: Rate items define specific charge definitions per version. Side (BUY/SELL) is structurally distinct. Currency and UOM are explicit. Applicability conditions stored as JSONB for extensibility.';

CREATE INDEX IF NOT EXISTS idx_pricing_rate_items_version ON public.pricing_rate_items(rate_version_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rate_items_tenant ON public.pricing_rate_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pricing_rate_items_side ON public.pricing_rate_items(side);

-- ----------------------------------------------------------------------------
-- 6. RLS — PRICING RATES (tenant-scoped; ADR-057 security)
-- ----------------------------------------------------------------------------
ALTER TABLE public.pricing_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pricing_rates_tenant_isolation ON public.pricing_rates;
CREATE POLICY pricing_rates_tenant_isolation ON public.pricing_rates
  FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_rates TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. RLS — PRICING RATE VERSIONS (tenant-scoped)
-- ----------------------------------------------------------------------------
ALTER TABLE public.pricing_rate_versions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pricing_rate_versions_tenant_isolation ON public.pricing_rate_versions;
CREATE POLICY pricing_rate_versions_tenant_isolation ON public.pricing_rate_versions
  FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_rate_versions TO authenticated;

-- ----------------------------------------------------------------------------
-- 8. RLS — PRICING RATE ITEMS (tenant-scoped)
-- ----------------------------------------------------------------------------
ALTER TABLE public.pricing_rate_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pricing_rate_items_tenant_isolation ON public.pricing_rate_items;
CREATE POLICY pricing_rate_items_tenant_isolation ON public.pricing_rate_items
  FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_rate_items TO authenticated;

-- ----------------------------------------------------------------------------
-- 9. UPDATED_AT TRIGGERS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_pricing_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_pricing_rates_updated_at ON public.pricing_rates;
CREATE TRIGGER trg_pricing_rates_updated_at
  BEFORE UPDATE ON public.pricing_rates
  FOR EACH ROW EXECUTE FUNCTION public.fn_pricing_set_updated_at();

DROP TRIGGER IF EXISTS trg_pricing_rate_versions_updated_at ON public.pricing_rate_versions;
CREATE TRIGGER trg_pricing_rate_versions_updated_at
  BEFORE UPDATE ON public.pricing_rate_versions
  FOR EACH ROW EXECUTE FUNCTION public.fn_pricing_set_updated_at();

DROP TRIGGER IF EXISTS trg_pricing_rate_items_updated_at ON public.pricing_rate_items;
CREATE TRIGGER trg_pricing_rate_items_updated_at
  BEFORE UPDATE ON public.pricing_rate_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_pricing_set_updated_at();

COMMIT;
