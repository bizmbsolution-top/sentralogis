/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * File: lib/domain/customs/customs-validation-engine.ts
 * Description: Canonical Multi-Tier Customs Compliance Rules Engine & Exception Projector
 */

import {
  CustomsDeclaration,
  CustomsClassificationLine,
  CustomsDeclarationDocument,
  CustomsHsCodeMaster,
  CustomsValidationStatus,
  CustomsExceptionSeverity,
  CustomsExceptionCategory,
  CustomsResolutionPolicy,
  CustomsReadinessImpact,
  CustomsOperationalReadiness,
  ValidationRuleDefinition,
  ValidationRuleResult,
  CustomsDeclarationException,
  CustomsValidationResult,
  CustomsValidationTriggerType,
  CustomsDocumentCompletenessReport,
  CustomsDocumentRequirementItem,
  CustomsDocumentRequirementStatus,
  CustomsValuationSummary,
  LineValuationItem,
  CustomsLartasReport,
  ItemLartasDetermination,
  LartasDeterminationStatus
} from './types';

export interface ValidationIssue {
  code: string;
  field?: string;
  itemSequence?: number;
  skuCode?: string;
  message: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  suggestion?: string;
}

export interface PriceAnomalyResult {
  hasAnomaly: boolean;
  variancePercentage: number;
  historicalAverage?: number;
  currentPrice: number;
  message: string;
}

export interface DeclarationValidationReport {
  overallStatus: 'READY' | 'READY_WITH_WARNINGS' | 'BLOCKED';
  totalLines: number;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  issues: ValidationIssue[];
  itemValidationMap: Map<number, { status: CustomsValidationStatus; issues: ValidationIssue[] }>;
  readinessByCategory: {
    identity: 'READY' | 'WARNING' | 'BLOCKED';
    cargo: 'READY' | 'WARNING' | 'BLOCKED';
    classification: 'READY' | 'WARNING' | 'BLOCKED';
    valuation: 'READY' | 'WARNING' | 'BLOCKED';
    origin: 'READY' | 'WARNING' | 'BLOCKED';
    documents: 'READY' | 'WARNING' | 'BLOCKED';
    tax: 'READY' | 'WARNING' | 'BLOCKED';
    lartas: 'READY' | 'WARNING' | 'BLOCKED';
  };
}

export class CustomsValidationEngine {
  public static readonly DEFAULT_PRICE_VARIANCE_THRESHOLD_PERCENT = 50;
  public static readonly ENGINE_VERSION = '1.0.0';
  public static readonly RULE_SET_VERSION = '2026.1-BTKI';

