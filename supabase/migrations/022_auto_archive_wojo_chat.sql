-- ============================================================
-- MIGRATION 022: Auto-Archive WO/JO Chat Channels on Payment
-- ============================================================

-- 1. Add is_archived column to chat_channels
ALTER TABLE public.chat_channels ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false;
ALTER TABLE public.chat_channels ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;
ALTER TABLE public.chat_channels ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_chat_channels_archived ON public.chat_channels(is_archived) WHERE is_archived = true;

-- 2. Trigger: Auto-archive chat channel when WO status becomes 'paid' or 'closed'
CREATE OR REPLACE FUNCTION public.fn_archive_wo_chat_on_pay()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger when status changes TO paid/closed
  IF (TG_OP = 'UPDATE') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.status IN ('paid', 'closed', 'cancelled') THEN
      -- Archive the chat channel for this WO
      UPDATE public.chat_channels
      SET is_archived = true,
          archived_at = now(),
          archived_by = auth.uid()
      WHERE channel_type = 'work_order'
        AND channel_id = NEW.id
        AND is_archived = false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_archive_wo_chat_on_pay ON public.work_orders;
CREATE TRIGGER trg_archive_wo_chat_on_pay
  AFTER UPDATE ON public.work_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_archive_wo_chat_on_pay();

-- 3. Also archive JO chat when JO status becomes 'paid'/'completed'
CREATE OR REPLACE FUNCTION public.fn_archive_jo_chat_on_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF (TG_OP = 'UPDATE') AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    IF NEW.status IN ('paid', 'completed', 'cancelled') THEN
      UPDATE public.chat_channels
      SET is_archived = true,
          archived_at = now(),
          archived_by = auth.uid()
      WHERE channel_type = 'job_order'
        AND channel_id = NEW.id
        AND is_archived = false;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_archive_jo_chat_on_complete ON public.job_orders;
CREATE TRIGGER trg_archive_jo_chat_on_complete
  AFTER UPDATE ON public.job_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_archive_jo_chat_on_complete();

COMMENT ON COLUMN public.chat_channels.is_archived IS 'True when linked WO/JO is paid/closed. Channel hidden from default sidebar view.';
