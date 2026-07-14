-- 162_master_box_location.sql
-- Add putaway location tracking to Master Boxes and ensure parcel status PUTAWAY is supported

ALTER TABLE wh_master_boxes ADD COLUMN IF NOT EXISTS location_id UUID REFERENCES md_warehouse_locations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_wh_master_boxes_location ON wh_master_boxes(location_id);