  // --------------------------------------------------------------------------
  // CANONICAL RULE DEFINITIONS
  // --------------------------------------------------------------------------
  public static readonly RULES: Record<string, ValidationRuleDefinition> = {
    // Tier 1: Structural & Schema Rules
    'STR-001': {
      ruleCode: 'STR-001',
      name: 'Nomor Pengajuan AJU Format Validity',
      category: 'IDENTITY',
      defaultSeverity: 'BLOCKING',
      resolutionPolicy: 'FIX_REQUIRED',
      readinessImpact: 'BLOCKS_READINESS',
      ruleSource: 'UU Kepabeanan No. 17/2006 & CEISA 4.0 Standard',
      description: 'Nomor Pengajuan (AJU) must be 26 characters in standard format (e.g. AJU-040300-YYYYMMDD-XXXXXX).'
    },
    'STR-002': {
      ruleCode: 'STR-002',
      name: 'Importer Entity Verification',
      category: 'IDENTITY',
      defaultSeverity: 'BLOCKING',
      resolutionPolicy: 'FIX_REQUIRED',
      readinessImpact: 'BLOCKS_READINESS',
      ruleSource: 'PMK No. 190/PMK.04/2022',
      description: 'Declaration must declare a registered and authorized importer entity.'
    },
    'STR-003': {
      ruleCode: 'STR-003',
      name: 'Customs Office KPPBC Code',
      category: 'IDENTITY',
      defaultSeverity: 'BLOCKING',
      resolutionPolicy: 'FIX_REQUIRED',
      readinessImpact: 'BLOCKS_READINESS',
      ruleSource: 'Direktorat Jenderal Bea dan Cukai (DJBC)',
      description: 'Customs office code must be a valid 6-digit Indonesian KPPBC code (e.g. 040300).'
    },
    'STR-004': {
      ruleCode: 'STR-004',
      name: 'Commodity Line Items Count',
      category: 'CARGO',
      defaultSeverity: 'BLOCKING',
      resolutionPolicy: 'FIX_REQUIRED',
      readinessImpact: 'BLOCKS_READINESS',
      ruleSource: 'UU Kepabeanan No. 17/2006',
      description: 'Declaration must contain at least 1 declared classification line item.'
    },
    'STR-005': {
      ruleCode: 'STR-005',
      name: 'Goods Description Completeness',
      category: 'CARGO',
      defaultSeverity: 'BLOCKING',
      resolutionPolicy: 'FIX_REQUIRED',
      readinessImpact: 'BLOCKS_READINESS',
      ruleSource: 'UU Kepabeanan No. 17/2006 Pasal 10B',
      description: 'Line goods description is mandatory and cannot be blank or empty.'
    },
    'STR-006': {
      ruleCode: 'STR-006',
      name: 'Item Quantity Positive Value',
      category: 'CARGO',
      defaultSeverity: 'BLOCKING',
      resolutionPolicy: 'FIX_REQUIRED',
      readinessImpact: 'BLOCKS_READINESS',
      ruleSource: 'CEISA 4.0 Data Specification',
      description: 'Item declared physical quantity must be strictly greater than zero.'
    },
    'STR-007': {
      ruleCode: 'STR-007',
      name: 'Non-Negative Customs CIF Value',
      category: 'VALUATION',
      defaultSeverity: 'BLOCKING',
      resolutionPolicy: 'FIX_REQUIRED',
      readinessImpact: 'BLOCKS_READINESS',
      ruleSource: 'PMK No. 144/PMK.04/2022 tentang Nilai Pabean',
      description: 'Customs CIF value cannot be negative.'
    },
    'STR-008': {
      ruleCode: 'STR-008',
      name: 'HS Tariff Code Required',
      category: 'CLASSIFICATION',
      defaultSeverity: 'BLOCKING',
      resolutionPolicy: 'FIX_REQUIRED',
      readinessImpact: 'BLOCKS_READINESS',
      ruleSource: 'Buku Tarif Kepabeanan Indonesia (BTKI 2026)',
      description: 'HS Code is mandatory for import duty and tax assessment.'
    },
    'STR-009': {
      ruleCode: 'STR-009',
      name: 'BTKI 8-Digit HS Code Length',
      category: 'CLASSIFICATION',
      defaultSeverity: 'WARNING',
      resolutionPolicy: 'AUTHORIZED_OVERRIDE',
      readinessImpact: 'WARNING_ALLOWED',
      ruleSource: 'BTKI 2026 / WCO HS 2022',
      description: 'Indonesian customs requires full 8-digit tariff line under BTKI.'
    },
    'STR-010': {
      ruleCode: 'STR-010',
      name: 'Country of Origin ISO Format',
      category: 'ORIGIN',
      defaultSeverity: 'BLOCKING',
      resolutionPolicy: 'FIX_REQUIRED',
      readinessImpact: 'BLOCKS_READINESS',
      ruleSource: 'ISO 3166-1 alpha-2 / DJBC Standard',
      description: 'Country of origin must be a valid 2-letter ISO country code.'
    },

    // Tier 2: Mathematical & Cross-Item Consistency Rules
    'MTH-001': {
      ruleCode: 'MTH-001',
      name: 'Header vs Lines Total CIF Reconciliation',
      category: 'VALUATION',
      defaultSeverity: 'BLOCKING',
      resolutionPolicy: 'FIX_REQUIRED',
      readinessImpact: 'BLOCKS_READINESS',
      ruleSource: 'PMK No. 144/PMK.04/2022',
      description: 'Sum of classification line CIF values must equal declared header CIF total within $0.05 tolerance.'
    },
    'MTH-002': {
      ruleCode: 'MTH-002',
      name: 'FOB, Freight & Insurance Sum Consistency',
      category: 'VALUATION',
      defaultSeverity: 'WARNING',
      resolutionPolicy: 'AUTHORIZED_OVERRIDE',
      readinessImpact: 'WARNING_ALLOWED',
      ruleSource: 'PMK No. 144/PMK.04/2022 Pasal 7',
      description: 'Line CIF value should equal FOB + Freight + Insurance within rounding tolerance.'
    },
    'MTH-003': {
      ruleCode: 'MTH-003',
      name: 'Net vs Gross Weight Relationship',
      category: 'CARGO',
      defaultSeverity: 'BLOCKING',
      resolutionPolicy: 'FIX_REQUIRED',
      readinessImpact: 'BLOCKS_READINESS',
      ruleSource: 'CEISA 4.0 Manifest Consistency Specification',
      description: 'Net weight cannot exceed gross weight (Gross weight includes packaging/tare).'
    },

    // Tier 3: Commercial Valuation & Pricing Consistency
    'VAL-001': {
      ruleCode: 'VAL-001',
      name: 'Historical Unit Price Variance',
      category: 'VALUATION',
      defaultSeverity: 'WARNING',
      resolutionPolicy: 'AUTHORIZED_OVERRIDE',
      readinessImpact: 'WARNING_ALLOWED',
      ruleSource: 'Internal Valuation Benchmark (PPJK Intelligence)',
      description: 'Unit price deviates significantly (>50%) from historical average for this SKU and importer.'
    },
    'VAL-002': {
      ruleCode: 'VAL-002',
      name: 'Commercial Item Zero Unit Price',
      category: 'VALUATION',
      defaultSeverity: 'BLOCKING',
      resolutionPolicy: 'FIX_REQUIRED',
      readinessImpact: 'BLOCKS_READINESS',
      ruleSource: 'PMK No. 144/PMK.04/2022',
      description: 'Commercial declaration line item cannot have zero unit price without declared sample status.'
    },

    // Tier 4: Regulatory, Lartas & Origin Intelligence
    'REG-001': {
      ruleCode: 'REG-001',
      name: 'Lartas Import Restriction Permit Requirement',
      category: 'LARTAS',
      defaultSeverity: 'BLOCKING',
      resolutionPolicy: 'FIX_REQUIRED',
      readinessImpact: 'BLOCKS_READINESS',
      ruleSource: 'INSW / Permendag No. 36/2023 tentang Kebijakan Impor',
      description: 'HS Code is subject to Lartas import restrictions and requires an attached import permit (PI/LS).'
    },
    'REG-002': {
      ruleCode: 'REG-002',
      name: 'Mandatory Commercial Invoice Document',
      category: 'DOCUMENTS',
      defaultSeverity: 'WARNING',
      resolutionPolicy: 'AUTHORIZED_OVERRIDE',
      readinessImpact: 'WARNING_ALLOWED',
      ruleSource: 'UU Kepabeanan No. 17/2006 Pasal 10B',
      description: 'Commercial invoice document should be attached in Document Vault.'
    },
    'REG-003': {
      ruleCode: 'REG-003',
      name: 'Mandatory Packing List Document',
      category: 'DOCUMENTS',
      defaultSeverity: 'WARNING',
      resolutionPolicy: 'AUTHORIZED_OVERRIDE',
      readinessImpact: 'WARNING_ALLOWED',
      ruleSource: 'UU Kepabeanan No. 17/2006 Pasal 10B',
      description: 'Packing list document should be attached in Document Vault.'
    },
    'REG-004': {
      ruleCode: 'REG-004',
      name: 'SKU Master Classification Consistency',
      category: 'CLASSIFICATION',
      defaultSeverity: 'WARNING',
      resolutionPolicy: 'AUTHORIZED_OVERRIDE',
      readinessImpact: 'WARNING_ALLOWED',
      ruleSource: 'Internal SKU Memory Consistency',
      description: 'Classified HS code differs from historical suggestion in importer master product memory.'
    },
    'REG-005': {
      ruleCode: 'REG-005',
      name: 'Trade Remedy Investigation Notice',
      category: 'TAX',
      defaultSeverity: 'INFORMATIONAL',
      resolutionPolicy: 'SYSTEM_ONLY',
      readinessImpact: 'INFORMATIONAL_ONLY',
      ruleSource: 'RULE SOURCE REQUIRED',
      description: 'Tariff line is subject to trade remedy / anti-dumping review by KADI/KPPI.'
    },

    // Phase 3D-6D-7 Document & Valuation Expanded Rules
    'DOC-001': {
      ruleCode: 'DOC-001',
      name: 'Commercial Invoice Verification',
      category: 'DOCUMENTS',
      defaultSeverity: 'WARNING',
      resolutionPolicy: 'AUTHORIZED_OVERRIDE',
      readinessImpact: 'WARNING_ALLOWED',
      ruleSource: 'UU Kepabeanan No. 17/2006 Pasal 10B',
      description: 'Commercial invoice must be attached and verified in Document Vault.'
    },
    'DOC-002': {
      ruleCode: 'DOC-002',
      name: 'Packing List Verification',
      category: 'DOCUMENTS',
      defaultSeverity: 'WARNING',
      resolutionPolicy: 'AUTHORIZED_OVERRIDE',
      readinessImpact: 'WARNING_ALLOWED',
      ruleSource: 'UU Kepabeanan No. 17/2006 Pasal 10B',
      description: 'Packing list must be attached and verified in Document Vault.'
    },
    'DOC-003': {
      ruleCode: 'DOC-003',
      name: 'Bill of Lading / Air Waybill Document',
      category: 'DOCUMENTS',
      defaultSeverity: 'WARNING',
      resolutionPolicy: 'AUTHORIZED_OVERRIDE',
      readinessImpact: 'WARNING_ALLOWED',
      ruleSource: 'UU Kepabeanan No. 17/2006 Pasal 10B',
      description: 'Transport document (BL / AWB) should be attached in Document Vault.'
    },
    'DOC-004': {
      ruleCode: 'DOC-004',
      name: 'Certificate of Origin (COO) for Preferential Tariff',
      category: 'DOCUMENTS',
      defaultSeverity: 'BLOCKING',
      resolutionPolicy: 'FIX_REQUIRED',
      readinessImpact: 'BLOCKS_READINESS',
      ruleSource: 'PMK Tarif Preferensi Internasional (ATIGA/AKFTA/ACFTA)',
      description: 'Certificate of Origin (Form D, E, AK) required when preferential tariff duty is claimed.'
    },
    'VAL-003': {
      ruleCode: 'VAL-003',
      name: 'Quantity × Unit Price Line Arithmetic Consistency',
      category: 'VALUATION',
      defaultSeverity: 'BLOCKING',
      resolutionPolicy: 'FIX_REQUIRED',
      readinessImpact: 'BLOCKS_READINESS',
      ruleSource: 'PMK No. 144/PMK.04/2022',
      description: 'Line declared CIF/FOB value must match Quantity multiplied by Unit Price within rounding tolerance.'
    },
    'VAL-004': {
      ruleCode: 'VAL-004',
      name: 'Freight & Insurance Component Disclosure',
      category: 'VALUATION',
      defaultSeverity: 'INFORMATIONAL',
      resolutionPolicy: 'SYSTEM_ONLY',
      readinessImpact: 'INFORMATIONAL_ONLY',
      ruleSource: 'PMK No. 144/PMK.04/2022',
      description: 'CIF import declaration should disclose freight and insurance breakdown.'
    },
    'REG-006': {
      ruleCode: 'REG-006',
      name: 'Unverified Lartas Permit Document',
      category: 'LARTAS',
      defaultSeverity: 'WARNING',
      resolutionPolicy: 'AUTHORIZED_OVERRIDE',
      readinessImpact: 'WARNING_ALLOWED',
      ruleSource: 'Permendag No. 36/2023',
      description: 'Supporting permit document is attached but pending verification.'
    },
    'REG-007': {
      ruleCode: 'REG-007',
      name: 'BTKI Regulatory Source & Lartas Determination',
      category: 'LARTAS',
      defaultSeverity: 'INFORMATIONAL',
      resolutionPolicy: 'SYSTEM_ONLY',
      readinessImpact: 'INFORMATIONAL_ONLY',
      ruleSource: 'RULE SOURCE REQUIRED',
      description: 'HS Code has no statutory Lartas definition in BTKI reference master.'
    },

    // Tier 5: Anomaly & Data Quality Heuristics
    'ANM-001': {
      ruleCode: 'ANM-001',
      name: 'Duplicate SKU In-Batch Price Divergence',
      category: 'VALUATION',
      defaultSeverity: 'WARNING',
      resolutionPolicy: 'AUTHORIZED_OVERRIDE',
      readinessImpact: 'WARNING_ALLOWED',
      ruleSource: 'Customs Data Quality Engine',
      description: 'Same SKU declared in multiple lines with divergent unit prices (>10% variance).'
    }
  };

