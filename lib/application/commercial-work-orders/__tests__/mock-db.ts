/**
 * Sentralogis — Phase 4B-2 / U-04
 * Test mock: chainable Supabase-compatible DB + U-04 repository port.
 */

import type { EngagementDbClient } from '@/lib/application/engagement/engagement-bridge';
import type { WorkOrderRepository } from '../repository';

export const TENANT_A = 'a0000000-0000-4000-8000-00000000000a';
export const TENANT_B = 'b0000000-0000-4000-8000-00000000000b';
export const USER_A = 'u0000000-0000-4000-8000-00000000000a';
export const CUST_A1 = 'c1000000-0000-4000-8000-000000000001';
export const CUST_A2 = 'c2000000-0000-4000-8000-000000000002';

export type Row = Record<string, unknown>;
interface Err { message: string; code?: string }

/** Tables that must NEVER receive a write from U-04 (mandate §22–§24). */
export const FORBIDDEN_TABLES = [
  'job_orders',
  'wo_items',
  'work_orders',
  'svc_service_requests',
  'commercial_capability_bindings',
];

type Filter = { col: string; op: string; val: unknown };

export class CwoMockDb {
  rows: Record<string, Row[]> = { md_entities: [], commercial_work_orders: [], legacy_wo_bridge: [] };
  inserts: Array<{ table: string; row: Row }> = [];
  tenants = new Map<string, string>();
  /** Race simulation: next N `.maybeSingle()` calls see nothing. */
  selectNullBudget = 0;
  private seq = 0;

  reset(): void {
    this.rows = { md_entities: [], commercial_work_orders: [], legacy_wo_bridge: [] };
    this.inserts = [];
    this.tenants = new Map([[TENANT_A, 'TENA'], [TENANT_B, 'TENB']]);
    this.selectNullBudget = 0;
    this.seq = 0;
  }

  countWrites(table: string): number {
    return this.inserts.filter(i => i.table === table).length;
  }

  seedCustomer(id: string, tenantId: string, code: string): void {
    this.rows.md_entities.push({ id, entity_code: code, name: `Customer ${code}`, tenant_id: tenantId });
  }

