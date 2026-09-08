-- ============================================================================
-- Migration: 20260826_008_ppjk_workbench_schema.sql
-- Description: PPJK Workbench, SKU Intelligence, BTKI Tariff Master & Item Audit Schema
-- Architecture: Sentralogis Target Architecture v1.0 (Phase 3D-6A)
-- Classification: Production-Safe / Non-Destructive / Idempotent
-- ============================================================================

-- 1. md_customs_hs_codes (Global/Reference Indonesian BTKI 8-Digit Tariff Master)
CREATE TABLE IF NOT EXISTS public.md_customs_hs_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hs_code VARCHAR(12) NOT NULL UNIQUE, -- e.g. '8504.40.30', '8703.80.19'
  description_id TEXT NOT NULL,
  description_en TEXT,
  chapter VARCHAR(4) NOT NULL, -- e.g. '85', '87'
  heading VARCHAR(6) NOT NULL, -- e.g. '8504', '8703'
  subheading VARCHAR(8) NOT NULL, -- e.g. '8504.40', '8703.80'
  bm_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  ppn_rate NUMERIC(5, 2) NOT NULL DEFAULT 11,
  pph_rate NUMERIC(5, 2) NOT NULL DEFAULT 2.5,
  lartas_flag BOOLEAN NOT NULL DEFAULT false,
  lartas_permit_type TEXT, -- e.g. 'LS', 'PI', 'BPOM', 'SNI'
  uom_primary VARCHAR(10) NOT NULL DEFAULT 'PCE',
  source_reference TEXT DEFAULT 'BTKI-INSW',
  source_version TEXT DEFAULT '2026.1',
  effective_from DATE NOT NULL DEFAULT '2026-01-01',
  effective_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. cus_sku_intelligence (Master Product Memory & Historical Classification Catalog per Importer)
CREATE TABLE IF NOT EXISTS public.cus_sku_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  importer_id UUID NOT NULL REFERENCES public.md_entities(id),
  customer_id UUID REFERENCES public.md_entities(id),
  sku_code TEXT NOT NULL,
  normalized_description TEXT NOT NULL,
  original_description TEXT,
  brand TEXT,
  model TEXT,
  manufacturer TEXT,
  supplier TEXT,
  country_of_origin VARCHAR(2) NOT NULL DEFAULT 'CN',
  preferred_uom VARCHAR(10) NOT NULL DEFAULT 'PCE',
  suggested_hs_code VARCHAR(12),
  classification_confidence NUMERIC(3, 2) DEFAULT 1.00,
  classification_status VARCHAR(20) NOT NULL DEFAULT 'SUGGESTED', -- 'SUGGESTED', 'VERIFIED', 'REQUIRES_REVIEW'
  classification_rationale TEXT,
  classification_source VARCHAR(30) NOT NULL DEFAULT 'HISTORICAL_IMPORT',
  last_used_declaration_id UUID REFERENCES public.cus_declarations(id) ON DELETE SET NULL,
  average_unit_price_usd NUMERIC(14, 4),
  total_declarations_count INTEGER NOT NULL DEFAULT 1,
  last_reviewed_at TIMESTAMPTZ,
  last_reviewed_by UUID,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cus_sku_importer_code UNIQUE (tenant_id, importer_id, sku_code)
);

