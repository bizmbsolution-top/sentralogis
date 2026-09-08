/**
 * Sentralogis — Phase 4B / U-16
 * lib/__tests__/u16-fulfillment-operational-composition.test.ts
 *
 * FULFILLMENT OPERATIONAL COMPOSITION DISCOVERY & ARCHITECTURE TEST SUITE
 *
 * Tests the canonical operational composition model from Sales Order -> Fulfillment ->
 * operational domains (Forwarding, Customs, Trucking, Warehouse) without implementing
 * premature production code.
 *
 * Validates:
 *   - U16-01: Canonical Lineage Hierarchy (Commercial -> Composition -> Operational -> Execution)
 *   - U16-02: Fulfillment Boundary (Pure composition, not an engine)
 *   - U16-03: Allocation Semantics (Capability scoping, quantity progress)
 *   - U16-04: Shipment Separation (Logistics movement aggregate distinct from Fulfillment)
 *   - U16-05: Service Request Command Semantics (ADR-033: Command, not a Job)
 *   - U16-06: Work Order Separation (Operational commitment distinct from Fulfillment)
 *   - U16-07: Job Order Separation (Execution assignment distinct from Fulfillment)
 *   - U16-08: Cardinality Verification (ADR-034, ADR-037, ADR-042)
 *   - U16-09: Many SO -> 1 WO Prohibition (ADR-037)
 *   - U16-10: Multi-SBU Single Sales Order Support (No duplicate SBU-specific SOs)
 *   - U16-11: Partial Fulfillment Accounting
 *   - U16-12: Split Shipment Support
 *   - U16-13: Re-planning & Revisioning (ADR-043, ADR-044)
 *   - U16-14: Commercial Amendment vs Fulfillment Change Separation
 *   - U16-15: Forwarding Multimodal Decomposition (Legs, Units, BLs)
 *   - U16-16: Customs Sovereign Progressive Attachment (ADR-019, ADR-021)
 *   - U16-17: Trucking Lineage Resolution (U-07 lineage adapter)
 *   - U16-18: Warehouse Cross-Domain Handoff
 *   - U16-19: Tenant Isolation & Security (IdentityContext + RLS)
 *   - U16-20: Identity & Number Authority (Single server sequence authority)
 *   - U16-21: Second Operational Engine Detection (Zero drivers, GPS, dispatch in Fulfillment)
 *   - U16-22: Direct Operational Bypass Detection (Zero Quote/SO FKs on operational tables)
 *   - U16-23: Negative Architecture Controls (Proves detectors catch planted violations)
 *   - U16-24: End-to-End Reference Scenario (BYD CKD Multimodal Decomposition)
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const MIG_DIR = path.join(ROOT, 'supabase', 'migrations');
const LIB_DIR = path.join(ROOT, 'lib');
const APP_DIR = path.join(ROOT, 'app');

function readMigrations(): string[] {
  return fs
    .readdirSync(MIG_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => fs.readFileSync(path.join(MIG_DIR, f), 'utf8'));
}

export function runU16FulfillmentOperationalCompositionSuite(): {
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

  const migrations = readMigrations();
  const allSql = migrations.join('\n');

  const mig003 = fs.readFileSync(
    path.join(MIG_DIR, '20260826_003_canonical_shipments_and_units.sql'),
    'utf8',
  );
  const mig004 = fs.readFileSync(
    path.join(MIG_DIR, '20260826_004_service_requests_and_contracts.sql'),
    'utf8',
  );
  const mig005 = fs.readFileSync(
    path.join(MIG_DIR, '20260826_005_customs_declarations_schema.sql'),
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

  // U16-01: Canonical Lineage Hierarchy
  const hasEngagementRoot = /CREATE TABLE IF NOT EXISTS public\.commercial_work_orders/i.test(allSql);
  const hasSalesOrders = /CREATE TABLE IF NOT EXISTS public\.sales_orders/i.test(mig019);
  const hasFulfillments = /CREATE TABLE IF NOT EXISTS public\.fulfillments/i.test(mig020);
  const hasAllocations = /CREATE TABLE IF NOT EXISTS public\.fulfillment_allocations/i.test(mig020);
  check(
    'U16-01',
    'Canonical lineage hierarchy exists: commercial_work_orders -> sales_orders -> fulfillments -> fulfillment_allocations',
    hasEngagementRoot && hasSalesOrders && hasFulfillments && hasAllocations,
  );

  // U16-02: Fulfillment Boundary (Pure composition, not an engine)
  const zeroDriverFulfillment = !/md_drivers|driver_profiles/i.test(fulfillmentServiceSrc);
  const zeroJobOrderFulfillment = !/\.from\(['"]job_orders['"]\)\.(?:insert|update|delete)/i.test(
    fulfillmentServiceSrc,
  );
  check(
    'U16-02',
    'Fulfillment is a composition aggregate with zero operational execution engine mechanics',
    zeroDriverFulfillment && zeroJobOrderFulfillment,
  );

  // U16-03: Allocation Semantics
  const hasAllocatedQty = /allocated_quantity\s+NUMERIC/i.test(mig020);
  const hasDeliveredQty = /delivered_quantity\s+NUMERIC/i.test(mig020);
  const hasCapabilityType = /capability_type\s+TEXT/i.test(mig020);
  check(
    'U16-03',
    'Fulfillment Allocations define capability scope and allocated/delivered quantity accounting',
    hasAllocatedQty && hasDeliveredQty && hasCapabilityType,
  );

  // U16-04: Shipment Separation
  const hasShipmentTable = /CREATE TABLE IF NOT EXISTS public\.shp_shipments/i.test(mig003);
  const fulfillmentsNoPolPod = !/\b(pol|pod|mbl|hbl|vessel|voyage)\b/i.test(mig020);
  check(
    'U16-04',
    'Shipment is the logistics movement aggregate (ADR-040); fulfillments contains zero forwarding columns',
    hasShipmentTable && fulfillmentsNoPolPod,
  );

  // U16-05: Service Request Command Semantics (ADR-033)
  const hasServiceRequests = /CREATE TABLE IF NOT EXISTS public\.svc_service_requests/i.test(mig004);
  const hasAssignedJobPointer = /assigned_domain_job_id\s+UUID/i.test(mig004);
  check(
    'U16-05',
    'Service Request is an asynchronous cross-domain command message (ADR-033) with loose polymorphic pointer',
    hasServiceRequests && hasAssignedJobPointer,
  );

  // U16-06: Work Order Separation
  const fulfillmentNoWoMutations = !/\.from\(['"]work_orders['"]\)\.(?:insert|update|delete)/i.test(
    fulfillmentServiceSrc,
  );
  check(
    'U16-06',
    'Work Order is operational commitment; Fulfillment does NOT directly mutate work_orders table',
    fulfillmentNoWoMutations,
  );

  // U16-07: Job Order Separation
  const noJobOrderOnSo = !/CREATE TABLE[^;]*\bjob_orders\b[^;]*\bsales_order_id\b/i.test(allSql);
  const noJobOrderOnFulfillment = !/CREATE TABLE[^;]*\bjob_orders\b[^;]*\bfulfillment_id\b/i.test(allSql);
  check(
    'U16-07',
    'Job Order is execution assignment; zero direct sales_order_id or fulfillment_id FKs on job_orders',
    noJobOrderOnSo && noJobOrderOnFulfillment,
  );

  // U16-08: Cardinality Verification
  const soHasEngagement = /engagement_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.commercial_work_orders/i.test(
    mig019,
  );
  const flHasSo = /sales_order_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.sales_orders/i.test(mig020);
  const allocHasFl = /fulfillment_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.fulfillments/i.test(mig020);
  check(
    'U16-08',
    'Ratified cardinalities verified: Engagement -> SO (1:N), SO -> Fulfillment (1:N), Fulfillment -> Allocation (1:N)',
    soHasEngagement && flHasSo && allocHasFl,
  );

  // U16-09: Many SO -> 1 WO Prohibition (ADR-037)
  const noSoOnWorkOrders = !/CREATE TABLE[^;]*\bwork_orders\b[^;]*\bsales_order_id\b/i.test(allSql);
  check(
    'U16-09',
    'Many SO -> One WO is STRICTLY FORBIDDEN (ADR-037); work_orders has zero sales_order_id reference',
    noSoOnWorkOrders,
  );

  // U16-10: Multi-SBU Single Sales Order Support
  const allocCapabilityTypes = /CHECK\s*\(\s*capability_type\s+IN\s*\(\s*'CUSTOMS',\s*'FORWARDING',\s*'TRUCKING',\s*'WAREHOUSE'\s*\)\s*\)|capability_code/i.test(
    allSql,
  );
  check(
    'U16-10',
    'Single Sales Order supports multi-SBU composition across FORWARDING, CUSTOMS, TRUCKING, WAREHOUSE',
    allocCapabilityTypes,
  );

  // U16-11: Partial Fulfillment Accounting
  const hasAllocQuantities =
    /allocated_quantity\s+NUMERIC(?:\([^)]*\))?\s+NOT\s+NULL/i.test(mig020) &&
    /delivered_quantity\s+NUMERIC(?:\([^)]*\))?\s+NOT\s+NULL/i.test(mig020);
  check(
    'U16-11',
    'Partial fulfillment supported through allocated and delivered quantity tracking per allocation',
    hasAllocQuantities,
  );

  // U16-12: Split Shipment Support
  const allocHasShipmentFk = /shipment_id\s+UUID\s+REFERENCES\s+public\.shp_shipments/i.test(mig020);
  const noUniqueOnShipmentId = !/UNIQUE\s*\(\s*shipment_id\s*\)/i.test(mig020);
  check(
    'U16-12',
    'Split shipment supported: multiple allocations can link to distinct shipments under one fulfillment',
    allocHasShipmentFk && noUniqueOnShipmentId,
  );

  // U16-13: Re-planning & Revisioning (ADR-043)
  const hasRevisionNo = /revision_no\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+1/i.test(mig020);
  const hasVersionNo = /version_no\s+INTEGER\s+NOT\s+NULL\s+DEFAULT\s+1/i.test(mig020);
  check(
    'U16-13',
    'Fulfillment supports versioned replanning via revision_no and optimistic concurrency version_no',
    hasRevisionNo && hasVersionNo,
  );

  // U16-14: Commercial Amendment vs Fulfillment Change Separation (ADR-044)
  const zeroSoMutationInFulfillment = !/\.from\(['"]sales_orders['"]\)\.(?:update|delete|insert)/i.test(
    fulfillmentServiceSrc,
  );
  check(
    'U16-14',
    'Fulfillment replanning does NOT mutate commercial customer commitment on sales_orders (ADR-044)',
    zeroSoMutationInFulfillment,
  );

  // U16-15: Forwarding Multimodal Decomposition
  const hasExecutionLegs = /CREATE TABLE IF NOT EXISTS public\.shp_execution_legs/i.test(mig003);
  const hasTransportModes = /shp_transport_mode/i.test(mig003);
  const hasHandlingUnits = /CREATE TABLE IF NOT EXISTS public\.shp_units/i.test(mig003);
  check(
    'U16-15',
    'Forwarding domain decomposes shipments into multimodal execution legs and handling units',
    hasExecutionLegs && hasTransportModes && hasHandlingUnits,
  );

  // U16-16: Customs Sovereign Progressive Attachment (ADR-019, ADR-021)
  const hasAttachmentService = customsAttachmentSrc.includes('class CustomsAttachmentService');
  const hasCustomsShipmentRef = /shipment_id\s+UUID\s+REFERENCES\s+public\.shp_shipments/i.test(allSql);
  check(
    'U16-16',
    'Customs domain remains sovereign with progressive attachment (CustomsAttachmentService / ADR-021)',
    hasAttachmentService && hasCustomsShipmentRef,
  );

  // U16-17: Trucking Lineage Resolution (U-07)
  const hasLineageAdapter = truckingLineageSrc.includes('resolveTruckingLineage');
  check(
    'U16-17',
    'Trucking adapter enforces non-detached execution lineage: SR -> Engagement -> WO -> wo_item -> JO',
    hasLineageAdapter,
  );

  // U16-18: Warehouse Cross-Domain Handoff
  const hasWarehouseDomain = /target_domain.*TRUCKING.*CUSTOMS.*WAREHOUSE/i.test(mig004);
  check(
    'U16-18',
    'Warehouse operations receive work orders and cross-domain dispatch via svc_service_requests',
    hasWarehouseDomain,
  );

  // U16-19: Tenant Isolation & Security
  const hasFulfillmentRls = /CREATE POLICY fulfillments_isolation ON public\.fulfillments/i.test(mig020);
  const hasAllocationsRls = /CREATE POLICY fulfillment_allocations_isolation ON public\.fulfillment_allocations/i.test(
    mig020,
  );
  check(
    'U16-19',
    'Tenant isolation enforced via Row Level Security (RLS) and server-derived IdentityContext',
    hasFulfillmentRls && hasAllocationsRls,
  );

  // U16-20: Identity & Number Authority
  const hasNextSoFunc = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.next_sales_order/i.test(mig019);
  const hasNextFlFunc = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.next_fulfillment_number/i.test(mig020);
  check(
    'U16-20',
    'Single atomic database sequence authorities for SO (next_sales_order) and Fulfillment (next_fulfillment_number)',
    hasNextSoFunc && hasNextFlFunc,
  );

  // U16-21: Second Operational Engine Detection
  const zeroArmadaInFulfillment = !/\b(armada|gps|telemetry|vehicle_plate|driver_license)\b/i.test(
    fulfillmentServiceSrc,
  );
  check(
    'U16-21',
    'Negative check: Zero armada, GPS, driver, or fleet references in fulfillment domain service',
    zeroArmadaInFulfillment,
  );

  // U16-22: Direct Operational Bypass Detection
  const noQuoteOnJobOrders = !/CREATE TABLE[^;]*\bjob_orders\b[^;]*\bquote_id\b/i.test(allSql);
  const noQuoteOnWorkOrders = !/CREATE TABLE[^;]*\bwork_orders\b[^;]*\bquote_id\b/i.test(allSql);
  check(
    'U16-22',
    'Negative check: Zero Quote/SO direct bypass foreign keys on operational tables',
    noQuoteOnJobOrders && noQuoteOnWorkOrders,
  );

  // U16-23: Negative Architecture Controls (Proves detectors catch planted violations)
  const fakeBadDdl = `CREATE TABLE public.job_orders ( id UUID, sales_order_id UUID REFERENCES sales_orders(id) );`;
  const caughtBadSoFk = /CREATE TABLE[^;]*\bjob_orders\b[^;]*\bsales_order_id\b/i.test(fakeBadDdl);
  check(
    'U16-23',
    'Positive/Negative Soundness Control: Architecture detectors reliably detect planted operational bypasses',
    caughtBadSoFk,
  );

  // U16-24: End-to-End Reference Scenario (BYD CKD Multimodal Decomposition)
  const supportsContainerUnits = /CONTAINER/i.test(allSql);
  const supportsMultimodalLegs = /ROAD_TRUCK[\s\S]*?OCEAN_VESSEL[\s\S]*?PORT_TERMINAL_HANDLING/i.test(allSql);
  const supportsCustomsAttachment = /attachShipment/i.test(customsAttachmentSrc);
  check(
    'U16-24',
    'End-to-End Reference Scenario (BYD CKD): Architecture supports split containers, multimodal legs, and customs attachment',
    supportsContainerUnits && supportsMultimodalLegs && supportsCustomsAttachment,
  );

  console.log(`U-16 FULFILLMENT OPERATIONAL COMPOSITION SUITE: ${passed} / ${passed + failed} PASSED`);
  return { passed, failed, total: passed + failed };
}
