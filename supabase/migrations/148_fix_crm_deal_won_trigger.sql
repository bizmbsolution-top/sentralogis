-- Migration 148: Fix crm_deals trigger on WON stage
-- Fixes the error where public.md_entities does not have entity_type column

CREATE OR REPLACE FUNCTION public.trg_fn_update_entity_on_deal_won()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.stage = 'WON' AND OLD.stage != 'WON' THEN
    UPDATE public.md_entities 
    SET 
      is_customer = true,
      is_active = true
    WHERE id = NEW.entity_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '{"result": "148_fix_crm_deal_won_trigger applied successfully"}'::jsonb as result;
