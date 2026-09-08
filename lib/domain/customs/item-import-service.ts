/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * File: lib/domain/customs/item-import-service.ts
 * Description: Bulk Declaration Item Ingestion, Normalization, Duplicate Detection & Import Preview
 */

import { CreateClassificationLineDTO } from './types';

export interface RawImportRow {
  [key: string]: any;
}

export interface NormalizedImportRow {
  rowIndex: number;
  sku_code: string;
  goods_description: string;
  brand?: string;
  model?: string;
  item_quantity: number;
  uom_code: string;
  unit_price_usd: number;
  cif_value_usd: number;
  fob_value_usd?: number;
  freight_usd?: number;
  insurance_usd?: number;
  currency: string;
  country_of_origin: string;
  manufacturer_name?: string;
  supplier_name?: string;
  invoice_number?: string;
  invoice_line_no?: number;
  hs_code?: string;
  bm_rate_percent?: number;
  ppn_rate_percent?: number;
  pph_rate_percent?: number;

  // Analysis metadata
  is_duplicate_in_file: boolean;
  matched_sku_master?: boolean;
  suggested_hs_code?: string;
  hs_suggestion_confidence?: number;
  errors: string[];
  warnings: string[];
  original_row: RawImportRow;
}

export interface ItemImportPreview {
  total_rows: number;
  valid_rows: number;
  warning_rows: number;
  error_rows: number;
  duplicate_rows: number;
  auto_matched_sku_rows: number;
  auto_suggested_hs_rows: number;
  unresolved_rows: number;
  normalized_rows: NormalizedImportRow[];
  global_errors: string[];
  global_warnings: string[];
  column_mappings: Record<string, string>;
}

export class ItemImportService {
  private static readonly COLUMN_ALIASES: Record<string, string[]> = {
    sku_code: ['sku', 'sku_code', 'skucode', 'item_code', 'itemcode', 'product_code', 'productcode', 'kode_barang', 'kode_sku', 'part_number', 'part_no'],
    goods_description: ['description', 'goods_description', 'description_of_goods', 'product_description', 'nama_barang', 'uraian_barang', 'item_description', 'item_name'],
    brand: ['brand', 'merk', 'merek', 'brand_name'],
    model: ['model', 'type', 'tipe', 'model_type', 'spec', 'spesifikasi'],
    item_quantity: ['qty', 'quantity', 'jumlah', 'jumlah_barang', 'amount', 'pcs', 'volume', 'qty_packages'],
    uom_code: ['uom', 'unit', 'satuan', 'unit_of_measure', 'uom_code', 'kemasan'],
    unit_price_usd: ['unit_price', 'price', 'unit_price_usd', 'harga_satuan', 'harga_usd', 'unit_fob', 'price_usd'],
    cif_value_usd: ['cif', 'cif_value', 'cif_value_usd', 'cif_usd', 'total_cif', 'nilai_cif', 'total_value_usd', 'total_usd'],
    fob_value_usd: ['fob', 'fob_value', 'fob_usd', 'nilai_fob'],
    freight_usd: ['freight', 'freight_usd', 'ongkos_angkut', 'tambahan_freight'],
    insurance_usd: ['insurance', 'insurance_usd', 'asuransi', 'biaya_asuransi'],
    currency: ['currency', 'mata_uang', 'valuta', 'curr'],
    country_of_origin: ['origin', 'country_of_origin', 'coo', 'negara_asal', 'country', 'origin_country'],
    manufacturer_name: ['manufacturer', 'manufacturer_name', 'pabrik', 'produsen'],
    supplier_name: ['supplier', 'supplier_name', 'pemasok', 'vendor'],
    invoice_number: ['invoice', 'invoice_no', 'invoice_number', 'no_invoice', 'nomor_invoice', 'inv_no'],
    invoice_line_no: ['invoice_line', 'invoice_line_no', 'line_no', 'line_number', 'no_baris', 'item_no'],
    hs_code: ['hs', 'hs_code', 'hscode', 'hs_code_8_digit', 'pos_tarif', 'kode_hs'],
    bm_rate_percent: ['bm', 'bm_rate', 'bea_masuk', 'tarif_bm'],
    ppn_rate_percent: ['ppn', 'ppn_rate', 'tarif_ppn'],
    pph_rate_percent: ['pph', 'pph_rate', 'pph_22', 'tarif_pph']
  };

  private static readonly VALID_UOMS = new Set([
    'PCE', 'KGM', 'CBM', 'TNE', 'MTR', 'LTR', 'SET', 'UNT', 'BOX', 'PLT', 'DRM', 'RLS', 'BRL', 'BAG', 'CRT'
  ]);

