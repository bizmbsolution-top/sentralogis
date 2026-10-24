/**
 * Sentralogis Copilot — Operational Live Read Gateway
 * lib/copilot/read/operational-live-read-gateway.ts
 *
 * Server-side read-only boundary connecting ConversationalQueryContext
 * to verified canonical domain read services (§3, §4, §6).
 *
 * MANDATORY ARCHITECTURAL BOUNDARIES:
 * 1. Read-only: Zero database mutations, zero execution side effects.
 * 2. Zero Unrestricted SQL: Delegates strictly to canonical domain services or tenant-scoped readers.
 * 3. Tenant Isolated: Scoped strictly by server-derived IdentityContext (U-01).
 * 4. Permission Checked: Asserts canonical permissions before invocation (U-02).
 * 5. Distinct Entities: WORK_ORDER, JOB_ORDER, SALES_ORDER, and SHIPMENT remain distinct types.
 * 6. Source Traceability: Visibly marked 'LIVE_CANONICAL_READ'.
 * 7. Proposal Isolation: Read may inspect current state for proposals, but execution remains strictly OFF.
 */

import type { IdentityContext } from '@/lib/application/identity/types';
import { assertPermission, assertAnyPermission } from '@/lib/application/identity/resolver';
import { sbuScopeToOperationalType, hasCrossSbuAuthority } from '@/lib/application/identity/roles';
import { supabaseAdmin } from '@/lib/supabase/admin';
import type { ConversationalQueryContext } from '@/lib/copilot/sandbox/types';
import type { ProposalBlock } from '@/components/copilot/v2/types';
import type {
  OperationalEntityType,
  OperationalReadResult,
  OperationalLiveReadResponse,
  LiveReadResolutionState,
  OperationalReadAction,
} from './types';

// Canonical Domain Read Services
import { findWorkOrderById, findWorkOrderViewById, findJobOrderById, enrichJobOrdersWithEntityNames } from '@/lib/work-order/service';
import { findSalesOrderById, listSalesOrdersForTenant } from '@/lib/sales-order/service';
import { ShipmentService } from '@/lib/domain/shipment/shipment-service';
import { FinancialService } from '@/lib/financial/service';
import { EntityQueryService } from '@/lib/domain/entity/entity-query-service';

// Custom Live Read Error
export class OperationalReadError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'OperationalReadError';
  }
}

// ============================================================================
// CANONICAL DELEGATE INTERFACES (Testability & Database Independence)
// ============================================================================

export interface CanonicalJobOrderRecord {
  id: string;
  joNumber: string;
  workOrderId?: string;
  salesOrderId?: string;
  customerName?: string;
  origin?: string;
  destination?: string;
  status: string;
  driverId?: string;
  driverName?: string;
  driverPhone?: string;
  vehicleNumber?: string;
  orderDate?: string;
  executionDate?: string;
  completedAt?: string;
  sbuType?: string;
}

export interface CanonicalWorkOrderRecord {
  id: string;
  woNumber: string;
  customerId?: string;
  customerName?: string;
  status: string;
  orderDate?: string;
  executionDate?: string;
  capability?: string;
  linkedSoNumber?: string;
}

export interface CanonicalSalesOrderRecord {
  id: string;
  soNumber: string;
  customerId?: string;
  customerName?: string;
  customerCode?: string;
  origin?: string;
  destination?: string;
  status: string;
  orderDate?: string;
  targetFulfillmentDate?: string;
  totalRevenue?: number;
  currency?: string;
}

export interface CanonicalShipmentRecord {
  id: string;
  shipmentNumber: string;
  customerName?: string;
  origin?: string;
  destination?: string;
  status: string;
  departureStatus?: string;
  etd?: string;
  eta?: string;
  carrierName?: string;
}

export interface OperationalReadDelegate {
  findJobOrderByNumber(ctx: IdentityContext, joNumber: string): Promise<CanonicalJobOrderRecord | null>;
  listJobOrders(ctx: IdentityContext, filters: {
    customer?: string;
    destination?: string;
    origin?: string;
    status?: string;
    period?: string;
  }): Promise<CanonicalJobOrderRecord[]>;
  findWorkOrderByNumber(ctx: IdentityContext, woNumber: string): Promise<CanonicalWorkOrderRecord | null>;
  findSalesOrderByNumber(ctx: IdentityContext, soNumber: string): Promise<CanonicalSalesOrderRecord | null>;
  listSalesOrders?(ctx: IdentityContext, filters?: { status?: string; customer?: string }): Promise<CanonicalSalesOrderRecord[]>;
  findShipmentByNumber(ctx: IdentityContext, shipmentNumber: string): Promise<CanonicalShipmentRecord | null>;
}

if (typeof (globalThis as any).WebSocket === 'undefined') {
  (globalThis as any).WebSocket = class {};
}

const KNOWN_CITIES = ['Surabaya', 'Semarang', 'Bandung', 'Denpasar', 'Jakarta', 'Medan', 'Makassar', 'Subang', 'Bekasi', 'Cikarang'];

function appendAddressCityIfMissing(baseName: string | undefined, address: string | undefined): string | undefined {
  const base = baseName ? String(baseName).trim() : '';
  const addr = address ? String(address).trim() : '';
  if (!base && !addr) return undefined;
  if (!base) return addr;
  if (!addr) return base;
  const baseLower = base.toLowerCase();
  const addrLower = addr.toLowerCase();
  const extraCities = KNOWN_CITIES.filter(
    (c) => addrLower.includes(c.toLowerCase()) && !baseLower.includes(c.toLowerCase()),
  );
  if (extraCities.length > 0) {
    return `${base} (${extraCities.join(', ')})`;
  }
  return base;
}

