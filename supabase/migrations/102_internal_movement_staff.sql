-- Migration 102: Assign staff to internal movements
ALTER TABLE wh_internal_movements
  ADD COLUMN IF NOT EXISTS assigned_to UUID REFERENCES md_warehouse_staff(id) ON DELETE SET NULL;
