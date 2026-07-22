-- Migration 172: Add tracking_token and cargo owner fields to fw_container_items

ALTER TABLE public.fw_container_items
  ADD COLUMN IF NOT EXISTS tracking_token TEXT UNIQUE;

ALTER TABLE public.fw_container_items
  ADD COLUMN IF NOT EXISTS cargo_owner_name TEXT;

ALTER TABLE public.fw_container_items
  ADD COLUMN IF NOT EXISTS consignee_name TEXT;

ALTER TABLE public.fw_container_items
  ADD COLUMN IF NOT EXISTS consignee_address TEXT;

ALTER TABLE public.fw_container_items
  ADD COLUMN IF NOT EXISTS consignee_phone TEXT;

CREATE INDEX IF NOT EXISTS idx_fw_container_items_tracking_token ON public.fw_container_items(tracking_token);

-- Backfill existing rows with random tokens
UPDATE public.fw_container_items
SET tracking_token = 'FWD-' || substr(md5(random()::text || id::text), 1, 12)
WHERE tracking_token IS NULL;
