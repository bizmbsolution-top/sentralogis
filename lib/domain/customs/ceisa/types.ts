/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * Module: CEISA 4.0 Preparation & Compliance Gateway
 * File: lib/domain/customs/ceisa/types.ts
 */

import {
  CustomsDeclaration,
  CustomsClassificationLine,
  CustomsDeclarationDocument,
  CustomsOperationalReadiness
} from '../types';

export type CeisaPreparationStatus =
  | 'DRAFT'
  | 'VALIDATING'
  | 'INVALID'
  | 'READY_FOR_REVIEW'
  | 'READY_TO_TRANSMIT'
  | 'SUPERSEDED';

export type CeisaArtifactFormat = 'XML' | 'EDI' | 'JSON';

export type CeisaValidationLayer = 'DOMAIN' | 'SCHEMA' | 'BUSINESS_RULE';

export type CeisaValidationSeverity = 'BLOCKING' | 'WARNING' | 'INFO';

export interface CeisaValidationIssue {
  layer: CeisaValidationLayer;
  ruleCode: string;
  severity: CeisaValidationSeverity;
  fieldPath: string;
  message: string;
  expectedValue?: string;
  actualValue?: string;
  resolutionHint?: string;
}

export interface CeisaFieldMappingItem {
  canonicalField: string;
  ceisaField: string;
  sourcePath: string;
  dataType: 'STRING' | 'NUMBER' | 'DATE' | 'CODE' | 'BOOLEAN';
  transformationType: 'DIRECT' | 'ISO_CODE' | 'DECIMAL_ROUND' | 'DATE_FORMAT' | 'COMPUTED' | 'FALLBACK';
  value: string | number | boolean | null;
  status: 'VALID' | 'WARNING' | 'MISSING' | 'INVALID';
  notes?: string;
}

export interface CanonicalCustomsPayload {
  declaration: CustomsDeclaration;
  lines: CustomsClassificationLine[];
  documents: CustomsDeclarationDocument[];
  valuation: {
    totalFobUsd: number;
    totalFreightUsd: number;
    totalInsuranceUsd: number;
    totalCifUsd: number;
    kursPajakKmkIdr: number;
    totalNilaiPabeanIdr: number;
    totalBeaMasukIdr: number;
    totalNilaiImporIdr: number;
    totalPpnIdr: number;
    totalPph22Idr: number;
    totalPungutanPabeanIdr: number;
  };
  parties: {
    importerName: string;
    importerTaxId: string;
    importerAddress: string;
    ppjkName?: string;
    ppjkTaxId?: string;
    supplierName?: string;
    supplierCountry?: string;
  };
  transport: {
    customsOfficeCode: string;
    transportMode: string;
    vesselName?: string;
    voyageFlightNumber?: string;
    loadingPortCode?: string;
    dischargePortCode?: string;
  };
}

export interface CeisaPreparationArtifact {
  format: CeisaArtifactFormat;
  content: string;
  checksumSha256: string;
  sizeBytes: number;
  lineCount: number;
  generatedAt: string;
  schemaVersion: string;
  messageType: string;
}

export interface CeisaPreparationRecord {
  id: string;
  tenant_id: string;
  declaration_id: string;
  version_no: number;
  message_type: string;
  schema_version: string;
  status: CeisaPreparationStatus;
  artifact_format: CeisaArtifactFormat;
  artifact_content?: string | null;
  artifact_checksum?: string | null;
  artifact_size_bytes?: number | null;
  item_count: number;
  blocking_errors_count: number;
  warnings_count: number;
  metadata: Record<string, any>;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CeisaPreparationSummary {
  preparation: CeisaPreparationRecord;
  readinessStatus: 'BLOCKED' | 'READY_FOR_REVIEW' | 'READY_TO_TRANSMIT';
  customsDomainReadiness: CustomsOperationalReadiness;
  validationIssues: CeisaValidationIssue[];
  fieldMappings: CeisaFieldMappingItem[];
  artifact?: CeisaPreparationArtifact | null;
  humanReviewChecklist: Array<{
    checkpoint: string;
    category: 'HEADER' | 'VALUATION' | 'LARTAS' | 'DOCUMENTS' | 'SCHEMA';
    status: 'VERIFIED' | 'ATTENTION_REQUIRED' | 'BLOCKED';
    notes: string;
  }>;
}
