-- Migration 114: Fix Chat Seed Trigger assigned_by error
-- The job_orders table does not have an assigned_by column. It uses created_by or updated_by.
-- The previous trigger function fn_seed_channel_participants referenced jo.assigned_by, causing a 42703 error.

CREATE OR REPLACE FUNCTION public.fn_seed_channel_participants()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_channel_type TEXT;
  v_channel_uuid UUID;
  v_tenant_id UUID;
  rec RECORD;
BEGIN
  v_channel_type := NEW.channel_type;
  
  -- Prevent errors if channel_id is not UUID
  BEGIN
    v_channel_uuid := NEW.channel_id::UUID;
  EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
  END;

  IF v_channel_type = 'work_order' THEN
    SELECT wo.tenant_id INTO v_tenant_id
    FROM public.work_orders wo
    WHERE wo.id = v_channel_uuid
    LIMIT 1;

    -- Seed: created_by (CS who created)
    FOR rec IN SELECT wo.created_by AS uid FROM public.work_orders wo WHERE wo.id = v_channel_uuid AND wo.created_by IS NOT NULL LOOP
      INSERT INTO public.chat_participants (channel_id, user_id, role) VALUES (NEW.id, rec.uid, 'admin') ON CONFLICT DO NOTHING;
    END LOOP;

    -- Seed: ALL active tenant users
    IF v_tenant_id IS NOT NULL THEN
      FOR rec IN 
        SELECT tu.user_id AS uid FROM public.tenant_users tu
        WHERE tu.tenant_id = v_tenant_id 
          AND tu.is_active = true
      LOOP
        INSERT INTO public.chat_participants (channel_id, user_id, role) VALUES (NEW.id, rec.uid, 'member') ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

  ELSIF v_channel_type = 'job_order' THEN
    SELECT wo.tenant_id INTO v_tenant_id
    FROM public.job_orders jo
    JOIN public.wo_items wi ON wi.id = jo.wo_item_id
    JOIN public.work_orders wo ON wo.id = wi.wo_id
    WHERE jo.id = v_channel_uuid
    LIMIT 1;

    -- Seed: driver
    FOR rec IN SELECT jo.driver_id AS uid FROM public.job_orders jo WHERE jo.id = v_channel_uuid AND jo.driver_id IS NOT NULL LOOP
      INSERT INTO public.chat_participants (channel_id, user_id, role) VALUES (NEW.id, rec.uid, 'member') ON CONFLICT DO NOTHING;
    END LOOP;

    -- Seed: updated_by instead of assigned_by
    FOR rec IN SELECT jo.updated_by AS uid FROM public.job_orders jo WHERE jo.id = v_channel_uuid AND jo.updated_by IS NOT NULL LOOP
      INSERT INTO public.chat_participants (channel_id, user_id, role) VALUES (NEW.id, rec.uid, 'member') ON CONFLICT DO NOTHING;
    END LOOP;

    -- Seed: ALL active tenant users
    IF v_tenant_id IS NOT NULL THEN
      FOR rec IN 
        SELECT tu.user_id AS uid FROM public.tenant_users tu
        WHERE tu.tenant_id = v_tenant_id 
          AND tu.is_active = true
      LOOP
        INSERT INTO public.chat_participants (channel_id, user_id, role) VALUES (NEW.id, rec.uid, 'member') ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
