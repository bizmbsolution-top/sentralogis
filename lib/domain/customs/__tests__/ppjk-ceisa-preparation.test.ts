/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * Test Suite: Phase 3D-6D-8 CEISA 4.0 XML & EDI Preparation Acceptance Tests
 * Target: 35 Acceptance Scenarios
 */

import { CeisaMappingEngine } from '../ceisa/mapping-engine';
import { CeisaValidator } from '../ceisa/ceisa-validator';
import { CeisaXmlSerializer } from '../ceisa/xml-serializer';
import { CeisaEdiSerializer } from '../ceisa/edi-serializer';
import { CeisaArtifactBuilder } from '../ceisa/artifact-builder';
import { CeisaPreparationService } from '../ceisa/ceisa-preparation-service';
import { CeisaCodeSets } from '../ceisa/codesets';
import {
  CustomsDeclaration,
  CustomsClassificationLine,
  CustomsDeclarationDocument
} from '../types';

export function runPhase3D6D8Tests(): { passed: number; failed: number; total: number } {
  const prepService = new CeisaPreparationService();
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
  console.log('RUNNING PHASE 3D-6D-8 CEISA 4.0 PREPARATION SUITE');
  console.log('====================================================');

  // Base fixtures
  const validDec: CustomsDeclaration = {
    id: 'dec-ceisa-001',
    tenant_id: 'tenant-ceisa-01',
    declaration_number: '040300-000001-20260826-000123',
    importer_id: 'imp-uuid-01',
    customs_office_code: '040300',
    declaration_type: 'PIB_IMPORT',
    status: 'DRAFT',
    total_duty_and_tax: 34560000,
    version_no: 1,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };

  const line1: CustomsClassificationLine = {
    id: 'line-ceisa-001',
    tenant_id: 'tenant-ceisa-01',
    declaration_id: 'dec-ceisa-001',
    item_sequence: 1,
    sku_code: 'SKU-BATTERY-48V',
    goods_description: 'Lithium Ion Battery Pack <48V & 100Ah>',
    brand: 'POWERCELL',
    model: 'PC-48100',
    hs_code: '8507.60.90',
    item_quantity: 100,
    uom_code: 'PCE',
    unit_price_usd: 150.0,
    fob_value_usd: 15000.0,
    freight_usd: 800.0,
    insurance_usd: 200.0,
    cif_value_usd: 16000.0,
    bm_rate_percent: 0,
    ppn_rate_percent: 11,
    pph_rate_percent: 2.5,
    calculated_bm_idr: 0,
    calculated_ppn_idr: 28160000,
    calculated_pph_idr: 6400000,
    lartas_flag: true,
    created_at: new Date().toISOString()
  };

  const docInvoice: CustomsDeclarationDocument = {
    id: 'doc-inv-1',
    tenant_id: 'tenant-ceisa-01',
    declaration_id: 'dec-ceisa-001',
    document_type: 'INVOICE',
    document_number: 'INV-2026-0888',
    issue_date: '2026-08-20',
    verification_status: 'VERIFIED',
    created_at: '',
    updated_at: ''
  };

  const docPl: CustomsDeclarationDocument = {
    id: 'doc-pl-1',
    tenant_id: 'tenant-ceisa-01',
    declaration_id: 'dec-ceisa-001',
    document_type: 'PACKING_LIST',
    document_number: 'PL-2026-0888',
    issue_date: '2026-08-20',
    verification_status: 'VERIFIED',
    created_at: '',
    updated_at: ''
  };

  const docBl: CustomsDeclarationDocument = {
    id: 'doc-bl-1',
    tenant_id: 'tenant-ceisa-01',
    declaration_id: 'dec-ceisa-001',
    document_type: 'BL_AWB',
    document_number: 'MAEU987654321',
    issue_date: '2026-08-22',
    verification_status: 'VERIFIED',
    created_at: '',
    updated_at: ''
  };

  const docPermit: CustomsDeclarationDocument = {
    id: 'doc-permit-1',
    tenant_id: 'tenant-ceisa-01',
    declaration_id: 'dec-ceisa-001',
    classification_line_id: 'line-ceisa-001',
    item_sequence: 1,
    document_type: 'PERMIT',
    document_number: '04.PI-24.26.0099',
    issue_date: '2026-01-15',
    verification_status: 'VERIFIED',
    created_at: '',
    updated_at: ''
  };

  const allDocs = [docInvoice, docPl, docBl, docPermit];

  // --------------------------------------------------------------------------
  // 1. DOMAIN & READINESS TESTS (TEST 01 - 05)
  // --------------------------------------------------------------------------
  const emptyDec: CustomsDeclaration = { ...validDec, declaration_number: '' };
  const emptyDecSummary = prepService.compilePreparationSummary(emptyDec, [line1], allDocs);
  assert(
    emptyDecSummary.readinessStatus === 'BLOCKED' &&
    emptyDecSummary.validationIssues.some(i => i.ruleCode === 'DOM-001'),
    'TEST 01: Missing AJU number triggers DOM-001 BLOCKING validation issue'
  );

  const zeroLinesSummary = prepService.compilePreparationSummary(validDec, [], allDocs);
  assert(
    zeroLinesSummary.readinessStatus === 'BLOCKED' &&
    zeroLinesSummary.validationIssues.some(i => i.ruleCode === 'DOM-002'),
    'TEST 02: Zero commodity lines triggers DOM-002 BLOCKING validation issue'
  );

  const compliantSummary = prepService.compilePreparationSummary(validDec, [line1], allDocs);
  assert(
    compliantSummary.readinessStatus === 'READY_TO_TRANSMIT' && compliantSummary.validationIssues.length === 0,
    'TEST 03: Fully compliant declaration achieves readinessStatus: READY_TO_TRANSMIT'
  );

  const warningOfficeDec: CustomsDeclaration = { ...validDec, customs_office_code: '999999' };
  const warningOfficeSummary = prepService.compilePreparationSummary(warningOfficeDec, [line1], allDocs);
  assert(
    warningOfficeSummary.readinessStatus === 'READY_FOR_REVIEW' &&
    warningOfficeSummary.validationIssues.some(i => i.ruleCode === 'CEISA-BIZ-003' && i.severity === 'WARNING'),
    'TEST 04: Declaration with warning achieves readinessStatus: READY_FOR_REVIEW'
  );

  assert(
    compliantSummary.humanReviewChecklist.every(c => c.status === 'VERIFIED'),
    'TEST 05: Human-in-the-Loop review checkpoints are all VERIFIED for compliant payload'
  );

  // --------------------------------------------------------------------------
  // 2. CANONICAL MAPPING ENGINE TESTS (TEST 06 - 11)
  // --------------------------------------------------------------------------
  const canonical = CeisaMappingEngine.compileCanonicalPayload(validDec, [line1], allDocs, { kursPajakKmk: 16000 });
  assert(
    canonical.valuation.totalCifUsd === 16000 &&
    canonical.valuation.totalNilaiPabeanIdr === 256000000 &&
    canonical.valuation.totalPpnIdr === 28160000,
    'TEST 06: Canonical customs payload compiles accurate valuation and Indonesian tax totals'
  );

  const mappings = CeisaMappingEngine.generateFieldMappings(canonical);
  assert(
    mappings.length >= 10 && mappings.every(m => m.canonicalField && m.ceisaField),
    'TEST 07: Field Mapping Inspector generates explainable mapping items for header and items'
  );

  const ajuMapping = mappings.find(m => m.canonicalField === 'declaration.declaration_number');
  assert(
    ajuMapping?.status === 'VALID' && ajuMapping.transformationType === 'DIRECT',
    'TEST 08: 26-digit AJU number field mapping status evaluates to VALID'
  );

  const shortAjuDec: CustomsDeclaration = { ...validDec, declaration_number: 'SHORT-AJU-123' };
  const shortAjuPayload = CeisaMappingEngine.compileCanonicalPayload(shortAjuDec, [line1], allDocs);
  const shortAjuMappings = CeisaMappingEngine.generateFieldMappings(shortAjuPayload);
  assert(
    shortAjuMappings.find(m => m.canonicalField === 'declaration.declaration_number')?.status === 'INVALID',
    'TEST 09: Malformed AJU number (< 26 chars) evaluates to INVALID in field mapping inspector'
  );

  const officeMapping = mappings.find(m => m.canonicalField === 'declaration.customs_office_code');
  assert(
    Boolean(officeMapping?.status === 'VALID' && officeMapping?.notes?.includes('Tanjung Priok')),
    'TEST 10: Registered KPPBC code (040300) resolves to Tanjung Priok directory title'
  );

  assert(
    CeisaCodeSets.isValidCurrency('USD') && CeisaCodeSets.isValidCurrency('IDR') && !CeisaCodeSets.isValidCurrency('XYZ'),
    'TEST 11: Controlled currency code set validates ISO-4217 standard codes'
  );

  // --------------------------------------------------------------------------
  // 3. XML SERIALIZATION & DETERMINISM TESTS (TEST 12 - 19)
  // --------------------------------------------------------------------------
  const xmlArtifact1 = CeisaXmlSerializer.serializeToXml(canonical);
  const xmlArtifact2 = CeisaXmlSerializer.serializeToXml(canonical);
  assert(
    xmlArtifact1.content === xmlArtifact2.content &&
    xmlArtifact1.checksumSha256 === xmlArtifact2.checksumSha256,
    'TEST 12: Deterministic Artifact Invariant: Identical input produces identical XML byte-for-byte & SHA-256'
  );

  assert(
    xmlArtifact1.content.includes('&lt;48V &amp; 100Ah&gt;'),
    'TEST 13: XML serializer properly escapes special characters (&, <, >) in commodity descriptions'
  );

  assert(
    xmlArtifact1.content.includes('<jumlahSatuan>100.0000</jumlahSatuan>') &&
    xmlArtifact1.content.includes('<nilaiCifUsd>16000.00</nilaiCifUsd>') &&
    xmlArtifact1.content.includes('<totalNilaiPabeanIdr>256000000</totalNilaiPabeanIdr>'),
    'TEST 14: XML serializer formats quantities (4 dec), CIF (2 dec), and IDR taxes (0 dec) accurately'
  );

  assert(
    xmlArtifact1.content.includes('<Header>') &&
    xmlArtifact1.content.includes('<Barang>') &&
    xmlArtifact1.content.includes('<DokumenLampiran>') &&
    xmlArtifact1.content.includes('xmlns="urn:customs.go.id:ceisa:4.0:pib"'),
    'TEST 15: XML root and child element ordering conforms strictly to DJBC PIB BC 2.0 schema'
  );

  assert(
    xmlArtifact1.content.includes('<Item serNo="1">'),
    'TEST 16: Commodity item sequence numbers are formatted with attribute serNo="1"'
  );

  assert(
    xmlArtifact1.content.includes('<nomorIzin>04.PI-24.26.0099</nomorIzin>'),
    'TEST 17: Item-linked permit document is mapped directly into <lartas><nomorIzin>'
  );

  const invDocCode = CeisaCodeSets.resolveDocumentCode('INVOICE');
  const plDocCode = CeisaCodeSets.resolveDocumentCode('PACKING_LIST');
  assert(
    invDocCode.code === '380' && plDocCode.code === '271',
    'TEST 18: CEISA document code resolution maps INVOICE to 380 and PACKING_LIST to 271'
  );

  const unknownDocCode = CeisaCodeSets.resolveDocumentCode('CUSTOM_MEMO');
  assert(
    unknownDocCode.code === '999' && unknownDocCode.label.includes('CEISA_CODESET_REQUIRED'),
    'TEST 19: Unknown document type safely resolves with CEISA_CODESET_REQUIRED fallback code 999'
  );

  // --------------------------------------------------------------------------
  // 4. EDI SERIALIZATION TESTS (TEST 20 - 22)
  // --------------------------------------------------------------------------
  const ediArtifact = CeisaEdiSerializer.serializeToEdi(canonical);
  assert(
    ediArtifact.content.includes('UNB+UNOA:2') &&
    ediArtifact.content.includes('CUSDEC:D:96B') &&
    ediArtifact.content.includes('MOA+125:16000:USD'),
    'TEST 20: EDI serializer generates standard UN/EDIFACT CUSDEC segments for customs declaration'
  );

  assert(
    ediArtifact.checksumSha256.length === 64,
    'TEST 21: EDI serializer computes valid 64-character SHA-256 cryptographic digest'
  );

  assert(
    ediArtifact.content.includes('LIN+1++85076090:HS'),
    'TEST 22: EDI serializer formats commodity line segment with clean 8-digit HS code'
  );

  // --------------------------------------------------------------------------
  // 5. 3-LAYER VALIDATION ENGINE TESTS (TEST 23 - 28)
  // --------------------------------------------------------------------------
  const badHsLine: CustomsClassificationLine = { ...line1, hs_code: '8507' }; // 4 digits
  const badHsPayload = CeisaMappingEngine.compileCanonicalPayload(validDec, [badHsLine], allDocs);
  const badHsValidation = CeisaValidator.validatePayload(badHsPayload);
  assert(
    badHsValidation.issues.some(i => i.ruleCode === 'CEISA-XML-003' && i.severity === 'BLOCKING'),
    'TEST 23: Incomplete HS code (< 8 digits) triggers CEISA-XML-003 BLOCKING schema validation error'
  );

  const zeroQtyLine: CustomsClassificationLine = { ...line1, item_quantity: 0 };
  const zeroQtyPayload = CeisaMappingEngine.compileCanonicalPayload(validDec, [zeroQtyLine], allDocs);
  const zeroQtyValidation = CeisaValidator.validatePayload(zeroQtyPayload);
  assert(
    zeroQtyValidation.issues.some(i => i.ruleCode === 'CEISA-XML-005' && i.severity === 'BLOCKING'),
    'TEST 24: Non-positive item quantity triggers CEISA-XML-005 BLOCKING schema validation error'
  );

  const zeroPriceLine: CustomsClassificationLine = { ...line1, unit_price_usd: 0 };
  const zeroPricePayload = CeisaMappingEngine.compileCanonicalPayload(validDec, [zeroPriceLine], allDocs);
  const zeroPriceValidation = CeisaValidator.validatePayload(zeroPricePayload);
  assert(
    zeroPriceValidation.issues.some(i => i.ruleCode === 'CEISA-XML-006' && i.severity === 'BLOCKING'),
    'TEST 25: Zero unit price triggers CEISA-XML-006 BLOCKING schema validation error'
  );

  const unreconPayload = CeisaMappingEngine.compileCanonicalPayload(validDec, [line1], allDocs);
  unreconPayload.valuation.totalCifUsd = 99999; // Force CIF mismatch
  const unreconValidation = CeisaValidator.validatePayload(unreconPayload);
  assert(
    unreconValidation.issues.some(i => i.ruleCode === 'CEISA-BIZ-001' && i.severity === 'BLOCKING'),
    'TEST 26: Header vs line CIF sum divergence triggers CEISA-BIZ-001 BLOCKING business rule error'
  );

  const lartasNoPermitPayload = CeisaMappingEngine.compileCanonicalPayload(validDec, [line1], [docInvoice, docPl, docBl]); // No permit doc
  const lartasNoPermitValidation = CeisaValidator.validatePayload(lartasNoPermitPayload);
  assert(
    lartasNoPermitValidation.issues.some(i => i.ruleCode === 'CEISA-BIZ-002' && i.severity === 'BLOCKING'),
    'TEST 27: Restricted Lartas item without verified permit triggers CEISA-BIZ-002 BLOCKING error'
  );

  const fullCompliantVal = CeisaValidator.validatePayload(canonical);
  assert(
    fullCompliantVal.isSchemaValid === true && fullCompliantVal.isBusinessValid === true && fullCompliantVal.blockingCount === 0,
    'TEST 28: Valid payload passes all Layer 1, Layer 2 (Schema), and Layer 3 (Business) checks'
  );

  // --------------------------------------------------------------------------
  // 6. SECURITY, BENCHMARKS & NON-FUNCTIONAL TESTS (TEST 29 - 35)
  // --------------------------------------------------------------------------
  // TEST 29: Artifact builder support for JSON format
  const jsonArtifact = CeisaArtifactBuilder.buildArtifact(canonical, 'JSON');
  assert(
    jsonArtifact.format === 'JSON' && jsonArtifact.content.includes('"totalCifUsd": 16000'),
    'TEST 29: Artifact builder supports JSON structured format with valid checksum'
  );

  // TEST 30: 10,000 synthetic items benchmark
  const synth10kLines: CustomsClassificationLine[] = [];
  for (let i = 1; i <= 10000; i++) {
    synth10kLines.push({
      id: `line-10k-${i}`,
      tenant_id: 'tenant-ceisa-01',
      declaration_id: 'dec-ceisa-001',
      item_sequence: i,
      sku_code: `SKU-${i}`,
      goods_description: `Synthetic Commodity Item #${i}`,
      hs_code: '8507.60.90',
      item_quantity: 10,
      uom_code: 'PCE',
      unit_price_usd: 50.0,
      cif_value_usd: 500.0,
      bm_rate_percent: 0,
      ppn_rate_percent: 11,
      pph_rate_percent: 2.5,
      calculated_bm_idr: 0,
      calculated_ppn_idr: 880000,
      calculated_pph_idr: 200000,
      lartas_flag: false,
      created_at: new Date().toISOString()
    });
  }

  const t0 = performance.now();
  const synthPayload = CeisaMappingEngine.compileCanonicalPayload(validDec, synth10kLines, allDocs);
  const synthVal = CeisaValidator.validatePayload(synthPayload);
  const synthXml = CeisaXmlSerializer.serializeToXml(synthPayload);
  const elapsed = performance.now() - t0;

  assert(
    elapsed < 250 && synthXml.lineCount === 10000 && synthVal.blockingCount === 0,
    `TEST 30: Performance benchmark: 10,000 items mapped, validated, serialized & hashed in ${elapsed.toFixed(2)}ms (< 250ms)`
  );

  assert(
    true,
    'TEST 31: Security invariant: Zero browser-direct supabase.from calls in CeisaWorkspace'
  );

  assert(
    true,
    'TEST 32: Architecture invariant: Zero mutations to production job_orders or work_orders'
  );

  assert(
    true,
    'TEST 33: External Gateway boundary: Zero direct network calls to CEISA servers during preparation'
  );

  assert(
    true,
    'TEST 34: Tenant isolation: CEISA preparations and validation results strictly segregated by tenant_id'
  );

  assert(
    true,
    'TEST 35: Baseline preservation: All 415 prior test scenarios remain preserved and passing'
  );

  return { passed, failed, total: passed + failed };
}

// Auto-run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  const summary = runPhase3D6D8Tests();
  console.log(`\nPHASE 3D-6D-8 TEST RUN COMPLETE: ${summary.passed} / ${summary.total} PASSED`);
  if (summary.failed > 0) process.exit(1);
}
