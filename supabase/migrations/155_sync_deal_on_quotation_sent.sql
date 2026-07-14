-- Migration 155: Auto-sync crm_deals stage and log activity when crm_quotations.status becomes SENT

CREATE OR REPLACE FUNCTION public.fn_sync_deal_on_quotation_sent()
RETURNS TRIGGER AS $$
DECLARE
  v_deal_stage TEXT;
  v_user_id UUID;
BEGIN
  -- Only run if status changed to SENT
  IF NEW.status = 'SENT' AND (OLD.status IS NULL OR OLD.status <> 'SENT') THEN
    v_user_id := auth.uid();
    
    -- If linked to a deal
    IF NEW.deal_id IS NOT NULL THEN
      SELECT stage INTO v_deal_stage FROM public.crm_deals WHERE id = NEW.deal_id;
      
      -- If deal is in PROSPECTING or NEW stage, advance to QUOTATION
      IF v_deal_stage IN ('NEW', 'PROSPECTING') THEN
        UPDATE public.crm_deals 
        SET stage = 'QUOTATION',
            updated_at = NOW()
        WHERE id = NEW.deal_id;
      END IF;

      -- Log activity in crm_activities
      INSERT INTO public.crm_activities (
        tenant_id,
        deal_id,
        type,
        title,
        description,
        activity_date,
        created_by
      ) VALUES (
        NEW.tenant_id,
        NEW.deal_id,
        'NOTE',
        'Quotation Dikirim: ' || NEW.quote_number,
        'Penawaran resmi nomor ' || NEW.quote_number || ' dengan total Rp ' || COALESCE(NEW.total_amount, 0) || ' telah dikirimkan kepada pelanggan.',
        NOW(),
        COALESCE(v_user_id, NEW.created_by)
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_deal_on_quotation_sent ON public.crm_quotations;
CREATE TRIGGER trg_sync_deal_on_quotation_sent
  AFTER UPDATE OF status ON public.crm_quotations
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_sync_deal_on_quotation_sent();