  /**
   * Resolves raw column keys against standard canonical attribute names
   */
  public static mapColumnName(rawKey: string): string | null {
    const cleaned = rawKey.trim().toLowerCase().replace(/[\s\-_]+/g, '_');
    for (const [canonical, aliases] of Object.entries(this.COLUMN_ALIASES)) {
      if (canonical === cleaned || aliases.includes(cleaned)) {
        return canonical;
      }
    }
    return null;
  }

  /**
   * Normalizes Country of Origin to 2-letter ISO code
   */
  public static normalizeCountryCode(rawCountry?: any): string {
    if (!rawCountry) return 'CN';
    const str = String(rawCountry).trim().toUpperCase();
    if (str.length === 2) return str;
    const countryMap: Record<string, string> = {
      'CHINA': 'CN', 'TIONGKOK': 'CN', 'PRC': 'CN',
      'JAPAN': 'JP', 'JEPANG': 'JP',
      'INDONESIA': 'ID',
      'UNITED STATES': 'US', 'USA': 'US', 'AMERIKA': 'US',
      'GERMANY': 'DE', 'JERMAN': 'DE',
      'SINGAPORE': 'SG', 'SINGAPURA': 'SG',
      'MALAYSIA': 'MY',
      'THAILAND': 'TH',
      'SOUTH KOREA': 'KR', 'KOREA': 'KR',
      'VIETNAM': 'VN',
      'AUSTRALIA': 'AU'
    };
    return countryMap[str] || str.substring(0, 2);
  }

  /**
   * Normalizes Unit of Measure to standard customs code
   */
  public static normalizeUom(rawUom?: any): string {
    if (!rawUom) return 'PCE';
    const str = String(rawUom).trim().toUpperCase();
    const uomMap: Record<string, string> = {
      'PCS': 'PCE', 'PIECE': 'PCE', 'PIECES': 'PCE', 'BUAH': 'PCE',
      'KG': 'KGM', 'KILOGRAM': 'KGM',
      'TON': 'TNE', 'MT': 'TNE', 'TONNE': 'TNE',
      'M3': 'CBM', 'CUBIC METER': 'CBM',
      'UNIT': 'UNT', 'UNITS': 'UNT',
      'METER': 'MTR', 'M': 'MTR',
      'LITER': 'LTR', 'L': 'LTR',
      'KOTAK': 'BOX', 'DUS': 'BOX',
      'PALLET': 'PLT', 'PALET': 'PLT'
    };
    const mapped = uomMap[str] || str;
    return this.VALID_UOMS.has(mapped) ? mapped : 'PCE';
  }

  /**
   * Sanitizes text strings against spreadsheet formula injection (=, +, -, @, \t)
   */
  public static sanitizeString(val: any): string {
    if (val === undefined || val === null) return '';
    let str = String(val).trim();
    // If it's a valid signed number literal, preserve it
    if (/^[+-]?\d+([.,]\d+)?$/.test(str)) {
      return str;
    }
    // Strip leading formula execution triggers
    if (/^[=+\-@\t\r]/.test(str)) {
      str = str.replace(/^[=+\-@\t\r]+/, '').trim();
    }
    return str;
  }

  /**
   * Normalizes numeric value from messy spreadsheet strings (handling Indonesian vs US locale formats)
   */
  public static parseNumber(val: any, defaultVal = 0): number {
    return ItemImportService.parseLocaleNumber(val, 'AUTO', defaultVal);
  }

  /**
   * Locale-aware number parsing with thousand & decimal separator disambiguation
   */
  public static parseLocaleNumber(val: any, locale: 'AUTO' | 'ID' | 'US' = 'AUTO', defaultVal = 0): number {
    if (val === undefined || val === null || val === '') return defaultVal;
    if (typeof val === 'number') return isNaN(val) ? defaultVal : val;

    let s = String(val).trim().replace(/[$€£¥Rp\s]|(?:USD|IDR|SGD|EUR|JPY)\s*/gi, '');
    if (!s) return defaultVal;

    // 1. If both dot and comma are present
    if (s.includes('.') && s.includes(',')) {
      const lastDot = s.lastIndexOf('.');
      const lastComma = s.lastIndexOf(',');

      if (locale === 'ID' || (locale === 'AUTO' && lastComma > lastDot)) {
        // Indonesian format: 1.250.500,50 -> 1250500.50
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        // US format: 1,250,500.50 -> 1250500.50
        s = s.replace(/,/g, '');
      }
    } else if (s.includes(',')) {
      // 2. Only comma present
      if (locale === 'US' && /^\d{1,3}(,\d{3})+$/.test(s)) {
        // US thousand separator e.g. 1,000 or 1,250,000
        s = s.replace(/,/g, '');
      } else {
        // Indonesian decimal separator e.g. 1250,50 or standard decimal e.g. 10,5
        s = s.replace(',', '.');
      }
    } else if (s.includes('.')) {
      // 3. Only dot present
      if (locale === 'ID' && /^\d{1,3}(\.\d{3})+$/.test(s)) {
        // Indonesian thousand separator e.g. 1.000 or 1.250.000
        s = s.replace(/\./g, '');
      }
    }

    const num = parseFloat(s);
    return isNaN(num) ? defaultVal : num;
  }

