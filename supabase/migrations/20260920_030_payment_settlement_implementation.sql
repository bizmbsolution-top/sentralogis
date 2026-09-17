-- ============================================================================
-- Migration: 20260901_030_payment_settlement_implementation.sql
-- Description: Phase 5D-3 Payment & Settlement Implementation
-- Ratified by: ADR-067 (Payment & Settlement Boundary)
--              ADR-068 (Payment Allocation, AR/AP & Lifecycle)
--              ADR-069 (Multi-Currency, FX, Reconciliation & Accounting)
--
-- SCOPE (5D-3 "payment & settlement"):
--   1. fin_payments canonical payment aggregate
--   2. fin_payment_allocations payment-to-invoice allocation
--   3. fin_settlements settlement boundary
--   4. fin_reconciliation_records reconciliation boundary
--   5. FX snapshot support
--   6. RLS on all tables
--
-- NOT in scope (deferred):
--   - FX conversion engine
--   - Accounting journal posting
--   - Bank integration
--   - Payment gateway integration
--
-- Non-destructive / additive / idempotent.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. PAYMENT STATUS ENUM
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE com_payment_status AS ENUM (
    'PENDING',
    'CONFIRMED',
    'ALLOCATED',
    'COMPLETED',
    'CANCELLED',
    'REVERSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 2. ALLOCATION STATUS ENUM
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE com_allocation_status AS ENUM (
    'PENDING',
    'ALLOCATED',
    'SETTLED',
    'REVERSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 3. SETTLEMENT STATUS ENUM
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE com_settlement_status AS ENUM (
    'OPEN',
    'PARTIAL',
    'SETTLED',
    'REVERSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 4. RECONCILIATION STATUS ENUM
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE com_reconciliation_status AS ENUM (
    'UNMATCHED',
    'MATCHED',
    'PARTIAL',
    'REVERSED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 5. PAYMENTS (canonical payment aggregate; ADR-067)
--    Rollback: DROP TABLE IF EXISTS public.fin_payments;
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fin_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  payment_number TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('AR', 'AP')),
  amount NUMERIC(18,4) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  value_date DATE,
  reference TEXT,
  method TEXT,
  status com_payment_status NOT NULL DEFAULT 'PENDING',
  fx_rate NUMERIC(18,6),
  fx_currency TEXT,
  fx_timestamp TIMESTAMPTZ,
  external_reference TEXT,
  source_metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  CONSTRAINT uq_fin_payments_number UNIQUE (tenant_id, payment_number)
);

COMMENT ON TABLE public.fin_payments IS
  '5D-3/ADR-067: Canonical payment aggregate. AR=incoming, AP=outgoing. FX snapshot preserved.';

CREATE INDEX IF NOT EXISTS idx_fin_payments_tenant ON public.fin_payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_payments_status ON public.fin_payments(status);
CREATE INDEX IF NOT EXISTS idx_fin_payments_direction ON public.fin_payments(direction);
CREATE INDEX IF NOT EXISTS idx_fin_payments_date ON public.fin_payments(payment_date);

-- ----------------------------------------------------------------------------
-- 6. PAYMENT ALLOCATIONS (payment-to-invoice allocation; ADR-068)
--    Rollback: DROP TABLE IF EXISTS public.fin_payment_allocations;
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fin_payment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  payment_id UUID NOT NULL REFERENCES public.fin_payments(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL REFERENCES public.fin_invoices(id) ON DELETE CASCADE,
  amount NUMERIC(18,4) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL,
  status com_allocation_status NOT NULL DEFAULT 'PENDING',
  allocated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  CONSTRAINT uq_fin_payment_allocation UNIQUE (tenant_id, payment_id, invoice_id)
);

COMMENT ON TABLE public.fin_payment_allocations IS
  '5D-3/ADR-068: Payment-to-invoice allocation. Partial payment supported. Immutable after SETTLED.';

CREATE INDEX IF NOT EXISTS idx_fin_allocations_tenant ON public.fin_payment_allocations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_allocations_payment ON public.fin_payment_allocations(payment_id);
CREATE INDEX IF NOT EXISTS idx_fin_allocations_invoice ON public.fin_payment_allocations(invoice_id);
CREATE INDEX IF NOT EXISTS idx_fin_allocations_status ON public.fin_payment_allocations(status);

-- ----------------------------------------------------------------------------
-- 7. SETTLEMENTS (settlement boundary; ADR-067)
--    Rollback: DROP TABLE IF EXISTS public.fin_settlements;
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fin_settlements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  allocation_id UUID NOT NULL REFERENCES public.fin_payment_allocations(id) ON DELETE CASCADE,
  status com_settlement_status NOT NULL DEFAULT 'OPEN',
  settled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

COMMENT ON TABLE public.fin_settlements IS
  '5D-3/ADR-067: Settlement boundary. Tracks allocation settlement state.';

CREATE INDEX IF NOT EXISTS idx_fin_settlements_tenant ON public.fin_settlements(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_settlements_allocation ON public.fin_settlements(allocation_id);
CREATE INDEX IF NOT EXISTS idx_fin_settlements_status ON public.fin_settlements(status);

-- ----------------------------------------------------------------------------
-- 8. RECONCILIATION RECORDS (reconciliation boundary; ADR-069)
--    Rollback: DROP TABLE IF EXISTS public.fin_reconciliation_records;
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fin_reconciliation_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  payment_id UUID REFERENCES public.fin_payments(id) ON DELETE SET NULL,
  external_reference TEXT,
  external_amount NUMERIC(18,4),
  external_currency TEXT,
  external_date DATE,
  status com_reconciliation_status NOT NULL DEFAULT 'UNMATCHED',
  matched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

COMMENT ON TABLE public.fin_reconciliation_records IS
  '5D-3/ADR-069: Reconciliation boundary. External payment matching. Future bank integration.';

CREATE INDEX IF NOT EXISTS idx_fin_recon_tenant ON public.fin_reconciliation_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_recon_payment ON public.fin_reconciliation_records(payment_id);
CREATE INDEX IF NOT EXISTS idx_fin_recon_status ON public.fin_reconciliation_records(status);
CREATE INDEX IF NOT EXISTS idx_fin_recon_external ON public.fin_reconciliation_records(external_reference);

-- ----------------------------------------------------------------------------
-- 9. RLS — PAYMENTS
-- ----------------------------------------------------------------------------
ALTER TABLE public.fin_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fin_payments_tenant_isolation ON public.fin_payments;
CREATE POLICY fin_payments_tenant_isolation ON public.fin_payments
  FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_payments TO authenticated;

-- ----------------------------------------------------------------------------
-- 10. RLS — ALLOCATIONS
-- ----------------------------------------------------------------------------
ALTER TABLE public.fin_payment_allocations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fin_allocations_tenant_isolation ON public.fin_payment_allocations;
CREATE POLICY fin_allocations_tenant_isolation ON public.fin_payment_allocations
  FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_payment_allocations TO authenticated;

-- ----------------------------------------------------------------------------
-- 11. RLS — SETTLEMENTS
-- ----------------------------------------------------------------------------
ALTER TABLE public.fin_settlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fin_settlements_tenant_isolation ON public.fin_settlements;
CREATE POLICY fin_settlements_tenant_isolation ON public.fin_settlements
  FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_settlements TO authenticated;

-- ----------------------------------------------------------------------------
-- 12. RLS — RECONCILIATION
-- ----------------------------------------------------------------------------
ALTER TABLE public.fin_reconciliation_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS fin_recon_tenant_isolation ON public.fin_reconciliation_records;
CREATE POLICY fin_recon_tenant_isolation ON public.fin_reconciliation_records
  FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_reconciliation_records TO authenticated;

-- ----------------------------------------------------------------------------
-- 13. UPDATED_AT TRIGGERS
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_fin_payments_updated_at ON public.fin_payments;
CREATE TRIGGER trg_fin_payments_updated_at
  BEFORE UPDATE ON public.fin_payments
  FOR EACH ROW EXECUTE FUNCTION public.fn_pricing_set_updated_at();

DROP TRIGGER IF EXISTS trg_fin_allocations_updated_at ON public.fin_payment_allocations;
CREATE TRIGGER trg_fin_allocations_updated_at
  BEFORE UPDATE ON public.fin_payment_allocations
  FOR EACH ROW EXECUTE FUNCTION public.fn_pricing_set_updated_at();

DROP TRIGGER IF EXISTS trg_fin_settlements_updated_at ON public.fin_settlements;
CREATE TRIGGER trg_fin_settlements_updated_at
  BEFORE UPDATE ON public.fin_settlements
  FOR EACH ROW EXECUTE FUNCTION public.fn_pricing_set_updated_at();

DROP TRIGGER IF EXISTS trg_fin_recon_updated_at ON public.fin_reconciliation_records;
CREATE TRIGGER trg_fin_recon_updated_at
  BEFORE UPDATE ON public.fin_reconciliation_records
  FOR EACH ROW EXECUTE FUNCTION public.fn_pricing_set_updated_at();

COMMIT;
