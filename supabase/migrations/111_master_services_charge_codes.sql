-- Migration 111: Master Services & Dynamic Charge Codes (Multi-SBU + COA)

-- 1. Drop check constraint on md_billing_rates
ALTER TABLE public.md_billing_rates DROP CONSTRAINT IF EXISTS md_billing_rates_charge_code_check;

-- 2. Create md_services table
CREATE TABLE IF NOT EXISTS public.md_services (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL,
  sbu_type TEXT NOT NULL CHECK (sbu_type IN ('WAREHOUSE', 'TRUCKING', 'FORWARDING', 'CLEARANCE', 'GENERAL')),
  charge_code TEXT NOT NULL,
  service_name TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('STORAGE', 'HANDLING', 'VAS', 'ADMIN', 'TRANSPORT', 'CLEARANCE', 'OTHER')),
  default_uom TEXT,
  description TEXT,
  income_account_id UUID REFERENCES public.finance_coa(id) ON DELETE SET NULL,
  expense_account_id UUID REFERENCES public.finance_coa(id) ON DELETE SET NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  UNIQUE(tenant_id, charge_code)
);

-- RLS
ALTER TABLE public.md_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for users" ON public.md_services FOR SELECT USING (true);
CREATE POLICY "Enable insert for users" ON public.md_services FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update for users" ON public.md_services FOR UPDATE USING (true);
CREATE POLICY "Enable delete for users" ON public.md_services FOR DELETE USING (true);

-- 3. Create Trigger for Auto-COA Generation
CREATE OR REPLACE FUNCTION public.trg_auto_create_coa_for_service()
RETURNS TRIGGER AS $$
DECLARE
  v_new_coa_id UUID;
  v_account_number TEXT;
  v_retry INT;
BEGIN
  -- If income_account_id is not provided, auto-create one
  IF NEW.income_account_id IS NULL THEN
    
    FOR v_retry IN 1..10 LOOP
      v_account_number := '4-4' || LPAD(floor(random() * 10000)::TEXT, 4, '0');
      
      BEGIN
        INSERT INTO public.finance_coa (account_number, account_name, category)
        VALUES (
          v_account_number,
          'Pendapatan - ' || NEW.service_name,
          'Revenue'
        ) RETURNING id INTO v_new_coa_id;
        
        NEW.income_account_id := v_new_coa_id;
        EXIT; -- Exit loop if successful
      EXCEPTION WHEN unique_violation THEN
        -- Continue loop and try a new random number
      END;
    END LOOP;

  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_auto_create_coa_for_service ON public.md_services;
CREATE TRIGGER trigger_auto_create_coa_for_service
BEFORE INSERT ON public.md_services
FOR EACH ROW
EXECUTE FUNCTION public.trg_auto_create_coa_for_service();

-- 4. Seed Default Services for Existing Tenants
DO $$
DECLARE
  v_tenant RECORD;
BEGIN
  FOR v_tenant IN SELECT DISTINCT tenant_id FROM public.md_billing_rates LOOP
    INSERT INTO public.md_services (tenant_id, sbu_type, charge_code, service_name, category, default_uom)
    VALUES 
      (v_tenant.tenant_id, 'WAREHOUSE', 'STR-FIX', 'Fixed Storage (per month)', 'STORAGE', 'PALLET'),
      (v_tenant.tenant_id, 'WAREHOUSE', 'STR-CBM', 'Variable Storage (per CBM)', 'STORAGE', 'CBM'),
      (v_tenant.tenant_id, 'WAREHOUSE', 'HD-IN', 'Handling In', 'HANDLING', 'PALLET'),
      (v_tenant.tenant_id, 'WAREHOUSE', 'HD-OUT', 'Handling Out', 'HANDLING', 'PALLET'),
      (v_tenant.tenant_id, 'TRUCKING', 'TRK-DROP', 'Uang Jalan Utama', 'TRANSPORT', 'TRIP'),
      (v_tenant.tenant_id, 'CLEARANCE', 'CLR-PIB', 'Jasa Pengurusan PIB', 'CLEARANCE', 'DOC')
    ON CONFLICT (tenant_id, charge_code) DO NOTHING;
  END LOOP;
END $$;