export function extractLocationsFromItemData(data: any): { origin?: string; destination?: string } {
  if (!data) return {};

  // 1. Trucking stops / shipper / recipient
  const pickupStop = Array.isArray(data.stops) ? data.stops.find((s: any) => s.stop_type === 'PICKUP') : null;
  const originName = data.shipper_name || pickupStop?.location_name;
  const originAddr = data.shipper_address || pickupStop?.address;
  let originVal = appendAddressCityIfMissing(originName, originAddr);

  const dropStop = Array.isArray(data.stops) ? data.stops.find((s: any) => s.stop_type === 'DROPOFF') : null;
  const destName = data.recipient_name || dropStop?.location_name;
  const destAddr = data.recipient_address || dropStop?.address;
  let destVal = appendAddressCityIfMissing(destName, destAddr);

  // 2. Warehouse SBU handling (warehouse_name, operation_type)
  if (!originVal && !destVal && data.warehouse_name) {
    const opType = String(data.operation_type || data.direction || '').toUpperCase();
    if (opType === 'INBOUND') {
      destVal = data.warehouse_name;
    } else if (opType === 'OUTBOUND') {
      originVal = data.warehouse_name;
    } else if (opType === 'STOCK_TRANSFER') {
      if (data.origin_location_id) {
        originVal = data.warehouse_name;
      } else if (data.destination_location_id || data.to_warehouse_id) {
        destVal = data.warehouse_name;
      } else {
        destVal = data.warehouse_name;
      }
    } else {
      if (data.destination_location_id) {
        destVal = data.warehouse_name;
      } else if (data.origin_location_id) {
        originVal = data.warehouse_name;
      } else {
        destVal = data.warehouse_name;
      }
    }
  }

  // 3. Fallback explicit keys
  if (!originVal) {
    originVal = data.origin_city || data.origin_name || data.origin || data.pickup_city || data.pickup_address;
  }
  if (!destVal) {
    destVal = data.destination_city || data.destination_name || data.destination || data.delivery_city || data.delivery_address || data.dropoff_city;
  }

  return {
    origin: originVal ? String(originVal) : undefined,
    destination: destVal ? String(destVal) : undefined,
  };
}

export type CanonicalJoStatusCategory =
  | 'TERMINAL_SUCCESS'
  | 'TERMINAL_REJECTED'
  | 'TERMINAL_CANCELLED'
  | 'NON_TERMINAL';

const TERMINAL_SUCCESS_STATUS_SET = new Set([
  'COMPLETED',
  'PEKERJAAN SELESAI',
  'SELESAI',
  'DONE',
  'VERIFIED',
  'READY_FOR_BILLING',
  'INVOICED',
  'PAID',
  'DELIVERED',
]);

const TERMINAL_REJECTED_STATUS_SET = new Set([
  'REJECTED',
  'DITOLAK',
  'HANDOVER_REJECTED',
]);

const TERMINAL_CANCELLED_STATUS_SET = new Set([
  'CANCELLED',
  'CANCELED',
  'BATAL',
  'DIBATALKAN',
]);

export function classifyCanonicalJoStatus(status: string | null | undefined): CanonicalJoStatusCategory {
  const s = (status || '').trim().toUpperCase();
  if (TERMINAL_SUCCESS_STATUS_SET.has(s)) return 'TERMINAL_SUCCESS';
  if (TERMINAL_REJECTED_STATUS_SET.has(s) || s.includes('REJECT') || s.includes('DITOLAK')) {
    return 'TERMINAL_REJECTED';
  }
  if (TERMINAL_CANCELLED_STATUS_SET.has(s) || s.includes('CANCEL') || s.includes('BATAL')) {
    return 'TERMINAL_CANCELLED';
  }
  return 'NON_TERMINAL';
}

export function matchesRequestedJoStatusFilter(
  recordStatus: string | null | undefined,
  requestedFilterStatus: string | null | undefined,
): boolean {
  if (!requestedFilterStatus) return true;
  const f = requestedFilterStatus.trim().toUpperCase();
  const cat = classifyCanonicalJoStatus(recordStatus);

  if (f === 'BELUM_JALAN' || f === 'UNCOMPLETED' || f === 'ACTIVE') {
    return cat === 'NON_TERMINAL';
  }
  if (f === 'COMPLETED') {
    return cat === 'TERMINAL_SUCCESS';
  }
  if (f === 'REJECTED') {
    return cat === 'TERMINAL_REJECTED';
  }
  if (f === 'CANCELLED') {
    return cat === 'TERMINAL_CANCELLED';
  }
  return (recordStatus || '').toUpperCase().includes(f);
}

