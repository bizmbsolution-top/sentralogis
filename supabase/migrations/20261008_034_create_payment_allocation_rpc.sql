-- Migration: 20261008_034_create_payment_allocation_rpc.sql
-- Description: Dedicated transactional payment allocation RPC (D-3.B, D-3.1, ADR-067/068)
-- Ratified by: Likas Sonada (Platform Owner / Human Architect), R2-C.4K-R / R2-C.4L / R2-C.4N
--
-- Invariants enforced atomically:
--   1. PostgREST session boundary hardening (matches 20261005_004 pattern).
--   2. Strict tenant isolation (reject cross-tenant arguments).
--   3. Row-level locks on fin_payments and fin_invoices (FOR UPDATE) in stable order to prevent deadlocks.
--   4. Validates positive payment states: status IN ('CONFIRMED', 'COMPLETED').
--   5. Validates positive invoice states: status IN ('ISSUED', 'PARTIAL_PAID').
--   6. Validates currency match: payment.currency = invoice.currency = p_currency.
--   7. Validates amount: p_amount > 0.
--   8. Validates payment unapplied balance: existing active allocations + p_amount <= payment.amount.
--   9. Validates invoice outstanding balance: existing active allocations + p_amount <= invoice.total_amount.
--  10. Inserts allocation row into fin_payment_allocations (status = 'ALLOCATED').
--  11. Reconciles invoice header: updates paid_amount, status ('PAID' if fully paid, 'PARTIAL_PAID' otherwise), paid_at.
--  12. Reconciles payment header: updates status to 'ALLOCATED' if payment unapplied balance is zero.
--  13. Maintains fin_ar_ap subledger if row exists.
--  14. Atomic all-or-nothing execution.

BEGIN;

