-- ============================================================
-- RUN THIS IN SUPABASE SQL EDITOR
-- Chat System Full Setup (Migrations 018 + 019 + 020)
-- Handles existing tables and missing columns gracefully
-- ============================================================

-- ============================================================
-- MIGRATION 018: Core Chat Tables
-- ============================================================

-- 1. chat_channels
CREATE TABLE IF NOT EXISTS public.chat_channels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_type  TEXT NOT NULL CHECK (channel_type IN ('job_order', 'work_order', 'direct', 'group')),
  channel_id    TEXT NOT NULL,
  title         TEXT,
  group_id      UUID,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_channel_unique
  ON public.chat_channels(channel_type, channel_id);

-- 2. chat_messages
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id    UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL REFERENCES auth.users(id),
  message       TEXT NOT NULL,
  parent_id     UUID REFERENCES public.chat_messages(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Add extra columns if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'context_type') THEN
    ALTER TABLE public.chat_messages ADD COLUMN context_type TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'context_id') THEN
    ALTER TABLE public.chat_messages ADD COLUMN context_id UUID;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'is_pinned') THEN
    ALTER TABLE public.chat_messages ADD COLUMN is_pinned BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'pinned_at') THEN
    ALTER TABLE public.chat_messages ADD COLUMN pinned_at TIMESTAMPTZ;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_messages' AND column_name = 'pinned_by') THEN
    ALTER TABLE public.chat_messages ADD COLUMN pinned_by UUID REFERENCES auth.users(id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel ON public.chat_messages(channel_id, created_at);
CREATE INDEX IF NOT EXISTS idx_chat_messages_parent ON public.chat_messages(parent_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_context ON public.chat_messages(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_pinned ON public.chat_messages(is_pinned) WHERE is_pinned = true;

-- 3. chat_participants
CREATE TABLE IF NOT EXISTS public.chat_participants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id    UUID NOT NULL REFERENCES public.chat_channels(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  last_read_at  TIMESTAMPTZ,
  joined_at     TIMESTAMPTZ DEFAULT now(),
  UNIQUE(channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_participants_user ON public.chat_participants(user_id);

-- ============================================================
-- MIGRATION 019: Chat Groups & Enhancements
-- ============================================================

-- 1. chat_groups
CREATE TABLE IF NOT EXISTS public.chat_groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES public.tenants(id),
  name          TEXT NOT NULL,
  group_type    TEXT NOT NULL DEFAULT 'custom' CHECK (group_type IN ('sbu', 'role', 'organization', 'custom')),
  description   TEXT,
  avatar_url    TEXT,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_groups_tenant ON public.chat_groups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_groups_type ON public.chat_groups(group_type);

-- 2. chat_group_members
CREATE TABLE IF NOT EXISTS public.chat_group_members (
  group_id    UUID NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_group_members_user ON public.chat_group_members(user_id);

-- 3. chat_attachments
CREATE TABLE IF NOT EXISTS public.chat_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  file_url    TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  file_type   TEXT,
  file_size   INTEGER,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_attachments_message ON public.chat_attachments(message_id);

-- 4. Add group_id FK to chat_channels if not exists
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'chat_channels' AND column_name = 'group_id') THEN
    ALTER TABLE public.chat_channels ADD COLUMN group_id UUID REFERENCES public.chat_groups(id);
  END IF;
END $$;

-- ============================================================
-- HELPER FUNCTION: Get user's tenant_id from tenant_users
-- ============================================================
CREATE OR REPLACE FUNCTION public.fn_get_user_tenant_id()
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  SELECT tenant_id INTO v_tenant_id FROM public.tenant_users WHERE user_id = auth.uid() AND is_active = true LIMIT 1;
  RETURN v_tenant_id;
END;
$$;

-- ============================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================

-- Auto-seed participants on channel creation
CREATE OR REPLACE FUNCTION public.fn_seed_channel_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  IF NEW.channel_type = 'job_order' THEN
    FOR rec IN
      SELECT jo.driver_id AS uid FROM public.job_orders jo WHERE jo.id = NEW.channel_id AND jo.driver_id IS NOT NULL
      UNION
      SELECT jo.assigned_by AS uid FROM public.job_orders jo WHERE jo.id = NEW.channel_id AND jo.assigned_by IS NOT NULL
    LOOP
      INSERT INTO public.chat_participants (channel_id, user_id)
      VALUES (NEW.id, rec.uid)
      ON CONFLICT (channel_id, user_id) DO NOTHING;
    END LOOP;
  ELSIF NEW.channel_type = 'work_order' THEN
    FOR rec IN
      SELECT wo.created_by AS uid FROM public.work_orders wo WHERE wo.id = NEW.channel_id AND wo.created_by IS NOT NULL
    LOOP
      INSERT INTO public.chat_participants (channel_id, user_id)
      VALUES (NEW.id, rec.uid)
      ON CONFLICT (channel_id, user_id) DO NOTHING;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_channel_participants ON public.chat_channels;
CREATE TRIGGER trg_seed_channel_participants
  AFTER INSERT ON public.chat_channels
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_seed_channel_participants();

-- Check if profiles has required columns for SBU sync
-- Create the sync function unconditionally (uses tenant_users for tenant_id)
CREATE OR REPLACE FUNCTION public.fn_sync_user_to_sbu_groups()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Get tenant_id from tenant_users
  SELECT tenant_id INTO v_tenant_id FROM public.tenant_users WHERE user_id = NEW.id AND is_active = true LIMIT 1;
  IF v_tenant_id IS NULL THEN RETURN NEW; END IF;

  -- Check if profiles has sbu_access column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'sbu_access') THEN
    RETURN NEW;
  END IF;

  IF 'trucking' = ANY(NEW.sbu_access) THEN
    INSERT INTO public.chat_group_members (group_id, user_id)
    SELECT g.id, NEW.id FROM public.chat_groups g
    WHERE g.tenant_id = v_tenant_id AND g.group_type = 'sbu' AND g.name = 'SBU Trucking'
    ON CONFLICT DO NOTHING;
  END IF;
  IF 'warehouse' = ANY(NEW.sbu_access) THEN
    INSERT INTO public.chat_group_members (group_id, user_id)
    SELECT g.id, NEW.id FROM public.chat_groups g
    WHERE g.tenant_id = v_tenant_id AND g.group_type = 'sbu' AND g.name = 'SBU Warehouse'
    ON CONFLICT DO NOTHING;
  END IF;
  IF 'clearance' = ANY(NEW.sbu_access) THEN
    INSERT INTO public.chat_group_members (group_id, user_id)
    SELECT g.id, NEW.id FROM public.chat_groups g
    WHERE g.tenant_id = v_tenant_id AND g.group_type = 'sbu' AND g.name = 'SBU Clearance'
    ON CONFLICT DO NOTHING;
  END IF;
  IF 'forwarding' = ANY(NEW.sbu_access) THEN
    INSERT INTO public.chat_group_members (group_id, user_id)
    SELECT g.id, NEW.id FROM public.chat_groups g
    WHERE g.tenant_id = v_tenant_id AND g.group_type = 'sbu' AND g.name = 'SBU Forwarding'
    ON CONFLICT DO NOTHING;
  END IF;
  IF NEW.role IN ('admin_wo', 'admin_finance', 'director', 'tenant_admin', 'superadmin', 'viewer') THEN
    INSERT INTO public.chat_group_members (group_id, user_id)
    SELECT g.id, NEW.id FROM public.chat_groups g
    WHERE g.tenant_id = v_tenant_id AND g.group_type = 'role' AND g.name = 'HQ Operations'
    ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO public.chat_group_members (group_id, user_id)
  SELECT g.id, NEW.id FROM public.chat_groups g
  WHERE g.tenant_id = v_tenant_id AND g.group_type = 'custom' AND g.name = 'All Staff'
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

-- Only create trigger if profiles table has sbu_access
DO $$
DECLARE
  v_has_sbu_access BOOLEAN;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'sbu_access') INTO v_has_sbu_access;

  IF v_has_sbu_access THEN
    DROP TRIGGER IF EXISTS trg_sync_user_to_sbu_groups ON public.profiles;
    CREATE TRIGGER trg_sync_user_to_sbu_groups
      AFTER INSERT OR UPDATE OF sbu_access, role ON public.profiles
      FOR EACH ROW
      EXECUTE FUNCTION public.fn_sync_user_to_sbu_groups();
  END IF;
END $$;

-- Function to create default groups for a tenant
CREATE OR REPLACE FUNCTION public.fn_create_default_groups(tenant_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_has_sbu_access BOOLEAN;
BEGIN
  -- Check if profiles has sbu_access column
  SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'sbu_access') INTO v_has_sbu_access;

  -- Create default groups
  INSERT INTO public.chat_groups (tenant_id, name, group_type, description)
  VALUES
    (tenant_uuid, 'SBU Trucking', 'sbu', 'Diskusi operasional trucking'),
    (tenant_uuid, 'SBU Warehouse', 'sbu', 'Diskusi operasional warehouse'),
    (tenant_uuid, 'SBU Clearance', 'sbu', 'Diskusi operasional customs clearance'),
    (tenant_uuid, 'SBU Forwarding', 'sbu', 'Diskusi operasional freight forwarding'),
    (tenant_uuid, 'HQ Operations', 'role', 'Diskusi operasional HQ'),
    (tenant_uuid, 'All Staff', 'custom', 'Semua staff dalam tenant')
  ON CONFLICT DO NOTHING;

  -- Seed members from tenant_users
  IF v_has_sbu_access THEN
    -- SBU groups: join tenant_users with profiles for sbu_access
    INSERT INTO public.chat_group_members (group_id, user_id)
    SELECT g.id, tu.user_id FROM public.chat_groups g
    JOIN public.tenant_users tu ON tu.tenant_id = g.tenant_id AND tu.is_active = true
    JOIN public.profiles p ON p.id = tu.user_id
    WHERE g.tenant_id = tenant_uuid AND g.name = 'SBU Trucking' AND 'trucking' = ANY(p.sbu_access)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.chat_group_members (group_id, user_id)
    SELECT g.id, tu.user_id FROM public.chat_groups g
    JOIN public.tenant_users tu ON tu.tenant_id = g.tenant_id AND tu.is_active = true
    JOIN public.profiles p ON p.id = tu.user_id
    WHERE g.tenant_id = tenant_uuid AND g.name = 'SBU Warehouse' AND 'warehouse' = ANY(p.sbu_access)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.chat_group_members (group_id, user_id)
    SELECT g.id, tu.user_id FROM public.chat_groups g
    JOIN public.tenant_users tu ON tu.tenant_id = g.tenant_id AND tu.is_active = true
    JOIN public.profiles p ON p.id = tu.user_id
    WHERE g.tenant_id = tenant_uuid AND g.name = 'SBU Clearance' AND 'clearance' = ANY(p.sbu_access)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.chat_group_members (group_id, user_id)
    SELECT g.id, tu.user_id FROM public.chat_groups g
    JOIN public.tenant_users tu ON tu.tenant_id = g.tenant_id AND tu.is_active = true
    JOIN public.profiles p ON p.id = tu.user_id
    WHERE g.tenant_id = tenant_uuid AND g.name = 'SBU Forwarding' AND 'forwarding' = ANY(p.sbu_access)
    ON CONFLICT DO NOTHING;

    -- HQ Operations
    INSERT INTO public.chat_group_members (group_id, user_id)
    SELECT g.id, tu.user_id FROM public.chat_groups g
    JOIN public.tenant_users tu ON tu.tenant_id = g.tenant_id AND tu.is_active = true
    WHERE g.tenant_id = tenant_uuid AND g.name = 'HQ Operations'
      AND tu.role_code IN ('admin_wo', 'admin_finance', 'director', 'tenant_admin', 'superadmin', 'viewer')
    ON CONFLICT DO NOTHING;
  END IF;

  -- All Staff: all active tenant_users
  INSERT INTO public.chat_group_members (group_id, user_id)
  SELECT g.id, tu.user_id FROM public.chat_groups g
  JOIN public.tenant_users tu ON tu.tenant_id = g.tenant_id AND tu.is_active = true
  WHERE g.tenant_id = tenant_uuid AND g.name = 'All Staff'
  ON CONFLICT DO NOTHING;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- chat_channels
ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chat_channels_select_participant ON public.chat_channels;
CREATE POLICY chat_channels_select_participant ON public.chat_channels FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_participants.channel_id = chat_channels.id AND chat_participants.user_id = auth.uid()));
DROP POLICY IF EXISTS chat_channels_insert_all ON public.chat_channels;
CREATE POLICY chat_channels_insert_all ON public.chat_channels FOR INSERT WITH CHECK (true);

-- chat_messages
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chat_messages_select_participant ON public.chat_messages;
CREATE POLICY chat_messages_select_participant ON public.chat_messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_participants.channel_id = chat_messages.channel_id AND chat_participants.user_id = auth.uid()));
DROP POLICY IF EXISTS chat_messages_insert_participant ON public.chat_messages;
CREATE POLICY chat_messages_insert_participant ON public.chat_messages FOR INSERT
  WITH CHECK (sender_id = auth.uid() AND EXISTS (SELECT 1 FROM public.chat_participants WHERE chat_participants.channel_id = chat_messages.channel_id AND chat_participants.user_id = auth.uid()));
