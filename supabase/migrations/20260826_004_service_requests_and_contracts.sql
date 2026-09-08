-- ============================================================================
-- Migration: 20260826_004_service_requests_and_contracts.sql
-- Description: Cross-Domain Service Request Contract Architecture
-- Architecture: Sentralogis Target Architecture v1.0 (Phase 1)
-- ============================================================================

-- 1. svc_service_requests
CREATE TABLE IF NOT EXISTS public.svc_service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  request_number TEXT NOT NULL,
  correlation_id UUID NOT NULL DEFAULT gen_random_uuid(),
  causation_id UUID,
  idempotency_key TEXT NOT NULL,
  source_domain TEXT NOT NULL DEFAULT 'FORWARDING',
  target_domain TEXT NOT NULL, -- TRUCKING, CUSTOMS, WAREHOUSE, EXCHANGE
  shipment_id UUID REFERENCES public.shp_shipments(id) ON DELETE RESTRICT,
  execution_leg_id UUID REFERENCES public.shp_execution_legs(id) ON DELETE RESTRICT,
  work_order_id UUID REFERENCES public.commercial_work_orders(id) ON DELETE RESTRICT,
  service_product_sku TEXT NOT NULL,
  request_payload JSONB NOT NULL,
  sla_target_time TIMESTAMPTZ,
  status svc_request_status NOT NULL DEFAULT 'ISSUED',
  assigned_domain_job_id UUID,
  rejection_reason TEXT,
  version_no INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_svc_request_number UNIQUE (tenant_id, request_number),
  CONSTRAINT uq_svc_idempotency UNIQUE (tenant_id, idempotency_key)
);

-- 2. INDEXES
CREATE INDEX IF NOT EXISTS idx_svc_requests_tenant ON public.svc_service_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_svc_requests_shipment ON public.svc_service_requests(shipment_id);
CREATE INDEX IF NOT EXISTS idx_svc_requests_leg ON public.svc_service_requests(execution_leg_id);
CREATE INDEX IF NOT EXISTS idx_svc_requests_target ON public.svc_service_requests(target_domain, status);
CREATE INDEX IF NOT EXISTS idx_svc_requests_correlation ON public.svc_service_requests(correlation_id);

-- 3. GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.svc_service_requests TO authenticated;

-- 4. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.svc_service_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS svc_service_requests_tenant_isolation ON public.svc_service_requests;
CREATE POLICY svc_service_requests_tenant_isolation ON public.svc_service_requests
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- Notify PostgREST schema cache
NOTIFY pgrst, 'reload schema';
