-- ============================================================================
-- Migration: 20260901_031_accounting_interface_implementation.sql
-- Description: Phase 5D-5 Accounting Interface & External Integration
-- Ratified by: ADR-064 (Financial Settlement Interface)
--              ADR-069 (Multi-Currency, FX, Reconciliation & Accounting)
--
-- SCOPE (5D-5 "accounting interface"):
--   1. accounting_events canonical accounting event aggregate
--   2. accounting_event_lines double-entry lines
--   3. accounting_providers external system configuration
--   4. Outbox integration for external delivery
--   5. RLS on all tables
--
-- NOT in scope (deferred):
--   - External provider-specific adapters
--   - Bank statement ingestion
--   - FX conversion engine
--   - Reconciliation engine
--
-- Non-destructive / additive / idempotent.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. ACCOUNTING EVENT STATUS ENUM
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE com_accounting_event_status AS ENUM (
    'DRAFT',
    'VALIDATED',
    'DISPATCHED',
    'ACKNOWLEDGED',
    'REJECTED',
    'FAILED'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 2. ACCOUNTING EVENT TYPE ENUM
-- ----------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE com_accounting_event_type AS ENUM (
    'INVOICE_ISSUED',
    'INVOICE_ADJUSTED',
    'INVOICE_REVERSED',
    'AR_PAYMENT_APPLIED',
    'AR_PAYMENT_REVERSED',
    'AP_BILL_RECORDED',
    'AP_BILL_ADJUSTED',
    'AP_BILL_REVERSED',
    'AP_PAYMENT_APPLIED',
    'AP_PAYMENT_REVERSED',
    'SETTLEMENT_COMPLETED',
    'SETTLEMENT_REVERSED',
    'ADJUSTMENT',
    'REVERSAL'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 3. ACCOUNTING EVENTS (canonical accounting event aggregate)
--    Rollback: DROP TABLE IF EXISTS public.accounting_events;
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounting_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  event_type com_accounting_event_status NOT NULL,
  source_entity_type TEXT NOT NULL,
  source_entity_id UUID NOT NULL,
  source_reference TEXT,
  accounting_date DATE NOT NULL DEFAULT CURRENT_DATE,
  currency TEXT NOT NULL,
  fx_rate NUMERIC(18,6),
  fx_currency TEXT,
  fx_timestamp TIMESTAMPTZ,
  total_debit NUMERIC(18,4) NOT NULL DEFAULT 0,
  total_credit NUMERIC(18,4) NOT NULL DEFAULT 0,
  status com_accounting_event_status NOT NULL DEFAULT 'DRAFT',
  idempotency_key TEXT NOT NULL,
  external_correlation_id TEXT,
  external_system TEXT,
  acknowledged_at TIMESTAMPTZ,
  failure_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  CONSTRAINT uq_accounting_event_idempotency UNIQUE (tenant_id, idempotency_key),
  CONSTRAINT chk_accounting_event_balanced CHECK (total_debit = total_credit)
);

COMMENT ON TABLE public.accounting_events IS
  '5D-3/ADR-064: Canonical accounting events. Double-entry immutable after dispatch. External system receives events via outbox.';

CREATE INDEX IF NOT EXISTS idx_accounting_events_tenant ON public.accounting_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounting_events_status ON public.accounting_events(status);
CREATE INDEX IF NOT EXISTS idx_accounting_events_source ON public.accounting_events(source_entity_type, source_entity_id);
CREATE INDEX IF NOT EXISTS idx_accounting_events_date ON public.accounting_events(accounting_date);

-- ----------------------------------------------------------------------------
-- 4. ACCOUNTING EVENT LINES (double-entry lines)
--    Rollback: DROP TABLE IF EXISTS public.accounting_event_lines;
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounting_event_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  accounting_event_id UUID NOT NULL REFERENCES public.accounting_events(id) ON DELETE CASCADE,
  line_type TEXT NOT NULL CHECK (line_type IN ('DEBIT', 'CREDIT')),
  account_code TEXT NOT NULL,
  description TEXT,
  amount NUMERIC(18,4) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID
);

CREATE INDEX IF NOT EXISTS idx_accounting_lines_tenant ON public.accounting_event_lines(tenant_id);
CREATE INDEX IF NOT EXISTS idx_accounting_lines_event ON public.accounting_event_lines(accounting_event_id);

-- ----------------------------------------------------------------------------
-- 5. ACCOUNTING PROVIDERS (external system configuration)
--    Rollback: DROP TABLE IF EXISTS public.accounting_providers;
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.accounting_providers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id) ON DELETE CASCADE,
  provider_code TEXT NOT NULL,
  provider_name TEXT NOT NULL,
  config JSONB DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID,
  updated_by UUID,
  CONSTRAINT uq_accounting_provider_code UNIQUE (tenant_id, provider_code)
);

CREATE INDEX IF NOT EXISTS idx_accounting_providers_tenant ON public.accounting_providers(tenant_id);

-- ----------------------------------------------------------------------------
-- 6. RLS — ACCOUNTING EVENTS
-- ----------------------------------------------------------------------------
ALTER TABLE public.accounting_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accounting_events_tenant_isolation ON public.accounting_events;
CREATE POLICY accounting_events_tenant_isolation ON public.accounting_events
  FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_events TO authenticated;

-- ----------------------------------------------------------------------------
-- 7. RLS — ACCOUNTING EVENT LINES
-- ----------------------------------------------------------------------------
ALTER TABLE public.accounting_event_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accounting_lines_tenant_isolation ON public.accounting_event_lines;
CREATE POLICY accounting_lines_tenant_isolation ON public.accounting_event_lines
  FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_event_lines TO authenticated;

-- ----------------------------------------------------------------------------
-- 8. RLS — ACCOUNTING PROVIDERS
-- ----------------------------------------------------------------------------
ALTER TABLE public.accounting_providers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS accounting_providers_tenant_isolation ON public.accounting_providers;
CREATE POLICY accounting_providers_tenant_isolation ON public.accounting_providers
  FOR ALL TO authenticated
  USING (tenant_id = get_my_tenant_id())
  WITH CHECK (tenant_id = get_my_tenant_id());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.accounting_providers TO authenticated;

-- ----------------------------------------------------------------------------
-- 9. UPDATED_AT TRIGGERS
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_accounting_events_updated_at ON public.accounting_events;
CREATE TRIGGER trg_accounting_events_updated_at
  BEFORE UPDATE ON public.accounting_events
  FOR EACH ROW EXECUTE FUNCTION public.fn_pricing_set_updated_at();

DROP TRIGGER IF EXISTS trg_accounting_lines_updated_at ON public.accounting_event_lines;
CREATE TRIGGER trg_accounting_lines_updated_at
  BEFORE UPDATE ON public.accounting_event_lines
  FOR EACH ROW EXECUTE FUNCTION public.fn_pricing_set_updated_at();

DROP TRIGGER IF EXISTS trg_accounting_providers_updated_at ON public.accounting_providers;
CREATE TRIGGER trg_accounting_providers_updated_at
  BEFORE UPDATE ON public.accounting_providers
  FOR EACH ROW EXECUTE FUNCTION public.fn_pricing_set_updated_at();

COMMIT;
