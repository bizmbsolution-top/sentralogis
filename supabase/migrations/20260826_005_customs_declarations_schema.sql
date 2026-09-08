-- ============================================================================
-- Migration: 20260826_005_customs_declarations_schema.sql
-- Description: SBU Customs Clearance Standalone & Integrated Schema
-- Architecture: Sentralogis Target Architecture v1.0 (Phase 1)
-- ============================================================================

-- 1. cus_declarations
CREATE TABLE IF NOT EXISTS public.cus_declarations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  declaration_number TEXT NOT NULL, -- Nomor Pengajuan (26 Digit)
  service_request_id UUID REFERENCES public.svc_service_requests(id) ON DELETE SET NULL,
  work_order_id UUID REFERENCES public.commercial_work_orders(id) ON DELETE SET NULL,
  importer_id UUID NOT NULL REFERENCES public.md_entities(id),
  ppjk_id UUID REFERENCES public.md_entities(id),
  declaration_type cus_declaration_type NOT NULL DEFAULT 'PIB_IMPORT',
  customs_office_code TEXT NOT NULL,
  billing_code TEXT,
  total_duty_and_tax NUMERIC(18, 2) DEFAULT 0,
  ntpn_payment_ref TEXT,
  paid_at TIMESTAMPTZ,
  channel cus_channel_type,
  sppb_number TEXT,
  sppb_date DATE,
  status TEXT NOT NULL DEFAULT 'DRAFT',
  version_no INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cus_dec_number UNIQUE (tenant_id, declaration_number)
);

-- 2. cus_classification_lines
CREATE TABLE IF NOT EXISTS public.cus_classification_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  declaration_id UUID NOT NULL REFERENCES public.cus_declarations(id) ON DELETE CASCADE,
  item_sequence INTEGER NOT NULL DEFAULT 1,
  hs_code TEXT NOT NULL,
  goods_description TEXT NOT NULL,
  cif_value_usd NUMERIC(18, 2) NOT NULL,
  bm_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ppn_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 11,
  pph_rate_percent NUMERIC(5, 2) NOT NULL DEFAULT 2.5,
  calculated_bm_idr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  calculated_ppn_idr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  calculated_pph_idr NUMERIC(18, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cus_class_seq UNIQUE (declaration_id, item_sequence)
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_cus_dec_tenant ON public.cus_declarations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cus_dec_req ON public.cus_declarations(service_request_id);
CREATE INDEX IF NOT EXISTS idx_cus_dec_wo ON public.cus_declarations(work_order_id);
CREATE INDEX IF NOT EXISTS idx_cus_dec_importer ON public.cus_declarations(importer_id);
CREATE INDEX IF NOT EXISTS idx_cus_dec_channel ON public.cus_declarations(channel);
CREATE INDEX IF NOT EXISTS idx_cus_class_dec ON public.cus_classification_lines(declaration_id);

-- 4. GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cus_declarations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cus_classification_lines TO authenticated;

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.cus_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cus_classification_lines ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS cus_declarations_tenant_isolation ON public.cus_declarations;
CREATE POLICY cus_declarations_tenant_isolation ON public.cus_declarations
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS cus_classification_lines_tenant_isolation ON public.cus_classification_lines;
CREATE POLICY cus_classification_lines_tenant_isolation ON public.cus_classification_lines
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- Notify PostgREST schema cache
NOTIFY pgrst, 'reload schema';
