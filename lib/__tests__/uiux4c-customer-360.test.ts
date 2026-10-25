/**
 * Sentralogis — UI/UX-4C Remediation: Test Coverage
 * File: lib/__tests__/uiux4c-customer-360.test.ts
 *
 * Test coverage for the Customer 360 page:
 * - Page exists and fetches from canonical API (/api/v1/commercial/work-orders)
 * - Uses useAuth for tenant context
 * - No database writes (INSERT/UPDATE/DELETE/UPSERT) — read-only
 * - Customer grouping is client-side over canonical data
 * - Loading / empty / error states are handled
 * - Status filter is present and functional
 * - No fake/static/mock data
 * - Navigation contract maps to customers section
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());

function readFile(p: string): string {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

export function runUiux4cCustomer360Suite() {
  const results: Array<{ testId: string; description: string; pass: boolean; error?: string }> = [];

  function assert(testId: string, description: string, fn: () => void) {
    try {
      fn();
      results.push({ testId, description, pass: true });
    } catch (e: any) {
      results.push({ testId, description, pass: false, error: e.message || String(e) });
    }
  }

  const pagePath = path.join(ROOT, 'app', '(dashboard)', 'hq', 'customers', 'page.tsx');

  // =========================================================================
  // C1: Page existence and structure
  // =========================================================================
  assert('C1-01', 'Customer 360 page exists', () => {
    if (!fs.existsSync(pagePath)) throw new Error('Customer 360 page not found');
    const src = readFile(pagePath);
    if (!src.includes('export default function Customer360Page')) {
      throw new Error('Customer360Page is not the default export');
    }
  });

  assert('C1-02', 'Page uses use client directive', () => {
    const src = readFile(pagePath);
    if (!src.includes("'use client'")) {
      throw new Error('Missing "use client" directive for client component');
    }
  });

  // =========================================================================
  // C2: Canonical data source
  // =========================================================================
  assert('C2-01', 'Page fetches from canonical work-orders API', () => {
    const src = readFile(pagePath);
    if (!src.includes('/api/v1/commercial/work-orders')) {
      throw new Error('Does not fetch from canonical /api/v1/commercial/work-orders endpoint');
    }
  });

  assert('C2-02', 'Page uses useAuth for tenant context', () => {
    const src = readFile(pagePath);
    if (!src.includes('useAuth')) {
      throw new Error('Does not import/use useAuth for tenant identity');
    }
    if (!src.includes('profile')) {
      throw new Error('Does not access profile from useAuth');
    }
  });

  assert('C2-03', 'Work orders fetch uses GET method only', () => {
    const src = readFile(pagePath);
    const fetchLines = src.split('\n').filter(l => l.includes('fetch(') && l.includes('/api/v1/commercial/work-orders'));
    for (const line of fetchLines) {
      if (line.includes('method:') && !line.includes('GET')) {
        throw new Error('Non-GET fetch method for work-orders API');
      }
    }
  });

  // =========================================================================
  // C3: Read-only / no writes
  // =========================================================================
  assert('C3-01', 'Page has no database write operations', () => {
    const src = readFile(pagePath);
    const mutationPatterns = ['.insert(', '.update(', '.delete(', '.upsert('];
    for (const p of mutationPatterns) {
      if (src.includes(p)) {
        throw new Error(`Found DB mutation pattern '${p}' in Customer 360 page`);
      }
    }
  });

  assert('C3-02', 'Page has no supabaseAdmin write operations', () => {
    const src = readFile(pagePath);
    if (src.includes('supabaseAdmin.insert') || src.includes('supabaseAdmin.update') || src.includes('supabaseAdmin.delete')) {
      throw new Error('Found supabaseAdmin mutation in Customer 360 page');
    }
  });

  assert('C3-03', 'Page has no POST/PUT/PATCH/DELETE fetch methods', () => {
    const src = readFile(pagePath);
    const lines = src.split('\n');
    for (const line of lines) {
      if (line.includes('method:')) {
        const match = line.match(/method:\s*['"](\w+)['"]/);
        if (match && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(match[1])) {
          throw new Error(`Found write HTTP method in fetch: ${match[1]}`);
        }
      }
    }
  });

  // =========================================================================
  // C4: Customer grouping
  // =========================================================================
  assert('C4-01', 'Page groups customers by customerId', () => {
    const src = readFile(pagePath);
    if (!src.includes('customerId')) {
      throw new Error('No customerId grouping logic found');
    }
    if (!src.includes('uniqueCustomers')) {
      throw new Error('No uniqueCustomers grouping variable found');
    }
  });

  assert('C4-02', 'Customer display name resolves from entity data', () => {
    const src = readFile(pagePath);
    if (!src.includes('legal_name')) {
      throw new Error('Does not resolve customer name from legal_name field');
    }
    if (!src.includes('name')) {
      throw new Error('Does not fall back to name field');
    }
  });

  assert('C4-03', 'Customer stats computed from grouped data', () => {
    const src = readFile(pagePath);
    if (!src.includes('customerStats')) {
      throw new Error('No customerStats computation');
    }
  });

  // =========================================================================
  // C5: Loading / empty / error states
  // =========================================================================
  assert('C5-01', 'Page handles loading state', () => {
    const src = readFile(pagePath);
    if (!src.includes('loading')) {
      throw new Error('No loading state handling');
    }
    if (!src.includes('setLoading(true)')) {
      throw new Error('Loading state not set to true');
    }
  });

  assert('C5-02', 'Page handles error state', () => {
    const src = readFile(pagePath);
    if (!src.includes('error')) {
      throw new Error('No error state handling');
    }
  });

  assert('C5-03', 'Page handles empty state for no customers', () => {
    const src = readFile(pagePath);
    if (!src.includes('No customers or engagements found')) {
      throw new Error('No empty state message for no customers');
    }
  });

  // =========================================================================
  // C6: Filtering
  // =========================================================================
  assert('C6-01', 'Page implements search filter', () => {
    const src = readFile(pagePath);
    if (!src.includes('searchQuery')) {
      throw new Error('No searchQuery state variable');
    }
  });

  assert('C6-02', 'Page implements status filter with canonical options', () => {
    const src = readFile(pagePath);
    if (!src.includes('statusFilter')) {
      throw new Error('No statusFilter state variable');
    }
    const expectedFilters = ['ALL', 'OPEN', 'IN_FULFILLMENT', 'COMPLETED', 'CANCELLED'];
    for (const f of expectedFilters) {
      if (!src.includes(`value="${f}"`) && !src.includes(`value: '${f}'`)) {
        if (!src.includes(`'${f}'`)) {
          throw new Error(`Status filter option '${f}' not found`);
        }
      }
    }
  });

  // =========================================================================
  // C7: No fake / static data
  // =========================================================================
  assert('C7-01', 'Page has no mock/fake/dummy data', () => {
    const src = readFile(pagePath);
    const lower = src.toLowerCase();
    if (lower.includes('mock') || lower.includes('fakedata') || lower.includes('dummy')) {
      throw new Error('Found mock/fake/dummy data in Customer 360 page');
    }
  });

  assert('C7-02', 'Page renders at least 4 KPI cards (Customers, Engagements, Active, Closed)', () => {
    const src = readFile(pagePath);
    const kpis = ['Customers', 'Engagements', 'Active', 'Closed'];
    for (const k of kpis) {
      if (!src.includes(k)) {
        throw new Error(`KPI label '${k}' not found in Customer 360 page`);
      }
    }
  });

  // =========================================================================
  // C8: Navigation contract
  // =========================================================================
  assert('C8-01', 'Customer 360 route maps to customers navigation section', () => {
    const navSrc = readFile(path.join(ROOT, 'lib', 'navigation', 'types.tsx'));
    if (!navSrc.includes('customers')) {
      throw new Error('Navigation types do not include customers section');
    }
    if (!navSrc.includes('hq/customers') && !navSrc.includes('hq\\/customers')) {
      throw new Error('Navigation types do not map /hq/customers route');
    }
  });

  assert('C8-02', 'Page handles refresh action', () => {
    const src = readFile(pagePath);
    if (!src.includes('handleRefresh')) {
      throw new Error('No refresh handler found');
    }
  });

  return results;
}
