// GET /api/easygo/debug?tenant_id=xxx - Debug EasyGo sync data
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenant_id');
  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id required' }, { status: 400 });
  }

  // Count fleets with easygo mapping
  const { count: fleetCount } = await supabase
    .from('md_fleets')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .not('easygo_vehicle_id', 'is', null);

  // Count tracking sessions with FLEET reference
  const { count: sessionCount, data: sessions } = await supabase
    .from('tracking_sessions')
    .select('id, reference_type, reference_id, status, created_at')
    .eq('tenant_id', tenantId)
    .eq('reference_type', 'FLEET')
    .order('created_at', { ascending: false })
    .limit(5);

  // Count tracking points
  let totalPoints = 0;
  let latestPoints: any[] = [];
  if (sessions && sessions.length > 0) {
    for (const s of sessions.slice(0, 3)) {
      const { count } = await supabase
        .from('tracking_points')
        .select('*', { count: 'exact', head: true })
        .eq('session_id', s.id);
      totalPoints += count || 0;
    }
    // Get latest points
    const { data: pts } = await supabase
      .from('tracking_points')
      .select('id, latitude, longitude, speed, recorded_at, session_id')
      .order('recorded_at', { ascending: false })
      .limit(5);
    latestPoints = pts || [];
  }

  // Also count all tracking sessions (any type)
  const { count: allSessionCount } = await supabase
    .from('tracking_sessions')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId);

  // Count job_tracking with easygo source
  const { count: jtCount } = await supabase
    .from('job_tracking')
    .select('*', { count: 'exact', head: true })
    .eq('source', 'easygo');

  return NextResponse.json({
    tenant_id: tenantId,
    easygo_fleets: fleetCount,
    fleet_tracking_sessions: sessionCount,
    all_tracking_sessions: allSessionCount,
    job_tracking_easygo: jtCount,
    recent_sessions: sessions,
    total_points_in_recent_sessions: totalPoints,
    latest_points: latestPoints,
  });
}
