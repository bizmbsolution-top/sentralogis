// [AI] On-demand monitoring check trigger
import { NextRequest, NextResponse } from 'next/server';
import { runHealthCheck } from '@/lib/monitoring/health-check';
import { runTruckingChecks } from '@/lib/monitoring/trucking-monitor';
import { runWmsChecks } from '@/lib/monitoring/wms-monitor';
import { runForwardingChecks } from '@/lib/monitoring/forwarding-monitor';
import { persistCheck } from '@/lib/monitoring/persist';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

const checkRunners: Record<string, () => Promise<unknown>> = {
  health: runHealthCheck,
  trucking: runTruckingChecks,
  wms: runWmsChecks,
  forwarding: runForwardingChecks,
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { type } = body as { type: string };

    if (!type || !checkRunners[type]) {
      return NextResponse.json({ success: false, error: `Unknown check type: ${type}. Valid: ${Object.keys(checkRunners).join(', ')}` }, { status: 400 });
    }

    logger.info('observability', 'RUN_CHECK_TRIGGERED', { payload: { type } });

    const result = await checkRunners[type]();

    await persistCheck(type, 'pass', type, `${type} check completed`);

    return NextResponse.json({ success: true, type, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Check failed';
    const type = 'unknown';

    await persistCheck(type, 'fail', type, message);

    logger.error('observability', 'RUN_CHECK_FAILED', { payload: { error: message }, error: err });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