DROP POLICY IF EXISTS chat_messages_update_own ON public.chat_messages;
CREATE POLICY chat_messages_update_own ON public.chat_messages FOR UPDATE
  USING (sender_id = auth.uid()) WITH CHECK (sender_id = auth.uid());
DROP POLICY IF EXISTS chat_messages_delete_own ON public.chat_messages;
CREATE POLICY chat_messages_delete_own ON public.chat_messages FOR DELETE
  USING (sender_id = auth.uid());

-- chat_participants
ALTER TABLE public.chat_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chat_participants_select_own ON public.chat_participants;
CREATE POLICY chat_participants_select_own ON public.chat_participants FOR SELECT
  USING (user_id = auth.uid());
DROP POLICY IF EXISTS chat_participants_insert_trigger ON public.chat_participants;
CREATE POLICY chat_participants_insert_trigger ON public.chat_participants FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS chat_participants_update_own ON public.chat_participants;
CREATE POLICY chat_participants_update_own ON public.chat_participants FOR UPDATE
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- chat_groups (uses tenant_users for tenant lookup)
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chat_groups_select_member ON public.chat_groups;
CREATE POLICY chat_groups_select_member ON public.chat_groups FOR SELECT
  USING (tenant_id = public.fn_get_user_tenant_id());
DROP POLICY IF EXISTS chat_groups_insert_tenant ON public.chat_groups;
CREATE POLICY chat_groups_insert_tenant ON public.chat_groups FOR INSERT
  WITH CHECK (tenant_id = public.fn_get_user_tenant_id());
