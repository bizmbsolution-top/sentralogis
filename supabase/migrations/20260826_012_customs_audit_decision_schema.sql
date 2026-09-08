-- ============================================================================
-- SENTRALOGIS TARGET ARCHITECTURE v1.0
-- Migration: 20260826_012_customs_audit_decision_schema.sql
-- Description: Schema for Customs Declaration Audit Events, Hash Chain, and Decisions
--
-- R-B CONTROLLED ERRATUM (owner decision, Stage R):
--   The original migration referenced nonexistent public.md_users.
--   This repository's canonical tenancy resolver is public.get_my_tenant_id().
--   Only the four tenancy-policy predicates were corrected.
--   No schema/data-model change was introduced.
-- ============================================================================

-- 1. cus_declaration_audit_events (Append-Only Cryptographic Audit Event Log)
CREATE TABLE IF NOT EXISTS public.cus_declaration_audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  declaration_id UUID NOT NULL REFERENCES public.cus_declarations(id) ON DELETE CASCADE,
  sequence_no BIGINT NOT NULL,
  event_type TEXT NOT NULL,
  event_category TEXT NOT NULL,
  actor_type TEXT NOT NULL DEFAULT 'USER',
  actor_id UUID,
  actor_name TEXT,
  actor_role TEXT,
  summary TEXT NOT NULL,
  diff JSONB,
  entity_type TEXT,
  entity_id TEXT,
  evidence_references JSONB,
  regulatory_basis JSONB,
  event_hash TEXT NOT NULL,
  previous_event_hash TEXT,
  idempotency_key TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cus_audit_dec_seq UNIQUE (declaration_id, sequence_no),
  CONSTRAINT uq_cus_audit_idempotency UNIQUE (declaration_id, idempotency_key)
);

-- 2. cus_customs_decisions (First-Class Customs Decision Log)
CREATE TABLE IF NOT EXISTS public.cus_customs_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES public.md_tenants(id),
  declaration_id UUID NOT NULL REFERENCES public.cus_declarations(id) ON DELETE CASCADE,
  decision_number TEXT NOT NULL,
  decision_type TEXT NOT NULL,
  outcome TEXT NOT NULL,
  actor_id UUID,
  actor_name TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  reason TEXT NOT NULL,
  justification TEXT,
  evidence JSONB,
  regulatory_source JSONB,
  related_item_id UUID REFERENCES public.cus_classification_lines(id) ON DELETE SET NULL,
  related_exception_id UUID REFERENCES public.cus_declaration_exceptions(id) ON DELETE SET NULL,
  related_document_id UUID REFERENCES public.cus_declaration_documents(id) ON DELETE SET NULL,
  related_prep_id UUID REFERENCES public.cus_ceisa_preparations(id) ON DELETE SET NULL,
  confidence TEXT NOT NULL DEFAULT 'HIGH',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_cus_decision_num UNIQUE (tenant_id, decision_number)
);

-- 3. INDEXES
CREATE INDEX IF NOT EXISTS idx_cus_audit_dec_seq ON public.cus_declaration_audit_events(declaration_id, sequence_no);
CREATE INDEX IF NOT EXISTS idx_cus_audit_tenant_cat ON public.cus_declaration_audit_events(tenant_id, event_category, created_at);
CREATE INDEX IF NOT EXISTS idx_cus_audit_event_type ON public.cus_declaration_audit_events(declaration_id, event_type);
CREATE INDEX IF NOT EXISTS idx_cus_decision_dec ON public.cus_customs_decisions(declaration_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_cus_decision_type ON public.cus_customs_decisions(tenant_id, decision_type);
CREATE INDEX IF NOT EXISTS idx_cus_decision_item ON public.cus_customs_decisions(related_item_id);

-- 4. GRANTS
GRANT SELECT, INSERT ON public.cus_declaration_audit_events TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.cus_customs_decisions TO authenticated;

-- 5. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.cus_declaration_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cus_customs_decisions ENABLE ROW LEVEL SECURITY;

CREATE POLICY cus_audit_events_tenant_isolation ON public.cus_declaration_audit_events
  FOR ALL
  TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

CREATE POLICY cus_decisions_tenant_isolation ON public.cus_customs_decisions
  FOR ALL
  TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());
