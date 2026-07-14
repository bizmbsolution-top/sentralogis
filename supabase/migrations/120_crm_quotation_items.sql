-- Migration 120: Quotation Items (Dynamic Pricing Engine)

-- 1. Create Line Items Table
CREATE TABLE IF NOT EXISTS public.crm_quotation_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    quotation_id UUID NOT NULL REFERENCES public.crm_quotations(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.md_services(id) ON DELETE SET NULL, -- Optional, can be a custom item
    description TEXT NOT NULL, -- "Trucking 20ft Rute Jakarta - Bandung"
    qty NUMERIC(15, 2) NOT NULL DEFAULT 1,
    uom VARCHAR(50) DEFAULT 'Unit',
    unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
    subtotal NUMERIC(15, 2) NOT NULL DEFAULT 0, -- qty * unit_price
    tax_percent NUMERIC(5, 2) DEFAULT 0, -- e.g., 11 for 11% PPN
    tax_amount NUMERIC(15, 2) DEFAULT 0, -- (subtotal * tax_percent) / 100
    total_price NUMERIC(15, 2) NOT NULL DEFAULT 0, -- subtotal + tax_amount
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id)
);

-- 2. Add Tax and Subtotal to parent crm_quotations
ALTER TABLE public.crm_quotations
  ADD COLUMN IF NOT EXISTS subtotal_amount NUMERIC(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS notes TEXT; -- For Terms and Conditions

-- 3. Auto-Calculate Line Item Totals
CREATE OR REPLACE FUNCTION trg_fn_calc_quotation_item_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.subtotal := NEW.qty * NEW.unit_price;
  NEW.tax_amount := (NEW.subtotal * COALESCE(NEW.tax_percent, 0)) / 100;
  NEW.total_price := NEW.subtotal + NEW.tax_amount;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_calc_quotation_item_total ON public.crm_quotation_items;
CREATE TRIGGER trg_calc_quotation_item_total
  BEFORE INSERT OR UPDATE ON public.crm_quotation_items
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_calc_quotation_item_total();

-- 4. Rollup Total to crm_quotations
CREATE OR REPLACE FUNCTION trg_fn_rollup_quotation_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_quote_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_quote_id := OLD.quotation_id;
  ELSE
    v_quote_id := NEW.quotation_id;
  END IF;

  UPDATE public.crm_quotations
  SET 
    subtotal_amount = (SELECT COALESCE(SUM(subtotal), 0) FROM public.crm_quotation_items WHERE quotation_id = v_quote_id),
    tax_amount = (SELECT COALESCE(SUM(tax_amount), 0) FROM public.crm_quotation_items WHERE quotation_id = v_quote_id),
    total_amount = (SELECT COALESCE(SUM(total_price), 0) FROM public.crm_quotation_items WHERE quotation_id = v_quote_id)
  WHERE id = v_quote_id;

  RETURN NULL; -- AFTER trigger returns NULL
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_rollup_quotation_totals ON public.crm_quotation_items;
CREATE TRIGGER trg_rollup_quotation_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.crm_quotation_items
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_rollup_quotation_totals();

-- 5. RLS
ALTER TABLE public.crm_quotation_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_crm_quotation_items" 
  ON public.crm_quotation_items FOR ALL 
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- 6. Updated By Trigger
DROP TRIGGER IF EXISTS trg_crm_quotation_items_set_updated_by ON public.crm_quotation_items;
CREATE TRIGGER trg_crm_quotation_items_set_updated_by 
  BEFORE UPDATE ON public.crm_quotation_items 
  FOR EACH ROW EXECUTE FUNCTION set_updated_by_and_time();

SELECT '120_crm_quotation_items applied successfully' as result;
