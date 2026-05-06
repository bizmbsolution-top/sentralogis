import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const env = fs.readFileSync('.env.local', 'utf8');
const url = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/)[1].trim();
const key = env.match(/SUPABASE_SERVICE_ROLE_KEY=(.*)/)[1].trim();
const s = createClient(url, key);

const sql = `
CREATE OR REPLACE FUNCTION public.manual_topup_tokens(
    p_tenant_code text, 
    p_amount_received integer, 
    p_note text DEFAULT NULL::text
) 
RETURNS json 
LANGUAGE plpgsql 
SECURITY DEFINER 
AS $function$ 
DECLARE 
    v_tenant_id uuid; 
    v_new_balance integer; 
BEGIN 
    SELECT id INTO v_tenant_id FROM public.tenants WHERE tenant_code = p_tenant_code; 
    
    IF v_tenant_id IS NULL THEN 
        RETURN json_build_object('success', false, 'message', 'Node cluster tidak ditemukan'); 
    END IF; 
    
    UPDATE public.tenants 
    SET token_balance = token_balance + p_amount_received, 
        updated_at = NOW() 
    WHERE id = v_tenant_id 
    RETURNING token_balance INTO v_new_balance; 
    
    INSERT INTO public.token_transactions (tenant_id, tenant_code, amount, transaction_type, description) 
    VALUES (v_tenant_id, p_tenant_code, p_amount_received, 'TOPUP', 
            COALESCE(p_note, format('Injection of %s tokens', p_amount_received))); 
            
    RETURN json_build_object(
        'success', true, 
        'message', format('Berhasil menambahkan %s token', p_amount_received), 
        'tokens_added', p_amount_received, 
        'new_balance', v_new_balance
    ); 
END; 
$function$;
`;

async function fix() {
  const { data, error } = await s.rpc('exec_sql_manual', { sql_query: sql });
  console.log('Data:', data);
  console.log('Error:', error);
}

fix();
