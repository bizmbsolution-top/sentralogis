-- Migration 116: Pivot CRM to use md_entities as Single Source of Truth
-- Integrates Leads directly into Master Contact to prevent duplication and lock Sales assignments.

-- 1. Alter md_entities to support CRM fields
ALTER TABLE public.md_entities 
  ADD COLUMN IF NOT EXISTS crm_status public.crm_lead_status DEFAULT 'NEW',
  ADD COLUMN IF NOT EXISTS sales_rep_id UUID REFERENCES public.profiles(id);

-- Add index for duplicate checking
CREATE INDEX IF NOT EXISTS idx_md_entities_name_tenant ON public.md_entities(tenant_id, name);
CREATE INDEX IF NOT EXISTS idx_md_entities_sales_rep ON public.md_entities(sales_rep_id);

-- 2. Wipe existing deals/activities to prevent FK errors since they are just test data anyway
TRUNCATE TABLE public.crm_activities CASCADE;
TRUNCATE TABLE public.crm_quotations CASCADE;
TRUNCATE TABLE public.crm_deals CASCADE;

-- 3. Alter crm_deals
ALTER TABLE public.crm_deals 
  DROP COLUMN IF EXISTS lead_id CASCADE,
  DROP COLUMN IF EXISTS converted_entity_id CASCADE,
  ADD COLUMN IF NOT EXISTS entity_id UUID NOT NULL REFERENCES public.md_entities(id) ON DELETE CASCADE;

-- 4. Alter crm_activities
ALTER TABLE public.crm_activities 
  DROP COLUMN IF EXISTS lead_id CASCADE,
  ADD COLUMN IF NOT EXISTS entity_id UUID REFERENCES public.md_entities(id) ON DELETE CASCADE;

-- 5. Drop old crm_leads table and its triggers
DROP TRIGGER IF EXISTS trg_crm_leads_set_updated_by ON public.crm_leads;
DROP POLICY IF EXISTS "tenant_isolation_crm_leads" ON public.crm_leads;
DROP TABLE IF EXISTS public.crm_leads CASCADE;

-- 6. Update the 'WON' Trigger
-- Instead of copying data to md_entities, we just update the existing md_entities record
CREATE OR REPLACE FUNCTION trg_fn_update_entity_on_deal_won()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stage = 'WON' AND OLD.stage != 'WON' THEN
    UPDATE public.md_entities 
    SET 
      entity_type = 'CUSTOMER',
      is_active = true
    WHERE id = NEW.entity_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_convert_deal_won ON public.crm_deals;

CREATE TRIGGER trg_auto_convert_deal_won
  BEFORE UPDATE ON public.crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_update_entity_on_deal_won();

SELECT '116_pivot_crm_to_md_entities applied successfully' as result;
