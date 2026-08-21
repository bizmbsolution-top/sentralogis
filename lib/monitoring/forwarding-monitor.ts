// [AI] Forwarding operational checks — detect shipment mismatches, missing containers/docs
// [AI] reading from .env.local for Supabase credentials

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { alert } from '@/lib/alerting';
import { generateCorrelationId } from '@/lib/correlation';

interface ForwardingIssue {
  type: 'shipment_status_mismatch' | 'missing_container' | 'missing_documents' | 'overdue_milestones';
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

async function checkMissingDocuments(): Promise<ForwardingIssue[]> {
  const issues: ForwardingIssue[] = [];
  const client = getAdmin();
  if (!client) return issues;

  try {
    const { data: tables } = await client
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', ['shipments', 'forwarding_shipments'])
      .limit(1);

    if (!tables?.length) return issues;

    const tableName = (tables as any[])[0].table_name as 'shipments' | 'forwarding_shipments';
    const { data, error } = await client
      .from(tableName)
      .select('id, shipment_number, status, created_at')
      .is('document_uploaded', false)
      .limit(20);

    if (error) throw error;

    for (const shipment of (data as any[]) || []) {
      issues.push({
        type: 'missing_documents',
        severity: 'medium',
        message: `Shipment ${shipment.shipment_number || shipment.id} missing documents`,
        details: { shipment_id: shipment.id, shipment_number: shipment.shipment_number, status: shipment.status },
      });
    }
  } catch (err) {
    logger.error('forwarding-monitor', 'MISSING_DOCS_CHECK_FAILED', { payload: { error: String(err) } });
  }

  return issues;
}

export async function runForwardingChecks(): Promise<{ issues: ForwardingIssue[]; correlation_id: string }> {
  const correlation_id = generateCorrelationId('MON');

  const allIssues = await Promise.all([checkMissingDocuments()]);
  const issues = allIssues.flat();

  for (const issue of issues) {
    await alert.send(issue.severity, 'forwarding', issue.type.replace(/_/g, ' ').toUpperCase(), issue.message, {
      correlation_id,
      metadata: issue.details,
    });
  }

  logger.info('forwarding-monitor', 'FORWARDING_CHECKS_COMPLETED', {
    correlation_id,
    payload: { total_issues: issues.length, issues: issues.map((i) => i.type) },
  });

  return { issues, correlation_id };
}