  /**
   * Tokenizes TSV text from clipboard into rows and columns, preserving empty cells and multiline quotes
   */
  public static tokenizeTsv(tsvText: string): string[][] {
    if (!tsvText || !tsvText.trim()) return [];
    // Remove UTF-8 BOM if present
    const cleanText = tsvText.replace(/^\uFEFF/, '');
    const lines = cleanText.split(/\r\n|\n|\r/);
    const rows: string[][] = [];

    for (const line of lines) {
      if (!line.trim() && line === lines[lines.length - 1]) continue; // Skip trailing empty line
      const cells = line.split('\t').map(c => ItemImportService.sanitizeString(c));
      if (cells.length > 0) {
        rows.push(cells);
      }
    }
    return rows;
  }

  /**
   * Tokenizes CSV text supporting comma or semicolon delimiters and quoted multiline cells
   */
  public static parseCsv(csvText: string): string[][] {
    if (!csvText || !csvText.trim()) return [];
    const cleanText = csvText.replace(/^\uFEFF/, '');
    const firstLine = cleanText.split(/\r\n|\n|\r/)[0] || '';
    const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';

    const rows: string[][] = [];
    let currentRow: string[] = [];
    let currentCell = '';
    let inQuotes = false;

    for (let i = 0; i < cleanText.length; i++) {
      const char = cleanText[i];
      const nextChar = cleanText[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          currentCell += '"';
          i++; // Skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        currentRow.push(ItemImportService.sanitizeString(currentCell));
        currentCell = '';
      } else if ((char === '\r' || char === '\n') && !inQuotes) {
        if (char === '\r' && nextChar === '\n') i++; // Skip CRLF
        currentRow.push(ItemImportService.sanitizeString(currentCell));
        if (currentRow.some(c => c.length > 0)) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      } else {
        currentCell += char;
      }
    }

    if (currentCell || currentRow.length > 0) {
      currentRow.push(ItemImportService.sanitizeString(currentCell));
      if (currentRow.some(c => c.length > 0)) {
        rows.push(currentRow);
      }
    }

    return rows;
  }

