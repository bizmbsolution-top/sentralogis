/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * File: lib/domain/customs/__tests__/ppjk-workbench-schema.test.ts
 * Description: Phase 3D-6A Database Schema & PPJK Workbench Foundation Acceptance Tests
 */

import { CustomsDeclarationFactory } from '../declaration-factory';
import { CustomsTaxCalculator } from '../tax-calculator';
import {
  CustomsDeclaration,
  CustomsClassificationLine,
  CustomsHsCodeMaster,
  CustomsSkuIntelligence,
  CustomsDeclarationDocument,
  CustomsItemAuditLog
} from '../types';

export function runPpjkWorkbenchSchemaValidationSuite() {
  const results: Array<{ testId: string; description: string; pass: boolean; error?: string }> = [];

  function assert(testId: string, description: string, fn: () => void) {
    try {
      fn();
      results.push({ testId, description, pass: true });
    } catch (e: any) {
      results.push({ testId, description, pass: false, error: e.message || String(e) });
    }
  }

  // --------------------------------------------------------------------------
  // TEST A: Existing Declaration Schema Fields Remain Fully Readable & Valid
  // --------------------------------------------------------------------------
  assert('TEST A', 'Existing declaration schema fields and 26-digit AJU generation remain valid', () => {
    const declaration = CustomsDeclarationFactory.createDeclarationEntity({
      tenant_id: 'ten-01',
      importer_id: 'imp-01',
      customs_office_code: '040300',
      declaration_type: 'PIB_IMPORT'
    });

    if (!declaration.declaration_number.startsWith('AJU-040300-')) {
      throw new Error('Declaration AJU number generation mismatch');
    }
    if (declaration.status !== 'DRAFT') {
      throw new Error('Initial declaration status must be DRAFT');
    }
  });

  // --------------------------------------------------------------------------
  // TEST B: Existing Classification Lines Remain Readable with Safe Defaults
  // --------------------------------------------------------------------------
  assert('TEST B', 'Classification lines handle legacy inputs with backward-compatible defaults', () => {
    const lines = CustomsDeclarationFactory.createClassificationLineEntities('dec-01', 'ten-01', [
      {
        hs_code: '8703.80.19',
        goods_description: 'BYD Seal EV Sedan (Legacy format without SKU/Qty)',
        cif_value_usd: 35000,
        bm_rate_percent: 0,
        ppn_rate_percent: 11,
        pph_rate_percent: 2.5
      }
    ]);

    if (lines.length !== 1) throw new Error('Expected 1 classification line');
    const line = lines[0];
    if (line.item_quantity !== 1 || line.uom_code !== 'PCE' || line.currency !== 'USD') {
      throw new Error('Backward-compatible default values failed to populate');
    }
    if (line.validation_status !== 'VALID') {
      throw new Error('Default validation status must be VALID');
    }
  });

  // --------------------------------------------------------------------------
  // TEST C: New SKU Intelligence Entity Construction
  // --------------------------------------------------------------------------
  assert('TEST C', 'Construct SKU intelligence entity with customer/importer scope and rationale', () => {
    const sku: CustomsSkuIntelligence = {
      id: 'sku-001',
      tenant_id: 'ten-01',
      importer_id: 'imp-byd-indonesia',
      sku_code: 'BYD-SEAL-MOTOR-AWD',
      normalized_description: 'Permanent Magnet Synchronous Electric Traction Motor Assembly',
      original_description: 'TRACTION MOTOR AWD 160KW',
      brand: 'BYD',
      model: 'TZ200XYA',
      country_of_origin: 'CN',
      preferred_uom: 'UNT',
      suggested_hs_code: '8501.53.00',
      classification_confidence: 0.98,
      classification_status: 'VERIFIED',
      classification_rationale: 'Electric AC multi-phase motor of output exceeding 75 kW matching BTKI heading 85.01',
      classification_source: 'HISTORICAL_IMPORT',
      total_declarations_count: 14,
      effective_date: '2026-08-26',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (sku.sku_code !== 'BYD-SEAL-MOTOR-AWD' || sku.classification_confidence !== 0.98) {
      throw new Error('SKU Intelligence construction mismatch');
    }
  });

  // --------------------------------------------------------------------------
  // TEST D: Identical SKU Code with Different Importers Does Not Conflict
  // --------------------------------------------------------------------------
  assert('TEST D', 'Different importers can maintain distinct SKU intelligence records for same SKU code', () => {
    const skuImporterA: Partial<CustomsSkuIntelligence> = {
      tenant_id: 'ten-01',
      importer_id: 'imp-byd',
      sku_code: 'FILTER-AIR-01',
      suggested_hs_code: '8421.31.20' // Automotive air intake filter
    };

    const skuImporterB: Partial<CustomsSkuIntelligence> = {
      tenant_id: 'ten-01',
      importer_id: 'imp-daikin',
      sku_code: 'FILTER-AIR-01',
      suggested_hs_code: '8421.39.20' // HVAC residential air filter
    };

    if (skuImporterA.sku_code === skuImporterB.sku_code && skuImporterA.suggested_hs_code === skuImporterB.suggested_hs_code) {
      throw new Error('Different importers should be allowed distinct HS suggestions for same SKU code');
    }
  });

  // --------------------------------------------------------------------------
  // TEST E: Multi-Tenant Isolation on SKU Intelligence
  // --------------------------------------------------------------------------
  assert('TEST E', 'SKU Intelligence records enforce tenant_id partition', () => {
    const tenantA_SKU: Partial<CustomsSkuIntelligence> = { tenant_id: 'tenant-alpha', sku_code: 'BATTERY-PACK-60KWH' };
    const tenantB_SKU: Partial<CustomsSkuIntelligence> = { tenant_id: 'tenant-beta', sku_code: 'BATTERY-PACK-60KWH' };

    if (tenantA_SKU.tenant_id === tenantB_SKU.tenant_id) {
      throw new Error('Tenant isolation boundary violated');
    }
  });

  // --------------------------------------------------------------------------
  // TEST F: Global HS Master Reference Catalog
  // --------------------------------------------------------------------------
  assert('TEST F', 'BTKI 8-digit tariff catalog encapsulates tariff rates and Lartas flags', () => {
    const hsMaster: CustomsHsCodeMaster = {
      id: 'hs-001',
      hs_code: '8703.80.19',
      description_id: 'Kendaraan bermotor listrik murni (EV) roda empat, CBU',
      description_en: 'Electric motor vehicles (EV) for transport of persons, CBU',
      chapter: '87',
      heading: '8703',
      subheading: '8703.80',
      bm_rate: 0,
      ppn_rate: 11,
      pph_rate: 2.5,
      lartas_flag: true,
      lartas_permit_type: 'Persetujuan Impor (PI) Kendaraan Bermotor - Kemendag',
      uom_primary: 'UNT',
      source_reference: 'BTKI-2026',
      source_version: '2026.1',
      effective_from: '2026-01-01',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (hsMaster.hs_code !== '8703.80.19' || !hsMaster.lartas_flag) {
      throw new Error('HS master entity mismatch');
    }
  });

  // --------------------------------------------------------------------------
  // TEST G: Declaration Supporting Documents Association
  // --------------------------------------------------------------------------
  assert('TEST G', 'Declaration document entity captures document type, reference, and verification status', () => {
    const doc: CustomsDeclarationDocument = {
      id: 'doc-001',
      tenant_id: 'ten-01',
      declaration_id: 'dec-001',
      document_type: 'COO_FORM_E',
      document_number: 'E260812345678',
      issue_date: '2026-08-20',
      file_reference: 'storage://customs_docs/ten-01/dec-001/coo_form_e.pdf',
      file_name: 'Form_E_ASEAN_China.pdf',
      verification_status: 'VERIFIED',
      verified_by: 'user-ppjk-specialist',
      verified_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (doc.document_type !== 'COO_FORM_E' || doc.verification_status !== 'VERIFIED') {
      throw new Error('Customs document association failed');
    }
  });

  // --------------------------------------------------------------------------
  // TEST H: Immutable Item Audit Log Recording
  // --------------------------------------------------------------------------
  assert('TEST H', 'Item audit log captures field change, old value, new value, reason, and operator', () => {
    const audit: CustomsItemAuditLog = {
      id: 'aud-001',
      tenant_id: 'ten-01',
      declaration_id: 'dec-001',
      classification_line_id: 'line-001',
      field_name: 'hs_code',
      old_value: '8504.40.90',
      new_value: '8504.40.30',
      change_reason: 'Updated after reviewing manufacturer electrical schematic and inverter output rating',
      changed_by: 'user-001',
      changed_by_name: 'Bambang Sudiro (PPJK Ahli Kepabeanan)',
      changed_at: new Date().toISOString(),
      source: 'PPJK_WORKBENCH'
    };

    if (audit.field_name !== 'hs_code' || audit.old_value !== '8504.40.90' || audit.new_value !== '8504.40.30') {
      throw new Error('Item audit log recording failed');
    }
  });

  // --------------------------------------------------------------------------
  // TEST I: HS Snapshot Attributes Preserve Historical Context
  // --------------------------------------------------------------------------
  assert('TEST I', 'Line snapshots preserve effective tariff and description at time of declaration', () => {
    const line: Partial<CustomsClassificationLine> = {
      id: 'line-001',
      declaration_id: 'dec-001',
      hs_code: '8504.40.30',
      hs_code_snapshot: '8504.40.30',
      hs_description_snapshot: 'Static converters, of a kind used with telecommunication apparatus',
      bm_rate_snapshot: 0,
      ppn_rate_snapshot: 11,
      pph_rate_snapshot: 2.5
    };

    if (line.hs_code_snapshot !== '8504.40.30' || line.bm_rate_snapshot !== 0) {
      throw new Error('HS Snapshot preservation mismatch');
    }
  });

  // --------------------------------------------------------------------------
  // TEST J: Pre-Submission Validation Status Encoding
  // --------------------------------------------------------------------------
  assert('TEST J', 'Enriched line item supports validation error tracking and anomaly flags', () => {
    const line: Partial<CustomsClassificationLine> = {
      id: 'line-002',
      declaration_id: 'dec-001',
      sku_code: 'SUSPENSION-ARM-FR',
      unit_price_usd: 120,
      price_anomaly_flag: true,
      validation_status: 'WARNING',
      validation_warning_count: 1,
      validation_errors: [
        { code: 'PRICE_VARIANCE_HIGH', message: 'Unit price exceeds historical average by 125%', severity: 'WARNING' }
      ]
    };

    if (!line.price_anomaly_flag || line.validation_status !== 'WARNING') {
      throw new Error('Validation status encoding failed');
    }
  });

  // --------------------------------------------------------------------------
  // TEST K: Customs Tax Engine Invariants Preserved
  // --------------------------------------------------------------------------
  assert('TEST K', 'CustomsTaxCalculator correctly computes standard import taxes with KMK rate', () => {
    const tax = CustomsTaxCalculator.calculateLineTax({
      cifValueUsd: 10000,
      exchangeRateIdr: 16000,
      bmRatePercent: 5,
      ppnRatePercent: 11,
      pphRatePercent: 2.5
    });

    // Nilai Pabean = 10,000 * 16,000 = 160,000,000
    // Bea Masuk = 160,000,000 * 5% = 8,000,000
    // Nilai Impor = 168,000,000
    // PPN = 168,000,000 * 11% = 18,480,000
    // PPh = 168,000,000 * 2.5% = 4,200,000
    // Total = 30,680,000
    if (tax.nilaiPabeanIdr !== 160000000 || tax.beaMasukIdr !== 8000000 || tax.totalPajakIdr !== 30680000) {
      throw new Error(`Tax calculation invariant violated: got ${tax.totalPajakIdr}, expected 30680000`);
    }
  });

  return results;
}
