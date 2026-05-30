// [AI] Health check — verifies core system components
// [AI] reading from .env.local for Supabase credentials

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { alert } from '@/lib/alerting';

export interface HealthCheckResult {
  component: string;
  status: 'pass' | 'fail';
  latency_ms: number;
  message?: string;
}

export interface HealthReport {
  timestamp: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  checks: HealthCheckResult[];
}

async function checkSupabase(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
    const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
    if (!url || !key) throw new Error('Missing Supabase credentials');
    const client = createClient(url, key, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { error } = await client.from('md_warehouses').select('id').limit(1);
    if (error) throw error;
    return { component: 'supabase', status: 'pass', latency_ms: Date.now() - start };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { component: 'supabase', status: 'fail', latency_ms: Date.now() - start, message };
  }
}

async function checkApi(): Promise<HealthCheckResult> {
  const start = Date.now();
  try {
    const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000').trim();
    const res = await fetch(`${baseUrl}/api/cron/health`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`API returned ${res.status}`);
    return { component: 'api', status: 'pass', latency_ms: Date.now() - start };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { component: 'api', status: 'fail', latency_ms: Date.now() - start, message };
  }
}

export async function runHealthCheck(): Promise<HealthReport> {
  const checks = await Promise.all([checkSupabase(), checkApi()]);
  const failed = checks.filter((c) => c.status === 'fail');
  const status: HealthReport['status'] =
    failed.length === 0 ? 'healthy' : failed.length === checks.length ? 'unhealthy' : 'degraded';

  if (status !== 'healthy') {
    await alert.send(
      status === 'unhealthy' ? 'critical' : 'high',
      'health-check',
      `System health: ${status}`,
      `${failed.length}/${checks.length} checks failed: ${failed.map((f) => f.component).join(', ')}`,
      { metadata: { checks } }
    );
  }

  logger.info('health-check', 'HEALTH_CHECK_COMPLETED', {
    payload: { status, checks },
  });

  return { timestamp: new Date().toISOString(), status, checks };
}
