/**
 * Sentralogis Copilot V2 — Unified Copilot Read Gateway Service
 * lib/copilot/read/read-gateway-service.ts
 *
 * Server-side read-only Anti-Corruption Boundary (ACB) connecting Copilot V2
 * to verified canonical domain read services.
 *
 * MANDATORY ARCHITECTURAL BOUNDARIES:
 * 1. Read-only: Zero database mutations, zero execution side effects.
 * 2. Zero Direct DB: Strictly delegates to canonical domain services. NEVER queries database tables directly.
 * 3. Zero Table Ownership: Owns no database tables, views, sequences, or persistence.
 * 4. Tenant Isolated: Scoped strictly by server-derived IdentityContext.
 * 5. Permission Checked: Asserts canonical permissions before invocation.
 * 6. Authorized Scope: sales-order, fulfillment, shipment, job-order, invoice.
 *    (Customer, Exception, Warehouse, Customs remain outside current scope).
 */

import type { IdentityContext } from '@/lib/application/identity/types';
import { assertPermission, assertAnyPermission } from '@/lib/application/identity/resolver';
import type {
  EntityDetail,
  DetailField,
  TimelineEvent,
  EntityType,
} from '@/components/copilot/v2/types';

// Canonical Domain Read Services
import { findSalesOrderById } from '@/lib/sales-order/service';
import { findFulfillmentCompositionById } from '@/lib/fulfillment/service';
import { ShipmentService } from '@/lib/domain/shipment/shipment-service';
import { findJobOrderById, enrichJobOrdersWithEntityNames } from '@/lib/work-order/service';
import { FinancialService } from '@/lib/financial/service';

// Custom Gateway Error
export class ReadGatewayError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = 'ReadGatewayError';
  }
}

// ----------------------------------------------------------------------------
// Normalization Helpers
// ----------------------------------------------------------------------------

function mapSalesOrderStatusColor(status: string): 'green' | 'yellow' | 'red' | 'blue' | 'gray' {
  switch (status) {
    case 'CONFIRMED':
    case 'FULFILLED':
    case 'CLOSED':
      return 'green';
    case 'IN_FULFILLMENT':
    case 'PARTIALLY_FULFILLED':
      return 'blue';
    case 'DRAFT':
      return 'yellow';
    case 'CANCELLED':
      return 'red';
    default:
      return 'gray';
  }
}

function mapFulfillmentStatusColor(status: string): 'green' | 'yellow' | 'red' | 'blue' | 'gray' {
  switch (status) {
    case 'FULFILLED':
    case 'CLOSED':
      return 'green';
    case 'ACTIVE':
    case 'PARTIALLY_FULFILLED':
      return 'blue';
    case 'PLANNED':
      return 'yellow';
    case 'CANCELLED':
      return 'red';
    default:
      return 'gray';
  }
}

function mapShipmentStatusColor(status: string): 'green' | 'yellow' | 'red' | 'blue' | 'gray' {
  switch (status) {
    case 'DELIVERED':
    case 'COMPLETED':
      return 'green';
    case 'IN_TRANSIT':
    case 'BOOKED':
    case 'OUT_FOR_DELIVERY':
    case 'CUSTOMS_RELEASED':
      return 'blue';
    case 'PLANNED':
    case 'DRAFT':
    case 'AT_INTERMEDIATE_NODE':
      return 'yellow';
    case 'EXCEPTION_HOLD':
    case 'CUSTOMS_HOLD':
    case 'CANCELLED':
      return 'red';
    default:
      return 'gray';
  }
}

function mapJobOrderStatusColor(status: string): 'green' | 'yellow' | 'red' | 'blue' | 'gray' {
  const s = (status || '').trim().toLowerCase();
  switch (s) {
    case 'completed':
    case 'pekerjaan selesai':
    case 'selesai':
    case 'done':
    case 'verified':
    case 'delivered':
    case 'invoiced':
    case 'paid':
      return 'green';
    case 'delivering':
    case 'picking_up':
    case 'accepted':
    case 'assigned':
    case 'in_progress':
    case 'tiba di lokasi bongkar':
    case 'dalam perjalanan':
      return 'blue';
    case 'pending':
    case 'waiting_armada':
    case 'awaiting_audit':
      return 'yellow';
    case 'incident':
    case 'cancelled':
    case 'canceled':
    case 'batal':
    case 'dibatalkan':
    case 'rejected':
    case 'ditolak':
      return 'red';
    default:
      return 'gray';
  }
}

