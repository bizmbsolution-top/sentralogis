/**
 * Sentralogis Copilot V2 — Unified Read Gateway Automated Tests
 * lib/__tests__/copilot-v2-read-gateway.test.ts
 *
 * Deterministic test suite verifying Option B Read Gateway implementation against
 * Final Corrective Forensic Pass v3 specifications.
 */

import fs from 'fs';
import path from 'path';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import type { IdentityContext } from '@/lib/application/identity/types';
import { IdentityResolutionError } from '@/lib/application/identity/errors';
import {
  getEntityDetail,
  ReadGatewayError,
} from '@/lib/copilot/read/read-gateway-service';
import { toReadGatewayErrorResponse } from '@/lib/copilot/read/http-response';
import { SalesOrderError } from '@/lib/sales-order/types';
import { FulfillmentError } from '@/lib/fulfillment/types';
import { ShipmentNotFoundError } from '@/lib/domain/shipment/errors';
import { WorkOrderReadError } from '@/lib/work-order/types';
import { FinancialError } from '@/lib/financial/types';

// Mock canonical domain services
vi.mock('@/lib/sales-order/service', () => ({
  findSalesOrderById: vi.fn(),
}));

vi.mock('@/lib/fulfillment/service', () => ({
  findFulfillmentCompositionById: vi.fn(),
}));

vi.mock('@/lib/domain/shipment/shipment-service', () => {
  const getShipmentMock = vi.fn();
  return {
    ShipmentService: vi.fn().mockImplementation(() => ({
      getShipment: getShipmentMock,
    })),
    __getShipmentMock: getShipmentMock,
  };
});

vi.mock('@/lib/work-order/service', () => ({
  findJobOrderById: vi.fn(),
  enrichJobOrdersWithEntityNames: vi.fn(),
}));

vi.mock('@/lib/financial/service', () => {
  const getInvoiceMock = vi.fn();
  return {
    FinancialService: vi.fn().mockImplementation(() => ({
      getInvoice: getInvoiceMock,
    })),
    __getInvoiceMock: getInvoiceMock,
  };
});

const ROOT = process.cwd();

function createIdentityContext(overrides: Partial<IdentityContext> = {}): IdentityContext {
  return {
    userId: 'usr-test-01',
    tenantId: 'tenant-test-01',
    tenantCode: 'TNT01',
    membershipId: 'mem-test-01',
    role: 'TENANT_ADMIN',
    isTenantOwner: false,
    permissions: ['commercial:read', 'shipment:read', 'job_order:read'],
    sbuScope: null,
    ...overrides,
  };
}