  seedWorkOrder(over: Row = {}): Row {
    const full: Row = {
      id: 'd0000000-0000-4000-8000-00000000000a',
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
    this.rows.commercial_work_orders.push(full);
    return full;
  }

  /* ---------- U-03 engagement bridge client ---------- */
  asEngagementClient(): EngagementDbClient {
     
    const self = this;
    return {
      from(table: string) {
        return {
          select() {
            return self.buildSelectChain(table, { filters: [] });
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

  private buildSelectChain(
    table: string,
    st: { filters: Filter[] },
  ): {
    eq(c: string, v: unknown): ReturnType<CwoMockDb['buildSelectChain']>;
    in(c: string, v: unknown[]): ReturnType<CwoMockDb['buildSelectChain']>;
    like(c: string, v: string): ReturnType<CwoMockDb['buildSelectChain']>;
    order(): ReturnType<CwoMockDb['buildSelectChain']>;
    limit(): ReturnType<CwoMockDb['buildSelectChain']>;
    single(): Promise<{ data: Row | null; error: Err | null }>;
    maybeSingle(): Promise<{ data: Row | null; error: Err | null }>;
    then<TResult1 = { data: Row[] | null; error: Err | null }, TResult2 = never>(
      onfulfilled?: ((value: { data: Row[] | null; error: Err | null }) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ): PromiseLike<TResult1 | TResult2>;
  } {
     
    const self = this;
    type Chain = ReturnType<CwoMockDb['buildSelectChain']>;
    const api = {
      eq(col: string, val: unknown): Chain { st.filters.push({ col, op: 'eq', val }); return api; },
      in(col: string, vals: unknown[]): Chain { st.filters.push({ col, op: 'in', val: vals }); return api; },
      like(col: string, pattern: string): Chain { st.filters.push({ col, op: 'like', val: pattern }); return api; },
      order(): Chain { return api; },
      limit(): Chain { return api; },
      async single() {
        const r = await self.selectRows(table, st.filters);
        return r.length > 0 ? { data: r[0], error: null } : { data: null, error: { message: 'No rows' } };
      },
      async maybeSingle() {
        if (table === 'commercial_work_orders' && self.selectNullBudget > 0) {
          self.selectNullBudget--;
          return { data: null, error: null };
        }
        const r = await self.selectRows(table, st.filters);
        return { data: r[0] ?? null, error: null };
      },
      then<TResult1 = { data: Row[] | null; error: Err | null }, TResult2 = never>(
        onfulfilled?: ((value: { data: Row[] | null; error: Err | null }) => TResult1 | PromiseLike<TResult1>) | null,
        onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
      ): PromiseLike<TResult1 | TResult2> {
        return self.selectRows(table, st.filters).then(
          rows =>
            onfulfilled
              ? onfulfilled({ data: rows, error: null })
              : ({ data: rows, error: null } as unknown as TResult1),
          onrejected as ((reason: unknown) => TResult1 | PromiseLike<TResult1>) | undefined,
        );
      },
    };
    return api;
  }

  /* ---------- U-04 repository port ---------- */
  asRepository(): WorkOrderRepository {
     
    const self = this;
    return {
      async findEngagementById(tenantId, id) {
        const found = await self.selectRows('commercial_work_orders', [
          { col: 'id', op: 'eq', val: id },
          { col: 'tenant_id', op: 'eq', val: tenantId },
        ]);
        return (found[0] as never) ?? null;
      },
      async listEngagements(tenantId, filters) {
        let filtered = (self.rows.commercial_work_orders || []).filter(r => r.tenant_id === tenantId);
        if (filters.customerId) filtered = filtered.filter(r => r.customer_id === filters.customerId);
        if (filters.statuses && filters.statuses.length > 0) {
          filtered = filtered.filter(r => filters.statuses!.includes(r.status as never));
        }
        if (filters.dateFrom) filtered = filtered.filter(r => String(r.order_date) >= filters.dateFrom!);
        if (filters.dateTo) filtered = filtered.filter(r => String(r.order_date) <= filters.dateTo!);
        filtered = [...filtered].sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
        return {
          rows: filtered.slice(filters.offset, filters.offset + filters.limit) as never[],
          total: filtered.length,
        };
      },
    };
  }

  /* ---------- internals ---------- */
  private async selectRows(table: string, filters: Filter[]): Promise<Row[]> {
    if (table === 'md_tenants') {
      const idFilter = filters.find(f => f.col === 'id');
      const code = idFilter ? this.tenants.get(idFilter.val as string) : undefined;
      return code !== undefined ? [{ id: idFilter?.val, tenant_code: code }] : [];
    }
    const src = this.rows[table];
    if (!src) return [];
    let out = [...src];
    for (const f of filters) {
      if (f.op === 'eq') out = out.filter(r => r[f.col] === f.val);
      else if (f.op === 'in') out = out.filter(r => (f.val as unknown[]).includes(r[f.col]));
      else if (f.op === 'like') {
        const rx = new RegExp('^' + String(f.val).replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$');
        out = out.filter(r => typeof r[f.col] === 'string' && rx.test(r[f.col] as string));
      }
    }
    out.sort((a, b) => String(b.created_at ?? '').localeCompare(String(a.created_at ?? '')));
    return out;
  }

  private async doInsert(table: string, row: Row): Promise<{ data: Row | null; error: Err | null }> {
    this.inserts.push({ table, row });

    if (table === 'commercial_work_orders') {
      const open = ['DRAFT', 'SUBMITTED'];
      if (open.includes(row.status as string)) {
        const dup = this.rows.commercial_work_orders.some(
          e => e.tenant_id === row.tenant_id && e.customer_id === row.customer_id && open.includes(e.status as string),
        );
        if (dup) {
          return {
            data: null,
            error: { message: 'duplicate key violates uq_com_wo_open_per_customer', code: '23505' },
          };
        }
      }
      const nowIso = new Date().toISOString();
      const full: Row = {
        status: 'DRAFT',
        currency: 'IDR',
        total_agreed_revenue: 0,
        payment_terms_days: 30,
        order_date: nowIso.split('T')[0],
        ...row,
        id: `wo-${++this.seq}`,
        created_at: nowIso,
        updated_at: nowIso,
      };
      this.rows.commercial_work_orders.push(full);
      return { data: full, error: null };
    }

    if (table === 'legacy_wo_bridge') {
      const dup = this.rows.legacy_wo_bridge.some(b => b.legacy_wo_id === row.legacy_wo_id);
      if (dup) return { data: null, error: { message: 'duplicate bridge', code: '23505' } };
      const full: Row = { ...row, id: `bridge-${++this.seq}`, created_at: new Date().toISOString() };
      this.rows.legacy_wo_bridge.push(full);
      return { data: full, error: null };
    }

    return { data: null, error: { message: `insert unsupported on ${table}` } };
  }
}
