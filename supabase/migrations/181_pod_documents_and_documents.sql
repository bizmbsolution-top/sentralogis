-- Migration 181: Add pod_documents storage bucket, pod_photo_url to job_routes, and documents table
-- This fixes driver WA link photo upload failures

-- 1. Create pod_documents storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pod_documents',
  'pod_documents',
  true,
  10485760, -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for pod_documents
CREATE POLICY "Public Access for pod_documents"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pod_documents');

CREATE POLICY "Insert for pod_documents"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pod_documents');

CREATE POLICY "Update for pod_documents"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'pod_documents');

CREATE POLICY "Delete for pod_documents"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'pod_documents');

-- 2. Add pod_photo_url column to job_routes
ALTER TABLE job_routes ADD COLUMN IF NOT EXISTS pod_photo_url TEXT;

-- 3. Create documents table for audit trail
CREATE TABLE IF NOT EXISTS documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_order_id UUID REFERENCES job_orders(id) ON DELETE CASCADE,
  doc_type TEXT NOT NULL DEFAULT 'MILESTONE_PHOTO',
  file_url TEXT,
  document_name TEXT,
  uploaded_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for documents
CREATE INDEX IF NOT EXISTS idx_documents_job_order_id ON documents(job_order_id);
CREATE INDEX IF NOT EXISTS idx_documents_doc_type ON documents(doc_type);

-- RLS for documents (allow all for admin client)
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for documents"
  ON documents FOR ALL
  USING (true)
  WITH CHECK (true);
