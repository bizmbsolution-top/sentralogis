/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * File: lib/domain/customs/ceisa-preparation-service.ts
 * Description: Standardized CEISA 4.0 Preparation Dataset Compiler & Readiness Matrix Generator
 */

import {
  CustomsDeclaration,
  CustomsClassificationLine,
  CustomsDeclarationDocument,
  CustomsHsCodeMaster
} from './types';
import { CustomsTaxCalculator } from './tax-calculator';
import { CustomsValidationEngine, DeclarationValidationReport } from './customs-validation-engine';

export interface CeisaReadinessMatrix {
  identity: 'READY' | 'WARNING' | 'BLOCKED';
  cargo: 'READY' | 'WARNING' | 'BLOCKED';
  classification: 'READY' | 'WARNING' | 'BLOCKED';
  valuation: 'READY' | 'WARNING' | 'BLOCKED';
  origin: 'READY' | 'WARNING' | 'BLOCKED';
  documents: 'READY' | 'WARNING' | 'BLOCKED';
  tax: 'READY' | 'WARNING' | 'BLOCKED';
  lartas: 'READY' | 'WARNING' | 'BLOCKED';
  transport: 'READY' | 'WARNING' | 'BLOCKED';
  parties: 'READY' | 'WARNING' | 'BLOCKED';
  overall: 'READY' | 'READY_WITH_WARNINGS' | 'BLOCKED';
}

export interface CeisaPreparationDataset {
  ceisa_preparation_version: string;
  generated_at: string;
  declaration_header: {
    nomor_pengajuan_aju: string;
    jenis_deklarasi: string;
    kode_kantor_pabean: string;
    importer_id: string;
    ppjk_id?: string | null;
    service_request_id?: string | null;
    status: string;
  };
  valuation_and_taxes: {
    total_cif_usd: number;
    kurs_pajak_kmk_idr: number;
    total_nilai_pabean_idr: number;
    total_bea_masuk_idr: number;
    total_nilai_impor_idr: number;
    total_ppn_idr: number;
    total_pph22_idr: number;
    total_pungutan_pabean_idr: number;
  };
  items: Array<{
    item_sequence: number;
    sku_code?: string | null;
    hs_code: string;
    uraian_barang: string;
    merk?: string | null;
    tipe?: string | null;
    jumlah_satuan: number;
    kode_satuan: string;
    harga_satuan_usd: number;
    nilai_cif_usd: number;
    negara_asal: string;
    tarif_bm_percent: number;
    tarif_ppn_percent: number;
    tarif_pph_percent: number;
    bea_masuk_idr: number;
    ppn_idr: number;
    pph22_idr: number;
    total_pajak_line_idr: number;
    nomor_invoice?: string | null;
    nomor_baris_invoice?: number | null;
    lartas_flag: boolean;
  }>;
  documents: Array<{
    jenis_dokumen: string;
    nomor_dokumen?: string | null;
    tanggal_dokumen?: string | null;
    file_reference?: string | null;
    status_verifikasi: string;
  }>;
  readiness_matrix: CeisaReadinessMatrix;
  validation_report: DeclarationValidationReport;
  human_review_checklist: Array<{
    checkpoint: string;
    status: 'VERIFIED' | 'ATTENTION_REQUIRED' | 'BLOCKED';
    notes: string;
  }>;
}

export class CeisaPreparationService {
  public static readonly SCHEMA_VERSION = 'CEISA-4.0-PREP-v1.0';

  private validationEngine = new CustomsValidationEngine();

