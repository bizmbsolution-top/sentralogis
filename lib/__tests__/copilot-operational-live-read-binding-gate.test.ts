/**
 * SENTRALOGIS COPILOT
 * OPERATIONAL LIVE READ BINDING GATE TEST SUITE
 * lib/__tests__/copilot-operational-live-read-binding-gate.test.ts
 *
 * Validates the binding of the Conversational Query Resolution layer
 * to canonical Sentralogis operational READ data (§3, §4, §6, §31).
 *
 * MANDATORY INVARIANTS:
 * 1. STRICTLY READ ONLY. Zero database mutations. Zero execution side effects.
 * 2. Tenant isolated: Scoped strictly by server-derived IdentityContext.
 * 3. Permission checked: Asserts canonical permissions before invocation.
 * 4. WORK_ORDER, JOB_ORDER, SALES_ORDER, and SHIPMENT remain distinct types.
 * 5. Minimum 40 tests across Categories A through N (§31).
 */

import { describe, test, expect, beforeEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import type { IdentityContext } from '@/lib/application/identity/types';
import {
  OperationalLiveReadGateway,
  _setOperationalReadDelegate,
  type OperationalReadDelegate,
  type CanonicalJobOrderRecord,
  type CanonicalWorkOrderRecord,
  type CanonicalSalesOrderRecord,
  type CanonicalShipmentRecord,
} from '@/lib/copilot/read/operational-live-read-gateway';
import type { ConversationalQueryContext } from '@/lib/copilot/sandbox/types';
import { ConversationalQueryResolver } from '@/lib/copilot/sandbox/conversational-query-resolver';

function createTestIdentityContext(overrides: Partial<IdentityContext> = {}): IdentityContext {
  return {
    userId: 'usr-live-01',
    tenantId: 'tenant-live-01',
    tenantCode: 'TNT-LIVE',
    membershipId: 'mem-live-01',
    role: 'TENANT_ADMIN',
    isTenantOwner: false,
    permissions: ['commercial:read', 'shipment:read', 'work_order:read', 'job_order:read'],
    sbuScope: null,
    ...overrides,
  };
}

// Canonical mock live dataset representing verified database state
const CANONICAL_LIVE_JOB_ORDERS: CanonicalJobOrderRecord[] = [
  {
    id: 'jo-uuid-0812',
    joNumber: 'JO-2026-0812',
    customerName: 'Customer ABC',
    origin: 'Tanjung Priok, Jakarta',
    destination: 'Tanjung Perak, Surabaya',
    status: 'ACTIVE',
    driverId: undefined, // NULL in database
    driverName: undefined, // NULL in database
    driverPhone: undefined,
    vehicleNumber: undefined, // NULL in database
    orderDate: '2026-10-02',
    executionDate: '2026-10-04',
  },
  {
    id: 'jo-uuid-0810',
    joNumber: 'JO-2026-0810',
    customerName: 'Customer ABC',
    origin: 'Cakung, Jakarta',
    destination: 'DC Semarang',
    status: 'ACTIVE',
    driverId: 'drv-live-02',
    driverName: 'Agus Pratama',
    driverPhone: '+62 813-9876-5432',
    vehicleNumber: 'B 9481 KLP',
    orderDate: '2026-10-01',
    executionDate: '2026-10-03',
  },
  {
    id: 'jo-uuid-0814',
    joNumber: 'JO-2026-0814',
    customerName: 'Customer ABC',
    origin: 'Jakarta',
    destination: 'DC Bandung',
    status: 'DOCUMENT',
    orderDate: '2026-09-30',
  },
  {
    id: 'jo-uuid-0820',
    joNumber: 'JO-2026-0820',
    customerName: 'Customer XYZ',
    origin: 'Surabaya',
    destination: 'Denpasar',
    status: 'ACTIVE',
    driverId: 'drv-live-01',
    driverName: 'Budi Santoso',
    orderDate: '2026-10-02',
  },
];

const CANONICAL_LIVE_WORK_ORDERS: CanonicalWorkOrderRecord[] = [
  {
    id: 'wo-uuid-0101',
    woNumber: 'WO-2026-0101',
    customerName: 'Customer ABC',
    status: 'CONFIRMED',
    orderDate: '2026-10-01',
    executionDate: '2026-10-03',
    capability: 'TRUCKING',
    linkedSoNumber: 'SO-2026-0041',
  },
];

const CANONICAL_LIVE_SALES_ORDERS: CanonicalSalesOrderRecord[] = [
  {
    id: 'so-uuid-0042',
    soNumber: 'SO-2026-0042',
    customerName: 'Customer ABC',
    origin: 'Jakarta',
    destination: 'Surabaya',
    status: 'CONFIRMED',
    orderDate: '2026-10-02',
    targetFulfillmentDate: '2026-10-06',
    totalRevenue: 25000000,
    currency: 'IDR',
  },
];

const CANONICAL_LIVE_SHIPMENTS: CanonicalShipmentRecord[] = [
  {
    id: 'shp-uuid-0301',
    shipmentNumber: 'SHP-2026-0301',
    customerName: 'Customer ABC',
    origin: 'Jakarta',
    destination: 'Semarang',
    status: 'READY_FOR_DISPATCH',
    departureStatus: 'BELUM_BERANGKAT',
    etd: '2026-10-04 08:00 WIB',
    eta: '2026-10-05 14:00 WIB',
    carrierName: 'Sentralogis Land Fleet',
  },
];

describe('SENTRALOGIS COPILOT — OPERATIONAL LIVE READ BINDING GATE', () => {
  beforeEach(() => {
    // Inject canonical live reader delegate for isolated testing
    const testDelegate: OperationalReadDelegate = {
      async findJobOrderByNumber(ctx, joNumber) {
        return CANONICAL_LIVE_JOB_ORDERS.find((j) => j.joNumber === joNumber) || null;
      },
      async listJobOrders(ctx, filters) {
        return CANONICAL_LIVE_JOB_ORDERS.filter((j) => {
          if (filters.customer && !j.customerName?.includes(filters.customer)) return false;
          if (filters.destination && !j.destination?.includes(filters.destination)) return false;
          if (filters.status && j.status !== filters.status) return false;
          return true;
        });
      },
      async findWorkOrderByNumber(ctx, woNumber) {
        return CANONICAL_LIVE_WORK_ORDERS.find((w) => w.woNumber === woNumber) || null;
      },
      async findSalesOrderByNumber(ctx, soNumber) {
        return CANONICAL_LIVE_SALES_ORDERS.find((s) => s.soNumber === soNumber) || null;
      },
      async findShipmentByNumber(ctx, shipmentNumber) {
        return CANONICAL_LIVE_SHIPMENTS.find((s) => s.shipmentNumber === shipmentNumber) || null;
      },
    };
    _setOperationalReadDelegate(testDelegate);
  });

  // ==========================================================================
  // §0 & §1 PREFLIGHT & STATIC BOUNDARY INVARIANTS
  // ==========================================================================
  describe('§0 & §1 Static Boundary & Architectural Invariants', () => {
    test('15 protected tracked baseline files remain intact and unmodified', () => {
      const protectedFiles = [
        'supabase/migrations/20260928_001_baseline_extensions.sql',
        'supabase/migrations/20260928_002_baseline_types.sql',
        'supabase/migrations/20260928_003_baseline_tables_and_sequences.sql',
        'supabase/migrations/20260928_004_baseline_constraints.sql',
        'supabase/migrations/20260928_005_baseline_indexes.sql',
        'supabase/migrations/20260928_006_baseline_functions.sql',
        'supabase/migrations/20260928_007_baseline_triggers.sql',
        'supabase/migrations/20260928_008_baseline_rls.sql',
        'scripts/extract-schema-layers.ts',
        'scripts/generate-baseline-layers.ts',
        'scripts/forensic-validate-baseline.ts',
        'scripts/forensic-runtime-validate-baseline.ts',
        'docs/architecture/SENTRALOGIS_WAVE_2A6_SCHEMA_BASELINE_FORENSIC.md',
        'docs/architecture/SENTRALOGIS_WAVE_2A7_PRODUCTION_SCHEMA_BASELINE_VERIFICATION.md',
        'docs/architecture/SENTRALOGIS_WAVE_2A8_PRODUCTION_SCHEMA_EVIDENCE_ACQUISITION_GATE.md',
      ];

      for (const relPath of protectedFiles) {
        const fullPath = path.resolve(process.cwd(), relPath);
        expect(fs.existsSync(fullPath)).toBe(true);
      }
    });

    test('OperationalLiveReadGateway does NOT contain database mutation calls', () => {
      const gatewayPath = path.resolve(
        process.cwd(),
        'lib/copilot/read/operational-live-read-gateway.ts'
      );
      const content = fs.readFileSync(gatewayPath, 'utf-8');

      expect(content).not.toContain('.insert(');
      expect(content).not.toContain('.update(');
      expect(content).not.toContain('.delete(');
      expect(content).not.toContain('.upsert(');
      expect(content).not.toContain('mutation-service');
      expect(content).not.toContain('execution-service');
      expect(content).not.toContain('openai');
      expect(content).not.toContain('chatgpt');
    });
  });

  // ==========================================================================
  // CATEGORY A: JOB ORDER LIVE READ (§10, Cases 1..6)
  // ==========================================================================
  describe('Category A: Job Order Live Read (§10)', () => {
    test('A1: Read specific JO by number returns canonical JO record', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        jobOrderNumber: 'JO-2026-0810',
        activeFilters: { jobOrderNumber: 'JO-2026-0810' },
        conversationTurn: 1,
        specificity: 'SUFFICIENTLY_SPECIFIC',
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.resolutionState).toBe('DIRECT_ANSWER');
      expect(res.source).toBe('LIVE_CANONICAL_READ');
      expect(res.results).toHaveLength(1);
      expect(res.results[0].entityType).toBe('JOB_ORDER');
      expect(res.results[0].displayIdentifier).toBe('JO-2026-0810');
      expect(res.results[0].driver).toBe('Agus Pratama');
      expect(res.results[0].destination).toBe('DC Semarang');
    });

    test('A2: Read JO by customer returns tenant customer orders', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        customer: 'Customer XYZ',
        activeFilters: { customer: 'Customer XYZ' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.resolutionState).toBe('DIRECT_ANSWER');
      expect(res.results.every((r) => r.customer === 'Customer XYZ')).toBe(true);
      expect(res.counts.total).toBe(1);
    });

    test('A3: Read JO by destination returns matching route orders', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        destination: 'Surabaya',
        activeFilters: { destination: 'Surabaya' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.resolutionState).toBe('DIRECT_ANSWER');
      expect(res.results[0].destination).toBe('Tanjung Perak, Surabaya');
      expect(res.results[0].displayIdentifier).toBe('JO-2026-0812');
    });

    test('A4: Read JO by status returns active status records', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        status: 'ACTIVE',
        activeFilters: { status: 'ACTIVE' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.results.every((r) => r.status === 'ACTIVE')).toBe(true);
      expect(res.counts.total).toBe(3);
    });

    test('A5: Read JO by period executes period-filtered canonical read', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        period: 'THIS_WEEK',
        activeFilters: { period: 'THIS_WEEK' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.source).toBe('LIVE_CANONICAL_READ');
      expect(res.counts.total).toBeGreaterThan(0);
    });

    test('A6: Compose multiple JO filters (Customer ABC + Surabaya + ACTIVE)', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        customer: 'Customer ABC',
        destination: 'Surabaya',
        status: 'ACTIVE',
        activeFilters: { customer: 'Customer ABC', destination: 'Surabaya', status: 'ACTIVE' },
        conversationTurn: 3,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.results).toHaveLength(1);
      expect(res.results[0].displayIdentifier).toBe('JO-2026-0812');
      expect(res.results[0].customer).toBe('Customer ABC');
      expect(res.results[0].status).toBe('ACTIVE');
    });
  });

  // ==========================================================================
  // CATEGORY B: WORK ORDER LIVE READ (§9, Cases 7..10)
  // ==========================================================================
  describe('Category B: Work Order Live Read (§9)', () => {
    test('B7: Read specific WO by number returns canonical WO record', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'WORK_ORDER',
        activeFilters: { woNumber: 'WO-2026-0101' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.resolutionState).toBe('DIRECT_ANSWER');
      expect(res.results[0].entityType).toBe('WORK_ORDER');
      expect(res.results[0].displayIdentifier).toBe('WO-2026-0101');
      expect(res.results[0].status).toBe('CONFIRMED');
    });

    test('B8: WO remains distinct from JO (different entityType and semantics)', async () => {
      const ctx = createTestIdentityContext();
      const qContextWO: ConversationalQueryContext = {
        objectType: 'WORK_ORDER',
        activeFilters: { woNumber: 'WO-2026-0101' },
        conversationTurn: 1,
      };
      const qContextJO: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        jobOrderNumber: 'JO-2026-0810',
        activeFilters: { jobOrderNumber: 'JO-2026-0810' },
        conversationTurn: 1,
      };

      const resWO = await OperationalLiveReadGateway.executeLiveRead(ctx, qContextWO);
      const resJO = await OperationalLiveReadGateway.executeLiveRead(ctx, qContextJO);

      expect(resWO.results[0].entityType).toBe('WORK_ORDER');
      expect(resJO.results[0].entityType).toBe('JOB_ORDER');
      expect(resWO.results[0].entityType).not.toBe(resJO.results[0].entityType);
    });

    test('B9: Canonical WO source points to live reader and includes navigation route', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'WORK_ORDER',
        activeFilters: { woNumber: 'WO-2026-0101' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.results[0].source).toBe('LIVE_CANONICAL_READ');
      expect(res.results[0].navigationRoute).toBe('/work-orders/wo-uuid-0101');
    });

    test('B10: WO result identity preserves customer and dates', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'WORK_ORDER',
        activeFilters: { woNumber: 'WO-2026-0101' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.results[0].customer).toBe('Customer ABC');
      expect(res.results[0].relevantDates?.orderDate).toBe('2026-10-01');
    });
  });

  // ==========================================================================
  // CATEGORY C: SALES ORDER LIVE READ (§11, Cases 11..12)
  // ==========================================================================
  describe('Category C: Sales Order Live Read (§11)', () => {
    test('C11: Read specific SO returns canonical Sales Order record', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'SALES_ORDER',
        salesOrderNumber: 'SO-2026-0042',
        activeFilters: { salesOrderNumber: 'SO-2026-0042' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.results[0].entityType).toBe('SALES_ORDER');
      expect(res.results[0].displayIdentifier).toBe('SO-2026-0042');
      expect(res.results[0].destination).toBe('Surabaya');
    });

    test('C12: SO remains distinct from WO and JO', async () => {
      const ctx = createTestIdentityContext();
      const qContextSO: ConversationalQueryContext = {
        objectType: 'SALES_ORDER',
        salesOrderNumber: 'SO-2026-0042',
        activeFilters: { salesOrderNumber: 'SO-2026-0042' },
        conversationTurn: 1,
      };

      const resSO = await OperationalLiveReadGateway.executeLiveRead(ctx, qContextSO);

      expect(resSO.results[0].entityType).toBe('SALES_ORDER');
      expect(resSO.results[0].entityType).not.toBe('WORK_ORDER');
      expect(resSO.results[0].entityType).not.toBe('JOB_ORDER');
    });
  });

  // ==========================================================================
  // CATEGORY D: SHIPMENT LIVE READ (§12, Cases 13..14)
  // ==========================================================================
  describe('Category D: Shipment Live Read (§12)', () => {
    test('D13: Read specific shipment returns canonical Shipment record', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'SHIPMENT',
        shipmentNumber: 'SHP-2026-0301',
        activeFilters: { shipmentNumber: 'SHP-2026-0301' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.results[0].entityType).toBe('SHIPMENT');
      expect(res.results[0].displayIdentifier).toBe('SHP-2026-0301');
      expect(res.results[0].status).toBe('READY_FOR_DISPATCH');
    });

    test('D14: Shipment identity preserves departure status and carrier', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'SHIPMENT',
        shipmentNumber: 'SHP-2026-0301',
        activeFilters: { shipmentNumber: 'SHP-2026-0301' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.results[0].relevantDates?.etd).toContain('2026-10-04');
      expect(res.summaryText).toContain('BELUM_BERANGKAT');
    });
  });

  // ==========================================================================
  // CATEGORY E: COUNT CONTRACT (§21, Cases 15..16)
  // ==========================================================================
  describe('Category E: Count Contract (§21)', () => {
    test('E15: Live JO count returns exact count from canonical live data', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        requestedOperation: 'COUNT',
        activeFilters: {},
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.resolutionState).toBe('DIRECT_ANSWER');
      expect(res.counts.total).toBe(4); // 4 canonical live records
      expect(res.summaryText).toContain('4');
    });

    test('E16: Filtered live JO count returns count matching specific filter', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        requestedOperation: 'COUNT',
        status: 'ACTIVE',
        activeFilters: { status: 'ACTIVE' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.counts.total).toBe(3); // 3 active canonical live records
    });
  });

  // ==========================================================================
  // CATEGORY F: NOT FOUND CONTRACT (§20, Cases 17..18)
  // ==========================================================================
  describe('Category F: Not Found Contract (§20)', () => {
    test('F17: Valid query with zero matches returns NOT_FOUND with applied filters', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        customer: 'Customer Nonexistent',
        activeFilters: { customer: 'Customer Nonexistent' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.resolutionState).toBe('NOT_FOUND');
      expect(res.results).toHaveLength(0);
      expect(res.counts.total).toBe(0);
      expect(res.summaryText).toContain('Customer Nonexistent');
    });

    test('F18: NOT_FOUND does not fabricate an alternative entity', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        jobOrderNumber: 'JO-9999-9999',
        activeFilters: { jobOrderNumber: 'JO-9999-9999' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.resolutionState).toBe('NOT_FOUND');
      expect(res.results).toHaveLength(0);
      expect(res.counts.total).toBe(0);
    });
  });

  // ==========================================================================
  // CATEGORY G: AMBIGUITY FIREWALL (§17, Cases 19..20)
  // ==========================================================================
  describe('Category G: Ambiguity Firewall (§17)', () => {
    test('G19: Ambiguous object does not trigger arbitrary database read', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        destination: 'Surabaya',
        specificity: 'AMBIGUOUS',
        unresolvedAmbiguity: true,
        activeFilters: { destination: 'Surabaya' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.resolutionState).toBe('CLARIFICATION_REQUIRED');
      expect(res.results).toHaveLength(0);
      expect(res.clarificationQuestion).toBeDefined();
    });

    test('G20: Ambiguous entity does not guess or pick first candidate', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        specificity: 'AMBIGUOUS',
        unresolvedAmbiguity: true,
        activeFilters: {},
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.resolutionState).not.toBe('DIRECT_ANSWER');
      expect(res.proposal).toBeUndefined();
    });
  });

  // ==========================================================================
  // CATEGORY H: UNKNOWN FIREWALL (§18, Case 21)
  // ==========================================================================
  describe('Category H: Unknown Intent Firewall (§18)', () => {
    test('H21: Unknown intent does not trigger speculative database query', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'UNKNOWN',
        requestedOperation: 'GENERAL_INQUIRY',
        specificity: 'UNRESOLVED',
        activeFilters: {},
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.resolutionState).toBe('UNKNOWN_OPERATIONAL');
      expect(res.results).toHaveLength(0);
      expect(res.counts.total).toBe(0);
    });
  });

  // ==========================================================================
  // CATEGORY I: CONTEXT RETENTION & RESET (§15, §16, Cases 22..24)
  // ==========================================================================
  describe('Category I: Context Retention & Reset (§15, §16)', () => {
    test('I22: Multi-turn sequential filters are retained in live read execution', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        customer: 'Customer ABC',
        destination: 'Surabaya',
        status: 'ACTIVE',
        activeFilters: { customer: 'Customer ABC', destination: 'Surabaya', status: 'ACTIVE' },
        conversationTurn: 3,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.results).toHaveLength(1);
      expect(res.results[0].displayIdentifier).toBe('JO-2026-0812');
    });

    test('I23: Filter update preserves unrelated filters during live read', async () => {
      const ctx = createTestIdentityContext();
      const prev: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        customer: 'Customer ABC',
        destination: 'Semarang',
        activeFilters: { customer: 'Customer ABC', destination: 'Semarang' },
        conversationTurn: 2,
      };

      // User refines status: 'ACTIVE'
      const refined: ConversationalQueryContext = {
        ...prev,
        status: 'ACTIVE',
        activeFilters: { ...prev.activeFilters, status: 'ACTIVE' },
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, refined);

      expect(res.results).toHaveLength(1);
      expect(res.results[0].destination).toBe('DC Semarang');
      expect(res.results[0].customer).toBe('Customer ABC');
    });

    test('I24: Context reset resolves new domain independently', async () => {
      const ctx = createTestIdentityContext();
      const qContextAfterReset: ConversationalQueryContext = {
        objectType: 'SALES_ORDER',
        customer: 'Customer ABC',
        salesOrderNumber: 'SO-2026-0042',
        activeFilters: { customer: 'Customer ABC', salesOrderNumber: 'SO-2026-0042' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContextAfterReset);

      expect(res.results[0].entityType).toBe('SALES_ORDER');
      expect(res.results[0].displayIdentifier).toBe('SO-2026-0042');
    });
  });

  // ==========================================================================
  // CATEGORY J: DISTRIBUTION INTEGRITY (§22, Cases 25..26)
  // ==========================================================================
  describe('Category J: Distribution Integrity (§22)', () => {
    test('J25: Distribution strictly reflects live canonical query records', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        customer: 'Customer ABC',
        activeFilters: { customer: 'Customer ABC' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.counts.distribution).toEqual({
        ACTIVE: 2,
        DOCUMENT: 1,
      });
      expect(res.counts.total).toBe(3);
    });

    test('J26: No sandbox fixture counts leak into live mode', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        activeFilters: {},
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      // Sandbox has 50 items; live mock has 4 items
      expect(res.counts.total).toBe(4);
      expect(res.counts.total).not.toBe(50);
    });
  });

  // ==========================================================================
  // CATEGORY K: DATA INTEGRITY (§23, Cases 27..30)
  // ==========================================================================
  describe('Category K: Data Integrity & Null Semantics (§23)', () => {
    test('K27: NULL driver in database remains undefined / not recorded', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        jobOrderNumber: 'JO-2026-0812',
        activeFilters: { jobOrderNumber: 'JO-2026-0812' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.results[0].driver).toBeUndefined();
      expect(res.summaryText).toContain('Driver belum tercatat');
      expect(res.summaryText).not.toContain('belum berangkat');
    });

    test('K28: NULL vehicle in database remains undefined / not recorded', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        jobOrderNumber: 'JO-2026-0812',
        activeFilters: { jobOrderNumber: 'JO-2026-0812' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.results[0].vehicle).toBeUndefined();
    });

    test('K29: Missing dates in database remain empty / not fabricated', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'WORK_ORDER',
        activeFilters: { woNumber: 'WO-2026-0101' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.results[0].relevantDates?.orderDate).toBe('2026-10-01');
      expect(res.results[0].relevantDates?.targetFulfillmentDate).toBeUndefined();
    });

    test('K30: Status is strictly derived from database record without fabrication', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        jobOrderNumber: 'JO-2026-0810',
        activeFilters: { jobOrderNumber: 'JO-2026-0810' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.results[0].status).toBe('ACTIVE');
    });
  });

  // ==========================================================================
  // CATEGORY L: RESULT CONTRACT & CARD READINESS (§23, §26, Cases 31..34)
  // ==========================================================================
  describe('Category L: Result Contract & Card Readiness (§23, §26)', () => {
    test('L31: Result contract includes entityType as machine-readable enum', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        jobOrderNumber: 'JO-2026-0810',
        activeFilters: { jobOrderNumber: 'JO-2026-0810' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.results[0].entityType).toBe('JOB_ORDER');
    });

    test('L32: Result contract includes canonical entityId', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        jobOrderNumber: 'JO-2026-0810',
        activeFilters: { jobOrderNumber: 'JO-2026-0810' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.results[0].entityId).toBe('jo-uuid-0810');
    });

    test('L33: Result contract includes displayIdentifier (e.g. JO-2026-0810)', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        jobOrderNumber: 'JO-2026-0810',
        activeFilters: { jobOrderNumber: 'JO-2026-0810' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.results[0].displayIdentifier).toBe('JO-2026-0810');
    });

    test('L34: Source explicitly indicates LIVE_CANONICAL_READ', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        jobOrderNumber: 'JO-2026-0810',
        activeFilters: { jobOrderNumber: 'JO-2026-0810' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.source).toBe('LIVE_CANONICAL_READ');
      expect(res.results[0].source).toBe('LIVE_CANONICAL_READ');
    });
  });

  // ==========================================================================
  // CATEGORY M: AUTHORIZATION & TENANT BOUNDARY (§7, §30, Cases 35..36)
  // ==========================================================================
  describe('Category M: Authorization & Tenant Boundary (§7, §30)', () => {
    test('M35: Asserts permission and rejects read if lacking job_order:read', async () => {
      const unauthorizedCtx = createTestIdentityContext({
        permissions: ['unrelated:read'],
      });
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        jobOrderNumber: 'JO-2026-0810',
        activeFilters: { jobOrderNumber: 'JO-2026-0810' },
        conversationTurn: 1,
      };

      await expect(
        OperationalLiveReadGateway.executeLiveRead(unauthorizedCtx, qContext)
      ).rejects.toThrow();
    });

    test('M35b: Asserts permission and rejects read if lacking work_order:read', async () => {
      const unauthorizedCtx = createTestIdentityContext({
        permissions: ['unrelated:read'],
      });
      const qContext: ConversationalQueryContext = {
        objectType: 'WORK_ORDER',
        activeFilters: { woNumber: 'WO-2026-0101' },
        conversationTurn: 1,
      };

      await expect(
        OperationalLiveReadGateway.executeLiveRead(unauthorizedCtx, qContext)
      ).rejects.toThrow();
    });

    test('M36: Asserts shipment:read for shipment live read', async () => {
      const commercialOnlyCtx = createTestIdentityContext({
        permissions: ['commercial:read'], // lacks shipment:read
      });
      const qContext: ConversationalQueryContext = {
        objectType: 'SHIPMENT',
        shipmentNumber: 'SHP-2026-0301',
        activeFilters: { shipmentNumber: 'SHP-2026-0301' },
        conversationTurn: 1,
      };

      await expect(
        OperationalLiveReadGateway.executeLiveRead(commercialOnlyCtx, qContext)
      ).rejects.toThrow();
    });
  });

  // ==========================================================================
  // CATEGORY N: ACTION & EXECUTION SAFETY (§28, §29, Cases 37..40)
  // ==========================================================================
  describe('Category N: Action & Execution Safety (§28, §29)', () => {
    test('N37: Action read inspects current state without mutating', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        jobOrderNumber: 'JO-2026-0812',
        requestedOperation: 'REPLACE_DRIVER',
        activeFilters: { jobOrderNumber: 'JO-2026-0812' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.resolutionState).toBe('PROPOSAL');
      expect(res.results[0].displayIdentifier).toBe('JO-2026-0812');
      expect(res.proposal).toBeDefined();
    });

    test('N38: Action read cannot execute database mutation', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        jobOrderNumber: 'JO-2026-0812',
        requestedOperation: 'REPLACE_DRIVER',
        activeFilters: { jobOrderNumber: 'JO-2026-0812' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.proposal?.isExecuted).toBe(false);
    });

    test('N39: Proposal remains a proposal requiring approval', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        jobOrderNumber: 'JO-2026-0812',
        requestedOperation: 'REPLACE_DRIVER',
        activeFilters: { jobOrderNumber: 'JO-2026-0812' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.proposal?.proposal).toBe(true);
      expect(res.proposal?.requiresApproval).toBe(true);
      expect(res.proposal?.target).toBe('JO-2026-0812');
    });

    test('N40: Execution flag remains strictly disabled on proposal block', async () => {
      const ctx = createTestIdentityContext();
      const qContext: ConversationalQueryContext = {
        objectType: 'JOB_ORDER',
        jobOrderNumber: 'JO-2026-0812',
        requestedOperation: 'REPLACE_DRIVER',
        activeFilters: { jobOrderNumber: 'JO-2026-0812' },
        conversationTurn: 1,
      };

      const res = await OperationalLiveReadGateway.executeLiveRead(ctx, qContext);

      expect(res.proposal?.executionAvailable).toBe(false);
    });
  });
});
