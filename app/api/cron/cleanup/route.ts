// [AI] Cron cleanup — daily at 02:00 via Vercel Cron
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { generateCorrelationId } from '@/lib/correlation';

export const maxDuration = 180;
export const dynamic = 'force-dynamic';

export async function GET() {
  const correlation_id = generateCorrelationId('CLN');

  try {
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
    if (!url || !key) throw new Error('Missing Supabase credentials');
    const client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const results: Record<string, number> = {};

    // Archive audit logs older than 90 days
    const cutoff90 = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const { data: archived } = await client
      .from('audit_logs')
      .delete()
      .lt('created_at', cutoff90)
      .select('id');
    results.archived_audit_logs = archived?.length || 0;

    // Clean monitoring checks older than 30 days
    const cutoff30 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: cleaned } = await client
      .from('monitoring_checks')
      .delete()
      .lt('checked_at', cutoff30)
      .select('id');
    results.cleaned_monitoring_checks = cleaned?.length || 0;

    const summary = `Cleaned up ${results.archived_audit_logs} audit logs, ${results.cleaned_monitoring_checks} monitoring checks`;

    logger.info('cron', 'CLEANUP_COMPLETED', {
      correlation_id,
      payload: results,
    });

    return NextResponse.json({ success: true, correlation_id, results, summary });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Cleanup failed';
    logger.error('cron', 'CLEANUP_CRON_FAILED', { correlation_id, payload: { error: message }, error: err });
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
