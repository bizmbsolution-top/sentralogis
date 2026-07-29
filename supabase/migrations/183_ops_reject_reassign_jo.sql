-- [AI] RPC: Ops reject a JO and reassign to new transporter/fleet/driver
-- Called from RejectReassignModal in SBU Trucking Work Orders

CREATE OR REPLACE FUNCTION ops_reject_reassign_jo(
  p_jo_id UUID,
  p_rejection_reason TEXT,
  p_new_transporter_id UUID,
  p_new_fleet_id UUID,
  p_new_driver_id UUID,
  p_rejection_note TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_jo RECORD;
  v_new_token TEXT;
  v_result JSONB;
BEGIN
  -- Get current JO data
  SELECT * INTO v_jo FROM job_orders WHERE id = p_jo_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Job order not found');
  END IF;

  -- Generate new driver_link_token for the reassigned JO
  v_new_token := encode(gen_random_bytes(16), 'hex');

  -- Update the JO: reject old, assign new, generate new token
  UPDATE job_orders SET
    transporter_id = p_new_transporter_id,
    fleet_id = p_new_fleet_id,
    driver_id = p_new_driver_id,
    driver_link_token = v_new_token,
    driver_response = 'accepted',
    driver_response_at = NOW(),
    accepted_at = NOW(),
    status = 'ASSIGNED',
    rejection_note = COALESCE(p_rejection_note, '[' || p_rejection_reason || '] ' || COALESCE(rejection_note, '')),
    updated_at = NOW()
  WHERE id = p_jo_id;

  -- Log the change in job_tracking
  INSERT INTO job_tracking (job_order_id, status_update, notes, created_at)
  VALUES (
    p_jo_id,
    'OPS_REJECT_REASSIGN',
    'Driver/Transporter changed. Reason: ' || p_rejection_reason || COALESCE('. Note: ' || p_rejection_note, ''),
    NOW()
  );

  -- Release old fleet and driver back to available
  IF v_jo.fleet_id IS NOT NULL THEN
    UPDATE md_fleets SET status = 'available' WHERE id = v_jo.fleet_id AND status = 'on_duty';
  END IF;
  IF v_jo.driver_id IS NOT NULL THEN
    UPDATE md_drivers SET status = 'available', is_working = false WHERE id = v_jo.driver_id AND is_working = true;
  END IF;

  -- Mark new fleet and driver as on_duty
  UPDATE md_fleets SET status = 'on_duty' WHERE id = p_new_fleet_id;
  UPDATE md_drivers SET status = 'on_duty', is_working = true WHERE id = p_new_driver_id;

  RETURN jsonb_build_object(
    'success', true,
    'jo_id', p_jo_id,
    'new_driver_link_token', v_new_token
  );
END;
$$;
