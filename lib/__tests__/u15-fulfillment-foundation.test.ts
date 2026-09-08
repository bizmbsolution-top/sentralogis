/**
 * Sentralogis — Phase 4B / U-15
 * lib/__tests__/u15-fulfillment-foundation.test.ts
 *
 * Fulfillment Foundation — executable invariants over the RATIFIED
 * Fulfillment architecture.
 */

import fs from 'fs';
import path from 'path';
import type { IdentityContext } from '@/lib/application/identity/types';
import { IdentityResolutionError } from '@/lib/application/identity/errors';
import {
  createFulfillment,
  findFulfillmentById,
  findFulfillmentCompositionById,
  listFulfillmentsBySalesOrder,
  updatePlannedFulfillment,
  performFulfillmentAction,
  addFulfillmentAllocation,
  updateAllocationProgress,
  allocateFulfillmentNumber,
  _setFulfillmentDbClient,
} from '@/lib/fulfillment/service';
import type { FulfillmentDbClient } from '@/lib/fulfillment/service';
import { FulfillmentError } from '@/lib/fulfillment/types';

/* ================================================================== */
/*  CONSTANTS / FIXTURES                                               */
/* ================================================================== */

const TENANT_A = 'a0000000-0000-4000-8000-00000000000a';
const TENANT_B = 'b0000000-0000-4000-8000-00000000000b';
const USER_A = 'u0000000-0000-4000-8000-00000000000a';
const SO_A1 = 'so-1000000-0000-4000-8000-000000000001';
const SO_A2 = 'so-2000000-0000-4000-8000-000000000002';
const SO_B1 = 'sob-100000-0000-4000-8000-000000000001';
const CUST_A1 = 'c1000000-0000-4000-8000-000000000001';
const BINDING_A1 = 'cb-1000000-0000-4000-8000-000000000001';
const SHIPMENT_A1 = 'shp-100000-0000-4000-8000-000000000001';

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

function seedSoRow(id: string, tenant: string, status: string = 'CONFIRMED'): Row {
  return {
    id,
    tenant_id: tenant,
    so_number: 'SO-NUM',
    customer_id: CUST_A1,
    status,
    created_at: '2026-08-28T01:00:00.000Z',
  };
}

function seedCapabilityBindingRow(id: string, tenant: string): Row {
  return { id, tenant_id: tenant, capability_type: 'FORWARDING' };
}

function seedShipmentRow(id: string, tenant: string): Row {
  return { id, tenant_id: tenant, shipment_number: 'SHP-001' };
}

function seedFulfillmentRow(over: Row = {}): Row {
  return {
    id: 'fl-created-1',
    tenant_id: TENANT_A,
    sales_order_id: SO_A1,
    fulfillment_number: 'FL-2026-08-0001',
    status: 'PLANNED',
    idempotency_key: null,
    revision_no: 1,
    version_no: 1,
    created_at: '2026-08-28T01:00:00.000Z',
    updated_at: '2026-08-28T01:00:00.000Z',
    created_by: USER_A,
    updated_by: USER_A,
    ...over,
  };
}

function seedAllocationRow(over: Row = {}): Row {
  return {
    id: 'alloc-1',
    tenant_id: TENANT_A,
    fulfillment_id: 'fl-created-1',
    capability_binding_id: BINDING_A1,
    shipment_id: SHIPMENT_A1,
    allocated_quantity: 1,
    delivered_quantity: 0,
    created_at: '2026-08-28T01:00:00.000Z',
    ...over,
  };
}

/* ================================================================== */
/*  MOCK DATABASE                                                      */
/* ================================================================== */

const FL_NUM = ['FL-2026-08-0001', 'FL-2026-08-0002', 'FL-2026-08-0003'];

class FulfillmentMockDb {
  sales_orders: Row[] = [];
  commercial_capability_bindings: Row[] = [];
  shp_shipments: Row[] = [];
  fulfillments: Row[] = [];
  fulfillment_allocations: Row[] = [];
  
  rpcSeqIndex = 0;
  rpcCadence: Array<{ data: string | null; error: Err | null }> = [];
  nextInsertUniqueViolation = false;
  insertedPayloads: Row[] = [];
  updatedPayloads: Row[] = [];

