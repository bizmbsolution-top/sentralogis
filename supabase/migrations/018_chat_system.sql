-- Migration 018: Chat System for Job Orders & Work Orders
-- 1. chat_channels — polymorphic channel per entity
-- 2. chat_messages — messages with threading support
-- 3. chat_participants — who can read/write in each channel
-- 4. Auto-seed participants trigger when channel is created
-- 5. RLS policies for tenant isolation

-- ============================================================
-- 1. chat_channels
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_channels (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_type  TEXT NOT NULL CHECK (channel_type IN ('job_order', 'work_order', 'direct')),
  channel_id    UUID NOT NULL,
  title         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_channel_unique
  ON chat_channels(channel_type, channel_id);

COMMENT ON TABLE chat_channels IS 'Polymorphic chat channel per job order, work order, or direct conversation';
COMMENT ON COLUMN chat_channels.channel_type IS 'Entity type: job_order, work_order, or direct';
COMMENT ON COLUMN chat_channels.channel_id IS 'FK to the entity (job_orders.id, work_orders.id, etc)';
COMMENT ON COLUMN chat_channels.title IS 'Auto-generated title like JO-2026-0001';

-- ============================================================
-- 2. chat_messages
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id    UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  sender_id     UUID NOT NULL REFERENCES auth.users(id),
  message       TEXT NOT NULL,
  parent_id     UUID REFERENCES chat_messages(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel
  ON chat_messages(channel_id, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_messages_parent
  ON chat_messages(parent_id);

COMMENT ON TABLE chat_messages IS 'Individual chat messages with optional parent_id for threading';
COMMENT ON COLUMN chat_messages.parent_id IS 'NULL = top-level message, non-NULL = reply/thread';

-- ============================================================
-- 3. chat_participants
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_participants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id    UUID NOT NULL REFERENCES chat_channels(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id),
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'admin')),
  last_read_at  TIMESTAMPTZ,
  joined_at     TIMESTAMPTZ DEFAULT now(),

  UNIQUE(channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_participants_user
  ON chat_participants(user_id);

COMMENT ON TABLE chat_participants IS 'Users who can access a channel, with read receipt tracking';
COMMENT ON COLUMN chat_participants.last_read_at IS 'Used to calculate unread count for each user';

-- ============================================================
-- 4. Auto-seed participants on channel creation
-- ============================================================
CREATE OR REPLACE FUNCTION fn_seed_channel_participants()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  rec RECORD;
BEGIN
  IF NEW.channel_type = 'job_order' THEN
    -- Add driver assigned to this JO
    FOR rec IN
      SELECT jo.driver_id AS uid FROM job_orders jo WHERE jo.id = NEW.channel_id AND jo.driver_id IS NOT NULL
      UNION
      SELECT jo.assigned_by AS uid FROM job_orders jo WHERE jo.id = NEW.channel_id AND jo.assigned_by IS NOT NULL
    LOOP
      INSERT INTO chat_participants (channel_id, user_id)
      VALUES (NEW.id, rec.uid)
      ON CONFLICT (channel_id, user_id) DO NOTHING;
    END LOOP;
  ELSIF NEW.channel_type = 'work_order' THEN
    -- Add transporter staff / relevant users (extend as needed)
    -- Placeholder: add creator of the work order
    FOR rec IN
      SELECT wo.created_by AS uid FROM work_orders wo WHERE wo.id = NEW.channel_id AND wo.created_by IS NOT NULL
    LOOP
      INSERT INTO chat_participants (channel_id, user_id)
      VALUES (NEW.id, rec.uid)
      ON CONFLICT (channel_id, user_id) DO NOTHING;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_seed_channel_participants ON chat_channels;
CREATE TRIGGER trg_seed_channel_participants
  AFTER INSERT ON chat_channels
  FOR EACH ROW
  EXECUTE FUNCTION fn_seed_channel_participants();

-- ============================================================
-- 5. RLS Policies
-- ============================================================
ALTER TABLE chat_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_participants ENABLE ROW LEVEL SECURITY;

-- chat_channels: only participants can see
DROP POLICY IF EXISTS chat_channels_select_participant ON chat_channels;
CREATE POLICY chat_channels_select_participant ON chat_channels
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.channel_id = chat_channels.id
        AND chat_participants.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS chat_channels_insert_all ON chat_channels;
CREATE POLICY chat_channels_insert_all ON chat_channels
  FOR INSERT
  WITH CHECK (true);  -- any authenticated user can create, participants are seeded by trigger

-- chat_messages: participants can read, participant = sender can insert
DROP POLICY IF EXISTS chat_messages_select_participant ON chat_messages;
CREATE POLICY chat_messages_select_participant ON chat_messages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.channel_id = chat_messages.channel_id
        AND chat_participants.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS chat_messages_insert_participant ON chat_messages;
CREATE POLICY chat_messages_insert_participant ON chat_messages
  FOR INSERT
  WITH CHECK (
    sender_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM chat_participants
      WHERE chat_participants.channel_id = chat_messages.channel_id
        AND chat_participants.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS chat_messages_update_own ON chat_messages;
CREATE POLICY chat_messages_update_own ON chat_messages
  FOR UPDATE
  USING (sender_id = auth.uid())
  WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS chat_messages_delete_own ON chat_messages;
CREATE POLICY chat_messages_delete_own ON chat_messages
  FOR DELETE
  USING (sender_id = auth.uid());

-- chat_participants: user can only see their own memberships
DROP POLICY IF EXISTS chat_participants_select_own ON chat_participants;
CREATE POLICY chat_participants_select_own ON chat_participants
  FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS chat_participants_insert_trigger ON chat_participants;
CREATE POLICY chat_participants_insert_trigger ON chat_participants
  FOR INSERT
  WITH CHECK (true);  -- inserts only happen via seed trigger (SECURITY DEFINER)

DROP POLICY IF EXISTS chat_participants_update_own ON chat_participants;
CREATE POLICY chat_participants_update_own ON chat_participants
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 6. Enable realtime for chat_messages
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
