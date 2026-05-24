// [AI] Cron forwarding operational check — every 30 minutes via Vercel Cron
import { NextResponse } from 'next/server';
import { runForwardingChecks } from '@/lib/monitoring/forwarding-monitor';
import { logger } from '@/lib/logger';

export const maxDuration = 120;
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await runForwardingChecks();
    return NextResponse.json({ success: true, issues: result.issues.length, correlation_id: result.correlation_id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Forwarding check failed';
    logger.error('cron', 'FORWARDING_CHECK_CRON_FAILED', { payload: { error: message }, error: err });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
