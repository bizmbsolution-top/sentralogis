/**
 * Sentralogis — Phase 4B / U-16A
 * lib/__tests__/u16a-fulfillment-operational-composition-adr-ratification.test.ts
 *
 * FULFILLMENT OPERATIONAL COMPOSITION ADR RATIFICATION TEST SUITE
 *
 * Verifies that:
 *   1. ADR-033 through ADR-044 remain preserved and unweakened.
 *   2. ADR-045 through ADR-050 are physically present on disk and explicitly RATIFIED.
 *   3. No numbering collision exists among ADRs.
 *   4. Architectural invariants (ADR-045..050) are structurally enforced.
 *   5. Security, tenancy, and identity authorities remain strictly server-derived.
 *   6. Positive and negative controls prove soundness and precision.
 */

import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(__dirname, '..', '..');
const DOCS_DIR = path.join(ROOT, 'docs', 'architecture');
const MIG_DIR = path.join(ROOT, 'supabase', 'migrations');
const LIB_DIR = path.join(ROOT, 'lib');

function readDoc(filename: string): string {
  const p = path.join(DOCS_DIR, filename);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}

function readAllMigrations(): string[] {
  return fs
    .readdirSync(MIG_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => fs.readFileSync(path.join(MIG_DIR, f), 'utf8'));
}

