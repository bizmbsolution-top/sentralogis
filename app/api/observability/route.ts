// [AI] Mission Control API — aggregated monitoring data
import { NextResponse } from 'next/server';
import { fetchMissionControlData } from '@/lib/monitoring/mission-control';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const data = await fetchMissionControlData();
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to fetch monitoring data';
    logger.error('observability', 'FETCH_MISSION_CONTROL_FAILED', { payload: { error: message }, error: err });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
