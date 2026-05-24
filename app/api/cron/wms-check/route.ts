// [AI] Cron WMS operational check — every 30 minutes via Vercel Cron
import { NextResponse } from 'next/server';
import { runWmsChecks } from '@/lib/monitoring/wms-monitor';
import { logger } from '@/lib/logger';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await runWmsChecks();
    return NextResponse.json({ success: true, issues: result.issues.length, correlation_id: result.correlation_id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'WMS check failed';
    logger.error('cron', 'WMS_CHECK_CRON_FAILED', { payload: { error: message }, error: err });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
