-- Migration 019: Chat Groups, Enhancements, Auto-Seed, KPI Support
-- 1. chat_groups — group chats (sbu, role, organization, custom)
-- 2. chat_group_members — group membership
-- 3. chat_attachments — file attachments
-- 4. Enhance chat_messages with context tracking + pinned
-- 5. Enhance chat_channels with group_id
-- 6. Auto-seed SBU/role groups from profiles
-- 7. RLS policies for new tables

-- ============================================================
-- 1. chat_groups
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_groups (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  name          TEXT NOT NULL,
  group_type    TEXT NOT NULL DEFAULT 'custom' CHECK (group_type IN ('sbu', 'role', 'organization', 'custom')),
  description   TEXT,
  avatar_url    TEXT,
  created_by    UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_groups_tenant ON chat_groups(tenant_id);
CREATE INDEX IF NOT EXISTS idx_chat_groups_type ON chat_groups(group_type);

COMMENT ON TABLE chat_groups IS 'Group chats for SBU, role, organization, or custom teams';
COMMENT ON COLUMN chat_groups.group_type IS 'sbu=auto from sbu_access, role=auto from role, org=auto from org, custom=manual';

-- ============================================================
-- 2. chat_group_members
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_group_members (
  group_id    UUID NOT NULL REFERENCES chat_groups(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES auth.users(id),
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  joined_at   TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_group_members_user ON chat_group_members(user_id);

COMMENT ON TABLE chat_group_members IS 'Users who belong to a group chat';

-- ============================================================
-- 3. chat_attachments
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_attachments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id  UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  file_url    TEXT NOT NULL,
  file_name   TEXT NOT NULL,
  file_type   TEXT,
  file_size   INTEGER,
  created_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_attachments_message ON chat_attachments(message_id);

COMMENT ON TABLE chat_attachments IS 'File attachments linked to chat messages';

-- ============================================================
-- 4. Enhance chat_messages
-- ============================================================
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS context_type TEXT
  CHECK (context_type IN ('job_order', 'work_order', 'wo_item', 'direct', 'group'));
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS context_id UUID;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ;
ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_chat_messages_context ON chat_messages(context_type, context_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_pinned ON chat_messages(is_pinned) WHERE is_pinned = true;

COMMENT ON COLUMN chat_messages.context_type IS 'What context the message was sent in';
COMMENT ON COLUMN chat_messages.context_id IS 'Entity ID being discussed when message sent';
COMMENT ON COLUMN chat_messages.is_pinned IS 'Whether this message is pinned';

-- ============================================================
-- 5. Enhance chat_channels
-- ============================================================
ALTER TABLE chat_channels ADD COLUMN IF NOT EXISTS group_id UUID REFERENCES chat_groups(id);

-- Update channel_type check to include 'group'
ALTER TABLE chat_channels DROP CONSTRAINT IF EXISTS chat_channels_channel_type_check;
ALTER TABLE chat_channels ADD CONSTRAINT chat_channels_channel_type_check
  CHECK (channel_type IN ('job_order', 'work_order', 'direct', 'group'));

COMMENT ON COLUMN chat_channels.group_id IS 'Links to chat_groups for group channels';

-- ============================================================
-- 6. Auto-seed SBU/role groups from profiles
-- ============================================================

-- Function to create default groups for a tenant
CREATE OR REPLACE FUNCTION fn_create_default_groups(tenant_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  group_rec RECORD;
BEGIN
  -- Create SBU groups
  INSERT INTO chat_groups (tenant_id, name, group_type, description)
  VALUES
    (tenant_uuid, 'SBU Trucking', 'sbu', 'Diskusi operasional trucking'),
    (tenant_uuid, 'SBU Warehouse', 'sbu', 'Diskusi operasional warehouse'),
    (tenant_uuid, 'SBU Clearance', 'sbu', 'Diskusi operasional customs clearance'),
    (tenant_uuid, 'SBU Forwarding', 'sbu', 'Diskusi operasional freight forwarding'),
    (tenant_uuid, 'HQ Operations', 'role', 'Diskusi operasional HQ'),
    (tenant_uuid, 'All Staff', 'custom', 'Semua staff dalam tenant')
  ON CONFLICT DO NOTHING;

  -- Seed SBU Trucking members
  INSERT INTO chat_group_members (group_id, user_id)
  SELECT g.id, p.id
  FROM chat_groups g
  CROSS JOIN profiles p
  WHERE g.tenant_id = tenant_uuid
    AND g.group_type = 'sbu'
    AND g.name = 'SBU Trucking'
    AND p.tenant_id = tenant_uuid
    AND p.is_active = true
    AND 'trucking' = ANY(p.sbu_access)
  ON CONFLICT DO NOTHING;

  -- Seed SBU Warehouse members
  INSERT INTO chat_group_members (group_id, user_id)
  SELECT g.id, p.id
  FROM chat_groups g
  CROSS JOIN profiles p
  WHERE g.tenant_id = tenant_uuid
    AND g.group_type = 'sbu'
    AND g.name = 'SBU Warehouse'
    AND p.tenant_id = tenant_uuid
    AND p.is_active = true
    AND 'warehouse' = ANY(p.sbu_access)
  ON CONFLICT DO NOTHING;

  -- Seed SBU Clearance members
  INSERT INTO chat_group_members (group_id, user_id)
  SELECT g.id, p.id
  FROM chat_groups g
  CROSS JOIN profiles p
  WHERE g.tenant_id = tenant_uuid
    AND g.group_type = 'sbu'
    AND g.name = 'SBU Clearance'
    AND p.tenant_id = tenant_uuid
    AND p.is_active = true
    AND 'clearance' = ANY(p.sbu_access)
  ON CONFLICT DO NOTHING;

  -- Seed SBU Forwarding members
  INSERT INTO chat_group_members (group_id, user_id)
  SELECT g.id, p.id
  FROM chat_groups g
  CROSS JOIN profiles p
  WHERE g.tenant_id = tenant_uuid
    AND g.group_type = 'sbu'
    AND g.name = 'SBU Forwarding'
    AND p.tenant_id = tenant_uuid
    AND p.is_active = true
    AND 'forwarding' = ANY(p.sbu_access)
  ON CONFLICT DO NOTHING;

  -- Seed HQ Operations members (admin_wo, admin_finance, director, tenant_admin, superadmin)
  INSERT INTO chat_group_members (group_id, user_id)
  SELECT g.id, p.id
  FROM chat_groups g
  CROSS JOIN profiles p
  WHERE g.tenant_id = tenant_uuid
    AND g.group_type = 'role'
    AND g.name = 'HQ Operations'
    AND p.tenant_id = tenant_uuid
    AND p.is_active = true
    AND p.role IN ('admin_wo', 'admin_finance', 'director', 'tenant_admin', 'superadmin', 'viewer')
  ON CONFLICT DO NOTHING;

  -- Seed All Staff members
  INSERT INTO chat_group_members (group_id, user_id)
  SELECT g.id, p.id
  FROM chat_groups g
  CROSS JOIN profiles p
  WHERE g.tenant_id = tenant_uuid
    AND g.group_type = 'custom'
    AND g.name = 'All Staff'
    AND p.tenant_id = tenant_uuid
    AND p.is_active = true
  ON CONFLICT DO NOTHING;
END;
$$;

-- Function to add user to matching SBU groups when profile is created/updated
CREATE OR REPLACE FUNCTION fn_sync_user_to_sbu_groups()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add to SBU Trucking if has trucking access
  IF 'trucking' = ANY(NEW.sbu_access) THEN
    INSERT INTO chat_group_members (group_id, user_id)
    SELECT g.id, NEW.id
    FROM chat_groups g
    WHERE g.tenant_id = NEW.tenant_id
      AND g.group_type = 'sbu'
      AND g.name = 'SBU Trucking'
    ON CONFLICT DO NOTHING;
  END IF;

  -- Add to SBU Warehouse if has warehouse access
  IF 'warehouse' = ANY(NEW.sbu_access) THEN
    INSERT INTO chat_group_members (group_id, user_id)
    SELECT g.id, NEW.id
    FROM chat_groups g
    WHERE g.tenant_id = NEW.tenant_id
      AND g.group_type = 'sbu'
      AND g.name = 'SBU Warehouse'
    ON CONFLICT DO NOTHING;
  END IF;

  -- Add to SBU Clearance if has clearance access
  IF 'clearance' = ANY(NEW.sbu_access) THEN
    INSERT INTO chat_group_members (group_id, user_id)
    SELECT g.id, NEW.id
    FROM chat_groups g
    WHERE g.tenant_id = NEW.tenant_id
      AND g.group_type = 'sbu'
      AND g.name = 'SBU Clearance'
    ON CONFLICT DO NOTHING;
  END IF;

  -- Add to SBU Forwarding if has forwarding access
  IF 'forwarding' = ANY(NEW.sbu_access) THEN
    INSERT INTO chat_group_members (group_id, user_id)
    SELECT g.id, NEW.id
    FROM chat_groups g
    WHERE g.tenant_id = NEW.tenant_id
      AND g.group_type = 'sbu'
      AND g.name = 'SBU Forwarding'
    ON CONFLICT DO NOTHING;
  END IF;

  -- Add to HQ Operations if role matches
  IF NEW.role IN ('admin_wo', 'admin_finance', 'director', 'tenant_admin', 'superadmin', 'viewer') THEN
    INSERT INTO chat_group_members (group_id, user_id)
    SELECT g.id, NEW.id
    FROM chat_groups g
    WHERE g.tenant_id = NEW.tenant_id
      AND g.group_type = 'role'
      AND g.name = 'HQ Operations'
    ON CONFLICT DO NOTHING;
  END IF;

  -- Add to All Staff
  INSERT INTO chat_group_members (group_id, user_id)
  SELECT g.id, NEW.id
  FROM chat_groups g
  WHERE g.tenant_id = NEW.tenant_id
    AND g.group_type = 'custom'
    AND g.name = 'All Staff'
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_to_sbu_groups ON profiles;
CREATE TRIGGER trg_sync_user_to_sbu_groups
  AFTER INSERT OR UPDATE OF sbu_access, role, tenant_id ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION fn_sync_user_to_sbu_groups();

-- ============================================================
-- 7. RLS Policies
-- ============================================================

-- chat_groups
ALTER TABLE chat_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_groups_select_member ON chat_groups;
CREATE POLICY chat_groups_select_member ON chat_groups
  FOR SELECT
  USING (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND is_active = true)
  );

DROP POLICY IF EXISTS chat_groups_insert_tenant ON chat_groups;
CREATE POLICY chat_groups_insert_tenant ON chat_groups
  FOR INSERT
  WITH CHECK (
    tenant_id IN (SELECT tenant_id FROM profiles WHERE id = auth.uid() AND is_active = true)
  );

DROP POLICY IF EXISTS chat_groups_update_admin ON chat_groups;
CREATE POLICY chat_groups_update_admin ON chat_groups
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM chat_group_members
      WHERE chat_group_members.group_id = chat_groups.id
        AND chat_group_members.user_id = auth.uid()
        AND chat_group_members.role = 'admin'
    )
    OR created_by = auth.uid()
  );

-- chat_group_members
ALTER TABLE chat_group_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_group_members_select_member ON chat_group_members;
CREATE POLICY chat_group_members_select_member ON chat_group_members
  FOR SELECT
  USING (
    group_id IN (
      SELECT id FROM chat_groups WHERE tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid() AND is_active = true
      )
    )
  );

DROP POLICY IF EXISTS chat_group_members_insert_member ON chat_group_members;
CREATE POLICY chat_group_members_insert_member ON chat_group_members
  FOR INSERT
  WITH CHECK (
    group_id IN (
      SELECT id FROM chat_groups WHERE tenant_id IN (
        SELECT tenant_id FROM profiles WHERE id = auth.uid() AND is_active = true
      )
    )
  );

DROP POLICY IF EXISTS chat_group_members_delete_admin ON chat_group_members;
CREATE POLICY chat_group_members_delete_admin ON chat_group_members
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM chat_group_members AS gm
      WHERE gm.group_id = chat_group_members.group_id
        AND gm.user_id = auth.uid()
        AND gm.role = 'admin'
    )
  );

-- chat_attachments
ALTER TABLE chat_attachments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chat_attachments_select_participant ON chat_attachments;
CREATE POLICY chat_attachments_select_participant ON chat_attachments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_messages cm
      JOIN chat_channels cc ON cm.channel_id = cc.id
      WHERE cm.id = chat_attachments.message_id
        AND EXISTS (
          SELECT 1 FROM chat_participants cp
          WHERE cp.channel_id = cc.id AND cp.user_id = auth.uid()
        )
    )
  );

DROP POLICY IF EXISTS chat_attachments_insert_sender ON chat_attachments;
CREATE POLICY chat_attachments_insert_sender ON chat_attachments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chat_messages cm
      WHERE cm.id = chat_attachments.message_id
        AND cm.sender_id = auth.uid()
    )
  );

-- ============================================================
-- 8. Enable realtime for new tables
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE chat_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_attachments;
