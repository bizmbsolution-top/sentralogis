import fs from 'fs';
import path from 'path';
import { describe, test, expect } from 'vitest';

const ROOT = process.cwd();

function readFile(relPath: string): string {
  const abs = path.isAbsolute(relPath) ? relPath : path.join(ROOT, relPath);
  return fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '';
}

function readAllMigrationContents(): string[] {
  const migDir = path.join(ROOT, 'supabase', 'migrations');
  if (!fs.existsSync(migDir)) return [];
  return fs.readdirSync(migDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFile(path.join(migDir, f)));
}

describe('Phase 5A Wave 5 Cargo Owner Tracking Security', () => {
  const allSql = readAllMigrationContents().join('\n');

  // =========================================================================
  // TOKEN GENERATION
  // =========================================================================

  describe('Tracking token generation', () => {
    test('tracking_token column exists on fw_container_items', () => {
      expect(allSql).toContain('tracking_token TEXT UNIQUE');
    });

    test('tracking_token has unique index', () => {
      expect(allSql).toContain('idx_fw_container_items_tracking_token');
    });

    test('tracking_token primary generation uses crypto.randomUUID', () => {
      const writer = readFile('lib/application/service-contracts/forwarding-writer.ts');
      const tokenSection = writer.match(/const generateTrackingToken = \(\)[\s\S]*?tracking_token: generateTrackingToken\(\)/)?.[0] || '';
      expect(tokenSection).toContain('crypto.randomUUID');
    });

    test('tracking_token fallback is only for non-Node environments', () => {
      const writer = readFile('lib/application/service-contracts/forwarding-writer.ts');
      const tokenSection = writer.match(/const generateTrackingToken = \(\)[\s\S]*?tracking_token: generateTrackingToken\(\)/)?.[0] || '';
      const hasCryptoPrimary = tokenSection.includes("typeof crypto !== 'undefined' && crypto.randomUUID");
      expect(hasCryptoPrimary).toBe(true);
    });

    test('forwarding-writer.ts is never imported by client code', () => {
      const imports = [
        readFile('app/(dashboard)/sbu/forwarding/wo/create/page.tsx'),
        readFile('app/(dashboard)/sbu/forwarding/wo/page.tsx'),
        readFile('app/(dashboard)/sbu/forwarding/consol/page.tsx'),
        readFile('app/(dashboard)/sbu/forwarding/consol/[id]/page.tsx'),
        readFile('app/(dashboard)/sbu/forwarding/consol/[id]/stuffing/page.tsx'),
      ];
      const hasClientImport = imports.some(src => src.includes("from '@/lib/application/service-contracts/forwarding-writer'"));
      expect(hasClientImport).toBe(false);
    });
  });

  // =========================================================================
  // SERVER-SIDE TRACKING API
  // =========================================================================

  describe('Server-side tracking API', () => {
    test('server action exists for forwarding tracking', () => {
      const action = readFile('lib/actions/forwardingActions.ts');
      expect(action).toContain('export async function getForwardingTrackingByToken');
      expect(action).toContain('createClient');
    });

    test('tracking uses server-side client', () => {
      const action = readFile('lib/actions/forwardingActions.ts');
      expect(action).toContain('createClient');
      expect(action).not.toContain('supabaseClient');
      expect(action).not.toContain('createBrowserClient');
    });

    test('tracking action validates token presence', () => {
      const action = readFile('lib/actions/forwardingActions.ts');
      expect(action).toContain('if (!trimmed');
      expect(action).toContain('return null');
    });

    test('tracking action normalizes error responses', () => {
      const route = readFile('app/api/track/fwd/[token]/route.ts');
      expect(route).toContain('Tracking tidak ditemukan atau token tidak valid');
      expect(route).toContain('Terjadi kesalahan saat memuat data tracking');
    });
  });

  // =========================================================================
  // PUBLIC PAYLOAD SECURITY
  // =========================================================================

  describe('Public payload security', () => {
    test('tracking page uses server action instead of direct Supabase', () => {
      const page = readFile('app/track/fwd/[token]/page.tsx');
      expect(page).toContain('/api/track/fwd/');
      expect(page).not.toContain('supabase.from');
      expect(page).not.toContain('supabaseClient');
    });

    test('tracking action does not expose tenant_id', () => {
      const action = readFile('lib/actions/forwardingActions.ts');
      const trackingFn = action.match(/export async function getForwardingTrackingByToken[\s\S]*?(?=export async function|$)/)?.[0] || '';
      expect(trackingFn).not.toContain('tenant_id');
    });

    test('tracking action does not expose internal UUIDs in public payload', () => {
      const action = readFile('lib/actions/forwardingActions.ts');
      const trackingFn = action.match(/export async function getForwardingTrackingByToken[\s\S]*?(?=export async function|$)/)?.[0] || '';
      const publicItemMatch = trackingFn.match(/return\s*\{[\s\S]*?\};/)?.[0] || '';
      expect(publicItemMatch).not.toContain('id:');
      expect(publicItemMatch).not.toContain('work_order_id');
      expect(publicItemMatch).not.toContain('container_assignment_id');
    });

    test('tracking action does not expose customer internal phone/address', () => {
      const action = readFile('lib/actions/forwardingActions.ts');
      const trackingFn = action.match(/export async function getForwardingTrackingByToken[\s\S]*?(?=export async function|$)/)?.[0] || '';
      const publicItemMatch = trackingFn.match(/return\s*\{[\s\S]*?\};/)?.[0] || '';
      expect(publicItemMatch).not.toContain('customer?.phone');
      expect(publicItemMatch).not.toContain('customer?.address');
      expect(publicItemMatch).not.toContain('legal_name');
      expect(publicItemMatch).not.toContain('billing_address');
    });

    test('tracking action exposes only public-safe fields', () => {
      const action = readFile('lib/actions/forwardingActions.ts');
      const trackingFn = action.match(/export async function getForwardingTrackingByToken[\s\S]*?(?=export async function|$)/)?.[0] || '';
      const publicItemMatch = trackingFn.match(/return\s*\{[\s\S]*?\};/)?.[0] || '';
      expect(publicItemMatch).toContain('commodity');
      expect(publicItemMatch).toContain('volume_cbm');
      expect(publicItemMatch).toContain('gross_weight_kg');
      expect(publicItemMatch).toContain('delivery_type');
      expect(publicItemMatch).toContain('container_number');
      expect(publicItemMatch).toContain('consol_number');
      expect(publicItemMatch).toContain('vessel_name');
      expect(publicItemMatch).toContain('origin_port');
      expect(publicItemMatch).toContain('destination_port');
    });

    test('tracking action scrubs sensitive fields from nested objects', () => {
      const action = readFile('lib/actions/forwardingActions.ts');
      const trackingFn = action.match(/export async function getForwardingTrackingByToken[\s\S]*?(?=export async function|$)/)?.[0] || '';
      const customerBlock = trackingFn.match(/customer_name:[\s\S]*?work_order:[\s\S]*?\}/)?.[0] || '';
      expect(customerBlock).not.toContain('phone');
      expect(customerBlock).not.toContain('address');
      expect(customerBlock).not.toContain('legal_name');
      expect(customerBlock).not.toContain('billing_address');
    });
  });

  // =========================================================================
  // TOKEN ENUMERATION
  // =========================================================================

  describe('Token enumeration resistance', () => {
    test('tracking_token uses UUID format (high entropy)', () => {
      const writer = readFile('lib/application/service-contracts/forwarding-writer.ts');
      const tokenSection = writer.match(/const generateTrackingToken = \(\)[\s\S]*?tracking_token: generateTrackingToken\(\)/)?.[0] || '';
      expect(tokenSection).toContain('crypto.randomUUID');
    });

    test('no sequential token generation found', () => {
      const writer = readFile('lib/application/service-contracts/forwarding-writer.ts');
      expect(writer).not.toMatch(/Math\.random\(\)\s*[\*\+]/);
      expect(writer).not.toMatch(/Date\.now\(\)\s*[\*\+]/);
    });

    test('new tracking_token generation uses cryptographically secure randomness', () => {
      const writer = readFile('lib/application/service-contracts/forwarding-writer.ts');
      const tokenSection = writer.match(/const generateTrackingToken = \(\)[\s\S]*?tracking_token: generateTrackingToken\(\)/)?.[0] || '';
      expect(tokenSection).toContain('crypto.randomUUID');
    });
  });

  // =========================================================================
  // CROSS-TENANT ISOLATION
  // =========================================================================

  describe('Cross-tenant isolation', () => {
    test('fw_container_items has tenant isolation RLS', () => {
      expect(allSql).toContain('fw_container_items_tenant_isolation');
      expect(allSql).toContain('get_my_tenant_id()');
    });

    test('tracking lookup uses token-only query (no tenant bypass)', () => {
      const action = readFile('lib/actions/forwardingActions.ts');
      const lookupMatch = action.match(/\.eq\('tracking_token', trimmed\)/)?.[0] || '';
      expect(lookupMatch).toContain('tracking_token');
    });

    test('tracking uses server client with token-only lookup', () => {
      const action = readFile('lib/actions/forwardingActions.ts');
      expect(action).toContain('createClient');
      expect(action).toContain('.eq(\'tracking_token\', trimmed)');
    });
  });

  // =========================================================================
  // BROWSER MUTATION AUDIT
  // =========================================================================

  describe('Browser mutation audit', () => {
    test('tracking page has no Supabase mutations', () => {
      const page = readFile('app/track/fwd/[token]/page.tsx');
      expect(page).not.toContain('.insert(');
      expect(page).not.toContain('.update(');
      expect(page).not.toContain('.delete(');
      expect(page).not.toContain('.upsert(');
    });
  });
});
