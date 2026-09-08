/**
 * Sentralogis — Phase 4B-6 / U-08
 * Test Suite: Forwarding Writer Guard
 *
 * F1   Valid request → SR.work_order_id = REAL canonical engagement id
 * F2   U-03 resolve-or-create reused; no duplicate engagements
 * F3   Body tenant_id/user_id are NON-authoritative (ignored)
 * F4   Cross-tenant customer rejected non-leaking 404
 * F6   Legacy work_orders.id NEVER written into SR.work_order_id
 * F7   Every issued SR references an existing commercial_work_orders row
 * F8   FORWARDING capability resolves via U-05 registry authority
 * F9   Static forensic scan (writer + route sources)
 * F10  Existing forwarding contract preserved (wo_id/wo_number response,
 *      operational case-file rows still created, bridge established)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { IdentityContext } from '../../identity/types';
import {
  createForwardingWorkOrder,
  _setForwardingWriterRepository,
} from '../forwarding-writer';
import type { ForwardingWriterRepository } from '../forwarding-writer';
import { _setEngagementDbClient } from '@/lib/application/engagement/engagement-bridge';
import type { EngagementDbClient } from '@/lib/application/engagement/engagement-bridge';
import { resolveCapability, isRegisteredCapability, _resetRegistryCache } from '@/lib/application/capabilities/registry';

const TENANT_A = 'a0000000-0000-4000-8000-00000000000a';
const TENANT_B = 'b0000000-0000-4000-8000-00000000000b';
const USER_A = 'u0000000-0000-4000-8000-00000000000a';
const CUST_A1 = 'c1000000-0000-4000-8000-000000000001';
const CUST_B1 = 'cb000000-0000-4000-8000-000000000001';

type Row = Record<string, unknown>;
interface Err { message: string; code?: string }

function makeCtx(over: Partial<IdentityContext> = {}): IdentityContext {
  return {
    userId: USER_A,
    tenantId: TENANT_A,
    membershipId: 'mem-1',
    role: 'HQ_COMMERCIAL_DIRECTOR',
    isTenantOwner: false,
    permissions: ['commercial:read', 'commercial:manage'],
    sbuScope: null,
    ...over,
  };
}

class WriterMockRepo implements ForwardingWriterRepository {
  customers: Row[] = [];
  tenants = new Map<string, string>([[TENANT_A, 'TENA']]);
  legacyWoCount = 0;
  insertedLegacyWos: Row[] = [];
  insertedItems: Row[] = [];
  bridges: Array<Row> = [];
  containerItems: Row[] = [];

  seedCustomer(id: string, tenantId: string, code: string) {
    this.customers.push({ id, entity_code: code, name: `Customer ${code}`, tenant_id: tenantId });
  }
  bridgeLegacyTo(legacyWoId: string, engagementId: string): void { void legacyWoId; void engagementId; }

  async findCustomerCode(t: string, id: string) {
    const c = this.customers.find(x => x.id === id && x.tenant_id === t);
    return c ? ({ entity_code: c.entity_code, name: c.name } as never) : null;
  }
  async findTenantCode(t: string) {
    const code = this.tenants.get(t);
    return code ? ({ initial: null, tenant_code: code, name: code } as never) : null;
  }
  async countLegacyWorkOrders() { return this.legacyWoCount++; }
  async insertLegacyWo(payload: Row) {
    this.insertedLegacyWos.push(payload);
    return { id: `leg-${this.insertedLegacyWos.length}` };
  }
  async insertWoItem(payload: Row) {
    this.insertedItems.push(payload);
    return { id: `itm-${this.insertedItems.length}` };
  }
  async insertLegacyBridge(t: string, legacyWoId: string, engagementId: string) {
    this.bridges.push({ tenant_id: t, legacy_wo_id: legacyWoId, engagement_id: engagementId });
  }
  async insertContainerItem(payload: Row) { this.containerItems.push(payload); }
}

/** Minimal supabase-compatible mock sufficient for the U-03 engagement client. */
class EngagementMockDb {
  customers: Row[] = [];
  engagements: Row[] = [];
  tenants = new Map<string, string>();
  private seq = 0;

  constructor(writerRepo: WriterMockRepo) {
    this.customers = writerRepo.customers;
    this.tenants = writerRepo.tenants;
  }

