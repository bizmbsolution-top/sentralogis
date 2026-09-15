'use server';

import { createAdminClient } from '@/lib/supabase/admin';

/**
 * U-25/ADR-064 extension: Canonical Invoice Number Authority
 *
 * Server action that generates the next invoice number atomically.
 * All invoice creation paths must call this before inserting into fin_invoices.
 *
 * Format: INV-YYYY-MM-NNNN (per-tenant monthly sequence)
 * Concurrency: Atomic via nextval() + UNIQUE constraint safety net.
 */
export async function getNextInvoiceNumber(tenantId: string): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('next_invoice_number', {
    p_tenant_id: tenantId,
  });
  if (error) {
    throw new Error(`Failed to generate invoice number: ${error.message}`);
  }
  return data as string;
}
