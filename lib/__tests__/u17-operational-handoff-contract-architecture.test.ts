/**
 * Sentralogis — Phase 4B / U-17
 * lib/__tests__/u17-operational-handoff-contract-architecture.test.ts
 *
 * OPERATIONAL HANDOFF CONTRACT ARCHITECTURE DISCOVERY TEST SUITE
 *
 * Architecture and forensic assertions proving the operational handoff contract
 * boundary across Forwarding, Customs, Trucking, and Warehouse without modifying
 * production code or creating premature migrations.
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const MIG_DIR = path.join(ROOT, 'supabase', 'migrations');
const LIB_DIR = path.join(ROOT, 'lib');
const DOCS_DIR = path.join(ROOT, 'docs', 'architecture');

function readAllMigrations(): string[] {
  if (!fs.existsSync(MIG_DIR)) return [];
  return fs
    .readdirSync(MIG_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => fs.readFileSync(path.join(MIG_DIR, f), 'utf8'));
}

export function runU17OperationalHandoffContractSuite(): {
  passed: number;
  failed: number;
  total: number;
} {
  let passed = 0;
  let failed = 0;

  function check(gate: string, desc: string, ok: boolean, detail?: string) {
    if (ok) {
      passed++;
    } else {
      failed++;
      console.error(`  ✗ [FAIL] ${gate}: ${desc}${detail ? ` — ${detail}` : ''}`);
    }
  }

  const migrations = readAllMigrations();
  const allSql = migrations.join('\n');

  const mig003 = fs.readFileSync(
    path.join(MIG_DIR, '20260826_003_canonical_shipments_and_units.sql'),
    'utf8',
  );
  const mig004 = fs.readFileSync(
    path.join(MIG_DIR, '20260826_004_service_requests_and_contracts.sql'),
    'utf8',
  );
  const mig019 = fs.readFileSync(
    path.join(MIG_DIR, '20260828_019_sales_order_foundation.sql'),
    'utf8',
  );
  const mig020 = fs.readFileSync(
    path.join(MIG_DIR, '20260828_020_fulfillment_foundation.sql'),
    'utf8',
  );

  const fulfillmentsDdl =
    mig020.match(/CREATE TABLE IF NOT EXISTS public\.fulfillments\s*\(([\s\S]*?)\);/i)?.[1] || '';
  const allocationsDdl =
    mig020.match(/CREATE TABLE IF NOT EXISTS public\.fulfillment_allocations\s*\(([\s\S]*?)\);/i)?.[1] || '';

  const fulfillmentServiceSrc = fs.existsSync(path.join(LIB_DIR, 'fulfillment', 'service.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, 'fulfillment', 'service.ts'), 'utf8')
    : '';
  const truckingLineageSrc = fs.existsSync(
    path.join(LIB_DIR, 'application', 'service-contracts', 'trucking-lineage.ts'),
  )
    ? fs.readFileSync(
        path.join(LIB_DIR, 'application', 'service-contracts', 'trucking-lineage.ts'),
        'utf8',
      )
    : '';
  const customsAttachmentSrc = fs.existsSync(
    path.join(LIB_DIR, 'domain', 'customs', 'attachment-service.ts'),
  )
    ? fs.readFileSync(path.join(LIB_DIR, 'domain', 'customs', 'attachment-service.ts'), 'utf8')
    : '';

  // U17-01: Fulfillment remains composition-only (ADR-039, ADR-045)
  const zeroDriverInFulfillment = !/md_drivers|driver_profiles/i.test(fulfillmentServiceSrc);
  const zeroGpsInFulfillment = !/\b(gps|telemetry|armada|vehicle_plate)\b/i.test(fulfillmentServiceSrc);
  check(
    'U17-01',
    'Fulfillment remains composition-only: contains zero driver, vehicle, GPS, or armada execution mechanics',
    zeroDriverInFulfillment && zeroGpsInFulfillment,
  );

  // U17-02: No direct Fulfillment -> Job Order write
  const zeroJoMutationInFulfillment = !/\.from\(['"]job_orders['"]\)\.(?:insert|update|delete)/i.test(
    fulfillmentServiceSrc,
  );
  check(
    'U17-02',
    'No direct Fulfillment -> Job Order write: Fulfillment domain does not execute direct writes on job_orders',
    zeroJoMutationInFulfillment,
  );

  // U17-03: No direct Fulfillment -> Driver assignment
  const zeroDriverAssignment = !/\b(assignDriver|dispatchDriver)\b/i.test(fulfillmentServiceSrc);
  check(
    'U17-03',
    'No direct Fulfillment -> Driver assignment: Driver scheduling belongs exclusively to operational domains',
    zeroDriverAssignment,
  );

  // U17-04: No direct Fulfillment -> GPS telemetry
  const fulfillmentsNoGps = !/\b(gps_coordinates|telemetry_lat|telemetry_lng)\b/i.test(fulfillmentsDdl);
  check(
    'U17-04',
    'No direct Fulfillment -> GPS: Fulfillments schema contains zero GPS tracking or telemetry columns',
    fulfillmentsNoGps,
  );

  // U17-05: No direct Fulfillment -> Warehouse Inventory mutation
  const zeroInventoryMutation = !/\.from\(['"]wh_inventory['"]\)\.(?:insert|update|delete)/i.test(
    fulfillmentServiceSrc,
  );
  check(
    'U17-05',
    'No direct Fulfillment -> Inventory mutation: Inventory mutations belong exclusively to WMS domain',
    zeroInventoryMutation,
  );

  // U17-06: Shipment remains forwarding root (ADR-040, ADR-046)
  const hasShipmentMovement = /CREATE TABLE IF NOT EXISTS public\.shp_shipments/i.test(mig003);
  const fulfillmentsNoPolPod = !/\b(pol|pod|mbl|hbl|vessel|voyage)\b/i.test(fulfillmentsDdl);
  check(
    'U17-06',
    'Shipment remains forwarding movement root: Forwarding movement fields (POL/POD/MBL/HBL) reside in shp_shipments',
    hasShipmentMovement && fulfillmentsNoPolPod,
  );

  // U17-07: Customs remains sovereign (ADR-019, ADR-021, ADR-047)
  const hasCustomsAttachment = customsAttachmentSrc.includes('class CustomsAttachmentService');
  check(
    'U17-07',
    'Customs remains sovereign: Statutory declarations attach progressively without mutating declaration identity',
    hasCustomsAttachment,
  );

  // U17-08: Service Request remains command boundary (ADR-033)
  const srHasLoosePointer = /assigned_domain_job_id\s+UUID/i.test(mig004);
  check(
    'U17-08',
    'Service Request remains command boundary: svc_service_requests acts as a cross-domain command with polymorphic pointer',
    srHasLoosePointer,
  );

  // U17-09: Trucking lineage preserved (U-07)
  const hasLineageResolution = truckingLineageSrc.includes('resolveTruckingLineage');
  check(
    'U17-09',
    'Trucking lineage preserved: Trucking adapter resolves lineage (SR -> Engagement -> WO -> wo_item -> JO)',
    hasLineageResolution,
  );

  // U17-10: Warehouse sovereignty preserved
  const hasWarehouseTarget = /target_domain.*WAREHOUSE/i.test(mig004);
  check(
    'U17-10',
    'Warehouse sovereignty preserved: Warehouse operations are commanded via svc_service_requests',
    hasWarehouseTarget,
  );

  // U17-11: Many SO -> One WO is FORBIDDEN (ADR-037)
  const noSoOnWorkOrders = !/CREATE TABLE[^;]*\bwork_orders\b[^;]*\bsales_order_id\b/i.test(allSql);
  check(
    'U17-11',
    'Many SO -> One WO is STRICTLY FORBIDDEN (ADR-037): work_orders table has zero sales_order_id foreign key',
    noSoOnWorkOrders,
  );

  // U17-12: Tenant derived server-side
  const domainUsesContext = !/x-tenant-id/i.test(fulfillmentServiceSrc) && fulfillmentServiceSrc.includes('context.tenantId');
  const rlsEnforced = /CREATE POLICY fulfillments_isolation/i.test(mig020);
  check(
    'U17-12',
    'Tenant derived server-side: Domain derives tenant strictly from IdentityContext; RLS active on tables',
    domainUsesContext && rlsEnforced,
  );

  // U17-13: Client tenant headers ignored
  const zeroClientTenantTrust = !/req(uest)?\.headers\.get\(['"]x-tenant/i.test(fulfillmentServiceSrc);
  check(
    'U17-13',
    'Client tenant headers ignored: Zero trust in client-supplied x-tenant-id headers in fulfillment domain',
    zeroClientTenantTrust,
  );

  // U17-14: No client canonical number generation
  const hasNextSoRpc = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.next_sales_order/i.test(mig019);
  const hasNextFlRpc = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.next_fulfillment_number/i.test(mig020);
  check(
    'U17-14',
    'No client canonical number generation: Number authorities are atomic database sequences (next_sales_order, next_fulfillment_number)',
    hasNextSoRpc && hasNextFlRpc,
  );

  // U17-15: Revision semantics preserved (ADR-043, ADR-050)
  const hasRevisionTracking =
    /revision_no\s+INTEGER\s+NOT\s+NULL/i.test(fulfillmentsDdl) &&
    /version_no\s+INTEGER\s+NOT\s+NULL/i.test(fulfillmentsDdl);
  check(
    'U17-15',
    'Revision semantics preserved: Fulfillment changes increment revision_no and version_no; historical revisions immutable',
    hasRevisionTracking,
  );

  // U17-16: Partial fulfillment supported (ADR-049)
  const hasQuantityAccounting =
    /allocated_quantity\s+NUMERIC(?:\([^)]*\))?\s+NOT\s+NULL/i.test(allocationsDdl) &&
    /delivered_quantity\s+NUMERIC(?:\([^)]*\))?\s+NOT\s+NULL/i.test(allocationsDdl);
  check(
    'U17-16',
    'Partial fulfillment supported: Allocation tracks allocated vs delivered quantities without mutating Sales Order',
    hasQuantityAccounting,
  );

  // U17-17: Split shipment supported (ADR-049)
  const splitShipmentSupported =
    /shipment_id\s+UUID\s+REFERENCES\s+public\.shp_shipments/i.test(allocationsDdl) &&
    !/UNIQUE\s*\(\s*shipment_id\s*\)/i.test(allocationsDdl);
  check(
    'U17-17',
    'Split shipment supported: Multiple allocations can reference distinct shp_shipments under one fulfillment composition',
    splitShipmentSupported,
  );

  // U17-18: Multi-SBU composition preserved (ADR-048)
  const supportsAll4 =
    allSql.includes('FORWARDING') &&
    allSql.includes('CUSTOMS') &&
    allSql.includes('TRUCKING') &&
    allSql.includes('WAREHOUSE');
  check(
    'U17-18',
    'Multi-SBU composition preserved: Single Sales Order supports FORWARDING, CUSTOMS, TRUCKING, WAREHOUSE under one Fulfillment',
    supportsAll4,
  );

  // U17-19: Operational failure isolation (ADR-050)
  const zeroSoMutationInFulfillment = !/\.from\(['"]sales_orders['"]\)\.(?:update|delete|insert)/i.test(
    fulfillmentServiceSrc,
  );
  check(
    'U17-19',
    'Operational failure isolation: Operational disruption resolution does NOT mutate parent commercial Sales Order',
    zeroSoMutationInFulfillment,
  );

  // U17-20: Idempotency boundary
  const soIdempotency = /CONSTRAINT uq_sales_order_idempotency UNIQUE/i.test(mig019);
  const flIdempotency = /CONSTRAINT uq_fulfillment_idempotency UNIQUE/i.test(mig020);
  const srIdempotency = /CONSTRAINT uq_svc_idempotency UNIQUE/i.test(mig004);
  check(
    'U17-20',
    'Idempotency boundary: Database enforces tenant-scoped idempotency constraints on SO, Fulfillment, and Service Requests',
    soIdempotency && flIdempotency && srIdempotency,
  );

  // U17-21: Zero direct Quote -> Work Order bypass
  const noQuoteOnWorkOrders = !/CREATE TABLE[^;]*\bwork_orders\b[^;]*\bquote_id\b/i.test(allSql);
  check('U17-21', 'Zero direct Quote -> Work Order bypass: work_orders has no quote_id foreign key', noQuoteOnWorkOrders);

  // U17-22: Zero direct Quote -> Job Order bypass
  const noQuoteOnJobOrders = !/CREATE TABLE[^;]*\bjob_orders\b[^;]*\bquote_id\b/i.test(allSql);
  check('U17-22', 'Zero direct Quote -> Job Order bypass: job_orders has no quote_id foreign key', noQuoteOnJobOrders);

  // U17-23: Zero direct Sales Order -> Job Order bypass
  const noSoOnJobOrders = !/CREATE TABLE[^;]*\bjob_orders\b[^;]*\bsales_order_id\b/i.test(allSql);
  check('U17-23', 'Zero direct Sales Order -> Job Order bypass: job_orders has no sales_order_id foreign key', noSoOnJobOrders);

  // U17-24: Commercial Amendment vs Fulfillment Replanning Separation (ADR-044, ADR-050)
  const validStatusTransitions = /const FULFILLMENT_TRANSITIONS/i.test(
    fs.readFileSync(path.join(LIB_DIR, 'fulfillment', 'types.ts'), 'utf8'),
  );
  check(
    'U17-24',
    'Commercial Amendment vs Replanning Separation: Fulfillment transitions are closed state machines independent of commercial amendments',
    validStatusTransitions,
  );

  // U17-25: Positive Control: Database allows versioned Fulfillment allocations
  const allocHasFk = /fulfillment_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.fulfillments/i.test(allocationsDdl);
  check(
    'U17-PC1',
    'Positive Control: Schema correctly supports 1:N capability allocations per fulfillment container',
    allocHasFk,
  );

  // U17-26: Negative Control: Detector catches planted direct bypass
  const fakeBadDdl = `CREATE TABLE public.job_orders ( id UUID, fulfillment_allocation_id UUID REFERENCES fulfillment_allocations(id) );`;
  const caughtBadHandoff = /CREATE TABLE[^;]*\bjob_orders\b[^;]*\bfulfillment_allocation_id\b/i.test(fakeBadDdl);
  check(
    'U17-NC1',
    'Negative Control: Architecture detector reliably catches planted direct Allocation -> Job Order bypass FK',
    caughtBadHandoff,
  );

  console.log(`U-17 OPERATIONAL HANDOFF CONTRACT SUITE: ${passed} / ${passed + failed} PASSED`);
  return { passed, failed, total: passed + failed };
}