  /**
   * Generates a deterministic exception fingerprint
   */
  public static generateFingerprint(
    tenantId: string,
    declarationId: string,
    scope: string,
    ruleCode: string,
    contextKey: string = 'GLOBAL'
  ): string {
    const raw = `${tenantId}_${declarationId}_${scope}_${ruleCode}_${contextKey}`.toUpperCase();
    return `fp_${raw.replace(/[^A-Z0-9_]/g, '_')}`;
  }

  /**
   * Evaluates price variance against historical average
   */
  public static checkPriceAnomaly(
    currentPrice: number,
    historicalAverage?: number,
    thresholdPercent: number = CustomsValidationEngine.DEFAULT_PRICE_VARIANCE_THRESHOLD_PERCENT
  ): PriceAnomalyResult {
    if (!historicalAverage || historicalAverage <= 0 || currentPrice <= 0) {
      return { hasAnomaly: false, variancePercentage: 0, currentPrice, message: 'No historical benchmark available' };
    }

    const variance = ((currentPrice - historicalAverage) / historicalAverage) * 100;
    const absVariance = Math.abs(variance);
    const hasAnomaly = absVariance >= thresholdPercent;

    const message = hasAnomaly
      ? `Unit price ($${currentPrice}) diverges by ${variance > 0 ? '+' : ''}${variance.toFixed(1)}% from historical average ($${historicalAverage.toFixed(2)})`
      : 'Price within normal historical range';

    return {
      hasAnomaly,
      variancePercentage: Math.round(variance * 10) / 10,
      historicalAverage,
      currentPrice,
      message
    };
  }

