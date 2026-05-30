-- Migration 048: Add revenue columns to wo_items
-- Work Order Item = Revenue basis, Job Order = Costing/COGS basis
-- unit_price: harga per unit (deal price) dari customer
-- total_revenue: total pendapatan untuk item ini (unit_price * unit_count)

ALTER TABLE wo_items ADD COLUMN IF NOT EXISTS unit_price NUMERIC DEFAULT 0;
ALTER TABLE wo_items ADD COLUMN IF NOT EXISTS total_revenue NUMERIC DEFAULT 0;

-- Backfill existing data from item_data JSONB
UPDATE wo_items
SET
  unit_price = COALESCE(
    (item_data->>'deal_price')::NUMERIC,
    0
  ),
  total_revenue = COALESCE(
    (item_data->>'est_revenue')::NUMERIC,
    0
  )
WHERE
  (unit_price IS NULL OR unit_price = 0)
  AND item_data IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_wo_items_revenue ON wo_items(wo_id, unit_price, total_revenue);

SELECT '048_add_wo_item_revenue_columns OK' AS result;
