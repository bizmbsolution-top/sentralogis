// [AI] Audit Trail client — permanent business activity history
// [AI] reading from .env.local for Supabase credentials

import { createClient } from '@supabase/supabase-js';

export type AuditSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AuditEntry {
  module: string;
  action: string;
  user_id?: string;
  user_name?: string;
  reference_type?: string;
  reference_id?: string;
  correlation_id?: string;
  severity: AuditSeverity;
  old_data?: Record<string, unknown>;
  new_data?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

let adminClient: ReturnType<typeof createClient> | null = null;

function getAdminClient() {
  if (adminClient) return adminClient;
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();
  if (!url || !key) {
    console.warn('[Audit] Missing Supabase credentials');
    return null;
  }
  adminClient = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return adminClient;
}

export async function writeAuditLog(entry: AuditEntry): Promise<void> {
  const client = getAdminClient();
  if (!client) {
    console.error('[Audit] Cannot write audit log: no Supabase client');
    return;
  }

  try {
    const { error } = await client.from('audit_logs').insert({
      module: entry.module,
      action: entry.action,
      user_id: entry.user_id || null,
      user_name: entry.user_name || null,
      reference_type: entry.reference_type || null,
      reference_id: entry.reference_id || null,
      correlation_id: entry.correlation_id || null,
      severity: entry.severity,
      old_data: entry.old_data || null,
      new_data: entry.new_data || null,
      metadata: entry.metadata || null,
    });

    if (error) {
      console.error('[Audit] Failed to write audit log:', error.message);
    }
  } catch (err) {
    console.error('[Audit] Exception writing audit log:', err);
  }
}

export const audit = {
  async log(entry: AuditEntry) {
    await writeAuditLog(entry);
  },
};
