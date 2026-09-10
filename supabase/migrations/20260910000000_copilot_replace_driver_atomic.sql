-- ============================================================================
-- ADR-091 D5: REPLACE_DRIVER ATOMIC TRANSACTION
-- ============================================================================
-- Provides atomic transaction wrapping for DriverReplacementService.replaceDriver().
--
-- Operations covered as one PostgreSQL transaction:
--   1. UPDATE job_orders
--   2. UPDATE md_fleets (release old)
--   3. UPDATE md_drivers (release old)
--   4. UPDATE md_fleets (activate new)
--   5. UPDATE md_drivers (activate new)
--   6. INSERT job_tracking
--
-- Rollback: DROP FUNCTION IF EXISTS public.replace_driver_atomic;
-- ============================================================================

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
SECURITY INVOKER
AS $$
DECLARE
    v_jo job_orders%ROWTYPE;
    v_now TIMESTAMPTZ;
    v_new_token UUID;
    v_rejection_note TEXT;
    v_error_msg TEXT := NULL;
    v_error_code TEXT := NULL;
    v_success BOOLEAN := FALSE;
    v_result JSONB := NULL;
BEGIN
    v_now := NOW();
    v_new_token := gen_random_uuid();

    -- Fetch JO with tenant isolation + row lock for atomicity
    SELECT * INTO v_jo FROM job_orders
    WHERE id = p_job_order_id AND tenant_id = p_tenant_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN QUERY
            SELECT FALSE AS p_success,
                   'Job order not found'::TEXT AS p_error,
                   'NOT_FOUND'::TEXT AS p_code,
                   NULL::JSONB AS p_job_order;
        RETURN;
    END IF;

    -- ADR-091 D2: Source state must be ASSIGNED
    IF v_jo.status != 'ASSIGNED' THEN
        v_error_msg := format('Driver replacement not allowed from status: %s. Source state must be ASSIGNED.', v_jo.status);
        v_error_code := 'INVALID_STATE';
        RETURN QUERY
            SELECT v_success, v_error_msg, v_error_code, v_result;
        RETURN;
    END IF;

    -- ADR-091 D3: Cannot replace with the same driver/fleet/transporter
    IF v_jo.driver_id = p_new_driver_id
       AND ((v_jo.fleet_id = p_new_fleet_id) OR (v_jo.fleet_id IS NULL AND p_new_fleet_id IS NULL))
       AND ((v_jo.transporter_id = p_new_transporter_id) OR (v_jo.transporter_id IS NULL AND p_new_transporter_id IS NULL))
    THEN
        v_error_msg := 'Cannot replace with the same driver/fleet/transporter';
        v_error_code := 'SAME_DRIVER';
        RETURN QUERY
            SELECT v_success, v_error_msg, v_error_code, v_result;
        RETURN;
    END IF;

    -- Construct rejection note (matching service behavior)
    -- input.reason ? `[REPLACE] ${input.reason}` : (jo.rejectionNote || '[REPLACE] Driver replaced')
    IF p_reason IS NOT NULL AND p_reason <> '' THEN
        v_rejection_note := '[REPLACE] ' || p_reason;
    ELSIF v_jo.rejection_note IS NOT NULL AND v_jo.rejection_note <> '' THEN
        v_rejection_note := v_jo.rejection_note;
    ELSE
        v_rejection_note := '[REPLACE] Driver replaced';
    END IF;

    -- 1. UPDATE job_orders
    -- fleet_id / transporter_id only updated if non-null (preserving original COALESCE behavior)
    UPDATE job_orders SET
        driver_id = p_new_driver_id,
        driver_link_token = v_new_token,
        driver_response = 'accepted',
        driver_response_at = v_now,
        accepted_at = v_now,
        status = 'ASSIGNED',
        rejection_note = v_rejection_note,
        updated_at = v_now,
        fleet_id = COALESCE(p_new_fleet_id, v_jo.fleet_id),
        transporter_id = COALESCE(p_new_transporter_id, v_jo.transporter_id)
    WHERE id = p_job_order_id AND tenant_id = p_tenant_id;

    -- 2. Release old fleet (conditional, matches original .eq('status', 'on_duty') guard)
    IF v_jo.fleet_id IS NOT NULL THEN
        UPDATE md_fleets
        SET status = 'available'
        WHERE id = v_jo.fleet_id AND status = 'on_duty';
    END IF;

    -- 3. Release old driver (conditional, matches original .eq('is_working', true) guard)
    IF v_jo.driver_id IS NOT NULL THEN
        UPDATE md_drivers
        SET status = 'available', is_working = false
        WHERE id = v_jo.driver_id AND is_working = true;
    END IF;

    -- 4. Activate new fleet (conditional)
    IF p_new_fleet_id IS NOT NULL THEN
        UPDATE md_fleets
        SET status = 'on_duty'
        WHERE id = p_new_fleet_id;
    END IF;

    -- 5. Activate new driver
    UPDATE md_drivers
    SET status = 'on_duty', is_working = true
    WHERE id = p_new_driver_id;

    -- 6. INSERT job_tracking
    INSERT INTO job_tracking (
        job_order_id,
        status_update,
        notes,
        source,
        created_at
    ) VALUES (
        p_job_order_id,
        'OPS_REJECT_REASSIGN',
        'Driver replaced. Reason: ' || COALESCE(p_reason, 'N/A'),
        'copilot',
        v_now
    );

    -- Return the updated JO as JSONB
    SELECT to_jsonb(job_orders) INTO v_result
    FROM job_orders
    WHERE id = p_job_order_id;

    v_success := TRUE;
    RETURN QUERY
        SELECT v_success, v_error_msg, v_error_code, v_result;
    RETURN;

EXCEPTION
    WHEN OTHERS THEN
        -- Rollback is automatic on exception in plpgsql
        RETURN QUERY
            SELECT FALSE AS p_success,
                   SQLERRM::TEXT AS p_error,
                   'DATABASE_ERROR'::TEXT AS p_code,
                   NULL::JSONB AS p_job_order;
        RETURN;
END;
$$;

-- ============================================================================
-- Security: Execute permission only to service_role (server-side)
-- Follows existing ADR-090/091 convention for Copilot RPCs
-- ============================================================================
REVOKE ALL ON FUNCTION public.replace_driver_atomic(UUID, UUID, UUID, UUID, UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.replace_driver_atomic(UUID, UUID, UUID, UUID, UUID, TEXT) FROM anon;
REVOKE ALL ON FUNCTION public.replace_driver_atomic(UUID, UUID, UUID, UUID, UUID, TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.replace_driver_atomic(UUID, UUID, UUID, UUID, UUID, TEXT) TO service_role;

COMMENT ON FUNCTION public.replace_driver_atomic(UUID, UUID, UUID, UUID, UUID, TEXT) IS
    'ADR-091 D5: Atomic driver replacement transaction. Wraps JO update + asset release/activate + tracking insert in a single PostgreSQL transaction. Called by DriverReplacementService.replaceDriver().';
