/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * Module: CEISA 4.0 Controlled Versioned Code Sets
 * File: lib/domain/customs/ceisa/codesets.ts
 */

export interface CeisaCodeEntry {
  code: string;
  name: string;
  category: string;
  sourceStandard: string;
  version: string;
  isActive: boolean;
}

export class CeisaCodeSets {
  public static readonly CODE_SET_VERSION = '2026.1';

  // 1. Customs Offices (KPPBC)
  public static readonly CUSTOMS_OFFICES: Record<string, string> = {
    '040300': 'KPU Bea dan Cukai Tipe A Tanjung Priok',
    '050100': 'KPPBC Tipe Madya Pabean Tanjung Perak',
    '010700': 'KPPBC Tipe Madya Pabean Belawan',
    '070100': 'KPU Bea dan Cukai Tipe C Soekarno-Hatta',
    '060100': 'KPPBC Tipe Madya Pabean B Semarang (Tanjung Emas)',
    '080100': 'KPPBC Tipe Madya Pabean B Makassar'
  };

  // 2. CEISA Document Type Codes (Lampiran Dokumen DJBC)
  public static readonly DOCUMENT_CODES: Record<string, { code: string; label: string }> = {
    INVOICE: { code: '380', label: 'Commercial Invoice' },
    PACKING_LIST: { code: '271', label: 'Packing List' },
    BL_AWB: { code: '705', label: 'Bill of Lading / Air Waybill' },
    COO_FORM_D: { code: '861', label: 'Certificate of Origin (ATIGA Form D)' },
    COO_FORM_E: { code: '860', label: 'Certificate of Origin (ACFTA Form E)' },
    COO_FORM_AK: { code: '864', label: 'Certificate of Origin (AKFTA Form AK)' },
    PERMIT: { code: '911', label: 'Surat Keputusan / Izin Impor (PI/LS)' },
    MSDS: { code: '999', label: 'Material Safety Data Sheet (MSDS)' }
  };

  // 3. Transport Modes
  public static readonly TRANSPORT_MODES: Record<string, string> = {
    '1': 'Laut (Sea Transport)',
    '4': 'Udara (Air Freight)',
    '3': 'Darat (Road/Trucking)',
    '2': 'Kereta Api (Rail)'
  };

  // 4. Standard Package Types
  public static readonly PACKAGE_TYPES: Record<string, string> = {
    CT: 'Carton (Karton)',
    PK: 'Package (Paket)',
    PL: 'Pallet (Palet)',
    DR: 'Drum',
    BG: 'Bag (Kantong)',
    BX: 'Box (Kotak)',
    NE: 'Unpacked / Bulk (Curah)'
  };

  // 5. Standard Currency Codes (ISO 4217)
  public static readonly CURRENCIES = new Set([
    'USD', 'IDR', 'EUR', 'SGD', 'CNY', 'JPY', 'GBP', 'AUD', 'MYR', 'THB', 'KRW', 'HKD'
  ]);

  /**
   * Resolves canonical document type to DJBC CEISA document code
   */
  public static resolveDocumentCode(docType: string): { code: string; label: string; isAuthoritative: boolean } {
    const entry = this.DOCUMENT_CODES[docType.toUpperCase()];
    if (entry) {
      return { code: entry.code, label: entry.label, isAuthoritative: true };
    }
    return {
      code: '999',
      label: `CEISA_CODESET_REQUIRED (${docType})`,
      isAuthoritative: false
    };
  }

  /**
   * Validates if a customs office code is registered in DJBC master
   */
  public static isValidCustomsOffice(officeCode: string): boolean {
    return Boolean(this.CUSTOMS_OFFICES[officeCode]);
  }

  /**
   * Validates currency code against ISO 4217 / DJBC standard
   */
  public static isValidCurrency(currencyCode: string): boolean {
    return this.CURRENCIES.has(currencyCode.toUpperCase());
  }
}
