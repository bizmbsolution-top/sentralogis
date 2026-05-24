-- ============================================================
-- MIGRATION 024: Seed ALL Tenant Members to WO/JO Chat Channels
-- ============================================================
-- Ensure ALL active tenant users (including Directors, Finance, HQ) 
-- can see and participate in WO/JO chat channels

CREATE OR REPLACE FUNCTION public.fn_seed_channel_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  v_tenant_id UUID;
  v_channel_uuid UUID;
  v_sbu_types TEXT[];
  v_sbu TEXT;
BEGIN
  -- 1. Safe cast: try converting channel_id to UUID
  BEGIN
    v_channel_uuid := NEW.channel_id::uuid;
  EXCEPTION WHEN OTHERS THEN
    -- If cast fails (e.g. direct chat ID like 'user1-user2'), skip WO/JO seeding
    RETURN NEW;
  END;

  -- 2. Handle WORK_ORDER channels
  IF NEW.channel_type = 'work_order' THEN
    -- Get tenant and SBU types from WO items
    SELECT wo.tenant_id, array_agg(DISTINCT wi.sbu_type)
    INTO v_tenant_id, v_sbu_types
    FROM public.work_orders wo
    LEFT JOIN public.wo_items wi ON wi.wo_id = wo.id
    WHERE wo.id = v_channel_uuid
    GROUP BY wo.tenant_id;

    -- Seed: WO creator
    FOR rec IN SELECT wo.created_by AS uid FROM public.work_orders wo WHERE wo.id = v_channel_uuid AND wo.created_by IS NOT NULL LOOP
      INSERT INTO public.chat_participants (channel_id, user_id, role) VALUES (NEW.id, rec.uid, 'member') ON CONFLICT DO NOTHING;
    END LOOP;

    -- Seed: ALL active tenant users (Directors, HQ, SBU, Finance, Admin, etc.)
    IF v_tenant_id IS NOT NULL THEN
      FOR rec IN 
        SELECT tu.user_id AS uid FROM public.tenant_users tu
        WHERE tu.tenant_id = v_tenant_id 
          AND tu.is_active = true
      LOOP
        INSERT INTO public.chat_participants (channel_id, user_id, role) VALUES (NEW.id, rec.uid, 'member') ON CONFLICT DO NOTHING;
      END LOOP;
    END IF;

  -- 3. Handle JOB_ORDER channels
  ELSIF NEW.channel_type = 'job_order' THEN
    -- Get tenant and SBU type from JO's parent WO item
    SELECT wo.tenant_id, wi.sbu_type
    INTO v_tenant_id, v_sbu
    FROM public.job_orders jo
    JOIN public.wo_items wi ON wi.id = jo.wo_item_id
    JOIN public.work_orders wo ON wo.id = wi.wo_id
    WHERE jo.id = v_channel_uuid
    LIMIT 1;

    -- Seed: driver
    FOR rec IN SELECT jo.driver_id AS uid FROM public.job_orders jo WHERE jo.id = v_channel_uuid AND jo.driver_id IS NOT NULL LOOP
      INSERT INTO public.chat_participants (channel_id, user_id, role) VALUES (NEW.id, rec.uid, 'member') ON CONFLICT DO NOTHING;
    END LOOP;

    -- Seed: assigned_by
    FOR rec IN SELECT jo.assigned_by AS uid FROM public.job_orders jo WHERE jo.id = v_channel_uuid AND jo.assigned_by IS NOT NULL LOOP
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
$$;

-- Re-attach trigger
DROP TRIGGER IF EXISTS trg_seed_channel_participants ON public.chat_channels;
CREATE TRIGGER trg_seed_channel_participants
  AFTER INSERT ON public.chat_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_seed_channel_participants();

COMMENT ON FUNCTION public.fn_seed_channel_participants() IS 'Auto-seeds ALL active tenant users as participants for WO/JO chat channels';
