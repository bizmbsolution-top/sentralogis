-- Migration 191: Add job_route_id to documents for multi-photo per location
-- Location photos are stored 1-to-many in `documents` (doc_type = 'LOCATION_PHOTO'),
-- replacing the single pod_photo_url column on job_routes.

ALTER TABLE documents ADD COLUMN IF NOT EXISTS job_route_id UUID REFERENCES job_routes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_documents_job_route_id ON documents(job_route_id);
