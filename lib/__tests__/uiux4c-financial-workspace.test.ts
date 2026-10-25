/**
 * Sentralogis — UI/UX-4C Remediation: Test Coverage
 * File: lib/__tests__/uiux4c-financial-workspace.test.ts
 *
 * Test coverage for the Financial Workspace:
 * - Page exists and is read-only (no financial mutations)
 * - No createInvoice/generate_invoice/next_invoice_number references
 * - No FIN_INVOICE activation
 * - No payment/settlement/accounting mutation calls
 * - No INSERT/UPDATE/DELETE/UPSERT database writes
 * - Fetches only via canonical APIs (work-orders, sales-orders, control-tower)
 * - No client-side business number generation (no Math.random, no uuid for business numbers)
 * - KPI semantic integrity: "Invoiced" and "Paid" are heuristic approximations, NOT from actual invoice/payment tables
 * - KPI labels must accurately reflect data source semantics
 * - No fake/static/mock data
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());

function readFile(p: string): string {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

export function runUiux4cFinancialWorkspaceSuite() {
  const results: Array<{ testId: string; description: string; pass: boolean; error?: string }> = [];

  function assert(testId: string, description: string, fn: () => void) {
    try {
      fn();
      results.push({ testId, description, pass: true });
    } catch (e: any) {
      results.push({ testId, description, pass: false, error: e.message || String(e) });
    }
  }

  const pagePath = path.join(ROOT, 'app', '(dashboard)', 'financial', 'invoices', 'page.tsx');
  const featureFlagPath = path.join(ROOT, 'lib', 'financial', 'feature-flags.ts');

  // =========================================================================
  // F1: Page existence and read-only contract
  // =========================================================================
  assert('F1-01', 'Financial Workspace page exists', () => {
    if (!fs.existsSync(pagePath)) throw new Error('Financial Workspace page not found');
    const src = readFile(pagePath);
    if (!src.includes('export default function FinancialWorkspacePage')) {
      throw new Error('FinancialWorkspacePage is not the default export');
    }
  });

  assert('F1-02', 'Financial Workspace does not reference createInvoice', () => {
    const src = readFile(pagePath);
    if (src.includes('createInvoice')) {
      throw new Error('Page references createInvoice — must be read-only');
    }
  });

  assert('F1-03', 'Financial Workspace does not reference generate_invoice RPC', () => {
    const src = readFile(pagePath);
    if (src.includes('generate_invoice') || src.includes('generateInvoice')) {
      throw new Error('Page references generate_invoice RPC — must be read-only');
    }
  });

  assert('F1-04', 'Financial Workspace does not reference next_invoice_number', () => {
    const src = readFile(pagePath);
    if (src.includes('next_invoice_number') || src.includes('getNextInvoiceNumber')) {
      throw new Error('Page references invoice number generation — must be read-only');
    }
  });

  assert('F1-05', 'Financial Workspace does not import FIN_INVOICE feature flags', () => {
    const src = readFile(pagePath);
    if (src.includes('feature-flags') || src.includes('FIN_INVOICE_ENABLED')) {
      throw new Error('Page imports or references FIN_INVOICE feature flags');
    }
  });

  assert('F1-06', 'Financial Workspace does not import payment mutation APIs', () => {
    const src = readFile(pagePath);
    const forbidden = ['createPayment', 'recordPayment', 'processPayment', 'recordSettlement', 'createSettlement'];
    for (const f of forbidden) {
      if (src.includes(f)) {
        throw new Error(`Page references payment/settlement mutation: ${f}`);
      }
    }
  });

  assert('F1-07', 'Financial Workspace does not import accounting mutation APIs', () => {
    const src = readFile(pagePath);
    const forbidden = ['createJournalEntry', 'postToLedger', 'createLedgerEntry', 'GLAccount', 'chartOfAccounts'];
    for (const f of forbidden) {
      if (src.includes(f)) {
        throw new Error(`Page references accounting mutation: ${f}`);
      }
    }
  });

  // =========================================================================
  // F2: No database writes
  // =========================================================================
  assert('F2-01', 'Financial Workspace page has no DB mutation patterns', () => {
    const src = readFile(pagePath);
    const mutationPatterns = ['.insert(', '.update(', '.delete(', '.upsert('];
    for (const p of mutationPatterns) {
      if (src.includes(p)) {
        throw new Error(`Found DB mutation pattern '${p}' in Financial Workspace`);
      }
    }
  });

  assert('F2-02', 'Financial Workspace page has no supabaseAdmin calls', () => {
    const src = readFile(pagePath);
    if (src.includes('supabaseAdmin')) {
      throw new Error('Page uses supabaseAdmin — must not write to database directly');
    }
  });

  assert('F2-03', 'Financial Workspace page only uses GET fetch methods', () => {
    const src = readFile(pagePath);
    const lines = src.split('\n');
    for (const line of lines) {
      if (line.includes('method:')) {
        const match = line.match(/method:\s*['"](\w+)['"]/);
        if (match && match[1] !== 'GET') {
          throw new Error(`Non-GET fetch method in Financial Workspace: ${match[1]}`);
        }
      }
    }
  });

  // =========================================================================
  // F3: Canonical API data sources
  // =========================================================================
  assert('F3-01', 'Financial Workspace fetches from canonical work-orders API', () => {
    const src = readFile(pagePath);
    if (!src.includes('/api/v1/commercial/work-orders')) {
      throw new Error('Does not fetch from canonical work-orders API');
    }
  });

  assert('F3-02', 'Financial Workspace fetches from canonical sales-orders API', () => {
    const src = readFile(pagePath);
    if (!src.includes('/api/v1/commercial/sales-orders')) {
      throw new Error('Does not fetch from canonical sales-orders API');
    }
  });

  assert('F3-03', 'Financial Workspace fetches from canonical control-tower API', () => {
    const src = readFile(pagePath);
    if (!src.includes('/api/v1/commercial/control-tower')) {
      throw new Error('Does not fetch from canonical control-tower API');
    }
  });

  assert('F3-04', 'Financial Workspace reads totalAgreedRevenue from Sales Order', () => {
    const src = readFile(pagePath);
    if (!src.includes('totalAgreedRevenue')) {
      throw new Error('Does not read totalAgreedRevenue from Sales Order data');
    }
  });

  assert('F3-05', 'Financial Workspace reads committedRevenue from Progress', () => {
    const src = readFile(pagePath);
    if (!src.includes('committedRevenue')) {
      throw new Error('Does not read committedRevenue from progress/composition data');
    }
  });

  assert('F3-06', 'Financial Workspace reads completionPercentage from Control Tower', () => {
    const src = readFile(pagePath);
    if (!src.includes('completionPercentage')) {
      throw new Error('Does not read completionPercentage from Control Tower progress');
    }
  });

  // =========================================================================
  // F4: No client-side business number generation
  // =========================================================================
  assert('F4-01', 'Financial Workspace has no Math.random business number generation', () => {
    const src = readFile(pagePath);
    if (src.includes('Math.random')) {
      throw new Error('Page uses Math.random — no client-side business number generation allowed');
    }
  });

  assert('F4-02', 'Financial Workspace has no uuid business number generation', () => {
    const src = readFile(pagePath);
    if (src.includes('uuidv4') || src.includes('uuidv7') || src.includes('uuidv1')) {
      throw new Error('Page generates UUIDs — no client-side business number generation allowed');
    }
  });

  // =========================================================================
  // F5: KPI semantic integrity
  // =========================================================================
  assert('F5-01', 'Financial Workspace "Invoiced" KPI is labeled as heuristic, not authoritative', () => {
    const src = readFile(pagePath);
    if (!src.includes('In Progress')) {
      throw new Error('"Invoiced" KPI label should be "In Progress" or similar heuristic label');
    }
  });

  assert('F5-02', 'Financial Workspace does not label "Invoiced" as authoritative (no invoice table source)', () => {
    const src = readFile(pagePath);
    if (src.includes('"Invoiced"') || src.includes("'Invoiced'")) {
      throw new Error('KPI label "Invoiced" still present — must be renamed to reflect heuristic semantics');
    }
  });

  assert('F5-03', 'Financial Workspace "Paid" KPI is labeled as heuristic, not authoritative', () => {
    const src = readFile(pagePath);
    if (!src.includes('Completed')) {
      throw new Error('"Paid" KPI label should be "Completed" or similar heuristic label');
    }
  });

  assert('F5-04', 'Financial Workspace does not label "Paid" as authoritative (no payment table source)', () => {
    const src = readFile(pagePath);
    if (src.includes('Paid / Fulfilled') || src.includes('"Paid"')) {
      throw new Error('KPI label "Paid" still present — must be renamed to reflect heuristic semantics');
    }
  });

  assert('F5-05', 'Invoiced heuristic uses completionPercentage >= 50 threshold', () => {
    const src = readFile(pagePath);
    if (!src.includes('completionPercentage >= 50')) {
      throw new Error('Invoiced heuristic does not use completionPercentage >= 50 threshold');
    }
  });

  assert('F5-06', 'Paid heuristic uses FULFILLED/CLOSED control tower status', () => {
    const src = readFile(pagePath);
    if (!src.includes('FULFILLED') || !src.includes('CLOSED')) {
      throw new Error('Paid heuristic does not filter by FULFILLED/CLOSED status');
    }
  });

  assert('F5-07', 'Financial Workspace header states "Read-only financial overview"', () => {
    const src = readFile(pagePath);
    if (!src.includes('Read-only financial overview')) {
      throw new Error('Header does not communicate read-only nature');
    }
  });

  // =========================================================================
  // F6: No fake / static data
  // =========================================================================
  assert('F6-01', 'Financial Workspace has no mock/fake/dummy data', () => {
    const src = readFile(pagePath);
    const lower = src.toLowerCase();
    if (lower.includes('mock') || lower.includes('fakedata') || lower.includes('dummy')) {
      throw new Error('Found mock/fake/dummy data in Financial Workspace');
    }
  });

  assert('F6-02', 'Financial Workspace renders Total Revenue KPI', () => {
    const src = readFile(pagePath);
    if (!src.includes('Total Revenue')) {
      throw new Error('Total Revenue KPI not found');
    }
  });

  assert('F6-03', 'Financial Workspace renders Outstanding KPI', () => {
    const src = readFile(pagePath);
    if (!src.includes('Outstanding')) {
      throw new Error('Outstanding KPI not found');
    }
  });

  assert('F6-04', 'Financial Workspace renders Pending Orders KPI', () => {
    const src = readFile(pagePath);
    if (!src.includes('pendingOrders') && !src.includes('Pending')) {
      throw new Error('Pending Orders KPI not found');
    }
  });

  // =========================================================================
  // F7: Navigation contract
  // =========================================================================
  assert('F7-01', 'Financial Workspace route maps to finance navigation section', () => {
    const navSrc = readFile(path.join(ROOT, 'lib', 'navigation', 'types.tsx'));
    if (!navSrc.includes('finance')) {
      throw new Error('Navigation types do not include finance section');
    }
    if (!navSrc.includes('/financial/invoices')) {
      throw new Error('Navigation types do not map /financial/invoices route');
    }
  });

  return results;
}