-- 3. cus_sku_classification_history (Multi-Declaration Classification Evidence Tracking)
CREATE TABLE IF NOT EXISTS public.cus_sku_classification_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  importer_id UUID NOT NULL REFERENCES public.md_entities(id),
  sku_intelligence_id UUID REFERENCES public.cus_sku_intelligence(id) ON DELETE CASCADE,
  declaration_id UUID REFERENCES public.cus_declarations(id) ON DELETE SET NULL,
  declaration_number TEXT,
  sku_code TEXT NOT NULL,
  hs_code VARCHAR(12) NOT NULL,
  goods_description TEXT,
  unit_price_usd NUMERIC(14, 4),
  currency VARCHAR(5) DEFAULT 'USD',
  country_of_origin VARCHAR(2) DEFAULT 'CN',
  customs_channel VARCHAR(20),
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Expansion of cus_classification_lines (Item Enrichment, Snapshots, and Pre-Validation Status)
ALTER TABLE public.cus_classification_lines
  ADD COLUMN IF NOT EXISTS sku_code TEXT,
  ADD COLUMN IF NOT EXISTS brand TEXT,
  ADD COLUMN IF NOT EXISTS model TEXT,
  ADD COLUMN IF NOT EXISTS item_quantity NUMERIC(14, 4) NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS uom_code VARCHAR(10) NOT NULL DEFAULT 'PCE',
  ADD COLUMN IF NOT EXISTS unit_price_usd NUMERIC(14, 4) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS fob_value_usd NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS freight_usd NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS insurance_usd NUMERIC(14, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS currency VARCHAR(5) NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS country_of_origin VARCHAR(2) NOT NULL DEFAULT 'CN',
  ADD COLUMN IF NOT EXISTS manufacturer_name TEXT,
  ADD COLUMN IF NOT EXISTS supplier_name TEXT,
  ADD COLUMN IF NOT EXISTS invoice_number TEXT,
  ADD COLUMN IF NOT EXISTS invoice_line_no INTEGER,
  ADD COLUMN IF NOT EXISTS hs_master_id UUID REFERENCES public.md_customs_hs_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS hs_code_snapshot VARCHAR(12),
  ADD COLUMN IF NOT EXISTS hs_description_snapshot TEXT,
  ADD COLUMN IF NOT EXISTS bm_rate_snapshot NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS ppn_rate_snapshot NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS pph_rate_snapshot NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS classification_confidence NUMERIC(3, 2) DEFAULT 1.00,
  ADD COLUMN IF NOT EXISTS classification_source VARCHAR(30) DEFAULT 'MANUAL',
  ADD COLUMN IF NOT EXISTS classification_rationale TEXT,
  ADD COLUMN IF NOT EXISTS validation_status VARCHAR(20) NOT NULL DEFAULT 'VALID',
  ADD COLUMN IF NOT EXISTS validation_error_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS validation_warning_count INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS validation_errors JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS price_anomaly_flag BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS lartas_flag BOOLEAN NOT NULL DEFAULT false;

-- 5. cus_declaration_documents (Supporting Customs Document Reference Tracking)
CREATE TABLE IF NOT EXISTS public.cus_declaration_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  declaration_id UUID NOT NULL REFERENCES public.cus_declarations(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL, -- 'INVOICE', 'PACKING_LIST', 'BL_AWB', 'COO_FORM_D', 'COO_FORM_E', 'SPEC', 'MSDS', 'PERMIT'
  document_number TEXT,
  issue_date DATE,
  file_reference TEXT,
  file_name TEXT,
  mime_type TEXT,
  file_size_bytes BIGINT,
  extracted_items_count INTEGER DEFAULT 0,
  verification_status TEXT NOT NULL DEFAULT 'PENDING_REVIEW', -- 'PENDING_REVIEW', 'VERIFIED', 'REJECTED'
  verified_by UUID,
  verified_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. cus_item_audit_logs (Immutable Line-Level Classification & Price Change Audit Trail)
CREATE TABLE IF NOT EXISTS public.cus_item_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  declaration_id UUID NOT NULL REFERENCES public.cus_declarations(id) ON DELETE CASCADE,
  classification_line_id UUID REFERENCES public.cus_classification_lines(id) ON DELETE SET NULL,
  field_name TEXT NOT NULL,
  old_value JSONB,
  new_value JSONB,
  change_reason TEXT,
  changed_by UUID,
  changed_by_name TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  source TEXT NOT NULL DEFAULT 'PPJK_WORKBENCH'
);

-- 7. INDEXES (Optimized for High-Throughput PPJK Grid & Search)
CREATE INDEX IF NOT EXISTS idx_cus_hs_code_search ON public.md_customs_hs_codes(hs_code);
CREATE INDEX IF NOT EXISTS idx_cus_hs_chapter ON public.md_customs_hs_codes(chapter);
CREATE INDEX IF NOT EXISTS idx_cus_sku_tenant_importer ON public.cus_sku_intelligence(tenant_id, importer_id);
CREATE INDEX IF NOT EXISTS idx_cus_sku_lookup ON public.cus_sku_intelligence(tenant_id, importer_id, sku_code);
CREATE INDEX IF NOT EXISTS idx_cus_sku_hist ON public.cus_sku_classification_history(tenant_id, importer_id, sku_code);
CREATE INDEX IF NOT EXISTS idx_cus_class_dec_seq ON public.cus_classification_lines(declaration_id, item_sequence);
CREATE INDEX IF NOT EXISTS idx_cus_doc_declaration ON public.cus_declaration_documents(declaration_id);
CREATE INDEX IF NOT EXISTS idx_cus_doc_type ON public.cus_declaration_documents(declaration_id, document_type);
CREATE INDEX IF NOT EXISTS idx_cus_item_audit_dec ON public.cus_item_audit_logs(declaration_id);
CREATE INDEX IF NOT EXISTS idx_cus_item_audit_line ON public.cus_item_audit_logs(classification_line_id);

-- 8. GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.md_customs_hs_codes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cus_sku_intelligence TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cus_sku_classification_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.cus_declaration_documents TO authenticated;
GRANT SELECT, INSERT ON public.cus_item_audit_logs TO authenticated;

-- 9. ROW LEVEL SECURITY (RLS) POLICIES
ALTER TABLE public.md_customs_hs_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cus_sku_intelligence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cus_sku_classification_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cus_declaration_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cus_item_audit_logs ENABLE ROW LEVEL SECURITY;

-- 9a. md_customs_hs_codes: Shared Read-Only Master Reference across Authenticated Users
DROP POLICY IF EXISTS md_customs_hs_codes_read ON public.md_customs_hs_codes;
CREATE POLICY md_customs_hs_codes_read ON public.md_customs_hs_codes
  FOR SELECT TO authenticated
  USING (true);

-- 9b. cus_sku_intelligence: Tenant Isolation
DROP POLICY IF EXISTS cus_sku_intelligence_tenant_isolation ON public.cus_sku_intelligence;
CREATE POLICY cus_sku_intelligence_tenant_isolation ON public.cus_sku_intelligence
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- 9c. cus_sku_classification_history: Tenant Isolation
DROP POLICY IF EXISTS cus_sku_hist_tenant_isolation ON public.cus_sku_classification_history;
CREATE POLICY cus_sku_hist_tenant_isolation ON public.cus_sku_classification_history
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- 9d. cus_declaration_documents: Tenant Isolation
DROP POLICY IF EXISTS cus_docs_tenant_isolation ON public.cus_declaration_documents;
CREATE POLICY cus_docs_tenant_isolation ON public.cus_declaration_documents
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- 9e. cus_item_audit_logs: Tenant Isolation (Append & Select Only)
DROP POLICY IF EXISTS cus_audit_tenant_isolation ON public.cus_item_audit_logs;
CREATE POLICY cus_audit_tenant_isolation ON public.cus_item_audit_logs
  FOR SELECT TO authenticated
  USING (tenant_id = public.get_my_tenant_id());

DROP POLICY IF EXISTS cus_audit_insert_isolation ON public.cus_item_audit_logs;
CREATE POLICY cus_audit_insert_isolation ON public.cus_item_audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- 10. NOTIFY PostgREST Schema Cache Reload
NOTIFY pgrst, 'reload schema';
