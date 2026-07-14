-- Migration 115: CRM Foundational Tables
-- Creates tables for Leads, Deals, Activities, and Quotations.

CREATE TYPE crm_lead_status AS ENUM ('NEW', 'CONTACTED', 'QUALIFIED', 'UNQUALIFIED');
CREATE TYPE crm_deal_stage AS ENUM ('PROSPECTING', 'NEGOTIATION', 'QUOTATION', 'WON', 'LOST');
CREATE TYPE crm_fee_type AS ENUM ('NOMINAL', 'PERCENTAGE');
CREATE TYPE crm_activity_type AS ENUM ('CALL', 'MEETING', 'WHATSAPP', 'EMAIL', 'NOTE');

-- 1. Leads Table (Isolated from md_entities)
CREATE TABLE IF NOT EXISTS public.crm_leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    pic_name VARCHAR(255),
    phone_number VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    industry VARCHAR(100),
    status crm_lead_status DEFAULT 'NEW',
    assigned_to UUID REFERENCES public.profiles(id), -- The Sales Rep
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id)
);

-- 2. Deals Table (Pipeline & Revenue Gamification)
CREATE TABLE IF NOT EXISTS public.crm_deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    lead_id UUID NOT NULL REFERENCES public.crm_leads(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    stage crm_deal_stage DEFAULT 'PROSPECTING',
    expected_revenue NUMERIC(15, 2) DEFAULT 0,
    expected_close_date DATE,
    fee_type crm_fee_type,
    fee_value NUMERIC(15, 2), -- Nominal amount OR percentage (e.g. 1.5)
    sbu_target VARCHAR(50), -- e.g., 'TRUCKING', 'WAREHOUSE'
    converted_entity_id UUID, -- Will be populated when WON and Auto-Insert triggers
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id)
);

-- 3. Activities Table (Institutional Memory / MOM)
CREATE TABLE IF NOT EXISTS public.crm_activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    lead_id UUID REFERENCES public.crm_leads(id) ON DELETE CASCADE,
    deal_id UUID REFERENCES public.crm_deals(id) ON DELETE CASCADE,
    activity_type crm_activity_type DEFAULT 'NOTE',
    activity_date TIMESTAMPTZ NOT NULL,
    location TEXT,
    description TEXT, -- Minutes of Meeting
    performed_by UUID NOT NULL REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Quotations Table (Rate Intelligence)
CREATE TABLE IF NOT EXISTS public.crm_quotations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL,
    deal_id UUID NOT NULL REFERENCES public.crm_deals(id) ON DELETE CASCADE,
    quote_number VARCHAR(100) NOT NULL,
    total_amount NUMERIC(15, 2) DEFAULT 0,
    target_price NUMERIC(15, 2), -- Customer's perspective
    status VARCHAR(50) DEFAULT 'DRAFT', -- DRAFT, WAITING_APPROVAL, SENT, ACCEPTED, REJECTED
    valid_until DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES public.profiles(id),
    updated_by UUID REFERENCES public.profiles(id)
);

-- Auto-Inject updated_by via auth.uid() (Uses Migration 113's function)
DROP TRIGGER IF EXISTS trg_crm_leads_set_updated_by ON public.crm_leads;
CREATE TRIGGER trg_crm_leads_set_updated_by BEFORE UPDATE ON public.crm_leads FOR EACH ROW EXECUTE FUNCTION set_updated_by_and_time();

DROP TRIGGER IF EXISTS trg_crm_deals_set_updated_by ON public.crm_deals;
CREATE TRIGGER trg_crm_deals_set_updated_by BEFORE UPDATE ON public.crm_deals FOR EACH ROW EXECUTE FUNCTION set_updated_by_and_time();

DROP TRIGGER IF EXISTS trg_crm_quotations_set_updated_by ON public.crm_quotations;
CREATE TRIGGER trg_crm_quotations_set_updated_by BEFORE UPDATE ON public.crm_quotations FOR EACH ROW EXECUTE FUNCTION set_updated_by_and_time();

-- RLS & Policies
ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_quotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation_crm_leads" ON public.crm_leads FOR ALL USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "tenant_isolation_crm_deals" ON public.crm_deals FOR ALL USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "tenant_isolation_crm_activities" ON public.crm_activities FOR ALL USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "tenant_isolation_crm_quotations" ON public.crm_quotations FOR ALL USING (tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid()));

-- Add Trigger: Auto-Insert to md_entities upon Deal WON
CREATE OR REPLACE FUNCTION trg_fn_auto_convert_lead_to_customer()
RETURNS TRIGGER AS $$
DECLARE
  v_lead RECORD;
  v_new_entity_id UUID;
BEGIN
  -- If stage changes to WON and it wasn't WON before
  IF NEW.stage = 'WON' AND OLD.stage != 'WON' THEN
    
    -- Get the lead data
    SELECT * INTO v_lead FROM public.crm_leads WHERE id = NEW.lead_id;
    
    -- Check if it already has an entity ID to prevent double insert
    IF NEW.converted_entity_id IS NULL THEN
      -- Insert into md_entities
      INSERT INTO public.md_entities (
        tenant_id, 
        entity_type, 
        name, 
        phone_number, 
        email, 
        address,
        is_active,
        created_by
      ) VALUES (
        NEW.tenant_id,
        'CUSTOMER',
        v_lead.company_name,
        v_lead.phone_number,
        v_lead.email,
        v_lead.address,
        true,
        COALESCE(auth.uid(), NEW.created_by)
      ) RETURNING id INTO v_new_entity_id;
      
      -- Save the reference
      NEW.converted_entity_id := v_new_entity_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_convert_deal_won ON public.crm_deals;
CREATE TRIGGER trg_auto_convert_deal_won
  BEFORE UPDATE ON public.crm_deals
  FOR EACH ROW
  EXECUTE FUNCTION trg_fn_auto_convert_lead_to_customer();

SELECT '115_crm_foundational_tables applied successfully' as result;
