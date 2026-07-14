-- Migration 122: Multi-SBU Quotation and Customer Rate Card
-- Setup database tables and columns for multi-SBU quotation design

-- 1. Create crm_sbu_customer_rates Table
CREATE TABLE IF NOT EXISTS public.crm_sbu_customer_rates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  customer_id UUID NOT NULL REFERENCES public.md_entities(id) ON DELETE CASCADE,
  sbu_type VARCHAR(50) NOT NULL,          -- TRUCKING, WAREHOUSE, CLEARANCE, FORWARDING
  service_name VARCHAR(255) NOT NULL,    -- e.g. "Sewa Gudang", "Pengiriman JKT-SBY"
  description TEXT,
  uom VARCHAR(50) NOT NULL DEFAULT 'Unit',-- CBM, KG, PALLET, CONTAINER, TRIP, DOCUMENT, UNIT
  unit_price NUMERIC(15, 2) NOT NULL DEFAULT 0,
  pricing_type VARCHAR(50) NOT NULL DEFAULT 'ONE_TIME', -- ONE_TIME, RECURRING_MONTHLY, PER_ACTIVITY
  min_qty NUMERIC(15, 2) DEFAULT 0,
  route_origin VARCHAR(255),             -- Khusus TRUCKING: kota asal
  route_destination VARCHAR(255),        -- Khusus TRUCKING: kota tujuan
  is_active BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id)
);
-- SPLIT
CREATE INDEX IF NOT EXISTS idx_sbu_rates_customer ON public.crm_sbu_customer_rates(customer_id, sbu_type);
-- SPLIT
CREATE INDEX IF NOT EXISTS idx_sbu_rates_tenant ON public.crm_sbu_customer_rates(tenant_id);
-- SPLIT
ALTER TABLE public.crm_sbu_customer_rates ENABLE ROW LEVEL SECURITY;
-- SPLIT
DROP POLICY IF EXISTS tenant_isolation_crm_sbu_customer_rates ON public.crm_sbu_customer_rates;
-- SPLIT
CREATE POLICY tenant_isolation_crm_sbu_customer_rates 
  ON public.crm_sbu_customer_rates FOR ALL 
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
-- SPLIT
DROP TRIGGER IF EXISTS trg_crm_sbu_customer_rates_set_updated_by ON public.crm_sbu_customer_rates;
-- SPLIT
CREATE TRIGGER trg_crm_sbu_customer_rates_set_updated_by 
  BEFORE UPDATE ON public.crm_sbu_customer_rates 
  FOR EACH ROW EXECUTE FUNCTION set_updated_by_and_time();

-- SPLIT
-- 2. Create crm_quotation_sections Table
CREATE TABLE IF NOT EXISTS public.crm_quotation_sections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  quotation_id UUID NOT NULL REFERENCES public.crm_quotations(id) ON DELETE CASCADE,
  sbu_type VARCHAR(50) NOT NULL,          -- TRUCKING, WAREHOUSE, CLEARANCE, FORWARDING
  section_order INT DEFAULT 0,            -- Order of tabs/sections
  subtotal NUMERIC(15, 2) DEFAULT 0,
  sbu_notes TEXT,                         -- SBU-specific terms and conditions
  
  -- Approval per SBU
  approval_status VARCHAR(50) DEFAULT 'PENDING',  -- PENDING, APPROVED, REJECTED
  approved_by UUID REFERENCES public.profiles(id),
  approved_at TIMESTAMPTZ,
  rejection_reason TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  
  UNIQUE(quotation_id, sbu_type)
);
-- SPLIT
CREATE INDEX IF NOT EXISTS idx_quotation_sections ON public.crm_quotation_sections(quotation_id);
-- SPLIT
ALTER TABLE public.crm_quotation_sections ENABLE ROW LEVEL SECURITY;
-- SPLIT
DROP POLICY IF EXISTS tenant_isolation_crm_quotation_sections ON public.crm_quotation_sections;
-- SPLIT
CREATE POLICY tenant_isolation_crm_quotation_sections 
  ON public.crm_quotation_sections FOR ALL 
  USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
-- SPLIT
DROP TRIGGER IF EXISTS trg_crm_quotation_sections_set_updated_by ON public.crm_quotation_sections;
-- SPLIT
CREATE TRIGGER trg_crm_quotation_sections_set_updated_by 
  BEFORE UPDATE ON public.crm_quotation_sections 
  FOR EACH ROW EXECUTE FUNCTION set_updated_by_and_time();

