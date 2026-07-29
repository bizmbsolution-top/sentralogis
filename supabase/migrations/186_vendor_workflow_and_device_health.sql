-- [AI] Migration: Vendor Workflow & Device Health Monitoring
-- 1. Add specific status and tracking columns to job_orders
-- 2. Create device_health_logs table
-- 3. Create Atomic RPC for race-condition safe vendor confirmation

-- Step 1: Additive columns for job_orders
ALTER TABLE public.job_orders 
ADD COLUMN IF NOT EXISTS job_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS gps_status VARCHAR(50),
ADD COLUMN IF NOT EXISTS device_health VARCHAR(50),
ADD COLUMN IF NOT EXISTS planned_departure_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS driver_confirmation_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS driver_confirmation_method VARCHAR(50),
ADD COLUMN IF NOT EXISTS gps_started_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS gps_stopped_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_gps_ping_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_device_health_ping_at TIMESTAMPTZ;

-- Backfill job_status based on existing status (to ensure no immediate breaking changes)
UPDATE public.job_orders 
SET job_status = status 
WHERE job_status IS NULL;

-- Step 2: Create device_health_logs table
CREATE TABLE IF NOT EXISTS public.device_health_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    job_order_id UUID REFERENCES public.job_orders(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.md_drivers(id) ON DELETE SET NULL,
    internet_connected BOOLEAN DEFAULT true,
    gps_active BOOLEAN DEFAULT true,
    background_running BOOLEAN DEFAULT true,
    battery_level NUMERIC,
    accuracy NUMERIC,
    ping_latency_ms NUMERIC,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for fast retrieval of latest health by job order
CREATE INDEX IF NOT EXISTS idx_device_health_jo ON public.device_health_logs(job_order_id, created_at DESC);

-- Enable RLS for device_health_logs
ALTER TABLE public.device_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can insert their own health logs" 
ON public.device_health_logs FOR INSERT 
TO public 
WITH CHECK (true); -- Usually restricted by token/JWT, but since Vendor uses token bypass via API, we allow public insert from edge functions

CREATE POLICY "Tenant admin can view health logs" 
ON public.device_health_logs FOR SELECT 
TO authenticated 
USING (
    EXISTS (
        SELECT 1 FROM public.job_orders jo
        JOIN public.users u ON u.tenant_id = jo.tenant_id
        WHERE jo.id = device_health_logs.job_order_id 
        AND u.id = auth.uid()
    )
);

-- Step 3: Atomic RPC for Vendor Confirmation
-- Resolves race conditions between Auto-confirm Cron and manual Driver Confirm
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
    ELSIF p_is_accepted THEN
        v_new_status := 'CONFIRMED_BY_DRIVER';
        v_method := 'DRIVER_CONFIRMATION';
    ELSE
        v_new_status := 'REJECTED';
        v_method := 'DRIVER_REJECTION';
    END IF;

    -- Update the job order atomically
    UPDATE public.job_orders 
    SET 
        job_status = v_new_status,
        status = v_new_status, -- Keep legacy status updated for backward compatibility
        driver_confirmation_at = v_now,
        driver_confirmation_method = v_method,
        updated_at = v_now
    WHERE id = p_jo_id;
    
    -- If there's a rejection reason, maybe log it to job_tracking
    IF NOT p_is_accepted THEN
        INSERT INTO public.job_tracking (job_order_id, status_update, notes, lat, lng, source)
        VALUES (p_jo_id, '❌ Driver Menolak', COALESCE(p_rejection_reason, 'Tugas ditolak oleh driver'), p_lat, p_lng, 'pwa');
    ELSE
        -- Log acceptance
        INSERT INTO public.job_tracking (job_order_id, status_update, notes, lat, lng, source)
        VALUES (p_jo_id, '✅ Konfirmasi Tugas', 'Tugas ' || v_method, p_lat, p_lng, 'pwa');
    END IF;

    RETURN jsonb_build_object('success', true, 'new_status', v_new_status, 'method', v_method);
END;
$$;
