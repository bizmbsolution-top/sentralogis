-- ============================================================================
-- Migration: 20261012_035_work_order_mutation_audit_idempotency.sql
-- Description: Canonical schema contract & atomic mutation RPC for Work Order
--              mutation engine (Option C — Unified Idempotency Contract).
-- Ratified for: Phase 3C / 3D.4 Frozen Contract / Phase 3D.5 Implementation
--
-- Scope:
--   1. public.work_order_audit: append-only mutation audit log
--   2. public.work_order_idempotency: canonical idempotency lifecycle store
--   3. public.rpc_wo_mutation_execute_v1: atomic operational mutation boundary
--   4. Strict tenant isolation, RLS enabled, PostgREST direct access revoked
--   5. Execution granted strictly to service_role
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. WORK ORDER AUDIT LOG
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_order_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  actor_id UUID NOT NULL,
  command TEXT NOT NULL,
  target_id UUID NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('WORK_ORDER', 'WORK_ORDER_ITEM', 'JOB_ORDER')),
  previous_state JSONB NULL DEFAULT NULL,
  new_state JSONB NULL DEFAULT NULL,
  reason TEXT NULL DEFAULT NULL,
  correlation_id TEXT NULL DEFAULT NULL,
  idempotency_key TEXT NULL DEFAULT NULL,
  source TEXT NOT NULL DEFAULT 'unit2-canonical',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.work_order_audit IS
  'Phase 3C/3D: Append-only audit trail for operational work order mutations.';