  asClient(): EngagementDbClient {
     
    const self = this;
    type Chain = ReturnType<EngagementMockDb['chain']>;
    return {
      from(table: string) {
        return {
          select() {
            const st: { filters: Array<{ col: string; op: string; val: unknown }> } = { filters: [] };
            return self.chain(table, st) as never;
          },
          insert(row: Row) {
            return {
              select() { return { single: () => self.doInsert(table, row), maybeSingle: () => self.doInsert(table, row) }; },
              single: () => self.doInsert(table, row),
            };
          },
        };
      },
    };
  }

  private chain(
    table: string,
    st: { filters: Array<{ col: string; op: string; val: unknown }> },
  ): Record<string, unknown> {
     
    const self = this;
    const api = {
      eq(col: string, v: unknown) { st.filters.push({ col, op: 'eq', val: v }); return api; },
      in(col: string, vals: unknown[]) { st.filters.push({ col, op: 'in', val: vals }); return api; },
      like(col: string, p: string) { st.filters.push({ col, op: 'like', val: p }); return api; },
      order() { return api; },
      limit() { return api; },
      async single() {
        const rows = await self.rows(table, st.filters);
        return rows.length ? { data: rows[0], error: null } : { data: null, error: { message: 'No rows' } };
      },
      async maybeSingle() {
        const rows = await self.rows(table, st.filters);
        return { data: rows[0] ?? null, error: null };
      },
      then<TResult1 = { data: Row[] | null; error: Err | null }, TResult2 = never>(
        onfulfilled?: ((v: { data: Row[] | null; error: Err | null }) => TResult1 | PromiseLike<TResult1>) | null,
      ): PromiseLike<TResult1 | TResult2> {
        return self.rows(table, st.filters).then(
          rows => (onfulfilled ? onfulfilled({ data: rows, error: null }) : ({ data: rows, error: null } as unknown as TResult1)),
        );
      },
    };
    return api;
  }

  private async rows(table: string, filters: Array<{ col: string; op: string; val: unknown }>): Promise<Row[]> {
    if (table === 'md_tenants') {
      const f = filters.find(x => x.col === 'id');
      const code = f ? this.tenants.get(f.val as string) : undefined;
      return code ? [{ id: f?.val, tenant_code: code }] : [];
    }
    const src = table === 'md_entities' ? this.customers : table === 'commercial_work_orders' ? this.engagements : [];
    let out = [...src];
    for (const flt of filters) {
      if (flt.op === 'eq') out = out.filter(r => r[flt.col] === flt.val);
      else if (flt.op === 'in') out = out.filter(r => (flt.val as unknown[]).includes(r[flt.col]));
    }
    out.sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));
    return out;
  }

  private async doInsert(_table: string, row: Row): Promise<{ data: Row | null; error: Err | null }> {
    const nowIso = new Date().toISOString();
    const full: Row = {
      status: 'DRAFT', currency: 'IDR', total_agreed_revenue: 0, payment_terms_days: 30,
      service_scope_id: null, version_no: 1, commercial_notes: null, target_fulfillment_date: null,
      ...row,
      id: `eng-${++this.seq}`,
      created_at: nowIso, updated_at: nowIso,
    };
    this.engagements.push(full);
    return { data: full, error: null };
  }
}

async function withEnv<T>(
  repo: WriterMockRepo,
  fn: (ctxs: { issuerCalls: Array<Record<string, unknown>> }) => Promise<T>,
): Promise<T> {
  _resetRegistryCache();
  _setForwardingWriterRepository(repo);
  const engDb = new EngagementMockDb(repo);
  _setEngagementDbClient(engDb.asClient());
  const issuerCalls: Array<Record<string, unknown>> = [];
  let woNumberCounter = 1;
   
  const mod = await import('../forwarding-writer');
  (mod as any)._setForwardingSrIssuer(async (args: Record<string, unknown>) => {
    issuerCalls.push(args);
    return { dispatchResult: { domainJobId: `job-${issuerCalls.length}` } };
  });
  (mod as any)._setForwardingWoNumberRpc(async (args: Record<string, unknown>) => {
    const tenantCode = (args.p_tenant_code as string) || 'HQ';
    const customerCode = (args.p_customer_code as string) || 'CUS';
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    const seq = String(woNumberCounter++).padStart(3, '0');
    return {
      data: `${tenantCode}-${customerCode}-FWD-${month}${year}-${seq}`,
      error: null,
    };
  });
  try {
    return await fn({ issuerCalls });
  } finally {
    mod._setForwardingSrIssuer(null);
    mod._setForwardingWoNumberRpc(null);
    _setForwardingWriterRepository(null);
    _setEngagementDbClient(null);
    _resetRegistryCache();
  }
}

