-- ============================================================================
-- Migration: 20260908000061_copilot_proposal_execution_claim.sql
-- Description: ADR-090/E9 — atomic proposal execution claim function
--
-- WHY A SCHEMA OBJECT IS REQUIRED:
--   Two concurrent EXECUTE requests can both read a CONFIRMED proposal and
--   both transition it to EXECUTABLE, allowing both to reach the domain
--   execution boundary. This SECURITY DEFINER function makes the
--   CONFIRMED → EXECUTABLE transition atomic with an optimistic concurrency
--   guard so only one request can claim execution ownership.
--
-- SAFETY:
--   Additive only. No table altered. No RLS weakened (function validates
--   tenant explicitly; direct table RLS untouched).
--   Rollback: DROP FUNCTION public.claim_proposal_for_execution(TEXT, UUID);
-- ============================================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.claim_proposal_for_execution(
  p_proposal_number TEXT,
  p_actor_user_id   UUID
)
RETURNS TABLE (
  id                          UUID,
  tenant_id                   UUID,
  proposal_number             TEXT,
  correlation_id              UUID,
  idempotency_key             UUID,
  intent                      TEXT,
  entities                    JSONB,
  required_permissions        TEXT[],
  risk_level                  TEXT,
  human_confirmation_required BOOLEAN,
  confirmation_state          TEXT,
  confirmation_actor_id       UUID,
  confirmation_at             TIMESTAMPTZ,
  confirmation_note           TEXT,
  explainability              JSONB,
  policy_check                JSONB,
  proposal_payload            JSONB,
  lifecycle_state             TEXT,
  expiry_at                   TIMESTAMPTZ,
  created_at                  TIMESTAMPTZ,
  updated_at                  TIMESTAMPTZ,
  created_by                  UUID,
  updated_by                  UUID,
  outcome                     TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_proposal RECORD;
BEGIN
  -- Atomic optimistic claim: CONFIRMED → EXECUTABLE
  UPDATE public.copilot_proposals
  SET lifecycle_state = 'EXECUTABLE',
      updated_by      = p_actor_user_id,
      updated_at      = NOW()
  WHERE proposal_number = p_proposal_number
    AND lifecycle_state = 'CONFIRMED'
  RETURNING * INTO v_proposal;

  IF FOUND THEN
    RETURN QUERY SELECT
      v_proposal.id,
      v_proposal.tenant_id,
      v_proposal.proposal_number,
      v_proposal.correlation_id,
      v_proposal.idempotency_key,
      v_proposal.intent,
      v_proposal.entities,
      v_proposal.required_permissions,
      v_proposal.risk_level,
      v_proposal.human_confirmation_required,
      v_proposal.confirmation_state,
      v_proposal.confirmation_actor_id,
      v_proposal.confirmation_at,
      v_proposal.confirmation_note,
      v_proposal.explainability,
      v_proposal.policy_check,
      v_proposal.proposal_payload,
      v_proposal.lifecycle_state,
      v_proposal.expiry_at,
      v_proposal.created_at,
      v_proposal.updated_at,
      v_proposal.created_by,
      v_proposal.updated_by,
      'CLAIMED'::TEXT AS outcome;
    RETURN;
  END IF;

  -- Not CONFIRMED — return current state for loser inspection
  SELECT * INTO v_proposal FROM public.copilot_proposals WHERE proposal_number = p_proposal_number;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PROPOSAL_NOT_FOUND';
  END IF;

  RETURN QUERY SELECT
    v_proposal.id,
    v_proposal.tenant_id,
    v_proposal.proposal_number,
    v_proposal.correlation_id,
    v_proposal.idempotency_key,
    v_proposal.intent,
    v_proposal.entities,
    v_proposal.required_permissions,
    v_proposal.risk_level,
    v_proposal.human_confirmation_required,
    v_proposal.confirmation_state,
    v_proposal.confirmation_actor_id,
    v_proposal.confirmation_at,
    v_proposal.confirmation_note,
    v_proposal.explainability,
    v_proposal.policy_check,
    v_proposal.proposal_payload,
    v_proposal.lifecycle_state,
    v_proposal.expiry_at,
    v_proposal.created_at,
    v_proposal.updated_at,
    v_proposal.created_by,
    v_proposal.updated_by,
    CASE v_proposal.lifecycle_state
      WHEN 'EXECUTED'  THEN 'ALREADY_EXECUTED'
      WHEN 'EXECUTABLE' THEN 'CONFLICT'
      ELSE 'INVALID_STATE'
    END AS outcome;

  RETURN;
END;
$fn$;

-- Application-only access. The RPC cannot bypass identity/authz gates.
REVOKE ALL ON FUNCTION public.claim_proposal_for_execution(TEXT, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_proposal_for_execution(TEXT, UUID) FROM anon;
REVOKE ALL ON FUNCTION public.claim_proposal_for_execution(TEXT, UUID) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.claim_proposal_for_execution(TEXT, UUID) TO service_role;

COMMENT ON FUNCTION public.claim_proposal_for_execution(TEXT, UUID) IS
  'E9: Atomically claim a CONFIRMED proposal for execution. Returns outcome CLAIMED, ALREADY_EXECUTED, CONFLICT, or INVALID_STATE.';
