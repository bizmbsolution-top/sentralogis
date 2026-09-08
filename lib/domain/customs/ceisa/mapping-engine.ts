/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * Module: CEISA 4.0 Canonical Field Mapping Engine
 * File: lib/domain/customs/ceisa/mapping-engine.ts
 */

import {
  CustomsDeclaration,
  CustomsClassificationLine,
  CustomsDeclarationDocument
} from '../types';
import {
  CanonicalCustomsPayload,
  CeisaFieldMappingItem
} from './types';
import { CeisaCodeSets } from './codesets';
import { CustomsTaxCalculator } from '../tax-calculator';

export class CeisaMappingEngine {
  /**
   * Compiles the Canonical Customs Payload from Declaration Aggregates
   */
  public static compileCanonicalPayload(
    declaration: CustomsDeclaration,
    lines: CustomsClassificationLine[],
    documents: CustomsDeclarationDocument[],
    options: {
      kursPajakKmk?: number;
      importerName?: string;
      importerTaxId?: string;
      importerAddress?: string;
    } = {}
  ): CanonicalCustomsPayload {
    const kursKmk = options.kursPajakKmk || 16000;

    let totalFob = 0;
    let totalFreight = 0;
    let totalInsurance = 0;
    let totalCif = 0;

    for (const line of lines) {
      totalFob += line.fob_value_usd || ((line.item_quantity || 0) * (line.unit_price_usd || 0));
      totalFreight += line.freight_usd || 0;
      totalInsurance += line.insurance_usd || 0;
      totalCif += line.cif_value_usd || 0;
    }

    // Fallback if line CIFs are 0
    if (totalCif === 0 && totalFob > 0) {
      totalCif = totalFob + totalFreight + totalInsurance;
    }

    const nilaiPabeanIdr = Math.round(totalCif * kursKmk);
    
    // Tax aggregation
    let totalBmIdr = 0;
    let totalPpnIdr = 0;
    let totalPphIdr = 0;

    for (const line of lines) {
      const lineCif = line.cif_value_usd || 0;
      const lineTax = CustomsTaxCalculator.calculateLineTax({
        cifValueUsd: lineCif,
        exchangeRateIdr: kursKmk,
        bmRatePercent: line.bm_rate_percent || 0,
        ppnRatePercent: line.ppn_rate_percent || 11,
        pphRatePercent: line.pph_rate_percent || 2.5
      });
      totalBmIdr += lineTax.beaMasukIdr;
      totalPpnIdr += lineTax.ppnIdr;
      totalPphIdr += lineTax.pph22Idr;
    }

    const totalNilaiImporIdr = nilaiPabeanIdr + totalBmIdr;
    const totalPungutanIdr = totalBmIdr + totalPpnIdr + totalPphIdr;

    return {
      declaration,
      lines,
      documents,
      valuation: {
        totalFobUsd: Math.round(totalFob * 100) / 100,
        totalFreightUsd: Math.round(totalFreight * 100) / 100,
        totalInsuranceUsd: Math.round(totalInsurance * 100) / 100,
        totalCifUsd: Math.round(totalCif * 100) / 100,
        kursPajakKmkIdr: kursKmk,
        totalNilaiPabeanIdr: nilaiPabeanIdr,
        totalBeaMasukIdr: totalBmIdr,
        totalNilaiImporIdr,
        totalPpnIdr: totalPpnIdr,
        totalPph22Idr: totalPphIdr,
        totalPungutanPabeanIdr: totalPungutanIdr
      },
      parties: {
        importerName: options.importerName || 'PT INDONESIA SEJAHTERA LOGISTIK',
        importerTaxId: options.importerTaxId || '01.234.567.8-012.000',
        importerAddress: options.importerAddress || 'Kawasan Industri Tanjung Priok, Jakarta Utara',
        ppjkName: 'PT SENTRALOGIS PPJK NUSANTARA',
        ppjkTaxId: '09.876.543.2-011.000'
      },
      transport: {
        customsOfficeCode: declaration.customs_office_code || '040300',
        transportMode: '1', // Default Sea
        vesselName: 'MV SENTRA PACIFIC',
        voyageFlightNumber: 'V.2026-08',
        loadingPortCode: 'SGSIN',
        dischargePortCode: 'IDTPP'
      }
    };
  }

