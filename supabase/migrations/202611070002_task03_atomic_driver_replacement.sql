-- Task 03: make manual driver replacement a single atomic reassignment.
-- This migration is intentionally additive; it does not repair legacy rows.

CREATE OR REPLACE FUNCTION public.replace_driver_atomic(
  p_tenant_id UUID,
  p_job_order_id UUID,
  p_new_driver_id UUID,
  p_new_fleet_id UUID DEFAULT NULL,
  p_new_transporter_id UUID DEFAULT NULL,
  p_reason TEXT DEFAULT NULL
)
RETURNS TABLE(
  p_success BOOLEAN,
  p_error TEXT,
  p_code TEXT,
  p_job_order JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_jo job_orders%ROWTYPE;
  v_driver md_drivers%ROWTYPE;
  v_fleet md_fleets%ROWTYPE;
  v_now TIMESTAMPTZ := NOW();
  v_token TEXT;
  v_result JSONB;
  v_reason TEXT := NULLIF(BTRIM(p_reason), '');
BEGIN
  SELECT * INTO v_jo
  FROM public.job_orders
  WHERE id = p_job_order_id AND tenant_id = p_tenant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN QUERY SELECT FALSE, 'Job order not found'::TEXT, 'NOT_FOUND'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  IF UPPER(COALESCE(v_jo.status, '')) <> 'ASSIGNED'
     OR LOWER(COALESCE(v_jo.driver_response, 'pending')) = 'accepted'
     OR v_jo.started_at IS NOT NULL THEN
    RETURN QUERY SELECT FALSE,
      'Driver replacement is allowed only while the assigned JO is still awaiting driver response'::TEXT,
      'INVALID_STATE'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  IF p_new_driver_id IS NULL OR p_new_fleet_id IS NULL OR p_new_transporter_id IS NULL THEN
    RETURN QUERY SELECT FALSE, 'Transporter, fleet, and driver are required'::TEXT, 'INVALID_INPUT'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  -- Lock and validate the selected resources inside the same transaction.
  SELECT * INTO v_driver
  FROM public.md_drivers
  WHERE id = p_new_driver_id
    AND tenant_id = p_tenant_id
    AND entity_id = p_new_transporter_id
    AND is_active = TRUE
  FOR UPDATE;

  IF NOT FOUND OR (
    LOWER(COALESCE(v_driver.status, '')) <> 'available'
    AND v_driver.id IS DISTINCT FROM v_jo.driver_id
  ) THEN
    RETURN QUERY SELECT FALSE, 'Selected driver is not available for this transporter'::TEXT, 'DRIVER_UNAVAILABLE'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  SELECT * INTO v_fleet
  FROM public.md_fleets
  WHERE id = p_new_fleet_id
    AND tenant_id = p_tenant_id
    AND entity_id = p_new_transporter_id
    AND is_active = TRUE
  FOR UPDATE;

  IF NOT FOUND OR (
    LOWER(COALESCE(v_fleet.status, '')) <> 'available'
    AND v_fleet.id IS DISTINCT FROM v_jo.fleet_id
  ) THEN
    RETURN QUERY SELECT FALSE, 'Selected fleet is not available for this transporter'::TEXT, 'FLEET_UNAVAILABLE'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  -- Prevent assigning a resource already occupied by another non-terminal JO.
  IF EXISTS (
    SELECT 1
    FROM public.job_orders other_jo
    WHERE other_jo.tenant_id = p_tenant_id
      AND other_jo.id <> p_job_order_id
      AND (
        other_jo.driver_id = p_new_driver_id
        OR other_jo.fleet_id = p_new_fleet_id
      )
      AND UPPER(COALESCE(other_jo.status, '')) NOT IN (
        'NEED_ASSIGNMENT', 'NEED_ASSIGN', 'REJECTED', 'CANCELLED',
        'COMPLETED', 'DONE', 'DELIVERED', 'POD_SUBMITTED',
        'READY_FOR_BILLING', 'VERIFIED', 'AWAITING_AUDIT'
      )
  ) THEN
    RETURN QUERY SELECT FALSE, 'Selected driver or fleet is already assigned to another active JO'::TEXT, 'RESOURCE_CONFLICT'::TEXT, NULL::JSONB;
    RETURN;
  END IF;

  v_token := SUBSTRING(ENCODE(GEN_RANDOM_BYTES(16), 'hex') FROM 1 FOR 32);

  UPDATE public.job_orders
  SET driver_id = p_new_driver_id,
      fleet_id = p_new_fleet_id,
      transporter_id = p_new_transporter_id,
      vendor_id = p_new_transporter_id,
      driver_phone = v_driver.phone,
      driver_link_token = v_token,
      driver_response = 'pending',
      driver_response_at = NULL,
      accepted_at = NULL,
      started_at = NULL,
      assigned_at = v_now,
      status = 'ASSIGNED',
      rejection_note = CASE WHEN v_reason IS NULL THEN '[REPLACE] Driver replaced' ELSE '[REPLACE] ' || v_reason END,
      updated_at = v_now
  WHERE id = p_job_order_id AND tenant_id = p_tenant_id;

  -- Release only the previous resources that are actually being replaced.
  IF v_jo.fleet_id IS NOT NULL AND v_jo.fleet_id <> p_new_fleet_id THEN
    UPDATE public.md_fleets
    SET status = 'available'
    WHERE id = v_jo.fleet_id AND tenant_id = p_tenant_id AND status = 'on_duty';
  END IF;

  IF v_jo.driver_id IS NOT NULL AND v_jo.driver_id <> p_new_driver_id THEN
    UPDATE public.md_drivers
    SET status = 'available', is_working = FALSE
    WHERE id = v_jo.driver_id AND tenant_id = p_tenant_id AND is_working = TRUE;
  END IF;

  UPDATE public.md_fleets
  SET status = 'on_duty'
  WHERE id = p_new_fleet_id AND tenant_id = p_tenant_id;

  UPDATE public.md_drivers
  SET status = 'on_duty', is_working = TRUE
  WHERE id = p_new_driver_id AND tenant_id = p_tenant_id;

  INSERT INTO public.job_tracking (
    job_order_id, status_update, notes, source, created_at
  ) VALUES (
    p_job_order_id,
    'OPS_REJECT_REASSIGN',
    'Assignment replaced; waiting for new driver response. Reason: ' || COALESCE(v_reason, 'N/A'),
    'operations',
    v_now
  );

  SELECT TO_JSONB(jo) INTO v_result
  FROM public.job_orders jo
  WHERE jo.id = p_job_order_id AND jo.tenant_id = p_tenant_id;

  RETURN QUERY SELECT TRUE, NULL::TEXT, NULL::TEXT, v_result;
  RETURN;
EXCEPTION
  WHEN OTHERS THEN
    RETURN QUERY SELECT FALSE, SQLERRM::TEXT, 'DATABASE_ERROR'::TEXT, NULL::JSONB;
    RETURN;
END;
$$;

REVOKE ALL ON FUNCTION public.replace_driver_atomic(UUID, UUID, UUID, UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_driver_atomic(UUID, UUID, UUID, UUID, UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.replace_driver_atomic(UUID, UUID, UUID, UUID, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.replace_driver_atomic(UUID, UUID, UUID, UUID, UUID, TEXT) TO service_role;

COMMENT ON FUNCTION public.replace_driver_atomic(UUID, UUID, UUID, UUID, UUID, TEXT) IS
  'Task 03: atomic manual driver replacement; resets driver response to pending and requires a fresh private driver token.';
