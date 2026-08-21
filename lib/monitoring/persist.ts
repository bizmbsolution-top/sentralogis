// [AI] Persist monitoring check results to Supabase tracking table
// [AI] reading from .env.local for Supabase credentials

import { createClient } from '@supabase/supabase-js';

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

export async function persistCheck(
  checkType: string,
  status: 'pass' | 'fail' | 'warning',
  module?: string,
  message?: string,
  details?: Record<string, unknown>
) {
  const client = getAdmin();
  if (!client) {
    console.warn('[Monitoring] Cannot persist check: no Supabase client');
    return;
  }
  try {
    await (client.from('monitoring_checks' as any) as any).insert({
      check_type: checkType,
      status,
      module: module || null,
      message: message || null,
      details: details || null,
    });
  } catch (err) {
    console.error('[Monitoring] Failed to persist check:', err);
  }
}
