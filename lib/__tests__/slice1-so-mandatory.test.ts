/**
 * Sentralogis — SO-Mandatory Trucking Slice 1 (Phase 3C)
 * lib/__tests__/slice1-so-mandatory.test.ts
 *
 * Focused acceptance suite for the authorized slice:
 * - SO eligibility server-side validation (tenant, status, customer consistency)
 * - Stable caller-supplied idempotency keys (create/items/JO)
 * - Tenant-scoped resource lookup for WO items and Job Orders
 * - Partial-failure contract (SUCCEEDED / FAILED / PARTIAL / UNKNOWN) + stages
 * - Observable control-record persistence (audit / idempotency)
 * - Conditional manifests and trucking routes; existing-JO preservation
 * - Natural-key readback on verified UNIQUE constraints
 *
 * SECURITY INVARIANTS (Phase 3C):
 * - Tenant comes ONLY from IdentityContext; client ids are never authority.
 * - No multi-table atomicity is claimed; no automatic compensation.
 * - Audit metadata (salesOrderId) is evidence-grade only — NOT a permanent FK.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  WorkOrderMutationService,
  _setWorkOrderMutationDbClient,
  computePayloadHash,
  type WorkOrderMutationDbClient,
} from '@/lib/work-order/mutation-service';
import { WorkOrderMutationHttp } from '@/lib/work-order/mutation-http';
import type { IdentityContext } from '@/lib/application/identity/types';

vi.mock('@/lib/supabase/admin', () => ({
  supabaseAdmin: {
    from: () => {
      const builder: any = {
        select: () => builder,
        eq: () => builder,
        order: () => builder,
        range: () => builder,
        async maybeSingle() {
          return { data: null, error: null };
        },
        async single() {
          return { data: null, error: null };
        },
        then(resolve: any) {
          return resolve({ data: [], error: null, count: 0 });
        },
      };
      return builder;
    },
    insert: () => ({ data: [], error: null }),
  },
}));

// ============================================================================
// FIXTURES
// ============================================================================

const TENANT = '11111111-1111-4111-8111-111111111111';
const USER = '33333333-3333-4333-8333-333333333333';
const SO_ID = 'aaaaaaaa-1111-4222-8333-444444444444';
const ENG_ID = 'bbbbbbbb-1111-4222-8333-444444444444';
const CUSTOMER = 'cccccccc-1111-4222-8333-444444444444';
const OTHER_TENANT = '22222222-2222-4222-8222-222222222222';

const ctx = (): IdentityContext =>
  ({
    userId: USER,
    tenantId: TENANT,
    role: 'admin',
    permissions: ['work_order:create', 'work_order:update'],
    sessionId: 'sess-0000-0000-0000-000000000001',
    source: 'test',
  }) as IdentityContext;

const noPermCtx = (): IdentityContext => ({ ...ctx(), permissions: [] });

// ============================================================================
// STATEFUL MOCK DB (supports the WorkOrderMutationDbClient contract)
// ============================================================================

type Row = Record<string, any>;

const tables: Record<string, Row[]> = {};
let failAuditInsert = false;
let failIdemInsert = false;
let failItemInsertOnce: string | null = null;

function resetDb(): void {
  for (const k of Object.keys(tables)) delete tables[k];
  tables.commercial_work_orders = [];
  tables.sales_orders = [];
  tables.work_orders = [];
  tables.wo_items = [];
  tables.wo_item_manifests = [];
  tables.job_orders = [];
  tables.job_routes = [];
  tables.work_order_audit = [];
  tables.work_order_idempotency = [];
  failAuditInsert = false;
  failIdemInsert = false;
  failItemInsertOnce = null;

  tables.commercial_work_orders.push({ id: ENG_ID, tenant_id: TENANT, customer_id: CUSTOMER });
  tables.sales_orders.push({ id: SO_ID, tenant_id: TENANT, status: 'CONFIRMED', engagement_id: ENG_ID });
}

function matchRow(table: string, filters: { col: string; val: unknown }[]): Row | undefined {
  return (tables[table] || []).find((r) => filters.every((f) => r[f.col] === f.val));
}

function uniqueViolation(message = 'duplicate key'): { data: null; error: any } {
  const err: any = new Error(message);
  err.code = '23505';
  return { data: null, error: err };
}

function makeClient(): WorkOrderMutationDbClient {
  return {
    from(table: string) {
      const filters: { col: string; val: unknown }[] = [];
      const chain: any = {
        select: (_cols?: string) => chain,
        eq: (col: string, val: unknown) => {
          filters.push({ col, val });
          return chain;
        },
        in: (col: string, vals: unknown[]) => {
          filters.push({ col, val: vals[0] });
          return chain;
        },
        is: (col: string, val: unknown | null) => {
          filters.push({ col, val });
          return chain;
        },
        not: () => chain,
        order: (col: string, opts?: { ascending?: boolean }) => {
          const asc = opts?.ascending !== false;
          if (tables[table]) {
            tables[table] = [...tables[table]].sort((a, b) => {
              if (a[col] === b[col]) return 0;
              return (asc ? 1 : -1) * (a[col] > b[col] ? 1 : -1);
            });
          }
          return chain;
        },
        range: (start: number, _end: number) => {
          chain._rangeStart = start;
          return chain;
        },
        maybeSingle: async () => {
          const r = matchRow(table, filters);
          return { data: r ? { ...r } : null, error: null };
        },
        single: async () => {
          const r = matchRow(table, filters);
          if (!r) throw new Error(`${table} row not found`);
          return { data: { ...r }, error: null };
        },
        insert: async (row: Row | Row[]) => {
          const incoming = Array.isArray(row) ? row : [row];
          if (table === 'work_order_audit' && failAuditInsert) {
            failAuditInsert = false;
            const res = { data: null, error: { message: 'audit persistence failure (injected)' } };
            return { ...res, select: async () => res };
          }
          if (table === 'work_order_idempotency' && failIdemInsert) {
            failIdemInsert = false;
            const res = { data: null, error: { message: 'idempotency persistence failure (injected)' } };
            return { ...res, select: async () => res };
          }
          for (const r of incoming) {
            if (table === 'work_orders') {
              const dup = (tables.work_orders || []).find(
                (x) => x.wo_number === r.wo_number && x.tenant_id === r.tenant_id,
              );
              if (dup) return uniqueViolation('work order number exists');
            }
            if (table === 'job_orders') {
              const dup = (tables.job_orders || []).find(
                (x) => x.jo_number === r.jo_number && x.tenant_id === r.tenant_id,
              );
              if (dup) return uniqueViolation('jo number exists');
            }
            if (table === 'wo_items' && failItemInsertOnce && r.item_code === failItemInsertOnce) {
              failItemInsertOnce = null;
              const res = { data: null, error: { message: 'item insert failure (injected)' } };
              return { ...res, select: async () => res };
            }
          }
          const storedRows = incoming.map((r) => ({ ...r, id: r.id ?? crypto.randomUUID() }));
          (tables[table] = tables[table] || []).push(...storedRows);
          const res = { data: storedRows.map((r) => ({ ...r })), error: null };
          return { ...res, select: async () => res };
        },
        update: (patch: Row) => {
          const eqFilters: { col: string; val: unknown }[] = [];
          const apply = () => {
            const list = (tables[table] || []).filter((r) => eqFilters.every((f) => r[f.col] === f.val));
            for (const r of list) Object.assign(r, patch);
            return list;
          };
          const updChain: any = {
            eq: (col: string, val: unknown) => {
              eqFilters.push({ col, val });
              return updChain;
            },
            select: () => {
              const list = apply();
              return { data: list.map((r) => ({ ...r })), error: null };
            },
            then: (resolve: any) => {
              const list = apply();
              return Promise.resolve(resolve({ data: list.map((r) => ({ ...r })), error: null }));
            },
          };
          return updChain;
        },
        delete: () => {
          const eqFilters: { col: string; val: unknown }[] = [];
          const delChain: any = {
            eq: (col: string, val: unknown) => {
              eqFilters.push({ col, val });
              return delChain;
            },
            then: (resolve: any) => {
              tables[table] = (tables[table] || []).filter(
                (r) => !eqFilters.every((f) => r[f.col] === f.val),
              );
              return Promise.resolve(resolve({ data: [], error: null }));
            },
          };
          return delChain;
        },
        then: (resolve: any) => {
          const list = (tables[table] || []).filter((r) => filters.every((f) => r[f.col] === f.val));
          const start = (chain as any)._rangeStart ?? 0;
          const page = list.slice(start);
          return Promise.resolve(
            resolve({ data: page.map((r) => ({ ...r })), error: null, count: list.length }),
          );
        },
      };
      return chain;
    },
    rpc: async (fn: string, args: Record<string, unknown>) => {
      if (fn === 'rpc_wo_mutation_execute_v1') {
        const tenantId = args.p_tenant_id as string;
        const actorId = args.p_actor_id as string;
        const command = args.p_command as string;
        const idempotencyKey = args.p_idempotency_key as string;
        const payloadHash = args.p_payload_hash as string;
        const payload = (args.p_payload as Record<string, any>) || {};

        // 1. Idempotency claim with concurrency loop simulation
        let idemRow: Row;
        while (true) {
          const existingIdem = (tables.work_order_idempotency || []).find(
            (r) => r.tenant_id === tenantId && r.idempotency_key === idempotencyKey,
          );
          if (existingIdem) {
            if (existingIdem.payload_hash !== payloadHash || existingIdem.command !== command) {
              return {
                data: null,
                error: {
                  message: 'IDEMPOTENCY_CONFLICT: Idempotency key already used with different payload or command',
                },
              };
            }
            if (existingIdem.execution_status === 'COMPLETED') {
              return { data: existingIdem.result, error: null };
            }
            if (existingIdem.execution_status === 'IN_PROGRESS') {
              return {
                data: null,
                error: {
                  message: 'OPERATION_IN_PROGRESS: Request with this idempotency key is currently executing',
                },
              };
            }
          } else {
            idemRow = {
              tenant_id: tenantId,
              idempotency_key: idempotencyKey,
              command,
              payload_hash: payloadHash,
              execution_status: 'IN_PROGRESS',
              result: null,
              created_at: new Date().toISOString(),
            };
            (tables.work_order_idempotency = tables.work_order_idempotency || []).push(idemRow);
            break;
          }
        }

        // 2. Command execution
        if (command === 'WO_CREATE') {
          const woNumber = payload.woNumber;
          const customerId = payload.customerId;
          const salesOrderId = payload.salesOrderId;

          const so = (tables.sales_orders || []).find((r) => r.id === salesOrderId && r.tenant_id === tenantId);
          if (!so) {
            return { data: null, error: { message: 'SO_NOT_FOUND: Sales order not found' } };
          }
          const eligibleStatuses = ['CONFIRMED', 'IN_FULFILLMENT', 'PARTIALLY_FULFILLED'];
          if (!eligibleStatuses.includes(so.status)) {
            return {
              data: null,
              error: {
                message: `SO_STATUS_INELIGIBLE: Sales order status "${so.status}" is not eligible for new work order creation.`,
              },
            };
          }
          const eng = (tables.commercial_work_orders || []).find(
            (r) => r.id === so.engagement_id && r.tenant_id === tenantId,
          );
          if (!eng) {
            return { data: null, error: { message: 'SO_NOT_FOUND: Lineage not resolved' } };
          }
          if (eng.customer_id !== customerId) {
            return {
              data: null,
              error: { message: 'SO_CUSTOMER_MISMATCH: Customer does not match sales order' },
            };
          }

          const dupWo = (tables.work_orders || []).find(
            (r) => r.wo_number === woNumber && r.tenant_id === tenantId,
          );
          if (dupWo) {
            return { data: null, error: { message: 'DUPLICATE: Work order number already exists' } };
          }

          const woId = crypto.randomUUID();
          const woRow: Row = {
            id: woId,
            tenant_id: tenantId,
            wo_number: woNumber,
            customer_id: customerId,
            status: payload.status ?? 'draft',
            order_date: payload.orderDate ?? null,
            execution_date: payload.executionDate ?? null,
            execution_time: payload.executionTime ?? null,
            target_fulfillment_date: payload.targetFulfillmentDate ?? null,
            notes: payload.notes ?? null,
            transporter_id: payload.transporterId ?? null,
            region_id: payload.regionId ?? null,
            created_by: actorId,
            updated_by: actorId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          tables.work_orders.push(woRow);

          const auditId = crypto.randomUUID();
          if (!failAuditInsert) {
            tables.work_order_audit.push({
              id: auditId,
              tenant_id: tenantId,
              actor_id: actorId,
              command: 'WO_CREATE',
              target_id: woId,
              target_type: 'WORK_ORDER',
              previous_state: {},
              new_state: {
                woNumber,
                customerId,
                salesOrderId,
                status: payload.status ?? 'draft',
              },
              idempotency_key: idempotencyKey,
              created_at: new Date().toISOString(),
            });
          }

          const stages = [
            { stage: 'work_order', status: 'SUCCEEDED', id: woId },
            {
              stage: 'audit',
              status: failAuditInsert ? 'FAILED' : 'SUCCEEDED',
              id: auditId,
              error: failAuditInsert ? 'Audit record not persisted.' : undefined,
            },
            { stage: 'idempotency', status: 'SUCCEEDED' },
          ];

          const result = {
            success: true,
            outcome: failAuditInsert ? 'PARTIAL' : 'SUCCEEDED',
            stages,
            workOrder: {
              id: woId,
              tenantId,
              woNumber,
              customerId,
              status: payload.status ?? 'draft',
              orderDate: payload.orderDate ?? null,
              executionDate: payload.executionDate ?? null,
              executionTime: payload.executionTime ?? null,
              targetFulfillmentDate: payload.targetFulfillmentDate ?? null,
              notes: payload.notes ?? null,
              transporterId: payload.transporterId ?? null,
              createdAt: woRow.created_at,
              updatedAt: woRow.updated_at,
              createdBy: actorId,
            },
            auditId,
          };

          idemRow.execution_status = 'COMPLETED';
          idemRow.result = result;
          return { data: result, error: null };
        }

        if (command === 'WO_UPDATE') {
          const woId = payload.workOrderId;
          const wo = (tables.work_orders || []).find((r) => r.id === woId && r.tenant_id === tenantId);
          if (!wo) {
            return { data: null, error: { message: 'NOT_FOUND: Work order not found' } };
          }
          if (payload.status) wo.status = payload.status;
          if (payload.woNumber) wo.wo_number = payload.woNumber;
          wo.updated_at = new Date().toISOString();

          const result = { success: true, workOrder: { ...wo } };
          idemRow.execution_status = 'COMPLETED';
          idemRow.result = result;
          return { data: result, error: null };
        }

        if (command === 'WO_ITEM_UPSERT') {
          const woId = payload.workOrderId;
          const parentWo = (tables.work_orders || []).find((r) => r.id === woId && r.tenant_id === tenantId);
          if (!parentWo) {
            return { data: null, error: { message: 'NOT_FOUND: Work order not found' } };
          }

          const itemResults: any[] = [];
          for (const item of payload.items || []) {
            if (failItemInsertOnce && item.itemCode === failItemInsertOnce) {
              failItemInsertOnce = null;
              return {
                data: {
                  success: false,
                  code: 'PARTIAL',
                  outcome: 'PARTIAL',
                  items: itemResults.concat([
                    { clientKey: item.clientKey, id: null, status: 'FAILED', error: 'Injected failure' },
                  ]),
                  error: 'Item stage failed at injected failure. retry with the same idempotency key.',
                },
                error: null,
              };
            }

            let itemId = item.id;
            if (itemId) {
              const existingItem = (tables.wo_items || []).find(
                (r) => r.id === itemId && r.tenant_id === tenantId,
              );
              if (!existingItem) {
                return { data: null, error: { message: 'NOT_FOUND: Referenced item not found' } };
              }
              Object.assign(existingItem, {
                item_code: item.itemCode,
                sbu_type: item.sbuType,
                unit_price: item.unitPrice,
                total_revenue: item.totalRevenue,
              });
            } else {
              itemId = crypto.randomUUID();
              tables.wo_items.push({
                id: itemId,
                tenant_id: tenantId,
                wo_id: woId,
                item_code: item.itemCode,
                sbu_type: item.sbuType,
                unit_price: item.unitPrice,
                total_revenue: item.totalRevenue,
              });
            }

            if (Array.isArray(item.manifests)) {
              tables.wo_item_manifests = (tables.wo_item_manifests || []).filter(
                (m) => m.wo_item_id !== itemId,
              );
              for (const m of item.manifests) {
                tables.wo_item_manifests.push({
                  id: crypto.randomUUID(),
                  tenant_id: tenantId,
                  wo_item_id: itemId,
                  product_sku_id: m.productSkuId,
                  quantity: m.quantity,
                });
              }
            }
            itemResults.push({ clientKey: item.clientKey, id: itemId, status: 'SUCCEEDED' });
          }

          const result = {
            success: true,
            outcome: 'SUCCEEDED',
            items: itemResults,
            stages: [
              { stage: 'items', status: 'SUCCEEDED' },
              { stage: 'audit', status: 'SUCCEEDED' },
              { stage: 'idempotency', status: 'SUCCEEDED' },
            ],
          };
          idemRow.execution_status = 'COMPLETED';
          idemRow.result = result;
          return { data: result, error: null };
        }

        if (command === 'JO_CREATE') {
          const woItemId = payload.woItemId;
          const joNumber = payload.joNumber;
          const woItem = (tables.wo_items || []).find((r) => r.id === woItemId && r.tenant_id === tenantId);
          if (!woItem) {
            return { data: null, error: { message: 'NOT_FOUND: Item not found' } };
          }

          const existingJo = (tables.job_orders || []).find(
            (r) => r.jo_number === joNumber && r.tenant_id === tenantId,
          );
          if (existingJo) {
            if (existingJo.wo_item_id !== woItemId) {
              return { data: null, error: { message: 'DUPLICATE: jo number exists for another item' } };
            }
            if (Array.isArray(payload.routes)) {
              tables.job_routes = (tables.job_routes || []).filter(
                (r) => r.job_order_id !== existingJo.id,
              );
              for (const route of payload.routes) {
                tables.job_routes.push({
                  id: crypto.randomUUID(),
                  job_order_id: existingJo.id,
                  ...route,
                });
              }
            }
            const auditId = crypto.randomUUID();
            tables.work_order_audit.push({
              id: auditId,
              tenant_id: tenantId,
              actor_id: actorId,
              command: 'JO_CREATE',
              target_id: existingJo.id,
              target_type: 'JOB_ORDER',
              previous_state: { joNumber: existingJo.jo_number, woItemId: existingJo.wo_item_id, reconciled: true },
              new_state: { joNumber, woItemId, reconciled: true },
              idempotency_key: idempotencyKey,
              created_at: new Date().toISOString(),
            });

            const result = {
              success: true,
              outcome: 'SUCCEEDED',
              stages: [
                { stage: 'readback', status: 'SUCCEEDED', id: existingJo.id },
                { stage: 'routes', status: 'SUCCEEDED' },
                { stage: 'audit', status: 'SUCCEEDED', id: auditId },
                { stage: 'idempotency', status: 'SUCCEEDED' },
              ],
              auditId,
            };
            idemRow!.execution_status = 'COMPLETED';
            idemRow!.result = result;
            return { data: result, error: null };
          }

          const joId = crypto.randomUUID();
          const joRow: Row = {
            id: joId,
            tenant_id: tenantId,
            wo_item_id: woItemId,
            jo_number: joNumber,
            status: payload.status ?? 'pending',
            total_stops: payload.totalStops ?? 0,
            sbu_type: payload.sbuType ?? 'TRUCKING',
            created_at: new Date().toISOString(),
          };
          tables.job_orders.push(joRow);

          if (Array.isArray(payload.routes)) {
            for (const route of payload.routes) {
              tables.job_routes.push({
                id: crypto.randomUUID(),
                job_order_id: joId,
                ...route,
              });
            }
          }

          const result = {
            success: true,
            outcome: 'SUCCEEDED',
            stages: [
              { stage: 'job_order', status: 'SUCCEEDED', id: joId },
              { stage: 'routes', status: 'SUCCEEDED' },
              { stage: 'audit', status: 'SUCCEEDED' },
              { stage: 'idempotency', status: 'SUCCEEDED' },
            ],
          };
          idemRow.execution_status = 'COMPLETED';
          idemRow.result = result;
          return { data: result, error: null };
        }
      }
      return { data: null, error: null };
    },
  };
}

describe('SO-Mandatory Trucking Slice 1 (Phase 3C)', () => {
  beforeEach(() => {
    resetDb();
    _setWorkOrderMutationDbClient(makeClient());
  });

  afterEach(() => {
    _setWorkOrderMutationDbClient(null);
    resetDb();
  });

  const createInput = (overrides: Record<string, unknown> = {}) => ({
    woNumber: 'WO-SLICE-001',
    customerId: CUSTOMER,
    salesOrderId: SO_ID,
    ...overrides,
  });

  it('S1-01: valid same-tenant eligible SO creates WO with evidence-grade audit', async () => {
    const result = await WorkOrderMutationService.create(ctx(), createInput(), {
      idempotencyKey: 's1-01-key',
    });
    expect(result.success).toBe(true);
    expect(result.outcome).toBe('SUCCEEDED');
    expect(result.workOrder?.tenantId).toBe(TENANT);
    expect(result.stages?.every((s) => s.status === 'SUCCEEDED')).toBe(true);
    const wo = tables.work_orders[0];
    expect(wo.tenant_id).toBe(TENANT);
    expect(wo.created_by).toBe(USER);
    const audit = tables.work_order_audit[0];
    expect(audit.command).toBe('WO_CREATE');
    expect(audit.tenant_id).toBe(TENANT);
    expect(audit.new_state.salesOrderId).toBe(SO_ID);
    expect(wo.sales_order_id).toBeUndefined();
  });

  it('S1-02: missing salesOrderId is rejected (SO_REQUIRED)', async () => {
    const result = await WorkOrderMutationService.create(
      ctx(),
      createInput({ salesOrderId: undefined }),
      { idempotencyKey: 's1-02-key' },
    );
    expect(result.success).toBe(false);
    expect(result.code).toBe('SO_REQUIRED');
    expect(result.outcome).toBe('FAILED');
    expect(tables.work_orders).toHaveLength(0);
  });

  it('S1-03: cross-tenant SO returns SO_NOT_FOUND without existence disclosure', async () => {
    tables.sales_orders.push({
      id: 'ffffffff-1111-4222-8333-444444444444',
      tenant_id: '99999999-9999-4999-8999-999999999999',
      status: 'CONFIRMED',
      engagement_id: ENG_ID,
    });
    const otherTenantSo = await WorkOrderMutationService.create(
      ctx(),
      createInput({ salesOrderId: 'ffffffff-1111-4222-8333-444444444444' }),
      { idempotencyKey: 's1-03-key' },
    );
    expect(otherTenantSo.success).toBe(false);
    expect(otherTenantSo.code).toBe('SO_NOT_FOUND');

    const missingSo = await WorkOrderMutationService.create(
      ctx(),
      createInput({ salesOrderId: 'eeeeeeee-9999-4999-8999-999999999999' }),
      { idempotencyKey: 's1-03b-key' },
    );
    expect(missingSo.code).toBe('SO_NOT_FOUND');
    expect(otherTenantSo.code).toBe(missingSo.code);
  });

  it('S1-04: ineligible SO status is rejected (SO_STATUS_INELIGIBLE)', async () => {
    for (const bad of ['DRAFT', 'CANCELLED', 'CLOSED', 'FULFILLED']) {
      tables.sales_orders[0].status = bad;
      const result = await WorkOrderMutationService.create(
        ctx(),
        createInput({ woNumber: `WO-BAD-${bad}` }),
        { idempotencyKey: `s1-04-${bad}` },
      );
      expect(result.success).toBe(false);
      expect(result.code).toBe('SO_STATUS_INELIGIBLE');
      expect(result.error).toContain(bad);
    }
    tables.sales_orders[0].status = 'CONFIRMED';
  });

  it('S1-05: customer mismatch between SO engagement and WO is rejected', async () => {
    tables.commercial_work_orders[0].customer_id = 'dddddddd-9999-4999-8999-999999999999';
    const result = await WorkOrderMutationService.create(ctx(), createInput(), {
      idempotencyKey: 's1-05-key',
    });
    expect(result.success).toBe(false);
    expect(result.code).toBe('SO_CUSTOMER_MISMATCH');
    expect(tables.work_orders).toHaveLength(0);
  });

  it('S1-06: unauthorized caller is denied by permission gate (before any SO/DB work)', async () => {
    await expect(
      WorkOrderMutationService.create(noPermCtx(), createInput(), { idempotencyKey: 's1-06-key' }),
    ).rejects.toThrow();
    expect(tables.work_orders).toHaveLength(0);
  });

  it('S1-07: stable idempotency key is REQUIRED; replay returns UNKNOWN + readback guidance', async () => {
    const noKey = await WorkOrderMutationService.create(ctx(), createInput(), undefined);
    expect(noKey.success).toBe(false);
    expect(noKey.code).toBe('VALIDATION_FAILED');

    const first = await WorkOrderMutationService.create(ctx(), createInput(), {
      idempotencyKey: 's1-07-key',
    });
    expect(first.success).toBe(true);
    const replay = await WorkOrderMutationService.create(ctx(), createInput(), {
      idempotencyKey: 's1-07-key',
    });
    // Option C (Phase 3D.4 Frozen Contract): exact replay returns cached result
    expect(replay.success).toBe(true);
    expect(replay.outcome).toBe('SUCCEEDED');
    expect(replay.workOrder?.id).toBe(first.workOrder?.id);
    expect(tables.work_orders).toHaveLength(1);

    // Conflict replay (different payload) returns IDEMPOTENCY_CONFLICT
    const conflictReplay = await WorkOrderMutationService.create(
      ctx(),
      createInput({ notes: 'DIFFERENT_PAYLOAD_NOTE' }),
      { idempotencyKey: 's1-07-key' },
    );
    expect(conflictReplay.success).toBe(false);
    expect(conflictReplay.code).toBe('IDEMPOTENCY_CONFLICT');
    expect(conflictReplay.error).toContain('Idempotency key already used');
    expect(tables.work_orders).toHaveLength(1);
  });

  it('S1-08: audit persistence failure is observable (success but PARTIAL)', async () => {
    failAuditInsert = true;
    const result = await WorkOrderMutationService.create(
      ctx(),
      createInput({ woNumber: 'WO-AUDIT-FAIL' }),
      { idempotencyKey: 's1-08-key' },
    );
    expect(result.success).toBe(true);
    expect(result.outcome).toBe('PARTIAL');
    expect(result.stages?.find((s) => s.stage === 'audit')?.status).toBe('FAILED');
    expect(tables.work_orders).toHaveLength(1);
    expect(tables.work_order_audit).toHaveLength(0);
  });

  it('S1-09: HTTP layer maps SO errors to 400 with outcome preserved', async () => {
    const res = await WorkOrderMutationHttp.handleMutation(ctx(), {
      command: 'WO_CREATE',
      input: createInput({ salesOrderId: 'eeeeeeee-9999-4999-8999-999999999999' }) as any,
      idempotencyKey: 's1-09-key',
    });
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('SO_NOT_FOUND');
    expect(res.error?.statusCode).toBe(400);
    expect(res.outcome).toBe('FAILED');
  });

  // ---------------------------------------------------------------------------
  // S2: WO_ITEM_UPSERT
  // ---------------------------------------------------------------------------

  const seedWo = (id = '11111111-2222-4333-8444-555555555555') => {
    tables.work_orders.push({
      id,
      tenant_id: TENANT,
      wo_number: 'WO-SEED-001',
      customer_id: CUSTOMER,
      status: 'draft',
    });
    return id;
  };

  const item = (i: number, extra: Record<string, unknown> = {}) => ({
    clientKey: String(i),
    itemCode: `WO-SEED-001/TR0${i}`,
    sbuType: 'TRUCKING',
    maxJoCount: 1,
    unitPrice: 100,
    totalRevenue: 100,
    status: 'draft',
    itemData: {},
    manifests: null,
    ...extra,
  });

  it('S1-10: WO_ITEM_UPSERT writes items + conditional manifests with tenant scoping', async () => {
    const woId = seedWo();
    const result = await WorkOrderMutationService.woItemUpsert(
      ctx(),
      {
        workOrderId: woId,
        items: [
          item(0, {
            manifests: [
              {
                productSkuId: 'sku-1',
                quantity: 2,
                unitWeightKg: 1,
                unitVolumeM3: 1,
                notes: null,
                locationCode: 'A',
                inventoryId: null,
                batchNumber: null,
                earliestExpiry: null,
              },
            ],
          }),
          item(1, { manifests: null }),
        ],
      },
      { idempotencyKey: 's1-10-key' },
    );
    expect(result.success).toBe(true);
    expect(result.outcome).toBe('SUCCEEDED');
    expect(result.items).toHaveLength(2);
    expect(result.items?.every((r) => r.status === 'SUCCEEDED')).toBe(true);
    expect(tables.wo_items).toHaveLength(2);
    expect(tables.wo_items.every((r) => r.tenant_id === TENANT && r.wo_id === woId)).toBe(true);
    expect(tables.wo_item_manifests).toHaveLength(1);
    expect(tables.wo_item_manifests[0].tenant_id).toBe(TENANT);
    expect(tables.wo_item_manifests[0].wo_item_id).toBe(result.items?.[0]?.id);
  });

  it('S1-11: item batch PARTIAL stops at first failure, keeps earlier rows (no auto-compensation)', async () => {
    const woId = seedWo();
    failItemInsertOnce = 'WO-SEED-001/TR01';
    const result = await WorkOrderMutationService.woItemUpsert(
      ctx(),
      { workOrderId: woId, items: [item(0), item(1), item(2)] },
      { idempotencyKey: 's1-11-key' },
    );
    expect(result.success).toBe(false);
    expect(result.code).toBe('PARTIAL');
    expect(result.outcome).toBe('PARTIAL');
    expect(result.items?.[0]?.status).toBe('SUCCEEDED');
    expect(result.items?.[1]?.status).toBe('FAILED');
    expect(result.items?.[2]).toBeUndefined();
    expect(tables.wo_items).toHaveLength(1);
    expect(result.error).toContain('retry with the same idempotency key');
  });

  it('S1-12: cross-tenant parent WO is rejected (NOT_FOUND) before any write', async () => {
    const foreignWo = '12121212-3333-4444-8555-666666666666';
    tables.work_orders.push({
      id: foreignWo,
      tenant_id: '99999999-9999-4999-8999-999999999999',
      wo_number: 'X',
      status: 'draft',
    });
    const result = await WorkOrderMutationService.woItemUpsert(
      ctx(),
      { workOrderId: foreignWo, items: [item(0)] },
      { idempotencyKey: 's1-12-key' },
    );
    expect(result.success).toBe(false);
    expect(result.code).toBe('NOT_FOUND');
    expect(tables.wo_items).toHaveLength(0);
  });

  it('S1-13: WO_ITEM_UPSERT requires stable idempotency key', async () => {
    const woId = seedWo();
    const result = await WorkOrderMutationService.woItemUpsert(
      ctx(),
      { workOrderId: woId, items: [item(0)] },
      undefined,
    );
    expect(result.success).toBe(false);
    expect(result.code).toBe('VALIDATION_FAILED');
    expect(tables.wo_items).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // S3: JO_CREATE
  // ---------------------------------------------------------------------------

  const seedItemForJo = () => {
    const woId = seedWo();
    const itemId = '22222222-3333-4444-8555-777777777777';
    tables.wo_items.push({
      id: itemId,
      tenant_id: TENANT,
      wo_id: woId,
      sbu_type: 'TRUCKING',
      item_code: 'WO-SEED-001/TR01',
    });
    return { woId, itemId };
  };

  it('S1-14: JO_CREATE links JO to verified WO item with routes and tenant scoping', async () => {
    const { itemId } = seedItemForJo();
    const result = await WorkOrderMutationService.createJobOrder(
      ctx(),
      {
        woItemId: itemId,
        joNumber: 'WO-SEED-001-01',
        sbuType: 'TRUCKING',
        status: 'pending',
        totalStops: 2,
        routes: [
          { sequence: 1, stopType: 'PICKUP', sourceType: 'MD_LOCATION', locationName: 'A', latitude: 1, longitude: 2 },
          { sequence: 2, stopType: 'DROPOFF', sourceType: 'MD_LOCATION', locationName: 'B', latitude: 3, longitude: 4 },
        ],
      },
      { idempotencyKey: 's1-14-key' },
    );
    expect(result.success).toBe(true);
    expect(result.outcome).toBe('SUCCEEDED');
    expect(tables.job_orders).toHaveLength(1);
    const jo = tables.job_orders[0];
    expect(jo.tenant_id).toBe(TENANT);
    expect(jo.wo_item_id).toBe(itemId);
    expect(jo.total_stops).toBe(2);
    expect(tables.job_routes).toHaveLength(2);
    expect(tables.job_routes.every((r) => r.job_order_id === jo.id)).toBe(true);
  });

  it('S1-15: JO retry/readback never duplicates and preserves existing JO attributes (L2)', async () => {
    const { itemId } = seedItemForJo();
    const existingJoId = '33333333-4444-4555-8666-888888888888';
    tables.job_orders.push({
      id: existingJoId,
      tenant_id: TENANT,
      wo_item_id: itemId,
      jo_number: 'WO-SEED-001-01',
      status: 'assigned',
      fleet_id: 'FLEET-KEEP-ME',
      driver_id: 'DRIVER-KEEP-ME',
    });
    const result = await WorkOrderMutationService.createJobOrder(
      ctx(),
      {
        woItemId: itemId,
        joNumber: 'WO-SEED-001-01',
        routes: [{ sequence: 1, stopType: 'PICKUP', locationName: 'X' }],
      },
      { idempotencyKey: 's1-15-key' },
    );
    expect(result.success).toBe(true);
    expect(tables.job_orders).toHaveLength(1);
    const jo = tables.job_orders[0];
    expect(jo.fleet_id).toBe('FLEET-KEEP-ME');
    expect(jo.driver_id).toBe('DRIVER-KEEP-ME');
    expect(jo.status).toBe('assigned');
    expect(tables.job_routes).toHaveLength(1);
    expect(result.auditId).toBeDefined();
    expect(tables.work_order_audit).toHaveLength(1);
    const audit = tables.work_order_audit[0];
    expect(audit.command).toBe('JO_CREATE');
    expect(audit.target_id).toBe(existingJoId);
    expect(audit.target_type).toBe('JOB_ORDER');
    expect((audit.new_state as any).reconciled).toBe(true);
  });

  it('S1-16: JO number collision with a different WO item is rejected (DUPLICATE)', async () => {
    const { itemId } = seedItemForJo();
    const otherWoId = seedWo('44444444-5555-4666-8777-999999999999');
    tables.wo_items.push({
      id: '55555555-6666-4777-8888-111111111111',
      tenant_id: TENANT,
      wo_id: otherWoId,
      sbu_type: 'TRUCKING',
      item_code: 'OTHER/TR01',
    });
    const first = await WorkOrderMutationService.createJobOrder(
      ctx(),
      { woItemId: itemId, joNumber: 'WO-SEED-001-01' },
      { idempotencyKey: 's1-16-key' },
    );
    expect(first.success).toBe(true);
    const clash = await WorkOrderMutationService.createJobOrder(
      ctx(),
      { woItemId: '55555555-6666-4777-8888-111111111111', joNumber: 'WO-SEED-001-01' },
      { idempotencyKey: 's1-16b-key' },
    );
    expect(clash.success).toBe(false);
    expect(clash.code).toBe('DUPLICATE');
  });

  it('S1-17: cross-tenant wo_item is rejected before JO write', async () => {
    const foreignItem = '66666666-7777-4888-8999-222222222222';
    tables.wo_items.push({
      id: foreignItem,
      tenant_id: '99999999-9999-4999-8999-999999999999',
      wo_id: 'x',
      sbu_type: 'TRUCKING',
      item_code: 'F',
    });
    const result = await WorkOrderMutationService.createJobOrder(
      ctx(),
      { woItemId: foreignItem, joNumber: 'ANY-01' },
      { idempotencyKey: 's1-17-key' },
    );
    expect(result.success).toBe(false);
    expect(result.code).toBe('NOT_FOUND');
    expect(tables.job_orders).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // S4: Natural-key constraints + compatibility
  // ---------------------------------------------------------------------------

  it('S1-18: verified schema UNIQUE constraints back natural-key readback (L3-9)', () => {
    const jobOrdersSql = readFileSync('supabase/schemas/public/tables/job_orders.sql', 'utf8');
    expect(jobOrdersSql).toContain('UNIQUE (tenant_id, jo_number)');
    const workOrdersSql = readFileSync('supabase/schemas/public/tables/work_orders.sql', 'utf8');
    expect(workOrdersSql).toContain('UNIQUE (tenant_id, wo_number)');
  });

  it('S1-19: existing WO_UPDATE contract still works (response compatibility)', async () => {
    const woId = seedWo();
    const result = await WorkOrderMutationService.update(ctx(), woId, { status: 'confirmed' });
    expect(result.success).toBe(true);
    expect(tables.work_orders.find((r) => r.id === woId)?.status).toBe('confirmed');

    const httpRes = await WorkOrderMutationHttp.handleMutation(ctx(), {
      command: 'WO_UPDATE',
      workOrderId: woId,
      input: { status: 'confirmed' },
    });
    expect(httpRes.success).toBe(true);
    expect(httpRes.error).toBeUndefined();
  });

  it('S1-20: new commands are routed; unknown-command behavior preserved', async () => {
    const unknown = await WorkOrderMutationHttp.handleMutation(ctx(), {
      command: 'NOPE' as any,
      input: {},
    });
    expect(unknown.success).toBe(false);
    expect(unknown.error?.code).toBe('UNKNOWN_COMMAND');

    const items = await WorkOrderMutationHttp.handleMutation(ctx(), {
      command: 'WO_ITEM_UPSERT',
      input: {} as any,
    });
    expect(items.error?.code).not.toBe('UNKNOWN_COMMAND');

    const jo = await WorkOrderMutationHttp.handleMutation(ctx(), {
      command: 'JO_CREATE',
      input: {} as any,
    });
    expect(jo.error?.code).not.toBe('UNKNOWN_COMMAND');
  });

  it('S1-21: concurrent in-progress execution returns OPERATION_IN_PROGRESS (HTTP 425)', async () => {
    const input = createInput();
    const payloadHash = computePayloadHash({
      woNumber: input.woNumber,
      customerId: input.customerId,
      salesOrderId: input.salesOrderId,
      status: 'draft',
      orderDate: null,
      executionDate: null,
      executionTime: null,
      orderTime: null,
      regionId: null,
      targetFulfillmentDate: null,
      notes: null,
      transporterId: null,
      reason: null,
      correlationId: null,
    });

    // Seed an in-progress idempotency record with the matching payload hash
    tables.work_order_idempotency.push({
      tenant_id: TENANT,
      idempotency_key: 's1-21-in-progress-key',
      command: 'WO_CREATE',
      payload_hash: payloadHash,
      execution_status: 'IN_PROGRESS',
      result: null,
      created_at: new Date().toISOString(),
    });

    const httpRes = await WorkOrderMutationHttp.handleMutation(ctx(), {
      command: 'WO_CREATE',
      input: input as any,
      idempotencyKey: 's1-21-in-progress-key',
    });
    expect(httpRes.success).toBe(false);
    expect(httpRes.error?.code).toBe('OPERATION_IN_PROGRESS');
    expect(httpRes.error?.statusCode).toBe(425);
    expect(httpRes.outcome).toBe('UNKNOWN');
  });

  it('S1-22: payload hash conflict returns IDEMPOTENCY_CONFLICT (HTTP 409)', async () => {
    // Seed a completed idempotency record with a different payload hash
    tables.work_order_idempotency.push({
      tenant_id: TENANT,
      idempotency_key: 's1-22-conflict-key',
      command: 'WO_CREATE',
      payload_hash: 'different-hash',
      execution_status: 'COMPLETED',
      result: { success: true },
      created_at: new Date().toISOString(),
    });

    const httpRes = await WorkOrderMutationHttp.handleMutation(ctx(), {
      command: 'WO_CREATE',
      input: createInput() as any,
      idempotencyKey: 's1-22-conflict-key',
    });
    expect(httpRes.success).toBe(false);
    expect(httpRes.error?.code).toBe('IDEMPOTENCY_CONFLICT');
    expect(httpRes.error?.statusCode).toBe(409);
    expect(httpRes.outcome).toBe('FAILED');
  });
});

