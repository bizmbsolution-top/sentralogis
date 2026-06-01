-- Migration: 058_jo_specific_manifests.sql
-- Description: Add job_order_id to wo_item_manifests to support delegated data entry by SBU

ALTER TABLE wo_item_manifests 
ADD COLUMN job_order_id UUID REFERENCES job_orders(id) ON DELETE CASCADE;

-- Update RLS to ensure job_order_id can be queried properly
-- (If there are specific policies, we might need to recreate them, but usually they are based on tenant_id)
