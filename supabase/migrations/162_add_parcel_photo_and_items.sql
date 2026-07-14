-- 162_add_parcel_photo_and_items.sql
-- Add photo_url and items columns to wh_parcel_inbound

ALTER TABLE wh_parcel_inbound 
ADD COLUMN IF NOT EXISTS photo_url TEXT,
ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
