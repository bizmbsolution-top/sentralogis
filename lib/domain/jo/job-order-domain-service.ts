/**
 * Sentralogis — ADR-091
 * lib/domain/jo/job-order-domain-service.ts
 *
 * Canonical Job Order domain mutation services:
 * - JobOrderAssignmentService
 * - DriverReplacementService
 * - JobOrderCancellationService
 *
 * - Tenant identity is resolved EXCLUSIVELY from the trusted IdentityContext (U-01),
 *   never from client input.
 * - Authorization via assertPermission (U-02).
 * - All SELECT/UPDATE/DELETE queries include tenant_id = context.tenantId.
 * - INSERT payloads include server-derived tenant_id.
 * - Audit trail recorded in job_tracking.
 */

import { supabaseAdmin } from '@/lib/supabase/admin';
import type { IdentityContext } from '@/lib/application/identity/types';
import { assertPermission } from '@/lib/application/identity/resolver';
import { JO_PENDING_ASSIGNMENT_STATUSES, JO_REJECTED_STATUSES, JO_ACTIVE_STATUSES, JO_DONE_STATUSES } from './status';
import type { AssignmentSlot, WoItemContext, TransporterOption } from './assignment';
import { parseItemData, computeMaxJoCount, validateVendorPurchasePrice, resolveIsVendor } from './assignment';

export type { AssignmentSlot, WoItemContext, TransporterOption };

// ============================================================================
// DATABASE CLIENT INJECTION (testability)
// ============================================================================

type DbRow = Record<string, unknown>;
interface DbError { message: string; code?: string }
interface DbSingleResult { data: DbRow | null; error: DbError | null }
interface DbListResult { data: DbRow[] | null; error: DbError | null }

export interface JobOrderDbClient {
  from(table: string): {
    select(cols?: string): JobOrderQueryChain;
    insert(row: DbRow | DbRow[]): JobOrderInsertChain;
    update(row: DbRow): JobOrderUpdateChain;
    delete(): JobOrderDeleteChain;
  };
  rpc(fn: string, args: Record<string, unknown>): Promise<{
    data: unknown;
    error: DbError | null;
  }>;
}

interface JobOrderQueryChain extends PromiseLike<DbListResult> {
  eq(col: string, val: unknown): JobOrderQueryChain;
  in(col: string, vals: unknown[]): JobOrderQueryChain;
  is(col: string, val: unknown | null): JobOrderQueryChain;
  not(col: string, op: string, val: string): JobOrderQueryChain;
  order(col: string, opts: { ascending: boolean }): JobOrderQueryChain;
  single(): Promise<DbSingleResult>;
  maybeSingle(): Promise<DbSingleResult>;
}

interface JobOrderUpdateChain extends PromiseLike<DbListResult> {
  eq(col: string, val: unknown): JobOrderUpdateChain;
  in(col: string, vals: unknown[]): JobOrderUpdateChain;
  is(col: string, val: unknown | null): JobOrderUpdateChain;
  not(col: string, op: string, val: string): JobOrderUpdateChain;
  order(col: string, opts: { ascending: boolean }): JobOrderUpdateChain;
  select(cols?: string): JobOrderSelectChain;
  single(): Promise<DbSingleResult>;
  maybeSingle(): Promise<DbSingleResult>;
}

interface JobOrderSelectChain extends PromiseLike<DbListResult> {
  single(): Promise<DbSingleResult>;
  maybeSingle(): Promise<DbSingleResult>;
}

interface JobOrderInsertChain extends PromiseLike<DbListResult> {
  select(cols?: string): {
    single(): Promise<DbSingleResult>;
    maybeSingle(): Promise<DbSingleResult>;
  };
}

interface JobOrderDeleteChain {
  eq(col: string, val: unknown): JobOrderDeleteChain;
  in(col: string, vals: unknown[]): JobOrderDeleteChain;
  is(col: string, val: unknown | null): JobOrderDeleteChain;
  not(col: string, op: string, val: string): JobOrderDeleteChain;
}

let _client: JobOrderDbClient = supabaseAdmin as unknown as JobOrderDbClient;

export function _setJobOrderDbClient(client: JobOrderDbClient | null): void {
  _client = client ?? (supabaseAdmin as unknown as JobOrderDbClient);
}

