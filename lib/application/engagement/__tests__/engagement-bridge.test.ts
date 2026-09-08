/**
 * Sentralogis — Phase 4B-1b / U-03
 * Test Suite: Engagement Resolve-or-Create Bridge
 *
 * Scenarios (mandate §20):
 *  T1  Existing engagement → created=false, same engagementId
 *  T2  New engagement → created=true, valid canonical engagement
 *  T3  Repeat request → same engagementId (idempotency)
 *  T4  Cross-tenant attempt → 403 identity mismatch / non-leaking 404 on customer
 *  T5  Unauthorized role (no commercial:manage) → 403
 *  T6  Unauthenticated → 401 (U-01 gate before bridge)
 *  T7  Invalid customer → 404 CUSTOMER_NOT_FOUND
 *  T8  Concurrent creation (race) → ONE engagement
 *  T9  Retry after network failure → same engagement
 *  T10 No fabricated IDs — insert payload references real entities only
 */

import type { IdentityContext } from '../../identity/types';
import { resolveIdentityContext } from '../../identity/resolver';
import { IdentityResolutionError } from '../../identity/errors';
import { resolveFromArrays } from '../../identity/membership-source';
import {
  resolveOrCreateEngagement,
  _setEngagementDbClient,
} from '../engagement-bridge';
import type { EngagementDbClient } from '../engagement-bridge';
import { EngagementError } from '../types';

/* ================================================================== */
/*  FIXTURES                                                           */
/* ================================================================== */

const TENANT_A = 'a0000000-0000-4000-8000-00000000000a';
const TENANT_B = 'b0000000-0000-4000-8000-00000000000b';
const USER_A = 'u0000000-0000-4000-8000-00000000000a';
const CUST_A1 = 'c1000000-0000-4000-8000-000000000001';
const CUST_A2 = 'c2000000-0000-4000-8000-000000000002';
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

function seedEngagementRow(over: Row = {}): Row {
  return {
    id: 'eng-seed-0001',
    tenant_id: TENANT_A,
    wo_number: 'TENA-CUSA-0826-001',
    customer_id: CUST_A1,
    service_scope_id: null,
    contract_reference: null,
    order_date: '2026-08-26',
    target_fulfillment_date: null,
    status: 'DRAFT',
    currency: 'IDR',
    total_agreed_revenue: 0,
    payment_terms_days: 30,
    commercial_notes: null,
    version_no: 1,
    created_at: '2026-08-26T01:00:00.000Z',
    updated_at: '2026-08-26T01:00:00.000Z',
    created_by: USER_A,
    updated_by: USER_A,
    ...over,
  };
}

/* ================================================================== */
/*  MOCK DATABASE (chainable, supabase-compatible surface)             */
/* ================================================================== */

class EngagementMockDb {
  customers: Row[] = [];
  engagements: Row[] = [];
  bridges: Row[] = [];
  tenants = new Map<string, string>();
  /** When > 0, the next N `.maybeSingle()` calls return null (race simulation). */
  selectNullBudget = 0;
  insertedPayloads: Row[] = [];
  bridgePayloads: Row[] = [];
  private seq = 0;

  reset(): void {
    this.customers = [];
    this.engagements = [];
    this.bridges = [];
    this.tenants = new Map([[TENANT_A, 'TENA'], [TENANT_B, 'TENB']]);
    this.selectNullBudget = 0;
    this.insertedPayloads = [];
    this.bridgePayloads = [];
    this.seq = 0;
  }

  asClient(): EngagementDbClient {
    const self = this;
    return {
      from(table: string) {
        return {
          select() {
            const st: { filters: Array<{ col: string; op: string; val: unknown }> } = { filters: [] };
            const chain = self.buildSelectChain(table, st);
            return chain;
          },
          insert(row: Row) {
            return {
              select() {
                return {
                  single: () => self.doInsert(table, row),
                  maybeSingle: () => self.doInsert(table, row),
                };
              },
              single: () => self.doInsert(table, row),
            };
          },
        };
      },
    };
  }

  private tableRows(table: string): Row[] | null {
    if (table === 'md_entities') return this.customers;
    if (table === 'commercial_work_orders') return this.engagements;
    if (table === 'legacy_wo_bridge') return this.bridges;
    return null;
  }

