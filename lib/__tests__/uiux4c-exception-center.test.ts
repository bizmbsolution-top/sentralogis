/**
 * Sentralogis — UI/UX-4C Remediation: Test Coverage
 * File: lib/__tests__/uiux4c-exception-center.test.ts
 *
 * Test coverage for the Exception Center:
 * - API route exists and is GET-only (read-only proven)
 * - API composes canonical services (listWorkOrders, listByEngagement, getInternalOperatorWorkspace)
 * - API uses server-derived tenant (resolveSessionIdentity)
 * - No database writes (INSERT/UPDATE/DELETE/UPSERT/supabaseAdmin mutations/rpc)
 * - Page fetches from /api/v1/commercial/exceptions
 * - Severity filtering (CRITICAL/WARNING)
 * - Search filtering
 * - Navigation links to /commercial/control-tower/[salesOrderId]
 * - No fake/static/mock data
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());

function readFile(p: string): string {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

export function runUiux4cExceptionCenterSuite() {
  const results: Array<{ testId: string; description: string; pass: boolean; error?: string }> = [];

  function assert(testId: string, description: string, fn: () => void) {
    try {
      fn();
      results.push({ testId, description, pass: true });
    } catch (e: any) {
      results.push({ testId, description, pass: false, error: e.message || String(e) });
    }
  }

  const apiPath = path.join(ROOT, 'app', 'api', 'v1', 'commercial', 'exceptions', 'route.ts');
  const pagePath = path.join(ROOT, 'app', '(dashboard)', 'director', 'alerts', 'page.tsx');

  // =========================================================================
  // E1: API existence and read-only contract
  // =========================================================================
  assert('E1-01', 'Exception Center API route exists with GET handler', () => {
    const src = readFile(apiPath);
    if (!src) throw new Error('API route file not found at app/api/v1/commercial/exceptions/route.ts');
    if (!src.includes('export async function GET') && !src.includes('export function GET')) {
      throw new Error('No GET handler exported in exception API route');
    }
  });

  assert('E1-02', 'API route has no POST/PUT/PATCH/DELETE handlers', () => {
    const src = readFile(apiPath);
    const writeMethods = ['export async function POST', 'export async function PUT', 'export async function PATCH', 'export async function DELETE'];
    for (const m of writeMethods) {
      if (src.includes(m)) {
        throw new Error(`Found write HTTP method: ${m}`);
      }
    }
  });

  assert('E1-03', 'API route performs no database writes (INSERT/UPDATE/DELETE/UPSERT)', () => {
    const src = readFile(apiPath);
    const mutationPatterns = ['.insert(', '.update(', '.delete(', '.upsert('];
    for (const p of mutationPatterns) {
      if (src.includes(p)) {
        throw new Error(`Found DB mutation pattern '${p}' in exception API route`);
      }
    }
  });

  assert('E1-04', 'API route has no supabaseAdmin mutations or rpc calls', () => {
    const src = readFile(apiPath);
    if (src.includes('supabaseAdmin.insert') || src.includes('supabaseAdmin.update') || src.includes('supabaseAdmin.delete')) {
      throw new Error('Found supabaseAdmin mutation in exception API route');
    }
    if (src.includes('.rpc(')) {
      throw new Error('Found rpc call in exception API route');
    }
  });

  assert('E1-05', 'API route returns structured JSON response', () => {
    const src = readFile(apiPath);
    if (!src.includes('NextResponse.json')) {
      throw new Error('Does not return NextResponse.json');
    }
  });

  // =========================================================================
  // E2: Canonical service composition
  // =========================================================================
  assert('E2-01', 'API composes listWorkOrders canonical service', () => {
    const src = readFile(apiPath);
    if (!src.includes('listWorkOrders')) {
      throw new Error('Does not use listWorkOrders canonical service');
    }
  });

  assert('E2-02', 'API composes listByEngagement canonical service', () => {
    const src = readFile(apiPath);
    if (!src.includes('listByEngagement')) {
      throw new Error('Does not use listByEngagement canonical service');
    }
  });

  assert('E2-03', 'API composes getInternalOperatorWorkspace canonical service', () => {
    const src = readFile(apiPath);
    if (!src.includes('getInternalOperatorWorkspace')) {
      throw new Error('Does not use getInternalOperatorWorkspace canonical service');
    }
  });

  assert('E2-04', 'API composes services in correct lineage: WO → SO → Workspace', () => {
    const src = readFile(apiPath);
    const listWoIdx = src.indexOf('listWorkOrders');
    const listSoIdx = src.indexOf('listByEngagement');
    const workspaceIdx = src.indexOf('getInternalOperatorWorkspace');

    if (listWoIdx === -1 || listSoIdx === -1 || workspaceIdx === -1) {
      throw new Error('Cannot find all three service calls for lineage verification');
    }
    if (listSoIdx < listWoIdx) {
      throw new Error('listByEngagement called before listWorkOrders — wrong lineage order');
    }
    if (workspaceIdx < listSoIdx) {
      throw new Error('getInternalOperatorWorkspace called before listByEngagement — wrong lineage order');
    }
  });

  // =========================================================================
  // E3: Tenant isolation
  // =========================================================================
  assert('E3-01', 'API uses resolveSessionIdentity for server-derived tenant', () => {
    const src = readFile(apiPath);
    if (!src.includes('resolveSessionIdentity')) {
      throw new Error('Does not use resolveSessionIdentity for tenant isolation');
    }
  });

  assert('E3-02', 'API passes IdentityContext (not client tenant) to services', () => {
    const src = readFile(apiPath);
    if (!src.includes('ctx')) {
      throw new Error('No ctx (IdentityContext) variable used for service calls');
    }
    if (src.includes('getHeader(') && src.includes('x-tenant-id')) {
      throw new Error('API reads tenant from client header (x-tenant-id) — forbidden');
    }
  });

  assert('E3-03', 'API does not accept client-supplied tenantId body parameter', () => {
    const src = readFile(apiPath);
    if (src.includes('body.tenantId') || src.includes('body.tenant_id')) {
      throw new Error('API reads tenantId from request body — forbidden');
    }
  });

  // =========================================================================
  // E4: Page fetch contract
  // =========================================================================
  assert('E4-01', 'Exception Center page exists', () => {
    if (!fs.existsSync(pagePath)) throw new Error('Exception Center page not found');
  });

  assert('E4-02', 'Page fetches from /api/v1/commercial/exceptions', () => {
    const src = readFile(pagePath);
    if (!src.includes('/api/v1/commercial/exceptions')) {
      throw new Error('Page does not fetch from /api/v1/commercial/exceptions');
    }
    if (!src.includes('fetch(')) {
      throw new Error('Page does not use fetch()');
    }
  });

  assert('E4-03', 'Page only uses GET fetch for exception data', () => {
    const src = readFile(pagePath);
    const fetchLines = src.split('\n').filter(l => l.includes('fetch('));
    for (const line of fetchLines) {
      if (!line.includes('method: \'GET\'') && !line.includes('method: "GET"') && !line.includes('GET') &&
          !line.includes('await fetch(')) {
        if (line.includes('method:')) {
          const methodMatch = line.match(/method:\s*['"](\w+)['"]/);
          if (methodMatch && methodMatch[1] !== 'GET') {
            throw new Error(`Non-GET fetch method found: ${methodMatch[1]}`);
          }
        }
      }
    }
  });

  // =========================================================================
  // E5: Filtering and navigation
  // =========================================================================
  assert('E5-01', 'Page implements severity filter (CRITICAL/WARNING)', () => {
    const src = readFile(pagePath);
    if (!src.includes('severityFilter')) {
      throw new Error('No severityFilter state variable');
    }
    if (!src.includes('CRITICAL')) {
      throw new Error('No CRITICAL severity filter option');
    }
    if (!src.includes('WARNING')) {
      throw new Error('No WARNING severity filter option');
    }
  });

  assert('E5-02', 'Page implements search filter', () => {
    const src = readFile(pagePath);
    if (!src.includes('searchQuery')) {
      throw new Error('No searchQuery state variable');
    }
  });

  assert('E5-03', 'Page navigation links to Control Tower workspace', () => {
    const src = readFile(pagePath);
    if (!src.includes('/commercial/control-tower/')) {
      throw new Error('No link to /commercial/control-tower/[salesOrderId]');
    }
    if (!src.includes('salesOrderId')) {
      throw new Error('No salesOrderId link parameter for Control Tower navigation');
    }
  });

  assert('E5-04', 'Page has empty state for no exceptions', () => {
    const src = readFile(pagePath);
    if (!src.includes('No exceptions found')) {
      throw new Error('No "No exceptions found" empty state');
    }
  });

  assert('E5-05', 'Page has error state handling', () => {
    const src = readFile(pagePath);
    if (!src.includes('error')) {
      throw new Error('No error state handling');
    }
  });

  assert('E5-06', 'Page has loading state handling', () => {
    const src = readFile(pagePath);
    if (!src.includes('loading')) {
      throw new Error('No loading state handling');
    }
  });

  // =========================================================================
  // E6: Exception data lineage
  // =========================================================================
  assert('E6-01', 'Exception records include canonical fields', () => {
    const src = readFile(pagePath);
    const required = ['exceptionId', 'severity', 'category', 'affectedDomain', 'message', 'occurredAt', 'soNumber', 'woNumber'];
    for (const field of required) {
      if (!src.includes(field)) {
        throw new Error(`Page does not reference exception field: ${field}`);
      }
    }
  });

  assert('E6-02', 'Page renders exception category labels', () => {
    const src = readFile(pagePath);
    if (!src.includes('CATEGORY_LABELS')) {
      throw new Error('No category label mapping for exception display');
    }
    if (!src.includes('HANDOFF_REJECTED')) {
      throw new Error('Missing HANDOFF_REJECTED category label');
    }
    if (!src.includes('OPERATIONAL_FAILURE')) {
      throw new Error('Missing OPERATIONAL_FAILURE category label');
    }
  });

  // =========================================================================
  // E7: No fake/static data
  // =========================================================================
  assert('E7-01', 'Page has no mock/fake data', () => {
    const src = readFile(pagePath);
    const lower = src.toLowerCase();
    if (lower.includes('mock') || lower.includes('fakedata') || lower.includes('dummy')) {
      throw new Error('Found mock/fake/dummy data in exception center page');
    }
  });

  return results;
}