export async function runForwardingWriterGuardSuite(): Promise<{
  passed: number;
  failed: number;
  total: number;
}> {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail = '') {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}${detail ? ` — ${detail}` : ''}`);
      failed++;
    }
  }

  const baseBody = {
    customer_id: CUST_A1,
    service_type: 'FCL',
    delivery_type: 'D2D',
    origin_port: 'JKT',
    destination_port: 'SUR',
    containers: [{ container_number: 'CONT-001', sell_price: 100 }],
    notes: 'test shipment',
  };

  /* ---- F1/F6/F7: canonical SR.work_order_id ---- */
  await withEnv(new WriterMockRepo(), async ({ issuerCalls }) => {
    const repo = new WriterMockRepo();
    repo.seedCustomer(CUST_A1, TENANT_A, 'CUSA');
    _setForwardingWriterRepository(repo);
    _setEngagementDbClient(new EngagementMockDb(repo).asClient());

    const result = await createForwardingWorkOrder(makeCtx(), { ...baseBody });

    const srIds = issuerCalls.map(c => String(c.work_order_id));
    const engagementIds = new Set(['eng-1']); // only engagement created by the mock

    _setForwardingWriterRepository(null);
    _setEngagementDbClient(null);

    assert(
      issuerCalls.length === 2 && result.engagement_id === 'eng-1' &&
        srIds.every(id => id === 'eng-1') &&
        !srIds.some(id => id.startsWith('leg-')),
      'F1/F6 both SRs carry the CANONICAL engagement id, never the legacy wo id',
      JSON.stringify(srIds),
    );
    assert(
      srIds.every(id => engagementIds.has(id)),
      'F7 every SR.work_order_id exists in commercial_work_orders',
    );
    assert(
      typeof result.wo_id === 'string' && typeof result.wo_number === 'string' &&
        repo.bridges.length === 1 &&
        repo.bridges[0].legacy_wo_id === result.wo_id &&
        repo.bridges[0].engagement_id === result.engagement_id &&
        repo.containerItems.length === 1,
      'F10 legacy case file preserved + engagement↔WO bridge established',
    );
  });

  /* ---- F2: no duplicate engagements across repeated requests ---- */
  await withEnv(new WriterMockRepo(), async () => {
    const repo = new WriterMockRepo();
    repo.seedCustomer(CUST_A1, TENANT_A, 'CUSA');
    _setForwardingWriterRepository(repo);
    const engDb = new EngagementMockDb(repo);
    _setEngagementDbClient(engDb.asClient());

    await createForwardingWorkOrder(makeCtx(), { ...baseBody });
    await createForwardingWorkOrder(makeCtx(), { ...baseBody });

    _setForwardingWriterRepository(null);
    _setEngagementDbClient(null);
    assert(engDb.engagements.length === 1, 'F2 repeated requests reuse the open engagement (no duplicates)');
  });

  /* ---- F3: body tenant/user are ignored ---- */
  await withEnv(new WriterMockRepo(), async () => {
    const repo = new WriterMockRepo();
    repo.seedCustomer(CUST_A1, TENANT_A, 'CUSA');
    _setForwardingWriterRepository(repo);
    _setEngagementDbClient(new EngagementMockDb(repo).asClient());

    const result = await createForwardingWorkOrder(makeCtx(), {
      ...baseBody,
      tenant_id: TENANT_B,
      user_id: 'forged-user',
    });

    const allTenantA =
      repo.insertedLegacyWos.every(w => w.tenant_id === TENANT_A) &&
      repo.insertedItems.every(i => i.tenant_id === TENANT_A) &&
      repo.containerItems.every(c => c.tenant_id === TENANT_A) &&
      result.engagement_id.startsWith('eng-');

    _setForwardingWriterRepository(null);
    _setEngagementDbClient(null);
    assert(allTenantA, 'F3 forged body tenant_id/user_id ignored — IdentityContext governs every write');
  });

  /* ---- F4: cross-tenant customer rejected ---- */
  await withEnv(new WriterMockRepo(), async () => {
    const repo = new WriterMockRepo();
    repo.seedCustomer(CUST_B1, TENANT_B, 'CUSB'); // belongs to Tenant B
    _setForwardingWriterRepository(repo);
    _setEngagementDbClient(new EngagementMockDb(repo).asClient());

    let rejected = false;
    try {
      await createForwardingWorkOrder(makeCtx(), { ...baseBody, customer_id: CUST_B1 });
    } catch (err) {
      rejected = (err as { code?: string }).code === 'CUSTOMER_NOT_FOUND';
    }
    const noWrites =
      repo.insertedLegacyWos.length === 0 && repo.bridges.length === 0 && repo.containerItems.length === 0;

    _setForwardingWriterRepository(null);
    _setEngagementDbClient(null);
    assert(rejected && noWrites, 'F4 cross-tenant customer rejected (404-class), zero writes');
  });

  /* ---- F8: capability authority via U-05 ---- */
  await withEnv(new WriterMockRepo(), async () => {
    const ok = isRegisteredCapability('FORWARDING');
    let resolved = false;
    try {
      const cap = await resolveCapability(makeCtx(), 'forwarding');
      resolved = cap.code === 'FORWARDING';
    } catch {
      resolved = false;
    }
    assert(ok && resolved, 'F8 FORWARDING capability resolves through the U-05 registry authority');
  });

  /* ---- F9: static forensic scan ---- */
  {
    const routePath = path.join(process.cwd(), 'app', 'api', 'forwarding', 'wo', 'route.ts');
    const writerPath = path.join(process.cwd(), 'lib', 'application', 'service-contracts', 'forwarding-writer.ts');
    const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    const routeSrc = strip(fs.readFileSync(routePath, 'utf8'));
    const writerSrc = strip(fs.readFileSync(writerPath, 'utf8'));

    const checks: Array<[boolean, string]> = [
      [!routeSrc.includes('svc_service_requests') && !routeSrc.includes('issueRequest'), 'route no longer writes SRs directly'],
      [writerSrc.includes('resolveOrCreateEngagement('), 'canonical U-03 resolver used'],
      [writerSrc.includes('work_order_id: engagementId'), 'SR receives canonical engagement id'],
      [!/\bwork_order_id:\s*wo_id\b/.test(writerSrc), 'legacy wo_id never assigned to SR.work_order_id'],
      [!/work_order_id\s*:\s*(crypto\.)?randomUUID/.test(writerSrc), 'no random UUID as work_order_id'],
      [writerSrc.includes('ctx.tenantId') && writerSrc.includes('insertLegacyBridge'), 'IdentityContext tenant + lineage bridge present'],
      [writerSrc.includes('next_forwarding_wo_number') || writerSrc.includes('_woNumberRpc'), 'forwarding WO number uses DB authority'],
    ];
    const woNumberSection = writerSrc.match(/next_forwarding_wo_number[\s\S]*?const wo_number =/)?.[0] || '';
    const woChecks: Array<[boolean, string]> = [
      [!woNumberSection.includes('Math.random'), 'no Math.random in WO number generation'],
      [!woNumberSection.includes('countLegacyWorkOrders'), 'no countLegacyWorkOrders in WO number generation'],
    ];
    const failedChecks = checks.filter(([ok]) => !ok).map(([, name]) => name);
    const failedWoChecks = woChecks.filter(([ok]) => !ok).map(([, name]) => name);
    assert(failedChecks.length === 0 && failedWoChecks.length === 0, 'F9 static forensic assertions hold', [...failedChecks, ...failedWoChecks].join('; '));
  }

  console.log('----------------------------------------------------');
  console.log(`U-08 FORWARDING WRITER GUARD SUITE: ${passed} / ${passed + failed} PASSED`);
  console.log('----------------------------------------------------');

  return { passed, failed, total: passed + failed };
}
