-- Create Storage Bucket for Driver Portal Photos
-- Eksekusi ini di Supabase SQL Editor

-- Check if buckets table exists and insert
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('driver-portal', 'driver-portal', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- Enable public access policies
DROP POLICY IF EXISTS "Public Access for driver-portal" ON storage.objects;
DROP POLICY IF EXISTS "Insert for driver-portal" ON storage.objects;

CREATE POLICY "Public Access for driver-portal" ON storage.objects
FOR SELECT USING (bucket_id = 'driver-portal');

CREATE POLICY "Insert for driver-portal" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'driver-portal');