-- SPLIT
-- 3. Modify crm_quotation_items Table
ALTER TABLE public.crm_quotation_items 
  ADD COLUMN IF NOT EXISTS section_id UUID REFERENCES public.crm_quotation_sections(id) ON DELETE CASCADE;
-- SPLIT
ALTER TABLE public.crm_quotation_items 
  ADD COLUMN IF NOT EXISTS pricing_type VARCHAR(50) DEFAULT 'ONE_TIME';
-- SPLIT
ALTER TABLE public.crm_quotation_items 
  ADD COLUMN IF NOT EXISTS min_qty NUMERIC(15, 2) DEFAULT 0;
-- SPLIT
ALTER TABLE public.crm_quotation_items 
  ADD COLUMN IF NOT EXISTS rate_id UUID REFERENCES public.crm_sbu_customer_rates(id) ON DELETE SET NULL;

-- SPLIT
-- 4. Modify crm_quotations Table
ALTER TABLE public.crm_quotations
  ADD COLUMN IF NOT EXISTS validity_days INT DEFAULT 30;
-- SPLIT
ALTER TABLE public.crm_quotations
  ADD COLUMN IF NOT EXISTS onetime_total NUMERIC(15, 2) DEFAULT 0;
-- SPLIT
ALTER TABLE public.crm_quotations
  ADD COLUMN IF NOT EXISTS recurring_total NUMERIC(15, 2) DEFAULT 0;

-- SPLIT
-- 5. Trigger/Function to Roll up Totals to Sections & Quotations
CREATE OR REPLACE FUNCTION public.trg_fn_rollup_quotation_sections_and_totals()
RETURNS TRIGGER AS $$
DECLARE
  v_quote_id UUID;
  v_section_id UUID;
  v_sbu_type VARCHAR(50);
  v_tenant_id UUID;
BEGIN
  -- Determine quotation_id and tenant_id
  IF TG_OP = 'DELETE' THEN
    v_quote_id := OLD.quotation_id;
    v_section_id := OLD.section_id;
    v_tenant_id := OLD.tenant_id;
  ELSE
    v_quote_id := NEW.quotation_id;
    v_section_id := NEW.section_id;
    v_tenant_id := NEW.tenant_id;
  END IF;

  -- If section_id is NOT set but sbu_cluster is set, auto-link/create the section
  IF v_section_id IS NULL AND NOT (TG_OP = 'DELETE') THEN
    v_sbu_type := COALESCE(NEW.sbu_cluster, 'GENERAL');
    
    -- Try to find existing section
    SELECT id INTO v_section_id 
    FROM public.crm_quotation_sections 
    WHERE quotation_id = v_quote_id AND sbu_type = v_sbu_type;
    
    -- Create if not exists
    IF v_section_id IS NULL THEN
      INSERT INTO public.crm_quotation_sections (tenant_id, quotation_id, sbu_type, section_order)
      VALUES (v_tenant_id, v_quote_id, v_sbu_type, 0)
      RETURNING id INTO v_section_id;
    END IF;
    
    -- Assign to the row being inserted/updated
    NEW.section_id := v_section_id;
    v_section_id := NEW.section_id;
  END IF;

  -- 1. Recalculate and update the subtotal for the affected section
  IF v_section_id IS NOT NULL THEN
    UPDATE public.crm_quotation_sections
    SET subtotal = (
      SELECT COALESCE(SUM(total_price), 0) 
      FROM public.crm_quotation_items 
      WHERE section_id = v_section_id
    )
    WHERE id = v_section_id;
  END IF;

  -- 2. Recalculate and update the totals for the entire quotation
  -- Group items by pricing_type (ONE_TIME vs RECURRING_MONTHLY/others)
  UPDATE public.crm_quotations
  SET 
    subtotal_amount = (
      SELECT COALESCE(SUM(subtotal), 0) 
      FROM public.crm_quotation_items 
      WHERE quotation_id = v_quote_id
    ),
    tax_amount = (
      SELECT COALESCE(SUM(tax_amount), 0) 
      FROM public.crm_quotation_items 
      WHERE quotation_id = v_quote_id
    ),
    total_amount = (
      SELECT COALESCE(SUM(total_price), 0) 
      FROM public.crm_quotation_items 
      WHERE quotation_id = v_quote_id
    ),
    onetime_total = (
      SELECT COALESCE(SUM(total_price), 0) 
      FROM public.crm_quotation_items 
      WHERE quotation_id = v_quote_id AND (pricing_type = 'ONE_TIME' OR pricing_type IS NULL)
    ),
    recurring_total = (
      SELECT COALESCE(SUM(total_price), 0) 
      FROM public.crm_quotation_items 
      WHERE quotation_id = v_quote_id AND (pricing_type = 'RECURRING_MONTHLY')
    )
  WHERE id = v_quote_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- SPLIT
