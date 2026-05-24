-- Migration 020: Chat Storage Bucket for Attachments
-- Create storage bucket for chat file attachments

-- Create storage bucket if not exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-files',
  'chat-files',
  true,
  10485760, -- 10MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip',
    'text/plain'
  ]::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated users to upload chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'chat-files'
  AND (storage.foldername(name))[1] = 'chat-attachments'
);

-- Allow public read access (bucket is public)
CREATE POLICY "Allow public to read chat files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-files');

-- Allow users to delete their own files
CREATE POLICY "Allow users to delete their own chat files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'chat-files'
  AND auth.uid()::text = (storage.foldername(name))[2]
);
