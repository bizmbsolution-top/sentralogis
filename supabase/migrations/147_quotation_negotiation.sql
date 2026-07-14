-- Migration 147: Add nego_price to crm_quotation_items

-- 1. Add nego_price column
ALTER TABLE public.crm_quotation_items ADD COLUMN IF NOT EXISTS nego_price NUMERIC(15, 2);

-- 2. Update item calculation trigger to use nego_price if available
CREATE OR REPLACE FUNCTION public.trg_fn_calc_quotation_item_total()
RETURNS TRIGGER AS $$
BEGIN
  -- If nego_price is set, it overrides unit_price for the subtotal calculation
  NEW.subtotal := NEW.qty * COALESCE(NEW.nego_price, NEW.unit_price);
  NEW.tax_amount := (NEW.subtotal * COALESCE(NEW.tax_percent, 0)) / 100;
  NEW.total_price := NEW.subtotal + NEW.tax_amount;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- To force recalculation of existing items if needed (not strictly required if nego_price is null)
-- UPDATE public.crm_quotation_items SET updated_at = NOW();

SELECT '147_quotation_negotiation applied successfully' as result;
