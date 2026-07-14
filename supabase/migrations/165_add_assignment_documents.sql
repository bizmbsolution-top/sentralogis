-- Migration 165: Add assignment_documents JSONB column to job_orders and work_orders
-- Allows multi-document pre-delivery assignment (Surat Jalan, Cargo Manifest for Multidrop, POD Blanko, Instruksi Kerja) for the driver.
-- Eksekusi di Supabase SQL Editor / Vercel deployment prerequisite.

ALTER TABLE job_orders ADD COLUMN IF NOT EXISTS assignment_documents JSONB DEFAULT '[]'::jsonb;
ALTER TABLE work_orders ADD COLUMN IF NOT EXISTS assignment_documents JSONB DEFAULT '[]'::jsonb;

-- Comment on column for schema clarity
COMMENT ON COLUMN job_orders.assignment_documents IS 'List of documents assigned to the driver before journey: [{id, name, type, file_url, file_type, file_size, uploaded_at}]';
COMMENT ON COLUMN work_orders.assignment_documents IS 'List of work order level instruction/manifest documents passed down to job orders: [{id, name, type, file_url, file_type, file_size, uploaded_at}]';
