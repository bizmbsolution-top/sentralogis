-- ============================================================================
-- Migration: 20260826_010_customs_documents_valuation_lartas_schema.sql
-- Description: Item-Level Document Linkage, Expiry Tracking & Supporting Vault Schema
-- Architecture: Sentralogis Target Architecture v1.0 (Phase 3D-6D-7)
-- Classification: Production-Safe / Non-Destructive / Idempotent
-- ============================================================================

-- 1. Enhance cus_declaration_documents with Item Linkage, Expiry & Issuer
ALTER TABLE public.cus_declaration_documents
  ADD COLUMN IF NOT EXISTS classification_line_id UUID REFERENCES public.cus_classification_lines(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS item_sequence INTEGER,
  ADD COLUMN IF NOT EXISTS expiry_date DATE,
  ADD COLUMN IF NOT EXISTS issuer_name TEXT,
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'UPLOADED';

-- 2. Indexes for Performance & Query Isolation
CREATE INDEX IF NOT EXISTS idx_cus_doc_line ON public.cus_declaration_documents(classification_line_id);
CREATE INDEX IF NOT EXISTS idx_cus_doc_status ON public.cus_declaration_documents(tenant_id, verification_status);
CREATE INDEX IF NOT EXISTS idx_cus_doc_type ON public.cus_declaration_documents(declaration_id, document_type);

-- 3. Notify PostgREST schema cache
NOTIFY pgrst, 'reload schema';