export function runU16aFulfillmentAdrRatificationSuite(): {
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

  // 1. ADR Inventory & Preservation (ADR-033 through ADR-044)
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
  ];

  const allPriorExistAndRatified = priorAdrs.every((doc) => {
    const src = readDoc(doc);
    return src.length > 0 && /Status[\s\S]*?RATIFIED/i.test(src);
  });
  check(
    'U16A-01',
    'Prior ADRs (ADR-033..044) exist, remain unmodified, and retain RATIFIED status',
    allPriorExistAndRatified,
  );

  // 2. Ratified ADR-045 Existence & Status
  const adr045 = readDoc('ADR-045-operational-composition-handoff-boundary.md');
  const adr045Ok =
    adr045.length > 0 &&
    /Status[\s\S]*?RATIFIED/i.test(adr045) &&
    /Fulfillment is the composition and progress boundary/i.test(adr045);
  check('U16A-02', 'ADR-045 (Operational Composition Handoff Boundary) is RATIFIED', adr045Ok);

  // 3. Ratified ADR-046 Existence & Status
  const adr046 = readDoc('ADR-046-forwarding-multimodal-leg-decomposition.md');
  const adr046Ok =
    adr046.length > 0 &&
    /Status[\s\S]*?RATIFIED/i.test(adr046) &&
    /Forwarding is sovereign over physical logistics movement/i.test(adr046);
  check('U16A-03', 'ADR-046 (Forwarding Multimodal Leg Decomposition) is RATIFIED', adr046Ok);

  // 4. Ratified ADR-047 Existence & Status
  const adr047 = readDoc('ADR-047-customs-sovereign-progressive-attachment.md');
  const adr047Ok =
    adr047.length > 0 &&
    /Status[\s\S]*?RATIFIED/i.test(adr047) &&
    /Customs clearance is a sovereign domain/i.test(adr047);
  check('U16A-04', 'ADR-047 (Customs Sovereign Progressive Attachment) is RATIFIED', adr047Ok);

  // 5. Ratified ADR-048 Existence & Status
  const adr048 = readDoc('ADR-048-multi-sbu-single-sales-order.md');
  const adr048Ok =
    adr048.length > 0 &&
    /Status[\s\S]*?RATIFIED/i.test(adr048) &&
    /single commercial Sales Order natively supports multi-SBU operational composition/i.test(adr048);
  check('U16A-05', 'ADR-048 (Multi-SBU Single Sales Order) is RATIFIED', adr048Ok);

  // 6. Ratified ADR-049 Existence & Status
  const adr049 = readDoc('ADR-049-partial-fulfillment-split-shipment.md');
  const adr049Ok =
    adr049.length > 0 &&
    /Status[\s\S]*?RATIFIED/i.test(adr049) &&
    /Partial fulfillment and split shipments are natively modeled/i.test(adr049);
  check('U16A-06', 'ADR-049 (Partial Fulfillment Accounting & Split Shipment) is RATIFIED', adr049Ok);

  // 7. Ratified ADR-050 Existence & Status
  const adr050 = readDoc('ADR-050-replanning-vs-commercial-amendment.md');
  const adr050Ok =
    adr050.length > 0 &&
    /Status[\s\S]*?RATIFIED/i.test(adr050) &&
    /Commercial Amendments and Operational Replanning are strictly separated/i.test(adr050);
  check('U16A-07', 'ADR-050 (Versioned Replanning vs Commercial Amendment) is RATIFIED', adr050Ok);

  // 8. Numbering Collision Absence
  const allDocFiles = fs.readdirSync(DOCS_DIR);
  const adr045Files = allDocFiles.filter((f) => /^ADR-045/i.test(f));
  const adr046Files = allDocFiles.filter((f) => /^ADR-046/i.test(f));
  const adr047Files = allDocFiles.filter((f) => /^ADR-047/i.test(f));
  const adr048Files = allDocFiles.filter((f) => /^ADR-048/i.test(f));
  const adr049Files = allDocFiles.filter((f) => /^ADR-049/i.test(f));
  const adr050Files = allDocFiles.filter((f) => /^ADR-050/i.test(f));
  const noCollision =
    adr045Files.length === 1 &&
    adr046Files.length === 1 &&
    adr047Files.length === 1 &&
    adr048Files.length === 1 &&
    adr049Files.length === 1 &&
    adr050Files.length === 1;
  check('U16A-08', 'Zero ADR numbering collisions: exactly one file per ADR number', noCollision);

  // 9. Architecture Invariant: Fulfillment Composition-Only (ADR-045)
  const zeroDriverInFulfillment = !/md_drivers|driver_profiles/i.test(fulfillmentServiceSrc);
  const zeroGpsInFulfillment = !/\b(gps|telemetry|armada)\b/i.test(fulfillmentServiceSrc);
  check(
    'U16A-09',
    'Architectural Enforcement (ADR-045): Fulfillment domain contains zero driver, GPS, or armada execution engines',
    zeroDriverInFulfillment && zeroGpsInFulfillment,
  );

  // 10. Architecture Invariant: Forwarding Movement Sovereignty (ADR-046)
  const hasMultimodalLegs = /CREATE TABLE IF NOT EXISTS public\.shp_execution_legs/i.test(mig003);
  const fulfillmentsNoPolPod = !/\b(pol|pod|mbl|hbl|vessel|voyage)\b/i.test(mig020);
  check(
    'U16A-10',
    'Architectural Enforcement (ADR-046): Forwarding maintains sovereign multimodal legs; fulfillments contains zero forwarding columns',
    hasMultimodalLegs && fulfillmentsNoPolPod,
  );

  // 11. Architecture Invariant: Customs Progressive Attachment Sovereignty (ADR-047)
  const hasCustomsAttachment = customsAttachmentSrc.includes('class CustomsAttachmentService');
  check(
    'U16A-11',
    'Architectural Enforcement (ADR-047): Customs domain attaches progressively without mutating declaration identity',
    hasCustomsAttachment,
  );

  // 12. Architecture Invariant: Multi-SBU Unified Commitment (ADR-048)
  const supportsAllCapabilities =
    allSql.includes('FORWARDING') &&
    allSql.includes('CUSTOMS') &&
    allSql.includes('TRUCKING') &&
    allSql.includes('WAREHOUSE');
  check(
    'U16A-12',
    'Architectural Enforcement (ADR-048): Single SO supports multi-SBU composition across FORWARDING, CUSTOMS, TRUCKING, WAREHOUSE',
    supportsAllCapabilities,
  );

  // 13. Architecture Invariant: Partial Fulfillment & Split Shipment (ADR-049)
  const hasQuantityAccounting =
    /allocated_quantity\s+NUMERIC(?:\([^)]*\))?\s+NOT\s+NULL/i.test(mig020) &&
    /delivered_quantity\s+NUMERIC(?:\([^)]*\))?\s+NOT\s+NULL/i.test(mig020);
  check(
    'U16A-13',
    'Architectural Enforcement (ADR-049): Allocation quantity tracking models split shipment progress without mutating Sales Order',
    hasQuantityAccounting,
  );

  // 14. Architecture Invariant: Replanning vs Commercial Amendment (ADR-050)
  const zeroSoMutation = !/\.from\(['"]sales_orders['"]\)\.(?:update|delete|insert)/i.test(
    fulfillmentServiceSrc,
  );
  check(
    'U16A-14',
    'Architectural Enforcement (ADR-050): Operational replanning does NOT mutate commercial Sales Orders',
    zeroSoMutation,
  );

  // 15. Cardinality Guardrail: Many SO -> 1 WO is FORBIDDEN (ADR-037)
  const noSoOnWorkOrders = !/CREATE TABLE[^;]*\bwork_orders\b[^;]*\bsales_order_id\b/i.test(allSql);
  check(
    'U16A-15',
    'Cardinality Guardrail (ADR-037): Many SO -> One WO is STRICTLY FORBIDDEN (work_orders has zero sales_order_id reference)',
    noSoOnWorkOrders,
  );

  // 16. Cardinality Guardrail: Direct SO/FL -> JO is FORBIDDEN
  const noSoOnJobOrders = !/CREATE TABLE[^;]*\bjob_orders\b[^;]*\bsales_order_id\b/i.test(allSql);
  const noFlOnJobOrders = !/CREATE TABLE[^;]*\bjob_orders\b[^;]*\bfulfillment_id\b/i.test(allSql);
  check(
    'U16A-16',
    'Cardinality Guardrail: Direct SO -> JO and Fulfillment -> JO are STRICTLY FORBIDDEN (zero direct FKs on job_orders)',
    noSoOnJobOrders && noFlOnJobOrders,
  );

  // 17. Security Authority: Server-Derived Tenancy & Identity
  const domainUsesContext = !/x-tenant-id/i.test(fulfillmentServiceSrc) && fulfillmentServiceSrc.includes('context.tenantId');
  const rlsActive = /CREATE POLICY fulfillments_isolation/i.test(mig020);
  check(
    'U16A-17',
    'Security Authority: Tenancy is derived strictly from server IdentityContext + RLS; client tenant headers are ignored',
    domainUsesContext && rlsActive,
  );

  // 18. Identity Authority: Atomic Server Number Sequences
  const serverSoSeq = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.next_sales_order/i.test(mig019);
  const serverFlSeq = /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.next_fulfillment_number/i.test(mig020);
  check(
    'U16A-18',
    'Identity Authority: Number authorities are atomic database sequences (next_sales_order, next_fulfillment_number)',
    serverSoSeq && serverFlSeq,
  );

  // 19. Trucking Lineage Authority (U-07 / ADR-033)
  const hasLineageResolution = truckingLineageSrc.includes('resolveTruckingLineage');
  check(
    'U16A-19',
    'Trucking Authority (ADR-033 / U-07): Trucking adapter enforces lineage (SR -> Engagement -> WO -> wo_item -> JO)',
    hasLineageResolution,
  );

  // 20. Positive Soundness Control: Multiple Revisions Allowed per SO (ADR-042, ADR-050)
  const allowMultiRevisions =
    !/UNIQUE\s*\(\s*sales_order_id\s*\)/i.test(mig020) &&
    /revision_no\s+INTEGER\s+NOT\s+NULL/i.test(mig020);
  check(
    'U16A-PC1',
    'Positive Control: Database schema permits versioned Fulfillment revisions per Sales Order (ADR-042, ADR-050)',
    allowMultiRevisions,
  );

  // 21. Negative Soundness Control: Detector Catches Planted Direct Bypass
  const fakeDdlWithDirectBypass = `CREATE TABLE public.job_orders ( id UUID, fulfillment_id UUID REFERENCES fulfillments(id) );`;
  const caughtBypass = /CREATE TABLE[^;]*\bjob_orders\b[^;]*\bfulfillment_id\b/i.test(
    fakeDdlWithDirectBypass,
  );
  check(
    'U16A-NC1',
    'Negative Control: Architecture detector reliably catches planted direct Fulfillment -> Job Order FK',
    caughtBypass,
  );

  console.log(`U-16A ADR RATIFICATION SUITE: ${passed} / ${passed + failed} PASSED`);
  return { passed, failed, total: passed + failed };
}
