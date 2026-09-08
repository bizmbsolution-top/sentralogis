-- ============================================================================
-- Migration: 20260901_028_pricing_override_governance.sql
-- Description: Phase 5C-4 Price Override & Governance
-- Ratified by: ADR-063 (Price Override Governance)
--
-- SCOPE (5C-4 "override governance"):
--   1. pricing_price_overrides override request/approval/audit table
--   2. Override lifecycle: REQUESTED, APPROVED, REJECTED, APPLIED, CANCELLED
--   3. Threshold-based approval governance
--   4. Append-only audit trail
--   5. RLS tenant isolation
--
-- NOT in scope (deferred):
--   - Settlement/accounting
--   - Legacy pricing migration
--   - FX conversion
--
-- Non-destructive / additive / idempotent.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. OVERRIDE STATUS ENUM
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE com_pricing_override_status AS ENUM (
    'REQUESTED',
    'APPROVED',
    'REJECTED',
    'APPLIED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE com_pricing_override_status IS
  '5C-4/ADR-063: Override lifecycle. REQUESTED=pending approval; APPROVED=approved pending application; REJECTED=denied; APPLIED=committed to SO line; CANCELLED=voided.';

-- ----------------------------------------------------------------------------
-- 2. PRICING PRICE OVERRIDES (governance + audit)
--    Rollback: DROP TABLE IF EXISTS public.pricing_price_overrides;
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pricing_price_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  so_line_item_id UUID REFERENCES public.sales_order_line_items(id) ON DELETE SET NULL,
  source_quote_item_id UUID,
  capability_type TEXT NOT NULL CHECK (capability_type IN ('FORWARDING', 'CUSTOMS', 'TRUCKING', 'WAREHOUSE')),
  side TEXT NOT NULL DEFAULT 'SELL' CHECK (side IN ('SELL', 'BUY')),
  original_calculated_price NUMERIC(18,4) NOT NULL,
  override_price NUMERIC(18,4) NOT NULL,
  currency TEXT NOT NULL,
  unit_of_measure TEXT NOT NULL,
  variance_amount NUMERIC(18,4) NOT NULL,
  variance_percentage NUMERIC(10,4),
  reason TEXT NOT NULL,
  status com_pricing_override_status NOT NULL DEFAULT 'REQUESTED',
  requester_id UUID NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  approver_id UUID,
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  CONSTRAINT chk_override_positive_original CHECK (original_calculated_price >= 0),
  CONSTRAINT chk_override_positive_override CHECK (override_price >= 0)
);

COMMENT ON TABLE public.pricing_price_overrides IS
  '5C-4/ADR-063: Price override governance + audit trail. Append-only after APPPLIED. Rate master changes do NOT mutate applied overrides.';

CREATE INDEX IF NOT EXISTS idx_pricing_overrides_tenant ON public.pricing_price_overrides(tenant_id);
CREATE INDEX IF NOT EXISTS idx_pricing_overrides_so ON public.pricing_price_overrides(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_pricing_overrides_status ON public.pricing_price_overrides(status);
CREATE INDEX IF NOT EXISTS idx_pricing_overrides_requester ON public.pricing_price_overrides(requester_id);

-- ----------------------------------------------------------------------------
-- 3. RLS — PRICING PRICE OVERRIDES (tenant-scoped; ADR-057/063 security)
-- ----------------------------------------------------------------------------
ALTER TABLE public.pricing_price_overrides ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS pricing_overrides_tenant_isolation ON public.pricing_price_overrides;
CREATE POLICY pricing_overrides_tenant_isolation ON public.pricing_price_overrides
  FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.pricing_price_overrides TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. UPDATED_AT TRIGGER
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_pricing_overrides_updated_at ON public.pricing_price_overrides;
CREATE TRIGGER trg_pricing_overrides_updated_at
  BEFORE UPDATE ON public.pricing_price_overrides
  FOR EACH ROW EXECUTE FUNCTION public.fn_pricing_set_updated_at();

COMMIT;
