-- Migration 060: Add sbu_metadata to wo_items
ALTER TABLE wo_items ADD COLUMN IF NOT EXISTS sbu_metadata JSONB;
