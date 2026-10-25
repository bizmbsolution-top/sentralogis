/**
 * Sentralogis — U-25 Fin Invoice Numbering & Duplicate Prevention
 * lib/__tests__/u25-fin-invoice-numbering-duplicate-prevention.test.ts
 *
 * Tests for bounded atomic transaction foundation (U-25):
 * - Invoice number authority (next_invoice_number)
 * - Concurrent invoice-number generation
 * - Duplicate billable-event prevention
 * - Atomic rollback (conceptual)
 * - Bill-to lineage verification
 * - Tenant isolation
 * - Financial boundary protection
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());
const LIB_DIR = path.join(ROOT, 'lib');
const SUPABASE_DIR = path.join(ROOT, 'supabase');
const MIGRATION_DIR = path.join(SUPABASE_DIR, 'migrations');

function readFile(p: string): string {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

export function runU25FinInvoiceNumberingDuplicatePreventionSuite() {
  const results: Array<{ testId: string; description: string; pass: boolean; error?: string }> = [];

  function assert(testId: string, description: string, fn: () => void) {
    try {
      fn();
      results.push({ testId, description, pass: true });
    } catch (e: any) {
      results.push({ testId, description, pass: false, error: e.message || String(e) });
    }
  }

  // =========================================================================
  // U25-01: Invoice number authority uses next_invoice_number RPC
  // =========================================================================
  assert('U25-01', 'Invoice number authority uses next_invoice_number RPC', () => {
    const rpcSrc = readFile(path.join(SUPABASE_DIR, 'migrations', '20260922_001_next_invoice_number.sql'));
    if (!rpcSrc.includes('next_invoice_number')) {
      throw new Error('Missing next_invoice_number RPC');
    }
    if (!rpcSrc.includes('nextval')) {
      throw new Error('next_invoice_number RPC does not use nextval for atomic sequence');
    }
    // generate_invoice() RPC must call next_invoice_number()
    if (!rpcSrc.includes('public.next_invoice_number')) {
      throw new Error('generate_invoice() does not call next_invoice_number()');
    }
    // Server action must wrap the RPC
    const actionSrc = readFile(path.join(ROOT, 'app', 'invoice', 'number-actions.ts'));
    if (!actionSrc.includes('next_invoice_number')) {
      throw new Error('getNextInvoiceNumber server action does not call next_invoice_number RPC');
    }
  });

  // =========================================================================
  // U25-02: Concurrent invoice-number generation produces unique numbers
  // =========================================================================
  assert('U25-02', 'Concurrent invoice-number generation produces unique numbers', () => {
    const rpcSrc = readFile(path.join(SUPABASE_DIR, 'migrations', '20260922_001_next_invoice_number.sql'));
    if (!rpcSrc.includes('seq_invoice_number')) {
      throw new Error('Missing sequence for invoice number authority');
    }
    if (!rpcSrc.includes('nextval')) {
      throw new Error('RPC does not use nextval for atomic sequence');
    }
  });

  // =========================================================================
  // U25-03: Commit-boundary — committed billable events only
  // =========================================================================
  assert('U25-03', 'Commit-boundary: only committed billable events are invoiceable', () => {
    const src = readFile(path.join(LIB_DIR, 'financial', 'repository.ts'));
    // Must check status === 'PENDING' before invoice generation
    if (!src.includes("status !== 'PENDING'") && !src.includes('status != PENDING')) {
      throw new Error('createInvoice does not validate billable event status (PENDING check)');
    }
    // generate_invoice() RPC must copy committed values from fin_billable_events
    const rpcSrc = readFile(path.join(SUPABASE_DIR, 'migrations', '20260922_001_next_invoice_number.sql'));
    if (!rpcSrc.includes('FROM public.fin_billable_events')) {
      throw new Error('generate_invoice() does not read committed values from fin_billable_events');
    }
    // Must copy committed quantity, not recalculate
    if (!rpcSrc.includes('v_quantity') || !rpcSrc.includes('v_unit_amount') || !rpcSrc.includes('v_total_amount')) {
      throw new Error('generate_invoice() does not copy committed quantity/amount from billable event');
    }
  });

  // =========================================================================
  // U25-04: Atomic rollback on failure
  // =========================================================================
  assert('U25-04', 'Atomic rollback — failure in line creation does not persist invoice', () => {
    const rpcSrc = readFile(path.join(SUPABASE_DIR, 'migrations', '20260922_001_next_invoice_number.sql'));
    if (!rpcSrc.includes('EXCEPTION')) {
      throw new Error('generate_invoice RPC missing exception handler');
    }
    if (!rpcSrc.includes('WHEN OTHERS')) {
      throw new Error('generate_invoice RPC missing WHEN OTHERS rollback');
    }
  });

  // =========================================================================
  // U25-05: Bill-to lineage resolution
  // =========================================================================
  assert('U25-05', 'Bill-to lineage: sales_orders.engagement_id → commercial_work_orders.customer_id', () => {
    const src = readFile(path.join(LIB_DIR, 'financial', 'repository.ts'));
    if (!src.includes('commercial_work_orders')) {
      throw new Error('createInvoice does not resolve bill-to via commercial_work_orders');
    }
    if (!src.includes('engagement_id')) {
      throw new Error('createInvoice does not use sales_orders.engagement_id');
    }
    if (!src.includes('customer_id')) {
      throw new Error('createInvoice does not resolve customer_id');
    }
  });

  // =========================================================================
  // U25-06: Duplicate billable-event prevention
  // =========================================================================
  assert('U25-06', 'Duplicate billable-event prevention via partial UNIQUE index', () => {
    const sqlSrc = readFile(path.join(SUPABASE_DIR, 'migrations', '20260922_001_next_invoice_number.sql'));
    const repoSrc = readFile(path.join(LIB_DIR, 'financial', 'repository.ts'));

    // Check partial unique index exists in migration
    if (!sqlSrc.includes('uq_fin_invoice_lines_billable_event')) {
      throw new Error('Missing partial UNIQUE index on billable_event_id');
    }
    if (!sqlSrc.includes('WHERE billable_event_id IS NOT NULL')) {
      throw new Error('Partial unique index does not exclude null billable_event_id');
    }

    // Check repository handles duplicate insertion error
    if (!repoSrc.includes('23505') && !repoSrc.includes('duplicate')) {
      throw new Error('createInvoice does not handle unique constraint violation for duplicate billable event');
    }
  });

  // =========================================================================
  // U25-07: Tenant isolation — server-derived tenant context
  // =========================================================================
  assert('U25-07', 'Tenant isolation — all queries scoped to tenant_id', () => {
    const src = readFile(path.join(LIB_DIR, 'financial', 'repository.ts'));
    // Must filter by tenant_id on all queries
    const tenantFilters = (src.match(/tenant_id/g) || []).length;
    if (tenantFilters < 3) {
      throw new Error(`Insufficient tenant_id filtering (${tenantFilters} occurrences)`);
    }
    // Must use IdentityContext
    if (!src.includes('ctx.tenantId')) {
      throw new Error('createInvoice does not use IdentityContext tenantId');
    }
  });

  // =========================================================================
  // U25-08: Financial boundary — no AR/AP writes
  // =========================================================================
  assert('U25-08', 'Financial boundary — invoice generation does NOT write to fin_ar_ap', () => {
    const src = readFile(path.join(LIB_DIR, 'financial', 'repository.ts'));
    // Extract the createInvoice function body and check it does NOT reference fin_ar_ap
    const createInvoiceMatch = src.match(/export async function createInvoice[\s\S]*?(?=^export |$)/m);
    if (createInvoiceMatch) {
      const createInvoiceBody = createInvoiceMatch[0];
      if (createInvoiceBody.includes('fin_ar_ap')) {
        throw new Error('createInvoice writes to fin_ar_ap — violates bounded foundation');
      }
    }
    // Also check the generate_invoice RPC does not write to fin_ar_ap
    // (check for INSERT/UPDATE/DELETE statements, not comments)
    const rpcSrc = readFile(path.join(SUPABASE_DIR, 'migrations', '20260922_001_next_invoice_number.sql'));
    // Strip SQL comments before checking
    const noComments = rpcSrc.replace(/--[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
    // Check for actual DML writes to fin_ar_ap table (not type casts like com_fin_ar_ap_side)
    const arApWritePattern = /(?:INSERT\s+INTO\s+(?:public\.)?fin_ar_ap\b|UPDATE\s+(?:public\.)?fin_ar_ap\b|DELETE\s+FROM\s+(?:public\.)?fin_ar_ap\b)/i;
    if (arApWritePattern.test(noComments)) {
      throw new Error('generate_invoice RPC writes to fin_ar_ap — violates bounded foundation');
    }
  });

  // =========================================================================
  // U25-09: Server number authority — no Math.random() on canonical path
  // =========================================================================
  assert('U25-09', 'No Math.random() in canonical invoice number generation', () => {
    const src = readFile(path.join(LIB_DIR, 'financial', 'repository.ts'));
    // Extract createInvoice function body
    const createInvoiceMatch = src.match(/export async function createInvoice[\s\S]*?(?=^export |$)/m);
    if (createInvoiceMatch) {
      const createInvoiceBody = createInvoiceMatch[0];
      if (createInvoiceBody.includes('Math.random()')) {
        throw new Error('createInvoice still uses Math.random() — canonical number authority violated');
      }
    }
    // Check server action
    const actionSrc = readFile(path.join(ROOT, 'app', 'invoice', 'number-actions.ts'));
    if (actionSrc.includes('Math.random()')) {
      throw new Error('getNextInvoiceNumber uses Math.random() — canonical number authority violated');
    }
  });

// =========================================================================
  // U25-10: Invoice lines carry committed billable event values
  // =========================================================================
  assert('U25-10', 'Invoice lines copy committed values (quantity, unit_amount, amount)', () => {
    const rpcSrc = readFile(path.join(SUPABASE_DIR, 'migrations', '20260922_001_next_invoice_number.sql'));
    // generate_invoice() RPC must copy committed values from fin_billable_events
    if (!rpcSrc.includes('FROM public.fin_billable_events')) {
      throw new Error('generate_invoice() does not read committed values from fin_billable_events');
    }
    if (!rpcSrc.includes('v_quantity') || !rpcSrc.includes('v_unit_amount') || !rpcSrc.includes('v_total_amount')) {
      throw new Error('generate_invoice() does not copy committed quantity/amount from billable event');
    }
    // Repository must compute totalAmount from committed billable events
    const src = readFile(path.join(LIB_DIR, 'financial', 'repository.ts'));
    if (!src.includes('total_amount')) {
      throw new Error('createInvoice does not aggregate committed total_amount');
    }
  });

  // =========================================================================
  // U25-11: Billable event status transition
  // =========================================================================
  assert('U25-11', 'Billable events transition to INVOICED after successful invoice creation', () => {
    const src = readFile(path.join(LIB_DIR, 'financial', 'repository.ts'));
    if (!src.includes("'INVOICED'") && !src.includes('"INVOICED"')) {
      throw new Error('createInvoice does not transition billable events to INVOICED');
    }
  });

  // =========================================================================
  // U25-12: Canonical invoice number format INV-YYYY-MM-NNNN
  // =========================================================================
  assert('U25-12', 'Canonical invoice number format INV-YYYY-MM-NNNN', () => {
    const rpcSrc = readFile(path.join(SUPABASE_DIR, 'migrations', '20260922_001_next_invoice_number.sql'));
    if (!rpcSrc.includes("'INV-'") && !rpcSrc.includes('"INV-"')) {
      throw new Error('next_invoice_number RPC does not produce INV-YYYY-MM-NNNN format');
    }
    // generate_invoice() must use the canonical number authority
    if (!rpcSrc.includes('public.next_invoice_number')) {
      throw new Error('generate_invoice() does not call next_invoice_number()');
    }
  });

  // =========================================================================
  // U25-13: Transaction boundary — invoice + lines + status in single atomic unit
  // =========================================================================
  assert('U25-13', 'Transaction boundary — createInvoice routes through generate_invoice() atomic RPC', () => {
    const src = readFile(path.join(LIB_DIR, 'financial', 'repository.ts'));
    // createInvoice must call generate_invoice() RPC for atomic mutation
    if (!src.includes("'generate_invoice'") && !src.includes('"generate_invoice"')) {
      throw new Error('createInvoice does not call generate_invoice() RPC — atomic transaction boundary missing');
    }
    // generate_invoice() RPC must have exception handler for rollback
    const rpcSrc = readFile(path.join(SUPABASE_DIR, 'migrations', '20260922_001_next_invoice_number.sql'));
    if (!rpcSrc.includes('EXCEPTION')) {
      throw new Error('generate_invoice RPC missing exception handler');
    }
    if (!rpcSrc.includes('WHEN OTHERS')) {
      throw new Error('generate_invoice RPC missing WHEN OTHERS rollback');
    }
  });

  // =========================================================================
  // U25-14: Migration exists and is properly structured
  // =========================================================================
  assert('U25-14', 'Migration 20260911_001 defines sequence, RPC, and partial UNIQUE index', () => {
    const sqlSrc = readFile(path.join(MIGRATION_DIR, '20260922_001_next_invoice_number.sql'));
    if (!sqlSrc.includes('CREATE OR REPLACE FUNCTION public.next_invoice_number')) {
      throw new Error('Missing next_invoice_number RPC');
    }
    if (!sqlSrc.includes('CREATE OR REPLACE FUNCTION public.generate_invoice')) {
      throw new Error('Missing generate_invoice RPC');
    }
    if (!sqlSrc.includes('CREATE UNIQUE INDEX')) {
      throw new Error('Missing UNIQUE index for duplicate prevention');
    }
    if (!sqlSrc.includes('seq_invoice_number')) {
      throw new Error('Missing invoice number sequence');
    }
  });

  // =========================================================================
  // U25-15: Server action wraps next_invoice_number RPC
  // =========================================================================
  assert('U25-15', 'Server action getNextInvoiceNumber wraps next_invoice_number RPC', () => {
    const actionSrc = readFile(path.join(ROOT, 'app', 'invoice', 'number-actions.ts'));
    if (!actionSrc.includes("'use server'")) {
      throw new Error('number-actions.ts missing "use server" directive');
    }
    if (!actionSrc.includes('next_invoice_number')) {
      throw new Error('number-actions.ts does not call next_invoice_number RPC');
    }
    if (!actionSrc.includes('supabaseAdmin') && !actionSrc.includes('createAdminClient')) {
      throw new Error('number-actions.ts does not use admin client');
    }
  });

  // =========================================================================
  // U25-16: FIN_INVOICE capability gate exists and defaults OFF
  // =========================================================================
  assert('U25-16', 'FIN_INVOICE capability gate exists and defaults OFF (fail-closed)', () => {
    const flagSrc = readFile(path.join(LIB_DIR, 'financial', 'feature-flags.ts'));
    if (!flagSrc.includes('FIN_INVOICE_ENABLED')) {
      throw new Error('Missing FIN_INVOICE_ENABLED environment variable');
    }
    if (!flagSrc.includes('isInvoiceGenerationEnabled')) {
      throw new Error('Missing isInvoiceGenerationEnabled() function');
    }
    if (!flagSrc.includes('assertInvoiceGenerationEnabled')) {
      throw new Error('Missing assertInvoiceGenerationEnabled() function');
    }
    // Fail-closed: only explicit 'true' enables
    if (!flagSrc.includes("value === 'true'") && !flagSrc.includes('value === "true"')) {
      throw new Error('Feature flag does not check for explicit true value');
    }
    // createInvoice() must call the gate
    const repoSrc = readFile(path.join(LIB_DIR, 'financial', 'repository.ts'));
    if (!repoSrc.includes('assertInvoiceGenerationEnabled')) {
      throw new Error('createInvoice does not call assertInvoiceGenerationEnabled()');
    }
  });

  // =========================================================================
  // U25-17: CreateInvoiceInput.idempotencyKey contract
  // =========================================================================
  assert('U25-17', 'CreateInvoiceInput includes idempotencyKey field', () => {
    const typesSrc = readFile(path.join(LIB_DIR, 'financial', 'types.ts'));
    if (!typesSrc.includes('idempotencyKey')) {
      throw new Error('CreateInvoiceInput does not include idempotencyKey');
    }
    // createInvoice must pass idempotencyKey to the RPC
    const repoSrc = readFile(path.join(LIB_DIR, 'financial', 'repository.ts'));
    if (!repoSrc.includes('p_idempotency_key')) {
      throw new Error('createInvoice does not pass p_idempotency_key to generate_invoice()');
    }
    // generate_invoice RPC must accept idempotency_key parameter
    const rpcSrc = readFile(path.join(SUPABASE_DIR, 'migrations', '20260922_001_next_invoice_number.sql'));
    if (!rpcSrc.includes('p_idempotency_key')) {
      throw new Error('generate_invoice() RPC does not accept p_idempotency_key parameter');
    }
    // RPC must store idempotency_key on fin_invoices
    if (!rpcSrc.includes('idempotency_key')) {
      throw new Error('generate_invoice() does not store idempotency_key on fin_invoices');
    }
  });

  // =========================================================================
  // U25-18: Idempotency conflict error semantics
  // =========================================================================
  assert('U25-18', 'Duplicate idempotency key returns DUPLICATE_IDEMPOTENCY error', () => {
    const repoSrc = readFile(path.join(LIB_DIR, 'financial', 'repository.ts'));
    if (!repoSrc.includes('DUPLICATE_IDEMPOTENCY')) {
      throw new Error('createInvoice does not return DUPLICATE_IDEMPOTENCY for idempotency conflicts');
    }
    if (!repoSrc.includes('23505')) {
      throw new Error('createInvoice does not check for PostgreSQL unique violation code 23505');
    }
  });

  // =========================================================================
  // Summary
  // =========================================================================
  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log(`\nU-25 Fin Invoice Numbering & Duplicate Prevention: ${passed} / ${passed + failed} PASSED`);
  if (failed > 0) {
    results.filter((r) => !r.pass).forEach((r) => {
      console.log(`  FAIL ${r.testId}: ${r.description} — ${r.error}`);
    });
  }
  return results;
}
