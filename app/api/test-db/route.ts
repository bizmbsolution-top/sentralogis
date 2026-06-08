import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data, error } = await supabase
      .from('md_entities')
      .select('id, name, parent_id, parent:md_entities!parent_id(name)')
      .limit(10);
      
    return NextResponse.json({ success: true, data, error });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