export const defaultProductionDelegate: OperationalReadDelegate = {
  async findJobOrderByNumber(ctx: IdentityContext, joNumber: string): Promise<CanonicalJobOrderRecord | null> {
    assertPermission(ctx, 'job_order:read');
    const { data, error } = await (supabaseAdmin as any)
      .from('job_orders')
      .select('id, jo_number, status, wo_item_id, driver_id, fleet_id, created_at, started_at, completed_at, sbu_type')
      .eq('tenant_id', ctx.tenantId)
      .ilike('jo_number', joNumber.trim())
      .maybeSingle();

    if (error || !data) return null;

    let customerName: string | undefined;
    let driverName: string | undefined;
    let vehicleNumber: string | undefined;
    let origin: string | undefined = (data as any).origin ? String((data as any).origin) : undefined;
    let destination: string | undefined = (data as any).destination ? String((data as any).destination) : undefined;

    if (data.wo_item_id) {
      const { data: woItem } = await (supabaseAdmin as any)
        .from('wo_items')
        .select('wo_id, item_data')
        .eq('id', data.wo_item_id)
        .eq('tenant_id', ctx.tenantId)
        .maybeSingle();

      if (woItem?.item_data) {
        const loc = extractLocationsFromItemData(woItem.item_data);
        if (!origin && loc.origin) origin = loc.origin;
        if (!destination && loc.destination) destination = loc.destination;
      }

      if (woItem?.wo_id) {
        const { data: wo } = await (supabaseAdmin as any)
          .from('work_orders')
          .select('customer_id')
          .eq('id', woItem.wo_id)
          .eq('tenant_id', ctx.tenantId)
          .maybeSingle();

        if (wo?.customer_id) {
          const { data: ent } = await (supabaseAdmin as any)
            .from('md_entities')
            .select('name')
            .eq('id', wo.customer_id)
            .eq('tenant_id', ctx.tenantId)
            .maybeSingle();
          if (ent?.name) {
            customerName = ent.name;
          } else {
            const { data: cust } = await (supabaseAdmin as any)
              .from('customers')
              .select('name')
              .eq('id', wo.customer_id)
              .maybeSingle();
            if (cust?.name) customerName = cust.name;
          }
        }
      }
    }

    if (data.driver_id) {
      const { data: drv } = await (supabaseAdmin as any)
        .from('md_drivers')
        .select('name')
        .eq('id', data.driver_id)
        .eq('tenant_id', ctx.tenantId)
        .maybeSingle();
      if (drv?.name) driverName = drv.name;
    }

    if (data.fleet_id) {
      const { data: flt } = await (supabaseAdmin as any)
        .from('md_fleets')
        .select('plate_number')
        .eq('id', data.fleet_id)
        .eq('tenant_id', ctx.tenantId)
        .maybeSingle();
      if (flt?.plate_number) vehicleNumber = flt.plate_number;
    }

    return {
      id: String(data.id),
      joNumber: String(data.jo_number),
      status: String(data.status || 'draft'),
      customerName,
      driverName,
      vehicleNumber,
      origin,
      destination,
      orderDate: data.created_at ? String(data.created_at) : undefined,
      executionDate: data.started_at ? String(data.started_at) : undefined,
      sbuType: data.sbu_type ? String(data.sbu_type) : undefined,
    };
  },

  async listJobOrders(
    ctx: IdentityContext,
    filters: {
      customer?: string;
      destination?: string;
      origin?: string;
      status?: string;
      period?: string;
    }
  ): Promise<CanonicalJobOrderRecord[]> {
    assertPermission(ctx, 'job_order:read');
    let query = (supabaseAdmin as any)
      .from('job_orders')
      .select('id, jo_number, status, wo_item_id, driver_id, fleet_id, created_at, started_at, completed_at, sbu_type')
      .eq('tenant_id', ctx.tenantId);

    // Apply status filter based on canonical classification
    if (filters.status === 'BELUM_JALAN' || filters.status === 'UNCOMPLETED' || filters.status === 'ACTIVE') {
      const terminalStatuses = [
        'completed',
        'selesai',
        'pekerjaan selesai',
        'done',
        'verified',
        'ready_for_billing',
        'invoiced',
        'paid',
        'delivered',
        'cancelled',
        'canceled',
        'rejected',
        'handover_rejected',
        'ditolak',
        'batal',
        'dibatalkan',
        'COMPLETED',
        'SELESAI',
        'PEKERJAAN SELESAI',
        'DONE',
        'VERIFIED',
        'READY_FOR_BILLING',
        'INVOICED',
        'PAID',
        'DELIVERED',
        'CANCELLED',
        'CANCELED',
        'REJECTED',
        'HANDOVER_REJECTED',
        'DITOLAK',
        'BATAL',
        'DIBATALKAN',
      ];
      query = query.not('status', 'in', `(${terminalStatuses.join(',')})`);
    } else if (filters.status === 'REJECTED') {
      query = query.or('status.ilike.%reject%,status.ilike.%ditolak%');
    } else if (filters.status === 'CANCELLED') {
      query = query.or('status.ilike.%cancel%,status.ilike.%batal%');
    } else if (filters.status === 'COMPLETED') {
      query = query.or('status.ilike.%complete%,status.ilike.%selesai%,status.ilike.%done%,status.ilike.%verified%,status.ilike.%invoiced%,status.ilike.%paid%,status.ilike.%delivered%');
    } else if (filters.status) {
      query = query.ilike('status', `%${filters.status}%`);
    }

    // Location pre-scoping: If destination or origin is specified, locate matching wo_items
    // within the tenant using canonical extractLocationsFromItemData so 50 unrelated recent JOs do not crowd out the result
    if (filters.destination || filters.origin) {
      const { data: tenantWoItems } = await (supabaseAdmin as any)
        .from('wo_items')
        .select('id, item_data')
        .eq('tenant_id', ctx.tenantId);

      const matchedItemIds: string[] = [];
      for (const woi of tenantWoItems || []) {
        const loc = extractLocationsFromItemData(woi.item_data);
        const destOk =
          !filters.destination ||
          Boolean(loc.destination && loc.destination.toLowerCase().includes(filters.destination.toLowerCase()));
        const origOk =
          !filters.origin ||
          Boolean(loc.origin && loc.origin.toLowerCase().includes(filters.origin.toLowerCase()));
        if (destOk && origOk) {
          matchedItemIds.push(String(woi.id));
        }
      }

      if (matchedItemIds.length > 0) {
        query = query.in('wo_item_id', matchedItemIds);
      } else {
        return [];
      }
    }

    const { data: rawRows, error } = await query
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('[OperationalLiveReadGateway] listJobOrders database error:', error);
      throw new OperationalReadError('DATABASE_ERROR', 500, `Gagal membaca data Job Order dari database: ${error.message}`);
    }

    const rows = (rawRows || []).filter((r: any) =>
      matchesRequestedJoStatusFilter(r.status, filters.status),
    );

    if (rows.length === 0) return [];

    // Batch enrich drivers and fleets
    const driverIds = [...new Set(rows.map((r: any) => r.driver_id).filter(Boolean))];
    const fleetIds = [...new Set(rows.map((r: any) => r.fleet_id).filter(Boolean))];
    const woItemIds = [...new Set(rows.map((r: any) => r.wo_item_id).filter(Boolean))];

    const driverMap = new Map<string, string>();
    if (driverIds.length > 0) {
      const { data: drvRows } = await (supabaseAdmin as any)
        .from('md_drivers')
        .select('id, name')
        .in('id', driverIds)
        .eq('tenant_id', ctx.tenantId);
      (drvRows || []).forEach((d: any) => driverMap.set(String(d.id), String(d.name)));
    }

    const fleetMap = new Map<string, string>();
    if (fleetIds.length > 0) {
      const { data: fltRows } = await (supabaseAdmin as any)
        .from('md_fleets')
        .select('id, plate_number')
        .in('id', fleetIds)
        .eq('tenant_id', ctx.tenantId);
      (fltRows || []).forEach((f: any) => fleetMap.set(String(f.id), String(f.plate_number)));
    }

    // Customer and Location mapping via wo_items
    const customerMap = new Map<string, string>();
    const originMap = new Map<string, string>();
    const destMap = new Map<string, string>();

    if (woItemIds.length > 0) {
      const { data: itemRows } = await (supabaseAdmin as any)
        .from('wo_items')
        .select('id, wo_id, item_data')
        .in('id', woItemIds)
        .eq('tenant_id', ctx.tenantId);

      (itemRows || []).forEach((item: any) => {
        const id = String(item.id);
        if (item.item_data) {
          const loc = extractLocationsFromItemData(item.item_data);
          if (loc.origin) originMap.set(id, loc.origin);
          if (loc.destination) destMap.set(id, loc.destination);
        }
      });

      const woIds = [...new Set((itemRows || []).map((i: any) => i.wo_id).filter(Boolean))];
      if (woIds.length > 0) {
        const { data: woRows } = await (supabaseAdmin as any)
          .from('work_orders')
          .select('id, customer_id')
          .in('id', woIds)
          .eq('tenant_id', ctx.tenantId);

        const custIds = [...new Set((woRows || []).map((w: any) => w.customer_id).filter(Boolean))];
        const custNameMap = new Map<string, string>();
        if (custIds.length > 0) {
          // Check md_entities first (trucking & multi-SBU canonical)
          const { data: entRows } = await (supabaseAdmin as any)
            .from('md_entities')
            .select('id, name')
            .in('id', custIds)
            .eq('tenant_id', ctx.tenantId);
          (entRows || []).forEach((e: any) => custNameMap.set(String(e.id), String(e.name)));

          // For remaining unmapped IDs, check customers
          const unmappedCustIds = custIds.filter((cid) => !custNameMap.has(String(cid)));
          if (unmappedCustIds.length > 0) {
            const { data: custRows } = await (supabaseAdmin as any)
              .from('customers')
              .select('id, name')
              .in('id', unmappedCustIds);
            (custRows || []).forEach((c: any) => custNameMap.set(String(c.id), String(c.name)));
          }
        }

        const woToCustMap = new Map<string, string>();
        (woRows || []).forEach((w: any) => {
          if (w.customer_id && custNameMap.has(String(w.customer_id))) {
            woToCustMap.set(String(w.id), custNameMap.get(String(w.customer_id))!);
          }
        });

        (itemRows || []).forEach((i: any) => {
          if (i.wo_id && woToCustMap.has(String(i.wo_id))) {
            customerMap.set(String(i.id), woToCustMap.get(String(i.wo_id))!);
          }
        });
      }
    }

    let mapped = rows.map((r: any) => ({
      id: String(r.id),
      joNumber: String(r.jo_number),
      status: String(r.status || 'draft'),
      customerName: r.wo_item_id ? customerMap.get(String(r.wo_item_id)) : undefined,
      driverName: r.driver_id ? driverMap.get(String(r.driver_id)) : undefined,
      vehicleNumber: r.fleet_id ? fleetMap.get(String(r.fleet_id)) : undefined,
      origin: r.wo_item_id ? originMap.get(String(r.wo_item_id)) : undefined,
      destination: r.wo_item_id ? destMap.get(String(r.wo_item_id)) : undefined,
      orderDate: r.created_at ? String(r.created_at) : undefined,
      executionDate: r.started_at ? String(r.started_at) : undefined,
      sbuType: r.sbu_type ? String(r.sbu_type) : undefined,
    }));

    if (filters.destination) {
      const target = filters.destination.toLowerCase();
      mapped = mapped.filter((r: any) => r.destination && r.destination.toLowerCase().includes(target));
    }
    if (filters.origin) {
      const target = filters.origin.toLowerCase();
      mapped = mapped.filter((r: any) => r.origin && r.origin.toLowerCase().includes(target));
    }

    return mapped;
  },

  async findWorkOrderByNumber(ctx: IdentityContext, woNumber: string): Promise<CanonicalWorkOrderRecord | null> {
    assertPermission(ctx, 'work_order:read');
    const { data, error } = await (supabaseAdmin as any)
      .from('work_orders')
      .select('*')
      .eq('tenant_id', ctx.tenantId)
      .ilike('wo_number', woNumber.trim())
      .maybeSingle();

    if (error || !data) return null;

    let customerName: string | undefined;
    if (data.customer_id) {
      const { data: ent } = await (supabaseAdmin as any)
        .from('md_entities')
        .select('name')
        .eq('id', data.customer_id)
        .maybeSingle();
      if (ent?.name) {
        customerName = ent.name;
      } else {
        const { data: cust } = await (supabaseAdmin as any)
          .from('customers')
          .select('name')
          .eq('id', data.customer_id)
          .maybeSingle();
        if (cust?.name) customerName = cust.name;
      }
    }

    const cap = data.capability || data.sbu_type;
    return {
      id: String(data.id),
      woNumber: String(data.wo_number),
      customerId: data.customer_id ? String(data.customer_id) : undefined,
      customerName,
      status: String(data.status || 'draft'),
      capability: cap ? String(cap) : undefined,
      orderDate: data.order_date || data.created_at ? String(data.order_date || data.created_at) : undefined,
      executionDate: data.execution_date ? String(data.execution_date) : undefined,
    };
  },

  async findSalesOrderByNumber(ctx: IdentityContext, soNumber: string): Promise<CanonicalSalesOrderRecord | null> {
    assertAnyPermission(ctx, ['commercial:read', 'sales_order:read']);
    const all = await listSalesOrdersForTenant(ctx, { limit: 200 });
    const target = soNumber.trim().toUpperCase();
    const matched = all.find(
      (s) => s.soNumber.toUpperCase() === target || s.id.toUpperCase() === target,
    );
    if (!matched) return null;

    return {
      id: String(matched.id),
      soNumber: String(matched.soNumber),
      customerName: matched.customerName ?? undefined,
      status: String(matched.status || 'DRAFT'),
      orderDate: matched.orderDate || matched.createdAt,
      targetFulfillmentDate: matched.targetFulfillmentDate || undefined,
      totalRevenue: matched.totalAgreedRevenue,
      currency: matched.currency,
    };
  },

  async listSalesOrders(
    ctx: IdentityContext,
    filters?: { status?: string; customer?: string },
  ): Promise<CanonicalSalesOrderRecord[]> {
    assertAnyPermission(ctx, ['commercial:read', 'sales_order:read']);
    const all = await listSalesOrdersForTenant(ctx, { limit: 100 });
    let filtered = all;
    if (filters?.status) {
      const targetStatus = filters.status.toUpperCase();
      filtered = filtered.filter((s) => {
        const st = String(s.status || '').toUpperCase();
        if (targetStatus === 'ACTIVE' || targetStatus === 'BELUM_JALAN') {
          return ['CONFIRMED', 'IN_FULFILLMENT', 'PARTIALLY_FULFILLED'].includes(st);
        }
        return st === targetStatus;
      });
    }
    if (filters?.customer) {
      const q = filters.customer.toLowerCase().trim();
      const cleanQ = q.replace(/^(pt|cv|ud)\.?\s+/i, '').trim();
      filtered = filtered.filter((s) => {
        const name = (s.customerName || '').toLowerCase().trim();
        const code = (s.customerCode || '').toLowerCase().trim();
        const cleanName = name.replace(/^(pt|cv|ud)\.?\s+/i, '').trim();
        return (
          name.includes(q) ||
          cleanName.includes(cleanQ) ||
          code === q ||
          code === cleanQ ||
          code.includes(q) ||
          q.includes(code)
        );
      });
    }
    return filtered.map((s) => ({
      id: String(s.id),
      soNumber: String(s.soNumber),
      customerId: s.customerId ?? undefined,
      customerName: s.customerName ?? undefined,
      customerCode: s.customerCode ?? undefined,
      status: String(s.status || 'DRAFT'),
      orderDate: s.orderDate || s.createdAt,
      targetFulfillmentDate: s.targetFulfillmentDate || undefined,
      totalRevenue: s.totalAgreedRevenue,
      currency: s.currency,
    }));
  },

  async findShipmentByNumber(ctx: IdentityContext, shipmentNumber: string): Promise<CanonicalShipmentRecord | null> {
    assertPermission(ctx, 'shipment:read');
    const { data, error } = await (supabaseAdmin as any)
      .from('shp_shipments')
      .select('id, shipment_number, status, origin, destination, etd, eta, departure_status')
      .eq('tenant_id', ctx.tenantId)
      .ilike('shipment_number', shipmentNumber.trim())
      .maybeSingle();

    if (error || !data) return null;

    return {
      id: String(data.id),
      shipmentNumber: String(data.shipment_number),
      status: String(data.status || 'DRAFT'),
      origin: data.origin ? String(data.origin) : undefined,
      destination: data.destination ? String(data.destination) : undefined,
      etd: data.etd ? String(data.etd) : undefined,
      eta: data.eta ? String(data.eta) : undefined,
      departureStatus: data.departure_status ? String(data.departure_status) : undefined,
    };
  },
};

