-- Migration 047: Add work order and vendor provenance to extra_costs
-- Enables AP rollups by WO/vendor and preserves JO context on saved costs.

ALTER TABLE extra_costs ADD COLUMN IF NOT EXISTS wo_id UUID;
ALTER TABLE extra_costs ADD COLUMN IF NOT EXISTS vendor_id UUID;

CREATE INDEX IF NOT EXISTS idx_extra_costs_wo ON extra_costs(wo_id);
CREATE INDEX IF NOT EXISTS idx_extra_costs_vendor ON extra_costs(vendor_id);

UPDATE extra_costs ec
SET wo_id = wi.wo_id,
    vendor_id = COALESCE(jo.vendor_id, jo.transporter_id)
FROM job_orders jo
LEFT JOIN wo_items wi ON wi.id = jo.wo_item_id
WHERE ec.jo_id = jo.id
  AND (ec.wo_id IS NULL OR ec.vendor_id IS NULL);

ALTER TABLE extra_costs DROP CONSTRAINT IF EXISTS extra_costs_wo_id_fkey;
ALTER TABLE extra_costs
  ADD CONSTRAINT extra_costs_wo_id_fkey
  FOREIGN KEY (wo_id) REFERENCES work_orders(id) ON DELETE SET NULL;

ALTER TABLE extra_costs DROP CONSTRAINT IF EXISTS extra_costs_vendor_id_fkey;
ALTER TABLE extra_costs
  ADD CONSTRAINT extra_costs_vendor_id_fkey
  FOREIGN KEY (vendor_id) REFERENCES md_entities(id) ON DELETE SET NULL;

SELECT '047_add_extra_cost_grouping_columns OK' AS result;
