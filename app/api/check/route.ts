export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { supabaseAdmin as supabase, supabaseAdmin } from '@/lib/supabase/admin';

export async function GET() {
  // supabase client provided by supabaseAdmin

  const { data, error } = await supabase.rpc('exec_sql_manual', {
    sql_query: "SELECT policyname, permissive, roles, cmd, qual, with_check FROM pg_policies WHERE tablename = 'tenant_users'"
  });
  
  return NextResponse.json({ data, error });
}
