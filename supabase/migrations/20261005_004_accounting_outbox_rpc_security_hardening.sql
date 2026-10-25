-- Migration: 20261005_004_accounting_outbox_rpc_security_hardening.sql
-- Description: PostgREST RPC Security Boundary Hardening for Settlement -> Accounting Outbox RPC
-- Ratified by: Human Architect Authorization, 2026-10-05 (Option A)
--
-- Target:
--   Function: public.fn_settle_allocation_with_outbox(p_tenant_id UUID, p_allocation_id UUID, p_user_id UUID, p_idempotency_key TEXT)
--
-- Security Invariants Enforced:
--   1. REVOKE EXECUTE from anon and PUBLIC.
--   2. GRANT EXECUTE to authenticated and service_role.
--   3. Authenticated PostgREST calls bind tenant to public.get_my_tenant_id() and actor to auth.uid().
--   4. Rejects tenant mismatch or user spoofing with deterministic FORBIDDEN exceptions.
--   5. Trusted server-side calls (service_role / postgres) require explicit p_tenant_id.
--   6. Retains SECURITY DEFINER with fixed search_path = public.
--   7. Retains 100% static PL/pgSQL (zero dynamic SQL).
--   8. Retains identical atomic transaction and accounting mapping (DEBIT 1-11010, CREDIT 1-10100).

BEGIN;

