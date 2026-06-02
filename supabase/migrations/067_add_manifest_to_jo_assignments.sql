-- Migration 067: Add manifest relation and quantity to jo_warehouse_assignments
--
-- Running this allows saving which product SKU and quantity are allocated to each location.

ALTER TABLE jo_warehouse_assignments
ADD COLUMN IF NOT EXISTS wo_item_manifest_id UUID REFERENCES wo_item_manifests(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS quantity NUMERIC(15, 2) DEFAULT 0;

SELECT '067_add_manifest_to_jo_assignments OK' AS result;
