-- Migration 055: Add missing dimensions and storage_method to md_warehouse_locations

ALTER TABLE md_warehouse_locations ADD COLUMN IF NOT EXISTS length_m NUMERIC(10,2) DEFAULT 0;
ALTER TABLE md_warehouse_locations ADD COLUMN IF NOT EXISTS width_m NUMERIC(10,2) DEFAULT 0;
ALTER TABLE md_warehouse_locations ADD COLUMN IF NOT EXISTS height_m NUMERIC(10,2) DEFAULT 0;
ALTER TABLE md_warehouse_locations ADD COLUMN IF NOT EXISTS storage_method TEXT;