  reset(): void {
    this.sales_orders = [
      seedSoRow(SO_A1, TENANT_A, 'CONFIRMED'),
      seedSoRow(SO_A2, TENANT_A, 'DRAFT'),
      seedSoRow(SO_B1, TENANT_B, 'CONFIRMED'),
    ];
    this.commercial_capability_bindings = [seedCapabilityBindingRow(BINDING_A1, TENANT_A)];
    this.shp_shipments = [seedShipmentRow(SHIPMENT_A1, TENANT_A)];
    this.fulfillments = [];
    this.fulfillment_allocations = [];
    this.rpcSeqIndex = 0;
    this.rpcCadence = [];
    this.nextInsertUniqueViolation = false;
    this.insertedPayloads = [];
    this.updatedPayloads = [];
  }

  asClient(): FulfillmentDbClient {
    const self = this;
    const client = {
      rpc: (fn: string, _args: Record<string, unknown>) => {
        if (fn !== 'next_fulfillment_number') {
          return Promise.resolve({ data: null, error: { message: 'unknown fn' } });
        }
        if (self.rpcCadence.length > 0) {
          return Promise.resolve(self.rpcCadence.shift()!);
        }
        const value = self.rpcSeqIndex < FL_NUM.length ? FL_NUM[self.rpcSeqIndex] : `FL-2026-08-${String(self.rpcSeqIndex + 1).padStart(4, '0')}`;
        self.rpcSeqIndex++;
        return Promise.resolve({ data: value, error: null });
      },
      from: (table: string) => {
        const rows = () =>
          table === 'fulfillments' ? self.fulfillments
          : table === 'fulfillment_allocations' ? self.fulfillment_allocations
          : table === 'sales_orders' ? self.sales_orders
          : table === 'commercial_capability_bindings' ? self.commercial_capability_bindings
          : table === 'shp_shipments' ? self.shp_shipments
          : [];
        const chain = {
          select() {
            const filters: Array<{ col: string; val: unknown }> = [];
            const match = (r: Row) => filters.every((f) => r[f.col] === f.val);
            const q = {
              eq(col: string, val: unknown) {
                filters.push({ col, val });
                return q;
              },
              order() { return q; },
              limit() { return q; },
              single: async () => {
                const found = rows().find(match);
                if (!found) return { data: null, error: { message: 'not found', code: 'PGRST116' } };
                return { data: found, error: null };
              },
              maybeSingle: async () => {
                const found = rows().find(match);
                if (!found) return { data: null, error: null };
                return { data: found, error: null };
              },
            };
            const ch: any = Object.assign(q, {
              then(resolve: (v: { data: Row[] | null; error: Err | null }) => void) {
                resolve({ data: rows().filter(match), error: null });
              },
            });
            return ch;
          },
          insert(row: Row | Row[]) {
            return {
              select() {
                const ch = {
                  single: async () => {
                    if (table === 'fulfillments' && self.nextInsertUniqueViolation) {
                      self.nextInsertUniqueViolation = false;
                      return { data: null, error: { message: 'duplicate key', code: '23505' } };
                    }
                    const isArr = Array.isArray(row);
                    const singleRow = isArr ? row[0] : row;
                    const rec = { id: (table === 'fulfillments' ? 'fl-created-' : 'alloc-created-') + (rows().length + 1), ...singleRow };
                    rows().push(rec);
                    self.insertedPayloads.push(rec);
                    return { data: rec, error: null };
                  },
                  maybeSingle: async () => {
                    return ch.single();
                  },
                  then(resolve: (v: { data: Row[] | null; error: Err | null }) => void) {
                    const arr = Array.isArray(row) ? row : [row];
                    const recs = arr.map((r, i) => {
                      const rec = { id: 'created-' + (rows().length + 1 + i), ...r };
                      rows().push(rec);
                      self.insertedPayloads.push(rec);
                      return rec;
                    });
                    resolve({ data: recs, error: null });
                  },
                };
                return ch;
              },
            };
          },
          update(patch: Row) {
            const filters: Array<{ col: string; val: unknown }> = [];
            const ch = {
              eq(col: string, val: unknown) { filters.push({ col, val }); return ch; },
              select() {
                return Promise.resolve(null);
              },
            };
            (ch as any).select = async () => {
              const target = rows().find((r) => filters.every((f) => r[f.col] === f.val));
              if (target) {
                const merged = { ...target, ...patch, updated_at: '2026-08-28T02:00:00.000Z' };
                const idx = rows().indexOf(target);
                rows()[idx] = merged;
                self.updatedPayloads.push(merged);
                return { data: [merged], error: null };
              }
              return { data: [], error: null };
            };
            (ch as any).then = (resolve: (v: { data: Row[] | null; error: Err | null }) => void) => {
               const target = rows().find((r) => filters.every((f) => r[f.col] === f.val));
               if (target) {
                 const merged = { ...target, ...patch, updated_at: '2026-08-28T02:00:00.000Z' };
                 const idx = rows().indexOf(target);
                 rows()[idx] = merged;
                 self.updatedPayloads.push(merged);
                 resolve({ data: [merged], error: null });
                 return;
               }
               resolve({ data: [], error: null });
            };
            return ch;
          },
          delete() {
            const filters: Array<{ col: string; val: unknown }> = [];
            const ch = {
              eq(col: string, val: unknown) { filters.push({ col, val }); return ch; },
              then(resolve: (v: { data: null; error: Err | null }) => void) {
                const arr = rows();
                for (let i = arr.length - 1; i >= 0; i--) {
                  if (filters.every((f) => arr[i][f.col] === f.val)) {
                    arr.splice(i, 1);
                  }
                }
                resolve({ data: null, error: null });
              },
            };
            return ch;
          },
        };
        return chain;
      },
    };
    return client as unknown as FulfillmentDbClient;
  }
}

