-- Migration 070: Advanced Inbound Flow fields and Storage Bucket

-- 1. Add fields to wh_inbound_receipts
ALTER TABLE wh_inbound_receipts ADD COLUMN IF NOT EXISTS transporter_name_manual TEXT;
ALTER TABLE wh_inbound_receipts ADD COLUMN IF NOT EXISTS driver_name_manual TEXT;
ALTER TABLE wh_inbound_receipts ADD COLUMN IF NOT EXISTS driver_phone TEXT;
ALTER TABLE wh_inbound_receipts ADD COLUMN IF NOT EXISTS vehicle_photo_url TEXT;
ALTER TABLE wh_inbound_receipts ADD COLUMN IF NOT EXISTS pod_document_url TEXT;
ALTER TABLE wh_inbound_receipts ADD COLUMN IF NOT EXISTS batb_document_url TEXT;
ALTER TABLE wh_inbound_receipts ADD COLUMN IF NOT EXISTS unloading_start_time TIMESTAMPTZ;
ALTER TABLE wh_inbound_receipts ADD COLUMN IF NOT EXISTS unloading_end_time TIMESTAMPTZ;

-- 2. Add fields to wh_inbound_receipt_items
ALTER TABLE wh_inbound_receipt_items ADD COLUMN IF NOT EXISTS damage_photo_url TEXT;

-- 3. Create Storage Bucket for Inbound Docs
INSERT INTO storage.buckets (id, name, public) 
VALUES ('inbound-docs', 'inbound-docs', true)
ON CONFLICT (id) DO NOTHING;

-- Storage Policies for inbound-docs
CREATE POLICY "Allow public read access on inbound-docs" ON storage.objects
  FOR SELECT USING (bucket_id = 'inbound-docs');

CREATE POLICY "Allow authenticated insert on inbound-docs" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'inbound-docs' AND auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated update on inbound-docs" ON storage.objects
  FOR UPDATE WITH CHECK (bucket_id = 'inbound-docs' AND auth.role() = 'authenticated');
