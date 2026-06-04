-- Migration 081: Add putaway_entries to wh_inbound_receipt_items
-- This allows tracking multiple putaway location splits for a single item

ALTER TABLE wh_inbound_receipt_items 
ADD COLUMN IF NOT EXISTS putaway_entries JSONB;