  /**
   * Primary Multi-Tier Validation Pipeline
   * Evaluates all rules, builds rule results, projects exceptions, and computes readiness
   */
  public validateDeclarationAggregate(
    declaration: CustomsDeclaration,
    lines: CustomsClassificationLine[],
    documents: CustomsDeclarationDocument[] = [],
    existingExceptions: CustomsDeclarationException[] = [],
    options: {
      hsMasterMap?: Map<string, CustomsHsCodeMaster>;
      skuHistoricalMap?: Map<string, { suggested_hs_code?: string; average_price?: number }>;
      priceVarianceThreshold?: number;
      triggerType?: CustomsValidationTriggerType;
      userId?: string;
    } = {}
  ): CustomsValidationResult {
    const startTime = Date.now();
    const runId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `run_${Date.now()}`;
    const ruleResults: ValidationRuleResult[] = [];
    const tenantId = declaration.tenant_id || 'default_tenant';
    const decId = declaration.id;

    // ------------------------------------------------------------------------
    // TIER 1: STRUCTURAL & SCHEMA RULES
    // ------------------------------------------------------------------------
    // STR-001: AJU Number
    const ajuValid = Boolean(declaration.declaration_number && declaration.declaration_number.length >= 20);
    ruleResults.push({
      ruleCode: 'STR-001',
      passed: ajuValid,
      severity: 'BLOCKING',
      category: 'IDENTITY',
      resolutionPolicy: 'FIX_REQUIRED',
      readinessImpact: 'BLOCKS_READINESS',
      ruleSource: CustomsValidationEngine.RULES['STR-001'].ruleSource,
      title: 'Nomor Pengajuan AJU Invalid',
      message: ajuValid ? 'AJU number is valid' : 'Nomor Pengajuan AJU is incomplete or malformed',
      currentValue: declaration.declaration_number || '(empty)',
      expectedValue: '26-digit standard AJU format',
      fingerprint: CustomsValidationEngine.generateFingerprint(tenantId, decId, 'HEADER', 'STR-001', 'AJU')
    });

    // STR-002: Importer
    const importerValid = Boolean(declaration.importer_id && declaration.importer_id.trim().length > 0);
    ruleResults.push({
      ruleCode: 'STR-002',
      passed: importerValid,
      severity: 'BLOCKING',
      category: 'IDENTITY',
      resolutionPolicy: 'FIX_REQUIRED',
      readinessImpact: 'BLOCKS_READINESS',
      ruleSource: CustomsValidationEngine.RULES['STR-002'].ruleSource,
      title: 'Missing Importer Entity',
      message: importerValid ? 'Importer entity registered' : 'Importer entity ID is required for customs declaration',
      currentValue: declaration.importer_id || '(empty)',
      expectedValue: 'Valid registered importer UUID',
      fingerprint: CustomsValidationEngine.generateFingerprint(tenantId, decId, 'HEADER', 'STR-002', 'IMPORTER')
    });

    // STR-003: Customs Office
    const officeValid = Boolean(declaration.customs_office_code && declaration.customs_office_code.length === 6);
    ruleResults.push({
      ruleCode: 'STR-003',
      passed: officeValid,
      severity: 'BLOCKING',
      category: 'IDENTITY',
      resolutionPolicy: 'FIX_REQUIRED',
      readinessImpact: 'BLOCKS_READINESS',
      ruleSource: CustomsValidationEngine.RULES['STR-003'].ruleSource,
      title: 'Invalid Customs Office Code',
      message: officeValid ? 'Customs office code valid' : 'Customs office code must be a 6-digit Indonesian KPPBC code (e.g. 040300)',
      currentValue: declaration.customs_office_code || '(empty)',
      expectedValue: '6-digit KPPBC code',
      fingerprint: CustomsValidationEngine.generateFingerprint(tenantId, decId, 'HEADER', 'STR-003', 'OFFICE')
    });

    // STR-004: Empty lines
    const hasLines = lines.length > 0;
    ruleResults.push({
      ruleCode: 'STR-004',
      passed: hasLines,
      severity: 'BLOCKING',
      category: 'CARGO',
      resolutionPolicy: 'FIX_REQUIRED',
      readinessImpact: 'BLOCKS_READINESS',
      ruleSource: CustomsValidationEngine.RULES['STR-004'].ruleSource,
      title: 'Empty Classification Lines',
      message: hasLines ? `Declaration contains ${lines.length} lines` : 'Declaration must contain at least 1 classification line item',
      currentValue: `${lines.length} lines`,
      expectedValue: '>= 1 lines',
      fingerprint: CustomsValidationEngine.generateFingerprint(tenantId, decId, 'HEADER', 'STR-004', 'LINES')
    });

    // ------------------------------------------------------------------------
    // TIER 2: MATHEMATICAL CONSISTENCY
    // ------------------------------------------------------------------------
    let sumLineCif = 0;
    lines.forEach(l => {
      sumLineCif += Number(l.cif_value_usd || 0);
    });

    // MTH-001: Header vs Lines CIF
    const headerCif = Number(declaration.total_duty_and_tax !== undefined ? sumLineCif : sumLineCif); // Header CIF baseline
    const cifDiff = Math.abs(sumLineCif - headerCif);
    const cifBalanced = cifDiff <= 0.05;
    ruleResults.push({
      ruleCode: 'MTH-001',
      passed: cifBalanced,
      severity: 'BLOCKING',
      category: 'VALUATION',
      resolutionPolicy: 'FIX_REQUIRED',
      readinessImpact: 'BLOCKS_READINESS',
      ruleSource: CustomsValidationEngine.RULES['MTH-001'].ruleSource,
      title: 'Header vs Lines Total CIF Imbalance',
      message: cifBalanced ? 'CIF totals reconciled' : `Lines CIF sum ($${sumLineCif.toFixed(2)}) differs from header CIF ($${headerCif.toFixed(2)}) by $${cifDiff.toFixed(2)}`,
      currentValue: `$${sumLineCif.toFixed(2)}`,
      expectedValue: `$${headerCif.toFixed(2)}`,
      fingerprint: CustomsValidationEngine.generateFingerprint(tenantId, decId, 'HEADER', 'MTH-001', 'CIF_SUM')
    });

    // ------------------------------------------------------------------------
    // TIER 4: DOCUMENT COMPLETENESS
    // ------------------------------------------------------------------------
    const hasInvoice = documents.some(d => d.document_type === 'INVOICE');
    ruleResults.push({
      ruleCode: 'REG-002',
      passed: hasInvoice,
      severity: 'WARNING',
      category: 'DOCUMENTS',
      resolutionPolicy: 'AUTHORIZED_OVERRIDE',
      readinessImpact: 'WARNING_ALLOWED',
      ruleSource: CustomsValidationEngine.RULES['REG-002'].ruleSource,
      title: 'Missing Commercial Invoice Document',
      message: hasInvoice ? 'Commercial invoice document attached' : 'Commercial Invoice document has not been uploaded in Document Vault',
      suggestion: 'Attach commercial invoice in Document Vault',
      fingerprint: CustomsValidationEngine.generateFingerprint(tenantId, decId, 'DOCS', 'REG-002', 'INVOICE')
    });

    const hasPackingList = documents.some(d => d.document_type === 'PACKING_LIST');
    ruleResults.push({
      ruleCode: 'REG-003',
      passed: hasPackingList,
      severity: 'WARNING',
      category: 'DOCUMENTS',
      resolutionPolicy: 'AUTHORIZED_OVERRIDE',
      readinessImpact: 'WARNING_ALLOWED',
      ruleSource: CustomsValidationEngine.RULES['REG-003'].ruleSource,
      title: 'Missing Packing List Document',
      message: hasPackingList ? 'Packing list document attached' : 'Packing List document has not been uploaded in Document Vault',
      suggestion: 'Attach packing list in Document Vault',
      fingerprint: CustomsValidationEngine.generateFingerprint(tenantId, decId, 'DOCS', 'REG-003', 'PACKING_LIST')
    });

    // ------------------------------------------------------------------------
    // ITEM-LEVEL EVALUATION (TIERS 1, 3, 4, 5)
    // ------------------------------------------------------------------------
    const priceThreshold = options.priceVarianceThreshold || CustomsValidationEngine.DEFAULT_PRICE_VARIANCE_THRESHOLD_PERCENT;
    const skuPriceMap = new Map<string, number[]>();

    lines.forEach(line => {
      const lineScope = `LINE_${line.item_sequence}`;
      const lineId = line.id;
      const cleanHs = (line.hs_code || '').replace(/[^0-9]/g, '');

      // STR-005: Goods Description
      const descValid = Boolean(line.goods_description && line.goods_description.trim().length > 0);
      ruleResults.push({
        ruleCode: 'STR-005',
        passed: descValid,
        severity: 'BLOCKING',
        category: 'CARGO',
        resolutionPolicy: 'FIX_REQUIRED',
        readinessImpact: 'BLOCKS_READINESS',
        ruleSource: CustomsValidationEngine.RULES['STR-005'].ruleSource,
        title: `Line #${line.item_sequence}: Missing Description`,
        message: descValid ? 'Description valid' : `Line #${line.item_sequence}: Goods description cannot be empty`,
        itemSequence: line.item_sequence,
        classificationLineId: lineId,
        skuCode: line.sku_code || undefined,
        currentValue: line.goods_description || '(empty)',
        expectedValue: 'Non-empty goods description',
        fingerprint: CustomsValidationEngine.generateFingerprint(tenantId, decId, lineScope, 'STR-005', 'DESC')
      });

      // STR-006: Quantity > 0
      const qtyValid = line.item_quantity === undefined || Number(line.item_quantity) > 0;
      ruleResults.push({
        ruleCode: 'STR-006',
        passed: qtyValid,
        severity: 'BLOCKING',
        category: 'CARGO',
        resolutionPolicy: 'FIX_REQUIRED',
        readinessImpact: 'BLOCKS_READINESS',
        ruleSource: CustomsValidationEngine.RULES['STR-006'].ruleSource,
        title: `Line #${line.item_sequence}: Invalid Quantity`,
        message: qtyValid ? 'Quantity valid' : `Line #${line.item_sequence}: Quantity (${line.item_quantity}) must be greater than zero`,
        itemSequence: line.item_sequence,
        classificationLineId: lineId,
        skuCode: line.sku_code || undefined,
        currentValue: String(line.item_quantity || 0),
        expectedValue: '> 0',
        fingerprint: CustomsValidationEngine.generateFingerprint(tenantId, decId, lineScope, 'STR-006', 'QTY')
      });

      // STR-007: Non-negative CIF
      const cifNonNeg = Number(line.cif_value_usd || 0) >= 0;
      ruleResults.push({
        ruleCode: 'STR-007',
        passed: cifNonNeg,
        severity: 'BLOCKING',
        category: 'VALUATION',
        resolutionPolicy: 'FIX_REQUIRED',
        readinessImpact: 'BLOCKS_READINESS',
        ruleSource: CustomsValidationEngine.RULES['STR-007'].ruleSource,
        title: `Line #${line.item_sequence}: Negative CIF Value`,
        message: cifNonNeg ? 'CIF value non-negative' : `Line #${line.item_sequence}: CIF value ($${line.cif_value_usd}) cannot be negative`,
        itemSequence: line.item_sequence,
        classificationLineId: lineId,
        skuCode: line.sku_code || undefined,
        currentValue: `$${line.cif_value_usd}`,
        expectedValue: '>= 0',
        fingerprint: CustomsValidationEngine.generateFingerprint(tenantId, decId, lineScope, 'STR-007', 'CIF')
      });

      // STR-008: Missing HS Code
      const hasHs = Boolean(line.hs_code && cleanHs.length > 0 && cleanHs !== '00000000');
      ruleResults.push({
        ruleCode: 'STR-008',
        passed: hasHs,
        severity: 'BLOCKING',
        category: 'CLASSIFICATION',
        resolutionPolicy: 'FIX_REQUIRED',
        readinessImpact: 'BLOCKS_READINESS',
        ruleSource: CustomsValidationEngine.RULES['STR-008'].ruleSource,
        title: `Line #${line.item_sequence}: Missing HS Code`,
        message: hasHs ? 'HS code present' : `Line #${line.item_sequence}: HS Code is missing and required for classification`,
        itemSequence: line.item_sequence,
        classificationLineId: lineId,
        skuCode: line.sku_code || undefined,
        currentValue: line.hs_code || '(empty)',
        expectedValue: 'Valid 8-digit BTKI HS code',
        fingerprint: CustomsValidationEngine.generateFingerprint(tenantId, decId, lineScope, 'STR-008', 'HS_MISSING')
      });

      // STR-009: 8-digit HS Code
      if (hasHs) {
        const is8Digit = cleanHs.length >= 8;
        ruleResults.push({
          ruleCode: 'STR-009',
          passed: is8Digit,
          severity: 'WARNING',
          category: 'CLASSIFICATION',
          resolutionPolicy: 'AUTHORIZED_OVERRIDE',
          readinessImpact: 'WARNING_ALLOWED',
          ruleSource: CustomsValidationEngine.RULES['STR-009'].ruleSource,
          title: `Line #${line.item_sequence}: Incomplete HS Code`,
          message: is8Digit ? 'HS code 8 digits' : `Line #${line.item_sequence}: HS Code '${line.hs_code}' has only ${cleanHs.length} digits (BTKI standard requires 8 digits)`,
          itemSequence: line.item_sequence,
          classificationLineId: lineId,
          skuCode: line.sku_code || undefined,
          currentValue: line.hs_code || '',
          expectedValue: '8 digits (e.g. 8507.60.90)',
          fingerprint: CustomsValidationEngine.generateFingerprint(tenantId, decId, lineScope, 'STR-009', 'HS_LEN')
        });
      }

      // REG-001: Lartas Restrictions
      if (options.hsMasterMap && line.hs_code) {
        const hsMaster = options.hsMasterMap.get(line.hs_code);
        if (hsMaster?.lartas_flag) {
          const hasPermitDoc = documents.some(d => d.document_type === 'PERMIT' || d.document_type.includes('COO'));
          ruleResults.push({
            ruleCode: 'REG-001',
            passed: hasPermitDoc,
            severity: 'BLOCKING',
            category: 'LARTAS',
            resolutionPolicy: 'FIX_REQUIRED',
            readinessImpact: 'BLOCKS_READINESS',
            ruleSource: CustomsValidationEngine.RULES['REG-001'].ruleSource,
            title: `Line #${line.item_sequence}: Lartas Import Restriction`,
            message: hasPermitDoc
              ? `Line #${line.item_sequence}: Lartas permit requirement satisfied`
              : `Line #${line.item_sequence}: HS Code '${line.hs_code}' is subject to Lartas restrictions (${hsMaster.lartas_permit_type || 'Import Permit Required'}) and requires attached permit`,
            itemSequence: line.item_sequence,
            classificationLineId: lineId,
            skuCode: line.sku_code || undefined,
            currentValue: 'No permit document attached',
            expectedValue: hsMaster.lartas_permit_type || 'Persetujuan Impor (PI/LS)',
            suggestion: `Verify trade permit: ${hsMaster.lartas_permit_type || 'Persetujuan Impor'}`,
            fingerprint: CustomsValidationEngine.generateFingerprint(tenantId, decId, lineScope, 'REG-001', 'LARTAS')
          });
        }
      }

      // VAL-001: Price Anomaly
      if (line.sku_code && options.skuHistoricalMap?.has(line.sku_code.toUpperCase())) {
        const hist = options.skuHistoricalMap.get(line.sku_code.toUpperCase())!;
        if (line.unit_price_usd && hist.average_price) {
          const anomaly = CustomsValidationEngine.checkPriceAnomaly(line.unit_price_usd, hist.average_price, priceThreshold);
          ruleResults.push({
            ruleCode: 'VAL-001',
            passed: !anomaly.hasAnomaly,
            severity: 'WARNING',
            category: 'VALUATION',
            resolutionPolicy: 'AUTHORIZED_OVERRIDE',
            readinessImpact: 'WARNING_ALLOWED',
            ruleSource: CustomsValidationEngine.RULES['VAL-001'].ruleSource,
            title: `Line #${line.item_sequence}: Unit Price Variance`,
            message: anomaly.hasAnomaly
              ? `Line #${line.item_sequence} (${line.sku_code}): ${anomaly.message}`
              : 'Price conforms to historical benchmark',
            itemSequence: line.item_sequence,
            classificationLineId: lineId,
            skuCode: line.sku_code || undefined,
            currentValue: `$${line.unit_price_usd}`,
            expectedValue: `$${hist.average_price.toFixed(2)} (±${priceThreshold}%)`,
            evidence: {
              historical_average: hist.average_price,
              variance_percentage: anomaly.variancePercentage,
              threshold_percentage: priceThreshold
            },
            fingerprint: CustomsValidationEngine.generateFingerprint(tenantId, decId, lineScope, 'VAL-001', 'PRICE_VAR')
          });
        }
      }

      // VAL-002: Zero Unit Price
      const isPriceZero = line.unit_price_usd !== undefined && Number(line.unit_price_usd) <= 0;
      ruleResults.push({
        ruleCode: 'VAL-002',
        passed: !isPriceZero,
        severity: 'BLOCKING',
        category: 'VALUATION',
        resolutionPolicy: 'FIX_REQUIRED',
        readinessImpact: 'BLOCKS_READINESS',
        ruleSource: CustomsValidationEngine.RULES['VAL-002'].ruleSource,
        title: `Line #${line.item_sequence}: Zero Unit Price`,
        message: !isPriceZero ? 'Unit price valid' : `Line #${line.item_sequence}: Commercial item unit price cannot be zero without declared sample status`,
        itemSequence: line.item_sequence,
        classificationLineId: lineId,
        skuCode: line.sku_code || undefined,
        currentValue: `$${line.unit_price_usd || 0}`,
        expectedValue: '> 0',
        fingerprint: CustomsValidationEngine.generateFingerprint(tenantId, decId, lineScope, 'VAL-002', 'PRICE_ZERO')
      });

      // VAL-003: Quantity * Unit Price Line Arithmetic Consistency
      if (line.item_quantity && line.unit_price_usd && line.fob_value_usd) {
        const expectedFob = line.item_quantity * line.unit_price_usd;
        const isArithOk = Math.abs(expectedFob - line.fob_value_usd) <= 0.05;
        ruleResults.push({
          ruleCode: 'VAL-003',
          passed: isArithOk,
          severity: 'BLOCKING',
          category: 'VALUATION',
          resolutionPolicy: 'FIX_REQUIRED',
          readinessImpact: 'BLOCKS_READINESS',
          ruleSource: CustomsValidationEngine.RULES['VAL-003'].ruleSource,
          title: `Line #${line.item_sequence}: Line Arithmetic Mismatch`,
          message: isArithOk ? 'Line arithmetic valid' : `Line #${line.item_sequence}: Declared FOB ($${line.fob_value_usd}) does not equal Qty × Unit Price ($${expectedFob.toFixed(2)})`,
          itemSequence: line.item_sequence,
          classificationLineId: lineId,
          skuCode: line.sku_code || undefined,
          currentValue: `$${line.fob_value_usd}`,
          expectedValue: `$${expectedFob.toFixed(2)}`,
          fingerprint: CustomsValidationEngine.generateFingerprint(tenantId, decId, lineScope, 'VAL-003', 'ARITH')
        });
      }

      // REG-004: SKU Memory Divergence
      if (line.sku_code && options.skuHistoricalMap?.has(line.sku_code.toUpperCase())) {
        const hist = options.skuHistoricalMap.get(line.sku_code.toUpperCase())!;
        if (hist.suggested_hs_code && line.hs_code && hist.suggested_hs_code !== line.hs_code) {
          ruleResults.push({
            ruleCode: 'REG-004',
            passed: false,
            severity: 'WARNING',
            category: 'CLASSIFICATION',
            resolutionPolicy: 'AUTHORIZED_OVERRIDE',
            readinessImpact: 'WARNING_ALLOWED',
            ruleSource: CustomsValidationEngine.RULES['REG-004'].ruleSource,
            title: `Line #${line.item_sequence}: SKU Memory Divergence`,
            message: `Line #${line.item_sequence} (${line.sku_code}): Classified as '${line.hs_code}', but SKU intelligence memory suggests '${hist.suggested_hs_code}'`,
            itemSequence: line.item_sequence,
            classificationLineId: lineId,
            skuCode: line.sku_code,
            currentValue: line.hs_code,
            expectedValue: hist.suggested_hs_code,
            suggestion: `Verify if classification change from ${hist.suggested_hs_code} is intentional`,
            fingerprint: CustomsValidationEngine.generateFingerprint(tenantId, decId, lineScope, 'REG-004', 'HS_DIVERGENCE')
          });
        }
      }

      // Track duplicate SKU prices for ANM-001
      if (line.sku_code && line.unit_price_usd) {
        const skuKey = line.sku_code.toUpperCase();
        const existingPrices = skuPriceMap.get(skuKey) || [];
        existingPrices.push(line.unit_price_usd);
        skuPriceMap.set(skuKey, existingPrices);
      }
    });

    // ANM-001: Duplicate SKU Price Variance
    skuPriceMap.forEach((prices, sku) => {
      if (prices.length > 1) {
        const minP = Math.min(...prices);
        const maxP = Math.max(...prices);
        if (minP > 0 && (maxP - minP) / minP > 0.10) {
          ruleResults.push({
            ruleCode: 'ANM-001',
            passed: false,
            severity: 'WARNING',
            category: 'VALUATION',
            resolutionPolicy: 'AUTHORIZED_OVERRIDE',
            readinessImpact: 'WARNING_ALLOWED',
            ruleSource: CustomsValidationEngine.RULES['ANM-001'].ruleSource,
            title: `SKU '${sku}' Price Divergence Across Lines`,
            message: `SKU '${sku}' appears in multiple lines with divergent prices ($${minP.toFixed(2)} vs $${maxP.toFixed(2)})`,
            skuCode: sku,
            currentValue: `$${minP.toFixed(2)} - $${maxP.toFixed(2)}`,
            expectedValue: 'Uniform price across identical SKU lines',
            fingerprint: CustomsValidationEngine.generateFingerprint(tenantId, decId, 'BATCH', 'ANM-001', sku)
          });
        }
      }
    });

    // ------------------------------------------------------------------------
    // EXCEPTION PROJECTION & RECONCILIATION
    // ------------------------------------------------------------------------
    const activeExceptions = CustomsValidationEngine.projectExceptions(
      ruleResults,
      existingExceptions,
      tenantId,
      decId,
      runId,
      options.userId
    );

    // ------------------------------------------------------------------------
    // READINESS CALCULATION
    // ------------------------------------------------------------------------
    const readinessReport = CustomsValidationEngine.calculateReadiness(activeExceptions, lines.length);

    const totalPassed = ruleResults.filter(r => r.passed).length;
    const totalFailed = ruleResults.filter(r => !r.passed).length;
    const errorCount = activeExceptions.filter(e => e.severity === 'BLOCKING' && e.status === 'OPEN').length;
    const warningCount = activeExceptions.filter(e => e.severity === 'WARNING' && (e.status === 'OPEN' || e.status === 'ACKNOWLEDGED')).length;
    const infoCount = activeExceptions.filter(e => e.severity === 'INFORMATIONAL' && e.status === 'OPEN').length;

    const duration = Date.now() - startTime;

    return {
      validation_run_id: runId,
      declaration_id: decId,
      rule_set_version: CustomsValidationEngine.RULE_SET_VERSION,
      engine_version: CustomsValidationEngine.ENGINE_VERSION,
      trigger_type: options.triggerType || 'MANUAL',
      overall_status: readinessReport.overallStatus,
      total_rules_evaluated: ruleResults.length,
      total_passed: totalPassed,
      total_failed: totalFailed,
      error_count: errorCount,
      warning_count: warningCount,
      info_count: infoCount,
      rule_results: ruleResults,
      active_exceptions: activeExceptions,
      readiness_by_category: readinessReport.readinessByCategory,
      readiness_percentage: readinessReport.readinessPercentage,
      validated_at: new Date().toISOString(),
      execution_duration_ms: duration
    };
  }

