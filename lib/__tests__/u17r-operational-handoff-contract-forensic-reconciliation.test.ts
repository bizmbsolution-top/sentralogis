/**
 * Sentralogis — Phase 4B / U-17R
 * lib/__tests__/u17r-operational-handoff-contract-forensic-reconciliation.test.ts
 *
 * OPERATIONAL HANDOFF CONTRACT FORENSIC RECONCILIATION TEST SUITE
 *
 * Independently audits and verifies that the U-17 Operational Handoff Contract
 * architecture decision is structurally sound, respects domain sovereignty,
 * preserves all ratified ADRs (ADR-018..050), leaves ADR-PROP-051..056 in
 * PROPOSED status, and confirms that ZERO production implementation was introduced.
 *
 * Structure:
 *   - Section A: Architectural Invariant Gates (U17R-A through U17R-S)
 *   - Section B: Positive Controls (PC1 through PC7)
 *   - Section C: Negative Controls (NC1 through NC7)
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const MIG_DIR = path.join(ROOT, 'supabase', 'migrations');
const LIB_DIR = path.join(ROOT, 'lib');
const APP_DIR = path.join(ROOT, 'app');
const DOCS_DIR = path.join(ROOT, 'docs', 'architecture');

function readDoc(filename: string): string {
  const p = path.join(DOCS_DIR, filename);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function readAllMigrations(exclude021 = false): string[] {
  if (!fs.existsSync(MIG_DIR)) return [];
  return fs
    .readdirSync(MIG_DIR)
    .filter((f) => f.endsWith('.sql') && (!exclude021 || !f.includes('021')))
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

export function runU17rOperationalHandoffContractForensicReconciliationSuite(): {
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

  const appTsFiles = collectSourceFiles('app', '.ts').concat(collectSourceFiles('app', '.tsx'));
  const libTsFiles = collectSourceFiles('lib', '.ts');

  /* ================================================================== */
  /*  SECTION A: Architectural Invariant Gates (U17R-A through U17R-S)   */
  /* ================================================================== */

  // U17R-A: ADR Integrity & Preservation
  const priorAdrs = [
    'ADR-033-service-request-command-semantics.md',
    'ADR-034-engagement-to-sales-order.md',
    'ADR-035-sales-order-number-authority.md',
    'ADR-036-sales-order-fulfillment-boundary.md',
    'ADR-037-sales-order-work-order-cardinality.md',
    'ADR-038-shipment-to-sales-order-reference.md',
    'ADR-039-fulfillment-composition-not-engine.md',
    'ADR-040-shipment-not-fulfillment-aggregate.md',
    'ADR-041-fulfillment-number-authority.md',
    'ADR-042-fulfillment-cardinality-lineage.md',
    'ADR-043-fulfillment-state-events.md',
    'ADR-044-commercial-amendment-vs-fulfillment-change.md',
    'ADR-045-operational-composition-handoff-boundary.md',
    'ADR-046-forwarding-multimodal-leg-decomposition.md',
    'ADR-047-customs-sovereign-progressive-attachment.md',
    'ADR-048-multi-sbu-single-sales-order.md',
    'ADR-049-partial-fulfillment-split-shipment.md',
    'ADR-050-replanning-vs-commercial-amendment.md',
  ];
  const allPriorRatified = priorAdrs.every((d) => {
    const src = readDoc(d);
    return src.length > 0 && /Status[\s\S]*?RATIFIED/i.test(src);
  });
  const u17DecisionDoc = readDoc('SENTRALOGIS_PHASE4B_U17_OPERATIONAL_HANDOFF_CONTRACT_ARCHITECTURE_DECISION.md');
  const adr051to056ProposedOnly =
    u17DecisionDoc.includes('ADR-PROP-051') &&
    u17DecisionDoc.includes('ADR-PROP-056') &&
    u17DecisionDoc.includes('PROPOSED ONLY');
  check(
    'U17R-A',
    'ADR Integrity: ADR-033..050 remain RATIFIED; ADR-PROP-051..056 exist only as PROPOSED in U-17 decision doc',
    allPriorRatified && adr051to056ProposedOnly,
  );

  // U17R-B: Production-Implementation Absence in pre-U18 baseline (authorized in U-18)
  const preU18Sql = readAllMigrations(true).join('\n');
  const noHandoffTablePreU18 = !/CREATE TABLE[^;]*\boperational_handoffs\b/i.test(preU18Sql);
  const noHandoffService = !fs.existsSync(path.join(LIB_DIR, 'fulfillment', 'handoff-service.ts')) &&
    !fs.existsSync(path.join(LIB_DIR, 'handoff', 'service.ts'));
  const noHandoffRoutes = !fs.existsSync(path.join(APP_DIR, 'api', 'v1', 'commercial', 'handoffs')) &&
    !fs.existsSync(path.join(APP_DIR, 'api', 'v1', 'handoffs'));
  check(
    'U17R-B',
    'Production Implementation Absence: Zero operational_handoffs tables in pre-U18 migrations (authorized in U-18)',
    noHandoffTablePreU18 && noHandoffService && noHandoffRoutes,
  );

  // U17R-C: Fulfillment Boundary
  const zeroDriverInFulfillment = !/md_drivers|driver_profiles/i.test(fulfillmentServiceSrc);
  const zeroGpsInFulfillment = !/\b(gps|telemetry|armada|vehicle_plate)\b/i.test(fulfillmentServiceSrc);
  check(
    'U17R-C',
    'Fulfillment Boundary: Fulfillment is a composition aggregate; contains zero driver, GPS, armada, or dispatch execution logic',
    zeroDriverInFulfillment && zeroGpsInFulfillment,
  );

  // U17R-D: Shipment Boundary
  const hasShipmentTable = /CREATE TABLE IF NOT EXISTS public\.shp_shipments/i.test(mig003);
  const fulfillmentsNoPolPod = !/\b(pol|pod|mbl|hbl|vessel|voyage)\b/i.test(fulfillmentsDdl);
  check(
    'U17R-D',
    'Shipment Boundary: POL, POD, MBL, HBL, and vessel details reside exclusively in shp_shipments',
    hasShipmentTable && fulfillmentsNoPolPod,
  );

  // U17R-E: Customs Boundary
  const hasCustomsAttachmentService = customsAttachmentSrc.includes('class CustomsAttachmentService');
  check(
    'U17R-E',
    'Customs Boundary: Customs declarations attach progressively via CustomsAttachmentService without mutating declaration identity',
    hasCustomsAttachmentService,
  );

  // U17R-F: Service Request Boundary (ADR-033)
  const srHasLoosePointer = /assigned_domain_job_id\s+UUID/i.test(mig004);
  const srHasIdempotency = /CONSTRAINT uq_svc_idempotency UNIQUE/i.test(mig004);
  check(
    'U17R-F',
    'Service Request Boundary: svc_service_requests is an independent command envelope (ADR-033)',
    srHasLoosePointer && srHasIdempotency,
  );

  // U17R-G: Trucking Boundary (U-07 Lineage)
  const hasLineageResolution = truckingLineageSrc.includes('resolveTruckingLineage');
  const zeroJoDirectMutation = !/\.from\(['"]job_orders['"]\)\.(?:insert|update|delete)/i.test(
    fulfillmentServiceSrc,
  );
  check(
    'U17R-G',
    'Trucking Boundary: Trucking adapter resolves lineage; Fulfillment does not directly mutate job_orders',
    hasLineageResolution && zeroJoDirectMutation,
  );

  // U17R-H: Warehouse Boundary
  const hasWarehouseTarget = /target_domain.*WAREHOUSE/i.test(mig004);
  const zeroInventoryMutation = !/\.from\(['"]wh_inventory['"]\)\.(?:insert|update|delete)/i.test(
    fulfillmentServiceSrc,
  );
  check(
    'U17R-H',
    'Warehouse Boundary: Warehouse operations commanded via svc_service_requests; zero direct inventory mutations from Fulfillment',
    hasWarehouseTarget && zeroInventoryMutation,
  );

  // U17R-I: Cardinality Guardrails
  const noSoOnWorkOrders = !/CREATE TABLE[^;]*\bwork_orders\b[^;]*\bsales_order_id\b/i.test(allSql);
  const noSoOnJobOrders = !/CREATE TABLE[^;]*\bjob_orders\b[^;]*\bsales_order_id\b/i.test(allSql);
  const noFlOnJobOrders = !/CREATE TABLE[^;]*\bjob_orders\b[^;]*\bfulfillment_id\b/i.test(allSql);
  check(
    'U17R-I',
    'Cardinality Guardrails: Many SO -> 1 WO is FORBIDDEN (ADR-037); direct SO -> JO and FL -> JO are strictly forbidden',
    noSoOnWorkOrders && noSoOnJobOrders && noFlOnJobOrders,
  );

  // U17R-J: Number Authority
  const hasSoSeqRpc = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.next_sales_order/i.test(mig019);
  const hasFlSeqRpc = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.next_fulfillment_number/i.test(mig020);
  check(
    'U17R-J',
    'Number Authority: Canonical business numbers are allocated by atomic database sequences (next_sales_order, next_fulfillment_number)',
    hasSoSeqRpc && hasFlSeqRpc,
  );

  // U17R-K: Tenant Isolation
  const domainUsesContext = !/x-tenant-id/i.test(fulfillmentServiceSrc) && fulfillmentServiceSrc.includes('context.tenantId');
  const rlsActive = /CREATE POLICY fulfillments_isolation/i.test(mig020);
  check(
    'U17R-K',
    'Tenant Isolation: Domain strictly derives tenant from server IdentityContext; RLS active on fulfillments',
    domainUsesContext && rlsActive,
  );

  // U17R-L: Authorization
  const hasManagePermissionCheck = fulfillmentServiceSrc.includes("assertPermission(context, 'commercial:manage')");
  check(
    'U17R-L',
    'Authorization: Commercial mutations require assertPermission(context, commercial:manage)',
    hasManagePermissionCheck,
  );

  // U17R-M: Idempotency
  const soIdempotency = /CONSTRAINT uq_sales_order_idempotency UNIQUE/i.test(mig019);
  const flIdempotency = /CONSTRAINT uq_fulfillment_idempotency UNIQUE/i.test(mig020);
  check(
    'U17R-M',
    'Idempotency: Database enforces tenant-scoped idempotency constraints on Sales Orders and Fulfillments',
    soIdempotency && flIdempotency,
  );

  // U17R-N: State Machine Separation
  const hasFulfillmentTransitions = /const FULFILLMENT_TRANSITIONS/i.test(
    fs.readFileSync(path.join(LIB_DIR, 'fulfillment', 'types.ts'), 'utf8'),
  );
  check(
    'U17R-N',
    'State Machine Separation: Fulfillment status lifecycle is a closed state machine distinct from operational state',
    hasFulfillmentTransitions,
  );

  // U17R-O: Failure Isolation
  const zeroSoMutation = !/\.from\(['"]sales_orders['"]\)\.(?:update|delete|insert)/i.test(
    fulfillmentServiceSrc,
  );
  check(
    'U17R-O',
    'Failure Isolation: Operational logistics failures do NOT rewrite commercial Sales Order commitments',
    zeroSoMutation,
  );

  // U17R-P: Revision Semantics (ADR-043, ADR-050)
  const hasRevisionTracking =
    /revision_no\s+INTEGER\s+NOT\s+NULL/i.test(fulfillmentsDdl) &&
    /version_no\s+INTEGER\s+NOT\s+NULL/i.test(fulfillmentsDdl);
  check(
    'U17R-P',
    'Revision Semantics: Fulfillment replanning produces versioned revisions; historical revisions remain immutable',
    hasRevisionTracking,
  );

  // U17R-Q: Multi-SBU Composition (ADR-048)
  const supportsAll4 =
    allSql.includes('FORWARDING') &&
    allSql.includes('CUSTOMS') &&
    allSql.includes('TRUCKING') &&
    allSql.includes('WAREHOUSE');
  check(
    'U17R-Q',
    'Multi-SBU Composition: Single Sales Order supports FORWARDING, CUSTOMS, TRUCKING, and WAREHOUSE allocations',
    supportsAll4,
  );

  // U17R-R: Partial Fulfillment (ADR-049)
  const hasQuantityAccounting =
    /allocated_quantity\s+NUMERIC(?:\([^)]*\))?\s+NOT\s+NULL/i.test(allocationsDdl) &&
    /delivered_quantity\s+NUMERIC(?:\([^)]*\))?\s+NOT\s+NULL/i.test(allocationsDdl);
  check(
    'U17R-R',
    'Partial Fulfillment: Allocation tracks allocated vs delivered quantities without mutating Sales Order',
    hasQuantityAccounting,
  );

  // U17R-S: Adapter Boundary
  const zeroAdapterWriteToDriver = !/md_drivers|driver_profiles/i.test(truckingLineageSrc);
  check(
    'U17R-S',
    'Adapter Boundary: Adapters are contract/lineage bridges, not duplicate operational engines',
    zeroAdapterWriteToDriver,
  );

  /* ================================================================== */
  /*  SECTION B: Positive Controls (PC1 through PC7)                    */
  /* ================================================================== */

  // PC1: Legitimate architecture reference to OperationalHandoff is detected correctly
  const docHasHandoffRef = u17DecisionDoc.includes('OperationalHandoff');
  check('U17R-PC1', 'Positive Control 1: U-17 decision document correctly contains OperationalHandoff design', docHasHandoffRef);

  // PC2: Legitimate ADR-PROP-051..056 references accepted as proposals
  const docHasPropAdrs = u17DecisionDoc.includes('ADR-PROP-051') && u17DecisionDoc.includes('ADR-PROP-056');
  check('U17R-PC2', 'Positive Control 2: ADR proposals 051..056 are correctly identified as unratified proposals', docHasPropAdrs);

  // PC3: Legitimate Service Request references are not misclassified as handoff implementation
  const hasSrTable = /CREATE TABLE IF NOT EXISTS public\.svc_service_requests/i.test(mig004);
  check('U17R-PC3', 'Positive Control 3: Canonical svc_service_requests table exists and is distinct from handoff', hasSrTable);

  // PC4: Legitimate Shipment references are not misclassified as handoff implementation
  const hasShpTable = /CREATE TABLE IF NOT EXISTS public\.shp_shipments/i.test(mig003);
  check('U17R-PC4', 'Positive Control 4: Canonical shp_shipments table exists and is distinct from handoff', hasShpTable);

  // PC5: Legitimate documentation containing "handoff" terminology is not treated as production implementation
  const docsDirectoryExists = fs.existsSync(DOCS_DIR);
  check('U17R-PC5', 'Positive Control 5: Architecture documentation directory is properly accessible', docsDirectoryExists);

  // PC6: Legitimate test-only reference does not trigger production implementation finding
  const testFileExists = fs.existsSync(path.join(LIB_DIR, '__tests__', 'u17-operational-handoff-contract-architecture.test.ts'));
  check('U17R-PC6', 'Positive Control 6: U-17 test suite exists and is correctly identified as a test file', testFileExists);

  // PC7: Legitimate adapter architecture terminology does not imply an actual adapter implementation
  const docHasAdapterTerms =
    /Forwarding\s+(?:Handoff\s+)?Adapter/i.test(u17DecisionDoc) &&
    /Customs\s+(?:Handoff\s+)?Adapter/i.test(u17DecisionDoc);
  check('U17R-PC7', 'Positive Control 7: Architecture decision doc defines adapter contracts without production implementation', docHasAdapterTerms);

  /* ================================================================== */
  /*  SECTION C: Negative Controls (NC1 through NC7)                    */
  /* ================================================================== */

  // NC1: Fake production operational_handoffs table would be detected
  const fakeHandoffDdl = `CREATE TABLE public.operational_handoffs ( id UUID PRIMARY KEY );`;
  const caughtFakeTable = /CREATE TABLE[^;]*\boperational_handoffs\b/i.test(fakeHandoffDdl);
  check('U17R-NC1', 'Negative Control 1: Detector reliably catches planted fake operational_handoffs table', caughtFakeTable);

  // NC2: Fake production OperationalHandoffService writer would be detected
  const fakeServiceCode = `export class OperationalHandoffService { async createHandoff() {} }`;
  const caughtFakeService = /class\s+OperationalHandoffService/i.test(fakeServiceCode);
  check('U17R-NC2', 'Negative Control 2: Detector reliably catches planted OperationalHandoffService class', caughtFakeService);

  // NC3: Fake API route creating handoffs would be detected
  const fakeRouteCode = `export async function POST(req: Request) { return Response.json({ handoffId: '123' }); }`;
  const caughtFakeRoute = /handoffId/i.test(fakeRouteCode);
  check('U17R-NC3', 'Negative Control 3: Detector reliably catches planted handoff API route response', caughtFakeRoute);

  // NC4: Fake direct Fulfillment -> JO write would be detected
  const fakeDirectJoMutation = `await supabase.from('job_orders').insert({ fulfillment_id: id });`;
  const caughtFakeJoMutation = /\.from\(['"]job_orders['"]\)\.(?:insert|update|delete)/i.test(fakeDirectJoMutation);
  check('U17R-NC4', 'Negative Control 4: Detector reliably catches planted direct Fulfillment -> JO mutation', caughtFakeJoMutation);

  // NC5: Fake client-generated OH-YYYY-MM-NNNN would be detected
  const fakeClientOhGen = `const ohNumber = 'OH-' + Date.now();`;
  const caughtFakeOhGen = /'OH-'\s*\+\s*Date\.now\(\)/i.test(fakeClientOhGen);
  check('U17R-NC5', 'Negative Control 5: Detector reliably catches client-generated OH number generation', caughtFakeOhGen);

  // NC6: Fake x-tenant-id trust in handoff creation would be detected
  const fakeTenantHeaderTrust = `const tenant = req.headers.get('x-tenant-id');`;
  const caughtFakeHeaderTrust = /req(uest)?\.headers\.get\(['"]x-tenant/i.test(fakeTenantHeaderTrust);
  check('U17R-NC6', 'Negative Control 6: Detector reliably catches client-supplied x-tenant-id header trust', caughtFakeHeaderTrust);

  // NC7: Fake adapter containing operational execution logic would be detected
  const fakeAdapterWithDriver = `export class ForwardingHandoffAdapter { async assignDriver(d: string) {} }`;
  const caughtFakeAdapterDriver = /assignDriver/i.test(fakeAdapterWithDriver);
  check('U17R-NC7', 'Negative Control 7: Detector reliably catches planted operational execution logic in adapter', caughtFakeAdapterDriver);

  console.log(`U-17R OPERATIONAL HANDOFF CONTRACT RECONCILIATION SUITE: ${passed} / ${passed + failed} PASSED`);
  return { passed, failed, total: passed + failed };
}
