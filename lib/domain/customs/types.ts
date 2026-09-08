/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * File: lib/domain/customs/types.ts
 * Description: Canonical TypeScript domain types for Customs Declaration, SKU Intelligence & PPJK Workbench
 */

// ----------------------------------------------------------------------------
// ENUMS & VALUE OBJECTS
// ----------------------------------------------------------------------------

export type CustomsDeclarationType =
  | 'PIB_IMPORT'
  | 'PEB_EXPORT'
  | 'BC23_TPB'
  | 'BC16_PLB'
  | 'PPFTZ_FTZ';

export type CustomsChannelType =
  | 'GREEN'
  | 'YELLOW'
  | 'RED'
  | 'MITA_NON_PRIORITY'
  | 'AEO_PRIORITY';

export type CustomsDeclarationStatus =
  | 'DRAFT'
  | 'DOCUMENTS_PENDING'
  | 'READY_FOR_CLASSIFICATION'
  | 'CLASSIFIED'
  | 'READY_FOR_SUBMISSION'
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'CHANNEL_ASSIGNED'
  | 'INSPECTION_REQUIRED'
  | 'DOCUMENT_REVIEW'
  | 'APPROVED'
  | 'SPPB_PENDING'
  | 'RELEASED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'ON_HOLD'
  | 'CANCELLED';

export type CustomsValidationStatus = 'VALID' | 'WARNING' | 'ERROR' | 'BLOCKED';

export type CustomsExceptionSeverity = 'BLOCKING' | 'WARNING' | 'INFORMATIONAL';

export type CustomsExceptionCategory =
  | 'IDENTITY'
  | 'CARGO'
  | 'CLASSIFICATION'
  | 'VALUATION'
  | 'ORIGIN'
  | 'DOCUMENTS'
  | 'TAX'
  | 'LARTAS';

export type CustomsExceptionStatus =
  | 'OPEN'
  | 'ACKNOWLEDGED'
  | 'RESOLVED'
  | 'WAIVED'
  | 'REJECTED'
  | 'REOPENED';

export type CustomsResolutionPolicy =
  | 'FIX_REQUIRED'
  | 'AUTHORIZED_OVERRIDE'
  | 'APPROVAL_REQUIRED'
  | 'SYSTEM_ONLY';

export type CustomsReadinessImpact =
  | 'BLOCKS_READINESS'
  | 'WARNING_ALLOWED'
  | 'INFORMATIONAL_ONLY';

export type CustomsValidationTriggerType =
  | 'IMPORT'
  | 'MANUAL'
  | 'ITEM_CHANGE'
  | 'DOCUMENT_CHANGE'
  | 'EXCEPTION_RESOLUTION'
  | 'SYSTEM';

export type CustomsOperationalReadiness =
  | 'NOT_READY'
  | 'READY_WITH_WARNINGS'
  | 'READY'
  | 'BLOCKED';

export type CustomsDocumentType =
  | 'INVOICE'
  | 'PACKING_LIST'
  | 'BL_AWB'
  | 'COO_FORM_D'
  | 'COO_FORM_E'
  | 'COO_FORM_AK'
  | 'SPEC'
  | 'MSDS'
  | 'PERMIT';

export type CustomsDocumentVerificationStatus =
  | 'PENDING_REVIEW'
  | 'VERIFIED'
  | 'REJECTED';

// ----------------------------------------------------------------------------
// ENTITIES
// ----------------------------------------------------------------------------

export interface CustomsDeclaration {
  id: string;
  tenant_id: string;
  declaration_number: string; // Nomor Pengajuan (26-digit format: AJU-040300-20260826-000123)
  service_request_id?: string | null;
  work_order_id?: string | null;
  shipment_id?: string | null;
  execution_leg_id?: string | null;
  job_order_id?: string | null;
  importer_id: string;
  ppjk_id?: string | null;
  declaration_type: CustomsDeclarationType;
  customs_office_code: string; // e.g. 040300 (Tanjung Priok), 040400 (Patimban)
  billing_code?: string | null;
  total_duty_and_tax: number;
  ntpn_payment_ref?: string | null;
  paid_at?: string | null;
  channel?: CustomsChannelType | null;
  sppb_number?: string | null;
  sppb_date?: string | null;
  status: CustomsDeclarationStatus;
  version_no: number;
  created_at: string;
  updated_at: string;
}

export interface CustomsClassificationLine {
  id: string;
  tenant_id: string;
  declaration_id: string;
  item_sequence: number;
  hs_code: string;
  goods_description: string;
  cif_value_usd: number;
  bm_rate_percent: number;
  ppn_rate_percent: number;
  pph_rate_percent: number;
  calculated_bm_idr: number;
  calculated_ppn_idr: number;
  calculated_pph_idr: number;
  created_at: string;

