-- Migration: 20261005_003_settlement_outbox_atomic_rpc.sql
-- Description: Settlement -> Accounting Outbox Atomic Staging RPC (Phase 5D-3 / ADR-064 / ADR-067 / D2)
-- Ratified by: Human Architect Authorization, 2026-10-05 (Option A)
--
-- Target:
--   Function: public.fn_settle_allocation_with_outbox(p_tenant_id UUID, p_allocation_id UUID, p_user_id UUID, p_idempotency_key TEXT)
--
-- Purpose:
--   Couples Settlement commit and accounting outbox event creation into ONE atomic database transaction.
--   Enforces ratified mapping:
--     DEBIT:  1-11010 (Kas Bank)
--     CREDIT: 1-10100 (Piutang Usaha)
--     total_debit = total_credit = allocated_amount
--
-- Non-destructive / additive / idempotent.
-- Zero changes to existing data rows.

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
  -- 1. Lock and validate allocation
  SELECT * INTO v_alloc
  FROM public.fin_payment_allocations
  WHERE id = p_allocation_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ALLOCATION_NOT_FOUND: Allocation % not found for tenant %', p_allocation_id, p_tenant_id;
  END IF;

  -- 2. Idempotency / State validation
  IF v_alloc.status = 'SETTLED' THEN
    SELECT * INTO v_existing_settlement
    FROM public.fin_settlements
    WHERE tenant_id = p_tenant_id AND allocation_id = p_allocation_id;

    IF FOUND THEN
      SELECT * INTO v_existing_event
      FROM public.accounting_events
      WHERE tenant_id = p_tenant_id
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
    WHERE tenant_id = p_tenant_id AND allocation_id = p_allocation_id
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
    p_tenant_id,
    p_allocation_id,
    'SETTLED',
    v_settled_at,
    p_user_id,
    p_user_id
  )
  RETURNING id INTO v_settlement_id;

  -- 5. Transition allocation status to SETTLED
  UPDATE public.fin_payment_allocations
  SET status = 'SETTLED',
      updated_at = NOW(),
      updated_by = p_user_id
  WHERE id = p_allocation_id AND tenant_id = p_tenant_id;

  -- 6. Evaluate payment completion if applicable
  SELECT * INTO v_payment
  FROM public.fin_payments
  WHERE id = v_alloc.payment_id AND tenant_id = p_tenant_id;

  IF FOUND THEN
    SELECT
      COALESCE(BOOL_AND(status = 'SETTLED'), false),
      COALESCE(SUM(amount), 0)
    INTO v_all_settled, v_total_allocated
    FROM public.fin_payment_allocations
    WHERE payment_id = v_alloc.payment_id
      AND tenant_id = p_tenant_id
      AND status != 'REVERSED';

    IF v_all_settled AND v_total_allocated >= v_payment.amount THEN
      UPDATE public.fin_payments
      SET status = 'COMPLETED',
          updated_at = NOW(),
          updated_by = p_user_id
      WHERE id = v_payment.id AND tenant_id = p_tenant_id;
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
    p_tenant_id,
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
    p_user_id,
    p_user_id
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
    p_tenant_id,
    v_event_id,
    'DEBIT',
    '1-11010',
    'Kas Bank — Customer Payment Settlement',
    v_alloc.amount,
    v_alloc.currency,
    p_user_id,
    p_user_id
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
    p_tenant_id,
    v_event_id,
    'CREDIT',
    '1-10100',
    'Piutang Usaha — Customer Receivable Settlement',
    v_alloc.amount,
    v_alloc.currency,
    p_user_id,
    p_user_id
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

REVOKE ALL ON FUNCTION public.fn_settle_allocation_with_outbox(UUID, UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_settle_allocation_with_outbox(UUID, UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_settle_allocation_with_outbox(UUID, UUID, UUID, TEXT) TO service_role;

COMMIT;
