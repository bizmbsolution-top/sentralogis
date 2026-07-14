-- Migration 108: Add custom_fields to wo_item_manifests
-- [AI] why this change: to store pre-assigned picking locations (location_code, inventory_id) from HQ

ALTER TABLE public.wo_item_manifests
ADD COLUMN IF NOT EXISTS custom_fields JSONB DEFAULT '{}'::jsonb;

SELECT '108_add_custom_fields_to_manifests OK' AS result;
