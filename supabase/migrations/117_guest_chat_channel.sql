-- Migration 117: Guest Chat Links and Omnichannel Support
-- Allows external guests to chat via unique links

-- 1. Update chat_channels check constraint to include 'lead'
ALTER TABLE public.chat_channels DROP CONSTRAINT IF EXISTS chat_channels_channel_type_check;
ALTER TABLE public.chat_channels ADD CONSTRAINT chat_channels_channel_type_check 
  CHECK (channel_type IN ('job_order', 'work_order', 'direct', 'group', 'lead'));

-- 2. Modify chat_messages to allow Guest Messages (sender_id = NULL)
ALTER TABLE public.chat_messages ALTER COLUMN sender_id DROP NOT NULL;
ALTER TABLE public.chat_messages ADD COLUMN IF NOT EXISTS guest_sender_name TEXT;

-- 3. Table for Guest Chat Links
CREATE TABLE IF NOT EXISTS public.crm_guest_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  entity_id UUID NOT NULL REFERENCES public.md_entities(id) ON DELETE CASCADE,
  token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  channel_id UUID REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_crm_guest_links_token ON public.crm_guest_links(token);

ALTER TABLE public.crm_guest_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guest_links_tenant_isolation" ON public.crm_guest_links
  FOR ALL USING (tenant_id = public.fn_get_user_tenant_id());

-- 4. Secure RPC to allow Unauthenticated Guests to send messages
-- Bypasses RLS because it's SECURITY DEFINER
CREATE OR REPLACE FUNCTION public.rpc_guest_send_message(
  p_token UUID,
  p_message TEXT
) RETURNS JSONB AS $$
DECLARE
  v_link RECORD;
  v_entity RECORD;
  v_channel_id UUID;
  v_message_id UUID;
BEGIN
  -- Validate Token
  SELECT * INTO v_link FROM public.crm_guest_links 
  WHERE token = p_token AND is_active = true;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired chat token';
  END IF;

  -- Get Entity Details
  SELECT * INTO v_entity FROM public.md_entities WHERE id = v_link.entity_id;

  -- Ensure Channel Exists
  IF v_link.channel_id IS NULL THEN
    INSERT INTO public.chat_channels (channel_type, channel_id, title)
    VALUES ('lead', v_entity.id, 'Chat: ' || v_entity.name)
    RETURNING id INTO v_channel_id;

    -- Update the link with the new channel
    UPDATE public.crm_guest_links SET channel_id = v_channel_id WHERE id = v_link.id;

    -- Add the Sales Rep as participant
    IF v_entity.sales_rep_id IS NOT NULL THEN
      INSERT INTO public.chat_participants (channel_id, user_id, role)
      VALUES (v_channel_id, v_entity.sales_rep_id, 'admin');
    END IF;
  ELSE
    v_channel_id := v_link.channel_id;
  END IF;

  -- Insert the Message
  INSERT INTO public.chat_messages (channel_id, message, guest_sender_name)
  VALUES (v_channel_id, p_message, v_entity.name)
  RETURNING id INTO v_message_id;

  RETURN jsonb_build_object('success', true, 'message_id', v_message_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to anon (guests)
GRANT EXECUTE ON FUNCTION public.rpc_guest_send_message(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_guest_send_message(UUID, TEXT) TO authenticated;

-- 5. Secure RPC to allow Guests to read messages
CREATE OR REPLACE FUNCTION public.rpc_guest_get_messages(
  p_token UUID
) RETURNS SETOF public.chat_messages AS $$
DECLARE
  v_channel_id UUID;
BEGIN
  SELECT channel_id INTO v_channel_id 
  FROM public.crm_guest_links 
  WHERE token = p_token AND is_active = true;

  IF v_channel_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY 
    SELECT * FROM public.chat_messages 
    WHERE channel_id = v_channel_id 
    ORDER BY created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.rpc_guest_get_messages(UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.rpc_guest_get_messages(UUID) TO authenticated;

SELECT '117_guest_chat_channel applied successfully' as result;