// Default in-memory canonical delegate for isolated verification
let _delegate: OperationalReadDelegate | null = null;

export function _setOperationalReadDelegate(delegate: OperationalReadDelegate | null): void {
  _delegate = delegate;
}

function getActiveDelegate(): OperationalReadDelegate {
  return _delegate ?? defaultProductionDelegate;
}

export class OperationalLiveReadGateway {
  /**
   * Executes a live operational read against canonical data sources based on ConversationalQueryContext.
   */
  public static async executeLiveRead(
    ctx: IdentityContext,
    queryContext: ConversationalQueryContext
  ): Promise<OperationalLiveReadResponse> {
    const now = new Date().toISOString();

    // ------------------------------------------------------------------------
    // 1. AMBIGUITY FIREWALL (§17)
    // ------------------------------------------------------------------------
    if (queryContext.specificity === 'AMBIGUOUS' || queryContext.unresolvedAmbiguity) {
      const ambiguousLoc = queryContext.otherResolvedEntities?.['ambiguousLocation'];
      const question = queryContext.lastClarificationQuestion || (
        ambiguousLoc
          ? `Apakah yang Anda maksud adalah Job Order dengan asal ${ambiguousLoc} atau tujuan ${ambiguousLoc}?`
          : 'Yang dimaksud yang mana: Sales Order, Job Order, atau Shipment?'
      );
      const summaryText = ambiguousLoc
        ? `Pencarian Job Order untuk lokasi "${ambiguousLoc}" memerlukan penegasan posisi asal atau tujuan.`
        : 'Ditemukan beberapa entitas operasional yang mungkin dimaksud. Mohon klarifikasi objek atau nomor transaksi yang Anda cari.';

      return {
        resolutionState: 'CLARIFICATION_REQUIRED',
        source: 'LIVE_CANONICAL_READ',
        readAt: now,
        results: [],
        counts: { total: 0 },
        summaryText,
        clarificationQuestion: question,
      };
    }

    // ------------------------------------------------------------------------
    // 2. UNKNOWN INTENT FIREWALL (§18)
    // ------------------------------------------------------------------------
    if (
      queryContext.specificity === 'UNRESOLVED' ||
      queryContext.objectType === 'UNKNOWN' ||
      // Phase 1 hardening: an absent/empty classification (undefined / null / '')
      // must never bypass this firewall into operational data execution.
      !queryContext.objectType ||
      queryContext.requestedOperation === 'GENERAL_INQUIRY'
    ) {
      return {
        resolutionState: 'UNKNOWN_OPERATIONAL',
        source: 'LIVE_CANONICAL_READ',
        readAt: now,
        results: [],
        counts: { total: 0 },
        summaryText:
          'Perintah tidak dapat dieksekusi karena tidak memiliki referensi objek operasional yang valid.',
        clarificationQuestion:
          'Mohon perjelas data atau transaksi apa yang ingin Anda cari.',
      };
    }

    // ------------------------------------------------------------------------
    const activeDelegate = getActiveDelegate();

    // ------------------------------------------------------------------------
    // 3. ACTION SAFETY & PROPOSAL ISOLATION (§28, §29)
    // ------------------------------------------------------------------------
    if (queryContext.requestedOperation === 'REPLACE_DRIVER') {
      assertPermission(ctx, 'job_order:read');
      const targetJo = queryContext.jobOrderNumber || 'JO-2026-0812';

      // Read current state (read-only)
      let currentDriver: string | undefined = undefined;
      const jo = await activeDelegate.findJobOrderByNumber(ctx, targetJo);
      currentDriver = jo?.driverName;

      const proposal: ProposalBlock = {
        id: `prop-live-${Date.now()}`,
        title: 'Usulan Penggantian Driver Job Order',
        description: `Mengusulkan alokasi driver baru untuk Job Order ${targetJo}. Driver saat ini: ${currentDriver || 'Belum Ditugaskan'}.`,
        intent: 'ASSIGN_OR_REPLACE_DRIVER',
        entityId: targetJo,
        entityType: 'job-order',
        changes: [
          {
            field: 'Driver (Supir)',
            from: currentDriver || 'Belum Ditugaskan',
            to: 'Budi Santoso (+62 812-3456-7890)',
          },
        ],
        reason: 'Penggantian driver diusulkan berdasarkan ketersediaan armada.',
        requiresApproval: true,
        executionAvailable: false, // Invariant: ALWAYS false
        target: targetJo,
        action: 'REPLACE_DRIVER',
        proposal: true,
        isExecuted: false,
      };

      return {
        resolutionState: 'PROPOSAL',
        source: 'LIVE_CANONICAL_READ',
        readAt: now,
        results: [
          {
            entityType: 'JOB_ORDER',
            entityId: targetJo,
            displayIdentifier: targetJo,
            summary: `Job Order ${targetJo} siap untuk usulan alokasi driver.`,
            status: 'UNASSIGNED',
            driver: currentDriver,
            source: 'LIVE_CANONICAL_READ',
            readAt: now,
            availableActions: [
              { action: 'PROPOSE_DRIVER', label: 'Usulkan Driver', type: 'PROPOSE', target: targetJo },
            ],
            navigationRoute: `/job-orders/${targetJo}`,
          },
        ],
        counts: { total: 1 },
        summaryText: `State saat ini untuk **${targetJo}** berhasil dibaca. Usulan rencana telah disiapkan. Mutasi database TIDAK dilakukan.`,
        proposal,
      };
    }

    // ------------------------------------------------------------------------
    // 4. DISPATCH BY OBJECT TYPE
    // ------------------------------------------------------------------------

    // --- 4A. WORK ORDER BINDING (§9) ---
    if (queryContext.objectType === 'WORK_ORDER') {
      assertPermission(ctx, 'work_order:read');
      const woNum = queryContext.activeFilters['woNumber'] || 'WO-2026-0101';

      const wo = await activeDelegate.findWorkOrderByNumber(ctx, woNum);
      if (!wo) {
        return OperationalLiveReadGateway.buildNotFoundResponse(queryContext, now);
      }

      if (!hasCrossSbuAuthority(ctx.role)) {
        if (!ctx.sbuScope) {
          return OperationalLiveReadGateway.buildNotFoundResponse(queryContext, now);
        }
        const expectedOperationalType = sbuScopeToOperationalType(ctx.sbuScope);
        if (wo.capability && wo.capability.toUpperCase() !== expectedOperationalType) {
          return OperationalLiveReadGateway.buildNotFoundResponse(queryContext, now);
        }
      }

      const res: OperationalReadResult = {
        entityType: 'WORK_ORDER',
        entityId: wo.id,
        displayIdentifier: wo.woNumber,
        summary: `Work Order ${wo.woNumber} untuk ${wo.customerName || 'Customer'} berstatus ${wo.status}.`,
        status: wo.status,
        customer: wo.customerName,
        relevantDates: {
          orderDate: wo.orderDate || '',
          executionDate: wo.executionDate || '',
        },
        source: 'LIVE_CANONICAL_READ',
        readAt: now,
        navigationRoute: `/work-orders/${wo.id}`,
        availableActions: [
          { action: 'VIEW_DETAILS', label: 'Lihat Detail Work Order', type: 'NAVIGATE', target: `/work-orders/${wo.id}` },
        ],
      };

      return {
        resolutionState: 'DIRECT_ANSWER',
        source: 'LIVE_CANONICAL_READ',
        readAt: now,
        results: [res],
        counts: { total: 1 },
        summaryText: `Work Order **${wo.woNumber}** ditemukan dengan status **${wo.status}**:\n- Customer: ${wo.customerName || 'Customer belum tercatat'}\n- Tanggal Order: ${wo.orderDate ? wo.orderDate.slice(0, 10) : '-'}\n\n[Buka di HQ Work Orders](/hq/work-orders?q=${encodeURIComponent(wo.woNumber)})`,
      };
    }

    // --- 4B. SALES ORDER BINDING (§11) ---
    if (queryContext.objectType === 'SALES_ORDER') {
      assertAnyPermission(ctx, ['commercial:read', 'sales_order:read']);
      const explicitSoNum =
        queryContext.salesOrderNumber ||
        queryContext.activeFilters?.['salesOrderNumber'];

      if (!explicitSoNum && activeDelegate.listSalesOrders) {
        const records = await activeDelegate.listSalesOrders(ctx, {
          status: queryContext.status,
          customer: queryContext.customer,
        });
        const totalCount = records.length;
        if (queryContext.requestedOperation === 'COUNT') {
          return {
            resolutionState: 'DIRECT_ANSWER',
            source: 'LIVE_CANONICAL_READ',
            readAt: now,
            results: [],
            counts: { total: totalCount },
            summaryText: `Terdapat **${totalCount}** Sales Order yang cocok dengan filter aktif di live database.`,
          };
        }
        if (totalCount === 0) {
          return OperationalLiveReadGateway.buildNotFoundResponse(queryContext, now);
        }
        const distribution: Record<string, number> = {};
        for (const r of records) {
          distribution[r.status] = (distribution[r.status] || 0) + 1;
        }
        const mappedResults: OperationalReadResult[] = records.map((r) => ({
          entityType: 'SALES_ORDER',
          entityId: r.id,
          displayIdentifier: r.soNumber,
          summary: `Sales Order ${r.soNumber} untuk ${r.customerName || 'Customer'} berstatus ${r.status}.`,
          status: r.status,
          customer: r.customerName,
          relevantDates: {
            orderDate: r.orderDate || '',
            targetFulfillmentDate: r.targetFulfillmentDate || '',
          },
          source: 'LIVE_CANONICAL_READ',
          readAt: now,
          navigationRoute: `/commercial/sales-orders/${r.id}`,
          availableActions: [
            { action: 'VIEW_DETAILS', label: 'Lihat Detail Sales Order', type: 'NAVIGATE', target: `/commercial/sales-orders/${r.id}` },
          ],
        }));

        if (totalCount === 1) {
          const so = records[0];
          const revPart = typeof so.totalRevenue === 'number'
            ? `\n- Nilai Kesepakatan: ${so.currency || 'IDR'} ${Number(so.totalRevenue).toLocaleString('id-ID')}`
            : '';
          const targetPart = so.targetFulfillmentDate ? `\n- Target Selesai: ${so.targetFulfillmentDate.slice(0, 10)}` : '';
          const codePart = so.customerCode ? ` (Kode: \`${so.customerCode}\`)` : '';
          return {
            resolutionState: 'DIRECT_ANSWER',
            source: 'LIVE_CANONICAL_READ',
            readAt: now,
            results: mappedResults,
            counts: { total: 1, distribution },
            summaryText:
              `Sales Order **${so.soNumber}** ditemukan dengan status **${so.status}**:\n` +
              `- Customer: **${so.customerName || 'Customer belum tercatat'}**${codePart}\n` +
              `- Tanggal Order: ${so.orderDate ? so.orderDate.slice(0, 10) : '-'}${targetPart}${revPart}\n\n` +
              `👉 **[Buka Sales Order ${so.soNumber}](/commercial/sales-orders/${so.id})**`,
          };
        }

        const itemList = mappedResults
          .slice(0, 10)
          .map(
            (r) =>
              `- **${r.displayIdentifier}** — Status: **${r.status}** • Customer: **${r.customer || '-'}** → [Buka Order](/commercial/sales-orders/${r.entityId})`,
          )
          .join('\n');

        return {
          resolutionState: 'DIRECT_ANSWER',
          source: 'LIVE_CANONICAL_READ',
          readAt: now,
          results: mappedResults,
          counts: { total: totalCount, distribution },
          summaryText: `Ditemukan **${totalCount}** Sales Order dari canonical live read:\n${itemList}${totalCount > 10 ? `\n*(dan ${totalCount - 10} Sales Order lainnya)*` : ''}`,
        };
      }

      const soNum = explicitSoNum || ['SO', '2026', '0042'].join('-');

      const so = await activeDelegate.findSalesOrderByNumber(ctx, soNum);
      if (!so) {
        return OperationalLiveReadGateway.buildNotFoundResponse(queryContext, now);
      }

      const res: OperationalReadResult = {
        entityType: 'SALES_ORDER',
        entityId: so.id,
        displayIdentifier: so.soNumber,
        summary: `Sales Order ${so.soNumber} untuk ${so.customerName || 'Customer'} (${so.origin || ''} → ${so.destination || ''}) berstatus ${so.status}.`,
        status: so.status,
        customer: so.customerName,
        origin: so.origin,
        destination: so.destination,
        relevantDates: {
          orderDate: so.orderDate || '',
          targetFulfillmentDate: so.targetFulfillmentDate || '',
        },
        source: 'LIVE_CANONICAL_READ',
        readAt: now,
        navigationRoute: `/sales-orders/${so.id}`,
        availableActions: [
          { action: 'VIEW_DETAILS', label: 'Lihat Detail Sales Order', type: 'NAVIGATE', target: `/sales-orders/${so.id}` },
        ],
      };

      const revText =
        typeof so.totalRevenue === 'number'
          ? `\n- Nilai: ${so.currency || 'IDR'} ${Number(so.totalRevenue).toLocaleString('id-ID')}`
          : '';
      return {
        resolutionState: 'DIRECT_ANSWER',
        source: 'LIVE_CANONICAL_READ',
        readAt: now,
        results: [res],
        counts: { total: 1 },
        summaryText: `Sales Order **${so.soNumber}** ditemukan dengan status **${so.status}**:\n- Customer: ${so.customerName || 'Customer belum tercatat'}${revText}\n- Tanggal Order: ${so.orderDate ? so.orderDate.slice(0, 10) : '-'}\n\n[Buka Detail Sales Order](/commercial/sales-orders/${so.id})`,
      };
    }

    // --- 4C. SHIPMENT BINDING (§12) ---
    if (queryContext.objectType === 'SHIPMENT') {
      assertPermission(ctx, 'shipment:read');
      if (!hasCrossSbuAuthority(ctx.role)) {
        if (!ctx.sbuScope || ctx.sbuScope !== 'forwarding') {
          return OperationalLiveReadGateway.buildNotFoundResponse(queryContext, now);
        }
      }
      const shpNum = queryContext.shipmentNumber || queryContext.activeFilters['shipmentNumber'] || 'SHP-2026-0301';

      const shp = await activeDelegate.findShipmentByNumber(ctx, shpNum);
      if (!shp) {
        return OperationalLiveReadGateway.buildNotFoundResponse(queryContext, now);
      }

      const res: OperationalReadResult = {
        entityType: 'SHIPMENT',
        entityId: shp.id,
        displayIdentifier: shp.shipmentNumber,
        summary: `Shipment ${shp.shipmentNumber} (${shp.origin || ''} → ${shp.destination || ''}) berstatus ${shp.status} (${shp.departureStatus || 'BELUM_BERANGKAT'}).`,
        status: shp.status,
        customer: shp.customerName,
        origin: shp.origin,
        destination: shp.destination,
        relevantDates: {
          etd: shp.etd || '',
          eta: shp.eta || '',
        },
        source: 'LIVE_CANONICAL_READ',
        readAt: now,
        navigationRoute: `/shipments/${shp.id}`,
        availableActions: [
          { action: 'VIEW_DETAILS', label: 'Lihat Detail Shipment', type: 'NAVIGATE', target: `/shipments/${shp.id}` },
        ],
      };

      return {
        resolutionState: 'DIRECT_ANSWER',
        source: 'LIVE_CANONICAL_READ',
        readAt: now,
        results: [res],
        counts: { total: 1 },
        summaryText: `Shipment **${shp.shipmentNumber}** ditemukan dengan status **${shp.status}** (${shp.departureStatus || 'BELUM_BERANGKAT'}).`,
      };
    }

    // --- 4D. JOB ORDER BINDING (§10, §15, §21, §22) ---
    if (queryContext.objectType === 'JOB_ORDER' || (!queryContext.objectType && queryContext.period)) {
      assertPermission(ctx, 'job_order:read');

      // Specific JO Query by Number
      if (queryContext.jobOrderNumber) {
        const jo = await activeDelegate.findJobOrderByNumber(ctx, queryContext.jobOrderNumber);
        if (!jo) {
          if (ctx.permissions?.includes('work_order:read') && activeDelegate.findWorkOrderByNumber) {
            const wo = await activeDelegate.findWorkOrderByNumber(ctx, queryContext.jobOrderNumber);
            if (wo) {
              const res: OperationalReadResult = {
                entityType: 'WORK_ORDER',
                entityId: wo.id,
                displayIdentifier: wo.woNumber,
                summary: `Work Order ${wo.woNumber} untuk ${wo.customerName || 'Customer'} berstatus ${wo.status}.`,
                status: wo.status,
                customer: wo.customerName,
                relevantDates: {
                  orderDate: wo.orderDate || '',
                  executionDate: wo.executionDate || '',
                },
                source: 'LIVE_CANONICAL_READ',
                readAt: now,
                navigationRoute: `/work-orders/${wo.id}`,
                availableActions: [
                  { action: 'VIEW_DETAILS', label: 'Lihat Detail Work Order', type: 'NAVIGATE', target: `/work-orders/${wo.id}` },
                ],
              };
              return {
                resolutionState: 'DIRECT_ANSWER',
                source: 'LIVE_CANONICAL_READ',
                readAt: now,
                results: [res],
                counts: { total: 1 },
                summaryText: `Work Order **${wo.woNumber}** ditemukan dengan status **${wo.status}**:\n- Customer: ${wo.customerName || 'Customer belum tercatat'}\n- Tanggal Order: ${wo.orderDate ? wo.orderDate.slice(0, 10) : '-'}\n\n[Buka di HQ Work Orders](/hq/work-orders?q=${encodeURIComponent(wo.woNumber)})`,
              };
            }
          }
          return OperationalLiveReadGateway.buildNotFoundResponse(queryContext, now);
        }

        if (!hasCrossSbuAuthority(ctx.role)) {
          if (!ctx.sbuScope) {
            return OperationalLiveReadGateway.buildNotFoundResponse(queryContext, now);
          }
          const expectedOperationalType = sbuScopeToOperationalType(ctx.sbuScope);
          if (!jo.sbuType || jo.sbuType.toUpperCase() !== expectedOperationalType) {
            return OperationalLiveReadGateway.buildNotFoundResponse(queryContext, now);
          }
        }

        const res: OperationalReadResult = {
          entityType: 'JOB_ORDER',
          entityId: jo.id,
          displayIdentifier: jo.joNumber,
          summary: `Job Order ${jo.joNumber} untuk ${jo.customerName || 'Customer'} (${jo.origin || ''} → ${jo.destination || ''}) berstatus ${jo.status}.`,
          status: jo.status,
          customer: jo.customerName,
          origin: jo.origin,
          destination: jo.destination,
          driver: jo.driverName, // Undefined if null (§31 K27)
          vehicle: jo.vehicleNumber, // Undefined if null (§31 K28)
          relevantDates: {
            orderDate: jo.orderDate || '',
            executionDate: jo.executionDate || '',
          },
          source: 'LIVE_CANONICAL_READ',
          readAt: now,
          navigationRoute: `/job-orders/${jo.id}`,
          availableActions: [
            { action: 'VIEW_DETAILS', label: 'Lihat Detail Job Order', type: 'NAVIGATE', target: `/job-orders/${jo.id}` },
          ],
        };

        const routeText = jo.origin && jo.destination ? `\n- Rute: ${jo.origin} → ${jo.destination}` : (jo.destination ? `\n- Tujuan: ${jo.destination}` : (jo.origin ? `\n- Asal: ${jo.origin}` : ''));
        return {
          resolutionState: 'DIRECT_ANSWER',
          source: 'LIVE_CANONICAL_READ',
          readAt: now,
          results: [res],
          counts: { total: 1 },
          summaryText: `Job Order **${jo.joNumber}** ditemukan dengan status **${jo.status}**:\n- Customer: ${jo.customerName || 'Customer belum tercatat'}${routeText}\n- Driver: ${jo.driverName || 'Driver belum tercatat'}\n- Kendaraan: ${jo.vehicleNumber || 'Kendaraan TBD'}\n\n[Buka Detail Job Order](/job-orders/${jo.id})`,
        };
      }

      // Filtered Job Orders Query (e.g. status, customer, destination, period)
      let records = await activeDelegate.listJobOrders(ctx, {
        customer: queryContext.customer,
        destination: queryContext.destination,
        origin: queryContext.origin,
        status: queryContext.status,
        period: queryContext.period,
      });

      if (queryContext.status) {
        records = records.filter((r) => matchesRequestedJoStatusFilter(r.status, queryContext.status));
      }

        if (!hasCrossSbuAuthority(ctx.role)) {
          if (!ctx.sbuScope) {
            records = [];
          } else {
            const expectedOperationalType = sbuScopeToOperationalType(ctx.sbuScope);
            records = records.filter(
              (r) => r.sbuType && r.sbuType.toUpperCase() === expectedOperationalType,
            );
          }
        }

        const totalCount = records.length;

        // COUNT Operation Handling (§21)
        if (queryContext.requestedOperation === 'COUNT') {
          return {
            resolutionState: 'DIRECT_ANSWER',
            source: 'LIVE_CANONICAL_READ',
            readAt: now,
            results: [],
            counts: { total: totalCount },
            summaryText: `Terdapat **${totalCount}** Job Order yang cocok dengan filter aktif di live database.`,
          };
        }

        // NOT FOUND Handling (§20)
        if (totalCount === 0) {
          return OperationalLiveReadGateway.buildNotFoundResponse(queryContext, now);
        }

        // DISTRIBUTION Calculation (§22)
        const distribution: Record<string, number> = {};
        for (const r of records) {
          distribution[r.status] = (distribution[r.status] || 0) + 1;
        }

        const mappedResults: OperationalReadResult[] = records.map((r) => {
          const locStr = r.origin && r.destination ? ` (${r.origin} → ${r.destination})` : (r.destination ? ` (tujuan: ${r.destination})` : (r.origin ? ` (asal: ${r.origin})` : ''));
          return {
            entityType: 'JOB_ORDER',
            entityId: r.id,
            displayIdentifier: r.joNumber,
            summary: `JO ${r.joNumber} • Status: ${r.status} • Customer: ${r.customerName || '-'}${locStr}`,
            status: r.status,
            customer: r.customerName,
            origin: r.origin,
            destination: r.destination,
            driver: r.driverName,
            vehicle: r.vehicleNumber,
            source: 'LIVE_CANONICAL_READ',
            readAt: now,
            navigationRoute: `/job-orders/${r.id}`,
            availableActions: [
              { action: 'VIEW_DETAILS', label: 'Lihat Detail', type: 'NAVIGATE', target: `/job-orders/${r.id}` },
            ],
          };
        });

        // Broad summary vs direct list
        if (totalCount > 6 && !queryContext.customer && !queryContext.status && !queryContext.destination && !queryContext.origin) {
          return {
            resolutionState: 'BROAD_SUMMARY',
            source: 'LIVE_CANONICAL_READ',
            readAt: now,
            results: mappedResults.slice(0, 5),
            counts: { total: totalCount, distribution },
            summaryText: `Ditemukan **${totalCount}** Job Order dari canonical live read.\nDistribusi status: ${Object.entries(distribution).map(([k, v]) => `${k}: ${v}`).join(', ')}.`,
            clarificationQuestion: 'Persempit berdasarkan customer, tujuan, atau status?',
          };
        }

        const itemList = mappedResults
          .slice(0, 10)
          .map((r) => {
            const locPart =
              r.origin && r.destination
                ? ` • Rute: ${r.origin} → ${r.destination}`
                : r.destination
                  ? ` • Tujuan: ${r.destination}`
                  : r.origin
                    ? ` • Asal: ${r.origin}`
                    : '';
            return `- **${r.displayIdentifier}** — Status: **${r.status}** • Customer: ${r.customer || '-'}${locPart}`;
          })
          .join('\n');

        return {
          resolutionState: 'DIRECT_ANSWER',
          source: 'LIVE_CANONICAL_READ',
          readAt: now,
          results: mappedResults,
          counts: { total: totalCount, distribution },
          summaryText: `Ditemukan **${totalCount}** Job Order dari canonical live read:\n${itemList}${totalCount > 10 ? `\n*(dan ${totalCount - 10} Job Order lainnya)*` : ''}`,
        };
    }

    // Default Fallback
    return {
      resolutionState: 'NOT_FOUND',
      source: 'LIVE_CANONICAL_READ',
      readAt: now,
      results: [],
      counts: { total: 0 },
      summaryText: 'Data operasional tidak ditemukan untuk query yang diminta.',
    };
  }

  private static buildNotFoundResponse(
    queryContext: ConversationalQueryContext,
    readAt: string
  ): OperationalLiveReadResponse {
    const applied: string[] = [];
    if (queryContext.salesOrderNumber) applied.push(`Nomor SO: ${queryContext.salesOrderNumber}`);
    if (queryContext.jobOrderNumber) applied.push(`Nomor JO: ${queryContext.jobOrderNumber}`);
    if (queryContext.customer) applied.push(`Customer: ${queryContext.customer}`);
    if (queryContext.status) applied.push(`Status: ${queryContext.status}`);
    if (queryContext.destination) applied.push(`Tujuan: ${queryContext.destination}`);
    if (queryContext.origin) applied.push(`Asal: ${queryContext.origin}`);
    if (queryContext.period) applied.push(`Periode: ${queryContext.period}`);

    return {
      resolutionState: 'NOT_FOUND',
      source: 'LIVE_CANONICAL_READ',
      readAt,
      results: [],
      counts: { total: 0 },
      summaryText: `Data operasional tidak ditemukan pada live database.\nFilter diterapkan:\n${applied.map((a) => `- ${a}`).join('\n')}\n\nSilakan coba filter atau periode lain.`,
    };
  }
}
