// [AI] Cron health check — every 10 minutes via Vercel Cron
import { NextResponse } from 'next/server';
import { runHealthCheck } from '@/lib/monitoring/health-check';
import { persistCheck } from '@/lib/monitoring/persist';
import { logger } from '@/lib/logger';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET() {
  return handleHealthCheck();
}

export async function HEAD() {
  return new Response(null, { status: 200 });
}

async function handleHealthCheck() {
  try {
    const report = await runHealthCheck();
    await persistCheck('health', report.status === 'healthy' ? 'pass' : 'fail', 'health', `${report.status}: ${report.checks.length} checks`);
    return NextResponse.json({ success: true, report });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Health check failed';
    await persistCheck('health', 'fail', 'health', message);
    logger.error('cron', 'HEALTH_CHECK_CRON_FAILED', { payload: { error: message }, error: err });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