CREATE INDEX IF NOT EXISTS idx_wo_audit_tenant_created
  ON public.work_order_audit (tenant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_wo_audit_target
  ON public.work_order_audit (tenant_id, target_type, target_id);

CREATE INDEX IF NOT EXISTS idx_wo_audit_idempotency
  ON public.work_order_audit (tenant_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

ALTER TABLE public.work_order_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_wo_audit_tenant_isolation ON public.work_order_audit;
CREATE POLICY p_wo_audit_tenant_isolation ON public.work_order_audit
  FOR ALL
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- ----------------------------------------------------------------------------
-- 2. WORK ORDER IDEMPOTENCY STORE (Option C Schema)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_order_idempotency (
  tenant_id UUID NOT NULL,
  idempotency_key TEXT NOT NULL,
  command TEXT NOT NULL,
  target_identity TEXT NULL,
  payload_hash TEXT NOT NULL,
  execution_status TEXT NOT NULL DEFAULT 'IN_PROGRESS'
    CHECK (execution_status IN ('IN_PROGRESS', 'COMPLETED')),
  result JSONB NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (timezone('utc'::text, now()) + interval '24 hours'),
  PRIMARY KEY (tenant_id, idempotency_key)
);

COMMENT ON TABLE public.work_order_idempotency IS
  'Phase 3C/3D Option C: Canonical two-phase idempotency lifecycle store for WO mutations.';

CREATE INDEX IF NOT EXISTS idx_wo_idempotency_lookup
  ON public.work_order_idempotency (tenant_id, idempotency_key, command);

CREATE INDEX IF NOT EXISTS idx_wo_idempotency_expiry
  ON public.work_order_idempotency (expires_at);

ALTER TABLE public.work_order_idempotency ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS p_wo_idempotency_tenant_isolation ON public.work_order_idempotency;
CREATE POLICY p_wo_idempotency_tenant_isolation ON public.work_order_idempotency
  FOR ALL
  USING (tenant_id = public.get_my_tenant_id())
  WITH CHECK (tenant_id = public.get_my_tenant_id());

-- ----------------------------------------------------------------------------
-- 3. ATOMIC OPERATIONAL MUTATION RPC (rpc_wo_mutation_execute_v1)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rpc_wo_mutation_execute_v1(
  p_tenant_id UUID,
  p_actor_id UUID,
  p_command TEXT,
  p_idempotency_key TEXT,
  p_payload_hash TEXT,
  p_target_identity TEXT,
  p_payload JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_now TIMESTAMPTZ := timezone('utc'::text, now());
  v_existing_idem RECORD;
  v_result JSONB;
  v_audit_id UUID;

  -- WO_CREATE variables
  v_wo_id UUID;
  v_wo_number TEXT;
  v_customer_id UUID;
  v_sales_order_id UUID;
  v_so RECORD;
  v_eng RECORD;
  v_wo_status TEXT;
  v_order_date DATE;
  v_exec_date DATE;
  v_exec_time TEXT;
  v_target_date DATE;
  v_notes TEXT;
  v_transporter_id UUID;
  v_region_id UUID;
  v_order_time TEXT;
  v_wo_prev JSONB;
  v_wo_new JSONB;

  -- WO_UPDATE / WO_TRANSITION / WO_CANCEL / WO_COMMITMENT_UPDATE variables
  v_target_wo RECORD;
  v_new_status TEXT;
  v_cancel_reason TEXT;

  -- WO_ITEM_UPSERT variables
  v_items_array JSONB;
  v_item_elem JSONB;
  v_item_idx INT;
  v_client_key TEXT;
  v_item_id_in UUID;
  v_item_code TEXT;
  v_sbu_type TEXT;
  v_max_jo INT;
  v_unit_price NUMERIC;
  v_total_revenue NUMERIC;
  v_item_status TEXT;
  v_item_data JSONB;
  v_manifests JSONB;
  v_m_elem JSONB;
  v_target_item_id UUID;
  v_item_results JSONB := '[]'::jsonb;
  v_existing_item RECORD;

  -- JO_CREATE variables
  v_jo_number TEXT;
  v_wo_item_id UUID;
  v_target_wo_item RECORD;
  v_parent_wo RECORD;
  v_existing_jo RECORD;
  v_jo_id UUID;
  v_jo_status TEXT;
  v_total_stops INT;
  v_routes JSONB;
  v_r_elem JSONB;
BEGIN
  -- Strict argument validation
  IF p_tenant_id IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED: tenant_id is required' USING ERRCODE = '22023';
  END IF;
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'VALIDATION_FAILED: actor_id is required' USING ERRCODE = '22023';
  END IF;
  IF p_command IS NULL OR trim(p_command) = '' THEN
    RAISE EXCEPTION 'VALIDATION_FAILED: command is required' USING ERRCODE = '22023';
  END IF;
  IF p_idempotency_key IS NULL OR trim(p_idempotency_key) = '' THEN
    RAISE EXCEPTION 'VALIDATION_FAILED: idempotency_key is required' USING ERRCODE = '22023';
  END IF;
  IF p_payload_hash IS NULL OR trim(p_payload_hash) = '' THEN
    RAISE EXCEPTION 'VALIDATION_FAILED: payload_hash is required' USING ERRCODE = '22023';
  END IF;

  -- --------------------------------------------------------------------------
  -- STEP A: TWO-PHASE IDEMPOTENCY CLAIM
  -- --------------------------------------------------------------------------
  LOOP
    SELECT * INTO v_existing_idem
    FROM public.work_order_idempotency
    WHERE tenant_id = p_tenant_id AND idempotency_key = p_idempotency_key
    FOR UPDATE;

    IF FOUND THEN
      -- Check payload mismatch conflict
      IF v_existing_idem.payload_hash <> p_payload_hash OR v_existing_idem.command <> p_command THEN
        RAISE EXCEPTION 'IDEMPOTENCY_CONFLICT: Idempotency key already used with different payload or command'
          USING ERRCODE = 'P0002';
      END IF;

      -- If completed, return cached result immediately
      IF v_existing_idem.execution_status = 'COMPLETED' THEN
        RETURN v_existing_idem.result;
      ELSIF v_existing_idem.execution_status = 'IN_PROGRESS' THEN
        -- In-progress concurrent execution
        RAISE EXCEPTION 'OPERATION_IN_PROGRESS: Request with this idempotency key is currently executing'
          USING ERRCODE = 'P0003';
      END IF;
    ELSE
      -- Insert IN_PROGRESS marker with concurrency conflict catch
      BEGIN
        INSERT INTO public.work_order_idempotency (
          tenant_id,
          idempotency_key,
          command,
          target_identity,
          payload_hash,
          execution_status,
          created_at,
          updated_at
        ) VALUES (
          p_tenant_id,
          p_idempotency_key,
          p_command,
          p_target_identity,
          p_payload_hash,
          'IN_PROGRESS',
          v_now,
          v_now
        );
        EXIT; -- Successfully inserted and claimed
      EXCEPTION WHEN unique_violation THEN
        -- Concurrently inserted by another worker: loop and re-select FOR UPDATE
        CONTINUE;
      END;
    END IF;
  END LOOP;

  -- --------------------------------------------------------------------------
  -- STEP B: EXECUTE BUSINESS MUTATION UNDER ATOMIC TRANSACTION
  -- --------------------------------------------------------------------------
  IF p_command = 'WO_CREATE' THEN
    v_wo_number := trim(p_payload->>'woNumber');
    v_customer_id := (p_payload->>'customerId')::UUID;
    v_sales_order_id := (p_payload->>'salesOrderId')::UUID;

    IF v_wo_number IS NULL OR v_wo_number = '' THEN
      RAISE EXCEPTION 'VALIDATION_FAILED: woNumber is required' USING ERRCODE = '22023';
    END IF;
    IF v_customer_id IS NULL THEN
      RAISE EXCEPTION 'VALIDATION_FAILED: customerId is required' USING ERRCODE = '22023';
    END IF;
    IF v_sales_order_id IS NULL THEN
      RAISE EXCEPTION 'SO_REQUIRED: salesOrderId is required for WO_CREATE' USING ERRCODE = '22023';
    END IF;

    -- Validate SO eligibility (same tenant)
    SELECT * INTO v_so
    FROM public.sales_orders
    WHERE id = v_sales_order_id AND tenant_id = p_tenant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'SO_NOT_FOUND: Sales order not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_so.status::text NOT IN ('CONFIRMED', 'IN_FULFILLMENT', 'PARTIALLY_FULFILLED') THEN
      RAISE EXCEPTION 'SO_STATUS_INELIGIBLE: Sales order status "%" is not eligible for new work order creation.', v_so.status
        USING ERRCODE = 'P0001';
    END IF;

    -- Customer consistency check
    SELECT * INTO v_eng
    FROM public.commercial_work_orders
    WHERE id = v_so.engagement_id AND tenant_id = p_tenant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'SO_NOT_FOUND: Sales order lineage could not be resolved' USING ERRCODE = 'P0002';
    END IF;

    IF v_eng.customer_id <> v_customer_id THEN
      RAISE EXCEPTION 'SO_CUSTOMER_MISMATCH: Sales order customer does not match the work order customer'
        USING ERRCODE = 'P0001';
    END IF;

    -- Check duplicate WO number
    IF EXISTS (
      SELECT 1 FROM public.work_orders
      WHERE tenant_id = p_tenant_id AND wo_number = v_wo_number
    ) THEN
      RAISE EXCEPTION 'DUPLICATE: Work order number already exists' USING ERRCODE = '23505';
    END IF;

    v_wo_id := gen_random_uuid();
    v_wo_status := COALESCE(p_payload->>'status', 'draft');
    v_order_date := (p_payload->>'orderDate')::DATE;
    v_exec_date := (p_payload->>'executionDate')::DATE;
    v_exec_time := p_payload->>'executionTime';
    v_target_date := (p_payload->>'targetFulfillmentDate')::DATE;
    v_notes := p_payload->>'notes';
    v_transporter_id := (p_payload->>'transporterId')::UUID;
    v_region_id := (p_payload->>'regionId')::UUID;

    INSERT INTO public.work_orders (
      id,
      tenant_id,
      wo_number,
      customer_id,
      status,
      order_date,
      execution_date,
      execution_time,
      target_fulfillment_date,
      notes,
      transporter_id,
      region_id,
      created_by,
      updated_by,
      created_at,
      updated_at
    ) VALUES (
      v_wo_id,
      p_tenant_id,
      v_wo_number,
      v_customer_id,
      v_wo_status,
      v_order_date,
      v_exec_date,
      v_exec_time,
      v_target_date,
      v_notes,
      v_transporter_id,
      v_region_id,
      p_actor_id,
      p_actor_id,
      v_now,
      v_now
    );

    v_wo_new := jsonb_build_object(
      'woNumber', v_wo_number,
      'customerId', v_customer_id,
      'salesOrderId', v_sales_order_id,
      'status', v_wo_status,
      'orderDate', v_order_date,
      'executionDate', v_exec_date,
      'executionTime', v_exec_time,
      'targetFulfillmentDate', v_target_date,
      'notes', v_notes,
      'transporterId', v_transporter_id,
      'createdAt', v_now,
      'updatedAt', v_now
    );

    v_audit_id := gen_random_uuid();
    INSERT INTO public.work_order_audit (
      id,
      tenant_id,
      actor_id,
      command,
      target_id,
      target_type,
      previous_state,
      new_state,
      reason,
      correlation_id,
      idempotency_key,
      source,
      created_at
    ) VALUES (
      v_audit_id,
      p_tenant_id,
      p_actor_id,
      'WO_CREATE',
      v_wo_id,
      'WORK_ORDER',
      '{}'::jsonb,
      v_wo_new,
      p_payload->>'reason',
      p_payload->>'correlationId',
      p_idempotency_key,
      'unit2-canonical',
      v_now
    );

    v_result := jsonb_build_object(
      'success', true,
      'outcome', 'SUCCEEDED',
      'stages', jsonb_build_array(
        jsonb_build_object('stage', 'work_order', 'status', 'SUCCEEDED', 'id', v_wo_id),
        jsonb_build_object('stage', 'audit', 'status', 'SUCCEEDED', 'id', v_audit_id),
        jsonb_build_object('stage', 'idempotency', 'status', 'SUCCEEDED')
      ),
      'workOrder', jsonb_build_object(
        'id', v_wo_id,
        'tenantId', p_tenant_id,
        'woNumber', v_wo_number,
        'customerId', v_customer_id,
        'customerName', NULL,
        'status', v_wo_status,
        'orderDate', v_order_date,
        'executionDate', v_exec_date,
        'executionTime', v_exec_time,
        'targetFulfillmentDate', v_target_date,
        'notes', v_notes,
        'transporterId', v_transporter_id,
        'createdAt', v_now,
        'updatedAt', v_now,
        'createdBy', p_actor_id,
        'assignedAt', NULL,
        'submittedAt', NULL,
        'completedAt', NULL
      ),
      'auditId', v_audit_id
    );

  ELSIF p_command = 'WO_UPDATE' THEN
    v_wo_id := (p_payload->>'workOrderId')::UUID;
    IF v_wo_id IS NULL THEN
      RAISE EXCEPTION 'VALIDATION_FAILED: workOrderId is required' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_target_wo
    FROM public.work_orders
    WHERE id = v_wo_id AND tenant_id = p_tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_FOUND: Work order not found' USING ERRCODE = 'P0002';
    END IF;

    v_wo_prev := to_jsonb(v_target_wo);

    UPDATE public.work_orders
    SET
      wo_number = COALESCE(p_payload->>'woNumber', wo_number),
      customer_id = COALESCE((p_payload->>'customerId')::UUID, customer_id),
      status = COALESCE(p_payload->>'status', status),
      order_date = COALESCE((p_payload->>'orderDate')::DATE, order_date),
      execution_date = COALESCE((p_payload->>'executionDate')::DATE, execution_date),
      execution_time = COALESCE(p_payload->>'executionTime', execution_time),
      target_fulfillment_date = COALESCE((p_payload->>'targetFulfillmentDate')::DATE, target_fulfillment_date),
      notes = COALESCE(p_payload->>'notes', notes),
      transporter_id = COALESCE((p_payload->>'transporterId')::UUID, transporter_id),
      updated_by = p_actor_id,
      updated_at = v_now
    WHERE id = v_wo_id AND tenant_id = p_tenant_id
    RETURNING * INTO v_target_wo;

    v_wo_new := to_jsonb(v_target_wo);
    v_audit_id := gen_random_uuid();

    INSERT INTO public.work_order_audit (
      id,
      tenant_id,
      actor_id,
      command,
      target_id,
      target_type,
      previous_state,
      new_state,
      reason,
      correlation_id,
      idempotency_key,
      source,
      created_at
    ) VALUES (
      v_audit_id,
      p_tenant_id,
      p_actor_id,
      'WO_UPDATE',
      v_wo_id,
      'WORK_ORDER',
      v_wo_prev,
      v_wo_new,
      p_payload->>'reason',
      p_payload->>'correlationId',
      p_idempotency_key,
      'unit2-canonical',
      v_now
    );

    v_result := jsonb_build_object(
      'success', true,
      'workOrder', v_wo_new,
      'auditId', v_audit_id
    );

  ELSIF p_command = 'WO_TRANSITION' THEN
    v_wo_id := (p_payload->>'workOrderId')::UUID;
    v_new_status := trim(p_payload->>'newStatus');

    IF v_wo_id IS NULL THEN
      RAISE EXCEPTION 'VALIDATION_FAILED: workOrderId is required' USING ERRCODE = '22023';
    END IF;
    IF v_new_status IS NULL OR v_new_status = '' THEN
      RAISE EXCEPTION 'VALIDATION_FAILED: newStatus is required' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_target_wo
    FROM public.work_orders
    WHERE id = v_wo_id AND tenant_id = p_tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_FOUND: Work order not found' USING ERRCODE = 'P0002';
    END IF;

    v_wo_prev := jsonb_build_object('status', v_target_wo.status);

    UPDATE public.work_orders
    SET status = v_new_status, updated_by = p_actor_id, updated_at = v_now
    WHERE id = v_wo_id AND tenant_id = p_tenant_id
    RETURNING * INTO v_target_wo;

    v_wo_new := jsonb_build_object('status', v_new_status);
    v_audit_id := gen_random_uuid();

    INSERT INTO public.work_order_audit (
      id,
      tenant_id,
      actor_id,
      command,
      target_id,
      target_type,
      previous_state,
      new_state,
      reason,
      correlation_id,
      idempotency_key,
      source,
      created_at
    ) VALUES (
      v_audit_id,
      p_tenant_id,
      p_actor_id,
      'WO_TRANSITION',
      v_wo_id,
      'WORK_ORDER',
      v_wo_prev,
      v_wo_new,
      p_payload->>'reason',
      p_payload->>'correlationId',
      p_idempotency_key,
      'unit2-canonical',
      v_now
    );

    v_result := jsonb_build_object(
      'success', true,
      'workOrder', to_jsonb(v_target_wo),
      'auditId', v_audit_id
    );

  ELSIF p_command = 'WO_CANCEL' THEN
    v_wo_id := (p_payload->>'workOrderId')::UUID;
    v_cancel_reason := trim(p_payload->>'reason');

    IF v_wo_id IS NULL THEN
      RAISE EXCEPTION 'VALIDATION_FAILED: workOrderId is required' USING ERRCODE = '22023';
    END IF;
    IF v_cancel_reason IS NULL OR v_cancel_reason = '' THEN
      RAISE EXCEPTION 'VALIDATION_FAILED: reason is required' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_target_wo
    FROM public.work_orders
    WHERE id = v_wo_id AND tenant_id = p_tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_FOUND: Work order not found' USING ERRCODE = 'P0002';
    END IF;

    v_wo_prev := jsonb_build_object('status', v_target_wo.status);

    UPDATE public.work_orders
    SET status = 'cancelled', updated_by = p_actor_id, updated_at = v_now
    WHERE id = v_wo_id AND tenant_id = p_tenant_id
    RETURNING * INTO v_target_wo;

    v_wo_new := jsonb_build_object('status', 'cancelled', 'cancelReason', v_cancel_reason);
    v_audit_id := gen_random_uuid();

    INSERT INTO public.work_order_audit (
      id,
      tenant_id,
      actor_id,
      command,
      target_id,
      target_type,
      previous_state,
      new_state,
      reason,
      correlation_id,
      idempotency_key,
      source,
      created_at
    ) VALUES (
      v_audit_id,
      p_tenant_id,
      p_actor_id,
      'WO_CANCEL',
      v_wo_id,
      'WORK_ORDER',
      v_wo_prev,
      v_wo_new,
      v_cancel_reason,
      p_payload->>'correlationId',
      p_idempotency_key,
      'unit2-canonical',
      v_now
    );

    v_result := jsonb_build_object(
      'success', true,
      'workOrder', to_jsonb(v_target_wo),
      'auditId', v_audit_id
    );

  ELSIF p_command = 'WO_COMMITMENT_UPDATE' THEN
    v_wo_id := (p_payload->>'workOrderId')::UUID;
    IF v_wo_id IS NULL THEN
      RAISE EXCEPTION 'VALIDATION_FAILED: workOrderId is required' USING ERRCODE = '22023';
    END IF;

    SELECT * INTO v_target_wo
    FROM public.work_orders
    WHERE id = v_wo_id AND tenant_id = p_tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_FOUND: Work order not found' USING ERRCODE = 'P0002';
    END IF;

    v_wo_prev := jsonb_build_object(
      'notes', v_target_wo.notes
    );

    UPDATE public.work_orders
    SET
      notes = COALESCE(p_payload->>'notes', notes),
      updated_by = p_actor_id,
      updated_at = v_now
    WHERE id = v_wo_id AND tenant_id = p_tenant_id
    RETURNING * INTO v_target_wo;

    v_wo_new := jsonb_build_object('notes', v_target_wo.notes);
    v_audit_id := gen_random_uuid();

    INSERT INTO public.work_order_audit (
      id,
      tenant_id,
      actor_id,
      command,
      target_id,
      target_type,
      previous_state,
      new_state,
      reason,
      correlation_id,
      idempotency_key,
      source,
      created_at
    ) VALUES (
      v_audit_id,
      p_tenant_id,
      p_actor_id,
      'WO_COMMITMENT_UPDATE',
      v_wo_id,
      'WORK_ORDER',
      v_wo_prev,
      v_wo_new,
      p_payload->>'reason',
      p_payload->>'correlationId',
      p_idempotency_key,
      'unit2-canonical',
      v_now
    );

    v_result := jsonb_build_object(
      'success', true,
      'workOrder', to_jsonb(v_target_wo),
      'auditId', v_audit_id
    );

  ELSIF p_command = 'WO_ITEM_UPSERT' THEN
    v_wo_id := (p_payload->>'workOrderId')::UUID;
    v_items_array := p_payload->'items';

    IF v_wo_id IS NULL THEN
      RAISE EXCEPTION 'VALIDATION_FAILED: workOrderId is required' USING ERRCODE = '22023';
    END IF;
    IF v_items_array IS NULL OR jsonb_array_length(v_items_array) = 0 THEN
      RAISE EXCEPTION 'VALIDATION_FAILED: items array is required' USING ERRCODE = '22023';
    END IF;

    -- Validate parent WO ownership
    SELECT * INTO v_parent_wo
    FROM public.work_orders
    WHERE id = v_wo_id AND tenant_id = p_tenant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_FOUND: Work order not found' USING ERRCODE = 'P0002';
    END IF;

    FOR v_item_idx IN 0..(jsonb_array_length(v_items_array) - 1) LOOP
      v_item_elem := v_items_array->v_item_idx;
      v_client_key := v_item_elem->>'clientKey';
      v_item_id_in := (v_item_elem->>'id')::UUID;
      v_item_code := v_item_elem->>'itemCode';
      v_sbu_type := COALESCE(v_item_elem->>'sbuType', 'TRUCKING');
      v_max_jo := COALESCE((v_item_elem->>'maxJoCount')::INT, 1);
      v_unit_price := COALESCE((v_item_elem->>'unitPrice')::NUMERIC, 0);
      v_total_revenue := COALESCE((v_item_elem->>'totalRevenue')::NUMERIC, 0);
      v_item_status := COALESCE(v_item_elem->>'status', 'pending');
      v_item_data := COALESCE(v_item_elem->'itemData', '{}'::jsonb);
      v_manifests := v_item_elem->'manifests';

      IF v_client_key IS NULL OR trim(v_client_key) = '' THEN
        RAISE EXCEPTION 'VALIDATION_FAILED: clientKey is required on item index %', v_item_idx USING ERRCODE = '22023';
      END IF;

      IF v_item_id_in IS NOT NULL THEN
        -- Update path
        SELECT * INTO v_existing_item
        FROM public.wo_items
        WHERE id = v_item_id_in AND tenant_id = p_tenant_id
        FOR UPDATE;

        IF NOT FOUND OR v_existing_item.wo_id <> v_wo_id THEN
          RAISE EXCEPTION 'NOT_FOUND: Referenced work order item not found for this tenant/work order' USING ERRCODE = 'P0002';
        END IF;

        v_target_item_id := v_item_id_in;

        UPDATE public.wo_items
        SET
          item_code = COALESCE(v_item_code, item_code),
          sbu_type = v_sbu_type,
          max_jo_count = v_max_jo,
          unit_price = v_unit_price,
          total_revenue = v_total_revenue,
          status = v_item_status,
          item_data = v_item_data,
          updated_at = v_now
        WHERE id = v_target_item_id AND tenant_id = p_tenant_id;
      ELSE
        -- Insert path
        v_target_item_id := gen_random_uuid();
        INSERT INTO public.wo_items (
          id,
          tenant_id,
          wo_id,
          item_code,
          sbu_type,
          max_jo_count,
          unit_price,
          total_revenue,
          status,
          item_data,
          created_at,
          updated_at
        ) VALUES (
          v_target_item_id,
          p_tenant_id,
          v_wo_id,
          COALESCE(v_item_code, 'ITEM-' || substr(v_target_item_id::text, 1, 8)),
          v_sbu_type,
          v_max_jo,
          v_unit_price,
          v_total_revenue,
          v_item_status,
          v_item_data,
          v_now,
          v_now
        );
      END IF;

      -- Conditional manifests replacement
      IF v_manifests IS NOT NULL AND jsonb_typeof(v_manifests) = 'array' THEN
        DELETE FROM public.wo_item_manifests
        WHERE wo_item_id = v_target_item_id AND tenant_id = p_tenant_id;

        IF jsonb_array_length(v_manifests) > 0 THEN
          FOR v_m_elem IN SELECT * FROM jsonb_array_elements(v_manifests) LOOP
            INSERT INTO public.wo_item_manifests (
              id,
              tenant_id,
              wo_item_id,
              product_sku_id,
              quantity,
              unit_weight_kg,
              unit_volume_m3,
              notes,
              custom_fields,
              created_at,
              updated_at
            ) VALUES (
              gen_random_uuid(),
              p_tenant_id,
              v_target_item_id,
              (v_m_elem->>'productSkuId')::UUID,
              COALESCE((v_m_elem->>'quantity')::NUMERIC, 1),
              COALESCE((v_m_elem->>'unitWeightKg')::NUMERIC, 0),
              COALESCE((v_m_elem->>'unitVolumeM3')::NUMERIC, 0),
              v_m_elem->>'notes',
              jsonb_build_object(
                'location_code', v_m_elem->>'locationCode',
                'inventory_id', v_m_elem->>'inventoryId',
                'batch_number', v_m_elem->>'batchNumber',
                'earliest_expiry', v_m_elem->>'earliestExpiry'
              ),
              v_now,
              v_now
            );
          END LOOP;
        END IF;
      END IF;

      v_item_results := v_item_results || jsonb_build_object(
        'clientKey', v_client_key,
        'id', v_target_item_id,
        'status', 'SUCCEEDED'
      );
    END LOOP;

    v_audit_id := gen_random_uuid();
    INSERT INTO public.work_order_audit (
      id,
      tenant_id,
      actor_id,
      command,
      target_id,
      target_type,
      previous_state,
      new_state,
      reason,
      correlation_id,
      idempotency_key,
      source,
      created_at
    ) VALUES (
      v_audit_id,
      p_tenant_id,
      p_actor_id,
      'WO_ITEM_UPSERT',
      v_wo_id,
      'WORK_ORDER_ITEM',
      '{}'::jsonb,
      jsonb_build_object('results', v_item_results),
      p_payload->>'reason',
      p_payload->>'correlationId',
      p_idempotency_key,
      'unit2-canonical',
      v_now
    );

    v_result := jsonb_build_object(
      'success', true,
      'outcome', 'SUCCEEDED',
      'items', v_item_results,
      'stages', jsonb_build_array(
        jsonb_build_object('stage', 'items', 'status', 'SUCCEEDED'),
        jsonb_build_object('stage', 'audit', 'status', 'SUCCEEDED', 'id', v_audit_id),
        jsonb_build_object('stage', 'idempotency', 'status', 'SUCCEEDED')
      ),
      'auditId', v_audit_id
    );

  ELSIF p_command = 'JO_CREATE' THEN
    v_wo_item_id := (p_payload->>'woItemId')::UUID;
    v_jo_number := trim(p_payload->>'joNumber');
    v_jo_status := COALESCE(p_payload->>'status', 'pending');
    v_sbu_type := p_payload->>'sbuType';
    v_total_stops := (p_payload->>'totalStops')::INT;
    v_routes := p_payload->'routes';

    IF v_wo_item_id IS NULL THEN
      RAISE EXCEPTION 'VALIDATION_FAILED: woItemId is required' USING ERRCODE = '22023';
    END IF;
    IF v_jo_number IS NULL OR v_jo_number = '' THEN
      RAISE EXCEPTION 'VALIDATION_FAILED: joNumber is required' USING ERRCODE = '22023';
    END IF;

    -- Validate wo_item and parent wo within tenant
    SELECT * INTO v_target_wo_item
    FROM public.wo_items
    WHERE id = v_wo_item_id AND tenant_id = p_tenant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_FOUND: Work order item not found' USING ERRCODE = 'P0002';
    END IF;

    SELECT * INTO v_parent_wo
    FROM public.work_orders
    WHERE id = v_target_wo_item.wo_id AND tenant_id = p_tenant_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'NOT_FOUND: Work order item is not linked to a work order in this tenant' USING ERRCODE = 'P0002';
    END IF;

    -- Check natural-key readback (UNIQUE(tenant_id, jo_number))
    SELECT * INTO v_existing_jo
    FROM public.job_orders
    WHERE tenant_id = p_tenant_id AND jo_number = v_jo_number
    FOR UPDATE;

    IF FOUND THEN
      IF v_existing_jo.wo_item_id <> v_wo_item_id THEN
        RAISE EXCEPTION 'DUPLICATE: Job order number already exists for a different work order item' USING ERRCODE = '23505';
      END IF;

      -- Idempotent readback reconciliation (preserve existing JO fields)
      v_jo_id := v_existing_jo.id;

      IF v_routes IS NOT NULL AND jsonb_typeof(v_routes) = 'array' THEN
        DELETE FROM public.job_routes WHERE job_order_id = v_jo_id;
        IF jsonb_array_length(v_routes) > 0 THEN
          FOR v_r_elem IN SELECT * FROM jsonb_array_elements(v_routes) LOOP
            INSERT INTO public.job_routes (
              id,
              job_order_id,
              sequence,
              stop_type,
              source_type,
              source_id,
              location_name,
              address,
              latitude,
              longitude,
              contact_name,
              contact_phone,
              status,
              created_at,
              updated_at
            ) VALUES (
              gen_random_uuid(),
              v_jo_id,
              COALESCE((v_r_elem->>'sequence')::INT, 0),
              COALESCE(v_r_elem->>'stopType', 'DROPOFF'),
              COALESCE(v_r_elem->>'sourceType', 'MD_LOCATION'),
              COALESCE(v_r_elem->>'sourceId', 'N/A'),
              COALESCE(v_r_elem->>'locationName', 'Unknown Location'),
              COALESCE(v_r_elem->>'address', ''),
              (v_r_elem->>'latitude')::NUMERIC,
              (v_r_elem->>'longitude')::NUMERIC,
              COALESCE(v_r_elem->>'contactName', ''),
              COALESCE(v_r_elem->>'contactPhone', ''),
              COALESCE(v_r_elem->>'status', 'pending'),
              v_now,
              v_now
            );
          END LOOP;
        END IF;
      END IF;

      v_audit_id := gen_random_uuid();
      INSERT INTO public.work_order_audit (
        id,
        tenant_id,
        actor_id,
        command,
        target_id,
        target_type,
        previous_state,
        new_state,
        reason,
        correlation_id,
        idempotency_key,
        source,
        created_at
      ) VALUES (
        v_audit_id,
        p_tenant_id,
        p_actor_id,
        'JO_CREATE',
        v_jo_id,
        'JOB_ORDER',
        jsonb_build_object('joNumber', v_existing_jo.jo_number, 'woItemId', v_existing_jo.wo_item_id, 'reconciled', true),
        jsonb_build_object('joNumber', v_jo_number, 'woItemId', v_wo_item_id, 'reconciled', true),
        COALESCE(p_payload->>'reason', 'Natural-key reconciliation'),
        p_payload->>'correlationId',
        p_idempotency_key,
        'unit2-canonical',
        v_now
      );

      v_result := jsonb_build_object(
        'success', true,
        'outcome', 'SUCCEEDED',
        'stages', jsonb_build_array(
          jsonb_build_object('stage', 'readback', 'status', 'SUCCEEDED', 'id', v_jo_id),
          jsonb_build_object('stage', 'routes', 'status', 'SUCCEEDED'),
          jsonb_build_object('stage', 'audit', 'status', 'SUCCEEDED', 'id', v_audit_id),
          jsonb_build_object('stage', 'idempotency', 'status', 'SUCCEEDED')
        ),
        'auditId', v_audit_id
      );
    ELSE
      -- New JO creation
      v_jo_id := gen_random_uuid();
      INSERT INTO public.job_orders (
        id,
        tenant_id,
        wo_item_id,
        jo_number,
        status,
        sbu_type,
        total_stops,
        created_at,
        updated_at
      ) VALUES (
        v_jo_id,
        p_tenant_id,
        v_wo_item_id,
        v_jo_number,
        v_jo_status,
        COALESCE(v_sbu_type, v_target_wo_item.sbu_type::text, 'TRUCKING'),
        COALESCE(v_total_stops, 0),
        v_now,
        v_now
      );

      IF v_routes IS NOT NULL AND jsonb_typeof(v_routes) = 'array' AND jsonb_array_length(v_routes) > 0 THEN
        FOR v_r_elem IN SELECT * FROM jsonb_array_elements(v_routes) LOOP
          INSERT INTO public.job_routes (
            id,
            job_order_id,
            sequence,
            stop_type,
            source_type,
            source_id,
            location_name,
            address,
            latitude,
            longitude,
            contact_name,
            contact_phone,
            status,
            created_at,
            updated_at
          ) VALUES (
            gen_random_uuid(),
            v_jo_id,
            COALESCE((v_r_elem->>'sequence')::INT, 0),
            COALESCE(v_r_elem->>'stopType', 'DROPOFF'),
            COALESCE(v_r_elem->>'sourceType', 'MD_LOCATION'),
            COALESCE(v_r_elem->>'sourceId', 'N/A'),
            COALESCE(v_r_elem->>'locationName', 'Unknown Location'),
            COALESCE(v_r_elem->>'address', ''),
            (v_r_elem->>'latitude')::NUMERIC,
            (v_r_elem->>'longitude')::NUMERIC,
            COALESCE(v_r_elem->>'contactName', ''),
            COALESCE(v_r_elem->>'contactPhone', ''),
            COALESCE(v_r_elem->>'status', 'pending'),
            v_now,
            v_now
          );
        END LOOP;
      END IF;

      v_audit_id := gen_random_uuid();
      INSERT INTO public.work_order_audit (
        id,
        tenant_id,
        actor_id,
        command,
        target_id,
        target_type,
        previous_state,
        new_state,
        reason,
        correlation_id,
        idempotency_key,
        source,
        created_at
      ) VALUES (
        v_audit_id,
        p_tenant_id,
        p_actor_id,
        'JO_CREATE',
        v_jo_id,
        'JOB_ORDER',
        '{}'::jsonb,
        jsonb_build_object('joNumber', v_jo_number, 'woItemId', v_wo_item_id),
        p_payload->>'reason',
        p_payload->>'correlationId',
        p_idempotency_key,
        'unit2-canonical',
        v_now
      );

      v_result := jsonb_build_object(
        'success', true,
        'outcome', 'SUCCEEDED',
        'stages', jsonb_build_array(
          jsonb_build_object('stage', 'job_order', 'status', 'SUCCEEDED', 'id', v_jo_id),
          jsonb_build_object('stage', 'routes', 'status', 'SUCCEEDED'),
          jsonb_build_object('stage', 'audit', 'status', 'SUCCEEDED', 'id', v_audit_id),
          jsonb_build_object('stage', 'idempotency', 'status', 'SUCCEEDED')
        ),
        'auditId', v_audit_id
      );
    END IF;

  ELSE
    RAISE EXCEPTION 'UNKNOWN_COMMAND: Unknown mutation command "%"', p_command USING ERRCODE = '22023';
  END IF;

  -- --------------------------------------------------------------------------
  -- STEP C: FINALIZE IDEMPOTENCY RECORD WITH COMPLETED RESULT
  -- --------------------------------------------------------------------------
  UPDATE public.work_order_idempotency
  SET
    execution_status = 'COMPLETED',
    result = v_result,
    updated_at = v_now
  WHERE tenant_id = p_tenant_id AND idempotency_key = p_idempotency_key;

  RETURN v_result;
END;
$$;

-- Security Privilege Enforcement
REVOKE ALL ON FUNCTION public.rpc_wo_mutation_execute_v1(UUID, UUID, TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rpc_wo_mutation_execute_v1(UUID, UUID, TEXT, TEXT, TEXT, TEXT, JSONB) FROM anon;
REVOKE ALL ON FUNCTION public.rpc_wo_mutation_execute_v1(UUID, UUID, TEXT, TEXT, TEXT, TEXT, JSONB) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_wo_mutation_execute_v1(UUID, UUID, TEXT, TEXT, TEXT, TEXT, JSONB) TO service_role;

COMMIT;
