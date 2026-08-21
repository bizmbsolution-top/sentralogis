-- Migration: Create driver resolution audit logs and RPC

CREATE TABLE IF NOT EXISTS public.driver_resolution_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    operator_id UUID NOT NULL REFERENCES auth.users(id),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    tenant_id UUID NOT NULL REFERENCES public.tenants(id),
    driver_id UUID NOT NULL REFERENCES public.md_drivers(id),
    old_phone TEXT,
    new_phone TEXT,
    reason TEXT NOT NULL,
    action TEXT NOT NULL,
    conflicting_driver_id UUID REFERENCES public.md_drivers(id),
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.driver_resolution_audit_logs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.resolve_driver_collision(
    p_driver_id UUID,
    p_tenant_id UUID,
    p_action TEXT,
    p_reason TEXT,
    p_conflicting_driver_id UUID,
    p_new_phone TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
    v_operator_id UUID;
    v_old_phone TEXT;
    v_canonical_new_phone TEXT;
BEGIN
    -- Check tenant access
    IF NOT public.has_tenant_access(p_tenant_id) THEN
        RAISE EXCEPTION 'FORBIDDEN_TENANT_ACCESS: User is not authorized for this tenant';
    END IF;

    v_operator_id := auth.uid();
    IF v_operator_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHORIZED: Operator ID not found';
    END IF;

    -- Get current phone
    SELECT whatsapp INTO v_old_phone
    FROM public.md_drivers
    WHERE id = p_driver_id AND tenant_id = p_tenant_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'NOT_FOUND: Driver not found in this tenant';
    END IF;

    IF p_action = 'CORRECT_PHONE' THEN
        v_canonical_new_phone := public.normalize_phone(p_new_phone);
        
        -- Check if new phone is also conflicting with ANOTHER active active driver? 
        -- Actually, we'll let the application validation handle pre-flight, but do a quick check here.
        IF v_canonical_new_phone IS NOT NULL AND v_canonical_new_phone <> '' THEN
            IF EXISTS (
                SELECT 1 FROM public.md_drivers 
                WHERE tenant_id = p_tenant_id 
                  AND id <> p_driver_id 
                  AND public.normalize_phone(whatsapp) = v_canonical_new_phone
            ) THEN
                RAISE EXCEPTION 'CONFLICT: The new phone is also used by another driver in this tenant';
            END IF;
        END IF;

        UPDATE public.md_drivers
        SET whatsapp = p_new_phone
        WHERE id = p_driver_id AND tenant_id = p_tenant_id;

    ELSIF p_action = 'DEACTIVATE' THEN
        UPDATE public.md_drivers
        SET is_active = false
        WHERE id = p_driver_id AND tenant_id = p_tenant_id;
    ELSE
        RAISE EXCEPTION 'INVALID_ACTION: Unknown action %', p_action;
    END IF;

    -- Audit Log
    INSERT INTO public.driver_resolution_audit_logs (
        operator_id,
        tenant_id,
        driver_id,
        old_phone,
        new_phone,
        reason,
        action,
        conflicting_driver_id
    ) VALUES (
        v_operator_id,
        p_tenant_id,
        p_driver_id,
        v_old_phone,
        p_new_phone,
        p_reason,
        p_action,
        p_conflicting_driver_id
    );

    RETURN json_build_object('success', true);
END;
$$;

-- Revoke public access, grant to authenticated/service_role
REVOKE EXECUTE ON FUNCTION public.resolve_driver_collision FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_driver_collision TO authenticated, service_role;