DROP POLICY IF EXISTS chat_groups_update_admin ON public.chat_groups;
CREATE POLICY chat_groups_update_admin ON public.chat_groups FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.chat_group_members WHERE chat_group_members.group_id = chat_groups.id AND chat_group_members.user_id = auth.uid() AND chat_group_members.role = 'admin') OR created_by = auth.uid());

-- chat_group_members
ALTER TABLE public.chat_group_members ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chat_group_members_select_member ON public.chat_group_members;
CREATE POLICY chat_group_members_select_member ON public.chat_group_members FOR SELECT
  USING (group_id IN (SELECT id FROM public.chat_groups WHERE tenant_id = public.fn_get_user_tenant_id()));
DROP POLICY IF EXISTS chat_group_members_insert_member ON public.chat_group_members;
CREATE POLICY chat_group_members_insert_member ON public.chat_group_members FOR INSERT
  WITH CHECK (group_id IN (SELECT id FROM public.chat_groups WHERE tenant_id = public.fn_get_user_tenant_id()));
DROP POLICY IF EXISTS chat_group_members_delete_admin ON public.chat_group_members;
CREATE POLICY chat_group_members_delete_admin ON public.chat_group_members FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.chat_group_members AS gm WHERE gm.group_id = chat_group_members.group_id AND gm.user_id = auth.uid() AND gm.role = 'admin'));

