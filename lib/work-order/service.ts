/**
 * Sentralogis — Phase 3 / Unit 1
 * lib/work-order/service.ts
 *
 * Canonical Work Order read service for the WO/JO Execution Workspace.
 *
 * READ-ONLY: This service performs ONLY tenant-scoped SELECT queries
 * against the legacy operational tables (work_orders, wo_items, job_orders).
 * No mutations, no inserts, no updates, no deletes.
 *
 * Security invariants:
 * - Tenant is resolved EXCLUSIVELY from the trusted IdentityContext (U-01).
 * - Authorization via assertPermission (U-02).
 * - All SELECT queries include tenant_id = context.tenantId.
 * - PK is validated for UUID format before any query.
 * - Cross-tenant access is impossible (tenant filters on every query).
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { IdentityContext } from '@/lib/application/identity/types';
import { assertPermission } from '@/lib/application/identity/resolver';
import { sbuScopeToOperationalType, hasCrossSbuAuthority } from '@/lib/application/identity/roles';
import type {
  WorkOrder,
  WorkOrderItem,
  JobOrder,
  WorkOrderExecutionView,
  WorkOrderItemView,
  JobOrderView,
  WorkOrderView,
  WorkOrderReadErrorCode,
} from './types';
import { WorkOrderReadError } from './types';

// ============================================================================
// DATABASE CLIENT INJECTION (testability)
// ============================================================================

type DbRow = Record<string, unknown>;
interface DbError { message: string; code?: string }
interface DbListResult { data: DbRow[] | null; error: DbError | null }
interface DbSingleResult { data: DbRow | null; error: DbError | null }

export interface WorkOrderDbClient {
  from(table: string): {
    select(cols?: string): WorkOrderQueryChain;
    insert(row: DbRow | DbRow[]): WorkOrderInsertChain;
    update(row: DbRow): WorkOrderUpdateChain;
    delete(): WorkOrderDeleteChain;
  };
}

interface WorkOrderQueryChain extends PromiseLike<DbListResult> {
  eq(col: string, val: unknown): WorkOrderQueryChain;
  in(col: string, vals: unknown[]): WorkOrderQueryChain;
  is(col: string, val: unknown | null): WorkOrderQueryChain;
  not(col: string, op: string, val: string): WorkOrderQueryChain;
  order(col: string, opts: { ascending: boolean }): WorkOrderQueryChain;
  range(start: number, end: number): WorkOrderQueryChain;
  single(): Promise<DbSingleResult>;
  maybeSingle(): Promise<DbSingleResult>;
}

interface WorkOrderInsertChain extends PromiseLike<DbListResult> {
  select(cols?: string): {
    single(): Promise<DbSingleResult>;
    maybeSingle(): Promise<DbSingleResult>;
  };
}

interface WorkOrderUpdateChain extends PromiseLike<DbListResult> {
  eq(col: string, val: unknown): WorkOrderUpdateChain;
  select(cols?: string): Promise<DbListResult>;
}

interface WorkOrderDeleteChain extends PromiseLike<DbListResult> {
  eq(col: string, val: unknown): WorkOrderDeleteChain;
}

let _client: WorkOrderDbClient = supabaseAdmin as unknown as WorkOrderDbClient;

export function _setWorkOrderDbClient(client: WorkOrderDbClient | null): void {
  _client = client ?? (supabaseAdmin as unknown as WorkOrderDbClient);
}

function db(): WorkOrderDbClient {
  return _client;
}

// ============================================================================
// UUID VALIDATION
// ============================================================================

const UUID_RE = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function validateUuid(value: string, field: string): void {
  if (!value || !UUID_RE.test(value)) {
    throw new WorkOrderReadError('VALIDATION_FAILED', 400, `${field} must be a valid UUID.`);
  }
}

// ============================================================================
// ROW MAPPERS
// ============================================================================

function mapWorkOrderRow(row: DbRow): WorkOrder {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    woNumber: String(row.wo_number),
    customerId: row.customer_id ? String(row.customer_id) : null,
    customerName: row.customer_name ? String(row.customer_name) : null,
    status: ((row.status as string) ?? 'draft') as any,
    orderDate: (row.order_date as string) ?? null,
    executionDate: (row.execution_date as string) ?? null,
    executionTime: (row.execution_time as string) ?? null,
    targetFulfillmentDate: (row.target_fulfillment_date as string) ?? null,
    notes: (row.notes as string) ?? null,
    transporterId: row.transporter_id ? String(row.transporter_id) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    createdBy: row.created_by ? String(row.created_by) : null,
    assignedAt: (row.assigned_at as string) ?? null,
    submittedAt: (row.submitted_at as string) ?? null,
    completedAt: (row.completed_at as string) ?? null,
  };
}

function mapWorkOrderView(row: DbRow): WorkOrderView {
  return {
    id: String(row.id),
    woNumber: String(row.wo_number),
    status: ((row.status as string) ?? 'draft') as any,
    customerName: row.customer_name ? String(row.customer_name) : null,
    orderDate: (row.order_date as string) ?? null,
    executionDate: (row.execution_date as string) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapWorkItemRow(row: DbRow): WorkOrderItem {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    woId: String(row.wo_id),
    itemCode: (row.item_code as string) ?? null,
    sbuType: ((row.sbu_type as string) ?? 'TRUCKING') as any,
    status: (row.status as string) ?? 'pending',
    maxJoCount: typeof row.max_jo_count === 'number' ? row.max_jo_count : null,
    unitPrice: typeof row.unit_price === 'number' ? row.unit_price : null,
    totalRevenue: typeof row.total_revenue === 'number' ? row.total_revenue : null,
    itemData: (row.item_data as Record<string, unknown> | null) ?? null,
    sbuMetadata: (row.sbu_metadata as Record<string, unknown> | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapJobOrderRow(row: DbRow): JobOrder {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    woItemId: String(row.wo_item_id),
    woId: row.wo_id ? String(row.wo_id) : '',
    joNumber: String(row.jo_number),
    status: ((row.status as string) ?? 'pending') as any,
    transporterId: row.transporter_id ? String(row.transporter_id) : null,
    transporterName: row.transporter_name ? String(row.transporter_name) : null,
    fleetId: row.fleet_id ? String(row.fleet_id) : null,
    fleetPlateNumber: row.plate_number ? String(row.plate_number) : null,
    driverId: row.driver_id ? String(row.driver_id) : null,
    driverName: row.driver_name ? String(row.driver_name) : null,
    driverPhone: row.driver_phone ? String(row.driver_phone) : null,
    containerNumber: (row.container_number as string) ?? null,
    basePrice: typeof row.base_price === 'number' ? row.base_price : null,
    purchasePrice: typeof row.purchase_price === 'number' ? row.purchase_price : null,
    vendorPrice: typeof row.vendor_price === 'number' ? row.vendor_price : null,
    notes: (row.notes as string) ?? null,
    assignedAt: (row.assigned_at as string) ?? null,
    acceptedAt: (row.accepted_at as string) ?? null,
    startedAt: (row.started_at as string) ?? null,
    completedAt: (row.completed_at as string) ?? null,
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : String(row.created_at),
    sbuType: row.sbu_type ? String(row.sbu_type) : null,
  };
}

function mapJobOrderView(row: DbRow): JobOrderView {
  return {
    id: String(row.id),
    joNumber: String(row.jo_number),
    status: ((row.status as string) ?? 'pending') as any,
    transporterName: row.transporter_name ? String(row.transporter_name) : null,
    fleetPlateNumber: row.plate_number ? String(row.plate_number) : null,
    driverName: row.driver_name ? String(row.driver_name) : null,
    driverPhone: row.driver_phone ? String(row.driver_phone) : null,
    containerNumber: (row.container_number as string) ?? null,
    basePrice: typeof row.base_price === 'number' ? row.base_price : null,
    createdAt: String(row.created_at),
    updatedAt: row.updated_at ? String(row.updated_at) : String(row.created_at),
    assignedAt: (row.assigned_at as string) ?? null,
    acceptedAt: (row.accepted_at as string) ?? null,
    startedAt: (row.started_at as string) ?? null,
    completedAt: (row.completed_at as string) ?? null,
  };
}

// ============================================================================
// READ SERVICES
// ============================================================================

export async function findWorkOrderById(
  context: IdentityContext,
  workOrderId: string,
): Promise<WorkOrder> {
  assertPermission(context, 'work_order:read');
  validateUuid(workOrderId, 'workOrderId');

  const { data, error } = await db()
    .from('work_orders')
    .select(
      `
      id, tenant_id, wo_number, customer_id, status, order_date, execution_date,
      execution_time, target_fulfillment_date, notes, transporter_id,
      created_at, updated_at, created_by, assigned_at, submitted_at, completed_at
      `,
    )
    .eq('id', workOrderId)
    .eq('tenant_id', context.tenantId)
    .maybeSingle();

  if (error || !data) {
    throw new WorkOrderReadError(
      'NOT_FOUND',
      404,
      `Work Order ${workOrderId} not found in tenant.`,
    );
  }

  // Explicit cross-SBU authority vs SBU-scoped / Non-SBU user check (Decision B & Section 5/7)
  if (!hasCrossSbuAuthority(context.role)) {
    if (!context.sbuScope) {
      throw new WorkOrderReadError(
        'NOT_FOUND',
        404,
        `Work Order ${workOrderId} not found in SBU scope.`,
      );
    }
    const expectedOperationalType = sbuScopeToOperationalType(context.sbuScope);
    const { data: itemRows, error: itemError } = await db()
      .from('wo_items')
      .select('id, sbu_type')
      .eq('wo_id', workOrderId)
      .eq('tenant_id', context.tenantId);

    if (itemError || !itemRows || itemRows.length === 0) {
      throw new WorkOrderReadError(
        'NOT_FOUND',
        404,
        `Work Order ${workOrderId} not found in SBU scope.`,
      );
    }

    const hasMatchingSbu = itemRows.some(
      (it) => it.sbu_type && String(it.sbu_type).toUpperCase() === expectedOperationalType,
    );
    if (!hasMatchingSbu) {
      throw new WorkOrderReadError(
        'NOT_FOUND',
        404,
        `Work Order ${workOrderId} not found in SBU scope.`,
      );
    }
  }

  return mapWorkOrderRow(data);
}

export async function findWorkOrderViewById(
  context: IdentityContext,
  workOrderId: string,
): Promise<WorkOrderView> {
  assertPermission(context, 'work_order:read');
  validateUuid(workOrderId, 'workOrderId');

  const { data, error } = await db()
    .from('work_orders')
    .select(
      `
      id, wo_number, status, order_date, execution_date, created_at, updated_at,
      customer:md_entities!customer_id(name)
      `,
    )
    .eq('id', workOrderId)
    .eq('tenant_id', context.tenantId)
    .maybeSingle();

  if (error || !data) {
    throw new WorkOrderReadError(
      'NOT_FOUND',
      404,
      `Work Order ${workOrderId} not found in tenant.`,
    );
  }

  // Explicit cross-SBU authority vs SBU-scoped / Non-SBU user check (Decision B & Section 5/7)
  if (!hasCrossSbuAuthority(context.role)) {
    if (!context.sbuScope) {
      throw new WorkOrderReadError(
        'NOT_FOUND',
        404,
        `Work Order ${workOrderId} not found in SBU scope.`,
      );
    }
    const expectedOperationalType = sbuScopeToOperationalType(context.sbuScope);
    const { data: itemRows, error: itemError } = await db()
      .from('wo_items')
      .select('id, sbu_type')
      .eq('wo_id', workOrderId)
      .eq('tenant_id', context.tenantId);

    if (itemError || !itemRows || itemRows.length === 0) {
      throw new WorkOrderReadError(
        'NOT_FOUND',
        404,
        `Work Order ${workOrderId} not found in SBU scope.`,
      );
    }

    const hasMatchingSbu = itemRows.some(
      (it) => it.sbu_type && String(it.sbu_type).toUpperCase() === expectedOperationalType,
    );
    if (!hasMatchingSbu) {
      throw new WorkOrderReadError(
        'NOT_FOUND',
        404,
        `Work Order ${workOrderId} not found in SBU scope.`,
      );
    }
  }

  return mapWorkOrderView(data);
}

export async function listWorkOrderItems(
  context: IdentityContext,
  workOrderId: string,
): Promise<WorkOrderItem[]> {
  assertPermission(context, 'work_order:read');
  validateUuid(workOrderId, 'workOrderId');

  let query = db()
    .from('wo_items')
    .select(
      `
      id, tenant_id, wo_id, item_code, sbu_type, status, max_jo_count,
      unit_price, total_revenue, item_data, sbu_metadata, created_at, updated_at
      `,
    )
    .eq('wo_id', workOrderId)
    .eq('tenant_id', context.tenantId);

  if (!hasCrossSbuAuthority(context.role)) {
    if (!context.sbuScope) {
      return [];
    }
    const expectedOperationalType = sbuScopeToOperationalType(context.sbuScope);
    query = query.eq('sbu_type', expectedOperationalType);
  }

  const { data, error } = await query.order('created_at', { ascending: true });

  if (error) {
    throw new WorkOrderReadError(
      'VALIDATION_FAILED',
      400,
      `Failed to fetch WO items: ${error.message}`,
    );
  }

  return (data || []).map(mapWorkItemRow);
}

export async function findWorkOrderItemById(
  context: IdentityContext,
  itemId: string,
): Promise<WorkOrderItem | null> {
  assertPermission(context, 'work_order:read');
  validateUuid(itemId, 'itemId');

  const { data, error } = await db()
    .from('wo_items')
    .select(
      `
      id, tenant_id, wo_id, item_code, sbu_type, status, max_jo_count,
      unit_price, total_revenue, item_data, sbu_metadata, created_at, updated_at
      `,
    )
    .eq('id', itemId)
    .eq('tenant_id', context.tenantId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return mapWorkItemRow(data);
}

export async function listJobOrdersForWorkOrderItem(
  context: IdentityContext,
  workOrderItemId: string,
): Promise<JobOrder[]> {
  assertPermission(context, 'job_order:read');
  validateUuid(workOrderItemId, 'workOrderItemId');

  let query = db()
    .from('job_orders')
    .select(
      `
      id, tenant_id, wo_item_id, jo_number, status, transporter_id,
      fleet_id, driver_id, driver_phone, container_number, base_price, purchase_price,
      notes, assigned_at, accepted_at, started_at, completed_at,
      created_at, updated_at, sbu_type
      `,
    )
    .eq('wo_item_id', workOrderItemId)
    .eq('tenant_id', context.tenantId);

  if (!hasCrossSbuAuthority(context.role)) {
    if (!context.sbuScope) {
      return [];
    }
    const expectedOperationalType = sbuScopeToOperationalType(context.sbuScope);
    query = query.eq('sbu_type', expectedOperationalType);
  }

  const { data, error } = await query.order('created_at', { ascending: true });

  if (error) {
    throw new WorkOrderReadError(
      'VALIDATION_FAILED',
      400,
      `Failed to fetch job orders: ${error.message}`,
    );
  }

  return (data || []).map(mapJobOrderRow);
}

export async function findJobOrderById(
  context: IdentityContext,
  jobOrderId: string,
): Promise<JobOrder> {
  assertPermission(context, 'job_order:read');
  const trimmedId = (jobOrderId || '').trim();
  if (!trimmedId) {
    throw new WorkOrderReadError('VALIDATION_FAILED', 400, 'jobOrderId must be a non-empty identifier.');
  }

  const isUuid = UUID_RE.test(trimmedId);
  const selectCols = `
      id, tenant_id, wo_item_id, jo_number, status, transporter_id,
      fleet_id, driver_id, driver_phone, container_number, base_price, purchase_price,
      notes, assigned_at, accepted_at, started_at, completed_at,
      created_at, updated_at, sbu_type
      `;

  const { data, error } = await db()
    .from('job_orders')
    .select(selectCols)
    .eq(isUuid ? 'id' : 'jo_number', trimmedId)
    .eq('tenant_id', context.tenantId)
    .maybeSingle();

  if (error || !data) {
    throw new WorkOrderReadError(
      'NOT_FOUND',
      404,
      `Job Order ${jobOrderId} not found in tenant.`,
    );
  }

  // Explicit cross-SBU authority vs SBU-scoped / Non-SBU user check (Decision B & Section 5/7/9)
  if (!hasCrossSbuAuthority(context.role)) {
    if (!context.sbuScope) {
      throw new WorkOrderReadError(
        'NOT_FOUND',
        404,
        `Job Order ${jobOrderId} not found in SBU scope.`,
      );
    }
    const expectedOperationalType = sbuScopeToOperationalType(context.sbuScope);
    const actualSbu = data.sbu_type ? String(data.sbu_type).toUpperCase() : null;
    if (!actualSbu || actualSbu !== expectedOperationalType) {
      throw new WorkOrderReadError(
        'NOT_FOUND',
        404,
        `Job Order ${jobOrderId} not found in SBU scope.`,
      );
    }
  }

  return mapJobOrderRow(data);
}

// ============================================================================
// COMPOSED EXECUTION VIEW (WO + items + JOs)
// ============================================================================

export async function getWorkOrderExecutionView(
  context: IdentityContext,
  workOrderId: string,
): Promise<WorkOrderExecutionView> {
  assertPermission(context, 'work_order:read');
  validateUuid(workOrderId, 'workOrderId');

  const wo = await findWorkOrderViewById(context, workOrderId);

  let itemsQuery = db()
    .from('wo_items')
    .select(
      `
      id, wo_id, item_code, sbu_type, status, max_jo_count,
      unit_price, total_revenue, item_data, sbu_metadata, created_at, updated_at
      `,
    )
    .eq('wo_id', workOrderId)
    .eq('tenant_id', context.tenantId);

  if (!hasCrossSbuAuthority(context.role)) {
    if (!context.sbuScope) {
      itemsQuery = itemsQuery.eq('sbu_type', '__NO_MATCH__');
    } else {
      const expectedOperationalType = sbuScopeToOperationalType(context.sbuScope);
      itemsQuery = itemsQuery.eq('sbu_type', expectedOperationalType);
    }
  }

  const itemsRaw = await itemsQuery.order('created_at', { ascending: true });

  if (itemsRaw.error) {
    throw new WorkOrderReadError(
      'VALIDATION_FAILED',
      400,
      `Failed to fetch WO items: ${itemsRaw.error.message}`,
    );
  }

  const items: WorkOrderItemView[] = [];
  for (const itemRow of itemsRaw.data || []) {
    let joQuery = db()
      .from('job_orders')
      .select(
        `
        id, jo_number, status, transporter_id, fleet_id, driver_id,
        container_number, base_price, notes, assigned_at, accepted_at,
        started_at, completed_at, created_at, updated_at
        `,
      )
      .eq('wo_item_id', String(itemRow.id))
      .eq('tenant_id', context.tenantId);

    if (!hasCrossSbuAuthority(context.role)) {
      if (!context.sbuScope) {
        joQuery = joQuery.eq('sbu_type', '__NO_MATCH__');
      } else {
        const expectedOperationalType = sbuScopeToOperationalType(context.sbuScope);
        joQuery = joQuery.eq('sbu_type', expectedOperationalType);
      }
    }

    const jors = await joQuery.order('created_at', { ascending: true });

    if (jors.error) {
      throw new WorkOrderReadError(
        'VALIDATION_FAILED',
        400,
        `Failed to fetch job orders: ${jors.error.message}`,
      );
    }

    items.push({
      id: String(itemRow.id),
      itemCode: itemRow.item_code ? String(itemRow.item_code) : null,
      sbuType: ((itemRow.sbu_type as string) ?? 'TRUCKING') as any,
      status: (itemRow.status as string) ?? 'pending',
      jobOrders: (jors.data || []).map(mapJobOrderView),
    });
  }

  return { workOrder: wo, items };
}

// ============================================================================
// CLIENT ENRICHMENT (driver/fleet/transporter/wo/customer/route read joins)
// Read-only — enrich JO views with entity names for display.
// ============================================================================

const KNOWN_ENRICH_CITIES = [
  'Surabaya',
  'Semarang',
  'Bandung',
  'Denpasar',
  'Jakarta',
  'Medan',
  'Makassar',
  'Subang',
  'Bekasi',
  'Cikarang',
];

function appendCityFromAddr(nameVal: unknown, addrVal: unknown): string | null {
  const base = nameVal ? String(nameVal).trim() : '';
  const addr = addrVal ? String(addrVal).trim() : '';
  if (!base && !addr) return null;
  if (!base) return addr;
  if (!addr) return base;
  const baseLower = base.toLowerCase();
  const addrLower = addr.toLowerCase();
  const extraCities = KNOWN_ENRICH_CITIES.filter(
    (c) => addrLower.includes(c.toLowerCase()) && !baseLower.includes(c.toLowerCase()),
  );
  if (extraCities.length > 0) {
    return `${base} (${extraCities.join(', ')})`;
  }
  return base;
}

function extractItemLocations(data: Record<string, unknown> | null): { origin: string | null; destination: string | null } {
  if (!data) return { origin: null, destination: null };
  const stops = Array.isArray(data.stops) ? (data.stops as Record<string, unknown>[]) : [];
  const pickupStop = stops.find((s) => s.stop_type === 'PICKUP');
  const dropStop = stops.find((s) => s.stop_type === 'DROPOFF');

  let origin = appendCityFromAddr(
    data.shipper_name || pickupStop?.location_name || data.origin_name || data.origin,
    data.shipper_address || pickupStop?.address,
  );
  let destination = appendCityFromAddr(
    data.recipient_name || dropStop?.location_name || data.dest_name || data.destination,
    data.recipient_address || dropStop?.address,
  );

  if (!origin && !destination && data.warehouse_name) {
    const opType = String(data.operation_type || data.direction || '').toUpperCase();
    const wh = String(data.warehouse_name);
    if (opType === 'OUTBOUND') {
      origin = wh;
    } else {
      destination = wh;
    }
  }

  return { origin, destination };
}

export async function enrichJobOrdersWithEntityNames(
  context: IdentityContext,
  jobOrders: JobOrder[],
): Promise<JobOrder[]> {
  assertPermission(context, 'job_order:read');

  const transporterIds = [...new Set(jobOrders.map((j) => j.transporterId).filter(Boolean))];
  const fleetIds = [...new Set(jobOrders.map((j) => j.fleetId).filter(Boolean))];
  const driverIds = [...new Set(jobOrders.map((j) => j.driverId).filter(Boolean))];
  const woItemIds = [...new Set(jobOrders.map((j) => j.woItemId).filter(Boolean))];

  const [transportersRes, fleetsRes, driversRes, woItemsRes] = await Promise.all([
    transporterIds.length > 0
      ? db()
          .from('md_entities')
          .select('id, name')
          .in('id', transporterIds)
          .eq('tenant_id', context.tenantId)
      : { data: [] },
    fleetIds.length > 0
      ? db()
          .from('md_fleets')
          .select('id, plate_number')
          .in('id', fleetIds)
          .eq('tenant_id', context.tenantId)
      : { data: [] },
    driverIds.length > 0
      ? db()
          .from('md_drivers')
          .select('id, name, phone')
          .in('id', driverIds)
          .eq('tenant_id', context.tenantId)
      : { data: [] },
    woItemIds.length > 0
      ? db()
          .from('wo_items')
          .select('id, wo_id, item_data')
          .in('id', woItemIds)
          .eq('tenant_id', context.tenantId)
      : { data: [] },
  ]);

  const transporterMap = new Map(
    (transportersRes.data || []).map((r) => [String(r.id), String(r.name)]),
  );
  const fleetMap = new Map(
    (fleetsRes.data || []).map((r) => [String(r.id), String(r.plate_number)]),
  );
  const driverMap = new Map(
    (driversRes.data || []).map((r) => [
      String(r.id),
      { name: String(r.name), phone: r.phone ? String(r.phone) : null },
    ]),
  );

  const itemWoMap = new Map<string, string>();
  const itemLocMap = new Map<string, { origin: string | null; destination: string | null }>();
  for (const row of woItemsRes.data || []) {
    const itemId = String(row.id);
    if (row.wo_id) itemWoMap.set(itemId, String(row.wo_id));
    itemLocMap.set(itemId, extractItemLocations((row.item_data as Record<string, unknown>) || null));
  }

  const woIds = [...new Set([...itemWoMap.values()].filter(Boolean))];
  const woNumberMap = new Map<string, string>();
  const woCustomerMap = new Map<string, string>();

  if (woIds.length > 0) {
    const wosRes = await db()
      .from('work_orders')
      .select('id, wo_number, customer_id')
      .in('id', woIds)
      .eq('tenant_id', context.tenantId);

    const customerIds: string[] = [];
    const woToCustomerId = new Map<string, string>();
    for (const w of wosRes.data || []) {
      const wId = String(w.id);
      if (w.wo_number) woNumberMap.set(wId, String(w.wo_number));
      if (w.customer_id) {
        const cId = String(w.customer_id);
        woToCustomerId.set(wId, cId);
        customerIds.push(cId);
      }
    }

    const uniqueCustIds = [...new Set(customerIds)];
    if (uniqueCustIds.length > 0) {
      const custEntRes = await db()
        .from('md_entities')
        .select('id, name')
        .in('id', uniqueCustIds)
        .eq('tenant_id', context.tenantId);

      const custNameById = new Map<string, string>();
      for (const c of custEntRes.data || []) {
        if (c.name) custNameById.set(String(c.id), String(c.name));
      }

      for (const [wId, cId] of woToCustomerId.entries()) {
        const cName = custNameById.get(cId);
        if (cName) woCustomerMap.set(wId, cName);
      }
    }
  }

  return jobOrders.map((jo) => {
    const resolvedWoId = (jo.woItemId ? itemWoMap.get(jo.woItemId) : null) || jo.woId || '';
    const loc = jo.woItemId ? itemLocMap.get(jo.woItemId) : undefined;
    return {
      ...jo,
      woId: resolvedWoId,
      woNumber: resolvedWoId ? woNumberMap.get(resolvedWoId) ?? jo.woNumber ?? null : jo.woNumber ?? null,
      customerName: resolvedWoId ? woCustomerMap.get(resolvedWoId) ?? jo.customerName ?? null : jo.customerName ?? null,
      origin: loc?.origin ?? jo.origin ?? null,
      destination: loc?.destination ?? jo.destination ?? null,
      transporterName: jo.transporterId ? transporterMap.get(jo.transporterId) ?? null : null,
      fleetPlateNumber: jo.fleetId ? fleetMap.get(jo.fleetId) ?? null : null,
      driverName: jo.driverId ? driverMap.get(jo.driverId)?.name ?? null : null,
      driverPhone: (jo.driverId ? driverMap.get(jo.driverId)?.phone : null) || jo.driverPhone || null,
    };
  });
}

export interface OperationalLineageJobOrder {
  id: string;
  joNumber: string;
  woItemId: string;
  status: string;
  sbuType: string | null;
  origin: string | null;
  destination: string | null;
  driverId: string | null;
  fleetId: string | null;
  createdAt: string;
}

export interface OperationalLineageWorkOrderItem {
  id: string;
  itemCode: string | null;
  sbuType: string;
  status: string;
  totalRevenue: number;
  origin: string | null;
  destination: string | null;
}

export interface OperationalLineageWorkOrder {
  id: string;
  woNumber: string;
  customerId: string;
  status: string;
  orderDate: string | null;
  targetFulfillmentDate: string | null;
  notes: string | null;
  createdAt: string;
  linkType: 'DIRECT' | 'CUSTOMER';
  items: OperationalLineageWorkOrderItem[];
  jobOrders: OperationalLineageJobOrder[];
}

export async function getOperationalLineageForOrder(
  context: IdentityContext,
  params: {
    orderId: string;
    orderNumber: string;
    customerId: string | null;
  },
): Promise<{
  totalWos: number;
  totalJos: number;
  workOrders: OperationalLineageWorkOrder[];
}> {
  if (
    !context.permissions.includes('commercial:read') &&
    !context.permissions.includes('work_order:read') &&
    !context.permissions.includes('sales_order:read')
  ) {
    assertPermission(context, 'commercial:read');
  }

  let woQuery = db()
    .from('work_orders')
    .select('*')
    .eq('tenant_id', context.tenantId);

  if (params.customerId) {
    woQuery = woQuery.eq('customer_id', params.customerId);
  }

  const { data: woRows, error: woErr } = await woQuery.order('created_at', { ascending: false });
  if (woErr || !woRows || woRows.length === 0) {
    return { totalWos: 0, totalJos: 0, workOrders: [] };
  }

  const woIds = woRows.map((w) => String(w.id));
  const { data: itemRows } = await db()
    .from('wo_items')
    .select('*')
    .in('wo_id', woIds)
    .eq('tenant_id', context.tenantId);

  const itemsList = itemRows || [];
  const itemIds = itemsList.map((i) => String(i.id));

  const { data: joRows } = itemIds.length > 0
    ? await db()
        .from('job_orders')
        .select('*')
        .in('wo_item_id', itemIds)
        .eq('tenant_id', context.tenantId)
        .order('created_at', { ascending: true })
    : { data: [] };

  const itemsByWo = new Map<string, DbRow[]>();
  const itemById = new Map<string, DbRow>();
  for (const item of itemsList) {
    const wId = String(item.wo_id);
    const list = itemsByWo.get(wId) || [];
    list.push(item);
    itemsByWo.set(wId, list);
    itemById.set(String(item.id), item);
  }

  const josByWo = new Map<string, OperationalLineageJobOrder[]>();
  for (const jo of joRows || []) {
    const itemId = String(jo.wo_item_id);
    const parentItem = itemById.get(itemId);
    if (!parentItem) continue;
    const wId = String(parentItem.wo_id);
    const loc = extractItemLocations((parentItem.item_data as Record<string, unknown>) || null);
    const list = josByWo.get(wId) || [];
    list.push({
      id: String(jo.id),
      joNumber: String(jo.jo_number),
      woItemId: itemId,
      status: String(jo.status || 'pending'),
      sbuType: jo.sbu_type ? String(jo.sbu_type) : (parentItem.sbu_type ? String(parentItem.sbu_type) : null),
      origin: loc.origin,
      destination: loc.destination,
      driverId: jo.driver_id ? String(jo.driver_id) : null,
      fleetId: jo.fleet_id ? String(jo.fleet_id) : null,
      createdAt: String(jo.created_at || ''),
    });
    josByWo.set(wId, list);
  }

  const directWorkOrders: OperationalLineageWorkOrder[] = [];

  for (const w of woRows) {
    const wId = String(w.id);
    const rawNotes = w.notes ? String(w.notes) : '';
    const wItems = itemsByWo.get(wId) || [];

    const hasNotesMatch =
      rawNotes.includes(params.orderId) ||
      (Boolean(params.orderNumber) && rawNotes.includes(params.orderNumber));

    const hasItemMetaMatch = wItems.some((it) => {
      const metaStr = JSON.stringify(it.sbu_metadata || {}) + JSON.stringify(it.item_data || {});
      return (
        metaStr.includes(params.orderId) ||
        (Boolean(params.orderNumber) && metaStr.includes(params.orderNumber))
      );
    });

    const isDirect = hasNotesMatch || hasItemMetaMatch;
    if (!isDirect) continue;

    const cleanedNotes = rawNotes.replace(/\s*\[SO:[0-9a-fA-F-]{36}\]/g, '').trim() || null;

    const mappedItems: OperationalLineageWorkOrderItem[] = wItems.map((it) => {
      const loc = extractItemLocations((it.item_data as Record<string, unknown>) || null);
      return {
        id: String(it.id),
        itemCode: it.item_code ? String(it.item_code) : null,
        sbuType: String(it.sbu_type || 'TRUCKING'),
        status: String(it.status || 'draft'),
        totalRevenue: Number(it.total_revenue) || 0,
        origin: loc.origin,
        destination: loc.destination,
      };
    });

    const entry: OperationalLineageWorkOrder = {
      id: wId,
      woNumber: String(w.wo_number),
      customerId: String(w.customer_id),
      status: String(w.status || 'draft'),
      orderDate: (w.order_date || w.execution_date) ? String(w.order_date || w.execution_date) : null,
      targetFulfillmentDate: w.target_fulfillment_date ? String(w.target_fulfillment_date) : null,
      notes: cleanedNotes,
      createdAt: String(w.created_at || ''),
      linkType: 'DIRECT',
      items: mappedItems,
      jobOrders: josByWo.get(wId) || [],
    };

    directWorkOrders.push(entry);
  }

  const totalWos = directWorkOrders.length;
  const totalJos = directWorkOrders.reduce((acc, w) => acc + w.jobOrders.length, 0);

  return {
    totalWos,
    totalJos,
    workOrders: directWorkOrders,
  };
}

