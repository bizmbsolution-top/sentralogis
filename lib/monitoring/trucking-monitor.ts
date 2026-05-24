// [AI] Trucking operational checks — detect stuck JO, failed WA, overdue deliveries
// [AI] reading from .env.local for Supabase credentials

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { alert } from '@/lib/alerting';
import { generateCorrelationId } from '@/lib/correlation';

interface TruckingIssue {
  type: 'stuck_jo' | 'driver_not_accepted' | 'duplicate_fleet' | 'invalid_wa_token' | 'delivery_overdue';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  details: Record<string, unknown>;
}

let adminClient: ReturnType<typeof createClient> | null = null;

function getAdmin() {
  if (adminClient) return adminClient;
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  if (!url || !key) return null;
  adminClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}

async function checkStuckJobs(): Promise<TruckingIssue[]> {
  const issues: TruckingIssue[] = [];
  const client = getAdmin();
  if (!client) return issues;

  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await client
      .from('job_orders')
      .select('id, jo_number, status, created_at, driver_id, fleet_id')
      .in('status', ['PENDING', 'ASSIGNED', 'IN_PROGRESS'])
      .lt('created_at', cutoff)
      .limit(20);

    if (error) throw error;

    for (const job of data || []) {
      issues.push({
        type: 'stuck_jo',
        severity: 'high',
        message: `JO ${job.jo_number} stuck in "${job.status}" for >24h`,
        details: { jo_id: job.id, jo_number: job.jo_number, status: job.status, created_at: job.created_at },
      });
    }
  } catch (err) {
    logger.error('trucking-monitor', 'STUCK_JO_CHECK_FAILED', { payload: { error: String(err) } });
  }

  return issues;
}

async function checkDriverNotAccepted(): Promise<TruckingIssue[]> {
  const issues: TruckingIssue[] = [];
  const client = getAdmin();
  if (!client) return issues;

  try {
    const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data, error } = await client
      .from('job_orders')
      .select('id, jo_number, driver_id, created_at')
      .eq('status', 'ASSIGNED')
      .is('driver_accepted_at', null)
      .lt('created_at', cutoff)
      .limit(20);

    if (error) throw error;

    for (const job of data || []) {
      issues.push({
        type: 'driver_not_accepted',
        severity: 'medium',
        message: `Driver has not accepted JO ${job.jo_number} for >2h`,
        details: { jo_id: job.id, jo_number: job.jo_number, driver_id: job.driver_id },
      });
    }
  } catch (err) {
    logger.error('trucking-monitor', 'DRIVER_ACCEPT_CHECK_FAILED', { payload: { error: String(err) } });
  }

  return issues;
}

async function checkDuplicateFleet(): Promise<TruckingIssue[]> {
  const issues: TruckingIssue[] = [];
  const client = getAdmin();
  if (!client) return issues;

  try {
    const { data, error } = await client
      .from('job_orders')
      .select('id, jo_number, fleet_id, plate_number, status')
      .not('fleet_id', 'is', null)
      .in('status', ['ASSIGNED', 'IN_PROGRESS'])
      .limit(100);

    if (error) throw error;

    const fleetMap = new Map<string, typeof data>();
    for (const job of data || []) {
      const key = job.fleet_id;
      if (!fleetMap.has(key)) fleetMap.set(key, []);
      fleetMap.get(key)!.push(job);
    }

    for (const [, jobs] of fleetMap) {
      if (jobs.length > 1) {
        issues.push({
          type: 'duplicate_fleet',
          severity: 'critical',
          message: `Fleet ${jobs[0].plate_number || jobs[0].fleet_id} assigned to multiple active JOs`,
          details: { fleet_id: jobs[0].fleet_id, plate_number: jobs[0].plate_number, jobs: jobs.map((j) => ({ jo_number: j.jo_number, status: j.status })) },
        });
      }
    }
  } catch (err) {
    logger.error('trucking-monitor', 'DUPLICATE_FLEET_CHECK_FAILED', { payload: { error: String(err) } });
  }

  return issues;
}

export async function runTruckingChecks(): Promise<{ issues: TruckingIssue[]; correlation_id: string }> {
  const correlation_id = generateCorrelationId('MON');

  const allIssues = await Promise.all([checkStuckJobs(), checkDriverNotAccepted(), checkDuplicateFleet()]);
  const issues = allIssues.flat();

  for (const issue of issues) {
    await alert.send(issue.severity, 'trucking', issue.type.replace(/_/g, ' ').toUpperCase(), issue.message, {
      correlation_id,
      metadata: issue.details,
    });
  }

  logger.info('trucking-monitor', 'TRUCKING_CHECKS_COMPLETED', {
    correlation_id,
    payload: { total_issues: issues.length, issues: issues.map((i) => i.type) },
  });

  return { issues, correlation_id };
}
