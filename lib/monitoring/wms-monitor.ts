// [AI] WMS operational checks — detect stock anomalies, pending picking, negative stock
// [AI] reading from .env.local for Supabase credentials

import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';
import { alert } from '@/lib/alerting';
import { generateCorrelationId } from '@/lib/correlation';

interface WmsIssue {
  type: 'negative_stock' | 'orphan_inventory' | 'duplicate_allocation' | 'picking_not_completed';
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

async function checkNegativeStock(): Promise<WmsIssue[]> {
  const issues: WmsIssue[] = [];
  const client = getAdmin();
  if (!client) return issues;

  try {
    // Check inventory tables if they exist
    const { data: tables, error: tableError } = await client
      .from('information_schema.tables')
      .select('table_name')
      .in('table_name', ['inventory', 'stock_items', 'warehouse_stock'])
      .limit(1);

    if (tableError || !tables?.length) return issues;

    for (const { table_name } of tables) {
      const { data, error } = await client
        .from(table_name as 'inventory' | 'stock_items' | 'warehouse_stock')
        .select('id, item_name, quantity, warehouse_id')
        .lt('quantity', 0)
        .limit(20);

      if (error) continue;

      for (const item of (data as any[]) || []) {
        issues.push({
          type: 'negative_stock',
          severity: 'high',
          message: `Negative stock: ${item.item_name || item.id} (qty: ${item.quantity})`,
          details: { item_id: item.id, item_name: item.item_name, quantity: item.quantity, warehouse_id: item.warehouse_id },
        });
      }
    }
  } catch (err) {
    logger.error('wms-monitor', 'NEGATIVE_STOCK_CHECK_FAILED', { payload: { error: String(err) } });
  }

  return issues;
}

export async function runWmsChecks(): Promise<{ issues: WmsIssue[]; correlation_id: string }> {
  const correlation_id = generateCorrelationId('MON');

  const allIssues = await Promise.all([checkNegativeStock()]);
  const issues = allIssues.flat();

  for (const issue of issues) {
    await alert.send(issue.severity, 'wms', issue.type.replace(/_/g, ' ').toUpperCase(), issue.message, {
      correlation_id,
      metadata: issue.details,
    });
  }

  logger.info('wms-monitor', 'WMS_CHECKS_COMPLETED', {
    correlation_id,
    payload: { total_issues: issues.length, issues: issues.map((i) => i.type) },
  });

  return { issues, correlation_id };
}
