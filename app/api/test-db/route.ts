import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase/admin';
import * as fs from 'fs';
import * as path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sqlPath = path.join(process.cwd(), 'supabase', 'migrations', '053_sku_categories_and_attributes.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    const queries = ["SELECT column_name FROM information_schema.columns WHERE table_name = 'md_product_skus'"];
    
    const results = [];
    for (const q of queries) {
      const { data, error } = await supabaseAdmin.rpc('exec_sql_manual', { sql_query: q });
      results.push({ query: q.substring(0, 50), data, error });
    }
    
    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
