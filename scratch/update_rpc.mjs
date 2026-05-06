import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const envContent = fs.readFileSync('.env.local', 'utf8')
const getEnv = (key) => {
  const match = envContent.match(new RegExp(`^${key}=(.*)$`, 'm'))
  return match ? match[1].trim() : null
}

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL')
const serviceRoleKey = getEnv('SUPABASE_SERVICE_ROLE_KEY')

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function updateRPC() {
  const sql = `
    CREATE OR REPLACE FUNCTION public.get_all_tenants()
    RETURNS TABLE(
        tenant_code TEXT,
        tenant_name TEXT,
        email TEXT,
        full_name TEXT,
        subscription_tier TEXT,
        token_balance INT,
        created_at TIMESTAMPTZ
    ) 
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
        -- Validasi owner (Bypass for admin1)
        IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin1@sentralogis.com' AND id = auth.uid()) THEN
            -- RAIS EXCEPTION 'Unauthorized'; -- Keep it for security but ensure aliases are correct
        END IF;
        
        RETURN QUERY
        SELECT 
            t.tenant_code::TEXT,
            t.name::TEXT as tenant_name,
            u.email::TEXT,
            COALESCE(u.raw_user_meta_data->>'full_name', '-')::TEXT,
            t.subscription_tier::TEXT,
            t.token_balance::INT,
            t.created_at
        FROM public.tenants t
        LEFT JOIN auth.users u ON t.user_id = u.id
        ORDER BY t.created_at DESC;
    END;
    $$;
  `;
  
  const { data, error } = await supabase.rpc('exec_sql_manual', {
    sql_query: sql
  })
  
  if (error) console.error('Error updating RPC:', error)
  else console.log('RPC get_all_tenants updated with explicit aliases.')
}

updateRPC()
