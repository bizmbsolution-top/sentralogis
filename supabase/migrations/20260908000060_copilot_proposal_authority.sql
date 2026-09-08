-- ============================================================================
-- Migration: 20260908000060_copilot_proposal_authority.sql
-- Description: ADR-090 — AI Copilot Proposal Authority Schema
--              Persistent server-side proposal store for the PROPOSE → EXECUTE
--              lifecycle. Provides authoritative proposal identity, tenant
--              binding, lifecycle state, and confirmation tracking.
-- Ratified by: ADR-090 (RATIFIED 2026-09-08)
-- Architecture: Persistent Server-Side Proposal Store (Option A)
--
-- SCOPE:
--   1. copilot_proposals canonical table (DB-generated UUID PK,
--      DB-authoritative proposal_number, tenant-bound, immutable payload,
--      lifecycle states, confirmation tracking).
--   2. seq_copilot_proposal sequence + next_copilot_proposal_number()
--      atomic server-side number authority (format CP-YYYY-MM-NNNN).
--   3. copilot_proposals RLS (tenant-scoped via get_my_tenant_id()).
--
-- NOT in scope (deferred to separate authorization):
--   - Proposal Authority Service implementation
--   - PROPOSE API changes
--   - EXECUTE API changes
--   - E7 idempotency / replay protection
--   - E9 transaction semantics
--   - Domain mutation wiring
--   - WhatsApp integration
--
-- Non-destructive / additive / idempotent.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. PROPOSAL NUMBER SEQUENCE (atomic; ADR-090)
--    Rollback: DROP SEQUENCE IF EXISTS public.seq_copilot_proposal;
-- ============================================================================

CREATE SEQUENCE IF NOT EXISTS public.seq_copilot_proposal START WITH 1 INCREMENT BY 1;

COMMENT ON SEQUENCE public.seq_copilot_proposal IS
  'ADR-090: Atomic sequence for Copilot Proposal business number generation.';