function mapInvoiceStatusColor(status: string): 'green' | 'yellow' | 'red' | 'blue' | 'gray' {
  const s = status ? status.toUpperCase() : '';
  switch (s) {
    case 'PAID':
      return 'green';
    case 'INVOICED':
    case 'PARTIAL_PAID':
    case 'SENT':
      return 'blue';
    case 'PENDING':
    case 'DRAFT':
      return 'yellow';
    case 'CANCELLED':
    case 'OVERDUE':
    case 'WRITTEN_OFF':
      return 'red';
    default:
      return 'gray';
  }
}

// ----------------------------------------------------------------------------
// Entity Handlers
// ----------------------------------------------------------------------------

async function getSalesOrderDetail(ctx: IdentityContext, id: string): Promise<EntityDetail> {
  assertAnyPermission(ctx, ['commercial:read', 'sales_order:read']);
  const so = await findSalesOrderById(ctx, id);

  const fields: DetailField[] = [
    { label: 'SO Number', value: so.soNumber },
    { label: 'Status', value: so.status },
    ...(so.customerName ? [{ label: 'Customer', value: so.customerName }] : []),
    ...(so.engagementNumber ? [{ label: 'Engagement No', value: so.engagementNumber }] : []),
    { label: 'Currency', value: so.currency },
    { label: 'Total Revenue', value: `${so.currency} ${Number(so.totalAgreedRevenue || 0).toLocaleString()}` },
    { label: 'Payment Terms', value: `${so.paymentTermsDays || 0} days` },
    { label: 'Target Date', value: so.targetFulfillmentDate || 'Not specified' },
    { label: 'Incoterm', value: so.incoterm || '-' },
    { label: 'Engagement ID', value: so.engagementId },
  ];

  const timeline: TimelineEvent[] = [];
  if (so.orderDate) {
    timeline.push({
      id: `so-${so.id}-order`,
      date: so.orderDate,
      title: 'Sales Order Placed',
      description: `Committed revenue: ${so.currency} ${Number(so.totalAgreedRevenue || 0).toLocaleString()}`,
      type: 'info',
    });
  }
  if (so.confirmedAt) {
    timeline.push({
      id: `so-${so.id}-confirmed`,
      date: so.confirmedAt,
      title: 'Sales Order Confirmed',
      description: 'Commercial commitment locked and ready for fulfillment.',
      type: 'success',
    });
  }

  return {
    type: 'sales-order',
    id: so.id,
    title: so.soNumber,
    subtitle: `Sales Order • ${so.status}`,
    status: so.status,
    statusColor: mapSalesOrderStatusColor(so.status),
    fields,
    timeline: timeline.length > 0 ? timeline : undefined,
    evidence: [],
  };
}

async function getFulfillmentDetail(ctx: IdentityContext, id: string): Promise<EntityDetail> {
  assertAnyPermission(ctx, ['commercial:read', 'sales_order:read']);
  const comp = await findFulfillmentCompositionById(ctx, id);
  const fl = comp.fulfillment;

  const fields: DetailField[] = [
    { label: 'Fulfillment No', value: fl.fulfillmentNumber },
    { label: 'Status', value: fl.status },
    { label: 'Revision', value: `Rev ${fl.revisionNo}` },
    { label: 'Sales Order ID', value: fl.salesOrderId },
    { label: 'Target Date', value: fl.targetFulfillmentDate || 'Not specified' },
    { label: 'Allocations', value: `${comp.allocations.length} capability scope(s)` },
  ];

  const timeline: TimelineEvent[] = [];
  if (fl.createdAt) {
    timeline.push({
      id: `fl-${fl.id}-created`,
      date: fl.createdAt,
      title: `Fulfillment Composition Initialized (Rev ${fl.revisionNo})`,
      description: `${comp.allocations.length} capability allocations planned.`,
      type: 'info',
    });
  }
  if (fl.updatedAt && fl.updatedAt !== fl.createdAt) {
    timeline.push({
      id: `fl-${fl.id}-updated`,
      date: fl.updatedAt,
      title: 'Fulfillment Composition Updated',
      description: `Current status: ${fl.status}`,
      type: fl.status === 'CANCELLED' ? 'error' : 'info',
    });
  }

  return {
    type: 'fulfillment',
    id: fl.id,
    title: fl.fulfillmentNumber,
    subtitle: `Fulfillment • Rev ${fl.revisionNo} (${fl.status})`,
    status: fl.status,
    statusColor: mapFulfillmentStatusColor(fl.status),
    fields,
    timeline: timeline.length > 0 ? timeline : undefined,
    evidence: [],
  };
}

