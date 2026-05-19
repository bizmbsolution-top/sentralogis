import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const env = fs.readFileSync('.env.local', 'utf8')
  .split('\n')
  .reduce((acc, line) => {
    const [key, ...val] = line.split('=');
    if (key && val) acc[key.trim()] = val.join('=').trim();
    return acc;
  }, {});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const sql = `
-- 1. Add is_monetized column to job_orders
ALTER TABLE public.job_orders ADD COLUMN IF NOT EXISTS is_monetized boolean DEFAULT false;

-- 2. Update auto_log_token_transaction to include monetized rate in description
CREATE OR REPLACE FUNCTION public.auto_log_token_transaction()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_amount INTEGER;
    v_type VARCHAR(20);
    v_description TEXT;
BEGIN
    -- Hitung selisih token
    v_amount := NEW.token_balance - OLD.token_balance;
    
    -- Tentukan tipe transaksi
    IF v_amount > 0 THEN
        v_type := 'GRANT';
        v_description := 'Token grant from owner';
    ELSIF v_amount < 0 THEN
        v_type := 'USE';
        -- [MODIFIED] Add monetization rate info
        v_description := 'Token usage (1 TKN = Rp 1.000)';
    ELSE
        -- Tidak ada perubahan, skip
        RETURN NEW;
    END IF;
    
    -- Insert ke transaction log
    INSERT INTO public.token_transactions (
        id,
        tenant_id,
        tenant_code,
        amount,
        transaction_type,
        description,
        created_at
    ) VALUES (
        gen_random_uuid(),
        NEW.id,
        NEW.tenant_code,
        v_amount,
        v_type,
        COALESCE(v_description, 'Auto-logged'),
        NOW()
    );
    
    RETURN NEW;
END;
$function$;

-- 3. Update sync_mission_status to handle token deduction
CREATE OR REPLACE FUNCTION public.sync_mission_status()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    v_new_asset_status TEXT;
    v_tenant_id UUID;
BEGIN
    -- 1. Sync WO Item Status
    UPDATE wo_items
    SET status = CASE
        WHEN NEW.status IN ('completed', 'verified', 'ready_for_billing', 'awaiting_audit') THEN 'completed'
        WHEN NEW.status IN ('active', 'in_progress', 'arrived', 'accepted') THEN 'in_progress'
        WHEN NEW.status = 'handover_rejected' THEN 'handover_rejected'
        WHEN NEW.status = 'assigned' THEN 'assigned'
        ELSE status
    END
    WHERE id = NEW.wo_item_id;

    -- 2. Sync Fleet & Driver Availability
    v_new_asset_status := CASE
        WHEN NEW.status IN ('assigned', 'accepted', 'active', 'in_progress', 'arrived') THEN 'on_road'
        WHEN NEW.status IN ('completed', 'cancelled', 'handover_rejected') THEN 'available'
        ELSE NULL
    END;

    -- Jika driver menolak
    IF NEW.driver_response = 'rejected' THEN
        v_new_asset_status := 'available';
    END IF;

    IF v_new_asset_status IS NOT NULL THEN
        IF NEW.fleet_id IS NOT NULL THEN
            UPDATE md_fleets SET status = v_new_asset_status WHERE id = NEW.fleet_id;
        END IF;
        IF NEW.driver_id IS NOT NULL THEN
            UPDATE md_drivers SET status = v_new_asset_status WHERE id = NEW.driver_id;
        END IF;
    END IF;

    -- [NEW] 3. TOKEN MONETIZATION LOGIC
    -- Trigger deduction when status becomes completed and not yet monetized
    IF (NEW.status IN ('completed', 'done', 'PEKERJAAN SELESAI', 'READY_FOR_BILLING', 'VERIFIED')) 
       AND (OLD.status IS NULL OR OLD.status NOT IN ('completed', 'done', 'PEKERJAAN SELESAI', 'READY_FOR_BILLING', 'VERIFIED'))
       AND (NEW.is_monetized = false) THEN
        
        -- Find tenant_id from parent wo_items
        SELECT tenant_id INTO v_tenant_id FROM public.wo_items WHERE id = NEW.wo_item_id;
        
        IF v_tenant_id IS NOT NULL THEN
            -- Deduct 1 token from tenant balance
            UPDATE public.tenants 
            SET token_balance = token_balance - 1,
                updated_at = NOW()
            WHERE id = v_tenant_id;
            
            -- Set is_monetized to true to prevent double charging
            NEW.is_monetized := true;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$function$;
`;

async function applyMigration() {
  console.log('Applying monetization migration...');
  const { data, error } = await supabase.rpc('exec_sql_manual', { sql_query: sql });
  if (error) {
    console.error('Migration Failed:', error);
  } else {
    console.log('Migration Successfully Applied!', data);
  }
}

applyMigration();
