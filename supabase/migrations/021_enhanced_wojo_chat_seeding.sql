-- ============================================================
-- MIGRATION 021: Enhanced WO/JO Chat Participant Seeding
-- ============================================================
-- Auto-seed ALL relevant stakeholders when WO/JO chat channels are created

CREATE OR REPLACE FUNCTION public.fn_seed_channel_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
  v_tenant_id UUID;
  v_wo_id UUID;
BEGIN
  -- Get tenant_id from the entity
  IF NEW.channel_type = 'job_order' THEN
    -- Get tenant from JO
    SELECT wo.tenant_id INTO v_tenant_id
    FROM public.job_orders jo
    JOIN public.wo_items wi ON wi.id = jo.wo_item_id
    JOIN public.work_orders wo ON wo.id = wi.wo_id
    WHERE jo.id = NEW.channel_id
    LIMIT 1;

    -- Seed: driver
    FOR rec IN
      SELECT jo.driver_id AS uid FROM public.job_orders jo WHERE jo.id = NEW.channel_id AND jo.driver_id IS NOT NULL
    LOOP
      INSERT INTO public.chat_participants (channel_id, user_id, role)
      VALUES (NEW.id, rec.uid, 'member')
      ON CONFLICT (channel_id, user_id) DO NOTHING;
    END LOOP;

    -- Seed: assigned_by (ops who assigned)
    FOR rec IN
      SELECT jo.assigned_by AS uid FROM public.job_orders jo WHERE jo.id = NEW.channel_id AND jo.assigned_by IS NOT NULL
    LOOP
      INSERT INTO public.chat_participants (channel_id, user_id, role)
      VALUES (NEW.id, rec.uid, 'member')
      ON CONFLICT (channel_id, user_id) DO NOTHING;
    END LOOP;

    -- Seed: SBU Manager (trucking)
    IF v_tenant_id IS NOT NULL THEN
      FOR rec IN
        SELECT tu.user_id AS uid FROM public.tenant_users tu
        WHERE tu.tenant_id = v_tenant_id
          AND tu.is_active = true
          AND tu.role_code IN ('sbu_manager_tr', 'sbu_ops_tr')
      LOOP
        INSERT INTO public.chat_participants (channel_id, user_id, role)
        VALUES (NEW.id, rec.uid, 'member')
        ON CONFLICT (channel_id, user_id) DO NOTHING;
      END LOOP;
    END IF;

  ELSIF NEW.channel_type = 'work_order' THEN
    -- Get tenant from WO
    SELECT wo.tenant_id INTO v_tenant_id
    FROM public.work_orders wo
    WHERE wo.id = NEW.channel_id
    LIMIT 1;

    -- Seed: created_by (CS who created)
    FOR rec IN
      SELECT wo.created_by AS uid FROM public.work_orders wo WHERE wo.id = NEW.channel_id AND wo.created_by IS NOT NULL
    LOOP
      INSERT INTO public.chat_participants (channel_id, user_id, role)
      VALUES (NEW.id, rec.uid, 'member')
      ON CONFLICT (channel_id, user_id) DO NOTHING;
    END LOOP;

    -- Seed: SBU Manager & Finance
    IF v_tenant_id IS NOT NULL THEN
      FOR rec IN
        SELECT tu.user_id AS uid FROM public.tenant_users tu
        WHERE tu.tenant_id = v_tenant_id
          AND tu.is_active = true
          AND tu.role_code IN ('sbu_manager_tr', 'sbu_fin_tr', 'sbu_ops_tr')
      LOOP
        INSERT INTO public.chat_participants (channel_id, user_id, role)
        VALUES (NEW.id, rec.uid, 'member')
        ON CONFLICT (channel_id, user_id) DO NOTHING;
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_channel_participants ON public.chat_channels;
CREATE TRIGGER trg_seed_channel_participants
  AFTER INSERT ON public.chat_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_seed_channel_participants();

COMMENT ON FUNCTION public.fn_seed_channel_participants() IS 'Auto-seeds chat_participants for WO/JO channels with all relevant stakeholders';
