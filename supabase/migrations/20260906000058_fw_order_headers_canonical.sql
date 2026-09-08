-- ============================================================================
-- Migration: 20260906_058_fw_order_headers_canonical.sql
-- Description: SBU Forwarding Domestik — Create fw_order_headers with
--              canonical schema aligned to existing domain code.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. CREATE fw_order_headers
-- ============================================================================

CREATE TABLE public.fw_order_headers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  work_order_id UUID,
  customer_id UUID,
  service_type TEXT NOT NULL DEFAULT 'FCL' CHECK (service_type IN ('FCL', 'LCL')),
  vessel_name TEXT,
  voyage_no TEXT,
  etd DATE,
  eta DATE,
  origin_port_id UUID,
  dest_port_id UUID,
  cargo_owner_name TEXT,
  cargo_owner_email TEXT,
  cargo_owner_phone TEXT,
  consignee_name TEXT,
  consignee_email TEXT,
  consignee_phone TEXT,
  tracking_token TEXT UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  status TEXT NOT NULL DEFAULT 'need_assignment',
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

CREATE INDEX idx_fw_order_headers_work_order_id ON public.fw_order_headers(work_order_id);
CREATE INDEX idx_fw_order_headers_customer_id ON public.fw_order_headers(customer_id);
CREATE INDEX idx_fw_order_headers_status ON public.fw_order_headers(status);
CREATE INDEX idx_fw_order_headers_tenant ON public.fw_order_headers(tenant_id);

-- ============================================================================
-- 3. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.fw_order_headers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fw_order_headers_tenant_isolation" ON public.fw_order_headers
FOR ALL TO authenticated USING (tenant_id = public.get_my_tenant_id())
WITH CHECK (tenant_id = public.get_my_tenant_id());

COMMIT;
