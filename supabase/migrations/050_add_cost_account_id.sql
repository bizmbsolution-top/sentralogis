-- Migration 050: Add cost_account_id to job_orders and extra_costs
-- Allows SBU to select specific COA for purchase_price (vendor) and advance_amount (internal) per JO
-- Also allows per-row COA selection on extra_costs

ALTER TABLE job_orders
  ADD COLUMN IF NOT EXISTS cost_account_id UUID REFERENCES finance_coa(id);

ALTER TABLE extra_costs
  ADD COLUMN IF NOT EXISTS cost_account_id UUID REFERENCES finance_coa(id);

CREATE INDEX IF NOT EXISTS idx_job_orders_cost_account ON job_orders(cost_account_id);
CREATE INDEX IF NOT EXISTS idx_extra_costs_cost_account ON extra_costs(cost_account_id);

-- [AI] Backfill cost_account_id untuk JO existing:
-- Vendor JO → default ke HPP Jasa Vendor (5-50020)
-- Internal JO → default ke Beban Bagi Hasil Driver (5-50010)
UPDATE job_orders SET cost_account_id = (
  SELECT id FROM finance_coa WHERE account_number = '5-50020' LIMIT 1
) WHERE purchase_price > 0 AND cost_account_id IS NULL;

UPDATE job_orders SET cost_account_id = (
  SELECT id FROM finance_coa WHERE account_number = '5-50010' LIMIT 1
) WHERE (purchase_price IS NULL OR purchase_price = 0) AND cost_account_id IS NULL;

-- Backfill extra_costs → Beban Operasional (5-50030)
UPDATE extra_costs SET cost_account_id = (
  SELECT id FROM finance_coa WHERE account_number = '5-50030' LIMIT 1
) WHERE cost_account_id IS NULL;

SELECT '050_add_cost_account_id OK' AS result;