  private applyFilters(rows: Row[], filters: Array<{ col: string; op: string; val: unknown }>): Row[] {
    let out = rows;
    for (const f of filters) {
      if (f.op === 'eq') out = out.filter(r => r[f.col] === f.val);
      else if (f.op === 'in') out = out.filter(r => (f.val as unknown[]).includes(r[f.col]));
      else if (f.op === 'like') {
        const pattern = f.val as string;
        const rx = new RegExp('^' + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$');
        out = out.filter(r => typeof r[f.col] === 'string' && rx.test(r[f.col] as string));
      }
    }
    return out;
  }

  private buildSelectChain(
    table: string,
    st: { filters: Array<{ col: string; op: string; val: unknown }> },
  ): {
    eq(c: string, v: unknown): ReturnType<EngagementMockDb['buildSelectChain']>;
    in(c: string, v: unknown[]): ReturnType<EngagementMockDb['buildSelectChain']>;
    like(c: string, v: string): ReturnType<EngagementMockDb['buildSelectChain']>;
    order(): ReturnType<EngagementMockDb['buildSelectChain']>;
    limit(): ReturnType<EngagementMockDb['buildSelectChain']>;
    single(): Promise<{ data: Row | null; error: Err | null }>;
    maybeSingle(): Promise<{ data: Row | null; error: Err | null }>;
    then<TResult1 = { data: Row[] | null; error: Err | null }, TResult2 = never>(
      onfulfilled?: ((value: { data: Row[] | null; error: Err | null }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2>;
  } {
     
    const self = this;
    type Chain = ReturnType<EngagementMockDb['buildSelectChain']>;
    const api = {
      eq(col: string, val: unknown): Chain {
        st.filters.push({ col, op: 'eq', val });
        return api;
      },
      in(col: string, vals: unknown[]): Chain {
        st.filters.push({ col, op: 'in', val: vals });
        return api;
      },
      like(col: string, pattern: string): Chain {
        st.filters.push({ col, op: 'like', val: pattern });
        return api;
      },
      order(): Chain { return api; },
      limit(): Chain { return api; },
      async single() {
        const rows = await self.selectRows(table, st.filters);
        if (rows.length > 0) return { data: rows[0], error: null };
        return { data: null, error: { message: 'No rows found' } };
      },
      async maybeSingle() {
        if (table === 'commercial_work_orders' && self.selectNullBudget > 0) {
          self.selectNullBudget--;
          return { data: null, error: null };
        }
        const rows = await self.selectRows(table, st.filters);
        return { data: rows[0] ?? null, error: null };
      },
      then<TResult1 = { data: Row[] | null; error: Err | null }, TResult2 = never>(
        onfulfilled?: ((value: { data: Row[] | null; error: Err | null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ): PromiseLike<TResult1 | TResult2> {
        return self.selectRows(table, st.filters).then(rows =>
          onfulfilled
            ? onfulfilled({ data: rows, error: null })
            : ({ data: rows, error: null } as unknown as TResult1),
          onrejected as ((reason: unknown) => TResult1 | PromiseLike<TResult1>) | undefined,
        );
      },
    };
    return api;
  }

  private async selectRows(table: string, filters: Array<{ col: string; op: string; val: unknown }>): Promise<Row[]> {
    if (table === 'md_tenants') {
      // Only supports the .eq('id', X).single() shape used by the bridge.
      const idFilter = filters.find(f => f.col === 'id');
      const code = idFilter ? this.tenants.get(idFilter.val as string) : undefined;
      return code !== undefined ? [{ id: idFilter?.val, tenant_code: code }] : [];
    }
    const rows = this.tableRows(table);
    if (!rows) return [];
    const filtered = this.applyFilters([...rows], filters);
    // newest-first ordering for engagement resolution
    filtered.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
    return filtered;
  }

  private async doInsert(table: string, row: Row): Promise<{ data: Row | null; error: Err | null }> {
    if (table === 'commercial_work_orders') {
      this.insertedPayloads.push(row);
      const openStatuses = ['DRAFT', 'SUBMITTED'];
      if (openStatuses.includes(row.status as string)) {
        const dup = this.engagements.some(
          e =>
            e.tenant_id === row.tenant_id &&
            e.customer_id === row.customer_id &&
            openStatuses.includes(e.status as string),
        );
        if (dup) {
          return {
            data: null,
            error: {
              message: 'duplicate key value violates unique constraint "uq_com_wo_open_per_customer"',
              code: '23505',
            },
          };
        }
      }
      const nowIso = new Date().toISOString();
      const full: Row = {
        order_date: new Date().toISOString().split('T')[0],
        target_fulfillment_date: null,
        status: 'DRAFT',
        currency: 'IDR',
        total_agreed_revenue: 0,
        payment_terms_days: 30,
        commercial_notes: null,
        version_no: 1,
        ...row,
        id: `eng-${++this.seq}`,
        created_at: nowIso,
        updated_at: nowIso,
      };
      this.engagements.push(full);
      return { data: full, error: null };
    }

    if (table === 'legacy_wo_bridge') {
      this.bridgePayloads.push(row);
      const dup = this.bridges.some(b => b.legacy_wo_id === row.legacy_wo_id);
      if (dup) {
        return {
          data: null,
          error: {
            message: 'duplicate key value violates unique constraint "uq_legacy_wo_bridge_legacy"',
            code: '23505',
          },
        };
      }
      const nowIso = new Date().toISOString();
      const full: Row = {
        ...row,
        id: `bridge-${++this.seq}`,
        created_at: nowIso,
      };
      this.bridges.push(full);
      return { data: full, error: null };
    }

    return { data: null, error: { message: `insert not supported on ${table}` } };
  }
}

/* ================================================================== */
/*  SUITE                                                              */
/* ================================================================== */

export async function runEngagementBridgeSuite(): Promise<{
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

  const mock = new EngagementMockDb();

  async function withMock<T>(fn: () => Promise<T>): Promise<T> {
    mock.reset();
    _setEngagementDbClient(mock.asClient());
    try {
      return await fn();
    } finally {
      _setEngagementDbClient(null);
    }
  }

  /* ---- T1: Existing engagement resolves (created=false) ---- */
  await withMock(async () => {
    const seeded = seedEngagementRow();
    mock.engagements.push(seeded);
    mock.customers.push({ id: CUST_A1, entity_code: 'CUSA', name: 'Customer A', tenant_id: TENANT_A });
    const result = await resolveOrCreateEngagement({ customerId: CUST_A1 }, makeCtx());
    assert(
      result.created === false && result.engagement.id === 'eng-seed-0001',
      'T1 existing engagement resolved without creation',
    );
  });

  /* ---- T2: New engagement created ---- */
  await withMock(async () => {
    mock.customers.push({ id: CUST_A2, entity_code: 'CUSB', name: 'Customer B', tenant_id: TENANT_A });
    const result = await resolveOrCreateEngagement({ customerId: CUST_A2 }, makeCtx());
    assert(
      result.created === true &&
        result.engagement.id === 'eng-1' &&
        result.engagement.status === 'DRAFT' &&
        result.engagement.serviceScopeId === null &&
        result.engagement.tenantId === TENANT_A &&
        result.engagement.customerId === CUST_A2,
      'T2 new engagement created with canonical DRAFT state',
    );
  });

  /* ---- T3: Repeat request returns same engagement ---- */
  await withMock(async () => {
    mock.customers.push({ id: CUST_A2, entity_code: 'CUSB', name: 'Customer B', tenant_id: TENANT_A });
    const r1 = await resolveOrCreateEngagement({ customerId: CUST_A2 }, makeCtx());
    const r2 = await resolveOrCreateEngagement({ customerId: CUST_A2 }, makeCtx());
    const r3 = await resolveOrCreateEngagement({ customerId: CUST_A2 }, makeCtx());
    assert(
      r1.created === true && r2.created === false && r3.created === false &&
        r1.engagement.id === r2.engagement.id && r2.engagement.id === r3.engagement.id,
      'T3 repeated requests are idempotent (same engagementId)',
    );
  });

  /* ---- T4: Cross-tenant protection ---- */
  await withMock(async () => {
    // Customer exists ONLY under Tenant B.
    mock.customers.push({ id: CUST_B1, entity_code: 'CUSB1', name: 'Tenant B Customer', tenant_id: TENANT_B });

    // 4a: Tenant A context referencing Tenant B customer → non-leaking 404.
    let code4a = '';
    try {
      await resolveOrCreateEngagement({ customerId: CUST_B1 }, makeCtx());
    } catch (err) {
      if (err instanceof EngagementError) code4a = `${err.code}:${err.statusCode}`;
    }
    assert(code4a === 'CUSTOMER_NOT_FOUND:404', 'T4a cross-tenant customer reference does not leak (404)', `got ${code4a}`);

    // 4b: forged requestedTenantId at the identity layer → 403 TENANT_MISMATCH.
    let code4b = '';
    let http4b = 0;
    try {
      resolveIdentityContext({
        userId: USER_A,
        requestedTenantId: TENANT_B,
        source: resolveFromArrays(
          [{ id: 'm1', tenant_id: TENANT_A, role_code: 'hq_commercial_director' }],
          [],
        ),
      });
    } catch (err) {
      if (err instanceof IdentityResolutionError) {
        code4b = err.code;
        http4b = err.statusCode;
      }
    }
    assert(code4b === 'TENANT_MISMATCH' && http4b === 403, 'T4b forged tenant context rejected with 403', `got ${code4b}/${http4b}`);
  });

  /* ---- T5: Unauthorized role → 403 ---- */
  await withMock(async () => {
    mock.customers.push({ id: CUST_A1, entity_code: 'CUSA', name: 'Customer A', tenant_id: TENANT_A });
    let thrown = false;
    let statusCode = 0;
    try {
      await resolveOrCreateEngagement(
        { customerId: CUST_A1 },
        makeCtx({ permissions: ['commercial:read'] }),
      );
    } catch (err) {
      if (err instanceof IdentityResolutionError) {
        thrown = true;
        statusCode = err.statusCode;
      }
    }
    assert(thrown && statusCode === 403, 'T5 missing commercial:manage rejected with 403', `thrown=${thrown} status=${statusCode}`);
  });

  /* ---- T6: Unauthenticated → 401 (U-01 gate upstream of bridge) ---- */
  await withMock(async () => {
    let thrown = false;
    let statusCode = 0;
    try {
      resolveIdentityContext({
        userId: null,
        source: resolveFromArrays([], []),
      });
    } catch (err) {
      if (err instanceof IdentityResolutionError) {
        thrown = true;
        statusCode = err.statusCode;
      }
    }
    assert(thrown && statusCode === 401, 'T6 unauthenticated request rejected with 401', `status=${statusCode}`);
  });

  /* ---- T7: Invalid customer → 404 ---- */
  await withMock(async () => {
    let code = '';
    try {
      await resolveOrCreateEngagement({ customerId: 'no-such-customer' }, makeCtx());
    } catch (err) {
      if (err instanceof EngagementError) code = `${err.code}:${err.statusCode}`;
    }
    assert(code === 'CUSTOMER_NOT_FOUND:404', 'T7 invalid customer yields 404', `got ${code}`);
  });

  /* ---- T8: Concurrent creation → ONE engagement ---- */
  await withMock(async () => {
    mock.customers.push({ id: CUST_A2, entity_code: 'CUSB', name: 'Customer B', tenant_id: TENANT_A });
    // Simulate the race window: both concurrent findOpenEngagement selects see nothing…
    mock.selectNullBudget = 2;
    const callA = resolveOrCreateEngagement({ customerId: CUST_A2 }, makeCtx());
    const callB = resolveOrCreateEngagement({ customerId: CUST_A2 }, makeCtx());
    const [ra, rb] = await Promise.all([callA, callB]);
    const openCount = mock.engagements.filter(e =>
      e.tenant_id === TENANT_A && e.customer_id === CUST_A2 && ['DRAFT', 'SUBMITTED'].includes(e.status as string),
    ).length;
    // Exactly one of the two racers reports created=true; both return the SAME engagement.
    const createdCount = [ra.created, rb.created].filter(Boolean).length;
    assert(
      createdCount === 1 &&
        ra.engagement.id === rb.engagement.id && openCount === 1,
      'T8 concurrent race produces exactly ONE engagement',
      `open=${openCount} createdCount=${createdCount} a=${ra.engagement.id} b=${rb.engagement.id}`,
    );
  });

  /* ---- T9: Retry after simulated failure returns same engagement ---- */
  await withMock(async () => {
    mock.customers.push({ id: CUST_A1, entity_code: 'CUSA', name: 'Customer A', tenant_id: TENANT_A });
    const first = await resolveOrCreateEngagement({ customerId: CUST_A1 }, makeCtx());
    // Network retry / double-submit / page refresh:
    const retry = await resolveOrCreateEngagement({ customerId: CUST_A1 }, makeCtx());
    assert(
      first.engagement.id === retry.engagement.id && !retry.created,
      'T9 network retry returns the same engagement',
    );
  });

  /* ---- T10: No fabricated identifiers ---- */
  await withMock(async () => {
    mock.customers.push({ id: CUST_A1, entity_code: 'CUSA', name: 'Customer A', tenant_id: TENANT_A });
    const LEGACY_WO = 'legacy-wo-real-id';
    const result = await resolveOrCreateEngagement(
      { customerId: CUST_A1, legacyWorkOrderId: LEGACY_WO },
      makeCtx(),
    );

    const payload = mock.insertedPayloads[0] ?? {};
    const bridgeRow = mock.bridgePayloads[0] ?? {};
    const woNumberPattern = /^[A-Z0-9]{2,5}-[A-Z0-9]{2,5}-\d{4}-\d{3}$/;
    const woOk = woNumberPattern.test(result.engagement.woNumber);

    assert(
      payload.service_scope_id === null &&
        payload.tenant_id === TENANT_A &&
        payload.customer_id === CUST_A1 &&
        payload.created_by === USER_A &&
        bridgeRow.legacy_wo_id === LEGACY_WO &&
        bridgeRow.engagement_id === result.engagement.id &&
        woOk,
      'T10 no fabricated IDs — real references only, explicit null scope, deterministic wo_number',
      `scope=${String(payload.service_scope_id)} wo=${result.engagement.woNumber}`,
    );
  });

  console.log('----------------------------------------------------');
  console.log(`U-03 ENGAGEMENT BRIDGE SUITE: ${passed} / ${passed + failed} PASSED`);
  console.log('----------------------------------------------------');

  return { passed, failed, total: passed + failed };
}
