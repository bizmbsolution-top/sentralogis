-- Task 03: canonical, atomic driver confirmation lifecycle.
-- All callers must resolve the JO through a signed driver session or one-time
-- driver_link_token before invoking this service-role-only RPC.
CREATE OR REPLACE FUNCTION public.vendor_job_confirmation(
    p_jo_id UUID,
    p_is_accepted BOOLEAN,
    p_is_timeout BOOLEAN,
    p_rejection_reason TEXT DEFAULT NULL,
    p_lat NUMERIC DEFAULT NULL,
    p_lng NUMERIC DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_jo public.job_orders%ROWTYPE;
    v_new_status TEXT;
    v_method TEXT;
    v_now TIMESTAMPTZ := now();
BEGIN
    SELECT * INTO v_jo
    FROM public.job_orders
    WHERE id = p_jo_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Job Order tidak ditemukan');
    END IF;

    -- A JO may only be confirmed once while it is awaiting the driver's reply.
    IF lower(coalesce(v_jo.driver_response, 'pending')) <> 'pending'
       OR lower(coalesce(v_jo.status, '')) NOT IN ('assigned', 'pending', 'need_assignment') THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', 'Job Order sudah diproses atau tidak sedang menunggu respons driver',
            'current_status', v_jo.status,
            'driver_response', v_jo.driver_response
        );
    END IF;

    IF p_is_timeout THEN
        -- Timeout auto-confirm is deliberately disabled: no driver action means
        -- the JO remains assigned and awaiting a real driver response.
        RETURN jsonb_build_object('success', false, 'error', 'Auto-confirm timeout dinonaktifkan');
    ELSIF p_is_accepted THEN
        v_new_status := 'ON JOURNEY';
        v_method := 'DRIVER_CONFIRMATION';
    ELSE
        v_new_status := 'need_assignment';
        v_method := 'DRIVER_REJECTION';
    END IF;

    IF p_is_accepted THEN
        UPDATE public.job_orders
        SET status = v_new_status,
            driver_response = 'accepted',
            accepted_at = v_now,
            started_at = coalesce(started_at, v_now),
            rejection_note = NULL,
            updated_at = v_now
        WHERE id = p_jo_id;
    ELSE
        UPDATE public.job_orders
        SET status = v_new_status,
            driver_response = 'rejected',
            rejection_note = coalesce(p_rejection_reason, 'Ditolak driver'),
            driver_id = NULL,
            fleet_id = NULL,
            transporter_id = NULL,
            vendor_id = NULL,
            driver_phone = NULL,
            updated_at = v_now
        WHERE id = p_jo_id;
    END IF;

    INSERT INTO public.job_tracking (
        job_order_id, status_update, notes, latitude, longitude, source
    )
    VALUES (
        p_jo_id,
        CASE WHEN p_is_accepted THEN 'ON JOURNEY' ELSE 'NEED ASSIGNMENT - DRIVER REJECTED' END,
        CASE WHEN p_is_accepted
             THEN 'Driver menerima penugasan; JO masuk status On Journey.'
             ELSE 'Driver menolak penugasan. Driver/fleet dilepas agar JO kembali ke antrean assignment. Alasan: '
                  || coalesce(p_rejection_reason, 'Ditolak driver') END,
        p_lat,
        p_lng,
        CASE WHEN p_is_timeout THEN 'auto' ELSE 'driver_portal' END
    );

    RETURN jsonb_build_object(
        'success', true,
        'new_status', v_new_status,
        'driver_response', CASE WHEN p_is_accepted THEN 'accepted' ELSE 'rejected' END,
        'method', v_method
    );
END;
$$;

REVOKE ALL ON FUNCTION public.vendor_job_confirmation(UUID, BOOLEAN, BOOLEAN, TEXT, NUMERIC, NUMERIC) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.vendor_job_confirmation(UUID, BOOLEAN, BOOLEAN, TEXT, NUMERIC, NUMERIC) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.vendor_job_confirmation(UUID, BOOLEAN, BOOLEAN, TEXT, NUMERIC, NUMERIC) TO service_role;