  // Expanded PPJK Workbench & SKU attributes
  sku_code?: string | null;
  brand?: string | null;
  model?: string | null;
  item_quantity?: number;
  uom_code?: string;
  unit_price_usd?: number;
  fob_value_usd?: number;
  freight_usd?: number;
  insurance_usd?: number;
  currency?: string;
  country_of_origin?: string;
  manufacturer_name?: string | null;
  supplier_name?: string | null;
  invoice_number?: string | null;
  invoice_line_no?: number | null;

  // Snapshot attributes for historical preservation
  hs_master_id?: string | null;
  hs_code_snapshot?: string | null;
  hs_description_snapshot?: string | null;
  bm_rate_snapshot?: number | null;
  ppn_rate_snapshot?: number | null;
  pph_rate_snapshot?: number | null;

  // Intelligence & Validation attributes
  classification_confidence?: number;
  classification_source?: string;
  classification_rationale?: string | null;
  validation_status?: CustomsValidationStatus;
  validation_error_count?: number;
  validation_warning_count?: number;
  validation_errors?: Array<{ code: string; message: string; severity: 'ERROR' | 'WARNING' | 'INFO' }>;
  price_anomaly_flag?: boolean;
  lartas_flag?: boolean;
}

export interface CustomsHsCodeMaster {
  id: string;
  hs_code: string;
  description_id: string;
  description_en?: string | null;
  chapter: string;
  heading: string;
  subheading: string;
  bm_rate: number;
  ppn_rate: number;
  pph_rate: number;
  lartas_flag: boolean;
  lartas_permit_type?: string | null;
  uom_primary: string;
  source_reference?: string;
  source_version?: string;
  effective_from: string;
  effective_to?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomsSkuIntelligence {
  id: string;
  tenant_id: string;
  importer_id: string;
  customer_id?: string | null;
  sku_code: string;
  normalized_description: string;
  original_description?: string | null;
  brand?: string | null;
  model?: string | null;
  manufacturer?: string | null;
  supplier?: string | null;
  country_of_origin: string;
  preferred_uom: string;
  suggested_hs_code?: string | null;
  classification_confidence: number;
  classification_status: string;
  classification_rationale?: string | null;
  classification_source: string;
  last_used_declaration_id?: string | null;
  average_unit_price_usd?: number | null;
  total_declarations_count: number;
  last_reviewed_at?: string | null;
  last_reviewed_by?: string | null;
  effective_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CustomsSkuClassificationHistory {
  id: string;
  tenant_id: string;
  importer_id: string;
  sku_intelligence_id?: string | null;
  declaration_id?: string | null;
  declaration_number?: string | null;
  sku_code: string;
  hs_code: string;
  goods_description?: string | null;
  unit_price_usd?: number | null;
  currency?: string;
  country_of_origin?: string;
  customs_channel?: string | null;
  recorded_at: string;
}

export interface CustomsDeclarationDocument {
  id: string;
  tenant_id: string;
  declaration_id: string;
  classification_line_id?: string | null;
  item_sequence?: number | null;
  document_type: CustomsDocumentType | string;
  document_number?: string | null;
  issue_date?: string | null;
  expiry_date?: string | null;
  issuer_name?: string | null;
  file_reference?: string | null;
  file_name?: string | null;
  mime_type?: string | null;
  file_size_bytes?: number | null;
  extracted_items_count?: number;
  verification_status: CustomsDocumentVerificationStatus | string;
  status?: 'DRAFT' | 'UPLOADED' | 'VERIFIED' | 'REJECTED' | 'EXPIRED' | 'SUPERSEDED' | string;
  verified_by?: string | null;
  verified_at?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomsItemAuditLog {
  id: string;
  tenant_id: string;
  declaration_id: string;
  classification_line_id?: string | null;
  field_name: string;
  old_value?: any;
  new_value?: any;
  change_reason?: string | null;
  changed_by?: string | null;
  changed_by_name?: string | null;
  changed_at: string;
  source: string;
}

// ----------------------------------------------------------------------------
// TAX CALCULATION CONTEXT & RESULTS
// ----------------------------------------------------------------------------

export interface CustomsTaxCalculationContext {
  cifValueUsd: number;
  exchangeRateIdr: number; // Kurs Pajak / KMK Rate
  bmRatePercent: number; // Bea Masuk %
  ppnRatePercent: number; // PPN % (Default: 11%)
  pphRatePercent: number; // PPh Pasal 22 Import % (API/Non-API, e.g. 2.5% or 7.5%)
  hasPreferentialTariff?: boolean; // Form D, E, AK, etc.
}

export interface CustomsTaxResult {
  nilaiPabeanIdr: number; // CIF in USD * Exchange Rate
  beaMasukIdr: number; // Nilai Pabean * BM %
  nilaiImporIdr: number; // Nilai Pabean + Bea Masuk (Tax Base for PPN & PPh)
  ppnIdr: number; // Nilai Impor * PPN %
  pph22Idr: number; // Nilai Impor * PPh %
  totalPajakIdr: number; // Bea Masuk + PPN + PPh 22
}

// ----------------------------------------------------------------------------
// DTOs & AGGREGATE PROJECTION
// ----------------------------------------------------------------------------

export interface CreateClassificationLineDTO {
  item_sequence?: number;
  hs_code: string;
  goods_description: string;
  cif_value_usd: number;
  bm_rate_percent?: number;
  ppn_rate_percent?: number;
  pph_rate_percent?: number;

  // Optional extended attributes
  sku_code?: string;
  brand?: string;
  model?: string;
  item_quantity?: number;
  uom_code?: string;
  unit_price_usd?: number;
  fob_value_usd?: number;
  freight_usd?: number;
  insurance_usd?: number;
  currency?: string;
  country_of_origin?: string;
  manufacturer_name?: string;
  supplier_name?: string;
  invoice_number?: string;
  invoice_line_no?: number;
  classification_source?: string;
  classification_rationale?: string;
}

export interface CreateDeclarationDTO {
  tenant_id: string;
  declaration_type?: CustomsDeclarationType;
  customs_office_code: string;
  importer_id: string;
  ppjk_id?: string;
  work_order_id?: string;
  service_request_id?: string;
  shipment_id?: string;
  execution_leg_id?: string;
  job_order_id?: string;
  classification_lines?: CreateClassificationLineDTO[];
  exchange_rate_idr?: number;
}

export interface CustomsAggregate {
  declaration: CustomsDeclaration;
  classification_lines: CustomsClassificationLine[];
  documents?: CustomsDeclarationDocument[];
  summary: {
    total_lines: number;
    total_cif_usd: number;
    total_bm_idr: number;
    total_ppn_idr: number;
    total_pph_idr: number;
    total_tax_payable_idr: number;
    channel: CustomsChannelType | null;
    is_released: boolean;
  };
}

// ----------------------------------------------------------------------------
// PHASE 3D-6D-6: VALIDATION ENGINE & EXCEPTION REGISTRY ENTITIES
// ----------------------------------------------------------------------------

export interface CustomsDeclarationValidationRun {
  id: string;
  tenant_id: string;
  declaration_id: string;
  overall_status: CustomsOperationalReadiness;
  rule_set_version: string;
  engine_version: string;
  trigger_type: CustomsValidationTriggerType;
  triggered_by?: string | null;
  total_lines: number;
  error_count: number;
  warning_count: number;
  info_count: number;
  execution_duration_ms: number;
  summary_json?: Record<string, any>;
  validated_at: string;
}

export interface CustomsDeclarationException {
  id: string;
  tenant_id: string;
  declaration_id: string;
  validation_run_id?: string | null;
  classification_line_id?: string | null;
  item_sequence?: number | null;
  sku_code?: string | null;
  rule_code: string;
  fingerprint: string;
  severity: CustomsExceptionSeverity;
  category: CustomsExceptionCategory;
  resolution_policy: CustomsResolutionPolicy;
  readiness_impact: CustomsReadinessImpact;
  rule_source?: string;
  status: CustomsExceptionStatus;
  title: string;
  description: string;
  current_value?: string | null;
  expected_value?: string | null;
  evidence?: Record<string, any> | null;
  source: 'DETERMINISTIC_ENGINE' | 'SKU_INTELLIGENCE' | 'MANUAL_AUDIT';
  detected_at: string;
  detected_by?: string | null;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  resolved_at?: string | null;
  resolved_by?: string | null;
  resolution_type?: 'DATA_CORRECTED' | 'DOCUMENT_ATTACHED' | 'CLASSIFICATION_OVERRIDDEN' | 'MANUALLY_WAIVED' | 'AUTO_RESOLVED' | null;
  resolution_note?: string | null;
  reopened_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ValidationRuleDefinition {
  ruleCode: string;
  name: string;
  category: CustomsExceptionCategory;
  defaultSeverity: CustomsExceptionSeverity;
  resolutionPolicy: CustomsResolutionPolicy;
  readinessImpact: CustomsReadinessImpact;
  ruleSource: string;
  description: string;
}

export interface ValidationRuleResult {
  ruleCode: string;
  passed: boolean;
  severity: CustomsExceptionSeverity;
  category: CustomsExceptionCategory;
  resolutionPolicy: CustomsResolutionPolicy;
  readinessImpact: CustomsReadinessImpact;
  ruleSource: string;
  title: string;
  message: string;
  itemSequence?: number;
  classificationLineId?: string;
  skuCode?: string;
  currentValue?: string;
  expectedValue?: string;
  evidence?: Record<string, any>;
  fingerprint: string;
  suggestion?: string;
}

export interface CustomsValidationResult {
  validation_run_id: string;
  declaration_id: string;
  rule_set_version: string;
  engine_version: string;
  trigger_type: CustomsValidationTriggerType;
  overall_status: CustomsOperationalReadiness;
  total_rules_evaluated: number;
  total_passed: number;
  total_failed: number;
  error_count: number;
  warning_count: number;
  info_count: number;
  rule_results: ValidationRuleResult[];
  active_exceptions: CustomsDeclarationException[];
  readiness_by_category: Record<CustomsExceptionCategory, 'READY' | 'WARNING' | 'BLOCKED'>;
  readiness_percentage: number;
  validated_at: string;
  execution_duration_ms: number;
}

export interface AcknowledgeExceptionDTO {
  exception_id: string;
}

export interface ResolveExceptionDTO {
  exception_id: string;
  resolution_type: 'DATA_CORRECTED' | 'DOCUMENT_ATTACHED' | 'CLASSIFICATION_OVERRIDDEN' | 'MANUALLY_WAIVED';
  resolution_note?: string;
  override_data?: Record<string, any>;
}

export interface WaiveExceptionDTO {
  exception_id: string;
  justification_reason: string;
}

// ----------------------------------------------------------------------------
// PHASE 3D-6D-7: EVIDENCE, VALUATION & LARTAS INTERFACES
// ----------------------------------------------------------------------------

export type CustomsDocumentRequirementStatus =
  | 'MET'
  | 'MISSING'
  | 'PENDING_REVIEW'
  | 'EXPIRED'
  | 'NOT_REQUIRED';

export interface CustomsDocumentRequirementItem {
  documentType: CustomsDocumentType | string;
  label: string;
  isMandatory: boolean;
  status: CustomsDocumentRequirementStatus;
  attachedDocuments: CustomsDeclarationDocument[];
  requirementSource: string;
  itemSequence?: number;
  skuCode?: string;
}

export interface CustomsDocumentCompletenessReport {
  overallStatus: 'COMPLETE' | 'WARNING' | 'INCOMPLETE';
  totalRequired: number;
  totalAttached: number;
  totalVerified: number;
  missingRequiredCount: number;
  requirements: CustomsDocumentRequirementItem[];
}

export interface LineValuationItem {
  item_sequence: number;
  line_id: string;
  sku_code?: string | null;
  hs_code: string;
  goods_description: string;
  item_quantity: number;
  uom_code: string;
  unit_price_usd: number;
  fob_value_usd: number;
  freight_usd: number;
  insurance_usd: number;
  cif_value_usd: number;
  historical_average_price?: number | null;
  price_variance_percent?: number | null;
  has_price_deviation: boolean;
  is_arithmetic_valid: boolean;
  evidence_notes?: string | null;
  valuation_status: 'CALCULATED' | 'DECLARED' | 'DOCUMENTED' | 'VERIFIED' | 'ANOMALOUS';
}

export interface CustomsValuationSummary {
  declaration_id: string;
  currency: string;
  exchange_rate_idr: number;
  total_fob_usd: number;
  total_freight_usd: number;
  total_insurance_usd: number;
  total_cif_usd: number;
  total_nilai_pabean_idr: number;
  total_duty_and_tax_idr: number;
  is_cif_reconciled: boolean;
  price_deviations_count: number;
  lines: LineValuationItem[];
}

export type LartasDeterminationStatus =
  | 'REQUIRED'
  | 'NOT_REQUIRED'
  | 'UNKNOWN'
  | 'RULE_SOURCE_REQUIRED'
  | 'REVIEW_REQUIRED';

export interface ItemLartasDetermination {
  item_sequence: number;
  line_id: string;
  sku_code?: string | null;
  hs_code: string;
  goods_description: string;
  lartas_determination: LartasDeterminationStatus;
  required_permit_type?: string | null;
  regulatory_source: string;
  regulatory_version: string;
  effective_from: string;
  attached_permit_doc?: CustomsDeclarationDocument | null;
  is_permit_verified: boolean;
  is_compliant: boolean;
  exception_rule_code?: string | null;
}

export interface CustomsLartasReport {
  declaration_id: string;
  overall_compliance: 'COMPLIANT' | 'PERMITS_REQUIRED' | 'SOURCE_REQUIRED' | 'BLOCKED';
  total_lartas_items: number;
  satisfied_permits_count: number;
  missing_permits_count: number;
  unresolved_source_count: number;
  items: ItemLartasDetermination[];
}

