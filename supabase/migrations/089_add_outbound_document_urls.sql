-- Add document URLs to wh_outbound_shipments
ALTER TABLE wh_outbound_shipments ADD COLUMN IF NOT EXISTS surat_jalan_url text;
ALTER TABLE wh_outbound_shipments ADD COLUMN IF NOT EXISTS bast_url text;

-- Create Storage Bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('warehouse_documents', 'warehouse_documents', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if any to avoid errors
DROP POLICY IF EXISTS "Public Access warehouse_documents" ON storage.objects;
DROP POLICY IF EXISTS "Upload warehouse_documents" ON storage.objects;
DROP POLICY IF EXISTS "Update warehouse_documents" ON storage.objects;

-- Create Storage Policies
CREATE POLICY "Public Access warehouse_documents" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'warehouse_documents' );

CREATE POLICY "Upload warehouse_documents" 
ON storage.objects FOR INSERT 
WITH CHECK ( bucket_id = 'warehouse_documents' AND auth.role() = 'authenticated' );

CREATE POLICY "Update warehouse_documents" 
ON storage.objects FOR UPDATE 
WITH CHECK ( bucket_id = 'warehouse_documents' AND auth.role() = 'authenticated' );