  /**
   * Compiles and verifies the canonical CEISA 4.0 Preparation Dataset
   */
  public prepareCeisaDataset(
    declaration: CustomsDeclaration,
    lines: CustomsClassificationLine[],
    documents: CustomsDeclarationDocument[] = [],
    options: {
      exchangeRateIdr?: number;
      hsMasterMap?: Map<string, CustomsHsCodeMaster>;
      skuHistoricalMap?: Map<string, { suggested_hs_code?: string; average_price?: number }>;
    } = {}
  ): CeisaPreparationDataset {
    const exchangeRate = options.exchangeRateIdr || CustomsTaxCalculator.DEFAULT_EXCHANGE_RATE_IDR;
    const now = new Date().toISOString();

    // 1. Run Multi-Tier Validation Engine
    const validationReport = this.validationEngine.validateDeclaration(
      declaration,
      lines,
      documents,
      options
    );

    // 2. Compute Reusable Tax Engine Aggregation
    const taxSummary = CustomsTaxCalculator.calculateAggregateTax(lines, exchangeRate);

    // 3. Construct Items with Calculated Taxes
    const preparedItems = lines.map((l, idx) => {
      const lineTax = taxSummary.calculatedLines[idx] || CustomsTaxCalculator.calculateLineTax({
        cifValueUsd: l.cif_value_usd,
        exchangeRateIdr: exchangeRate,
        bmRatePercent: l.bm_rate_percent,
        ppnRatePercent: l.ppn_rate_percent,
        pphRatePercent: l.pph_rate_percent
      });

      const isLartas = Boolean(l.lartas_flag || (options.hsMasterMap && options.hsMasterMap.get(l.hs_code)?.lartas_flag));

      return {
        item_sequence: l.item_sequence || idx + 1,
        sku_code: l.sku_code || null,
        hs_code: l.hs_code,
        uraian_barang: l.goods_description,
        merk: l.brand || null,
        tipe: l.model || null,
        jumlah_satuan: l.item_quantity !== undefined ? Number(l.item_quantity) : 1,
        kode_satuan: l.uom_code || 'PCE',
        harga_satuan_usd: l.unit_price_usd !== undefined ? Number(l.unit_price_usd) : 0,
        nilai_cif_usd: l.cif_value_usd,
        negara_asal: l.country_of_origin || 'CN',
        tarif_bm_percent: l.bm_rate_percent,
        tarif_ppn_percent: l.ppn_rate_percent,
        tarif_pph_percent: l.pph_rate_percent,
        bea_masuk_idr: lineTax.beaMasukIdr,
        ppn_idr: lineTax.ppnIdr,
        pph22_idr: lineTax.pph22Idr,
        total_pajak_line_idr: lineTax.totalPajakIdr,
        nomor_invoice: l.invoice_number || null,
        nomor_baris_invoice: l.invoice_line_no || null,
        lartas_flag: isLartas
      };
    });

    // 4. Construct Readiness Matrix
    const readiness_matrix: CeisaReadinessMatrix = {
      identity: validationReport.readinessByCategory.identity,
      cargo: validationReport.readinessByCategory.cargo,
      classification: validationReport.readinessByCategory.classification,
      valuation: validationReport.readinessByCategory.valuation,
      origin: validationReport.readinessByCategory.origin,
      documents: validationReport.readinessByCategory.documents,
      tax: validationReport.readinessByCategory.tax,
      lartas: validationReport.readinessByCategory.lartas,
      transport: documents.some(d => d.document_type === 'BL_AWB') ? 'READY' : 'WARNING',
      parties: declaration.importer_id ? 'READY' : 'BLOCKED',
      overall: validationReport.overallStatus
    };

    // 5. Construct Human Review Checklist
    const human_review_checklist: Array<{ checkpoint: string; status: 'VERIFIED' | 'ATTENTION_REQUIRED' | 'BLOCKED'; notes: string }> = [
      {
        checkpoint: 'AJU Identity & Customs Office Verification',
        status: readiness_matrix.identity === 'BLOCKED' ? 'BLOCKED' : 'VERIFIED',
        notes: `Office: ${declaration.customs_office_code || 'N/A'}, AJU: ${declaration.declaration_number}`
      },
      {
        checkpoint: 'HS Classification & BTKI Verification',
        status: readiness_matrix.classification === 'BLOCKED' ? 'BLOCKED' : readiness_matrix.classification === 'WARNING' ? 'ATTENTION_REQUIRED' : 'VERIFIED',
        notes: `${lines.length} lines classified. ${validationReport.warningCount} warnings.`
      },
      {
        checkpoint: 'Valuation & Customs Duty Liability',
        status: 'VERIFIED',
        notes: `Total Pungutan: Rp ${taxSummary.totalDutyAndTaxIdr.toLocaleString('id-ID')} (CIF $${taxSummary.totalCifUsd.toLocaleString()})`
      },
      {
        checkpoint: 'Supporting Documents Verification',
        status: readiness_matrix.documents === 'WARNING' ? 'ATTENTION_REQUIRED' : 'VERIFIED',
        notes: `${documents.length} documents attached in vault.`
      },
      {
        checkpoint: 'Lartas & Regulatory Permits',
        status: readiness_matrix.lartas === 'BLOCKED' ? 'BLOCKED' : readiness_matrix.lartas === 'WARNING' ? 'ATTENTION_REQUIRED' : 'VERIFIED',
        notes: preparedItems.some(i => i.lartas_flag) ? 'Lartas restrictions detected on one or more items.' : 'No Lartas restrictions flagged.'
      }
    ];

    return {
      ceisa_preparation_version: CeisaPreparationService.SCHEMA_VERSION,
      generated_at: now,
      declaration_header: {
        nomor_pengajuan_aju: declaration.declaration_number,
        jenis_deklarasi: declaration.declaration_type,
        kode_kantor_pabean: declaration.customs_office_code,
        importer_id: declaration.importer_id,
        ppjk_id: declaration.ppjk_id,
        service_request_id: declaration.service_request_id,
        status: declaration.status
      },
      valuation_and_taxes: {
        total_cif_usd: taxSummary.totalCifUsd,
        kurs_pajak_kmk_idr: exchangeRate,
        total_nilai_pabean_idr: taxSummary.totalNilaiPabeanIdr,
        total_bea_masuk_idr: taxSummary.totalBeaMasukIdr,
        total_nilai_impor_idr: taxSummary.totalNilaiPabeanIdr + taxSummary.totalBeaMasukIdr,
        total_ppn_idr: taxSummary.totalPpnIdr,
        total_pph22_idr: taxSummary.totalPphIdr,
        total_pungutan_pabean_idr: taxSummary.totalDutyAndTaxIdr
      },
      items: preparedItems,
      documents: documents.map(d => ({
        jenis_dokumen: d.document_type,
        nomor_dokumen: d.document_number,
        tanggal_dokumen: d.issue_date,
        file_reference: d.file_reference,
        status_verifikasi: d.verification_status
      })),
      readiness_matrix,
      validation_report: validationReport,
      human_review_checklist
    };
  }
}