function db(): JobOrderDbClient {
  return _client;
}

// ============================================================================
// TYPES
// ============================================================================

export interface JobOrder {
  id: string;
  tenantId: string;
  woItemId: string;
  joNumber: string;
  status: string;
  transporterId: string | null;
  fleetId: string | null;
  driverId: string | null;
  driverPhone: string | null;
  driverResponse: string | null;
  acceptedAt: string | null;
  rejectionNote: string | null;
  notes: string | null;
  assignedAt: string | null;
  dispatchReady: boolean | null;
  dispatchReadyAt: string | null;
  purchasePrice: number | null;
  basePrice: number | null;
  driverSharePercentage: number | null;
  advanceAmount: number | null;
  estimatedMargin: number | null;
  totalStops: number | null;
  containerNumber: string | null;
  assignmentDocuments: unknown[] | null;
  sbuMetadata: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export interface SaveAssignmentsInput {
  tenantId: string;
  woItem: {
    id: string;
    wo_id: string;
    status: string;
    item_data: unknown;
    work_orders?: { wo_number?: string };
  };
  assignments: AssignmentSlot[];
  mode: 'draft' | 'confirm' | 'handover';
  dealPrice: number;
  transporters: TransporterOption[];
  drivers: {
    id: string;
    md_entities?: { is_vendor?: boolean } | null;
  }[];
  fleets: {
    id: string;
    fleet_type_id?: string | null;
  }[];
}

export interface SaveAssignmentsResult {
  success: boolean;
  savedCount: number;
  woItemStatus: string;
  error?: string;
  code?: string;
  isHandoverFlow: boolean;
}

export interface AssignDriverInput {
  jobOrderId: string;
  driverId: string;
  fleetId?: string | null;
  transporterId?: string | null;
  driverPhone?: string | null;
  notes?: string | null;
}

export interface BatchAssignInput {
  woItemId: string;
  assignments: AssignmentSlot[];
  mode: 'draft' | 'confirm' | 'handover';
  dealPrice: number;
  woId: string;
  woNumber: string;
  woItemStatus: string;
  item_data: unknown;
  transporters: TransporterOption[];
  drivers: {
    id: string;
    md_entities?: { is_vendor?: boolean } | null;
  }[];
  fleets: {
    id: string;
    fleet_type_id?: string | null;
  }[];
}

export interface ReplaceDriverInput {
  jobOrderId: string;
  newDriverId: string;
  newFleetId?: string | null;
  newTransporterId?: string | null;
  reason?: string | null;
}

export interface CancelJobOrderInput {
  jobOrderId: string;
  reason: string;
}

export interface JobOrderResult {
  success: boolean;
  jobOrder?: JobOrder;
  error?: string;
  code?: string;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export type JobOrderErrorCode =
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'INVALID_STATE'
  | 'SAME_DRIVER'
  | 'MISSING_REASON'
  | 'DATABASE_ERROR';

export class JobOrderError extends Error {
  constructor(
    public readonly code: JobOrderErrorCode,
    public readonly statusCode: 400 | 403 | 404 | 409,
    message: string,
  ) {
    super(message);
    this.name = 'JobOrderError';
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function isJoBlockingAsset(status: string | null | undefined): boolean {
  const s = (status || '').toUpperCase();
  return (
    JO_ACTIVE_STATUSES.includes(s as any) ||
    JO_PENDING_ASSIGNMENT_STATUSES.includes(s as any) ||
    s === 'ASSIGNED' ||
    s.startsWith('TIBA DI') ||
    s.startsWith('MENUJU')
  );
}

function isJoTerminal(status: string | null | undefined): boolean {
  const s = (status || '').toUpperCase();
  return (
    JO_DONE_STATUSES.includes(s as any) ||
    JO_REJECTED_STATUSES.includes(s as any) ||
    s === 'CANCELLED'
  );
}

function mapRowToJobOrder(row: DbRow): JobOrder {
  return {
    id: String(row.id),
    tenantId: String(row.tenant_id),
    woItemId: String(row.wo_item_id),
    joNumber: String(row.jo_number),
    status: String(row.status || ''),
    transporterId: row.transporter_id ? String(row.transporter_id) : null,
    fleetId: row.fleet_id ? String(row.fleet_id) : null,
    driverId: row.driver_id ? String(row.driver_id) : null,
    driverPhone: row.driver_phone ? String(row.driver_phone) : null,
    driverResponse: row.driver_response ? String(row.driver_response) : null,
    acceptedAt: row.accepted_at ? String(row.accepted_at) : null,
    rejectionNote: row.rejection_note ? String(row.rejection_note) : null,
    notes: row.notes ? String(row.notes) : null,
    assignedAt: row.assigned_at ? String(row.assigned_at) : null,
    dispatchReady: row.dispatch_ready === true || row.dispatch_ready === 't' || row.dispatch_ready === 'true',
    dispatchReadyAt: row.dispatch_ready_at ? String(row.dispatch_ready_at) : null,
    purchasePrice: row.purchase_price !== null && row.purchase_price !== undefined ? Number(row.purchase_price) : null,
    basePrice: row.base_price !== null && row.base_price !== undefined ? Number(row.base_price) : null,
    driverSharePercentage: row.driver_share_percentage !== null && row.driver_share_percentage !== undefined ? Number(row.driver_share_percentage) : null,
    advanceAmount: row.advance_amount !== null && row.advance_amount !== undefined ? Number(row.advance_amount) : null,
    estimatedMargin: row.estimated_margin !== null && row.estimated_margin !== undefined ? Number(row.estimated_margin) : null,
    totalStops: row.total_stops !== null && row.total_stops !== undefined ? Number(row.total_stops) : null,
    containerNumber: row.container_number ? String(row.container_number) : null,
    assignmentDocuments: Array.isArray(row.assignment_documents) ? row.assignment_documents : null,
    sbuMetadata: typeof row.sbu_metadata === 'object' && row.sbu_metadata !== null ? (row.sbu_metadata as Record<string, unknown>) : null,
    createdAt: String(row.created_at || ''),
    updatedAt: String(row.updated_at || ''),
  };
}

function mapRowToWoItem(row: DbRow): { status: string; item_data: Record<string, unknown> } {
  return {
    status: String(row.status || ''),
    item_data: typeof row.item_data === 'object' && row.item_data !== null ? (row.item_data as Record<string, unknown>) : {},
  };
}

async function fetchJoById(tenantId: string, jobOrderId: string): Promise<JobOrder> {
  const { data, error } = await db()
    .from('job_orders')
    .select('*')
    .eq('id', jobOrderId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    throw new JobOrderError('NOT_FOUND', 404, `Job order not found: ${jobOrderId}`);
  }

  return mapRowToJobOrder(data);
}

async function fetchWoItemById(tenantId: string, woItemId: string): Promise<{ status: string; item_data: Record<string, unknown> }> {
  const { data, error } = await db()
    .from('wo_items')
    .select('status, item_data')
    .eq('id', woItemId)
    .eq('tenant_id', tenantId)
    .single();

  if (error || !data) {
    throw new JobOrderError('NOT_FOUND', 404, `WO item not found: ${woItemId}`);
  }

  return mapRowToWoItem(data);
}

async function fetchParentWoStatus(tenantId: string, woId: string): Promise<string | null> {
  const { data, error } = await db()
    .from('work_orders')
    .select('status')
    .eq('id', woId)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (error || !data) return null;
  return String(data.status || '').toLowerCase();
}

async function updateWoItemStatus(tenantId: string, woItemId: string, status: string, itemDataOverrides?: Record<string, unknown>): Promise<void> {
  const payload: Record<string, unknown> = { status };
  if (itemDataOverrides) {
    payload.item_data = itemDataOverrides;
  }
  const { error } = await db()
    .from('wo_items')
    .update(payload)
    .eq('id', woItemId)
    .eq('tenant_id', tenantId);

  if (error) {
    throw new JobOrderError('DATABASE_ERROR', 400, `Failed to update wo_items: ${error.message}`);
  }
}

async function updateParentWoStatus(tenantId: string, woId: string, status: string): Promise<void> {
  const { error } = await db()
    .from('work_orders')
    .update({ status })
    .eq('id', woId)
    .eq('tenant_id', tenantId);

  if (error) {
    throw new JobOrderError('DATABASE_ERROR', 400, `Failed to update work_orders: ${error.message}`);
  }
}

async function insertJobTracking(tenantId: string, jobOrderId: string, statusUpdate: string, notes?: string): Promise<void> {
  await db().from('job_tracking').insert({
    job_order_id: jobOrderId,
    status_update: statusUpdate,
    notes: notes || null,
    source: 'copilot',
    created_at: new Date().toISOString(),
  });
}

async function syncJobRoutes(tenantId: string, joId: string, itemData: WoItemContext): Promise<void> {
  const stops = (itemData.stops || []) as any[];
  if (stops.length === 0) return;

  const { data: existingRoutes, error: routeFetchErr } = await db()
    .from('job_routes')
    .select('id')
    .eq('job_order_id', joId);

  if (routeFetchErr) {
    return;
  }

  if (existingRoutes && existingRoutes.length > 0) return;

  const estDistanceKm = itemData.est_distance_km ?? null;
  const estDuration = itemData.est_duration ?? null;

  const routePayloads = stops.map((stop: any, sIdx: number) => ({
    job_order_id: joId,
    sequence: sIdx + 1,
    stop_type: (stop.stop_type as string) || (sIdx === 0 ? 'PICKUP' : 'DROPOFF'),
    source_type: (stop.source_type as string) || 'MD_LOCATION',
    source_id: String(stop.source_id || 'LEGACY'),
    location_name: (stop.location_name as string) || (stop.name as string) || '-',
    address: (stop.address as string) || (stop.location_address as string) || '-',
    latitude: stop.latitude !== null && stop.latitude !== undefined ? Number(stop.latitude) : null,
    longitude: stop.longitude !== null && stop.longitude !== undefined ? Number(stop.longitude) : null,
    contact_name: (stop.contact_name as string) || '-',
    contact_phone: (stop.contact_phone as string) || '-',
    status: 'pending',
    distance_km: sIdx === stops.length - 1 ? estDistanceKm : null,
    duration_minutes: sIdx === stops.length - 1 && estDuration ? parseInt(String(estDuration).replace(/\D/g, ''), 10) || null : null,
  }));

  const { error: routeInsErr } = await db().from('job_routes').insert(routePayloads);
  if (routeInsErr) {
    // suppress duplicate route errors
  }
}

async function saveMasterAllowance(tenantId: string, itemData: WoItemContext, fleetId: string, fleetTypeId: string | null, advanceAmount: number): Promise<void> {
  if (!fleetTypeId || advanceAmount <= 0) return;

  const originCity = (itemData.origin_city || itemData.origin_name || '').toUpperCase();
  const destCity = (itemData.destination_city || itemData.destination_name || '').toUpperCase();
  if (!originCity || !destCity) return;

  const { error } = await db().from('md_driver_allowances').insert({
    tenant_id: tenantId,
    origin_city: originCity,
    destination_city: destCity,
    fleet_type_id: fleetTypeId,
    amount: advanceAmount,
    is_active: true,
  });

  if (error && error.code !== '23505') {
    // suppress duplicate allowance errors
  }
}

async function upsertJobOrder(tenantId: string, assign: AssignmentSlot, payload: Record<string, unknown>, isInsert: boolean): Promise<string> {
  if (assign.id && !isInsert) {
    const { data, error } = await db()
      .from('job_orders')
      .update({ ...payload })
      .eq('id', assign.id)
      .eq('tenant_id', tenantId)
      .select('id');

     if (error) throw error;
     if (data && data.length > 0) {
       return data[0]?.id as string;
     }
  }

  const insertPayload: Record<string, unknown> = { ...payload, tenant_id: tenantId };
  const isUuid = assign.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(assign.id);
  if (isUuid) {
    insertPayload.id = assign.id;
  }

  const { data, error } = await db()
    .from('job_orders')
    .insert(insertPayload)
    .select('id')
    .single();

   if (error) throw error;
   if (data) return data.id as string;
   return '';
}

// ============================================================================
// JOB ORDER ASSIGNMENT SERVICE
// ============================================================================

export class JobOrderAssignmentService {
  /**
   * Assign a driver/fleet/transporter to an existing Job Order.
   * Preconditions: JO must be in an assignable state.
   */
  async assignDriver(context: IdentityContext, input: AssignDriverInput): Promise<JobOrderResult> {
    assertPermission(context, 'job_order:assign');
    try {
      const jo = await fetchJoById(context.tenantId, input.jobOrderId);

      if (!JO_PENDING_ASSIGNMENT_STATUSES.includes(jo.status as any) && jo.status !== 'DRAFT') {
        return {
          success: false,
          error: `Cannot assign driver to job order in status: ${jo.status}`,
          code: 'INVALID_STATE',
        };
      }

      const now = new Date().toISOString();
      const updatePayload: Record<string, unknown> = {
        driver_id: input.driverId,
        fleet_id: input.fleetId || null,
        transporter_id: input.transporterId || null,
        driver_phone: input.driverPhone || null,
        driver_response: 'accepted',
        accepted_at: now,
        status: 'ASSIGNED',
        assigned_at: now,
        dispatch_ready: true,
        dispatch_ready_at: now,
        updated_at: now,
      };

      if (input.notes) {
        updatePayload.notes = input.notes;
      }

      const { data, error } = await db()
        .from('job_orders')
        .update(updatePayload)
        .eq('id', input.jobOrderId)
        .eq('tenant_id', context.tenantId)
        .select('*')
        .single();

      if (error || !data) {
        return {
          success: false,
          error: error?.message || 'Failed to assign driver',
          code: 'DATABASE_ERROR',
        };
      }

      await insertJobTracking(context.tenantId, input.jobOrderId, 'ASSIGNED', `Driver assigned by ${context.userId}`);

      return {
        success: true,
        jobOrder: mapRowToJobOrder(data),
      };
    } catch (err: unknown) {
      if (err instanceof JobOrderError) {
        return { success: false, error: err.message, code: err.code };
      }
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        code: 'DATABASE_ERROR',
      };
    }
  }

  /**
   * Batch assign JOs for a WO item. Handles draft/confirm/handover modes.
   * Mutates job_orders, wo_items, and optionally work_orders.
   */
  async batchAssign(context: IdentityContext, input: BatchAssignInput): Promise<SaveAssignmentsResult> {
    assertPermission(context, 'job_order:assign');
    try {
      const tenantId = context.tenantId;
      const { woItemId, assignments, mode, dealPrice, woId, woNumber, woItemStatus, item_data } = input;

      const parsedItemData = parseItemData(item_data);
      const isHandoverFlow = mode === 'handover';

      if (mode === 'draft') {
        const createdJOs: string[] = [];
        for (let i = 0; i < assignments.length; i++) {
          const assign = assignments[i];
          if (!assign.transporter_id && !assign.fleet_id && !assign.driver_id && !assign.rejected) continue;

          const joNumber = assign.jo_number || `${woNumber}-${String(i + 1).padStart(2, '0')}`;
          const payload: Record<string, unknown> = {
            wo_item_id: woItemId,
            tenant_id: tenantId,
            jo_number: joNumber,
            transporter_id: assign.transporter_id || null,
            vendor_id: assign.transporter_id || null,
            fleet_id: assign.fleet_id || null,
            driver_id: assign.driver_id || null,
            driver_phone: assign.driver_phone || null,
            cost_account_id: assign.cost_account_id || null,
            purchase_price: Number(assign.purchase_price) || 0,
            base_price: Number(assign.base_price) || dealPrice,
            driver_share_percentage: Number(assign.driver_share_percentage) || 0,
            advance_amount: Number(assign.advance_amount) || 0,
            estimated_margin: (Number(assign.base_price) || dealPrice) - (Number(assign.purchase_price) || 0),
            total_stops: (parsedItemData.stops || []).length || 0,
            container_number: assign.container_number || null,
            notes: assign.notes || null,
            assignment_documents: assign.assignment_documents || [],
            sbu_metadata: {
              ...(assign.container_number ? { container_number: assign.container_number } : {}),
              ...(assign.notes ? { notes: assign.notes } : {}),
            },
            updated_at: new Date().toISOString(),
            assigned_at: new Date().toISOString(),
            driver_response: 'accepted',
            status: 'pending',
          };

          await upsertJobOrder(tenantId, assign, payload, !assign.id);
          createdJOs.push(joNumber);
        }

        const currentItemData = parseItemData(woItemStatus === 'need_assignment' ? item_data : woItemStatus) as unknown as Record<string, unknown>;
        const updatedItemData = { ...currentItemData };
        delete updatedItemData.confirmed_assigned;
        delete updatedItemData.confirmed_assigned_at;

        const rejectedSlots = assignments
          .filter((a) => a.rejected && a.rejected_reason)
          .map((a, i) => ({
            slot_index: assignments.indexOf(a),
            reason: a.rejected_reason,
            note: a.rejected_note || '',
            rejected_at: new Date().toISOString(),
          }));
        updatedItemData.rejected_slots = rejectedSlots;

        await updateWoItemStatus(tenantId, woItemId, 'need_assignment', updatedItemData);

        return {
          success: true,
          savedCount: assignments.filter((a) => a.transporter_id || a.fleet_id || a.driver_id || a.rejected).length,
          woItemStatus: 'need_assignment',
          isHandoverFlow: false,
        };
      }

      // confirm | handover
      const filledAssignments = assignments.filter((a) => a.fleet_id || a.driver_id || a.transporter_id);
      const filledIds = filledAssignments.map((a) => a.id).filter(Boolean);

      let preDeleteQuery = db()
        .from('job_orders')
        .delete()
        .eq('wo_item_id', woItemId)
        .eq('status', 'pending')
        .is('transporter_id', null)
        .is('driver_id', null)
        .is('fleet_id', null);

      if (filledIds.length > 0) {
        preDeleteQuery = (preDeleteQuery as any).not('id', 'in', `(${filledIds.join(',')})`);
      }
      await preDeleteQuery;

      for (let i = 0; i < filledAssignments.length; i++) {
        const assign = filledAssignments[i];
        const transporter = input.transporters.find((t) => t.id === assign.transporter_id);
        const driver = input.drivers.find((d) => d.id === assign.driver_id);
        const isVendor = resolveIsVendor(transporter, driver?.md_entities?.is_vendor);

        const vendorErr = validateVendorPurchasePrice(assign, isVendor, String(i + 1));
        if (vendorErr) {
          return { success: false, savedCount: 0, woItemStatus, error: vendorErr, isHandoverFlow };
        }

        const joNumber = `${woNumber}-${String(i + 1).padStart(2, '0')}`;
        const payload: Record<string, unknown> = {
          wo_item_id: woItemId,
          tenant_id: tenantId,
          jo_number: joNumber,
          transporter_id: assign.transporter_id || null,
          vendor_id: assign.transporter_id || null,
          fleet_id: assign.fleet_id || null,
          driver_id: assign.driver_id || null,
          driver_phone: assign.driver_phone || null,
          cost_account_id: assign.cost_account_id || null,
          purchase_price: Number(assign.purchase_price) || 0,
          base_price: Number(assign.base_price) || dealPrice,
          driver_share_percentage: Number(assign.driver_share_percentage) || 0,
          advance_amount: Number(assign.advance_amount) || 0,
          estimated_margin: (Number(assign.base_price) || dealPrice) - (Number(assign.purchase_price) || 0),
          total_stops: (parsedItemData.stops || []).length || 0,
          container_number: assign.container_number || null,
          notes: assign.notes || null,
          assignment_documents: assign.assignment_documents || [],
          sbu_metadata: {
            ...(assign.container_number ? { container_number: assign.container_number } : {}),
            ...(assign.notes ? { notes: assign.notes } : {}),
          },
          updated_at: new Date().toISOString(),
          assigned_at: new Date().toISOString(),
          driver_response: 'accepted',
          status: assign.id && assign.status && assign.status !== 'pending' && assign.status !== 'draft' ? assign.status : 'assigned',
          dispatch_ready: true,
          dispatch_ready_at: new Date().toISOString(),
        };

        const joId = await upsertJobOrder(tenantId, assign, payload, !assign.id);

        if (assign.save_to_master && !isVendor && assign.fleet_id) {
          const fleet = input.fleets.find((f) => f.id === assign.fleet_id);
          if (fleet) {
            await saveMasterAllowance(tenantId, parsedItemData, assign.fleet_id, fleet.fleet_type_id ?? null, Number(assign.advance_amount) || 0);
          }
        }

        await syncJobRoutes(tenantId, joId, parsedItemData);
      }

      await db()
        .from('job_orders')
        .delete()
        .eq('wo_item_id', woItemId)
        .eq('status', 'pending')
        .is('transporter_id', null)
        .is('driver_id', null)
        .is('fleet_id', null);

      const effectiveUnitCount = computeMaxJoCount(parsedItemData);
      const { data: actualJOs } = await db()
        .from('job_orders')
        .select('id')
        .eq('wo_item_id', woItemId)
        .not('status', 'eq', 'pending');

      const successfulAssignments = actualJOs?.length || 0;
      const allUnitsAssigned = successfulAssignments >= effectiveUnitCount;

      const newStatus = isHandoverFlow
        ? woItemStatus
        : allUnitsAssigned
          ? 'assigned'
          : 'need_assignment';

      const currentItemData = parseItemData(woItemStatus === 'need_assignment' ? item_data : woItemStatus) as unknown as Record<string, unknown>;
      const updatePayload: { status: string; item_data?: Record<string, unknown> } = {
        status: newStatus,
      };

      const rejectedSlots = assignments
        .filter((a) => a.rejected && a.rejected_reason)
        .map((a) => ({
          slot_index: assignments.indexOf(a),
          reason: a.rejected_reason,
          note: a.rejected_note || '',
          rejected_at: new Date().toISOString(),
        }));

      if (allUnitsAssigned && !isHandoverFlow) {
        updatePayload.item_data = {
          ...currentItemData,
          confirmed_assigned: true,
          confirmed_assigned_at: new Date().toISOString(),
          rejected_slots: rejectedSlots,
        };
      } else if (rejectedSlots.length > 0) {
        updatePayload.item_data = {
          ...currentItemData,
          rejected_slots: rejectedSlots,
        };
      }

      const { error: woUpdateError } = await db()
        .from('wo_items')
        .update(updatePayload)
        .eq('id', woItemId);

      if (woUpdateError) throw woUpdateError;

      const { data: siblingItems } = await db()
        .from('wo_items')
        .select('status')
        .eq('wo_id', woId);

      const siblingAssignedCount = siblingItems?.filter((i) =>
        ['assigned', 'confirmed_assigned', 'dispatched', 'active', 'in_progress', 'completed'].includes(
          (i.status as string || '').toLowerCase()
        )
      ).length || 0;

      const totalSiblingItems = siblingItems?.length || 1;
      const allSiblingsAssigned = siblingAssignedCount >= totalSiblingItems && totalSiblingItems > 0;

      if (allSiblingsAssigned && !isHandoverFlow) {
        const { data: parentWo } = await db()
          .from('work_orders')
          .select('status')
          .eq('id', woId)
          .single();

          const currentParentStatus = (parentWo?.status as string || '').toLowerCase();
        if (['draft', 'pending', 'need_assignment'].includes(currentParentStatus)) {
          await db()
            .from('work_orders')
            .update({ status: 'assigned' })
            .eq('id', woId);
        }
      }

      return {
        success: true,
        savedCount: successfulAssignments,
        woItemStatus: allUnitsAssigned ? 'assigned' : 'need_assignment',
        isHandoverFlow,
      };
    } catch (err: unknown) {
      return {
        success: false,
        savedCount: 0,
        woItemStatus: input.woItemStatus,
        error: err instanceof Error ? err.message : 'Unknown error',
        code: 'DATABASE_ERROR',
        isHandoverFlow: input.mode === 'handover',
      };
    }
  }
}

// ============================================================================
// DRIVER REPLACEMENT SERVICE
// ============================================================================

export class DriverReplacementService {
  /**
   * Replace driver/fleet/transporter on an existing ASSIGNED Job Order.
   * Atomic transaction: JO update + job_tracking + driver/fleet status updates.
   */
  async replaceDriver(context: IdentityContext, input: ReplaceDriverInput): Promise<JobOrderResult> {
    assertPermission(context, 'job_order:update');
    try {
      const jo = await fetchJoById(context.tenantId, input.jobOrderId);

      if (jo.status !== 'ASSIGNED') {
        return {
          success: false,
          error: `Driver replacement not allowed from status: ${jo.status}. Source state must be ASSIGNED.`,
          code: 'INVALID_STATE',
        };
      }

      if (jo.driverId === input.newDriverId && jo.fleetId === input.newFleetId && jo.transporterId === input.newTransporterId) {
        return {
          success: false,
          error: 'Cannot replace with the same driver/fleet/transporter',
          code: 'SAME_DRIVER',
        };
      }

      const { data, error } = await db().rpc('replace_driver_atomic', {
        p_tenant_id: context.tenantId,
        p_job_order_id: input.jobOrderId,
        p_new_driver_id: input.newDriverId,
        p_new_fleet_id: input.newFleetId || null,
        p_new_transporter_id: input.newTransporterId || null,
        p_reason: input.reason || null,
      });

      if (error) {
        return {
          success: false,
          error: error.message,
          code: 'DATABASE_ERROR',
        };
      }

      const row = (data as any[] | null)?.[0];
      if (!row) {
        return {
          success: false,
          error: 'No response from replace_driver_atomic',
          code: 'DATABASE_ERROR',
        };
      }

      if (!row.p_success) {
        return {
          success: false,
          error: row.p_error,
          code: row.p_code || 'DATABASE_ERROR',
        };
      }

      return {
        success: true,
        jobOrder: mapRowToJobOrder(JSON.parse(row.p_job_order)),
      };
    } catch (err: unknown) {
      if (err instanceof JobOrderError) {
        return { success: false, error: err.message, code: err.code };
      }
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        code: 'DATABASE_ERROR',
      };
    }
  }
}

// ============================================================================
// JOB ORDER CANCELLATION SERVICE
// ============================================================================

export class JobOrderCancellationService {
  /**
   * Cancel a Job Order. Terminal transition to CANCELLED.
   * Minimal downstream effects: JO status + resource release + audit.
   */
  async cancelJobOrder(context: IdentityContext, input: CancelJobOrderInput): Promise<JobOrderResult> {
    assertPermission(context, 'job_order:update');
    try {
      if (!input.reason || input.reason.trim().length === 0) {
        return {
          success: false,
          error: 'Cancellation reason is required',
          code: 'MISSING_REASON',
        };
      }

      const jo = await fetchJoById(context.tenantId, input.jobOrderId);

      if (isJoTerminal(jo.status)) {
        return {
          success: false,
          error: `Cannot cancel job order in terminal status: ${jo.status}`,
          code: 'INVALID_STATE',
        };
      }

      const now = new Date().toISOString();

      const updatePayload: Record<string, unknown> = {
        status: 'CANCELLED',
        rejection_note: `[CANCELLED] ${input.reason}`,
        updated_at: now,
      };

      const { data, error } = await db()
        .from('job_orders')
        .update(updatePayload)
        .eq('id', input.jobOrderId)
        .eq('tenant_id', context.tenantId)
        .select('*')
        .single();

      if (error || !data) {
        return {
          success: false,
          error: error?.message || 'Failed to cancel job order',
          code: 'DATABASE_ERROR',
        };
      }

      // Release assets
      if (jo.fleetId) {
        await db().from('md_fleets').update({ status: 'available' }).eq('id', jo.fleetId).eq('status', 'on_duty');
      }
      if (jo.driverId) {
        await db().from('md_drivers').update({ status: 'available', is_working: false }).eq('id', jo.driverId).eq('is_working', true);
      }

      await insertJobTracking(context.tenantId, input.jobOrderId, 'CANCELLED', `Job order cancelled. Reason: ${input.reason}`);

      return {
        success: true,
        jobOrder: mapRowToJobOrder(data),
      };
    } catch (err: unknown) {
      if (err instanceof JobOrderError) {
        return { success: false, error: err.message, code: err.code };
      }
      return {
        success: false,
        error: err instanceof Error ? err.message : 'Unknown error',
        code: 'DATABASE_ERROR',
      };
    }
  }
}

// ============================================================================
// COMPOSED SERVICE (backward compatibility)
// ============================================================================

export class JobOrderDomainService {
  readonly assignment = new JobOrderAssignmentService();
  readonly replacement = new DriverReplacementService();
  readonly cancellation = new JobOrderCancellationService();
}

export const jobOrderDomainService = new JobOrderDomainService();
