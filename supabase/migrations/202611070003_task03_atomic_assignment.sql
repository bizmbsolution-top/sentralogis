-- Task 03: one canonical atomic resource reservation path for JO assignment.
-- This RPC is additive and is NOT applied to any Supabase project by this commit.
-- It serializes competing assignments on the selected driver/fleet rows, then
-- re-checks active JO conflicts while those resource locks are held.

CREATE OR REPLACE FUNCTION public.assign_driver_atomic(
  p_tenant_id UUID,
  p_job_order_id UUID,
  p_payload JSONB,
  p_operation TEXT DEFAULT 'confirm',
  p_track_assignment BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_jo public.job_orders%ROWTYPE;
  v_next public.job_orders%ROWTYPE;
  v_driver public.md_drivers%ROWTYPE;
  v_fleet public.md_fleets%ROWTYPE;
  v_wo_item_id UUID;
  v_driver_id UUID;
  v_fleet_id UUID;
  v_transporter_id UUID;
  v_new_id UUID;
  v_operation TEXT := lower(coalesce(p_operation, 'confirm'));
  v_status TEXT;
  v_now TIMESTAMPTZ := now();
BEGIN
  IF p_tenant_id IS NULL OR p_payload IS NULL OR jsonb_typeof(p_payload) <> 'object' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tenant and assignment payload are required', 'code', 'INVALID_INPUT');
  END IF;

  IF v_operation NOT IN ('draft', 'confirm', 'handover') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unsupported assignment operation', 'code', 'INVALID_INPUT');
  END IF;

  IF p_payload ? 'tenant_id' AND p_payload->>'tenant_id' IS DISTINCT FROM p_tenant_id::TEXT THEN
    RETURN jsonb_build_object('success', false, 'error', 'Tenant mismatch', 'code', 'TENANT_MISMATCH');
  END IF;

  v_wo_item_id := nullif(p_payload->>'wo_item_id', '')::UUID;
  v_driver_id := nullif(p_payload->>'driver_id', '')::UUID;
  v_fleet_id := nullif(p_payload->>'fleet_id', '')::UUID;
  v_transporter_id := nullif(p_payload->>'transporter_id', '')::UUID;
  v_status := upper(btrim(coalesce(p_payload->>'status', CASE WHEN v_operation = 'draft' THEN 'pending' ELSE 'assigned' END)));

  IF v_wo_item_id IS NULL OR nullif(btrim(p_payload->>'jo_number'), '') IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'WO item and JO number are required', 'code', 'INVALID_INPUT');
  END IF;

  IF v_status NOT IN ('PENDING', 'ASSIGNED', 'NEED_ASSIGNMENT', 'NEED_ASSIGN', 'DRAFT') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unsupported target JO status for assignment', 'code', 'INVALID_STATE');
  END IF;

  -- Existing JO is locked before resource rows. This matches the driver
  -- confirmation/rejection lifecycle, which also locks JO before assets.
  IF p_job_order_id IS NOT NULL THEN
    SELECT * INTO v_jo
    FROM public.job_orders
    WHERE id = p_job_order_id
      AND tenant_id = p_tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Job Order not found in this tenant', 'code', 'NOT_FOUND');
    END IF;

    IF upper(btrim(coalesce(v_jo.status, ''))) NOT IN ('PENDING', 'NEED_ASSIGNMENT', 'NEED_ASSIGN', 'DRAFT') THEN
      RETURN jsonb_build_object('success', false, 'error', 'JO is no longer available for assignment', 'code', 'INVALID_STATE');
    END IF;

    IF v_jo.accepted_at IS NOT NULL
       OR v_jo.started_at IS NOT NULL
       OR lower(coalesce(v_jo.driver_response, 'pending')) = 'accepted' THEN
      RETURN jsonb_build_object('success', false, 'error', 'JO has already been accepted or started', 'code', 'INVALID_STATE');
    END IF;

    IF v_jo.wo_item_id IS DISTINCT FROM v_wo_item_id THEN
      RETURN jsonb_build_object('success', false, 'error', 'WO item cannot be changed during assignment', 'code', 'INVALID_INPUT');
    END IF;
  END IF;

  -- Lock resources in a fixed order (driver, then fleet). A competing
  -- transaction selecting the same resource must wait, then re-check conflicts.
  IF v_driver_id IS NOT NULL THEN
    SELECT * INTO v_driver
    FROM public.md_drivers
    WHERE id = v_driver_id
      AND tenant_id = p_tenant_id
      AND is_active IS TRUE
      AND (v_transporter_id IS NULL OR entity_id = v_transporter_id)
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Driver is inactive, missing, or outside this tenant/transporter', 'code', 'DRIVER_UNAVAILABLE');
    END IF;

    IF lower(coalesce(v_driver.status, '')) <> 'available'
       AND (p_job_order_id IS NULL OR v_jo.driver_id IS DISTINCT FROM v_driver_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Driver is not available', 'code', 'DRIVER_UNAVAILABLE');
    END IF;
  END IF;

  IF v_fleet_id IS NOT NULL THEN
    SELECT * INTO v_fleet
    FROM public.md_fleets
    WHERE id = v_fleet_id
      AND tenant_id = p_tenant_id
      AND is_active IS TRUE
      AND (v_transporter_id IS NULL OR entity_id = v_transporter_id)
    FOR UPDATE;

    IF NOT FOUND THEN
      RETURN jsonb_build_object('success', false, 'error', 'Fleet is inactive, missing, or outside this tenant/transporter', 'code', 'FLEET_UNAVAILABLE');
    END IF;

    IF lower(coalesce(v_fleet.status, '')) <> 'available'
       AND (p_job_order_id IS NULL OR v_jo.fleet_id IS DISTINCT FROM v_fleet_id) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Fleet is not available', 'code', 'FLEET_UNAVAILABLE');
    END IF;
  END IF;

  -- The resource-row locks above make this check safe against another
  -- concurrent assignment through this same RPC, even when it targets a
  -- different JO. PENDING JOs with selected resources intentionally block.
  IF v_driver_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.job_orders other_jo
    WHERE other_jo.tenant_id = p_tenant_id
      AND other_jo.driver_id = v_driver_id
      AND (p_job_order_id IS NULL OR other_jo.id <> p_job_order_id)
      AND upper(btrim(coalesce(other_jo.status, ''))) NOT IN (
        'DRAFT', 'NEED_ASSIGNMENT', 'NEED_ASSIGN', 'REJECTED', 'HANDOVER_REJECTED',
        'CANCELLED', 'COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED',
        'READY_FOR_BILLING', 'AWAITING_AUDIT', 'DONE', 'INVOICED', 'PAID', 'SELESAI'
      )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Driver is already reserved by another active JO', 'code', 'RESOURCE_CONFLICT');
  END IF;

  IF v_fleet_id IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.job_orders other_jo
    WHERE other_jo.tenant_id = p_tenant_id
      AND other_jo.fleet_id = v_fleet_id
      AND (p_job_order_id IS NULL OR other_jo.id <> p_job_order_id)
      AND upper(btrim(coalesce(other_jo.status, ''))) NOT IN (
        'DRAFT', 'NEED_ASSIGNMENT', 'NEED_ASSIGN', 'REJECTED', 'HANDOVER_REJECTED',
        'CANCELLED', 'COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED',
        'READY_FOR_BILLING', 'AWAITING_AUDIT', 'DONE', 'INVOICED', 'PAID', 'SELESAI'
      )
  ) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Fleet is already reserved by another active JO', 'code', 'RESOURCE_CONFLICT');
  END IF;

  -- Lock and validate the WO item after JO/resource locks to avoid lock-order
  -- inversion with the confirmation/rejection lifecycle.
  PERFORM 1
  FROM public.wo_items wi
  WHERE wi.id = v_wo_item_id
    AND wi.tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'WO item not found in this tenant', 'code', 'NOT_FOUND');
  END IF;

  IF p_job_order_id IS NULL THEN
    v_new_id := coalesce(nullif(p_payload->>'id', '')::UUID, gen_random_uuid());

    INSERT INTO public.job_orders (
      id, tenant_id, wo_item_id, jo_number, status,
      transporter_id, fleet_id, driver_id, vendor_id, driver_phone,
      cost_account_id, purchase_price, base_price, driver_share_percentage,
      advance_amount, estimated_margin, total_stops, container_number, notes,
      assignment_documents, sbu_metadata, assigned_at, dispatch_ready,
      dispatch_ready_at, driver_link_token, driver_response, accepted_at, updated_at
    ) VALUES (
      v_new_id, p_tenant_id, v_wo_item_id, p_payload->>'jo_number', lower(v_status),
      v_transporter_id, v_fleet_id, v_driver_id,
      coalesce(nullif(p_payload->>'vendor_id', '')::UUID, v_transporter_id),
      nullif(p_payload->>'driver_phone', ''),
      nullif(p_payload->>'cost_account_id', '')::UUID,
      coalesce(nullif(p_payload->>'purchase_price', '')::NUMERIC, 0),
      coalesce(nullif(p_payload->>'base_price', '')::NUMERIC, 0),
      coalesce(nullif(p_payload->>'driver_share_percentage', '')::NUMERIC, 40),
      coalesce(nullif(p_payload->>'advance_amount', '')::NUMERIC, 0),
      coalesce(nullif(p_payload->>'estimated_margin', '')::NUMERIC, 0),
      coalesce(nullif(p_payload->>'total_stops', '')::INTEGER, 0),
      nullif(p_payload->>'container_number', ''),
      nullif(p_payload->>'notes', ''),
      coalesce(p_payload->'assignment_documents', '[]'::JSONB),
      coalesce(p_payload->'sbu_metadata', '{}'::JSONB),
      nullif(p_payload->>'assigned_at', '')::TIMESTAMPTZ,
      coalesce(nullif(p_payload->>'dispatch_ready', '')::BOOLEAN, FALSE),
      nullif(p_payload->>'dispatch_ready_at', '')::TIMESTAMPTZ,
      nullif(p_payload->>'driver_link_token', ''),
      coalesce(nullif(p_payload->>'driver_response', ''), 'pending'),
      nullif(p_payload->>'accepted_at', '')::TIMESTAMPTZ,
      coalesce(nullif(p_payload->>'updated_at', '')::TIMESTAMPTZ, v_now)
    );
  ELSE
    v_next := jsonb_populate_record(v_jo, p_payload);

    UPDATE public.job_orders
    SET status = v_next.status,
        transporter_id = v_next.transporter_id,
        fleet_id = v_next.fleet_id,
        driver_id = v_next.driver_id,
        vendor_id = v_next.vendor_id,
        driver_phone = v_next.driver_phone,
        cost_account_id = v_next.cost_account_id,
        purchase_price = v_next.purchase_price,
        base_price = v_next.base_price,
        driver_share_percentage = v_next.driver_share_percentage,
        advance_amount = v_next.advance_amount,
        estimated_margin = v_next.estimated_margin,
        total_stops = v_next.total_stops,
        container_number = v_next.container_number,
        notes = v_next.notes,
        assignment_documents = v_next.assignment_documents,
        sbu_metadata = v_next.sbu_metadata,
        assigned_at = v_next.assigned_at,
        dispatch_ready = v_next.dispatch_ready,
        dispatch_ready_at = v_next.dispatch_ready_at,
        driver_link_token = v_next.driver_link_token,
        driver_response = v_next.driver_response,
        accepted_at = v_next.accepted_at,
        updated_at = coalesce(v_next.updated_at, v_now)
    WHERE id = p_job_order_id
      AND tenant_id = p_tenant_id;
  END IF;

  IF p_track_assignment THEN
    INSERT INTO public.job_tracking (
      job_order_id, status_update, notes, source, created_at
    ) VALUES (
      coalesce(p_job_order_id, v_new_id),
      'ASSIGNED',
      'Driver/fleet assignment reserved through the canonical atomic assignment RPC.',
      'copilot',
      v_now
    );
  END IF;

  SELECT * INTO v_next
  FROM public.job_orders
  WHERE id = coalesce(p_job_order_id, v_new_id)
    AND tenant_id = p_tenant_id;

  RETURN jsonb_build_object(
    'success', true,
    'job_order', to_jsonb(v_next)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.assign_driver_atomic(UUID, UUID, JSONB, TEXT, BOOLEAN) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.assign_driver_atomic(UUID, UUID, JSONB, TEXT, BOOLEAN) FROM anon;
GRANT EXECUTE ON FUNCTION public.assign_driver_atomic(UUID, UUID, JSONB, TEXT, BOOLEAN) TO authenticated, service_role;

COMMENT ON FUNCTION public.assign_driver_atomic(UUID, UUID, JSONB, TEXT, BOOLEAN) IS
  'Task 03: canonical atomic JO assignment. Locks selected driver/fleet rows and rejects conflicting active JOs before inserting/updating the assignment.';
