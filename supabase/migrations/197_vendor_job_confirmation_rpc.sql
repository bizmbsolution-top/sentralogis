-- Migration 197: vendor_job_confirmation RPC (actual schema)
-- ---------------------------------------------------------------------------
-- The accept/reject path in app/api/jo/[token]/route.ts (PATCH, ~line 928)
-- calls this RPC and expects { success, new_status }.
--
-- NOTE: Migrations 186_vendor_workflow_and_device_health.sql and
-- 20260727115714_vendor_confirmation_fields.sql were NEVER applied to the
-- database (their SQL references job_orders.job_status / driver_confirmation_*
-- and job_tracking.lat/lng, none of which exist). This migration recreates the
-- RPC against the columns that actually exist:
--   job_orders  : status, driver_response, accepted_at, rejection_note, updated_at
--   job_tracking: job_order_id, status_update, notes, latitude, longitude, source
-- ---------------------------------------------------------------------------

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
    v_jo record;
    v_new_status VARCHAR;
    v_method VARCHAR;
    v_now TIMESTAMPTZ := now();
BEGIN
    -- Lock the row to avoid race conditions with the auto-confirm cron.
    SELECT * INTO v_jo FROM public.job_orders WHERE id = p_jo_id FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Job Order tidak ditemukan');
    END IF;

    -- Guard: only confirm orders that have NOT been processed yet.
    -- 'assigned' / 'ASSIGNED' / 'pending' / 'need_assignment' remain acceptable.
    IF v_jo.status IN (
        'accepted', 'in_progress', 'completed', 'rejected', 'cancelled',
        'PEKERJAAN SELESAI', 'SELESAI', 'COMPLETED', 'DONE', 'IN_PROGRESS',
        'DALAM PERJALANAN', 'REJECTED', 'CANCELLED', 'MENUNGGU SELESAI'
    ) OR v_jo.status ILIKE 'MENUJU %' OR v_jo.status ILIKE 'TIBA DI %' THEN
        RETURN jsonb_build_object('success', false, 'error',
            'Job Order sudah diproses sebelumnya (' || COALESCE(v_jo.status, '') || ')');
    END IF;

    IF p_is_timeout THEN
        v_new_status := 'accepted';
        v_method := 'AUTO_TIMEOUT';
    ELSIF p_is_accepted THEN
        v_new_status := 'accepted';
        v_method := 'DRIVER_CONFIRMATION';
    ELSE
        v_new_status := 'rejected';
        v_method := 'DRIVER_REJECTION';
    END IF;

    UPDATE public.job_orders
    SET status = v_new_status,
        driver_response = CASE WHEN p_is_accepted THEN 'accepted' ELSE 'rejected' END,
        accepted_at = CASE WHEN p_is_accepted THEN v_now ELSE accepted_at END,
        rejection_note = p_rejection_reason,
        updated_at = v_now
    WHERE id = p_jo_id;

    INSERT INTO public.job_tracking (
        job_order_id, status_update, notes, latitude, longitude, source
    )
    VALUES (
        p_jo_id,
        CASE WHEN p_is_accepted THEN 'Konfirmasi Tugas' ELSE 'Driver Menolak' END,
        CASE WHEN p_is_timeout THEN 'Auto Confirmed by System Timeout'
             WHEN p_is_accepted THEN 'Tugas diterima oleh driver'
             ELSE COALESCE(p_rejection_reason, 'Tugas ditolak oleh driver') END,
        p_lat,
        p_lng,
        CASE WHEN p_is_timeout THEN 'auto' ELSE 'pwa' END
    );

    RETURN jsonb_build_object('success', true, 'new_status', v_new_status, 'method', v_method);
END;
$$;

REVOKE ALL ON FUNCTION public.vendor_job_confirmation(UUID, BOOLEAN, BOOLEAN, TEXT, NUMERIC, NUMERIC) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.vendor_job_confirmation(UUID, BOOLEAN, BOOLEAN, TEXT, NUMERIC, NUMERIC) TO service_role, anon, authenticated;
