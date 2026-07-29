-- [AI] Additive columns for Auto Confirm and Driver Confirm Tracking
ALTER TABLE public.job_orders 
ADD COLUMN IF NOT EXISTS confirmation_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS confirmed_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS confirmed_at TIMESTAMPTZ;

-- Update the RPC to use the new columns
CREATE OR REPLACE FUNCTION vendor_job_confirmation(
    p_jo_id UUID,
    p_is_accepted BOOLEAN,
    p_is_timeout BOOLEAN,
    p_rejection_reason TEXT DEFAULT NULL,
    p_lat NUMERIC DEFAULT NULL,
    p_lng NUMERIC DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_jo record;
    v_new_status VARCHAR;
    v_method VARCHAR;
    v_confirmed_by VARCHAR;
    v_now TIMESTAMPTZ := now();
BEGIN
    -- Lock the row for update
    SELECT * INTO v_jo FROM public.job_orders WHERE id = p_jo_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Job Order tidak ditemukan');
    END IF;

    -- If already confirmed/rejected by someone/something else, reject the update
    IF v_jo.job_status IN ('CONFIRMED_BY_DRIVER', 'AUTO_CONFIRMED', 'REJECTED', 'CANCELLED', 'WAITING_DEPARTURE', 'IN_PROGRESS', 'COMPLETED', 'MENUJU', 'DALAM PERJALANAN', 'DONE') THEN
        -- Allow if it's just transitioning from CONFIRMED_BY_DRIVER to something else, but here we only handle initial confirmation
        RETURN jsonb_build_object('success', false, 'error', 'Job Order sudah diproses sebelumnya (' || v_jo.job_status || ')');
    END IF;

    IF p_is_timeout THEN
        v_new_status := 'AUTO_CONFIRMED';
        v_method := 'AUTO_TIMEOUT';
        v_confirmed_by := 'SYSTEM';
    ELSIF p_is_accepted THEN
        v_new_status := 'CONFIRMED_BY_DRIVER';
        v_method := 'DRIVER_CONFIRMATION';
        v_confirmed_by := v_jo.driver_id::VARCHAR;
    ELSE
        v_new_status := 'REJECTED';
        v_method := 'DRIVER_REJECTION';
        v_confirmed_by := v_jo.driver_id::VARCHAR;
    END IF;

    -- Update Job Order
    UPDATE public.job_orders
    SET 
        status = v_new_status,
        job_status = v_new_status,
        confirmation_method = v_method,
        confirmed_by = v_confirmed_by,
        confirmed_at = v_now,
        -- fallback to legacy columns to ensure existing code doesn't break
        driver_confirmation_method = v_method,
        driver_confirmation_at = v_now,
        rejection_note = p_rejection_reason,
        updated_at = v_now
    WHERE id = p_jo_id;

    -- Insert into job_tracking
    INSERT INTO public.job_tracking (
        job_order_id, 
        status_update, 
        latitude, 
        longitude, 
        notes, 
        created_at
    )
    VALUES (
        p_jo_id,
        v_new_status,
        p_lat,
        p_lng,
        CASE WHEN p_is_timeout THEN 'Auto Confirmed by System Timeout' ELSE COALESCE(p_rejection_reason, 'Confirmed by Driver') END,
        v_now
    );

    RETURN jsonb_build_object('success', true, 'new_status', v_new_status);
END;
$$;
