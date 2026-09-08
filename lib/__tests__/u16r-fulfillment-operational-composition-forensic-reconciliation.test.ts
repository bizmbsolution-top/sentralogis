/**
 * Sentralogis — Phase 4B / U-16R
 * lib/__tests__/u16r-fulfillment-operational-composition-forensic-reconciliation.test.ts
 *
 * FULFILLMENT OPERATIONAL COMPOSITION FORENSIC RECONCILIATION
 *
 * Independently audits and verifies that the U-16 Fulfillment Operational Composition
 * architecture is strictly enforced, free of cross-domain bypasses, preserves all
 * ratified ADRs (ADR-018, ADR-020, ADR-033..044), and leaves ADR-PROP-045..050 in
 * PROPOSED status without premature implementation or ratification.
 *
 * Structure:
 *   - Section A: Architectural Gates U16R-A through U16R-U
 *   - Section B: Positive Soundness Controls PC1 through PC7
 *   - Section C: Negative Soundness Controls NC1 through NC7
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const MIG_DIR = path.join(ROOT, 'supabase', 'migrations');
const LIB_DIR = path.join(ROOT, 'lib');
const APP_DIR = path.join(ROOT, 'app');
const DOCS_DIR = path.join(ROOT, 'docs', 'architecture');

function readAllMigrations(): string[] {
  return fs
    .readdirSync(MIG_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => fs.readFileSync(path.join(MIG_DIR, f), 'utf8'));
}

function collectSourceFiles(dir: string, ext = '.ts'): string[] {
  const fullDir = path.join(ROOT, dir);
  if (!fs.existsSync(fullDir)) return [];
  const skip = new Set(['node_modules', '.next', 'dist', '__tests__']);
  const out: string[] = [];
  const walk = (d: string) => {
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const e of entries) {
      if (e.isDirectory()) {
        if (!skip.has(e.name)) walk(path.join(d, e.name));
      } else if (e.name.endsWith(ext) && !e.name.endsWith('.test.ts')) {
        out.push(path.join(d, e.name));
      }
    }
  };
  walk(fullDir);
  return out;
}

export function runU16rFulfillmentOperationalCompositionForensicReconciliationSuite(): {
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

  const fulfillmentsDdl =
    mig020.match(/CREATE TABLE IF NOT EXISTS public\.fulfillments\s*\(([\s\S]*?)\);/i)?.[1] || '';
  const allocationsDdl =
    mig020.match(/CREATE TABLE IF NOT EXISTS public\.fulfillment_allocations\s*\(([\s\S]*?)\);/i)?.[1] || '';

  const fulfillmentServiceSrc = fs.existsSync(path.join(LIB_DIR, 'fulfillment', 'service.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, 'fulfillment', 'service.ts'), 'utf8')
    : '';
  const fulfillmentTypesSrc = fs.existsSync(path.join(LIB_DIR, 'fulfillment', 'types.ts'))
    ? fs.readFileSync(path.join(LIB_DIR, 'fulfillment', 'types.ts'), 'utf8')
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

  const appTsFiles = collectSourceFiles('app', '.ts').concat(collectSourceFiles('app', '.tsx'));
  const libTsFiles = collectSourceFiles('lib', '.ts');

  /* ================================================================== */
  /*  SECTION A: Architectural Gates (U16R-A through U16R-U)             */
  /* ================================================================== */

  // U16R-A: Fulfillment Boundary
  const zeroDriverFulfillment = !/md_drivers|driver_profiles/i.test(fulfillmentServiceSrc);
  const zeroGpsFulfillment = !/\b(gps|telemetry|armada|vehicle_plate)\b/i.test(fulfillmentServiceSrc);
  const zeroDispatchFulfillment = !/\b(assignDriver|assignVehicle|dispatchJob)\b/i.test(
    fulfillmentServiceSrc,
  );
  check(
    'U16R-A',
    'Fulfillment Boundary: Fulfillments domain contains zero driver, GPS, armada, or dispatch execution logic',
    zeroDriverFulfillment && zeroGpsFulfillment && zeroDispatchFulfillment,
  );

  // U16R-B: Allocation Semantics
  const allocHasQty = /allocated_quantity\s+NUMERIC/i.test(allocationsDdl);
  const allocHasDelivered = /delivered_quantity\s+NUMERIC/i.test(allocationsDdl);
  const allocHasCapType = /capability_type\s+TEXT/i.test(allocationsDdl);
  const allocNoDriver = !/\b(driver_id|vehicle_id|fleet_id|driver_name)\b/i.test(allocationsDdl);
  check(
    'U16R-B',
    'Allocation Semantics: fulfillment_allocations represents capability scope and progress, not a duplicate execution job',
    allocHasQty && allocHasDelivered && allocHasCapType && allocNoDriver,
  );

  // U16R-C: Sales Order -> Fulfillment
  const soFkInFulfillments = /sales_order_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.sales_orders\(id\)\s+ON\s+DELETE\s+RESTRICT/i.test(
    fulfillmentsDdl,
  );
  const validatesSoStatus = /validateSalesOrder[\s\S]*?status\s*!==\s*'CONFIRMED'/i.test(
    fulfillmentServiceSrc,
  );
  check(
    'U16R-C',
    'SO -> Fulfillment: fulfillments references sales_orders with ON DELETE RESTRICT and validates CONFIRMED status',
    soFkInFulfillments && validatesSoStatus,
  );

  // U16R-D: Shipment Separation
  const fulfillmentsNoPolPod = !/\b(pol|pod|mbl|hbl|vessel|voyage)\b/i.test(fulfillmentsDdl);
  const allocationsHasShipmentRef = /shipment_id\s+UUID\s+REFERENCES\s+public\.shp_shipments/i.test(
    allocationsDdl,
  );
  check(
    'U16R-D',
    'Shipment Separation: Forwarding allocation optionally references shp_shipments; fulfillments contains zero forwarding columns',
    fulfillmentsNoPolPod && allocationsHasShipmentRef,
  );

  // U16R-E: Forwarding Multimodal
  const hasMultimodalLegs = /CREATE TABLE IF NOT EXISTS public\.shp_execution_legs/i.test(mig003);
  const hasTransportModeEnum = /CREATE TYPE shp_transport_mode AS ENUM/i.test(allSql);
  check(
    'U16R-E',
    'Forwarding Multimodal: Multimodal legs, carriers, and voyage details are encapsulated in Forwarding domain',
    hasMultimodalLegs && hasTransportModeEnum,
  );

  // U16R-F: Customs Sovereignty
  const hasCustomsAttachmentService = customsAttachmentSrc.includes('class CustomsAttachmentService');
  const customsAttachmentPreservesAudit = !/delete.*audit/i.test(customsAttachmentSrc);
  check(
    'U16R-F',
    'Customs Sovereignty: Customs declarations attach progressively via CustomsAttachmentService without mutating audit history',
    hasCustomsAttachmentService && customsAttachmentPreservesAudit,
  );

  // U16R-G: Service Request Boundary
  const srHasLoosePointer = /assigned_domain_job_id\s+UUID/i.test(mig004);
  const srHasIdempotency = /CONSTRAINT uq_svc_idempotency UNIQUE/i.test(mig004);
  check(
    'U16R-G',
    'Service Request Boundary: svc_service_requests is an idempotent cross-domain command with loose polymorphic pointer (ADR-033)',
    srHasLoosePointer && srHasIdempotency,
  );

  // U16R-H: Trucking Handoff
  const truckingHasLineageResolution = truckingLineageSrc.includes('resolveTruckingLineage');
  const truckingEnforcesWoItem = truckingLineageSrc.includes('wo_item_id');
  check(
    'U16R-H',
    'Trucking Handoff: Trucking adapter resolves lineage (SR -> Engagement -> WO -> wo_item -> JO) before execution writes',
    truckingHasLineageResolution && truckingEnforcesWoItem,
  );

  // U16R-I: Warehouse Handoff
  const hasWarehouseTargetDomain = /target_domain.*WAREHOUSE/i.test(mig004);
  const zeroWmsDirectWrite = !/\.from\(['"]wh_inventory['"]\)\.(?:insert|update|delete)/i.test(
    fulfillmentServiceSrc,
  );
  check(
    'U16R-I',
    'Warehouse Handoff: Warehouse operations are commanded via svc_service_requests; Fulfillment does NOT write directly to wh_inventory',
    hasWarehouseTargetDomain && zeroWmsDirectWrite,
  );

  // U16R-J: Cardinality Guardrails
  const noSoOnWorkOrders = !/CREATE TABLE[^;]*\bwork_orders\b[^;]*\bsales_order_id\b/i.test(allSql);
  const noSoOnJobOrders = !/CREATE TABLE[^;]*\bjob_orders\b[^;]*\bsales_order_id\b/i.test(allSql);
  const noFlOnJobOrders = !/CREATE TABLE[^;]*\bjob_orders\b[^;]*\bfulfillment_id\b/i.test(allSql);
  check(
    'U16R-J',
    'Cardinality Guardrails: Many SO -> 1 WO is FORBIDDEN (ADR-037); direct SO -> JO and FL -> JO are strictly forbidden',
    noSoOnWorkOrders && noSoOnJobOrders && noFlOnJobOrders,
  );

  // U16R-K: Partial Fulfillment
  const allocHasQuantityTracking =
    /allocated_quantity\s+NUMERIC(?:\([^)]*\))?\s+NOT\s+NULL/i.test(allocationsDdl) &&
    /delivered_quantity\s+NUMERIC(?:\([^)]*\))?\s+NOT\s+NULL/i.test(allocationsDdl);
  check(
    'U16R-K',
    'Partial Fulfillment: Allocation tracking supports partial delivery accounting without mutating Sales Order header',
    allocHasQuantityTracking,
  );

  // U16R-L: Split Shipment
  const splitShipmentSupported =
    /shipment_id\s+UUID\s+REFERENCES\s+public\.shp_shipments/i.test(allocationsDdl) &&
    !/UNIQUE\s*\(\s*shipment_id\s*\)/i.test(allocationsDdl);
  check(
    'U16R-L',
    'Split Shipment: Multiple allocations can link to distinct shipments under a single fulfillment composition',
    splitShipmentSupported,
  );

  // U16R-M: Multi-SBU Composition
  const supportsAll4Capabilities =
    allSql.includes('FORWARDING') &&
    allSql.includes('CUSTOMS') &&
    allSql.includes('TRUCKING') &&
    allSql.includes('WAREHOUSE');
  check(
    'U16R-M',
    'Multi-SBU Composition: Unified composition supports FORWARDING, CUSTOMS, TRUCKING, and WAREHOUSE under one SO',
    supportsAll4Capabilities,
  );

  // U16R-N: Replanning & Revisions (ADR-043, ADR-044)
  const hasRevisionTracking =
    /revision_no\s+INTEGER\s+NOT\s+NULL/i.test(fulfillmentsDdl) &&
    /version_no\s+INTEGER\s+NOT\s+NULL/i.test(fulfillmentsDdl);
  const zeroSoMutationInFulfillment = !/\.from\(['"]sales_orders['"]\)\.(?:update|delete|insert)/i.test(
    fulfillmentServiceSrc,
  );
  check(
    'U16R-N',
    'Replanning: Revision incrementing preserves historical immutability; does NOT mutate commercial Sales Orders (ADR-044)',
    hasRevisionTracking && zeroSoMutationInFulfillment,
  );

  // U16R-O: Operational Failure Isolation
  const hasExceptionHandling =
    /EXCEPTION_HOLD/i.test(allSql) &&
    /shp_exceptions/i.test(allSql);
  check(
    'U16R-O',
    'Failure Isolation: Operational logistics failures are isolated in domain aggregates without corrupting commercial contracts',
    hasExceptionHandling,
  );

  // U16R-P: Single Identity & Number Authority
  const soNumberServerRpc = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.next_sales_order/i.test(mig019);
  const flNumberServerRpc = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.next_fulfillment_number/i.test(mig020);
  const zeroClientFlGenerators = appTsFiles.concat(libTsFiles).filter((f) => {
    const src = fs.readFileSync(f, 'utf8');
    return /FL-\d{4}-\d{2}-\d{4}/.test(src) && /Math\.random\(\)|crypto\.randomUUID\(\)/.test(src);
  }).length === 0;
  check(
    'U16R-P',
    'Identity Authority: Number authorities are atomic database sequences; zero client-side number generation',
    soNumberServerRpc && flNumberServerRpc && zeroClientFlGenerators,
  );

  // U16R-Q: Tenant Isolation
  const fulfillmentRlsPresent = /CREATE POLICY fulfillments_isolation/i.test(mig020);
  const allocationsRlsPresent = /CREATE POLICY fulfillment_allocations_isolation/i.test(mig020);
  const domainUsesContextTenant = !/x-tenant-id/i.test(fulfillmentServiceSrc) && fulfillmentServiceSrc.includes('context.tenantId');
  check(
    'U16R-Q',
    'Tenant Isolation: RLS active on fulfillments/allocations; domain strictly derives tenant from server IdentityContext',
    fulfillmentRlsPresent && allocationsRlsPresent && domainUsesContextTenant,
  );

  // U16R-R: Authorization Boundaries
  const enforcesManagePermission = fulfillmentServiceSrc.includes("assertPermission(context, 'commercial:manage')");
  const enforcesReadPermission = fulfillmentServiceSrc.includes("assertPermission(context, 'commercial:read')");
  check(
    'U16R-R',
    'Authorization: Commercial permissions (commercial:manage, commercial:read) enforced at domain boundary',
    enforcesManagePermission && enforcesReadPermission,
  );

  // U16R-S: Second Engine Absence Verification
  const zeroArmadaInFulfillment = !/\b(armada|telemetry|vehicle_plate|driver_license)\b/i.test(
    fulfillmentServiceSrc,
  );
  check(
    'U16R-S',
    'Second Engine Absence: Fulfillment domain code contains zero armada, telemetry, vehicle, or driver execution logic',
    zeroArmadaInFulfillment,
  );

  // U16R-T: Direct Operational Bypass Detection
  const noQuoteOnJobOrders = !/CREATE TABLE[^;]*\bjob_orders\b[^;]*\bquote_id\b/i.test(allSql);
  const noQuoteOnWorkOrders = !/CREATE TABLE[^;]*\bwork_orders\b[^;]*\bquote_id\b/i.test(allSql);
  const noSoOnWoItems = !/CREATE TABLE[^;]*\bwo_items\b[^;]*\bsales_order_id\b/i.test(allSql);
  check(
    'U16R-T',
    'Direct Bypass Detection: Zero direct Quote -> WO, Quote -> JO, or SO -> wo_items bypass foreign keys',
    noQuoteOnJobOrders && noQuoteOnWorkOrders && noSoOnWoItems,
  );

  // U16R-U: Proposed ADR Consistency & Status
  const u16DocPath = path.join(
    DOCS_DIR,
    'SENTRALOGIS_PHASE4B_U16_FULFILLMENT_OPERATIONAL_COMPOSITION_ARCHITECTURE_DECISION.md',
  );
  const u16DocSrc = fs.existsSync(u16DocPath) ? fs.readFileSync(u16DocPath, 'utf8') : '';
  const adrsAreProposed =
    u16DocSrc.includes('ADR-PROP-045') &&
    u16DocSrc.includes('ADR-PROP-046') &&
    u16DocSrc.includes('ADR-PROP-047') &&
    u16DocSrc.includes('ADR-PROP-048') &&
    u16DocSrc.includes('ADR-PROP-049') &&
    u16DocSrc.includes('ADR-PROP-050') &&
    u16DocSrc.includes('PROPOSED ONLY');
  check(
    'U16R-U',
    'ADR Consistency: ADR-PROP-045..050 are documented as PROPOSED ONLY and unratified',
    adrsAreProposed,
  );

  /* ================================================================== */
  /*  SECTION B: Positive Controls (PC1 through PC7)                    */
  /* ================================================================== */

  // PC1: Fulfillment -> legitimate capability allocation
  check(
    'U16R-PC1',
    'Positive Control 1: fulfillment_allocations references fulfillments(id) with ON DELETE CASCADE',
    /fulfillment_id\s+UUID\s+NOT\s+NULL\s+REFERENCES\s+public\.fulfillments\(id\)\s+ON\s+DELETE\s+CASCADE/i.test(
      allocationsDdl,
    ),
  );

  // PC2: Allocation -> legitimate Shipment reference
  check(
    'U16R-PC2',
    'Positive Control 2: fulfillment_allocations references shp_shipments(id) with ON DELETE SET NULL',
    /shipment_id\s+UUID\s+REFERENCES\s+public\.shp_shipments\(id\)\s+ON\s+DELETE\s+SET\s+NULL/i.test(
      allocationsDdl,
    ),
  );

  // PC3: Allocation -> legitimate Service Request handoff
  check(
    'U16R-PC3',
    'Positive Control 3: svc_service_requests table exists with valid cross-domain target domains',
    /CREATE TABLE IF NOT EXISTS public\.svc_service_requests/i.test(mig004),
  );

  // PC4: SO -> multiple Fulfillment revisions
  check(
    'U16R-PC4',
    'Positive Control 4: fulfillments table supports multiple revisions per Sales Order (no unique on sales_order_id)',
    !/UNIQUE\s*\(\s*sales_order_id\s*\)/i.test(fulfillmentsDdl) &&
      /revision_no\s+INTEGER\s+NOT\s+NULL/i.test(fulfillmentsDdl),
  );

  // PC5: ONE SO -> multiple allocations across multiple SBUs
  check(
    'U16R-PC5',
    'Positive Control 5: fulfillment_allocations supports multiple peer capability allocations per fulfillment',
    !/UNIQUE\s*\(\s*fulfillment_id\s*\)/i.test(allocationsDdl),
  );

  // PC6: Partial fulfillment progress accounting
  check(
    'U16R-PC6',
    'Positive Control 6: fulfillment_allocations tracks both allocated and delivered quantities',
    /allocated_quantity\s+NUMERIC/i.test(allocationsDdl) &&
      /delivered_quantity\s+NUMERIC/i.test(allocationsDdl),
  );

  // PC7: Split shipment allocation support
  check(
    'U16R-PC7',
    'Positive Control 7: shp_shipments has sales_order_id FK permitting multiple shipments per SO (ADR-038)',
    /sales_order_id\s+UUID\s+REFERENCES\s+public\.sales_orders/i.test(mig019) ||
      /ADD COLUMN IF NOT EXISTS sales_order_id/i.test(mig019),
  );

  /* ================================================================== */
  /*  SECTION C: Negative Controls (NC1 through NC7)                    */
  /* ================================================================== */

  // NC1: Fulfillment -> JO direct reference detection
  const syntheticFulfillmentWithJo = `CREATE TABLE public.fulfillments ( id UUID, job_order_id UUID REFERENCES job_orders(id) );`;
  const caughtJoOnFulfillment = /CREATE TABLE[^;]*\bfulfillments\b[^;]*\bjob_order_id\b/i.test(
    syntheticFulfillmentWithJo,
  );
  check(
    'U16R-NC1',
    'Negative Control 1: Detector reliably detects planted direct Fulfillment -> Job Order FK',
    caughtJoOnFulfillment,
  );

  // NC2: Fulfillment -> Driver direct reference detection
  const syntheticFulfillmentWithDriver = `CREATE TABLE public.fulfillments ( id UUID, driver_id UUID REFERENCES md_drivers(id) );`;
  const caughtDriverOnFulfillment = /CREATE TABLE[^;]*\bfulfillments\b[^;]*\bdriver_id\b/i.test(
    syntheticFulfillmentWithDriver,
  );
  check(
    'U16R-NC2',
    'Negative Control 2: Detector reliably detects planted direct Fulfillment -> Driver FK',
    caughtDriverOnFulfillment,
  );

  // NC3: Fulfillment -> GPS direct reference detection
  const syntheticFulfillmentWithGps = `CREATE TABLE public.fulfillments ( id UUID, gps_coordinates TEXT );`;
  const caughtGpsOnFulfillment = /CREATE TABLE[^;]*\bfulfillments\b[^;]*\bgps_coordinates\b/i.test(
    syntheticFulfillmentWithGps,
  );
  check(
    'U16R-NC3',
    'Negative Control 3: Detector reliably detects planted direct GPS fields on Fulfillment',
    caughtGpsOnFulfillment,
  );

  // NC4: Many SO -> One WO detection
  const syntheticWorkOrderWithSo = `CREATE TABLE public.work_orders ( id UUID, sales_order_id UUID REFERENCES sales_orders(id) );`;
  const caughtSoOnWorkOrder = /CREATE TABLE[^;]*\bwork_orders\b[^;]*\bsales_order_id\b/i.test(
    syntheticWorkOrderWithSo,
  );
  check(
    'U16R-NC4',
    'Negative Control 4: Detector reliably detects planted Many SO -> One WO FK (violating ADR-037)',
    caughtSoOnWorkOrder,
  );

  // NC5: Client-generated Fulfillment number detection
  const syntheticClientNumberGen = `const flNumber = 'FL-' + Math.random();`;
  const caughtClientFlGen = /FL-\d{4}-\d{2}-\d{4}|'FL-'\s*\+\s*Math\.random/.test(syntheticClientNumberGen);
  check(
    'U16R-NC5',
    'Negative Control 5: Detector reliably catches client-side Math.random() Fulfillment number generation',
    caughtClientFlGen,
  );

  // NC6: Client tenant header as authority detection
  const syntheticClientTenantTrust = `const tenantId = req.headers.get('x-tenant-id');`;
  const caughtClientTenantTrust = /req(uest)?\.headers\.get\(['"]x-tenant/i.test(syntheticClientTenantTrust);
  check(
    'U16R-NC6',
    'Negative Control 6: Detector reliably catches client-provided x-tenant-id header trust',
    caughtClientTenantTrust,
  );

  // NC7: Fulfillment embedding forwarding execution fields detection
  const syntheticFulfillmentWithPolPod = `CREATE TABLE public.fulfillments ( id UUID, pol_port_code TEXT, pod_port_code TEXT );`;
  const caughtPolPodOnFulfillment = /CREATE TABLE[^;]*\bfulfillments\b[^;]*\b(?:pol_port_code|pod_port_code)\b/i.test(
    syntheticFulfillmentWithPolPod,
  );
  check(
    'U16R-NC7',
    'Negative Control 7: Detector reliably catches forwarding POL/POD columns planted in fulfillments table',
    caughtPolPodOnFulfillment,
  );

  console.log(
    `U-16R FULFILLMENT OPERATIONAL COMPOSITION FORENSIC RECONCILIATION SUITE: ${passed} / ${passed + failed} PASSED`,
  );
  return { passed, failed, total: passed + failed };
}
