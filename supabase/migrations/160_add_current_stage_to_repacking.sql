-- Migration 160: Add current_stage to wh_repacking_orders
ALTER TABLE wh_repacking_orders ADD COLUMN IF NOT EXISTS current_stage INT DEFAULT 1;