-- chat_attachments
ALTER TABLE public.chat_attachments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS chat_attachments_select_participant ON public.chat_attachments;
CREATE POLICY chat_attachments_select_participant ON public.chat_attachments FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.chat_messages cm JOIN public.chat_channels cc ON cm.channel_id = cc.id WHERE cm.id = chat_attachments.message_id AND EXISTS (SELECT 1 FROM public.chat_participants cp WHERE cp.channel_id = cc.id AND cp.user_id = auth.uid())));
DROP POLICY IF EXISTS chat_attachments_insert_sender ON public.chat_attachments;
CREATE POLICY chat_attachments_insert_sender ON public.chat_attachments FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.chat_messages cm WHERE cm.id = chat_attachments.message_id AND cm.sender_id = auth.uid()));

-- ============================================================
-- REALTIME
-- ============================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_groups;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_group_members;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_attachments;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- ============================================================
-- MIGRATION 020: Storage Bucket for Attachments
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-files', 'chat-files', true, 10485760,
  ARRAY['image/jpeg','image/png','image/gif','image/webp','application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/zip','text/plain']::text[]
) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow authenticated users to upload chat files" ON storage.objects;
CREATE POLICY "Allow authenticated users to upload chat files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'chat-files' AND (storage.foldername(name))[1] = 'chat-attachments');

DROP POLICY IF EXISTS "Allow public to read chat files" ON storage.objects;
CREATE POLICY "Allow public to read chat files" ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'chat-files');

DROP POLICY IF EXISTS "Allow users to delete their own chat files" ON storage.objects;
CREATE POLICY "Allow users to delete their own chat files" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'chat-files' AND auth.uid()::text = (storage.foldername(name))[2]);

-- ============================================================
-- DONE! Verify:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name LIKE 'chat_%';
-- ============================================================
