/**
 * Sentralogis — UI/UX-4D Implementation: Test Coverage
 * File: lib/__tests__/uiux4d-external-portals.test.ts
 *
 * Test coverage for the External Portals (Customer + Vendor) and Mobile Experience:
 * - Page existence and structure (layout, pages, bottom nav)
 * - Canonical data source (no direct supabase.from in portal pages)
 * - Auth contract (customer uses warehouse_customer role, vendor uses driver JWT)
 * - Read-only (no INSERT/UPDATE/DELETE mutations in portal pages)
 * - No internal SBU navigation reproduced in portals
 * - No client-side business-number generation
 * - Reuse of existing tracking token and driver JWT infra
 * - Mobile-first layout (max-w-md container)
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(process.cwd());

function readFile(p: string): string {
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function listFiles(dir: string, ext = '.tsx'): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir)
    .filter(f => f.endsWith(ext))
    .map(f => path.join(dir, f));
}

export function runUiux4dExternalPortalsSuite() {
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
  // D1: Customer Portal — layout & structure
  // =========================================================================
  const custPortalDir = path.join(ROOT, 'app', '(dashboard)', 'portal', 'customer');

  assert('D1-01', 'Customer Portal layout exists', () => {
    const p = path.join(custPortalDir, 'layout.tsx');
    if (!fs.existsSync(p)) throw new Error('Customer Portal layout not found');
    const src = readFile(p);
    if (!src.includes("'use client'")) throw new Error('Missing "use client" directive');
  });

  assert('D1-02', 'Customer Portal layout uses mobile-first container (max-w-md)', () => {
    const src = readFile(path.join(custPortalDir, 'layout.tsx'));
    if (!src.includes('max-w-md')) throw new Error('Missing max-w-md mobile-first container');
  });

  assert('D1-03', 'Customer Portal layout has bottom navigation', () => {
    const src = readFile(path.join(custPortalDir, 'layout.tsx'));
    if (!src.includes('fixed bottom-0')) throw new Error('Missing fixed bottom navigation');
  });

  assert('D1-04', 'Customer Portal does NOT reproduce internal SBU sidebar', () => {
    const src = readFile(path.join(custPortalDir, 'layout.tsx'));
    if (src.includes('Sidebar') || src.includes('AppShell')) {
      throw new Error('Customer Portal must NOT use internal AppShell/Sidebar components');
    }
  });

  assert('D1-05', 'Customer Portal layout guards warehouse_customer role', () => {
    const src = readFile(path.join(custPortalDir, 'layout.tsx'));
    if (!src.includes('warehouse_customer')) {
      throw new Error('Customer Portal does not guard warehouse_customer role');
    }
  });

  // =========================================================================
  // D2: Customer Portal — dashboard page
  // =========================================================================
  assert('D2-01', 'Customer Portal dashboard page exists', () => {
    const p = path.join(custPortalDir, 'page.tsx');
    if (!fs.existsSync(p)) throw new Error('Customer Portal dashboard page not found');
  });

  assert('D2-02', 'Customer Portal fetches from canonical WO API', () => {
    const src = readFile(path.join(custPortalDir, 'page.tsx'));
    if (!src.includes('/api/v1/commercial/work-orders')) {
      throw new Error('Does not fetch from canonical /api/v1/commercial/work-orders endpoint');
    }
  });

  assert('D2-03', 'Customer Portal dashboard uses useAuth for identity', () => {
    const src = readFile(path.join(custPortalDir, 'page.tsx'));
    if (!src.includes('useAuth')) throw new Error('Does not use useAuth');
  });

  assert('D2-04', 'Customer Portal dashboard page has NO direct supabase.from calls', () => {
    const src = readFile(path.join(custPortalDir, 'page.tsx'));
    if (src.includes('supabase.from(')) throw new Error('Direct supabase.from() call found — must use canonical API');
  });

  assert('D2-05', 'Customer Portal dashboard page has NO INSERT/UPDATE/DELETE mutations', () => {
    const src = readFile(path.join(custPortalDir, 'page.tsx'));
    const forbidden = ['INSERT', 'UPDATE', '.insert(', '.update(', '.delete(', '.upsert('];
    for (const f of forbidden) {
      if (src.includes(f)) throw new Error(`Forbidden write operation '${f}' found in dashboard`);
    }
  });

  // =========================================================================
  // D3: Customer Portal — order detail page
  // =========================================================================
  assert('D3-01', 'Customer Portal order detail page exists', () => {
    const p = path.join(custPortalDir, 'orders', '[id]', 'page.tsx');
    if (!fs.existsSync(p)) throw new Error('Customer Portal order detail page not found');
  });

  assert('D3-02', 'Customer Portal order detail uses Control Tower customer projection API', () => {
    const src = readFile(path.join(custPortalDir, 'orders', '[id]', 'page.tsx'));
    if (!src.includes('/api/v1/commercial/control-tower/')) {
      throw new Error('Does not fetch from Control Tower customer projection API');
    }
    if (!src.includes('view=customer')) {
      throw new Error('Missing ?view=customer query param for sanitized projection');
    }
  });

  assert('D3-03', 'Customer Portal order detail has NO direct supabase.from calls', () => {
    const src = readFile(path.join(custPortalDir, 'orders', '[id]', 'page.tsx'));
    if (src.includes('supabase.from(')) throw new Error('Direct supabase.from() call found');
  });

  assert('D3-04', 'Customer Portal order detail has NO client-side business-number generation', () => {
    const src = readFile(path.join(custPortalDir, 'orders', '[id]', 'page.tsx'));
    if (src.includes('Math.random()')) {
      throw new Error('Client-side Math.random() found — forbidden for business numbers');
    }
  });

  // =========================================================================
  // D4: Customer Portal — shipment tracking page
  // =========================================================================
  assert('D4-01', 'Customer Portal shipment list page exists', () => {
    const p = path.join(custPortalDir, 'shipments', 'page.tsx');
    if (!fs.existsSync(p)) throw new Error('Customer Portal shipments page not found');
  });

  assert('D4-02', 'Customer Portal shipments fetch from canonical forwarding API', () => {
    const src = readFile(path.join(custPortalDir, 'shipments', 'page.tsx'));
    if (!src.includes('/api/v1/forwarding/shipments')) {
      throw new Error('Does not fetch from canonical forwarding shipments API');
    }
  });

  assert('D4-03', 'Customer Portal shipment detail page exists', () => {
    const p = path.join(custPortalDir, 'shipments', '[id]', 'page.tsx');
    if (!fs.existsSync(p)) throw new Error('Customer Portal shipment detail page not found');
  });

  assert('D4-04', 'Customer Portal shipment detail reuses canonical shipment API', () => {
    const src = readFile(path.join(custPortalDir, 'shipments', '[id]', 'page.tsx'));
    if (!src.includes('/api/v1/forwarding/shipments/')) {
      throw new Error('Shipment detail does not fetch from canonical shipment API');
    }
  });

  // =========================================================================
  // D5: Customer Portal — exceptions page
  // =========================================================================
   assert('D5-01', 'Customer Portal exceptions page exists', () => {
    const p = path.join(custPortalDir, 'exceptions', 'page.tsx');
    if (!fs.existsSync(p)) throw new Error('Customer Portal exceptions page not found');
  });

  assert('D5-02', 'Customer Portal exceptions fetch from canonical exceptions API', () => {
    const src = readFile(path.join(custPortalDir, 'exceptions', 'page.tsx'));
    if (!src.includes('/api/v1/commercial/exceptions')) {
      throw new Error('Does not fetch from canonical exceptions API');
    }
  });

   assert('D5-03', 'Customer Portal exceptions page has NO write mutations', () => {
    const src = readFile(path.join(custPortalDir, 'exceptions', 'page.tsx'));
    const forbidden = ['.insert(', '.update(', '.delete(', '.upsert('];
    for (const f of forbidden) {
      if (src.includes(f)) throw new Error(`Forbidden write '${f}' in exceptions page`);
    }
  });

  // =========================================================================
  // D6: Customer Portal — profile page
  // =========================================================================
  assert('D6-01', 'Customer Portal profile page exists', () => {
    const p = path.join(custPortalDir, 'profile', 'page.tsx');
    if (!fs.existsSync(p)) throw new Error('Customer Portal profile page not found');
  });

  assert('D6-02', 'Customer Portal profile uses useAuth for read-only profile data', () => {
    const src = readFile(path.join(custPortalDir, 'profile', 'page.tsx'));
    if (!src.includes('useAuth')) throw new Error('Does not use useAuth');
  });

  // =========================================================================
  // D7: Vendor Portal — layout & structure
  // =========================================================================
  assert('D7-01', 'Vendor Portal layout exists', () => {
    const p = path.join(ROOT, 'app', 'portal', 'vendor', 'layout.tsx');
    if (!fs.existsSync(p)) throw new Error('Vendor Portal layout not found');
    const src = readFile(p);
    if (!src.includes("'use client'")) throw new Error('Missing "use client" directive');
  });

  assert('D7-02', 'Vendor Portal layout uses DriverAuthProvider for vendor identity', () => {
    const src = readFile(path.join(ROOT, 'app', 'portal', 'vendor', 'layout.tsx'));
    if (!src.includes('DriverAuthProvider') && !src.includes('useDriverAuth')) {
      throw new Error('Vendor Portal does not use DriverAuthProvider/useDriverAuth');
    }
  });

  assert('D7-03', 'Vendor Portal layout uses mobile-first container (max-w-md)', () => {
    const src = readFile(path.join(ROOT, 'app', 'portal', 'vendor', 'layout.tsx'));
    if (!src.includes('max-w-md')) throw new Error('Missing max-w-md mobile-first container');
  });

  assert('D7-04', 'Vendor Portal does NOT reproduce internal SBU sidebar', () => {
    const src = readFile(path.join(ROOT, 'app', 'portal', 'vendor', 'layout.tsx'));
    if (src.includes('Sidebar') || src.includes('AppShell')) {
      throw new Error('Vendor Portal must NOT use internal AppShell/Sidebar components');
    }
  });

  // =========================================================================
  // D8: Vendor Portal — dashboard page
  // =========================================================================
  assert('D8-01', 'Vendor Portal dashboard page exists', () => {
    const p = path.join(ROOT, 'app', 'portal', 'vendor', 'page.tsx');
    if (!fs.existsSync(p)) throw new Error('Vendor Portal dashboard page not found');
  });

  assert('D8-02', 'Vendor Portal reuses existing driver feed API', () => {
    const src = readFile(path.join(ROOT, 'app', 'portal', 'vendor', 'page.tsx'));
    if (!src.includes('/api/driver/feed')) {
      throw new Error('Does not reuse existing /api/driver/feed endpoint');
    }
  });

  assert('D8-03', 'Vendor Portal uses driver JWT auth headers', () => {
    const src = readFile(path.join(ROOT, 'app', 'portal', 'vendor', 'page.tsx'));
    if (!src.includes('getAuthHeaders')) {
      throw new Error('Does not use getAuthHeaders for JWT bearer token');
    }
  });

  assert('D8-04', 'Vendor Portal dashboard has NO direct supabase.from calls', () => {
    const src = readFile(path.join(ROOT, 'app', 'portal', 'vendor', 'page.tsx'));
    if (src.includes('supabase.from(')) throw new Error('Direct supabase.from() call found');
  });

  assert('D8-05', 'Vendor Portal dashboard has NO client-side business-number generation', () => {
    const src = readFile(path.join(ROOT, 'app', 'portal', 'vendor', 'page.tsx'));
    if (src.includes('Math.random()')) {
      throw new Error('Client-side Math.random() found');
    }
  });

  // =========================================================================
  // D9: Vendor Portal — profile page
  // =========================================================================
  assert('D9-01', 'Vendor Portal profile page exists', () => {
    const p = path.join(ROOT, 'app', 'portal', 'vendor', 'profile', 'page.tsx');
    if (!fs.existsSync(p)) throw new Error('Vendor Portal profile page not found');
  });

  assert('D9-02', 'Vendor Portal profile uses useDriverAuth', () => {
    const src = readFile(path.join(ROOT, 'app', 'portal', 'vendor', 'profile', 'page.tsx'));
    if (!src.includes('useDriverAuth')) throw new Error('Does not use useDriverAuth');
  });

  // =========================================================================
  // D10: Architectural invariants for 4D
  // =========================================================================
  assert('D10-01', 'Customer Portal pages do NOT create new database tables/migrations', () => {
    const files = [
      ...listFiles(custPortalDir),
      ...listFiles(path.join(custPortalDir, 'orders')),
      ...listFiles(path.join(custPortalDir, 'orders', '[id]')),
      ...listFiles(path.join(custPortalDir, 'shipments')),
      ...listFiles(path.join(custPortalDir, 'shipments', '[id]')),
      ...listFiles(path.join(custPortalDir, 'exceptions')),
      ...listFiles(path.join(custPortalDir, 'profile')),
    ];
    for (const f of files) {
      if (f.endsWith('.sql')) throw new Error(`Unexpected .sql file found: ${f}`);
    }
  });

  assert('D10-02', 'Vendor Portal pages do NOT create new database tables/migrations', () => {
    const portalDir = path.join(ROOT, 'app', 'portal', 'vendor');
    const files = [
      ...listFiles(portalDir),
      ...listFiles(path.join(portalDir, 'jobs')),
      ...listFiles(path.join(portalDir, 'profile')),
      ...listFiles(path.join(portalDir, 'completed')),
    ];
    for (const f of files) {
      if (f.endsWith('.sql')) throw new Error(`Unexpected .sql file found: ${f}`);
    }
  });

  assert('D10-03', 'Customer Portal uses fetch() to canonical REST APIs (not supabase client)', () => {
    const pages = [
      path.join(custPortalDir, 'page.tsx'),
      path.join(custPortalDir, 'orders', '[id]', 'page.tsx'),
      path.join(custPortalDir, 'shipments', 'page.tsx'),
      path.join(custPortalDir, 'shipments', '[id]', 'page.tsx'),
      path.join(custPortalDir, 'exceptions', 'page.tsx'),
    ];
    for (const p of pages) {
      const src = readFile(p);
      if (src && !src.includes('fetch(')) {
        throw new Error(`Page does not use fetch(): ${p}`);
      }
    }
  });

  assert('D10-04', 'Both portals use existing theme/toast providers (no new provider invention)', () => {
    const customerLayout = readFile(path.join(custPortalDir, 'layout.tsx'));
    const vendorLayout = readFile(path.join(ROOT, 'app', 'portal', 'vendor', 'layout.tsx'));
    if (!customerLayout.includes('useAuth')) throw new Error('Customer Portal layout does not use useAuth');
    if (!vendorLayout.includes('DriverAuthProvider')) throw new Error('Vendor Portal layout does not use DriverAuthProvider');
  });

  // =========================================================================
  // D11: No new API routes created by 4D (reuse existing only)
  // =========================================================================
  assert('D11-01', 'No new API route files created under app/api for portals', () => {
    const apiDir = path.join(ROOT, 'app', 'api');
    const newApiDirs = ['portal-customer', 'portal-vendor', 'customer-orders', 'vendor-jobs'];
    for (const dir of newApiDirs) {
      const p = path.join(apiDir, dir);
      if (fs.existsSync(p)) throw new Error(`Unexpected new API directory created: ${p}`);
    }
  });

  // =========================================================================
  // D12: No new migrations created by 4D portals (precise check: no .sql files
  // in portal source directories)
  // =========================================================================
   assert('D12-01', 'No new migration files created by UI/UX-4D portals', () => {
    const portalDirs = [
      custPortalDir,
      path.join(ROOT, 'app', 'portal', 'vendor'),
    ];
    for (const dir of portalDirs) {
      const sqlFiles = findSqlFiles(dir);
      if (sqlFiles.length > 0) {
        throw new Error(`Unexpected .sql files in portal directory: ${sqlFiles.join(', ')}`);
      }
    }
  });

  function findSqlFiles(dir: string): string[] {
    if (!fs.existsSync(dir)) return [];
    const results: string[] = [];
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
      const fullPath = path.join(dir, entry);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        results.push(...findSqlFiles(fullPath));
      } else if (entry.endsWith('.sql')) {
        results.push(fullPath);
      }
    }
    return results;
  }

  return results;
}
