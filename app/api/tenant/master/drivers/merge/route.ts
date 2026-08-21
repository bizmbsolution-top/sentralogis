import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/tenant/master/drivers/merge
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Require SuperAdmin role or specific permissions here
    // e.g. if (user.user_metadata?.role !== 'superadmin') return 403;

    const payload = await req.json();
    const { source_profile_id, target_profile_id } = payload;

    if (!source_profile_id || !target_profile_id) {
      return NextResponse.json({ error: 'Missing source or target profile ID' }, { status: 400 });
    }

    const { data, error } = await supabase.rpc('merge_driver_profile', {
      p_source_profile_id: source_profile_id,
      p_target_profile_id: target_profile_id
    });

    if (error) {
      console.error('[API] Merge driver profile error:', error);
      if (error.message?.includes('TENANT_CONFLICT')) {
        return NextResponse.json({ error: 'Tenant conflict: Both profiles exist in the same tenant.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('[API] POST /api/tenant/master/drivers/merge error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
