ALTER TABLE job_tracking ADD COLUMN client_ping_id UUID;
CREATE UNIQUE INDEX idx_job_tracking_unique_ping ON job_tracking(job_order_id, client_ping_id);