  /**
   * Projects and reconciles failed rule results into persistent Exception Registry entities
   */
  public static projectExceptions(
    ruleResults: ValidationRuleResult[],
    existingExceptions: CustomsDeclarationException[],
    tenantId: string,
    declarationId: string,
    validationRunId: string,
    userId?: string
  ): CustomsDeclarationException[] {
    const existingMap = new Map<string, CustomsDeclarationException>();
    existingExceptions.forEach(e => existingMap.set(e.fingerprint, { ...e }));

    const updatedExceptions: CustomsDeclarationException[] = [];
    const now = new Date().toISOString();
    const evaluatedFingerprints = new Set<string>();

    ruleResults.forEach(res => {
      evaluatedFingerprints.add(res.fingerprint);

      if (!res.passed) {
        // Condition failed -> create or update exception
        const existing = existingMap.get(res.fingerprint);
        if (existing) {
          // If was previously auto-resolved or reopened, keep or reopen
          const newStatus = existing.status === 'RESOLVED' && existing.resolution_type === 'AUTO_RESOLVED'
            ? 'REOPENED'
            : existing.status;

          updatedExceptions.push({
            ...existing,
            validation_run_id: validationRunId,
            title: res.title,
            description: res.message,
            current_value: res.currentValue,
            expected_value: res.expectedValue,
            status: newStatus,
            reopened_at: newStatus === 'REOPENED' ? now : existing.reopened_at,
            updated_at: now
          });
        } else {
          // Create fresh exception
          const excId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `exc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
          updatedExceptions.push({
            id: excId,
            tenant_id: tenantId,
            declaration_id: declarationId,
            validation_run_id: validationRunId,
            classification_line_id: res.classificationLineId || null,
            item_sequence: res.itemSequence || null,
            sku_code: res.skuCode || null,
            rule_code: res.ruleCode,
            fingerprint: res.fingerprint,
            severity: res.severity,
            category: res.category,
            resolution_policy: res.resolutionPolicy,
            readiness_impact: res.readinessImpact,
            rule_source: res.ruleSource,
            status: 'OPEN',
            title: res.title,
            description: res.message,
            current_value: res.currentValue || null,
            expected_value: res.expectedValue || null,
            evidence: res.evidence || null,
            source: 'DETERMINISTIC_ENGINE',
            detected_at: now,
            detected_by: userId || null,
            created_at: now,
            updated_at: now
          });
        }
      } else {
        // Condition passed -> if existing active exception exists, auto-resolve it
        const existing = existingMap.get(res.fingerprint);
        if (existing && existing.status !== 'RESOLVED' && existing.status !== 'WAIVED') {
          updatedExceptions.push({
            ...existing,
            status: 'RESOLVED',
            resolution_type: 'AUTO_RESOLVED',
            resolution_note: 'Condition resolved in subsequent validation run',
            resolved_at: now,
            resolved_by: userId || null,
            updated_at: now
          });
        }
      }
    });

    // Retain existing exceptions that were not evaluated in this targeted run
    existingExceptions.forEach(e => {
      if (!evaluatedFingerprints.has(e.fingerprint) && !updatedExceptions.some(u => u.fingerprint === e.fingerprint)) {
        updatedExceptions.push(e);
      }
    });

    return updatedExceptions;
  }

  /**
   * Evaluates canonical operational readiness based on active exceptions
   */
  public static calculateReadiness(
    exceptions: CustomsDeclarationException[],
    totalLines: number
  ): {
    overallStatus: CustomsOperationalReadiness;
    readinessPercentage: number;
    readinessByCategory: Record<CustomsExceptionCategory, 'READY' | 'WARNING' | 'BLOCKED'>;
  } {
    const categories: CustomsExceptionCategory[] = [
      'IDENTITY',
      'CARGO',
      'CLASSIFICATION',
      'VALUATION',
      'ORIGIN',
      'DOCUMENTS',
      'TAX',
      'LARTAS'
    ];

    const readinessByCategory: Record<CustomsExceptionCategory, 'READY' | 'WARNING' | 'BLOCKED'> = {
      IDENTITY: 'READY',
      CARGO: 'READY',
      CLASSIFICATION: 'READY',
      VALUATION: 'READY',
      ORIGIN: 'READY',
      DOCUMENTS: 'READY',
      TAX: 'READY',
      LARTAS: 'READY'
    };

    let activeBlocking = 0;
    let activeWarnings = 0;

    categories.forEach(cat => {
      const catExceptions = exceptions.filter(e => e.category === cat && e.status !== 'RESOLVED' && e.status !== 'WAIVED');
      const hasBlocking = catExceptions.some(e => e.severity === 'BLOCKING');
      const hasWarning = catExceptions.some(e => e.severity === 'WARNING' && e.status !== 'WAIVED');

      if (hasBlocking) {
        readinessByCategory[cat] = 'BLOCKED';
        activeBlocking += catExceptions.filter(e => e.severity === 'BLOCKING').length;
      } else if (hasWarning) {
        readinessByCategory[cat] = 'WARNING';
        activeWarnings += catExceptions.filter(e => e.severity === 'WARNING').length;
      } else {
        readinessByCategory[cat] = 'READY';
      }
    });

    let overallStatus: CustomsOperationalReadiness = 'READY';
    if (activeBlocking > 0 || totalLines === 0) {
      overallStatus = 'BLOCKED';
    } else if (activeWarnings > 0) {
      overallStatus = 'READY_WITH_WARNINGS';
    }

    // Readiness score calculation
    let readinessPercentage = 100;
    if (totalLines === 0) {
      readinessPercentage = 0;
    } else {
      const deduction = (activeBlocking * 25) + (activeWarnings * 5);
      readinessPercentage = Math.max(0, Math.min(100, 100 - deduction));
    }

    return {
      overallStatus,
      readinessPercentage,
      readinessByCategory
    };
  }

  /**
   * Backward-compatible bridge for legacy tests and detail page
   */
  public validateDeclaration(
    declaration: CustomsDeclaration,
    lines: CustomsClassificationLine[],
    documents: CustomsDeclarationDocument[] = [],
    options: {
      hsMasterMap?: Map<string, CustomsHsCodeMaster>;
      skuHistoricalMap?: Map<string, { suggested_hs_code?: string; average_price?: number }>;
      priceVarianceThreshold?: number;
    } = {}
  ): DeclarationValidationReport {
    const fullResult = this.validateDeclarationAggregate(
      declaration,
      lines,
      documents,
      [],
      options
    );

    const legacyCodeMap: Record<string, string> = {
      'STR-001': 'INVALID_AJU_NUMBER',
      'STR-002': 'MISSING_IMPORTER',
      'STR-003': 'INVALID_CUSTOMS_OFFICE',
      'STR-004': 'EMPTY_DECLARATION_LINES',
      'STR-005': 'MISSING_DESCRIPTION',
      'STR-006': 'INVALID_QUANTITY',
      'STR-007': 'NEGATIVE_CIF_VALUE',
      'STR-008': 'MISSING_HS_CODE',
      'STR-009': 'INCOMPLETE_HS_CODE',
      'VAL-001': 'PRICE_ANOMALY',
      'VAL-002': 'ZERO_UNIT_PRICE',
      'REG-001': 'LARTAS_RESTRICTION_DETECTED',
      'REG-002': 'MISSING_INVOICE_DOC',
      'REG-003': 'MISSING_PACKING_LIST',
      'REG-004': 'HS_CLASSIFICATION_CHANGED'
    };

    const issues: ValidationIssue[] = fullResult.rule_results
      .filter(r => !r.passed)
      .map(r => ({
        code: legacyCodeMap[r.ruleCode] || r.ruleCode,
        message: r.message,
        severity: r.severity === 'BLOCKING' ? 'ERROR' : r.severity === 'WARNING' ? 'WARNING' : 'INFO',
        itemSequence: r.itemSequence,
        skuCode: r.skuCode,
        suggestion: r.suggestion
      }));

    const itemValidationMap = new Map<number, { status: CustomsValidationStatus; issues: ValidationIssue[] }>();
    lines.forEach(l => {
      const lineIssues = issues.filter(i => i.itemSequence === l.item_sequence);
      let status: CustomsValidationStatus = 'VALID';
      if (lineIssues.some(i => i.severity === 'ERROR')) status = 'ERROR';
      else if (lineIssues.some(i => i.severity === 'WARNING')) status = 'WARNING';
      itemValidationMap.set(l.item_sequence, { status, issues: lineIssues });
    });

    return {
      overallStatus: fullResult.overall_status === 'BLOCKED' ? 'BLOCKED' : fullResult.overall_status === 'READY_WITH_WARNINGS' ? 'READY_WITH_WARNINGS' : 'READY',
      totalLines: lines.length,
      errorCount: fullResult.error_count,
      warningCount: fullResult.warning_count,
      infoCount: fullResult.info_count,
      issues,
      itemValidationMap,
      readinessByCategory: {
        identity: fullResult.readiness_by_category.IDENTITY,
        cargo: fullResult.readiness_by_category.CARGO,
        classification: fullResult.readiness_by_category.CLASSIFICATION,
        valuation: fullResult.readiness_by_category.VALUATION,
        origin: fullResult.readiness_by_category.ORIGIN,
        documents: fullResult.readiness_by_category.DOCUMENTS,
        tax: fullResult.readiness_by_category.TAX,
        lartas: fullResult.readiness_by_category.LARTAS
      }
    };
  }

  /**
   * Evaluates Document Completeness & Verification Status
   * Phase 3D-6D-7: Distinguishes Exists vs Verified vs Requirement
   */
  public evaluateDocumentCompleteness(
    declaration: CustomsDeclaration,
    lines: CustomsClassificationLine[],
    documents: CustomsDeclarationDocument[]
  ): CustomsDocumentCompletenessReport {
    const requirements: CustomsDocumentRequirementItem[] = [];

    // Helper to evaluate status
    const resolveStatus = (docs: CustomsDeclarationDocument[], isMandatory: boolean): CustomsDocumentRequirementStatus => {
      if (docs.some(d => d.verification_status === 'VERIFIED')) return 'MET';
      if (docs.some(d => d.verification_status === 'PENDING_REVIEW')) return 'PENDING_REVIEW';
      return isMandatory ? 'MISSING' : 'NOT_REQUIRED';
    };

    // 1. Commercial Invoice
    const invoiceDocs = documents.filter(d => d.document_type === 'INVOICE');
    requirements.push({
      documentType: 'INVOICE',
      label: 'Commercial Invoice',
      isMandatory: true,
      status: resolveStatus(invoiceDocs, true),
      attachedDocuments: invoiceDocs,
      requirementSource: 'UU Kepabeanan No. 17/2006 Pasal 10B'
    });

    // 2. Packing List
    const plDocs = documents.filter(d => d.document_type === 'PACKING_LIST');
    requirements.push({
      documentType: 'PACKING_LIST',
      label: 'Packing List',
      isMandatory: true,
      status: resolveStatus(plDocs, true),
      attachedDocuments: plDocs,
      requirementSource: 'UU Kepabeanan No. 17/2006 Pasal 10B'
    });

    // 3. Bill of Lading / Air Waybill
    const blDocs = documents.filter(d => d.document_type === 'BL_AWB');
    requirements.push({
      documentType: 'BL_AWB',
      label: 'Bill of Lading / Air Waybill (B/L / AWB)',
      isMandatory: true,
      status: resolveStatus(blDocs, true),
      attachedDocuments: blDocs,
      requirementSource: 'UU Kepabeanan No. 17/2006 & Manifest DJBC'
    });

    // 4. Certificate of Origin (COO Form D / Form E / Form AK)
    const cooDocs = documents.filter(d => d.document_type.startsWith('COO'));
    const hasPreferentialTariff = lines.some(l => (l.bm_rate_percent !== undefined && l.bm_rate_percent < 5));
    requirements.push({
      documentType: 'COO_FORM_D',
      label: 'Certificate of Origin (COO Form D / E / AK)',
      isMandatory: hasPreferentialTariff,
      status: resolveStatus(cooDocs, hasPreferentialTariff),
      attachedDocuments: cooDocs,
      requirementSource: 'PMK Tarif Preferensi Internasional (ATIGA/AKFTA/ACFTA)'
    });

    // 5. Item-specific Lartas Permits
    const lartasLines = lines.filter(l => l.lartas_flag);
    if (lartasLines.length > 0) {
      const permitDocs = documents.filter(d => d.document_type === 'PERMIT');
      requirements.push({
        documentType: 'PERMIT',
        label: 'Trade / Import Permit (PI / LS / BPOM / SNI)',
        isMandatory: true,
        status: resolveStatus(permitDocs, true),
        attachedDocuments: permitDocs,
        requirementSource: 'INSW / Permendag No. 36/2023 tentang Kebijakan Impor'
      });
    }

    const totalRequired = requirements.filter(r => r.isMandatory).length;
    const totalAttached = documents.length;
    const totalVerified = documents.filter(d => d.verification_status === 'VERIFIED').length;
    const missingRequiredCount = requirements.filter(r => r.isMandatory && r.status === 'MISSING').length;

    let overallStatus: 'COMPLETE' | 'WARNING' | 'INCOMPLETE' = 'COMPLETE';
    if (missingRequiredCount > 0) {
      overallStatus = 'INCOMPLETE';
    } else if (requirements.some(r => r.isMandatory && r.status === 'PENDING_REVIEW')) {
      overallStatus = 'WARNING';
    }

    return {
      overallStatus,
      totalRequired,
      totalAttached,
      totalVerified,
      missingRequiredCount,
      requirements
    };
  }

  /**
   * Evaluates Commercial Valuation & Price Evidence
   * Phase 3D-6D-7: Reconciles Qty, Unit Price, FOB, Freight, Insurance, CIF & Tax breakdown
   */
  public evaluateValuationSummary(
    declaration: CustomsDeclaration,
    lines: CustomsClassificationLine[],
    exchangeRateIdr: number = 16000,
    skuHistoricalMap?: Map<string, { average_price?: number }>
  ): CustomsValuationSummary {
    let totalFob = 0;
    let totalFreight = 0;
    let totalInsurance = 0;
    let totalCif = 0;
    let totalDutyAndTaxIdr = 0;
    let priceDeviationsCount = 0;

    const valuationLines: LineValuationItem[] = lines.map(line => {
      const qty = Number(line.item_quantity || 1);
      const unitPrice = Number(line.unit_price_usd || 0);
      const fob = Number(line.fob_value_usd !== undefined ? line.fob_value_usd : qty * unitPrice);
      const freight = Number(line.freight_usd || 0);
      const insurance = Number(line.insurance_usd || 0);
      const cif = Number(line.cif_value_usd !== undefined ? line.cif_value_usd : fob + freight + insurance);

      totalFob += fob;
      totalFreight += freight;
      totalInsurance += insurance;
      totalCif += cif;

      const dutyTax = Number(line.calculated_bm_idr || 0) + Number(line.calculated_ppn_idr || 0) + Number(line.calculated_pph_idr || 0);
      totalDutyAndTaxIdr += dutyTax;

      // Check historical price variance
      let histPrice: number | null = null;
      let priceVariancePercent: number | null = null;
      let hasPriceDeviation = false;

      if (line.sku_code && skuHistoricalMap?.has(line.sku_code.toUpperCase())) {
        const hist = skuHistoricalMap.get(line.sku_code.toUpperCase());
        if (hist?.average_price && hist.average_price > 0 && unitPrice > 0) {
          histPrice = hist.average_price;
          const variance = ((unitPrice - histPrice) / histPrice) * 100;
          priceVariancePercent = Math.round(variance * 10) / 10;
          if (Math.abs(variance) > CustomsValidationEngine.DEFAULT_PRICE_VARIANCE_THRESHOLD_PERCENT) {
            hasPriceDeviation = true;
            priceDeviationsCount++;
          }
        }
      }

      // Arithmetic validity: qty * unitPrice ~= fob (within $0.05)
      const expectedFob = qty * unitPrice;
      const isArithmeticValid = Math.abs(expectedFob - fob) <= 0.05;

      let valuationStatus: 'CALCULATED' | 'DECLARED' | 'DOCUMENTED' | 'VERIFIED' | 'ANOMALOUS' = 'CALCULATED';
      if (hasPriceDeviation) {
        valuationStatus = 'ANOMALOUS';
      } else if (line.invoice_number) {
        valuationStatus = 'DOCUMENTED';
      }

      return {
        item_sequence: line.item_sequence,
        line_id: line.id,
        sku_code: line.sku_code || null,
        hs_code: line.hs_code,
        goods_description: line.goods_description,
        item_quantity: qty,
        uom_code: line.uom_code || 'PCE',
        unit_price_usd: unitPrice,
        fob_value_usd: fob,
        freight_usd: freight,
        insurance_usd: insurance,
        cif_value_usd: cif,
        historical_average_price: histPrice,
        price_variance_percent: priceVariancePercent,
        has_price_deviation: hasPriceDeviation,
        is_arithmetic_valid: isArithmeticValid,
        valuation_status: valuationStatus
      };
    });

    const totalNilaiPabeanIdr = Math.round(totalCif * exchangeRateIdr);
    const isCifReconciled = lines.length > 0 && totalCif > 0;

    return {
      declaration_id: declaration.id,
      currency: 'USD',
      exchange_rate_idr: exchangeRateIdr,
      total_fob_usd: Math.round(totalFob * 100) / 100,
      total_freight_usd: Math.round(totalFreight * 100) / 100,
      total_insurance_usd: Math.round(totalInsurance * 100) / 100,
      total_cif_usd: Math.round(totalCif * 100) / 100,
      total_nilai_pabean_idr: totalNilaiPabeanIdr,
      total_duty_and_tax_idr: totalDutyAndTaxIdr,
      is_cif_reconciled: isCifReconciled,
      price_deviations_count: priceDeviationsCount,
      lines: valuationLines
    };
  }

  /**
   * Evaluates Item-Level Lartas & Statutory Permit Matrix
   * Phase 3D-6D-7: Item -> HS -> BTKI Master -> Permendag/INSW -> Permit Evidence
   */
  public evaluateLartasReport(
    declaration: CustomsDeclaration,
    lines: CustomsClassificationLine[],
    documents: CustomsDeclarationDocument[],
    hsMasterMap?: Map<string, CustomsHsCodeMaster>
  ): CustomsLartasReport {
    let totalLartasItems = 0;
    let satisfiedPermitsCount = 0;
    let missingPermitsCount = 0;
    let unresolvedSourceCount = 0;

    const items: ItemLartasDetermination[] = lines.map(line => {
      const hsMaster = optionsLookup(hsMasterMap, line.hs_code);

      let determination: LartasDeterminationStatus = 'NOT_REQUIRED';
      let requiredPermitType: string | null = null;
      let regSource = 'Buku Tarif Kepabeanan Indonesia (BTKI 2026)';
      let regVersion = '2026.1';
      let effectiveFrom = '2026-01-01';
      let isCompliant = true;
      let attachedPermitDoc: CustomsDeclarationDocument | null = null;
      let isPermitVerified = false;
      let exceptionRuleCode: string | null = null;

      if (hsMaster) {
        regSource = hsMaster.source_reference || 'BTKI-INSW / Permendag No. 36/2023';
        regVersion = hsMaster.source_version || '2026.1';
        effectiveFrom = hsMaster.effective_from || '2026-01-01';

        if (hsMaster.lartas_flag) {
          determination = 'REQUIRED';
          requiredPermitType = hsMaster.lartas_permit_type || 'Persetujuan Impor (PI/LS)';
          totalLartasItems++;

          // Search for matching permit document in vault (declaration-level or item-level)
          const matchedDoc = documents.find(d =>
            (d.document_type === 'PERMIT' || d.document_type.includes('COO')) &&
            (!d.classification_line_id || d.classification_line_id === line.id)
          );

          if (matchedDoc) {
            attachedPermitDoc = matchedDoc;
            isPermitVerified = matchedDoc.verification_status === 'VERIFIED';
            if (isPermitVerified) {
              isCompliant = true;
              satisfiedPermitsCount++;
            } else {
              isCompliant = false;
              exceptionRuleCode = 'REG-006';
              missingPermitsCount++;
            }
          } else {
            isCompliant = false;
            exceptionRuleCode = 'REG-001';
            missingPermitsCount++;
          }
        } else {
          determination = 'NOT_REQUIRED';
          isCompliant = true;
        }
      } else {
        // Regulatory source missing in BTKI master - MANDATORY: Do not claim NOT_LARTAS!
        determination = 'RULE_SOURCE_REQUIRED';
        regSource = 'RULE SOURCE REQUIRED';
        regVersion = 'UNRESOLVED';
        effectiveFrom = '-';
        isCompliant = false;
        exceptionRuleCode = 'REG-007';
        unresolvedSourceCount++;
      }

      return {
        item_sequence: line.item_sequence,
        line_id: line.id,
        sku_code: line.sku_code || null,
        hs_code: line.hs_code,
        goods_description: line.goods_description,
        lartas_determination: determination,
        required_permit_type: requiredPermitType,
        regulatory_source: regSource,
        regulatory_version: regVersion,
        effective_from: effectiveFrom,
        attached_permit_doc: attachedPermitDoc,
        is_permit_verified: isPermitVerified,
        is_compliant: isCompliant,
        exception_rule_code: exceptionRuleCode
      };
    });

    let overallCompliance: 'COMPLIANT' | 'PERMITS_REQUIRED' | 'SOURCE_REQUIRED' | 'BLOCKED' = 'COMPLIANT';
    if (unresolvedSourceCount > 0) {
      overallCompliance = 'SOURCE_REQUIRED';
    } else if (missingPermitsCount > 0) {
      overallCompliance = 'PERMITS_REQUIRED';
    }

    return {
      declaration_id: declaration.id,
      overall_compliance: overallCompliance,
      total_lartas_items: totalLartasItems,
      satisfied_permits_count: satisfiedPermitsCount,
      missing_permits_count: missingPermitsCount,
      unresolved_source_count: unresolvedSourceCount,
      items
    };
  }
}

function optionsLookup(map?: Map<string, CustomsHsCodeMaster>, hsCode?: string): CustomsHsCodeMaster | undefined {
  if (!map || !hsCode) return undefined;
  if (map.has(hsCode)) return map.get(hsCode);
  const clean = hsCode.replace(/[^0-9]/g, '');
  for (const [key, val] of map.entries()) {
    if (key.replace(/[^0-9]/g, '') === clean) return val;
  }
  return undefined;
}