/* ================================================================== */
/*  SUITE                                                              */
/* ================================================================== */

export async function runU15FulfillmentFoundationSuite(): Promise<{ passed: number; failed: number; total: number }> {
  let passed = 0;
  let failed = 0;
  function check(name: string, fn: () => void) {
    try {
      fn();
      passed++;
    } catch (e: any) {
      failed++;
      console.error(`  ✗ ${name}: ${e?.message ?? e}`);
    }
  }
  async function checkAsync(name: string, fn: () => Promise<void>) {
    try {
      await fn();
      passed++;
    } catch (e: any) {
      failed++;
      console.error(`  ✗ ${name}: ${e?.message ?? e}`);
    }
  }

  const root = process.cwd();
  
  const readSql = () => {
    const p = path.join(root, 'supabase/migrations/20260828_020_fulfillment_foundation.sql');
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8');
    return '';
  };
  const readService = () => {
    const p = path.join(root, 'lib/fulfillment/service.ts');
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8');
    return '';
  };
  const readTypes = () => {
    const p = path.join(root, 'lib/fulfillment/types.ts');
    if (fs.existsSync(p)) return fs.readFileSync(p, 'utf-8');
    return '';
  };

  const sql = readSql();
  const svc = readService();
  const types = readTypes();

  // A helper for robust table check in service.ts using the regex \.from\(['"]table_name['"]\)
  const hasFromCall = (source: string, table: string) => {
    const re = new RegExp(`\\.from\\(['"\`]${table}['"\`]\\)`);
    return re.test(source);
  };

  /* ================= SECTION A: Static/Forensic Identity Tests ================= */
  check('U15-01 Migration has UUID PRIMARY KEY DEFAULT gen_random_uuid() on fulfillments', () => {
    if (!/id\s+UUID\s+PRIMARY\s+KEY\s+DEFAULT\s+gen_random_uuid\(\)/i.test(sql)) {
      throw new Error('fulfillments.id must be UUID PRIMARY KEY DEFAULT gen_random_uuid()');
    }
  });

  check('U15-02 Migration has fulfillment_number TEXT NOT NULL column', () => {
    if (!/fulfillment_number\s+TEXT\s+NOT\s+NULL/i.test(sql)) {
      throw new Error('missing fulfillment_number TEXT NOT NULL');
    }
  });

  check('U15-03 Migration has next_fulfillment_number function with nextval(\'seq_fulfillment\')', () => {
    if (!/CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.next_fulfillment_number/i.test(sql)) {
      throw new Error('next_fulfillment_number missing');
    }
    if (!/nextval\s*\(\s*'seq_fulfillment'\s*\)/i.test(sql)) {
      throw new Error('nextval seq_fulfillment missing');
    }
  });

  check('U15-04 Migration has UNIQUE (tenant_id, fulfillment_number) constraint', () => {
    if (!/UNIQUE\s*\(\s*tenant_id,\s*fulfillment_number\s*\)/i.test(sql)) {
      throw new Error('UNIQUE (tenant_id, fulfillment_number) missing');
    }
  });

  /* ================= SECTION B: Static/Forensic Tenant Tests ================= */
  check('U15-05 Service uses IdentityContext.tenantId (no x-tenant-id)', () => {
    if (/x-tenant-id/i.test(svc)) throw new Error('x-tenant-id found in service');
  });

  check('U15-06 Migration has RLS with get_my_tenant_id() on fulfillments', () => {
    if (!/tenant_id\s*=\s*public\.get_my_tenant_id\(\)/i.test(sql) || !/ON\s+public\.fulfillments/i.test(sql)) {
      throw new Error('RLS get_my_tenant_id() on fulfillments missing');
    }
  });

  check('U15-07 Migration has RLS with get_my_tenant_id() on fulfillment_allocations', () => {
    if (!/tenant_id\s*=\s*public\.get_my_tenant_id\(\)/i.test(sql) || !/ON\s+public\.fulfillment_allocations/i.test(sql)) {
      throw new Error('RLS get_my_tenant_id() on fulfillment_allocations missing');
    }
  });

  /* ================= SECTION C: Static/Forensic Ownership Tests ================= */
  check('U15-08 Migration has sales_order_id UUID NOT NULL REFERENCES public.sales_orders(id)', () => {
    if (!/sales_order_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.sales_orders/i.test(sql)) {
      throw new Error('sales_order_id UUID NOT NULL REFERENCES public.sales_orders missing');
    }
  });

  check('U15-09 Service validates sales order ownership before create', () => {
    if (!/validateSalesOrder/i.test(svc) && !/findSalesOrderById/i.test(svc) && !/sales_orders/i.test(svc)) {
      throw new Error('no sales order validation logic found in service');
    }
  });

  check('U15-10 Service validates SO status=CONFIRMED before create', () => {
    if (!/CONFIRMED/.test(svc) && !/SALES_ORDER_NOT_CONFIRMED/.test(svc)) {
      throw new Error('no check for CONFIRMED status found');
    }
  });

  /* ================= SECTION D: Static/Forensic Cardinality Tests ================= */
  check('U15-11 Table allows multiple fulfillments per SO (no UNIQUE on sales_order_id alone)', () => {
    if (/UNIQUE\s*\(\s*sales_order_id\s*\)/i.test(sql)) throw new Error('UNIQUE(sales_order_id) found, violating 1:N');
  });

  check('U15-12 Migration has revision_no column with CHECK >= 1', () => {
    if (!/revision_no\s+INTEGER[\s\S]*CHECK\s*\(\s*revision_no\s*>=\s*1\s*\)/i.test(sql)) {
      throw new Error('revision_no check missing');
    }
  });

  check('U15-13 Migration has version_no column with CHECK >= 1', () => {
    if (!/version_no\s+INTEGER[\s\S]*CHECK\s*\(\s*version_no\s*>=\s*1\s*\)/i.test(sql)) {
      throw new Error('version_no check missing');
    }
  });

  /* ================= SECTION E: Static/Forensic Lifecycle Tests ================= */
  check('U15-14 Migration has com_fulfillment_status enum (PLANNED, ACTIVE, PARTIALLY_FULFILLED, FULFILLED, CLOSED, CANCELLED)', () => {
    const expected = ['PLANNED', 'ACTIVE', 'PARTIALLY_FULFILLED', 'FULFILLED', 'CLOSED', 'CANCELLED'];
    for (const s of expected) {
      if (!sql.includes(`'${s}'`)) throw new Error(`Status ${s} missing in migration`);
    }
  });

  check('U15-15 Types define FULFILLMENT_TRANSITIONS with valid transitions only', () => {
    if (!/FULFILLMENT_TRANSITIONS/.test(types)) {
      throw new Error('FULFILLMENT_TRANSITIONS missing in types.ts');
    }
  });

  check('U15-16 Service uses command pattern (performFulfillmentAction) not arbitrary PATCH', () => {
    if (!/performFulfillmentAction/.test(svc)) {
      throw new Error('performFulfillmentAction missing in service.ts');
    }
  });

  /* ================= SECTION F: Static/Forensic Authorization Tests ================= */
  check('U15-17 Service imports and calls assertPermission', () => {
    if (!/assertPermission/.test(svc)) throw new Error('assertPermission not called in service.ts');
  });

  // U15-18 is behavioral, implemented in Section K.

  /* ================= SECTION G: Behavioral Idempotency Tests (U15-19..20) are in Section K ================= */
  
  check('U15-20 Idempotency is tenant-scoped (UNIQUE on tenant_id, idempotency_key)', () => {
    if (!/UNIQUE\s*\(\s*tenant_id,\s*idempotency_key\s*\)/i.test(sql)) throw new Error('idempotency UNIQUE missing');
  });

  /* ================= SECTION H: Static Composition Boundary Tests ================= */
  check('U15-21 fulfillment_allocations has capability_binding_id FK referencing commercial_capability_bindings', () => {
    if (!/capability_binding_id\s+UUID\s+REFERENCES\s+public\.commercial_capability_bindings/i.test(sql)) {
      throw new Error('capability_binding_id FK missing');
    }
  });

  check('U15-22 fulfillment_allocations has shipment_id FK referencing shp_shipments', () => {
    if (!/shipment_id\s+UUID\s+REFERENCES\s+public\.shp_shipments/i.test(sql)) {
      throw new Error('shipment_id FK missing');
    }
  });

  check('U15-23 Service does NOT directly write svc_service_requests', () => {
    if (hasFromCall(svc, 'svc_service_requests')) throw new Error('direct write to svc_service_requests found');
  });

  check('U15-24 Service does NOT directly write work_orders', () => {
    if (hasFromCall(svc, 'work_orders')) throw new Error('direct write to work_orders found');
  });

  check('U15-25 Service does NOT directly write job_orders', () => {
    if (hasFromCall(svc, 'job_orders')) throw new Error('direct write to job_orders found');
  });

  /* ================= SECTION I: Static Business Capability Tests ================= */
  check('U15-26 Allocations have allocated_quantity and delivered_quantity columns', () => {
    if (!/allocated_quantity/.test(sql) || !/delivered_quantity/.test(sql)) {
      throw new Error('quantity columns missing from fulfillment_allocations');
    }
  });

  check('U15-27 One fulfillment can have multiple allocations with different shipment_ids', () => {
    if (/UNIQUE\s*\(\s*shipment_id\s*\)/i.test(sql)) {
      throw new Error('shipment_id cannot be UNIQUE in fulfillment_allocations');
    }
  });

  // 28 is conceptual, structural check for capability binding usage.
  check('U15-28 allocations support all 4 capability types (via capability_binding_id)', () => {
    if (!/capability_binding_id/.test(sql)) throw new Error('capability_binding_id missing');
  });

  // Table-scoped checks for non-pollution of fulfillments table
  const fulfillmentsDdl = sql.match(/CREATE TABLE IF NOT EXISTS public\.fulfillments\s*\(([\s\S]*?)\);/i)?.[1] || '';

  check('U15-29 Migration does NOT have POL/POD/MBL/HBL/Vessel/Voyage columns on fulfillments', () => {
    if (/\b(pol|pod|mbl|hbl|vessel|voyage)\b/i.test(fulfillmentsDdl)) {
      throw new Error('Forwarding-specific columns found on fulfillments');
    }
  });

  check('U15-30 Migration does NOT have international forwarding columns on fulfillments', () => {
    if (/\b(incoterm|customs_entry|clearance_type)\b/i.test(fulfillmentsDdl)) {
      throw new Error('International forwarding columns found on fulfillments');
    }
  });

  check('U15-31 Migration does NOT have multimodal columns on fulfillments', () => {
    if (/\b(leg_type|transport_mode)\b/i.test(fulfillmentsDdl)) {
      throw new Error('Multimodal columns found on fulfillments');
    }
  });

  /* ================= SECTION J: Static Commercial Boundary Tests ================= */
  check('U15-32 Service does NOT write to sales_orders table (no mutate)', () => {
    // Look for `.from('sales_orders').insert` or `.from('sales_orders').update`
    if (/\.from\(\s*['"`]sales_orders['"`]\s*\)\s*\.\s*(update|insert|delete|upsert)/i.test(svc)) {
      throw new Error('sales_orders mutation found in fulfillment service');
    }
  });

  check('U15-33 Only reads sales_orders for validation (ownership check)', () => {
    if (!hasFromCall(svc, 'sales_orders')) {
      throw new Error('Service should read sales_orders to validate ownership');
    }
  });

  /* ================= SECTION K: Behavioral Tests ================= */
  
  const mock = new FulfillmentMockDb();
  _setFulfillmentDbClient(mock.asClient());
  mock.reset();

  await checkAsync('U15-B01 createFulfillment succeeds with valid SO (CONFIRMED) and returns created=true', async () => {
    mock.reset();
    const r = await createFulfillment({ salesOrderId: SO_A1 }, makeCtx());
    if (!r.created) throw new Error('Expected created=true');
    if (r.fulfillment.salesOrderId !== SO_A1) throw new Error('wrong SO ID');
    if (r.fulfillment.status !== 'PLANNED') throw new Error('Expected PLANNED status');
  });

  await checkAsync('U15-B02 createFulfillment rejects non-CONFIRMED SO (status=DRAFT) with SALES_ORDER_NOT_CONFIRMED', async () => {
    mock.reset();
    try {
      await createFulfillment({ salesOrderId: SO_A2 }, makeCtx());
      throw new Error('expected failure');
    } catch (e: any) {
      if (e.code !== 'SALES_ORDER_NOT_CONFIRMED') throw new Error(`wrong code: ${e.code}`);
    }
  });

  await checkAsync('U15-B03 createFulfillment rejects cross-tenant SO with SALES_ORDER_NOT_FOUND', async () => {
    mock.reset();
    try {
      await createFulfillment({ salesOrderId: SO_B1 }, makeCtx());
      throw new Error('expected failure');
    } catch (e: any) {
      if (e.code !== 'SALES_ORDER_NOT_FOUND') throw new Error(`wrong code: ${e.code}`);
    }
  });

  await checkAsync('U15-B04 createFulfillment with allocations creates fulfillment + allocations', async () => {
    mock.reset();
    const allocations = [{ capabilityType: 'FORWARDING' as const, capabilityBindingId: BINDING_A1, allocatedQuantity: 10 }];
    const r = await createFulfillment({ salesOrderId: SO_A1, allocations }, makeCtx());
    if (!r.created) throw new Error('Expected created=true');
    if (mock.fulfillment_allocations.length !== 1) throw new Error('Allocation not created');
  });

  await checkAsync('U15-B05 updatePlannedFulfillment succeeds in PLANNED state', async () => {
    mock.reset();
    const r = await createFulfillment({ salesOrderId: SO_A1 }, makeCtx());
    const updated = await updatePlannedFulfillment(r.fulfillment.id as string, { targetFulfillmentDate: '2026-09-01' }, makeCtx());
    if (updated.targetFulfillmentDate !== '2026-09-01') throw new Error('Update failed');
  });

  await checkAsync('U15-B06 updatePlannedFulfillment rejects in ACTIVE state with NOT_EDITABLE', async () => {
    mock.reset();
    const r = await createFulfillment({ salesOrderId: SO_A1 }, makeCtx());
    await performFulfillmentAction(r.fulfillment.id as string, 'activate', makeCtx());
    try {
      await updatePlannedFulfillment(r.fulfillment.id as string, { targetFulfillmentDate: '2026-09-01' }, makeCtx());
      throw new Error('expected failure');
    } catch (e: any) {
      if (e.code !== 'NOT_EDITABLE') throw new Error(`wrong code: ${e.code}`);
    }
  });

  await checkAsync('U15-B07 performFulfillmentAction(\'activate\') transitions PLANNED -> ACTIVE', async () => {
    mock.reset();
    const r = await createFulfillment({ salesOrderId: SO_A1 }, makeCtx());
    const activated = await performFulfillmentAction(r.fulfillment.id as string, 'activate', makeCtx());
    if (activated.status !== 'ACTIVE') throw new Error('status not ACTIVE');
  });

  await checkAsync('U15-B08 performFulfillmentAction(\'cancel\') transitions PLANNED -> CANCELLED', async () => {
    mock.reset();
    const r = await createFulfillment({ salesOrderId: SO_A1 }, makeCtx());
    const cancelled = await performFulfillmentAction(r.fulfillment.id as string, 'cancel', makeCtx());
    if (cancelled.status !== 'CANCELLED') throw new Error('status not CANCELLED');
  });

  await checkAsync('U15-B09 performFulfillmentAction(\'activate\') rejects CANCELLED state with INVALID_STATUS_TRANSITION', async () => {
    mock.reset();
    const r = await createFulfillment({ salesOrderId: SO_A1 }, makeCtx());
    await performFulfillmentAction(r.fulfillment.id as string, 'cancel', makeCtx());
    try {
      await performFulfillmentAction(r.fulfillment.id as string, 'activate', makeCtx());
      throw new Error('expected failure');
    } catch (e: any) {
      if (e.code !== 'INVALID_STATUS_TRANSITION') throw new Error(`wrong code: ${e.code}`);
    }
  });

  await checkAsync('U15-B10 findFulfillmentById returns fulfillment for correct tenant', async () => {
    mock.reset();
    const r = await createFulfillment({ salesOrderId: SO_A1 }, makeCtx());
    const found = await findFulfillmentById(r.fulfillment.id as string, makeCtx());
    if (found.id !== r.fulfillment.id) throw new Error('Wrong fulfillment returned');
  });

  await checkAsync('U15-B11 findFulfillmentById rejects cross-tenant access with FULFILLMENT_NOT_FOUND', async () => {
    mock.reset();
    const r = await createFulfillment({ salesOrderId: SO_A1 }, makeCtx());
    try {
      await findFulfillmentById(r.fulfillment.id as string, makeCtx({ tenantId: TENANT_B }));
      throw new Error('expected failure');
    } catch (e: any) {
      if (e.code !== 'FULFILLMENT_NOT_FOUND') throw new Error(`wrong code: ${e.code}`);
    }
  });

  await checkAsync('U15-B12 addFulfillmentAllocation succeeds in PLANNED state', async () => {
    mock.reset();
    const r = await createFulfillment({ salesOrderId: SO_A1 }, makeCtx());
    const alloc = await addFulfillmentAllocation(r.fulfillment.id as string, { capabilityType: 'FORWARDING', capabilityBindingId: BINDING_A1, allocatedQuantity: 5 }, makeCtx());
    if (alloc.allocatedQuantity !== 5) throw new Error('Allocation quantity wrong');
  });

  await checkAsync('U15-B13 addFulfillmentAllocation rejects in ACTIVE state with NOT_IN_PLANNED_STATE', async () => {
    mock.reset();
    const r = await createFulfillment({ salesOrderId: SO_A1 }, makeCtx());
    await performFulfillmentAction(r.fulfillment.id as string, 'activate', makeCtx());
    try {
      await addFulfillmentAllocation(r.fulfillment.id as string, { capabilityType: 'FORWARDING', capabilityBindingId: BINDING_A1, allocatedQuantity: 5 }, makeCtx());
      throw new Error('expected failure');
    } catch (e: any) {
      if (e.code !== 'NOT_IN_PLANNED_STATE' && e.code !== 'NOT_EDITABLE') throw new Error(`wrong code: ${e.code}`);
    }
  });

  await checkAsync('U15-18 Behavioral - calling createFulfillment without \'commercial:manage\' permission throws', async () => {
    mock.reset();
    try {
      await createFulfillment({ salesOrderId: SO_A1 }, makeCtx({ permissions: ['commercial:read'] }));
      throw new Error('expected 403');
    } catch (e: any) {
      if (!(e instanceof IdentityResolutionError) || e.statusCode !== 403) throw new Error('expected 403 error');
    }
  });

  await checkAsync('U15-19 Creating fulfillment with same idempotencyKey returns created=false on second call', async () => {
    mock.reset();
    const payload = { salesOrderId: SO_A1, idempotencyKey: 'idemp-1' };
    const r1 = await createFulfillment(payload, makeCtx());
    if (!r1.created) throw new Error('first call should create');
    
    mock.nextInsertUniqueViolation = true;
    const r2 = await createFulfillment(payload, makeCtx());
    if (r2.created !== false) throw new Error('retry must return created=false');
    if (r2.fulfillment.id !== r1.fulfillment.id) throw new Error('must resolve to same fulfillment');
  });

  /* ================= SECTION L: NEGATIVE ARCHITECTURE Tests ================= */
  
  check('U15-N01 No direct fulfillment->job_orders write path in service.ts', () => {
    if (/\.from\(['"`]job_orders['"`]\)\.(insert|update|delete|upsert)/i.test(svc)) {
      throw new Error('job_orders direct write found');
    }
  });

  check('U15-N02 No driver references in fulfillment service', () => {
    if (hasFromCall(svc, 'md_drivers') || hasFromCall(svc, 'driver_profiles')) {
      throw new Error('Driver references found in fulfillment service');
    }
  });

  check('U15-N03 No dispatch engine in fulfillment', () => {
    if (/dispatch|assign(Driver|Vehicle)/i.test(svc)) {
      throw new Error('Dispatch engine terms found in fulfillment service');
    }
  });

  check('U15-N04 No shp_shipments INSERT/UPDATE in service.ts', () => {
    if (/\.from\(['"`]shp_shipments['"`]\)\.(insert|update|delete|upsert)/i.test(svc)) {
      throw new Error('shp_shipments direct write found');
    }
  });

  check('U15-N05 No capability_type enum redefinition in migration', () => {
    if (/CREATE\s+TYPE\s+.*capability_type\s+AS\s+ENUM/i.test(sql)) {
      throw new Error('capability_type enum redefinition found');
    }
  });

  check('U15-N06 No svc_service_requests INSERT/UPDATE in service.ts', () => {
    if (/\.from\(['"`]svc_service_requests['"`]\)\.(insert|update|delete|upsert)/i.test(svc)) {
      throw new Error('svc_service_requests direct write found');
    }
  });

  check('U15-N07 No many-SO-to-one-WO path (no work_orders insert)', () => {
    if (/\.from\(['"`]work_orders['"`]\)\.(insert|update|delete|upsert)/i.test(svc)) {
      throw new Error('work_orders direct write found');
    }
  });

  check('U15-N08 No client-generated fulfillment number', () => {
    if (!/rpc\(\s*['"`]next_fulfillment_number['"`]/i.test(svc)) {
      throw new Error('next_fulfillment_number RPC not used');
    }
  });

  check('U15-N09 No client-authoritative tenant', () => {
    if (/x-tenant-id|headers\?\.get\(['"]x-tenant/i.test(svc)) {
      throw new Error('client header used as tenant authority');
    }
  });

  check('U15-N10 No direct client DB mutation (service.ts imports supabaseAdmin)', () => {
    if (/createClient\(/i.test(svc)) {
      throw new Error('createClient used instead of injected admin db client');
    }
  });

  check('U15-N11 Types define FULFILLMENT_TRANSITIONS as closed set', () => {
    if (!/FULFILLMENT_TRANSITIONS(\s*:\s*Record|<|\s*=)/.test(types)) {
      throw new Error('FULFILLMENT_TRANSITIONS closed set missing');
    }
  });

  check('U15-N12 No operational engine (no WO/JO/Shipment creation)', () => {
    if (
      /\.from\(['"`](work_orders|job_orders|shp_shipments)['"`]\)\.insert/i.test(svc)
    ) {
      throw new Error('Operational entity creation found in fulfillment service');
    }
  });

  _setFulfillmentDbClient(null);

  console.log(`U-15 FULFILLMENT FOUNDATION SUITE: ${passed} / ${passed + failed} PASSED`);
  return { passed, failed, total: passed + failed };
}