describe('Sentralogis Copilot V2 — Read Gateway Implementation Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ==========================================================================
  // GATE 1: Authentication Error Mapping
  // ==========================================================================
  describe('Gate 1: Authentication Error Mapping', () => {
    test('T01-AUTH: maps IdentityResolutionError UNAUTHENTICATED to HTTP 401', async () => {
      const authErr = new IdentityResolutionError('UNAUTHENTICATED', 401, 'Authentication required');
      const response = toReadGatewayErrorResponse(authErr);
      const json = await response.json();

      expect(response.status).toBe(401);
      expect(json.success).toBe(false);
      expect(json.error).toBe('UNAUTHENTICATED');
    });
  });

  // ==========================================================================
  // GATE 2: Permission Enforcement
  // ==========================================================================
  describe('Gate 2: Permission Enforcement', () => {
    test('T02-PERM-SO: rejects sales-order when context lacks commercial:read', async () => {
      const ctx = createIdentityContext({ permissions: ['shipment:read'] });
      await expect(getEntityDetail(ctx, 'sales-order', 'so-123')).rejects.toThrow(
        /Missing required permission: commercial:read/,
      );
    });

    test('T02-PERM-FL: rejects fulfillment when context lacks commercial:read', async () => {
      const ctx = createIdentityContext({ permissions: ['shipment:read'] });
      await expect(getEntityDetail(ctx, 'fulfillment', 'fl-123')).rejects.toThrow(
        /Missing required permission: commercial:read/,
      );
    });

    test('T02-PERM-SHP: rejects shipment when context lacks shipment:read', async () => {
      const ctx = createIdentityContext({ permissions: ['commercial:read'] });
      await expect(getEntityDetail(ctx, 'shipment', 'shp-123')).rejects.toThrow(
        /Missing required permission: shipment:read/,
      );
    });

    test('T02-PERM-JO: rejects job-order when context lacks job_order:read', async () => {
      const ctx = createIdentityContext({ permissions: ['shipment:read'] });
      await expect(getEntityDetail(ctx, 'job-order', 'jo-123')).rejects.toThrow(
        /Missing required permission: job_order:read/,
      );
    });

    test('T02-PERM-INV: rejects invoice when context lacks commercial:read', async () => {
      const ctx = createIdentityContext({ permissions: ['shipment:read'] });
      await expect(getEntityDetail(ctx, 'invoice', 'inv-123')).rejects.toThrow(
        /Missing required permission: commercial:read/,
      );
    });

    test('T02-PERM-RESP: maps FORBIDDEN_PERMISSION to HTTP 403', async () => {
      const permErr = new IdentityResolutionError('FORBIDDEN_PERMISSION', 403, 'Permission denied');
      const response = toReadGatewayErrorResponse(permErr);
      const json = await response.json();

      expect(response.status).toBe(403);
      expect(json.success).toBe(false);
      expect(json.error).toBe('FORBIDDEN_PERMISSION');
    });
  });

  // ==========================================================================
  // GATE 3: Tenant-Scoped Missing Entity Error Mapping
  // ==========================================================================
  describe('Gate 3: Missing / Cross-Tenant Entity Error Mapping', () => {
    test('T03-MISSING-SO: maps SalesOrderError SALES_ORDER_NOT_FOUND to HTTP 404', async () => {
      const err = new SalesOrderError('SALES_ORDER_NOT_FOUND', 404, 'Sales order not found');
      const res = toReadGatewayErrorResponse(err);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error).toBe('NOT_FOUND');
    });

    test('T03-MISSING-FL: maps FulfillmentError FULFILLMENT_NOT_FOUND to HTTP 404', async () => {
      const err = new FulfillmentError('FULFILLMENT_NOT_FOUND', 404, 'Fulfillment composition not found');
      const res = toReadGatewayErrorResponse(err);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error).toBe('NOT_FOUND');
    });

    test('T03-MISSING-SHP: maps ShipmentNotFoundError to HTTP 404', async () => {
      const err = new ShipmentNotFoundError('Shipment not found in tenant');
      const res = toReadGatewayErrorResponse(err);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error).toBe('NOT_FOUND');
    });

    test('T03-MISSING-JO: maps WorkOrderReadError NOT_FOUND to HTTP 404', async () => {
      const err = new WorkOrderReadError('NOT_FOUND', 404, 'Job order not found');
      const res = toReadGatewayErrorResponse(err);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error).toBe('NOT_FOUND');
    });

    test('T03-MISSING-INV: maps ReadGatewayError NOT_FOUND for invoice to HTTP 404', async () => {
      const err = new ReadGatewayError('NOT_FOUND', 404, 'Invoice not found in tenant');
      const res = toReadGatewayErrorResponse(err);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
      expect(json.error).toBe('NOT_FOUND');
    });
  });

  // ==========================================================================
  // GATE 4: Canonical Service Delegation & Normalization
  // ==========================================================================
  describe('Gate 4: Canonical Service Delegation & Normalization', () => {
    test('T04-DELEG-SO: hydrates sales-order via findSalesOrderById and normalizes', async () => {
      const { findSalesOrderById } = await import('@/lib/sales-order/service');
      const mockSO = {
        id: 'so-uuid-001',
        tenantId: 'tenant-test-01',
        soNumber: 'SO-2026-09-0001',
        status: 'CONFIRMED' as const,
        orderDate: '2026-09-01T00:00:00Z',
        targetFulfillmentDate: '2026-09-10T00:00:00Z',
        currency: 'IDR',
        totalAgreedRevenue: 75000000,
        paymentTermsDays: 30,
        incoterm: 'CIF',
        commercialNotes: 'Standard terms',
        engagementId: 'eng-uuid-001',
        confirmedAt: '2026-09-02T10:00:00Z',
      };
      (findSalesOrderById as any).mockResolvedValue(mockSO);

      const ctx = createIdentityContext();
      const detail = await getEntityDetail(ctx, 'sales-order', 'so-uuid-001');

      expect(findSalesOrderById).toHaveBeenCalledWith(ctx, 'so-uuid-001');
      expect(detail.type).toBe('sales-order');
      expect(detail.id).toBe('so-uuid-001');
      expect(detail.title).toBe('SO-2026-09-0001');
      expect(detail.status).toBe('CONFIRMED');
      expect(detail.statusColor).toBe('green');
      expect(detail.fields.some((f) => f.label === 'SO Number' && f.value === 'SO-2026-09-0001')).toBe(true);
      expect(detail.fields.some((f) => f.label === 'Total Revenue' && f.value.includes((75000000).toLocaleString()))).toBe(true);
      expect(detail.timeline?.length).toBeGreaterThan(0);
    });

    test('T04-DELEG-FL: hydrates fulfillment via findFulfillmentCompositionById and normalizes', async () => {
      const { findFulfillmentCompositionById } = await import('@/lib/fulfillment/service');
      const mockComp = {
        fulfillment: {
          id: 'fl-uuid-001',
          tenantId: 'tenant-test-01',
          salesOrderId: 'so-uuid-001',
          fulfillmentNumber: 'FL-2026-09-0001',
          revisionNo: 1,
          status: 'ACTIVE' as const,
          targetFulfillmentDate: '2026-09-10T00:00:00Z',
          createdAt: '2026-09-02T11:00:00Z',
          updatedAt: '2026-09-02T11:00:00Z',
        },
        allocations: [
          {
            id: 'alloc-01',
            capabilityType: 'FORWARDING',
            allocatedQuantity: 1,
            deliveredQuantity: 0,
            status: 'ACTIVE',
          },
        ],
      };
      (findFulfillmentCompositionById as any).mockResolvedValue(mockComp);

      const ctx = createIdentityContext();
      const detail = await getEntityDetail(ctx, 'fulfillment', 'fl-uuid-001');

      expect(findFulfillmentCompositionById).toHaveBeenCalledWith(ctx, 'fl-uuid-001');
      expect(detail.type).toBe('fulfillment');
      expect(detail.id).toBe('fl-uuid-001');
      expect(detail.title).toBe('FL-2026-09-0001');
      expect(detail.status).toBe('ACTIVE');
      expect(detail.statusColor).toBe('blue');
      expect(detail.fields.some((f) => f.label === 'Fulfillment No' && f.value === 'FL-2026-09-0001')).toBe(true);
    });

    test('T04-DELEG-SHP: hydrates shipment via ShipmentService.getShipment and normalizes', async () => {
      const shipmentModule = await import('@/lib/domain/shipment/shipment-service');
      const mockGetShipment = (shipmentModule as any).__getShipmentMock;
      const mockAggregate = {
        shipment: {
          id: 'shp-uuid-001',
          shipment_number: 'SHP-2026-09-0001',
          global_status: 'IN_TRANSIT',
          origin_location_id: 'loc-sby',
          destination_location_id: 'loc-jkt',
          etd: '2026-09-03T00:00:00Z',
          eta: '2026-09-06T00:00:00Z',
          master_bl_number: 'MBL-991',
          house_bl_number: 'HBL-991-A',
        },
        milestones: [
          {
            id: 'ms-01',
            milestone_code: 'DEPARTED',
            milestone_label: 'Departed Tanjung Perak',
            occurred_at: '2026-09-03T08:00:00Z',
          },
        ],
      };
      mockGetShipment.mockResolvedValue(mockAggregate);

      const ctx = createIdentityContext();
      const detail = await getEntityDetail(ctx, 'shipment', 'shp-uuid-001');

      expect(mockGetShipment).toHaveBeenCalledWith('shp-uuid-001', 'tenant-test-01');
      expect(detail.type).toBe('shipment');
      expect(detail.id).toBe('shp-uuid-001');
      expect(detail.title).toBe('SHP-2026-09-0001');
      expect(detail.status).toBe('IN_TRANSIT');
      expect(detail.statusColor).toBe('blue');
      expect(detail.timeline?.[0].title).toBe('Departed Tanjung Perak');
    });

    test('T04-DELEG-JO: hydrates job-order via findJobOrderById and normalizes', async () => {
      const { findJobOrderById, enrichJobOrdersWithEntityNames } = await import('@/lib/work-order/service');
      const rawJo = {
        id: 'jo-uuid-001',
        joNumber: 'JO-2026-09-0001',
        status: 'delivering' as const,
      };
      const enrichedJo = {
        ...rawJo,
        driverName: 'Pak Joko',
        driverPhone: '08123456789',
        fleetPlateNumber: 'B 9123 XT',
        containerNumber: 'TCKU-123456-7',
        transporterName: 'PT Mitratama',
        startedAt: '2026-09-03T09:00:00Z',
      };
      (findJobOrderById as any).mockResolvedValue(rawJo);
      (enrichJobOrdersWithEntityNames as any).mockResolvedValue([enrichedJo]);

      const ctx = createIdentityContext();
      const detail = await getEntityDetail(ctx, 'job-order', 'jo-uuid-001');

      expect(findJobOrderById).toHaveBeenCalledWith(ctx, 'jo-uuid-001');
      expect(detail.type).toBe('job-order');
      expect(detail.id).toBe('jo-uuid-001');
      expect(detail.title).toBe('JO-2026-09-0001');
      expect(detail.status).toBe('delivering');
      expect(detail.statusColor).toBe('blue');
      expect(detail.fields.some((f) => f.label === 'Driver' && f.value === 'Pak Joko')).toBe(true);
    });

    test('T04-DELEG-INV: hydrates invoice via FinancialService.getInvoice and normalizes', async () => {
      const financialModule = await import('@/lib/financial/service');
      const mockGetInvoice = (financialModule as any).__getInvoiceMock;
      const mockInv = {
        id: 'inv-uuid-001',
        invoiceNumber: 'INV-2026-09-0001',
        side: 'AR',
        status: 'PAID',
        invoiceDate: '2026-09-01',
        dueDate: '2026-09-30',
        currency: 'IDR',
        subtotal: 70000000,
        taxAmount: 7700000,
        taxPercentage: 11,
        totalAmount: 77700000,
        paidAmount: 77700000,
        paidAt: '2026-09-05T12:00:00Z',
      };
      mockGetInvoice.mockResolvedValue(mockInv);

      const ctx = createIdentityContext();
      const detail = await getEntityDetail(ctx, 'invoice', 'inv-uuid-001');

      expect(mockGetInvoice).toHaveBeenCalledWith('inv-uuid-001');
      expect(detail.type).toBe('invoice');
      expect(detail.id).toBe('inv-uuid-001');
      expect(detail.title).toBe('INV-2026-09-0001');
      expect(detail.status).toBe('PAID');
      expect(detail.statusColor).toBe('green');
      expect(detail.fields.some((f) => f.label === 'Total Amount' && f.value.includes((77700000).toLocaleString()))).toBe(true);
    });
  });

  // ==========================================================================
  // GATE 5: Architectural Invariant Tests (Zero Direct DB Access & Zero Mutation)
  // ==========================================================================
  describe('Gate 5: Architectural Invariant Tests', () => {
    const gatewaySrc = fs.readFileSync(
      path.join(ROOT, 'lib/copilot/read/read-gateway-service.ts'),
      'utf8',
    );

    test('T05-NO-DIRECT-DB: contains 0 occurrences of direct database queries', () => {
      expect(gatewaySrc).not.toContain('.from(');
      expect(gatewaySrc).not.toContain('supabaseAdmin');
      expect(gatewaySrc).not.toContain('createClient(');
      expect(gatewaySrc).not.toContain('md_entities');
      expect(gatewaySrc).not.toContain('shp_exceptions');
    });

    test('T05-NO-MUTATION: contains 0 SQL mutation calls or outbox emission calls', () => {
      expect(gatewaySrc).not.toContain('.insert(');
      expect(gatewaySrc).not.toContain('.update(');
      expect(gatewaySrc).not.toContain('.delete(');
      expect(gatewaySrc).not.toContain('event_outbox');
    });

    test('T05-EXECUTION-SEGREGATED: does not reference execution infrastructure', () => {
      expect(gatewaySrc).not.toContain('executionService');
      expect(gatewaySrc).not.toContain('executeAction');
      expect(gatewaySrc).not.toContain('ADR-092');
    });
  });

  // ==========================================================================
  // GATE 6: EntityDetail Contract Conformity & No Metadata Leakage
  // ==========================================================================
  describe('Gate 6: EntityDetail Contract Conformity', () => {
    test('T06-NO-LEAK: normalized EntityDetail does NOT contain unverified fields', async () => {
      const { findSalesOrderById } = await import('@/lib/sales-order/service');
      (findSalesOrderById as any).mockResolvedValue({
        id: 'so-leak-check',
        soNumber: 'SO-LEAK-01',
        status: 'DRAFT',
        orderDate: '2026-09-01',
      });

      const ctx = createIdentityContext();
      const detail = await getEntityDetail(ctx, 'sales-order', 'so-leak-check');

      expect((detail as any).sourceAuthority).toBeUndefined();
      expect((detail as any).domain).toBeUndefined();
      expect((detail as any).service).toBeUndefined();
      expect((detail as any).retrievedAt).toBeUndefined();
    });
  });

  // ==========================================================================
  // GATE 7: Scope Boundary Enforcement
  // ==========================================================================
  describe('Gate 7: Scope Boundary Enforcement', () => {
    const ctx = createIdentityContext();

    test('T07-SCOPE-CUST: rejects customer as unsupported in current scope', async () => {
      await expect(getEntityDetail(ctx, 'customer', 'cust-01')).rejects.toThrow(
        /Unsupported entity type/,
      );
    });

    test('T07-SCOPE-EXC: rejects exception as unsupported in current scope', async () => {
      await expect(getEntityDetail(ctx, 'exception', 'exc-01')).rejects.toThrow(
        /Unsupported entity type/,
      );
    });

    test('T07-SCOPE-WH: rejects warehouse as unsupported in current scope', async () => {
      await expect(getEntityDetail(ctx, 'warehouse', 'wh-01')).rejects.toThrow(
        /Unsupported entity type/,
      );
    });

    test('T07-SCOPE-CUS: rejects customs as unsupported in current scope', async () => {
      await expect(getEntityDetail(ctx, 'customs', 'cus-01')).rejects.toThrow(
        /Unsupported entity type/,
      );
    });

    test('T07-SCOPE-EMPTY-ID: rejects empty identifier with 400 BAD_REQUEST', async () => {
      await expect(getEntityDetail(ctx, 'sales-order', '  ')).rejects.toThrow(
        /Invalid entity ID/,
      );
    });
  });

  // ==========================================================================
  // GATE 8: Frontend Transport & Presentation Wiring
  // ==========================================================================
  describe('Gate 8: Frontend Transport & Presentation Wiring', () => {
    test('T08-TRANSPORT: copilot-api-client.ts exports fetchEntityDetail', async () => {
      const clientSrc = fs.readFileSync(
        path.join(ROOT, 'components/copilot/v2/copilot-api-client.ts'),
        'utf8',
      );
      expect(clientSrc).toContain('export async function fetchEntityDetail');
      expect(clientSrc).toContain('/api/copilot/entity/');
    });

    test('T08-PROVIDER: CopilotV2Provider.tsx calls fetchEntityDetail', async () => {
      const providerSrc = fs.readFileSync(
        path.join(ROOT, 'components/copilot/v2/CopilotV2Provider.tsx'),
        'utf8',
      );
      expect(providerSrc).toContain('fetchEntityDetail');
      expect(providerSrc).toContain('Loading details from canonical domain...');
    });

    test('T08-TYPES: types.ts includes invoice in EntityType', async () => {
      const typesSrc = fs.readFileSync(
        path.join(ROOT, 'components/copilot/v2/types.ts'),
        'utf8',
      );
      expect(typesSrc).toContain("'invoice'");
    });

    test('T08-DETAIL-PANEL: DetailPanel.tsx includes invoice icon', async () => {
      const detailSrc = fs.readFileSync(
        path.join(ROOT, 'components/copilot/v2/DetailPanel.tsx'),
        'utf8',
      );
      expect(detailSrc).toContain('invoice:');
    });
  });
});
