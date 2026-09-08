/**
 * Sentralogis Target Architecture v1.0 — Phase 4A
 * Domain: SBU Customs Clearance & Commercial Capability Composition
 * Test Suite: Phase 4A Standalone & Integrated Customs Contracts + Progressive Composition
 * Target: 23 Comprehensive Acceptance Scenarios
 *
 * ADR-018: Reuses commercial_work_orders as engagement root
 * ADR-019: Nullable cross-domain references in cus_declarations
 * ADR-020: Unique capability bindings per work order
 * ADR-021: Idempotent and conflict-aware attachment commands
 */

import { CapabilityBindingFactory, CapabilityBindingService, CapabilityBindingError } from '../../commercial/capability-binding-service';
import { CustomsAttachmentService } from '../attachment-service';
import { CustomsValidationEngine } from '../customs-validation-engine';
import { CeisaMappingEngine } from '../ceisa/mapping-engine';
import { CeisaXmlSerializer } from '../ceisa/xml-serializer';
import { AuditIntegrityService } from '../audit/audit-integrity-service';
import {
  CustomsDeclaration,
  CustomsClassificationLine,
  CustomsDeclarationDocument,
} from '../types';
import {
  CommercialCapabilityBinding,
  CreateCapabilityBindingDTO,
  AttachShipmentCommand,
  AttachTruckingCommand,
} from '../../commercial/types';
import { CustomsDeclarationFactory } from '../declaration-factory';