CREATE OR REPLACE FUNCTION public.create_payment_allocation(
  p_tenant_id UUID,
  p_payment_id UUID,
  p_invoice_id UUID,
  p_amount NUMERIC,
  p_currency TEXT,
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
  v_payment RECORD;
  v_invoice RECORD;
  v_existing_alloc RECORD;
  v_existing_pay_alloc_total NUMERIC;
  v_existing_inv_alloc_total NUMERIC;
  v_new_invoice_paid NUMERIC;
  v_new_invoice_status TEXT;
  v_is_fully_paid BOOLEAN;
  v_paid_at TIMESTAMPTZ;
  v_allocation_id UUID;
  v_created_at TIMESTAMPTZ;
  v_ar_ap RECORD;
  v_ar_ap_balance NUMERIC;
  v_ar_ap_status TEXT;
BEGIN
  -- 0. Identity & Tenant Boundary Hardening (matches 20261005_004 pattern)
  v_calling_role := auth.role();
  v_session_user := auth.uid();

  IF v_calling_role = 'anon' THEN
    RAISE EXCEPTION 'FORBIDDEN: Anonymous execution not permitted';
  ELSIF v_calling_role = 'authenticated' THEN
    v_session_tenant := public.get_my_tenant_id();

    IF v_session_tenant IS NULL THEN
      RAISE EXCEPTION 'FORBIDDEN: User has no active tenant association';
    END IF;

    IF p_tenant_id IS NOT NULL AND p_tenant_id != v_session_tenant THEN
      RAISE EXCEPTION 'FORBIDDEN: Tenant mismatch between supplied p_tenant_id and session tenant';
    END IF;

    v_effective_tenant := v_session_tenant;

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

  -- 1. Input Validation
  IF p_payment_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: p_payment_id is required';
  END IF;

  IF p_invoice_id IS NULL THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: p_invoice_id is required';
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: Allocation amount must be greater than zero';
  END IF;

  IF p_currency IS NULL OR length(trim(p_currency)) = 0 THEN
    RAISE EXCEPTION 'INVALID_ARGUMENT: p_currency is required';
  END IF;

  -- 2. Concurrency-Safe Pessimistic Row Locks (Acquired in deterministic UUID order to prevent deadlock)
  -- Although payment and invoice are different tables, we lock payment then invoice.
  SELECT * INTO v_payment
  FROM public.fin_payments
  WHERE id = p_payment_id AND tenant_id = v_effective_tenant
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_NOT_FOUND: Payment % not found for tenant %', p_payment_id, v_effective_tenant;
  END IF;

  SELECT * INTO v_invoice
  FROM public.fin_invoices
  WHERE id = p_invoice_id AND tenant_id = v_effective_tenant
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVOICE_NOT_FOUND: Invoice % not found for tenant %', p_invoice_id, v_effective_tenant;
  END IF;

  -- 3. Business State Invariants
  -- Payment status positive set check: CONFIRMED or COMPLETED
  IF v_payment.status NOT IN ('CONFIRMED', 'COMPLETED') THEN
    RAISE EXCEPTION 'INVALID_STATE: Cannot allocate payment in status %. Expected CONFIRMED or COMPLETED', v_payment.status;
  END IF;

  -- Invoice status positive set check: ISSUED or PARTIAL_PAID
  IF v_invoice.status NOT IN ('ISSUED', 'PARTIAL_PAID') THEN
    RAISE EXCEPTION 'INVALID_STATE: Cannot allocate payment to invoice in status %. Expected ISSUED or PARTIAL_PAID', v_invoice.status;
  END IF;

  -- Currency equality check
  IF v_payment.currency != p_currency THEN
    RAISE EXCEPTION 'CURRENCY_MISMATCH: Payment currency (%) does not match requested currency (%)', v_payment.currency, p_currency;
  END IF;

  IF v_invoice.currency != p_currency THEN
    RAISE EXCEPTION 'CURRENCY_MISMATCH: Invoice currency (%) does not match requested currency (%)', v_invoice.currency, p_currency;
  END IF;

  -- 3.5. Concurrency-Safe Idempotency & Duplicate Protection (D-3.1, Ratified Boundary)
  -- The unique boundary is (tenant_id, payment_id, invoice_id) backed by uq_fin_payment_allocation.
  SELECT * INTO v_existing_alloc
  FROM public.fin_payment_allocations
  WHERE tenant_id = v_effective_tenant
    AND payment_id = p_payment_id
    AND invoice_id = p_invoice_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing_alloc.status IN ('ALLOCATED', 'SETTLED') THEN
      IF v_existing_alloc.amount = p_amount THEN
        -- Case B: Deterministic Idempotent Success (return existing allocation without re-mutation)
        RETURN jsonb_build_object(
          'id', v_existing_alloc.id,
          'tenant_id', v_existing_alloc.tenant_id,
          'payment_id', v_existing_alloc.payment_id,
          'invoice_id', v_existing_alloc.invoice_id,
          'amount', v_existing_alloc.amount,
          'currency', v_existing_alloc.currency,
          'status', v_existing_alloc.status,
          'created_at', v_existing_alloc.created_at,
          'updated_at', v_existing_alloc.updated_at,
          'created_by', v_existing_alloc.created_by,
          'updated_by', v_existing_alloc.updated_by,
          'invoice_paid_amount', v_invoice.paid_amount,
          'invoice_status', v_invoice.status,
          'is_idempotent', true
        );
      ELSE
        -- Case C: Deterministic Rejection (different amount on active allocation)
        RAISE EXCEPTION 'DUPLICATE_IDEMPOTENCY: Active allocation already exists for this payment and invoice with amount %, expected %',
          v_existing_alloc.amount, p_amount;
      END IF;
    ELSIF v_existing_alloc.status = 'REVERSED' THEN
      -- Case D: Deterministic Rejection (reversal cannot be overwritten or silently reused)
      RAISE EXCEPTION 'ALLOCATION_REVERSED: Allocation for this payment and invoice was previously REVERSED and cannot be reallocated';
    ELSE
      RAISE EXCEPTION 'INVALID_STATE: Existing allocation in status % cannot be mutated', v_existing_alloc.status;
    END IF;
  END IF;

  -- 4. Payment Unapplied Balance Check (Authoritative active allocations: ALLOCATED or SETTLED)
  SELECT COALESCE(SUM(amount), 0) INTO v_existing_pay_alloc_total
  FROM public.fin_payment_allocations
  WHERE payment_id = p_payment_id
    AND tenant_id = v_effective_tenant
    AND status IN ('ALLOCATED', 'SETTLED');

  IF (v_existing_pay_alloc_total + p_amount) > v_payment.amount THEN
    RAISE EXCEPTION 'ALLOCATION_EXCEEDS_PAYMENT: Allocation amount % exceeds available payment balance %',
      p_amount, (v_payment.amount - v_existing_pay_alloc_total);
  END IF;

  -- 5. Invoice Outstanding Balance Check (Authoritative active allocations: ALLOCATED or SETTLED)
  SELECT COALESCE(SUM(amount), 0) INTO v_existing_inv_alloc_total
  FROM public.fin_payment_allocations
  WHERE invoice_id = p_invoice_id
    AND tenant_id = v_effective_tenant
    AND status IN ('ALLOCATED', 'SETTLED');

  IF (v_existing_inv_alloc_total + p_amount) > v_invoice.total_amount THEN
    RAISE EXCEPTION 'ALLOCATION_EXCEEDS_INVOICE: Allocation amount % exceeds outstanding invoice balance %',
      p_amount, (v_invoice.total_amount - v_existing_inv_alloc_total);
  END IF;

  -- 6. Insert Allocation Record
  v_created_at := NOW();
  INSERT INTO public.fin_payment_allocations (
    tenant_id,
    payment_id,
    invoice_id,
    amount,
    currency,
    status,
    created_by,
    updated_by
  ) VALUES (
    v_effective_tenant,
    p_payment_id,
    p_invoice_id,
    p_amount,
    p_currency,
    'ALLOCATED',
    v_effective_user,
    v_effective_user
  )
  RETURNING id INTO v_allocation_id;

  -- 7. Domain Orchestration: Invoice Header Reconciliation
  v_new_invoice_paid := v_existing_inv_alloc_total + p_amount;
  v_is_fully_paid := (v_new_invoice_paid >= v_invoice.total_amount);
  v_new_invoice_status := CASE WHEN v_is_fully_paid THEN 'PAID' ELSE 'PARTIAL_PAID' END;
  v_paid_at := CASE WHEN v_is_fully_paid THEN v_created_at ELSE NULL END;

  UPDATE public.fin_invoices
  SET paid_amount = v_new_invoice_paid,
      status = v_new_invoice_status,
      paid_at = v_paid_at,
      updated_at = v_created_at,
      updated_by = v_effective_user
  WHERE id = p_invoice_id AND tenant_id = v_effective_tenant;

  -- 8. Domain Orchestration: AR/AP Subledger Reconciliation (if entry exists)
  SELECT * INTO v_ar_ap
  FROM public.fin_ar_ap
  WHERE invoice_id = p_invoice_id AND tenant_id = v_effective_tenant;

  IF FOUND THEN
    v_ar_ap_balance := GREATEST(0, v_ar_ap.total_amount - v_new_invoice_paid);
    v_ar_ap_status := CASE WHEN v_new_invoice_paid >= v_ar_ap.total_amount THEN 'PAID'
                           WHEN v_new_invoice_paid > 0 THEN 'PARTIAL_PAID'
                           ELSE 'INVOICED' END;

    UPDATE public.fin_ar_ap
    SET paid_amount = v_new_invoice_paid,
        balance_amount = v_ar_ap_balance,
        status = v_ar_ap_status,
        updated_at = v_created_at,
        updated_by = v_effective_user
    WHERE id = v_ar_ap.id AND tenant_id = v_effective_tenant;
  END IF;

  -- 9. Domain Orchestration: Payment Header Lifecycle Update
  IF (v_existing_pay_alloc_total + p_amount) >= v_payment.amount THEN
    UPDATE public.fin_payments
    SET status = 'ALLOCATED',
        updated_at = v_created_at,
        updated_by = v_effective_user
    WHERE id = p_payment_id AND tenant_id = v_effective_tenant;
  END IF;

  -- 10. Return Allocation Details
  RETURN jsonb_build_object(
    'id', v_allocation_id,
    'tenant_id', v_effective_tenant,
    'payment_id', p_payment_id,
    'invoice_id', p_invoice_id,
    'amount', p_amount,
    'currency', p_currency,
    'status', 'ALLOCATED',
    'created_at', v_created_at,
    'updated_at', v_created_at,
    'created_by', v_effective_user,
    'updated_by', v_effective_user,
    'invoice_paid_amount', v_new_invoice_paid,
    'invoice_status', v_new_invoice_status,
    'is_idempotent', false
  );
END;
$$;

-- Security Privilege Enforcement
REVOKE ALL ON FUNCTION public.create_payment_allocation(UUID, UUID, UUID, NUMERIC, TEXT, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_payment_allocation(UUID, UUID, UUID, NUMERIC, TEXT, UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_payment_allocation(UUID, UUID, UUID, NUMERIC, TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_payment_allocation(UUID, UUID, UUID, NUMERIC, TEXT, UUID, TEXT) TO service_role;

COMMIT;