async function getShipmentDetail(ctx: IdentityContext, id: string): Promise<EntityDetail> {
  assertPermission(ctx, 'shipment:read');
  const shipmentService = new ShipmentService();
  const agg = await shipmentService.getShipment(id, ctx.tenantId);
  const s = agg.shipment;

  const fields: DetailField[] = [
    { label: 'Shipment No', value: s.shipment_number },
    { label: 'Status', value: s.global_status },
    { label: 'Origin ID', value: s.origin_location_id },
    { label: 'Destination ID', value: s.destination_location_id },
    { label: 'ETD', value: s.etd || '-' },
    { label: 'ETA', value: s.eta || '-' },
    { label: 'Master BL', value: s.master_bl_number || '-' },
    { label: 'House BL', value: s.house_bl_number || '-' },
  ];

  const timeline: TimelineEvent[] = (agg.milestones || []).map((m) => ({
    id: `milestone-${m.id || m.milestone_code}`,
    date: m.occurred_at,
    title: m.milestone_label || m.milestone_code,
    type: 'info',
  }));

  return {
    type: 'shipment',
    id: s.id,
    title: s.shipment_number,
    subtitle: `Forwarding Shipment • ${s.global_status}`,
    status: s.global_status,
    statusColor: mapShipmentStatusColor(s.global_status),
    fields,
    timeline: timeline.length > 0 ? timeline : undefined,
    evidence: [],
  };
}

async function getJobOrderDetail(ctx: IdentityContext, id: string): Promise<EntityDetail> {
  assertPermission(ctx, 'job_order:read');
  const jo = await findJobOrderById(ctx, id);
  const enrichedList = await enrichJobOrdersWithEntityNames(ctx, [jo]);
  const enriched = enrichedList[0] || jo;

  const fields: DetailField[] = [
    { label: 'JO Number', value: enriched.joNumber },
    { label: 'Status', value: enriched.status },
    ...(enriched.customerName ? [{ label: 'Customer', value: enriched.customerName }] : []),
    ...(enriched.woNumber ? [{ label: 'Work Order', value: enriched.woNumber }] : []),
    ...(enriched.origin ? [{ label: 'Origin', value: enriched.origin }] : []),
    ...(enriched.destination ? [{ label: 'Destination', value: enriched.destination }] : []),
    { label: 'Driver', value: enriched.driverName || 'Unassigned' },
    { label: 'Driver Phone', value: enriched.driverPhone || '-' },
    { label: 'Fleet Plate', value: enriched.fleetPlateNumber || '-' },
    { label: 'Container', value: enriched.containerNumber || '-' },
    { label: 'Transporter', value: enriched.transporterName || '-' },
    { label: 'Notes', value: enriched.notes || '-' },
  ];

  const timeline: TimelineEvent[] = [];
  if (enriched.assignedAt) {
    timeline.push({
      id: `jo-${enriched.id}-assigned`,
      date: enriched.assignedAt,
      title: 'Driver & Armada Assigned',
      description: `Assigned to ${enriched.driverName || 'Driver'} (${enriched.fleetPlateNumber || 'Armada'})`,
      type: 'info',
    });
  }
  if (enriched.acceptedAt) {
    timeline.push({
      id: `jo-${enriched.id}-accepted`,
      date: enriched.acceptedAt,
      title: 'Job Order Accepted by Driver',
      type: 'info',
    });
  }
  if (enriched.startedAt) {
    timeline.push({
      id: `jo-${enriched.id}-started`,
      date: enriched.startedAt,
      title: 'Trip Execution Started',
      type: 'info',
    });
  }
  if (enriched.completedAt) {
    timeline.push({
      id: `jo-${enriched.id}-completed`,
      date: enriched.completedAt,
      title: 'Job Order Completed',
      type: 'success',
    });
  }

  return {
    type: 'job-order',
    id: enriched.id,
    title: enriched.joNumber,
    subtitle: `Job Order • Driver: ${enriched.driverName || 'Unassigned'}`,
    status: enriched.status,
    statusColor: mapJobOrderStatusColor(enriched.status),
    fields,
    timeline: timeline.length > 0 ? timeline : undefined,
    evidence: [],
  };
}

