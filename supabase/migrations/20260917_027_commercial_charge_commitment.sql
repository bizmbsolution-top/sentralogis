-- ============================================================================
-- Migration: 20260901_027_commercial_charge_commitment.sql
-- Description: Phase 5C-3 Commercial Charge Commitment
-- Ratified by: ADR-059 (Price Snapshot), ADR-061 (Commercial Charge),
--              ADR-062 (Currency/UOM), ADR-066 (Commitment Boundary)
--
-- SCOPE (5C-3 "commercial charge commitment"):
--   1. sales_order_line_items canonical commitment boundary
--   2. price_snapshot JSONB (immutable commercial truth)
--   3. Quote → SO price transfer with idempotency
--   4. Amendment via line versioning
--   5. Cancellation without deletion
--   6. RLS tenant isolation
--
-- NOT in scope (deferred):
--   - Settlement/accounting (ADR-064, future phase)
--   - Legacy pricing migration
--   - FX conversion
--   - UOM conversion engine
--
-- Non-destructive / additive / idempotent.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. SO LINE ITEM STATUS ENUM
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE com_sales_order_line_status AS ENUM (
    'DRAFT',
    'ACTIVE',
    'CANCELLED',
    'SUPERSEDED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE com_sales_order_line_status IS
  '5C-3/ADR-061: SO line item lifecycle. DRAFT=editable; ACTIVE=committed; CANCELLED=voided (audit preserved); SUPERSEDED=replaced by amendment.';

-- ----------------------------------------------------------------------------
-- 2. SALES ORDER LINE ITEMS (canonical commitment boundary; ADR-061/066)
--    Rollback: DROP TABLE IF EXISTS public.sales_order_line_items;
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.sales_order_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  line_sequence INTEGER NOT NULL,
  source_quote_item_id UUID,
  capability_type TEXT NOT NULL CHECK (capability_type IN ('FORWARDING', 'CUSTOMS', 'TRUCKING', 'WAREHOUSE')),
  side TEXT NOT NULL DEFAULT 'SELL' CHECK (side IN ('SELL', 'BUY')),
  service_description TEXT NOT NULL,
  quantity NUMERIC(18,3) NOT NULL DEFAULT 0,
  unit_of_measure TEXT NOT NULL,
  currency TEXT NOT NULL,
  unit_rate NUMERIC(18,4) NOT NULL DEFAULT 0,
  line_total NUMERIC(18,2) NOT NULL DEFAULT 0,
  price_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  status com_sales_order_line_status NOT NULL DEFAULT 'DRAFT',
  version_no INTEGER NOT NULL DEFAULT 1,
  superseded_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  CONSTRAINT uq_so_line_item_source UNIQUE (sales_order_id, source_quote_item_id),
  CONSTRAINT uq_so_line_sequence UNIQUE (sales_order_id, line_sequence, version_no),
  CONSTRAINT chk_so_line_positive_qty CHECK (quantity >= 0),
  CONSTRAINT chk_so_line_positive_rate CHECK (unit_rate >= 0),
  CONSTRAINT chk_so_line_positive_total CHECK (line_total >= 0)
);

COMMENT ON TABLE public.sales_order_line_items IS
  '5C-3/ADR-061/066: Canonical commercial charge commitment boundary. Each line preserves an immutable price_snapshot JSONB at commitment. Rate master changes after commitment do NOT affect committed lines.';

CREATE INDEX IF NOT EXISTS idx_so_line_items_tenant ON public.sales_order_line_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_so_line_items_so ON public.sales_order_line_items(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_so_line_items_status ON public.sales_order_line_items(status);
CREATE INDEX IF NOT EXISTS idx_so_line_items_quote_item ON public.sales_order_line_items(source_quote_item_id);

-- ----------------------------------------------------------------------------
-- 3. RLS — SALES ORDER LINE ITEMS (tenant-scoped; ADR-057 security)
-- ----------------------------------------------------------------------------
ALTER TABLE public.sales_order_line_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS so_line_items_tenant_isolation ON public.sales_order_line_items;
CREATE POLICY so_line_items_tenant_isolation ON public.sales_order_line_items
  FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sales_order_line_items TO authenticated;

-- ----------------------------------------------------------------------------
-- 4. UPDATED_AT TRIGGER
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_so_line_items_updated_at ON public.sales_order_line_items;
CREATE TRIGGER trg_so_line_items_updated_at
  BEFORE UPDATE ON public.sales_order_line_items
  FOR EACH ROW EXECUTE FUNCTION public.fn_pricing_set_updated_at();

COMMIT;
