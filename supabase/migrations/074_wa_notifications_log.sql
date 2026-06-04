-- Migration 074: WA Notification Log for Warehouse Inbound Flow
-- Tracks all WhatsApp notifications sent during inbound process

CREATE TABLE IF NOT EXISTS wh_wa_notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  receipt_id      UUID NOT NULL REFERENCES wh_inbound_receipts(id) ON DELETE CASCADE,
  receipt_number  TEXT,
  recipient       TEXT NOT NULL,
  recipient_name  TEXT,
  message_type    TEXT NOT NULL CHECK (message_type IN (
    'TRUCK_ARRIVED', 'UNLOADING_START', 'UNLOADING_STOP',
    'CHECKING_DONE', 'PUTAWAY_START', 'COMPLETED', 'DAMAGE_ALERT', 'OTHER'
  )),
  message_body    TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'FAILED', 'PENDING')),
  error_message   TEXT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wh_wa_notifications_receipt
  ON wh_wa_notifications(receipt_id);

CREATE INDEX IF NOT EXISTS idx_wh_wa_notifications_sent_at
  ON wh_wa_notifications(sent_at DESC);

ALTER TABLE wh_wa_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable public ALL on wh_wa_notifications"
  ON wh_wa_notifications FOR ALL USING (true);

SELECT '074_wa_notifications_log executed successfully' as result;