  /**
   * Normalizes HS Code format (e.g. 85044030 or 8504.40.30)
   */
  public static normalizeHsCode(rawHs?: any): string {
    if (!rawHs) return '';
    const digits = String(rawHs).replace(/[^0-9]/g, '');
    if (digits.length >= 8) {
      return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6, 8)}`;
    }
    if (digits.length >= 6) {
      return `${digits.slice(0, 4)}.${digits.slice(4, 6)}`;
    }
    if (digits.length >= 4) {
      return `${digits.slice(0, 4)}`;
    }
    return digits;
  }

  /**
   * Processes and previews bulk imported raw records without mutating the database
   */
  public processImportData(
    rawRows: RawImportRow[],
    options: {
      defaultOrigin?: string;
      defaultCurrency?: string;
      numberLocale?: 'AUTO' | 'ID' | 'US';
      customColumnMappings?: Record<string, string>;
      duplicatePolicy?: 'CREATE_DISTINCT_LINES' | 'SKIP_DUPLICATES' | 'REPLACE_EXISTING';
      skuIntelligenceMap?: Map<string, { suggested_hs_code?: string; confidence?: number; product_name?: string; brand?: string; model?: string }>;
      hsTariffMap?: Map<string, { bm_rate: number; ppn_rate: number; pph_rate: number; description_id: string }>;
    } = {}
  ): ItemImportPreview {
    const total_rows = rawRows.length;
    const normalized_rows: NormalizedImportRow[] = [];
    const skuSeen = new Set<string>();
    const duplicateSkusInBatch = new Set<string>();
    const numberLocale = options.numberLocale || 'AUTO';

    // Pass 1: Identify duplicates within the batch
    rawRows.forEach(r => {
      let sku = '';
      for (const [k, v] of Object.entries(r)) {
        const canonical = options.customColumnMappings?.[k] || ItemImportService.mapColumnName(k);
        if (canonical === 'sku_code' && v) {
          sku = ItemImportService.sanitizeString(v).toUpperCase();
          break;
        }
      }
      if (sku) {
        if (skuSeen.has(sku)) {
          duplicateSkusInBatch.add(sku);
        } else {
          skuSeen.add(sku);
        }
      }
    });

    let valid_rows = 0;
    let warning_rows = 0;
    let error_rows = 0;
    let duplicate_rows = 0;
    let auto_matched_sku_rows = 0;
    let auto_suggested_hs_rows = 0;
    const column_mappings: Record<string, string> = {};
    const processedSkus = new Set<string>();

    // Pass 2: Normalize and validate each row
    rawRows.forEach((raw, idx) => {
      const errors: string[] = [];
      const warnings: string[] = [];
      const normalizedObj: Record<string, any> = {};

      for (const [rawKey, rawVal] of Object.entries(raw)) {
        const canonical = options.customColumnMappings?.[rawKey] || ItemImportService.mapColumnName(rawKey);
        if (canonical) {
          normalizedObj[canonical] = typeof rawVal === 'string' ? ItemImportService.sanitizeString(rawVal) : rawVal;
          column_mappings[rawKey] = canonical;
        }
      }

      const sku_code = ItemImportService.sanitizeString(normalizedObj.sku_code || '').toUpperCase();
      const goods_description = ItemImportService.sanitizeString(normalizedObj.goods_description || '');
      const brand = normalizedObj.brand ? ItemImportService.sanitizeString(normalizedObj.brand) : undefined;
      const model = normalizedObj.model ? ItemImportService.sanitizeString(normalizedObj.model) : undefined;
      const item_quantity = ItemImportService.parseLocaleNumber(normalizedObj.item_quantity, numberLocale, 1);
      const uom_code = ItemImportService.normalizeUom(normalizedObj.uom_code);
      const unit_price_usd = ItemImportService.parseLocaleNumber(normalizedObj.unit_price_usd, numberLocale, 0);
      const currency = ItemImportService.sanitizeString(normalizedObj.currency || options.defaultCurrency || 'USD').toUpperCase();
      const country_of_origin = ItemImportService.normalizeCountryCode(normalizedObj.country_of_origin || options.defaultOrigin);
      const manufacturer_name = normalizedObj.manufacturer_name ? ItemImportService.sanitizeString(normalizedObj.manufacturer_name) : undefined;
      const supplier_name = normalizedObj.supplier_name ? ItemImportService.sanitizeString(normalizedObj.supplier_name) : undefined;
      const invoice_number = normalizedObj.invoice_number ? ItemImportService.sanitizeString(normalizedObj.invoice_number) : undefined;
      const invoice_line_no = normalizedObj.invoice_line_no ? parseInt(String(normalizedObj.invoice_line_no), 10) : undefined;
      let hs_code = ItemImportService.normalizeHsCode(normalizedObj.hs_code);

      let fob_value_usd = ItemImportService.parseLocaleNumber(normalizedObj.fob_value_usd, numberLocale, 0);
      const freight_usd = ItemImportService.parseLocaleNumber(normalizedObj.freight_usd, numberLocale, 0);
      const insurance_usd = ItemImportService.parseLocaleNumber(normalizedObj.insurance_usd, numberLocale, 0);
      let cif_value_usd = ItemImportService.parseLocaleNumber(normalizedObj.cif_value_usd, numberLocale, 0);

      // Skip duplicate rows if policy is SKIP_DUPLICATES
      if (options.duplicatePolicy === 'SKIP_DUPLICATES' && sku_code && processedSkus.has(sku_code)) {
        return;
      }
      if (sku_code) processedSkus.add(sku_code);

      // Auto compute CIF if unit_price and qty provided but CIF is 0
      if (cif_value_usd === 0 && unit_price_usd > 0 && item_quantity > 0) {
        if (fob_value_usd === 0) fob_value_usd = unit_price_usd * item_quantity;
        cif_value_usd = fob_value_usd + freight_usd + insurance_usd;
      }

      // Check Duplicates
      const is_duplicate_in_file = Boolean(sku_code && duplicateSkusInBatch.has(sku_code));
      if (is_duplicate_in_file) {
        duplicate_rows++;
        warnings.push(`Duplicate SKU '${sku_code}' detected in uploaded batch`);
      }

      // Match against SKU intelligence map
      let matched_sku_master = false;
      let suggested_hs_code: string | undefined = undefined;
      let hs_suggestion_confidence: number | undefined = undefined;

      if (sku_code && options.skuIntelligenceMap?.has(sku_code)) {
        const intel = options.skuIntelligenceMap.get(sku_code)!;
        matched_sku_master = true;
        auto_matched_sku_rows++;
        if (intel.suggested_hs_code) {
          suggested_hs_code = intel.suggested_hs_code;
          hs_suggestion_confidence = intel.confidence || 0.95;
          auto_suggested_hs_rows++;
          if (!hs_code) {
            hs_code = suggested_hs_code;
          }
        }
      }

      // Validation Checks
      if (!sku_code && !goods_description) {
        errors.push('Row is missing both SKU code and Goods Description');
      }
      if (item_quantity <= 0) {
        errors.push(`Invalid quantity (${item_quantity}). Must be greater than zero.`);
      }
      if (cif_value_usd < 0) {
        errors.push(`Invalid CIF value ($${cif_value_usd}). Cannot be negative.`);
      }
      if (!hs_code) {
        warnings.push('HS Code is missing and requires classification');
      } else if (hs_code.replace(/[^0-9]/g, '').length < 8) {
        warnings.push(`HS Code '${hs_code}' is incomplete (less than 8 digits)`);
      }

      if (errors.length > 0) {
        error_rows++;
      } else if (warnings.length > 0) {
        warning_rows++;
      } else {
        valid_rows++;
      }

      normalized_rows.push({
        rowIndex: idx + 1,
        sku_code,
        goods_description: goods_description || (sku_code ? `SKU Item ${sku_code}` : 'Unspecified Cargo'),
        brand,
        model,
        item_quantity,
        uom_code,
        unit_price_usd,
        cif_value_usd,
        fob_value_usd,
        freight_usd,
        insurance_usd,
        currency,
        country_of_origin,
        manufacturer_name,
        supplier_name,
        invoice_number,
        invoice_line_no,
        hs_code,
        bm_rate_percent: normalizedObj.bm_rate_percent !== undefined ? Number(normalizedObj.bm_rate_percent) : undefined,
        ppn_rate_percent: normalizedObj.ppn_rate_percent !== undefined ? Number(normalizedObj.ppn_rate_percent) : undefined,
        pph_rate_percent: normalizedObj.pph_rate_percent !== undefined ? Number(normalizedObj.pph_rate_percent) : undefined,
        is_duplicate_in_file,
        matched_sku_master,
        suggested_hs_code,
        hs_suggestion_confidence,
        errors,
        warnings,
        original_row: raw
      });
    });

    return {
      total_rows,
      valid_rows,
      warning_rows,
      error_rows,
      duplicate_rows,
      auto_matched_sku_rows,
      auto_suggested_hs_rows,
      unresolved_rows: total_rows - valid_rows - warning_rows,
      normalized_rows,
      global_errors: error_rows > 0 ? [`${error_rows} row(s) contain critical validation errors.`] : [],
      global_warnings: warning_rows > 0 ? [`${warning_rows} row(s) contain warnings or missing HS codes.`] : [],
      column_mappings
    };
  }

  /**
   * Converts validated normalized rows into canonical CreateClassificationLineDTO array
   */
  public toClassificationDTOs(normalizedRows: NormalizedImportRow[]): CreateClassificationLineDTO[] {
    return normalizedRows.map((row, idx) => ({
      item_sequence: idx + 1,
      sku_code: row.sku_code,
      goods_description: row.goods_description,
      brand: row.brand,
      model: row.model,
      item_quantity: row.item_quantity,
      uom_code: row.uom_code,
      unit_price_usd: row.unit_price_usd,
      cif_value_usd: row.cif_value_usd,
      fob_value_usd: row.fob_value_usd,
      freight_usd: row.freight_usd,
      insurance_usd: row.insurance_usd,
      currency: row.currency,
      country_of_origin: row.country_of_origin,
      manufacturer_name: row.manufacturer_name,
      supplier_name: row.supplier_name,
      invoice_number: row.invoice_number,
      invoice_line_no: row.invoice_line_no,
      hs_code: row.hs_code || '0000.00.00',
      bm_rate_percent: row.bm_rate_percent,
      ppn_rate_percent: row.ppn_rate_percent,
      pph_rate_percent: row.pph_rate_percent,
      classification_source: row.matched_sku_master ? 'SKU_INTELLIGENCE' : 'FILE_IMPORT',
      classification_rationale: row.matched_sku_master ? 'Matched from master SKU intelligence' : 'Imported from commercial invoice'
    }));
  }
}
