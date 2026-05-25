-- Migration 039: Menambahkan dimensi dan storage_method ke md_warehouse_locations

ALTER TABLE md_warehouse_locations
  ADD COLUMN IF NOT EXISTS length_m NUMERIC(12, 2) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS width_m NUMERIC(12, 2) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS height_m NUMERIC(12, 2) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS storage_method TEXT DEFAULT 'RACKING' CHECK (storage_method IN ('OPEN_YARD', 'FLOOR', 'RACKING', 'COLD_STORAGE'));

-- Update max_volume_m3 automatically if it was null, based on l*w*h
UPDATE md_warehouse_locations
SET max_volume_m3 = COALESCE(max_volume_m3, length_m * width_m * height_m)
WHERE max_volume_m3 IS NULL;