-- ============================================================================
-- 2. copilot_proposals TABLE (canonical proposal authority aggregate)
--    ADR-090: authoritative proposal state between PROPOSE and EXECUTE.
--    Immutable payload after creation; lifecycle state transitions only.
--    Rollback: DROP TABLE IF EXISTS public.copilot_proposals;
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.copilot_proposals (
  id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                   UUID NOT NULL REFERENCES public.md_tenants(id),
  proposal_number             TEXT NOT NULL,
  correlation_id              UUID NOT NULL DEFAULT gen_random_uuid(),
  idempotency_key             UUID NOT NULL,
  intent                      TEXT NOT NULL,
  entities                    JSONB NOT NULL,
  required_permissions        TEXT[] NOT NULL,
  risk_level                  TEXT NOT NULL
                               CHECK (risk_level IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  human_confirmation_required BOOLEAN NOT NULL DEFAULT TRUE,
  confirmation_state          TEXT NOT NULL DEFAULT 'AWAITING'
                               CHECK (confirmation_state IN ('AWAITING','CONFIRMED','REJECTED')),
  confirmation_actor_id       UUID REFERENCES auth.users(id),
  confirmation_at             TIMESTAMPTZ,
  confirmation_note           TEXT,
  explainability              JSONB,
  policy_check                JSONB,
  proposal_payload            JSONB NOT NULL DEFAULT '{}'::jsonb,
  lifecycle_state             TEXT NOT NULL DEFAULT 'PROPOSED'
                               CHECK (lifecycle_state IN (
                                 'PROPOSED',
                                 'AWAITING_CONFIRMATION',
                                 'CONFIRMED',
                                 'EXECUTABLE',
                                 'EXECUTED',
                                 'EXPIRED',
                                 'CANCELLED',
                                 'REJECTED'
                               )),
  expiry_at                   TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by                  UUID REFERENCES auth.users(id),
  updated_by                  UUID REFERENCES auth.users(id),
  CONSTRAINT uq_copilot_proposal_number UNIQUE (tenant_id, proposal_number),
  CONSTRAINT uq_copilot_idempotency UNIQUE (tenant_id, idempotency_key)
);

-- ============================================================================
-- 3. INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_copilot_proposals_tenant
  ON public.copilot_proposals(tenant_id);

CREATE INDEX IF NOT EXISTS idx_copilot_proposals_number
  ON public.copilot_proposals(proposal_number);

CREATE INDEX IF NOT EXISTS idx_copilot_proposals_lifecycle
  ON public.copilot_proposals(tenant_id, lifecycle_state);

CREATE INDEX IF NOT EXISTS idx_copilot_proposals_expiry
  ON public.copilot_proposals(expiry_at)
  WHERE expiry_at IS NOT NULL;

-- ============================================================================
-- 4. next_copilot_proposal_number() ATOMIC NUMBER AUTHORITY (ADR-090)
--    Format: CP-YYYY-MM-NNNN
--    Concurrency: nextval() is atomic & session-safe. UNIQUE(tenant_id,
--    proposal_number) is the safety net. No SELECT MAX + increment.
--    SECURITY DEFINER so it can read the sequence; p_tenant_id is carried for
--    tenant-scoped call semantics (uniqueness per tenant enforced by table).
--    Rollback: DROP FUNCTION IF EXISTS public.next_copilot_proposal_number(UUID);
-- ============================================================================

CREATE OR REPLACE FUNCTION public.next_copilot_proposal_number(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_year TEXT;
  v_month TEXT;
  v_seq BIGINT;
  v_proposal_number TEXT;
BEGIN
  v_year := to_char(now(), 'YYYY');
  v_month := to_char(now(), 'MM');
  v_seq := nextval('seq_copilot_proposal');
  v_proposal_number := 'CP-' || v_year || '-' || v_month || '-' || lpad(v_seq::text, 4, '0');
  RETURN v_proposal_number;
END;
$$;

GRANT EXECUTE ON FUNCTION public.next_copilot_proposal_number(UUID) TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.seq_copilot_proposal TO authenticated;

COMMENT ON FUNCTION public.next_copilot_proposal_number(UUID) IS
  'ADR-090: Atomic server-side Copilot Proposal number generator. Format: CP-YYYY-MM-NNNN. Client MUST NOT generate canonical proposal numbers.';

-- ============================================================================
-- 5. GRANTS + RLS for copilot_proposals (tenant isolation)
-- ============================================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON public.copilot_proposals TO authenticated;

ALTER TABLE public.copilot_proposals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS copilot_proposals_tenant_isolation ON public.copilot_proposals;
CREATE POLICY copilot_proposals_tenant_isolation ON public.copilot_proposals
  FOR ALL TO authenticated
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

COMMENT ON TABLE public.copilot_proposals IS
  'ADR-090: AI Copilot Proposal Authority — persistent server-side proposal store for the PROPOSE → HUMAN CONFIRMATION → EXECUTE lifecycle.';

COMMENT ON COLUMN public.copilot_proposals.proposal_number IS
  'ADR-090: Canonical business number. Allocated ONLY by next_copilot_proposal_number(). Client MUST NOT generate. Format: CP-YYYY-MM-NNNN.';

COMMENT ON COLUMN public.copilot_proposals.intent IS
  'ADR-090: Server-authoritative intent from IntentRegistry. Immutable after creation.';

COMMENT ON COLUMN public.copilot_proposals.entities IS
  'ADR-090: Server-bound entity references at PROPOSE time. Immutable after creation.';

COMMENT ON COLUMN public.copilot_proposals.required_permissions IS
  'ADR-090: Server-authoritative permissions from ActionBridge.getRequiredPermissions(intent). Immutable after creation.';

COMMENT ON COLUMN public.copilot_proposals.risk_level IS
  'ADR-090: Server-authoritative risk from ActionBridge.getRiskLevel(intent). Immutable after creation.';

COMMENT ON COLUMN public.copilot_proposals.lifecycle_state IS
  'ADR-090: Proposal lifecycle state. PROPOSED → AWAITING_CONFIRMATION → CONFIRMED → EXECUTABLE → EXECUTED / EXPIRED / CANCELLED / REJECTED.';

COMMENT ON COLUMN public.copilot_proposals.confirmation_state IS
  'ADR-090: Confirmation tracking state. AWAITING → CONFIRMED → REJECTED.';

COMMENT ON COLUMN public.copilot_proposals.proposal_payload IS
  'ADR-090: Immutable proposal payload snapshot for audit and future replay protection.';

COMMENT ON CONSTRAINT uq_copilot_proposal_number ON public.copilot_proposals IS
  'ADR-090: Prevents duplicate proposal numbers per tenant.';

COMMENT ON CONSTRAINT uq_copilot_idempotency ON public.copilot_proposals IS
  'ADR-090: Idempotency key for retry-safe proposal creation (tenant-scoped).';

COMMIT;