  /**
   * Generates Explainable Field Mapping Inspection Records
   */
  public static generateFieldMappings(payload: CanonicalCustomsPayload): CeisaFieldMappingItem[] {
    const mappings: CeisaFieldMappingItem[] = [];
    const dec = payload.declaration;
    const val = payload.valuation;

    // 1. Header: Nomor AJU
    const ajuLen = (dec.declaration_number || '').replace(/[^0-9A-Za-z]/g, '').length;
    mappings.push({
      canonicalField: 'declaration.declaration_number',
      ceisaField: 'DokumenPabean.Header.nomorAju',
      sourcePath: 'cus_declarations.declaration_number',
      dataType: 'STRING',
      transformationType: 'DIRECT',
      value: dec.declaration_number || null,
      status: ajuLen === 26 ? 'VALID' : 'INVALID',
      notes: ajuLen === 26 ? 'Conforms to 26-char DJBC AJU structure' : `Invalid length (${ajuLen}/26 chars)`
    });

    // 2. Header: Kode Dokumen
    mappings.push({
      canonicalField: 'declaration.declaration_type',
      ceisaField: 'DokumenPabean.Header.kodeDokumen',
      sourcePath: 'cus_declarations.declaration_type',
      dataType: 'CODE',
      transformationType: 'ISO_CODE',
      value: dec.declaration_type === 'PIB_IMPORT' ? '20' : '30',
      status: 'VALID',
      notes: 'Maps to BC 2.0 (PIB Impor)'
    });

    // 3. Header: Kantor Pabean
    const isOfficeValid = CeisaCodeSets.isValidCustomsOffice(dec.customs_office_code || '');
    mappings.push({
      canonicalField: 'declaration.customs_office_code',
      ceisaField: 'DokumenPabean.Header.kodeKantor',
      sourcePath: 'cus_declarations.customs_office_code',
      dataType: 'CODE',
      transformationType: 'DIRECT',
      value: dec.customs_office_code || null,
      status: isOfficeValid ? 'VALID' : 'WARNING',
      notes: isOfficeValid
        ? CeisaCodeSets.CUSTOMS_OFFICES[dec.customs_office_code!]
        : 'Office code not found in authoritative directory'
    });

    // 4. Header: Importer NPWP
    mappings.push({
      canonicalField: 'parties.importerTaxId',
      ceisaField: 'DokumenPabean.Header.importir.npwp',
      sourcePath: 'md_entities.tax_id',
      dataType: 'STRING',
      transformationType: 'DIRECT',
      value: payload.parties.importerTaxId,
      status: payload.parties.importerTaxId ? 'VALID' : 'MISSING',
      notes: '15/16 digit Indonesian Tax ID'
    });

    // 5. Header: Total CIF USD
    mappings.push({
      canonicalField: 'valuation.totalCifUsd',
      ceisaField: 'DokumenPabean.Header.cifUsd',
      sourcePath: 'cus_declarations (aggregated)',
      dataType: 'NUMBER',
      transformationType: 'DECIMAL_ROUND',
      value: val.totalCifUsd,
      status: val.totalCifUsd > 0 ? 'VALID' : 'INVALID',
      notes: '2-decimal rounded USD CIF sum'
    });

    // 6. Header: Kurs Pajak KMK
    mappings.push({
      canonicalField: 'valuation.kursPajakKmkIdr',
      ceisaField: 'DokumenPabean.Header.kursPajak',
      sourcePath: 'md_exchange_rates.rate',
      dataType: 'NUMBER',
      transformationType: 'DIRECT',
      value: val.kursPajakKmkIdr,
      status: val.kursPajakKmkIdr > 0 ? 'VALID' : 'INVALID',
      notes: 'Official KMK exchange rate'
    });

    // 7. Header: Nilai Pabean IDR
    mappings.push({
      canonicalField: 'valuation.totalNilaiPabeanIdr',
      ceisaField: 'DokumenPabean.Header.nilaiPabean',
      sourcePath: 'computed: CIF * Kurs KMK',
      dataType: 'NUMBER',
      transformationType: 'COMPUTED',
      value: val.totalNilaiPabeanIdr,
      status: 'VALID',
      notes: 'Deterministic tax base under PMK 144/2022'
    });

    // 8. Header: Total Pungutan Pabean
    mappings.push({
      canonicalField: 'valuation.totalPungutanPabeanIdr',
      ceisaField: 'DokumenPabean.Header.pungutan.totalPungutan',
      sourcePath: 'computed: BM + PPN + PPh',
      dataType: 'NUMBER',
      transformationType: 'COMPUTED',
      value: val.totalPungutanPabeanIdr,
      status: 'VALID',
      notes: 'Total Import Taxes & Duty'
    });

    // 9. Items Count
    mappings.push({
      canonicalField: 'lines.length',
      ceisaField: 'DokumenPabean.Barang.jumlahItem',
      sourcePath: 'cus_classification_lines (count)',
      dataType: 'NUMBER',
      transformationType: 'DIRECT',
      value: payload.lines.length,
      status: payload.lines.length > 0 ? 'VALID' : 'MISSING',
      notes: 'Total declaration line items'
    });

    // 10. Documents Count
    mappings.push({
      canonicalField: 'documents.length',
      ceisaField: 'DokumenPabean.DokumenLampiran.jumlahDokumen',
      sourcePath: 'cus_declaration_documents (count)',
      dataType: 'NUMBER',
      transformationType: 'DIRECT',
      value: payload.documents.length,
      status: payload.documents.length > 0 ? 'VALID' : 'WARNING',
      notes: 'Supporting documents in vault'
    });

    return mappings;
  }
}
