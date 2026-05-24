-- ============================================================
-- MIGRATION 024b: Backfill Participants for Existing WO/JO Channels
-- ============================================================
-- Add all tenant users to existing WO/JO chat channels that were
-- created before migration 024

DO $$
DECLARE
  v_channel RECORD;
  v_tenant_id UUID;
  v_user RECORD;
BEGIN
  -- Iterate over all existing WO/JO channels
  FOR v_channel IN 
    SELECT cc.id, cc.channel_type, cc.channel_id
    FROM public.chat_channels cc
    WHERE cc.channel_type IN ('work_order', 'job_order')
  LOOP
    -- Get tenant_id based on channel type
    IF v_channel.channel_type = 'work_order' THEN
      SELECT wo.tenant_id INTO v_tenant_id
      FROM public.work_orders wo
      WHERE wo.id = v_channel.channel_id::uuid
      LIMIT 1;
    ELSIF v_channel.channel_type = 'job_order' THEN
      SELECT wo.tenant_id INTO v_tenant_id
      FROM public.job_orders jo
      JOIN public.wo_items wi ON wi.id = jo.wo_item_id
      JOIN public.work_orders wo ON wo.id = wi.wo_id
      WHERE jo.id = v_channel.channel_id::uuid
      LIMIT 1;
    END IF;

    -- Seed all active tenant users
    IF v_tenant_id IS NOT NULL THEN
      FOR v_user IN 
        SELECT tu.user_id 
        FROM public.tenant_users tu
        WHERE tu.tenant_id = v_tenant_id 
          AND tu.is_active = true
      LOOP
        INSERT INTO public.chat_participants (channel_id, user_id, role)
        VALUES (v_channel.id, v_user.user_id, 'member')
        ON CONFLICT (channel_id, user_id) DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;
END $$;

COMMENT ON TABLE public.chat_participants IS 'Backfilled: All tenant users added to existing WO/JO channels';
