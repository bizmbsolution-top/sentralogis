'use server';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * U-11: Canonical Quote Number Authority
 *
 * Server action that generates the next quote number atomically.
 * Both HQ Pipeline and Sales Portal creation paths must call this
 * before inserting into crm_quotations.
 *
 * Format: QT-YYYY-MM-NNNN (per-tenant monthly sequence)
 * Concurrency: Atomic via nextval() + UNIQUE constraint safety net.
 */
export async function getNextQuoteNumber(tenantId: string): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('next_quote_number', {
    p_tenant_id: tenantId,
  });
  if (error) {
    throw new Error(`Failed to generate quote number: ${error.message}`);
  }
  return data as string;
}
