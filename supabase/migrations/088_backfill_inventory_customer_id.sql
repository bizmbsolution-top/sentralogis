-- Migration 088: Backfill customer_id on wh_inventory from md_product_skus
-- [AI] Ensures existing inventory records have customer_id populated for outbound filtering

-- Backfill customer_id from md_product_skus for all existing inventory records
UPDATE wh_inventory inv
SET customer_id = sku.customer_id
FROM md_product_skus sku
WHERE inv.product_sku_id = sku.id
  AND inv.customer_id IS NULL
  AND sku.customer_id IS NOT NULL;

-- Add index for faster customer-based inventory queries
CREATE INDEX IF NOT EXISTS idx_wh_inventory_customer_id 
ON wh_inventory(customer_id) 
WHERE customer_id IS NOT NULL;
