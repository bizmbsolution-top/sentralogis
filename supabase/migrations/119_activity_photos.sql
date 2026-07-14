-- Migration 119: Add photo tracking for activities and create Storage bucket

-- Add the column to track photo URLs
ALTER TABLE public.crm_activities
  ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Insert the storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('crm_attachments', 'crm_attachments', true)
ON CONFLICT (id) DO NOTHING;

-- Set up RLS for the bucket
DROP POLICY IF EXISTS "crm_attachments_public_read" ON storage.objects;
CREATE POLICY "crm_attachments_public_read" ON storage.objects 
  FOR SELECT 
  USING (bucket_id = 'crm_attachments');

DROP POLICY IF EXISTS "crm_attachments_auth_insert" ON storage.objects;
CREATE POLICY "crm_attachments_auth_insert" ON storage.objects 
  FOR INSERT 
  WITH CHECK (bucket_id = 'crm_attachments' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "crm_attachments_auth_update" ON storage.objects;
CREATE POLICY "crm_attachments_auth_update" ON storage.objects 
  FOR UPDATE 
  USING (bucket_id = 'crm_attachments' AND auth.role() = 'authenticated');
