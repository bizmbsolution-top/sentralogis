/**
 * Sentralogis — Phase 5C-6
 * lib/pricing/migration-types.ts
 *
 * Legacy Pricing Migration types (ADR-057 through ADR-066).
 *
 * Core principle: NEVER FABRICATE HISTORICAL TRUTH.
 * If metadata cannot be deterministically established, classify as MIGRATION_EXCEPTION.
 */

// ============================================================================
// MIGRATION CLASSIFICATION
// ============================================================================

export type MigrationClassification =
  | 'MIGRATE'
  | 'MIGRATE_WITH_EXCEPTION'
  | 'PRESERVE_READ_ONLY'
  | 'ADAPTER_ONLY'
  | 'HISTORICAL_ONLY'
  | 'NOT_MIGRATABLE';

// ============================================================================
// MIGRATION EXCEPTION TYPE
// ============================================================================

export type MigrationExceptionType =
  | 'UNKNOWN_CURRENCY'
  | 'UNKNOWN_UOM'
  | 'AMBIGUOUS_BUY_SELL'
  | 'AMBIGUOUS_EFFECTIVE_PERIOD'
  | 'MISSING_RATE_LINEAGE'
  | 'MISSING_QUOTE_LINEAGE'
  | 'MISSING_OVERRIDE_EVIDENCE'
  | 'FINANCIAL_DEPENDENCY'
  | 'DUPLICATE_SOURCE_RECORD'
  | 'INVALID_HISTORICAL_DATA';

// ============================================================================
// MIGRATION EXCEPTION
// ============================================================================

export interface MigrationException {
  id: string;
  sourceTable: string;
  sourceRecordId: string;
  tenantId: string;
  exceptionType: MigrationExceptionType;
  reason: string;
  sourceEvidence: Record<string, unknown>;
  migrationStatus: 'PENDING' | 'RESOLVED' | 'WAIVED';
  createdAt: string;
}

// ============================================================================
// MIGRATION RESULT
// ============================================================================

export interface MigrationResult {
  sourceTable: string;
  sourceRecordId: string;
  canonicalTable: string;
  canonicalRecordId: string | null;
  classification: MigrationClassification;
  exceptionType: MigrationExceptionType | null;
  tenantId: string;
}

// ============================================================================
// DRY-RUN REPORT
// ============================================================================

export interface DryRunReport {
  discovered: number;
  migratable: number;
  exceptions: number;
  blocked: number;
  byTenant: Record<string, { discovered: number; migratable: number; exceptions: number; blocked: number }>;
}

// ============================================================================
// RECONCILIATION REPORT
// ============================================================================

export interface ReconciliationReport {
  sourceCount: number;
  canonicalCount: number;
  exceptionCount: number;
  differences: ReconciliationDifference[];
}

export interface ReconciliationDifference {
  sourceTable: string;
  sourceRecordId: string;
  field: string;
  sourceValue: unknown;
  canonicalValue: unknown;
  explanation: string;
}

// ============================================================================
// ADR-088 WAVE 1 — FW_PRICE_MASTER DRY-RUN ITEM
// ============================================================================

export interface FwPriceMasterDryRunItem {
  sourceRecordId: string;
  rateCode: string;
  capabilityType: string;
  rateDescription: string;
  status: string;
  items: Array<{
    chargeBasis: string;
    unitOfMeasure: string;
    unitRate: number | null;
    minCharge: number | null;
    currency: string;
    applicabilityConditions: Record<string, unknown>;
    skip?: boolean;
    skipReason?: string;
  }>;
  warnings: string[];
  exceptions: string[];
}