async function getInvoiceDetail(ctx: IdentityContext, id: string): Promise<EntityDetail> {
  assertPermission(ctx, 'commercial:read');
  const financialService = new FinancialService(ctx);
  const inv = await financialService.getInvoice(id);

  if (!inv) {
    throw new ReadGatewayError('NOT_FOUND', 404, `Invoice ${id} not found in tenant.`);
  }

  const fields: DetailField[] = [
    { label: 'Invoice No', value: inv.invoiceNumber },
    { label: 'Side', value: inv.side },
    { label: 'Status', value: inv.status },
    { label: 'Invoice Date', value: inv.invoiceDate },
    { label: 'Due Date', value: inv.dueDate || '-' },
    { label: 'Subtotal', value: `${inv.currency} ${Number(inv.subtotal || 0).toLocaleString()}` },
    { label: 'Tax', value: `${inv.currency} ${Number(inv.taxAmount || 0).toLocaleString()} (${inv.taxPercentage || 0}%)` },
    { label: 'Total Amount', value: `${inv.currency} ${Number(inv.totalAmount || 0).toLocaleString()}` },
    { label: 'Paid Amount', value: `${inv.currency} ${Number(inv.paidAmount || 0).toLocaleString()}` },
  ];

  const timeline: TimelineEvent[] = [];
  if (inv.invoiceDate) {
    timeline.push({
      id: `inv-${inv.id}-date`,
      date: inv.invoiceDate,
      title: 'Invoice Issued',
      description: `Total Amount: ${inv.currency} ${Number(inv.totalAmount || 0).toLocaleString()}`,
      type: 'info',
    });
  }
  if (inv.paidAt) {
    timeline.push({
      id: `inv-${inv.id}-paid`,
      date: inv.paidAt,
      title: 'Invoice Paid',
      description: `Settled: ${inv.currency} ${Number(inv.paidAmount || 0).toLocaleString()}`,
      type: 'success',
    });
  }

  return {
    type: 'invoice' as EntityType,
    id: inv.id,
    title: inv.invoiceNumber,
    subtitle: `${inv.side} Settlement Invoice (${inv.status})`,
    status: inv.status,
    statusColor: mapInvoiceStatusColor(inv.status),
    fields,
    timeline: timeline.length > 0 ? timeline : undefined,
    evidence: [],
  };
}

// ----------------------------------------------------------------------------
// Unified Public Dispatcher
// ----------------------------------------------------------------------------

export async function getEntityDetail(
  ctx: IdentityContext,
  type: string,
  id: string,
): Promise<EntityDetail> {
  if (!id || typeof id !== 'string' || id.trim().length === 0) {
    throw new ReadGatewayError('BAD_REQUEST', 400, 'Invalid entity ID: identifier must be a non-empty string.');
  }

  const normalizedType = type.trim().toLowerCase();

  switch (normalizedType) {
    case 'sales-order':
      return getSalesOrderDetail(ctx, id.trim());
    case 'fulfillment':
      return getFulfillmentDetail(ctx, id.trim());
    case 'shipment':
      return getShipmentDetail(ctx, id.trim());
    case 'job-order':
      return getJobOrderDetail(ctx, id.trim());
    case 'invoice':
      return getInvoiceDetail(ctx, id.trim());
    default:
      throw new ReadGatewayError(
        'BAD_REQUEST',
        400,
        `Unsupported entity type: '${type}'. Authorized read scope includes only: sales-order, fulfillment, shipment, job-order, invoice.`,
      );
  }
}