CREATE OR REPLACE FUNCTION public.fn_settle_allocation_with_outbox(
  p_tenant_id UUID,
  p_allocation_id UUID,
  p_user_id UUID DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_calling_role TEXT;
  v_session_user UUID;
  v_session_tenant UUID;
  v_effective_tenant UUID;
  v_effective_user UUID;
  v_alloc RECORD;
  v_existing_settlement RECORD;
  v_existing_event RECORD;
  v_settlement_id UUID;
  v_settled_at TIMESTAMPTZ;
  v_event_id UUID;
  v_event_idempotency TEXT;
  v_payment RECORD;
  v_all_settled BOOLEAN;
  v_total_allocated NUMERIC;
BEGIN
  -- 0. Identity & Tenant Boundary Hardening (ADR-067 / Phase 5D-3 PostgREST Hardening)
  v_calling_role := auth.role();
  v_session_user := auth.uid();

  IF v_calling_role = 'anon' THEN
    RAISE EXCEPTION 'FORBIDDEN: Anonymous execution not permitted';
  ELSIF v_calling_role = 'authenticated' THEN
    -- Authenticated direct PostgREST session: derive authoritative tenant from session
    v_session_tenant := public.get_my_tenant_id();

    IF v_session_tenant IS NULL THEN
      RAISE EXCEPTION 'FORBIDDEN: User has no active tenant association';
    END IF;

    -- Prevent tenant impersonation: caller cannot supply a mismatched tenant
    IF p_tenant_id IS NOT NULL AND p_tenant_id != v_session_tenant THEN
      RAISE EXCEPTION 'FORBIDDEN: Tenant mismatch between supplied p_tenant_id and session tenant';
    END IF;

    v_effective_tenant := v_session_tenant;

    -- Prevent audit identity spoofing: caller cannot supply a mismatched user_id
    IF p_user_id IS NOT NULL AND p_user_id != v_session_user THEN
      RAISE EXCEPTION 'FORBIDDEN: User mismatch between supplied p_user_id and session user';
    END IF;

    v_effective_user := v_session_user;
  ELSE
    -- Trusted server-side execution (service_role or direct DB superuser/postgres)
    IF p_tenant_id IS NULL THEN
      RAISE EXCEPTION 'INVALID_ARGUMENT: p_tenant_id is required';
    END IF;

    v_effective_tenant := p_tenant_id;
    v_effective_user := p_user_id;
  END IF;

  -- 1. Lock and validate allocation (scoped strictly to v_effective_tenant)
  SELECT * INTO v_alloc
  FROM public.fin_payment_allocations
  WHERE id = p_allocation_id AND tenant_id = v_effective_tenant
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ALLOCATION_NOT_FOUND: Allocation % not found for tenant %', p_allocation_id, v_effective_tenant;
  END IF;

  -- 2. Idempotency / State validation
  IF v_alloc.status = 'SETTLED' THEN
    SELECT * INTO v_existing_settlement
    FROM public.fin_settlements
    WHERE tenant_id = v_effective_tenant AND allocation_id = p_allocation_id;

    IF FOUND THEN
      SELECT * INTO v_existing_event
      FROM public.accounting_events
      WHERE tenant_id = v_effective_tenant
        AND source_entity_type = 'fin_settlements'
        AND source_entity_id = v_existing_settlement.id;

      RETURN jsonb_build_object(
        'settlement_id', v_existing_settlement.id,
        'allocation_id', p_allocation_id,
        'status', v_existing_settlement.status,
        'settled_at', v_existing_settlement.settled_at,
        'accounting_event_id', v_existing_event.id,
        'amount', v_alloc.amount,
        'currency', v_alloc.currency,
        'is_duplicate', true
      );
    END IF;

    RAISE EXCEPTION 'ALREADY_SETTLED: Allocation % is already settled.', p_allocation_id;
  END IF;

  IF v_alloc.status != 'ALLOCATED' THEN
    RAISE EXCEPTION 'INVALID_STATE: Allocation % status is %, expected ALLOCATED', p_allocation_id, v_alloc.status;
  END IF;

  -- 3. Check for existing settlement record (concurrency guard)
  IF EXISTS (
    SELECT 1 FROM public.fin_settlements
    WHERE tenant_id = v_effective_tenant AND allocation_id = p_allocation_id
  ) THEN
    RAISE EXCEPTION 'DUPLICATE_SETTLEMENT: Settlement record already exists for allocation %', p_allocation_id;
  END IF;

  -- 4. Create Settlement record
  v_settled_at := NOW();
  INSERT INTO public.fin_settlements (
    tenant_id,
    allocation_id,
    status,
    settled_at,
    created_by,
    updated_by
  ) VALUES (
    v_effective_tenant,
    p_allocation_id,
    'SETTLED',
    v_settled_at,
    v_effective_user,
    v_effective_user
  )
  RETURNING id INTO v_settlement_id;

  -- 5. Transition allocation status to SETTLED
  UPDATE public.fin_payment_allocations
  SET status = 'SETTLED',
      updated_at = NOW(),
      updated_by = v_effective_user
  WHERE id = p_allocation_id AND tenant_id = v_effective_tenant;

  -- 6. Evaluate payment completion if applicable
  SELECT * INTO v_payment
  FROM public.fin_payments
  WHERE id = v_alloc.payment_id AND tenant_id = v_effective_tenant;

  IF FOUND THEN
    SELECT
      COALESCE(BOOL_AND(status = 'SETTLED'), false),
      COALESCE(SUM(amount), 0)
    INTO v_all_settled, v_total_allocated
    FROM public.fin_payment_allocations
    WHERE payment_id = v_alloc.payment_id
      AND tenant_id = v_effective_tenant
      AND status != 'REVERSED';

    IF v_all_settled AND v_total_allocated >= v_payment.amount THEN
      UPDATE public.fin_payments
      SET status = 'COMPLETED',
          updated_at = NOW(),
          updated_by = v_effective_user
      WHERE id = v_payment.id AND tenant_id = v_effective_tenant;
    END IF;
  END IF;

  -- 7. Create SETTLEMENT_COMPLETED accounting event
  v_event_idempotency := COALESCE(NULLIF(p_idempotency_key, ''), 'SETTLEMENT:' || p_allocation_id::text);

  INSERT INTO public.accounting_events (
    tenant_id,
    event_type,
    source_entity_type,
    source_entity_id,
    source_reference,
    accounting_date,
    currency,
    total_debit,
    total_credit,
    status,
    idempotency_key,
    created_by,
    updated_by
  ) VALUES (
    v_effective_tenant,
    'SETTLEMENT_COMPLETED'::com_accounting_event_type,
    'fin_settlements',
    v_settlement_id,
    'ALLOC:' || p_allocation_id::text,
    CURRENT_DATE,
    v_alloc.currency,
    v_alloc.amount,
    v_alloc.amount,
    'VALIDATED'::com_accounting_event_status,
    v_event_idempotency,
    v_effective_user,
    v_effective_user
  )
  RETURNING id INTO v_event_id;

  -- 8. Create exactly TWO balanced accounting lines (Ratified D1/D2 mapping)
  -- Line 1: DEBIT 1-11010 (Kas Bank)
  INSERT INTO public.accounting_event_lines (
    tenant_id,
    accounting_event_id,
    line_type,
    account_code,
    description,
    amount,
    currency,
    created_by,
    updated_by
  ) VALUES (
    v_effective_tenant,
    v_event_id,
    'DEBIT',
    '1-11010',
    'Kas Bank — Customer Payment Settlement',
    v_alloc.amount,
    v_alloc.currency,
    v_effective_user,
    v_effective_user
  );

  -- Line 2: CREDIT 1-10100 (Piutang Usaha)
  INSERT INTO public.accounting_event_lines (
    tenant_id,
    accounting_event_id,
    line_type,
    account_code,
    description,
    amount,
    currency,
    created_by,
    updated_by
  ) VALUES (
    v_effective_tenant,
    v_event_id,
    'CREDIT',
    '1-10100',
    'Piutang Usaha — Customer Receivable Settlement',
    v_alloc.amount,
    v_alloc.currency,
    v_effective_user,
    v_effective_user
  );

  -- 9. Return execution summary
  RETURN jsonb_build_object(
    'settlement_id', v_settlement_id,
    'allocation_id', p_allocation_id,
    'status', 'SETTLED',
    'settled_at', v_settled_at,
    'accounting_event_id', v_event_id,
    'amount', v_alloc.amount,
    'currency', v_alloc.currency,
    'is_duplicate', false
  );
END;
$$;

-- Security Privilege Enforcement
REVOKE ALL ON FUNCTION public.fn_settle_allocation_with_outbox(UUID, UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fn_settle_allocation_with_outbox(UUID, UUID, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.fn_settle_allocation_with_outbox(UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_settle_allocation_with_outbox(UUID, UUID, UUID, TEXT) TO service_role;

COMMIT;
