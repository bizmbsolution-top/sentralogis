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

async function fixRLS() {
  // Try to drop first to ensure clean state
  await supabase.rpc('exec_sql_manual', {
    sql_query: 'DROP POLICY IF EXISTS "Owners can view all tenants" ON "public"."tenants"'
  })
  
  const { data, error } = await supabase.rpc('exec_sql_manual', {
    sql_query: 'CREATE POLICY "Owners can view all tenants" ON "public"."tenants" FOR SELECT TO authenticated USING ( (SELECT role FROM profiles WHERE id = auth.uid()) = \'owner_sentralogis\' )'
  })
  
  if (error) console.error('Error fixing RLS:', error)
  else console.log('RLS Policy added successfully.')
}

fixRLS()