export function runPhase4ACompositionTests(): { passed: number; failed: number; total: number } {
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string) {
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName}`);
      failed++;
    }
  }

  console.log('====================================================');
  console.log('RUNNING PHASE 4A COMMERCIAL COMPOSITION SUITE');
  console.log('====================================================');

  const tenantId = 'tenant-corp-alpha';
  const tenantBeta = 'tenant-corp-beta';
  const workOrderId = 'wo-comm-2026-001';
  const importerId = 'ent-importer-pt-jaya';

  // --------------------------------------------------------------------------
  // 1. STANDALONE CUSTOMS CONTRACT (TEST 01 - 05)
  // --------------------------------------------------------------------------

  // Scenario 1: Customer purchases Customs-Only service -> create commercial capability binding
  const customsBindingDto: CreateCapabilityBindingDTO = {
    tenant_id: tenantId,
    work_order_id: workOrderId,
    capability_type: 'CUSTOMS',
    scope: { declaration_type: 'PIB_IMPORT', customs_office: '040300' },
    pricing: { fee_idr: 2500000 },
    currency: 'IDR',
  };

  const { binding: customsBinding, action: act1 } = CapabilityBindingService.activateCapability(
    customsBindingDto,
    []
  );

  assert(
    act1 === 'CREATED' &&
    customsBinding.capability_type === 'CUSTOMS' &&
    customsBinding.status === 'ACTIVE' &&
    customsBinding.work_order_id === workOrderId,
    'TEST 01: Standalone Customs commercial capability binding created with status ACTIVE'
  );

  // Scenario 2: Create standalone Customs Declaration under work order (shipment_id = null, job_order_id = null)
  const standaloneDec = CustomsDeclarationFactory.createDeclarationEntity({
    tenant_id: tenantId,
    importer_id: importerId,
    customs_office_code: '040300',
    declaration_type: 'PIB_IMPORT',
    work_order_id: workOrderId,
  });

  assert(
    standaloneDec.work_order_id === workOrderId &&
    standaloneDec.shipment_id === null &&
    standaloneDec.execution_leg_id === null &&
    standaloneDec.job_order_id === null &&
    standaloneDec.declaration_number.startsWith('AJU-040300-'),
    'TEST 02: Standalone Customs Declaration created with NULL shipment_id, execution_leg_id, and job_order_id'
  );

  // Scenario 3: Standalone declaration passes full multi-tier validation without forwarding references
  const lineItems = CustomsDeclarationFactory.createClassificationLineEntities(
    standaloneDec.id,
    tenantId,
    [
      {
        item_sequence: 1,
        sku_code: 'SKU-ELEC-001',
        goods_description: 'Semiconductor Chips',
        hs_code: '8542.31.00',
        cif_value_usd: 50000,
        bm_rate_percent: 0,
        ppn_rate_percent: 11,
        pph_rate_percent: 2.5,
        item_quantity: 1000,
        uom_code: 'PCE',
        unit_price_usd: 50,
        country_of_origin: 'TW',
      }
    ]
  );

  const docs: CustomsDeclarationDocument[] = [
    {
      id: 'doc-inv-001',
      tenant_id: tenantId,
      declaration_id: standaloneDec.id,
      document_type: 'INVOICE',
      document_number: 'INV-2026-888',
      issue_date: '2026-08-20',
      verification_status: 'VERIFIED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'doc-bl-001',
      tenant_id: tenantId,
      declaration_id: standaloneDec.id,
      document_type: 'BL_AWB',
      document_number: 'MAEU-888999',
      issue_date: '2026-08-21',
      verification_status: 'VERIFIED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ];

  const validationEngine = new CustomsValidationEngine();
  const validationReport = validationEngine.validateDeclarationAggregate(standaloneDec, lineItems, docs);

  assert(
    (validationReport.overall_status === 'READY' || validationReport.overall_status === 'READY_WITH_WARNINGS') &&
    validationReport.error_count === 0,
    'TEST 03: Standalone Customs Declaration passes validation with 0 errors (zero forwarding dependency)'
  );

  // Scenario 4: Standalone CEISA 4.0 XML preparation compiles cleanly without shipment
  const canonicalPayload = CeisaMappingEngine.compileCanonicalPayload(standaloneDec, lineItems, docs, { kursPajakKmk: 16000 });
  const xmlArtifact = CeisaXmlSerializer.serializeToXml(canonicalPayload);

  assert(
    xmlArtifact.content.includes(standaloneDec.declaration_number) &&
    xmlArtifact.content.includes('<Barang>') &&
    xmlArtifact.checksumSha256.length === 64,
    'TEST 04: CEISA 4.0 XML artifact compiles deterministically from standalone declaration aggregate'
  );

  // Scenario 5: Customs completion (SPPB Release) -> mark capability COMPLETED
  const completedBinding = CapabilityBindingService.transitionStatus(customsBinding, 'COMPLETED');

  assert(
    completedBinding.status === 'COMPLETED' &&
    completedBinding.completed_at !== null,
    'TEST 05: Customs completion transitions commercial capability binding to COMPLETED'
  );

  // --------------------------------------------------------------------------
  // 2. PROGRESSIVE CAPABILITY COMPOSITION (TEST 06 - 10)
  // --------------------------------------------------------------------------

  // Scenario 6: Day 1 Customs -> Day 2 Customer adds Trucking capability
  const truckingBindingDto: CreateCapabilityBindingDTO = {
    tenant_id: tenantId,
    work_order_id: workOrderId,
    capability_type: 'TRUCKING',
    scope: { route: 'Tanjung Priok -> Cikarang Plant' },
    pricing: { trip_rate_idr: 3500000 },
  };

  const { binding: truckingBinding, action: actTrucking } = CapabilityBindingService.activateCapability(
    truckingBindingDto,
    [customsBinding]
  );

  assert(
    actTrucking === 'CREATED' &&
    truckingBinding.capability_type === 'TRUCKING' &&
    truckingBinding.status === 'ACTIVE',
    'TEST 06: Day 2 progressive addition of TRUCKING capability binding under existing commercial WO'
  );

  // Scenario 7: Attach Trucking Job Order to existing Customs Declaration (no recreation)
  const jobOrderId = 'jo-truck-777-01';
  const attachTruckCmd: AttachTruckingCommand = {
    declaration_id: standaloneDec.id,
    tenant_id: tenantId,
    job_order_id: jobOrderId,
  };

  const attachTruckResult = CustomsAttachmentService.attachTrucking(
    standaloneDec,
    attachTruckCmd,
    tenantId // same tenant
  );

  const decWithTrucking = CustomsAttachmentService.applyAttachment(standaloneDec, attachTruckResult);

  assert(
    attachTruckResult.success === true &&
    attachTruckResult.action === 'ATTACHED' &&
    decWithTrucking.job_order_id === jobOrderId &&
    decWithTrucking.id === standaloneDec.id &&
    decWithTrucking.declaration_number === standaloneDec.declaration_number,
    'TEST 07: Trucking Job Order attached to existing declaration without mutating declaration ID or AJU'
  );

  // Scenario 8: Day 3 Customer adds Forwarding capability & attaches Shipment
  const forwardingBindingDto: CreateCapabilityBindingDTO = {
    tenant_id: tenantId,
    work_order_id: workOrderId,
    capability_type: 'FORWARDING',
    scope: { incoterm: 'CIF', pol: 'CNSHA', pod: 'IDTPP' },
  };

  const { binding: fwdBinding, action: actFwd } = CapabilityBindingService.activateCapability(
    forwardingBindingDto,
    [customsBinding, truckingBinding]
  );

  const shipmentId = 'shp-sea-2026-999';
  const attachShipCmd: AttachShipmentCommand = {
    declaration_id: decWithTrucking.id,
    tenant_id: tenantId,
    shipment_id: shipmentId,
    execution_leg_id: 'leg-ocean-01',
  };

  const attachShipResult = CustomsAttachmentService.attachShipment(
    decWithTrucking,
    attachShipCmd,
    tenantId
  );

  const fullComposedDec = CustomsAttachmentService.applyAttachment(decWithTrucking, attachShipResult);

  assert(
    actFwd === 'CREATED' &&
    attachShipResult.success === true &&
    fullComposedDec.shipment_id === shipmentId &&
    fullComposedDec.job_order_id === jobOrderId &&
    fullComposedDec.id === standaloneDec.id,
    'TEST 08: Forwarding Shipment attached to declaration — now linked to both Trucking and Forwarding'
  );

  // Scenario 9: Full Logistics Composition (Customs + Forwarding + Trucking + Warehouse)
  const whBindingDto: CreateCapabilityBindingDTO = {
    tenant_id: tenantId,
    work_order_id: workOrderId,
    capability_type: 'WAREHOUSE',
    scope: { facility_id: 'wh-cbt-01', storage_type: 'BONDED' },
  };

  const { binding: whBinding } = CapabilityBindingService.activateCapability(
    whBindingDto,
    [customsBinding, truckingBinding, fwdBinding]
  );

  const allActiveBindings = [customsBinding, truckingBinding, fwdBinding, whBinding];
  const activeCapTypes = CapabilityBindingService.resolveActiveCapabilities(allActiveBindings);

  assert(
    activeCapTypes.length === 4 &&
    activeCapTypes.includes('CUSTOMS') &&
    activeCapTypes.includes('FORWARDING') &&
    activeCapTypes.includes('TRUCKING') &&
    activeCapTypes.includes('WAREHOUSE'),
    'TEST 09: Full Logistics composition resolves 4 peer active capabilities under single commercial WO'
  );

  // Scenario 10: Audit trail cryptographic integrity preserved across progressive attachments
  const hash01 = AuditIntegrityService.computeEventHash({
    tenantId,
    declarationId: standaloneDec.id,
    sequenceNo: 1,
    eventType: 'DECLARATION_CREATED',
    summary: 'Customs declaration created in DRAFT',
    createdAt: '2026-08-25T10:00:00Z',
    previousEventHash: null,
  });

  const hash02 = AuditIntegrityService.computeEventHash({
    tenantId,
    declarationId: standaloneDec.id,
    sequenceNo: 2,
    eventType: 'CUSTOMS_ATTACHED_TO_TRUCKING',
    summary: `Attached to Job Order ${jobOrderId}`,
    createdAt: '2026-08-25T11:00:00Z',
    previousEventHash: hash01,
  });

  const auditEvents = [
    {
      id: 'aud-01',
      tenant_id: tenantId,
      declaration_id: standaloneDec.id,
      sequence_no: 1,
      event_type: 'DECLARATION_CREATED',
      summary: 'Customs declaration created in DRAFT',
      event_hash: hash01,
      previous_event_hash: null,
      created_at: '2026-08-25T10:00:00Z',
    },
    {
      id: 'aud-02',
      tenant_id: tenantId,
      declaration_id: standaloneDec.id,
      sequence_no: 2,
      event_type: 'CUSTOMS_ATTACHED_TO_TRUCKING',
      summary: `Attached to Job Order ${jobOrderId}`,
      event_hash: hash02,
      previous_event_hash: hash01,
      created_at: '2026-08-25T11:00:00Z',
    }
  ];

  const integrityReport = AuditIntegrityService.verifyAuditIntegrity(auditEvents as any);

  assert(
    integrityReport.status === 'VALID' &&
    integrityReport.checkedEventsCount === 2,
    'TEST 10: Cryptographic audit hash chain remains valid after cross-domain attachment event'
  );

  // --------------------------------------------------------------------------
  // 3. IDEMPOTENCY & CONFLICT DETECTION (ADR-021) (TEST 11 - 14)
  // --------------------------------------------------------------------------

  // Scenario 11: Repeated attachShipment with identical shipment_id returns ALREADY_ATTACHED (no-op)
  const repeatShipResult = CustomsAttachmentService.attachShipment(
    fullComposedDec,
    attachShipCmd,
    tenantId
  );

  assert(
    repeatShipResult.success === true &&
    repeatShipResult.action === 'ALREADY_ATTACHED',
    'TEST 11: Idempotency: Repeated attachShipment with same shipment ID returns ALREADY_ATTACHED'
  );

  // Scenario 12: Repeated attachTrucking with identical job_order_id returns ALREADY_ATTACHED (no-op)
  const repeatTruckResult = CustomsAttachmentService.attachTrucking(
    fullComposedDec,
    attachTruckCmd,
    tenantId
  );

  assert(
    repeatTruckResult.success === true &&
    repeatTruckResult.action === 'ALREADY_ATTACHED',
    'TEST 12: Idempotency: Repeated attachTrucking with same job order ID returns ALREADY_ATTACHED'
  );

  // Scenario 13: Conflicting attachShipment (attempting to attach different shipment Y when already attached to X)
  const conflictShipCmd: AttachShipmentCommand = {
    declaration_id: fullComposedDec.id,
    tenant_id: tenantId,
    shipment_id: 'shp-conflicting-888',
  };

  const conflictShipResult = CustomsAttachmentService.attachShipment(
    fullComposedDec,
    conflictShipCmd,
    tenantId
  );

  assert(
    conflictShipResult.success === false &&
    conflictShipResult.action === 'CONFLICT' &&
    conflictShipResult.message.includes('already attached to shipment'),
    'TEST 13: Conflict Detection: Attempting to overwrite existing shipment reference returns CONFLICT (409)'
  );

  // Scenario 14: Conflicting attachTrucking (attempting to attach different JO B when already attached to A)
  const conflictTruckCmd: AttachTruckingCommand = {
    declaration_id: fullComposedDec.id,
    tenant_id: tenantId,
    job_order_id: 'jo-conflicting-999',
  };

  const conflictTruckResult = CustomsAttachmentService.attachTrucking(
    fullComposedDec,
    conflictTruckCmd,
    tenantId
  );

  assert(
    conflictTruckResult.success === false &&
    conflictTruckResult.action === 'CONFLICT' &&
    conflictTruckResult.message.includes('already attached to job order'),
    'TEST 14: Conflict Detection: Attempting to overwrite existing job order reference returns CONFLICT (409)'
  );

  // --------------------------------------------------------------------------
  // 4. CROSS-TENANT SECURITY & AUTH GUARDS (TEST 15 - 17)
  // --------------------------------------------------------------------------

  // Scenario 15: Cross-tenant shipment attachment rejected (FORBIDDEN)
  const crossTenantShipResult = CustomsAttachmentService.attachShipment(
    standaloneDec,
    {
      declaration_id: standaloneDec.id,
      tenant_id: tenantId,
      shipment_id: 'shp-foreign-tenant-01',
    },
    tenantBeta // shipment belongs to Tenant Beta
  );

  assert(
    crossTenantShipResult.success === false &&
    crossTenantShipResult.action === 'FORBIDDEN',
    'TEST 15: Security Guard: Attaching Tenant Beta shipment to Tenant Alpha declaration returns FORBIDDEN (403)'
  );

  // Scenario 16: Cross-tenant trucking attachment rejected (FORBIDDEN)
  const crossTenantTruckResult = CustomsAttachmentService.attachTrucking(
    standaloneDec,
    {
      declaration_id: standaloneDec.id,
      tenant_id: tenantId,
      job_order_id: 'jo-foreign-tenant-01',
    },
    tenantBeta // job order belongs to Tenant Beta
  );

  assert(
    crossTenantTruckResult.success === false &&
    crossTenantTruckResult.action === 'FORBIDDEN',
    'TEST 16: Security Guard: Attaching Tenant Beta job order to Tenant Alpha declaration returns FORBIDDEN (403)'
  );

  // Scenario 17: Command tenant mismatch rejected (FORBIDDEN)
  const commandMismatchResult = CustomsAttachmentService.attachShipment(
    standaloneDec,
    {
      declaration_id: standaloneDec.id,
      tenant_id: tenantBeta, // Caller claims Tenant Beta
      shipment_id: 'shp-01',
    },
    tenantId
  );

  assert(
    commandMismatchResult.success === false &&
    commandMismatchResult.action === 'FORBIDDEN',
    'TEST 17: Security Guard: Command tenant mismatch with declaration tenant returns FORBIDDEN (403)'
  );

  // --------------------------------------------------------------------------
  // 5. CAPABILITY LIFECYCLE & INVARIANTS (ADR-020) (TEST 18 - 20)
  // --------------------------------------------------------------------------

  // Scenario 18: Idempotent capability activation (activating same active capability returns ALREADY_ACTIVE)
  const { action: actDup } = CapabilityBindingService.activateCapability(
    customsBindingDto,
    [customsBinding]
  );

  assert(
    actDup === 'ALREADY_ACTIVE',
    'TEST 18: Capability Invariant: Re-activating an active capability on same WO returns ALREADY_ACTIVE'
  );

  // Scenario 19: Capability suspension and reactivation
  const suspendedBinding = CapabilityBindingService.transitionStatus(customsBinding, 'SUSPENDED');
  const { binding: reactivatedBinding, action: actReact } = CapabilityBindingService.activateCapability(
    customsBindingDto,
    [suspendedBinding]
  );

  assert(
    suspendedBinding.status === 'SUSPENDED' &&
    actReact === 'REACTIVATED' &&
    reactivatedBinding.status === 'ACTIVE',
    'TEST 19: Capability Lifecycle: Suspended capability is successfully reactivated to ACTIVE'
  );

  // Scenario 20: Illegal capability status transition throws CapabilityBindingError
  let illegalTransitionThrown = false;
  try {
    CapabilityBindingService.transitionStatus(completedBinding, 'ACTIVE'); // Cannot reactivate COMPLETED
  } catch (err) {
    if (err instanceof CapabilityBindingError) {
      illegalTransitionThrown = true;
    }
  }

  assert(
    illegalTransitionThrown === true,
    'TEST 20: Capability Invariant: Illegal transition from COMPLETED to ACTIVE throws CapabilityBindingError'
  );

  // --------------------------------------------------------------------------
  // 6. LEGACY COMPATIBILITY & PROTECTED SYSTEMS INVARIANTS (TEST 21)
  // --------------------------------------------------------------------------

  // Scenario 21: Legacy declaration object (without shipment_id/job_order_id set) operates normally
  const legacyDec: CustomsDeclaration = {
    id: 'dec-legacy-001',
    tenant_id: tenantId,
    declaration_number: 'AJU-040300-20260101-000001',
    importer_id: importerId,
    declaration_type: 'PIB_IMPORT',
    customs_office_code: '040300',
    total_duty_and_tax: 15000000,
    status: 'DRAFT',
    version_no: 1,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  };

  const legacyLine = CustomsDeclarationFactory.createClassificationLineEntities(
    legacyDec.id,
    tenantId,
    [{ goods_description: 'Machine Parts', hs_code: '8401.10.00', cif_value_usd: 1000, unit_price_usd: 100, item_quantity: 10 }]
  );

  const legacyDocs: CustomsDeclarationDocument[] = [
    {
      id: 'doc-leg-inv',
      tenant_id: tenantId,
      declaration_id: legacyDec.id,
      document_type: 'INVOICE',
      document_number: 'INV-LEG-01',
      verification_status: 'VERIFIED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'doc-leg-pl',
      tenant_id: tenantId,
      declaration_id: legacyDec.id,
      document_type: 'PACKING_LIST',
      document_number: 'PL-LEG-01',
      verification_status: 'VERIFIED',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  ];

  const legacyValidation = validationEngine.validateDeclarationAggregate(legacyDec, legacyLine, legacyDocs);

  assert(
    (legacyValidation.overall_status === 'READY' || legacyValidation.overall_status === 'READY_WITH_WARNINGS') &&
    legacyValidation.error_count === 0 &&
    legacyDec.shipment_id === undefined &&
    legacyDec.job_order_id === undefined,
    'TEST 21: Backward Compatibility: Legacy declaration without cross-domain fields validates perfectly'
  );

  // --------------------------------------------------------------------------
  // 7. HIGH PERFORMANCE BENCHMARKS (TEST 22 - 23)
  // --------------------------------------------------------------------------

  // Scenario 22: Benchmark 10,000 capability bindings resolution
  const syntheticBindings: CommercialCapabilityBinding[] = [];
  for (let i = 0; i < 10000; i++) {
    syntheticBindings.push({
      id: `cap-${i}`,
      tenant_id: tenantId,
      work_order_id: `wo-${i % 1000}`,
      capability_type: (['CUSTOMS', 'FORWARDING', 'TRUCKING', 'WAREHOUSE'] as const)[i % 4],
      status: i % 5 === 0 ? 'COMPLETED' : 'ACTIVE',
      scope: {},
      pricing: {},
      currency: 'IDR',
      activated_at: '2026-08-25T00:00:00Z',
      completed_at: null,
      deactivated_at: null,
      metadata: {},
      created_at: '2026-08-25T00:00:00Z',
      updated_at: '2026-08-25T00:00:00Z',
    });
  }

  const startResolve = performance.now();
  const customsOnly = CapabilityBindingService.filterBindings(syntheticBindings, {
    capability_type: 'CUSTOMS',
    status: 'ACTIVE',
  });
  const durationResolve = performance.now() - startResolve;

  assert(
    customsOnly.length > 0 && durationResolve < 50,
    `TEST 22: Performance benchmark: 10,000 capability bindings filtered in ${durationResolve.toFixed(2)}ms (< 50ms)`
  );

  // Scenario 23: Benchmark 10,000 attachment validations
  const startAttach = performance.now();
  let attachCount = 0;
  for (let i = 0; i < 10000; i++) {
    const res = CustomsAttachmentService.attachShipment(
      standaloneDec,
      {
        declaration_id: standaloneDec.id,
        tenant_id: tenantId,
        shipment_id: `shp-${i}`,
      },
      tenantId
    );
    if (res.success) attachCount++;
  }
  const durationAttach = performance.now() - startAttach;

  assert(
    attachCount === 10000 && durationAttach < 50,
    `TEST 23: Performance benchmark: 10,000 attachment decisions evaluated in ${durationAttach.toFixed(2)}ms (< 50ms)`
  );

  console.log('====================================================');
  console.log(`PHASE 4A COMPOSITION SUITE RESULT: ${passed} / ${passed + failed} PASSED`);
  console.log('====================================================');

  return { passed, failed, total: passed + failed };
}
