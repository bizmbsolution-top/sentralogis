-- ============================================================================
-- Migration: 20260826_006_event_outbox_and_auditing.sql
-- Description: Event-Driven Outbox, Consumption Audit & Financial Ledger Foundation
-- Architecture: Sentralogis Target Architecture v1.0 (Phase 1)
-- ============================================================================

-- 1. event_outbox (Transactional Outbox Pattern)
CREATE TABLE IF NOT EXISTS public.event_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  event_id UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  event_name TEXT NOT NULL,
  event_version TEXT NOT NULL DEFAULT '1.0.0',
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  correlation_id UUID NOT NULL,
  causation_id UUID,
  producer_domain TEXT NOT NULL,
  payload JSONB NOT NULL,
  is_published BOOLEAN DEFAULT FALSE,
  published_at TIMESTAMPTZ,
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. event_consumption_log (Idempotent Consumer Deduplication)
CREATE TABLE IF NOT EXISTS public.event_consumption_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  event_id UUID NOT NULL,
  consumer_name TEXT NOT NULL,
  consumed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'SUCCESS',
  error_message TEXT,
  CONSTRAINT uq_event_consumer UNIQUE (event_id, consumer_name)
);

-- 3. event_dead_letter (Poison Pill Event Quarantine)
CREATE TABLE IF NOT EXISTS public.event_dead_letter (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  event_id UUID NOT NULL,
  consumer_name TEXT NOT NULL,
  payload JSONB NOT NULL,
  failure_reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. fin_financial_ledger_entries (3-Tier Financial Attribution Foundation)
CREATE TABLE IF NOT EXISTS public.fin_financial_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  transaction_type fin_transaction_type NOT NULL,
  work_order_id UUID REFERENCES public.commercial_work_orders(id) ON DELETE SET NULL,
  shipment_id UUID REFERENCES public.shp_shipments(id) ON DELETE SET NULL,
  execution_leg_id UUID REFERENCES public.shp_execution_legs(id) ON DELETE SET NULL,
  service_request_id UUID REFERENCES public.svc_service_requests(id) ON DELETE SET NULL,
  vendor_entity_id UUID REFERENCES public.md_entities(id) ON DELETE SET NULL,
  account_code TEXT NOT NULL,
  description TEXT NOT NULL,
  debit_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  credit_amount NUMERIC(18, 2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'IDR',
  is_reconciled BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. INDEXES
CREATE INDEX IF NOT EXISTS idx_event_outbox_tenant ON public.event_outbox(tenant_id);
CREATE INDEX IF NOT EXISTS idx_event_outbox_unpub ON public.event_outbox(is_published) WHERE is_published = FALSE;
CREATE INDEX IF NOT EXISTS idx_event_outbox_corr ON public.event_outbox(correlation_id);
CREATE INDEX IF NOT EXISTS idx_event_consume_event ON public.event_consumption_log(event_id);
CREATE INDEX IF NOT EXISTS idx_fin_ledger_tenant ON public.fin_financial_ledger_entries(tenant_id);
CREATE INDEX IF NOT EXISTS idx_fin_ledger_shp ON public.fin_financial_ledger_entries(shipment_id);
CREATE INDEX IF NOT EXISTS idx_fin_ledger_wo ON public.fin_financial_ledger_entries(work_order_id);

-- 6. GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_outbox TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_consumption_log TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_dead_letter TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fin_financial_ledger_entries TO authenticated;

-- 7. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.event_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_consumption_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_dead_letter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fin_financial_ledger_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS event_outbox_tenant_isolation ON public.event_outbox;
CREATE POLICY event_outbox_tenant_isolation ON public.event_outbox
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS event_consumption_tenant_isolation ON public.event_consumption_log;
CREATE POLICY event_consumption_tenant_isolation ON public.event_consumption_log
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS event_dead_letter_tenant_isolation ON public.event_dead_letter;
CREATE POLICY event_dead_letter_tenant_isolation ON public.event_dead_letter
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS fin_financial_ledger_tenant_isolation ON public.fin_financial_ledger_entries;
CREATE POLICY fin_financial_ledger_tenant_isolation ON public.fin_financial_ledger_entries
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- Notify PostgREST schema cache
NOTIFY pgrst, 'reload schema';
