-- ============================================================================
-- Migration: 20260901_029_financial_settlement_interface.sql
-- Description: Phase 5C-5 Financial Settlement Interface
-- Ratified by: ADR-064 (Financial Settlement Interface)
--
-- SCOPE (5C-5 "financial settlement"):
--   1. fin_billable_events canonical billable events
--   2. fin_invoices commercial-keyed invoices
--   3. fin_invoice_lines per-line invoice items
--   4. fin_ar_ap accounts receivable/payable
--   5. fin_adjustments financial adjustments/reversals
--   6. Reconciliation + idempotency + audit
--
-- NOT in scope (deferred):
--   - Legacy pricing migration
--   - Payment gateway integration
--   - Full accounting engine
--
-- Non-destructive / additive / idempotent.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. BILLABLE EVENT STATUS ENUM
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE com_fin_billable_event_status AS ENUM (
    'PENDING',
    'INVOICED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 2. AR/AP SIDE ENUM
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE com_fin_ar_ap_side AS ENUM (
    'AR',
    'AP'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 3. AR/AP STATUS ENUM
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE com_fin_ar_ap_status AS ENUM (
    'PENDING',
    'INVOICED',
    'PARTIAL_PAID',
    'PAID',
    'OVERDUE',
    'CANCELLED',
    'WRITTEN_OFF'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 4. ADJUSTMENT TYPE ENUM
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE com_fin_adjustment_type AS ENUM (
    'CREDIT_NOTE',
    'DEBIT_NOTE',
    'REVERSAL',
    'WRITE_OFF',
    'PRICE_CORRECTION'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 5. BILLABLE EVENTS (canonical; ADR-064)
--    Rollback: DROP TABLE IF EXISTS public.fin_billable_events;
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fin_billable_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id) ON DELETE CASCADE,
  so_line_item_id UUID REFERENCES public.sales_order_line_items(id) ON DELETE SET NULL,
  source_quote_item_id UUID,
  capability_type TEXT NOT NULL CHECK (capability_type IN ('FORWARDING', 'CUSTOMS', 'TRUCKING', 'WAREHOUSE')),
  side TEXT NOT NULL DEFAULT 'SELL' CHECK (side IN ('SELL', 'BUY')),
  event_type TEXT NOT NULL DEFAULT 'FULFILLMENT_MILESTONE',
  description TEXT NOT NULL,
  quantity NUMERIC(18,3) NOT NULL DEFAULT 0,
  unit_of_measure TEXT NOT NULL,
  currency TEXT NOT NULL,
  unit_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  price_snapshot_id UUID,
  status com_fin_billable_event_status NOT NULL DEFAULT 'PENDING',
  idempotency_key TEXT,
  event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  CONSTRAINT uq_billable_event_idempotency UNIQUE (tenant_id, idempotency_key)
);

COMMENT ON TABLE public.fin_billable_events IS
  '5C-5/ADR-064: Canonical billable events. Reference committed commercial truth. Rate master changes do NOT mutate billable events.';

CREATE INDEX IF NOT EXISTS idx_billable_events_tenant ON public.fin_billable_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billable_events_so ON public.fin_billable_events(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_billable_events_status ON public.fin_billable_events(status);
CREATE INDEX IF NOT_EXISTS idx_billable_events_line ON public.fin_billable_events(so_line_item_id);

-- ----------------------------------------------------------------------------
-- 6. FIN INVOICES (commercial-keyed; ADR-064)
--    Rollback: DROP TABLE IF EXISTS public.fin_invoices;
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fin_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL,
  sales_order_id UUID REFERENCES public.sales_orders(id) ON DELETE SET NULL,
  customer_id UUID,
  side com_fin_ar_ap_side NOT NULL DEFAULT 'AR',
  status TEXT NOT NULL DEFAULT 'DRAFT',
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  currency TEXT NOT NULL DEFAULT 'IDR',
  subtotal NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  tax_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  external_reference TEXT,
  idempotency_key TEXT,
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  CONSTRAINT uq_fin_invoice_number UNIQUE (tenant_id, invoice_number),
  CONSTRAINT uq_fin_invoice_idempotency UNIQUE (tenant_id, idempotency_key)
);

COMMENT ON TABLE public.fin_invoices IS
  '5C-5/ADR-064: Commercial-keyed invoices. Consume billable events. Do NOT recalculate from current rates.';

CREATE INDEX IF NOT EXISTS idx_fin_invoices_tenant ON public.fin_invoices(tenant_id);
CREATE INDEX IF NOT_EXISTS idx_fin_invoices_so ON public.fin_invoices(sales_order_id);
CREATE INDEX IF NOT EXISTS idx_fin_invoices_status ON public.fin_invoices(status);
CREATE INDEX IF NOT EXISTS idx_fin_invoices_customer ON public.fin_invoices(customer_id);

-- ----------------------------------------------------------------------------
-- 7. FIN INVOICE LINES
--    Rollback: DROP TABLE IF EXISTS public.fin_invoice_lines;
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fin_invoice_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.fin_invoices(id) ON DELETE CASCADE,
  billable_event_id UUID REFERENCES public.fin_billable_events(id) ON DELETE SET NULL,
  so_line_item_id UUID REFERENCES public.sales_order_line_items(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(18,3) NOT NULL DEFAULT 0,
  unit_of_measure TEXT NOT NULL,
  unit_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
  amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_fin_invoice_lines_invoice ON public.fin_invoice_lines(invoice_id);
CREATE INDEX IF NOT EXISTS idx_fin_invoice_lines_event ON public.fin_invoice_lines(billable_event_id);

-- ----------------------------------------------------------------------------
-- 8. ACCOUNTS RECEIVABLE / PAYABLE (ADR-064)
--    Rollback: DROP TABLE IF EXISTS public.fin_ar_ap;
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fin_ar_ap (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.fin_invoices(id) ON DELETE CASCADE,
  side com_fin_ar_ap_side NOT NULL,
  status com_fin_ar_ap_status NOT NULL DEFAULT 'PENDING',
  customer_id UUID,
  supplier_id UUID,
  currency TEXT NOT NULL,
  total_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  balance_amount NUMERIC(18,2) NOT NULL DEFAULT 0,
  due_date DATE,
  external_reference TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

COMMENT ON TABLE public.fin_ar_ap IS
  '5C-5/ADR-064: Accounts Receivable/Payable. SELL→AR, BUY→AP. Side preserved from commercial pricing.';

CREATE INDEX IF NOT EXISTS idx_fin_ar_ap_tenant ON public.fin_ar_ap(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_ar_ap_invoice ON public.fin_ar_ap(invoice_id);
CREATE INDEX IF NOT EXISTS idx_fin_ar_ap_status ON public.fin_ar_ap(status);
CREATE INDEX IF NOT EXISTS idx_fin_ar_ap_side ON public.fin_ar_ap(side);

-- ----------------------------------------------------------------------------
-- 9. FINANCIAL ADJUSTMENTS (ADR-064)
--    Rollback: DROP TABLE IF EXISTS public.fin_adjustments;
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fin_adjustments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES public.fin_invoices(id) ON DELETE SET NULL,
  ar_ap_id UUID REFERENCES public.fin_ar_ap(id) ON DELETE SET NULL,
  adjustment_type com_fin_adjustment_type NOT NULL,
  amount NUMERIC(18,2) NOT NULL,
  currency TEXT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

COMMENT ON TABLE public.fin_adjustments IS
  '5C-5/ADR-064: Append-only financial adjustments. Do NOT modify historical committed prices.';

CREATE INDEX IF NOT EXISTS idx_fin_adjustments_tenant ON public.fin_adjustments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_adjustments_invoice ON public.fin_adjustments(invoice_id);

-- ----------------------------------------------------------------------------
-- 10. RLS POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.fin_billable_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_invoice_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_ar_ap ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_adjustments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fin_billable_events_tenant_isolation ON public.fin_billable_events;
CREATE POLICY fin_billable_events_tenant_isolation ON public.fin_billable_events
  FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

DROP POLICY IF EXISTS fin_invoices_tenant_isolation ON public.fin_invoices;
CREATE POLICY fin_invoices_tenant_isolation ON public.fin_invoices
  FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

DROP POLICY IF EXISTS fin_invoice_lines_tenant_isolation ON public.fin_invoice_lines;
CREATE POLICY fin_invoice_lines_tenant_isolation ON public.fin_invoice_lines
  FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

DROP POLICY IF EXISTS fin_ar_ap_tenant_isolation ON public.fin_ar_ap;
CREATE POLICY fin_ar_ap_tenant_isolation ON public.fin_ar_ap
  FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

DROP POLICY IF EXISTS fin_adjustments_tenant_isolation ON public.fin_adjustments;
CREATE POLICY fin_adjustments_tenant_isolation ON public.fin_adjustments
  FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_billable_events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_invoices TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_invoice_lines TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_ar_ap TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_adjustments TO authenticated;

-- ----------------------------------------------------------------------------
-- 11. UPDATED_AT TRIGGERS
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_fin_billable_events_updated_at ON public.fin_billable_events;
CREATE TRIGGER trg_fin_billable_events_updated_at
  BEFORE UPDATE ON public.fin_billable_events
  FOR EACH ROW EXECUTE FUNCTION public.fn_pricing_set_updated_at();

DROP TRIGGER IF EXISTS trg_fin_invoices_updated_at ON public.fin_invoices;
CREATE TRIGGER trg_fin_invoices_updated_at
  BEFORE UPDATE ON public.fin_invoices
  FOR EACH ROW EXECUTE FUNCTION public.fn_pricing_set_updated_at();

DROP TRIGGER IF EXISTS trg_fin_invoice_lines_updated_at ON public.fin_invoice_lines;
CREATE TRIGGER trg_fin_invoice_lines_updated_at
  BEFORE UPDATE ON public.fin_invoice_lines
  FOR EACH ROW EXECUTE FUNCTION public.fn_pricing_set_updated_at();

DROP TRIGGER IF EXISTS trg_fin_ar_ap_updated_at ON public.fin_ar_ap;
CREATE TRIGGER trg_fin_ar_ap_updated_at
  BEFORE UPDATE ON public.fin_ar_ap
  FOR EACH ROW EXECUTE FUNCTION public.fn_pricing_set_updated_at();

DROP TRIGGER IF EXISTS trg_fin_adjustments_updated_at ON public.fin_adjustments;
CREATE TRIGGER trg_fin_adjustments_updated_at
  BEFORE UPDATE ON public.fin_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.fn_pricing_set_updated_at();

COMMIT;