-- Remove old rollup trigger
DROP TRIGGER IF EXISTS trg_rollup_quotation_totals ON public.crm_quotation_items;

-- SPLIT
-- Create new rollup trigger (runs BEFORE insert/update to set section_id if needed, and also runs AFTER to rollup totals)
CREATE OR REPLACE FUNCTION public.trg_fn_before_quotation_items_section()
RETURNS TRIGGER AS $$
DECLARE
  v_sbu_type VARCHAR(50);
  v_section_id UUID;
BEGIN
  IF NEW.section_id IS NULL THEN
    v_sbu_type := COALESCE(NEW.sbu_cluster, 'GENERAL');
    
    -- Find or create the section
    SELECT id INTO v_section_id 
    FROM public.crm_quotation_sections 
    WHERE quotation_id = NEW.quotation_id AND sbu_type = v_sbu_type;
    
    IF v_section_id IS NULL THEN
      INSERT INTO public.crm_quotation_sections (tenant_id, quotation_id, sbu_type, section_order)
      VALUES (NEW.tenant_id, NEW.quotation_id, v_sbu_type, 0)
      RETURNING id INTO v_section_id;
    END IF;
    
    NEW.section_id := v_section_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- SPLIT
DROP TRIGGER IF EXISTS trg_before_quotation_items_section ON public.crm_quotation_items;
-- SPLIT
CREATE TRIGGER trg_before_quotation_items_section
  BEFORE INSERT OR UPDATE OF section_id, sbu_cluster ON public.crm_quotation_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_before_quotation_items_section();

-- SPLIT
DROP TRIGGER IF EXISTS trg_rollup_quotation_sections_and_totals ON public.crm_quotation_items;
-- SPLIT
CREATE TRIGGER trg_rollup_quotation_sections_and_totals
  AFTER INSERT OR UPDATE OR DELETE ON public.crm_quotation_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_rollup_quotation_sections_and_totals();


-- SPLIT
-- 6. Trigger to auto-update quotation status when section approvals change
CREATE OR REPLACE FUNCTION public.trg_fn_check_all_sections_approved()
RETURNS TRIGGER AS $$
DECLARE
  v_total_sections INT;
  v_approved_sections INT;
  v_quote_status VARCHAR(50);
BEGIN
  -- Count sections for the quotation
  SELECT COUNT(*), COUNT(*) FILTER (WHERE approval_status = 'APPROVED')
  INTO v_total_sections, v_approved_sections
  FROM public.crm_quotation_sections
  WHERE quotation_id = NEW.quotation_id;

  -- Get current quotation status
  SELECT status INTO v_quote_status FROM public.crm_quotations WHERE id = NEW.quotation_id;

  -- If all are approved and quotation status is DRAFT or WAITING_APPROVAL, auto-advance to READY_TO_SEND
  -- If any section is rejected, we can transition quotation back to DRAFT or REJECTED (we will let the sales rep revise)
  IF v_total_sections > 0 AND v_total_sections = v_approved_sections THEN
    IF v_quote_status IN ('DRAFT', 'WAITING_APPROVAL') THEN
      UPDATE public.crm_quotations 
      SET status = 'READY_TO_SEND' 
      WHERE id = NEW.quotation_id;
    END IF;
  ELSIF NEW.approval_status = 'REJECTED' THEN
    UPDATE public.crm_quotations 
    SET status = 'REJECTED' 
    WHERE id = NEW.quotation_id;
  ELSIF v_approved_sections < v_total_sections THEN
    -- If some sections are pending or reset, keep or revert quotation to DRAFT or WAITING_APPROVAL
    IF v_quote_status = 'READY_TO_SEND' THEN
      UPDATE public.crm_quotations 
      SET status = 'WAITING_APPROVAL' 
      WHERE id = NEW.quotation_id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- SPLIT
DROP TRIGGER IF EXISTS trg_check_all_sections_approved ON public.crm_quotation_sections;
-- SPLIT
CREATE TRIGGER trg_check_all_sections_approved
  AFTER INSERT OR UPDATE OF approval_status ON public.crm_quotation_sections
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_fn_check_all_sections_approved();

-- SPLIT
NOTIFY pgrst, 'reload schema';
