/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * Module: CEISA 4.0 3-Layer Multi-Stage Validator
 * File: lib/domain/customs/ceisa/ceisa-validator.ts
 */

import { CanonicalCustomsPayload, CeisaValidationIssue } from './types';
import { CeisaCodeSets } from './codesets';

export class CeisaValidator {
  /**
   * Runs 3-Layer Validation on the Canonical Customs Payload
   */
  public static validatePayload(payload: CanonicalCustomsPayload): {
    issues: CeisaValidationIssue[];
    blockingCount: number;
    warningsCount: number;
    isSchemaValid: boolean;
    isBusinessValid: boolean;
    readinessStatus: 'BLOCKED' | 'READY_FOR_REVIEW' | 'READY_TO_TRANSMIT';
  } {
    const issues: CeisaValidationIssue[] = [];

    // ========================================================================
    // LAYER 1: DOMAIN VALIDATION
    // ========================================================================
    const dec = payload.declaration;
    if (!dec.declaration_number || dec.declaration_number.trim() === '') {
      issues.push({
        layer: 'DOMAIN',
        ruleCode: 'DOM-001',
        severity: 'BLOCKING',
        fieldPath: 'declaration.declaration_number',
        message: 'Nomor Pengajuan AJU is missing from customs declaration',
        expectedValue: '26-character AJU string',
        actualValue: '(empty)',
        resolutionHint: 'Generate or input standard AJU number in Declaration Header'
      });
    }

    if (!payload.lines || payload.lines.length === 0) {
      issues.push({
        layer: 'DOMAIN',
        ruleCode: 'DOM-002',
        severity: 'BLOCKING',
        fieldPath: 'lines',
        message: 'Customs declaration contains zero commodity classification lines',
        expectedValue: '>= 1 line items',
        actualValue: '0 lines',
        resolutionHint: 'Add commodity items in PPJK Item Grid or Ingestion Wizard'
      });
    }

    // ========================================================================
    // LAYER 2: CEISA SCHEMA / STRUCTURAL VALIDATION
    // ========================================================================
    // CEISA-XML-001: 26-digit AJU Format
    const cleanAju = (dec.declaration_number || '').replace(/[^0-9A-Za-z]/g, '');
    if (cleanAju.length !== 26) {
      issues.push({
        layer: 'SCHEMA',
        ruleCode: 'CEISA-XML-001',
        severity: 'BLOCKING',
        fieldPath: 'DokumenPabean.Header.nomorAju',
        message: `Nomor AJU '${dec.declaration_number}' does not meet 26-character CEISA 4.0 XML schema specification`,
        expectedValue: '26 alphanumeric characters (e.g. 040300-20260826-000123-1)',
        actualValue: `${cleanAju.length} characters`,
        resolutionHint: 'Adjust AJU number format to match standard DJBC 26-digit specification'
      });
    }

    // CEISA-XML-002: Importer Tax ID
    if (!payload.parties.importerTaxId || payload.parties.importerTaxId.trim() === '') {
      issues.push({
        layer: 'SCHEMA',
        ruleCode: 'CEISA-XML-002',
        severity: 'BLOCKING',
        fieldPath: 'DokumenPabean.Header.importir.npwp',
        message: 'Importer NPWP / Tax ID is required in CEISA 4.0 XML Header',
        expectedValue: '15 or 16 digit Indonesian NPWP',
        actualValue: '(missing)',
        resolutionHint: 'Maintain importer legal profile with valid NPWP'
      });
    }

    // Item-level Schema checks
    let prevSeq = 0;
    payload.lines.forEach(line => {
      const linePath = `DokumenPabean.Barang.Item[${line.item_sequence}]`;

      // CEISA-XML-003: HS Code 8-digit
      const cleanHs = (line.hs_code || '').replace(/[^0-9]/g, '');
      if (!cleanHs || cleanHs.length < 8) {
        issues.push({
          layer: 'SCHEMA',
          ruleCode: 'CEISA-XML-003',
          severity: 'BLOCKING',
          fieldPath: `${linePath}.hsCode`,
          message: `Line #${line.item_sequence}: HS Code '${line.hs_code}' must be an 8-digit BTKI tariff code`,
          expectedValue: '8 digits (e.g. 85076090)',
          actualValue: cleanHs || '(empty)',
          resolutionHint: 'Classify item with valid 8-digit BTKI HS code'
        });
      }

      // CEISA-XML-004: Sequence Continuity
      if (line.item_sequence !== prevSeq + 1) {
        issues.push({
          layer: 'SCHEMA',
          ruleCode: 'CEISA-XML-004',
          severity: 'WARNING',
          fieldPath: `${linePath}.serNo`,
          message: `Line item sequence jump detected: expected #${prevSeq + 1}, found #${line.item_sequence}`,
          expectedValue: `#${prevSeq + 1}`,
          actualValue: `#${line.item_sequence}`,
          resolutionHint: 'Renumber line items sequentially before transmission'
        });
      }
      prevSeq = line.item_sequence;

      // CEISA-XML-005: Positive Quantity
      if (!line.item_quantity || line.item_quantity <= 0) {
        issues.push({
          layer: 'SCHEMA',
          ruleCode: 'CEISA-XML-005',
          severity: 'BLOCKING',
          fieldPath: `${linePath}.jumlahSatuan`,
          message: `Line #${line.item_sequence}: Quantity (${line.item_quantity}) must be greater than zero`,
          expectedValue: '> 0',
          actualValue: String(line.item_quantity),
          resolutionHint: 'Specify positive item quantity'
        });
      }

      // CEISA-XML-006: Positive Unit Price
      if (line.unit_price_usd === undefined || line.unit_price_usd <= 0) {
        issues.push({
          layer: 'SCHEMA',
          ruleCode: 'CEISA-XML-006',
          severity: 'BLOCKING',
          fieldPath: `${linePath}.hargaSatuan`,
          message: `Line #${line.item_sequence}: Unit price must be greater than zero in commercial declarations`,
          expectedValue: '> 0',
          actualValue: `$${line.unit_price_usd || 0}`,
          resolutionHint: 'Enter valid commercial unit price'
        });
      }
    });

    // ========================================================================
    // LAYER 3: CEISA BUSINESS RULE VALIDATION
    // ========================================================================
    // CEISA-BIZ-001: CIF Reconciliation
    let sumLinesCif = 0;
    for (const l of payload.lines) {
      sumLinesCif += l.cif_value_usd || 0;
    }
    const cifDiff = Math.abs(sumLinesCif - payload.valuation.totalCifUsd);
    if (cifDiff > 0.05) {
      issues.push({
        layer: 'BUSINESS_RULE',
        ruleCode: 'CEISA-BIZ-001',
        severity: 'BLOCKING',
        fieldPath: 'DokumenPabean.Header.cifUsd',
        message: `Header CIF value ($${payload.valuation.totalCifUsd}) does not match sum of commodity line CIF values ($${sumLinesCif.toFixed(2)})`,
        expectedValue: `$${sumLinesCif.toFixed(2)}`,
        actualValue: `$${payload.valuation.totalCifUsd}`,
        resolutionHint: 'Reconcile freight and insurance distribution in Valuation Workspace'
      });
    }

    // CEISA-BIZ-002: Lartas Permit Evidence
    const lartasLines = payload.lines.filter(l => l.lartas_flag);
    if (lartasLines.length > 0) {
      const hasPermitDoc = payload.documents.some(d => d.document_type === 'PERMIT' && d.verification_status === 'VERIFIED');
      if (!hasPermitDoc) {
        issues.push({
          layer: 'BUSINESS_RULE',
          ruleCode: 'CEISA-BIZ-002',
          severity: 'BLOCKING',
          fieldPath: 'DokumenPabean.DokumenLampiran',
          message: `Declaration contains ${lartasLines.length} Lartas restricted items but no verified trade permit (PI/LS) is attached`,
          expectedValue: 'Verified import permit document in vault',
          actualValue: 'Missing / Unverified',
          resolutionHint: 'Upload and verify statutory import permit in Lartas & Documents Workspace'
        });
      }
    }

    // CEISA-BIZ-003: Customs Office Master
    if (dec.customs_office_code && !CeisaCodeSets.isValidCustomsOffice(dec.customs_office_code)) {
      issues.push({
        layer: 'BUSINESS_RULE',
        ruleCode: 'CEISA-BIZ-003',
        severity: 'WARNING',
        fieldPath: 'DokumenPabean.Header.kodeKantor',
        message: `Customs office code '${dec.customs_office_code}' is not recognized in official KPPBC directory`,
        expectedValue: 'Valid 6-digit KPPBC code (e.g. 040300 Tanjung Priok)',
        actualValue: dec.customs_office_code,
        resolutionHint: 'Select registered customs office from master directory'
      });
    }

    const blockingCount = issues.filter(i => i.severity === 'BLOCKING').length;
    const warningsCount = issues.filter(i => i.severity === 'WARNING').length;
    const isSchemaValid = issues.filter(i => i.layer === 'SCHEMA' && i.severity === 'BLOCKING').length === 0;
    const isBusinessValid = issues.filter(i => i.layer === 'BUSINESS_RULE' && i.severity === 'BLOCKING').length === 0;

    let readinessStatus: 'BLOCKED' | 'READY_FOR_REVIEW' | 'READY_TO_TRANSMIT' = 'BLOCKED';
    if (blockingCount === 0) {
      readinessStatus = warningsCount === 0 ? 'READY_TO_TRANSMIT' : 'READY_FOR_REVIEW';
    }

    return {
      issues,
      blockingCount,
      warningsCount,
      isSchemaValid,
      isBusinessValid,
      readinessStatus
    };
  }
}
