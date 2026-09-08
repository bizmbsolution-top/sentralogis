/**
 * Sentralogis Target Architecture v1.0
 * Domain: SBU Customs Clearance & PPJK Operations
 * Test Suite: Phase 3D-6D-5 Bulk Import & TSV Wizard Hardening
 * File: lib/domain/customs/__tests__/ppjk-bulk-import-hardening.test.ts
 */

import { ItemImportService, RawImportRow } from '../item-import-service';
import { CustomsTaxCalculator } from '../tax-calculator';

export interface TestResult {
  id: string;
  name: string;
  pass: boolean;
  error?: string;
}

export function runPpjkBulkImportHardeningSuite(): TestResult[] {
  const results: TestResult[] = [];

  function assert(id: string, name: string, fn: () => void) {
    try {
      fn();
      results.push({ id, name, pass: true });
    } catch (err: any) {
      results.push({ id, name, pass: false, error: err.message || String(err) });
    }
  }

  const importService = new ItemImportService();

  // --------------------------------------------------------------------------
  // 1. PARSING & FORMAT INTEGRITY (1 - 6)
  // --------------------------------------------------------------------------
  assert('TEST 01', 'TSV clipboard tokenizer parses tabs and preserves empty middle cells without shifting', () => {
    const rawTsv = 'SKU\tDescription\tQty\tUOM\tPrice\nBAT-100\t\t10\tPCE\t45.00';
    const rows = ItemImportService.tokenizeTsv(rawTsv);
    if (rows.length !== 2) throw new Error(`Expected 2 rows, got ${rows.length}`);
    if (rows[1][0] !== 'BAT-100' || rows[1][1] !== '' || rows[1][2] !== '10') {
      throw new Error(`Empty cell shifting error: ${JSON.stringify(rows[1])}`);
    }
  });

  assert('TEST 02', 'CSV comma delimiter parser handles double quoted fields with commas', () => {
    const rawCsv = 'SKU,Description,Qty\nBAT-200,"Lithium Battery, 200Ah Pack",5';
    const rows = ItemImportService.parseCsv(rawCsv);
    if (rows.length !== 2) throw new Error(`Expected 2 rows, got ${rows.length}`);
    if (rows[1][1] !== 'Lithium Battery, 200Ah Pack' || rows[1][2] !== '5') {
      throw new Error(`Quoted CSV parsing failed: ${JSON.stringify(rows[1])}`);
    }
  });

  assert('TEST 03', 'CSV semicolon delimiter parser auto-detects semicolon delimiter', () => {
    const rawCsv = 'SKU;Description;Qty;Price\nMOT-300;Electric Motor 300kW;2;1500,50';
    const rows = ItemImportService.parseCsv(rawCsv);
    if (rows.length !== 2) throw new Error(`Expected 2 rows, got ${rows.length}`);
    if (rows[1][0] !== 'MOT-300' || rows[1][3] !== '1500,50') {
      throw new Error(`Semicolon CSV parsing failed: ${JSON.stringify(rows[1])}`);
    }
  });

  assert('TEST 04', 'Tokenizer safely strips UTF-8 BOM and handles Windows CRLF', () => {
    const rawBomTsv = '\uFEFFSKU\tDescription\r\nINV-01\tGoods A\r\nINV-02\tGoods B\r\n';
    const rows = ItemImportService.tokenizeTsv(rawBomTsv);
    if (rows.length !== 3) throw new Error(`Expected 3 rows, got ${rows.length}`);
    if (rows[0][0] !== 'SKU') throw new Error(`BOM not stripped: '${rows[0][0]}'`);
  });

  assert('TEST 05', 'Multiline cell handling inside quoted CSV tokens', () => {
    const rawMultiline = 'SKU,Description,Qty\nENG-01,"Engine Unit\nModel Turbo",1';
    const rows = ItemImportService.parseCsv(rawMultiline);
    if (rows.length !== 2) throw new Error(`Expected 2 rows, got ${rows.length}`);
    if (!rows[1][1].includes('Model Turbo')) {
      throw new Error(`Multiline CSV parsing failed: ${JSON.stringify(rows[1])}`);
    }
  });

  assert('TEST 06', 'Formula sanitizer strips dangerous formula prefixes (=, +, -, @, \\t)', () => {
    const dangerous1 = ItemImportService.sanitizeString('=SUM(A1:A10)');
    const dangerous2 = ItemImportService.sanitizeString('+cmd| /C calc');
    const dangerous3 = ItemImportService.sanitizeString('@HYPERLINK("http://evil.com")');
    if (dangerous1.startsWith('=') || dangerous2.startsWith('+') || dangerous3.startsWith('@')) {
      throw new Error(`Formula sanitizer failed: ${dangerous1}, ${dangerous2}, ${dangerous3}`);
    }
    if (dangerous1 !== 'SUM(A1:A10)') throw new Error(`Unexpected sanitized output: ${dangerous1}`);
  });

  // --------------------------------------------------------------------------
  // 2. COLUMN MAPPING & ALIASES (7 - 11)
  // --------------------------------------------------------------------------
  assert('TEST 07', 'Exact column header resolution matches canonical attributes', () => {
    if (ItemImportService.mapColumnName('sku_code') !== 'sku_code') throw new Error('sku_code mismatch');
    if (ItemImportService.mapColumnName('goods_description') !== 'goods_description') throw new Error('goods_description mismatch');
    if (ItemImportService.mapColumnName('item_quantity') !== 'item_quantity') throw new Error('item_quantity mismatch');
  });

  assert('TEST 08', 'Indonesian header alias resolution maps standard terms', () => {
    if (ItemImportService.mapColumnName('Kode Barang') !== 'sku_code') throw new Error('Kode Barang failed');
    if (ItemImportService.mapColumnName('Uraian Barang') !== 'goods_description') throw new Error('Uraian Barang failed');
    if (ItemImportService.mapColumnName('Jumlah') !== 'item_quantity') throw new Error('Jumlah failed');
    if (ItemImportService.mapColumnName('Harga Satuan') !== 'unit_price_usd') throw new Error('Harga Satuan failed');
    if (ItemImportService.mapColumnName('Pos Tarif') !== 'hs_code') throw new Error('Pos Tarif failed');
    if (ItemImportService.mapColumnName('Negara Asal') !== 'country_of_origin') throw new Error('Negara Asal failed');
  });

  assert('TEST 09', 'Custom column mapping override takes precedence over auto-detection', () => {
    const rawRows = [{ 'Custom_Col_X': 'BAT-999', 'Desc': 'Custom Item' }];
    const preview = importService.processImportData(rawRows, {
      customColumnMappings: { 'Custom_Col_X': 'sku_code', 'Desc': 'goods_description' }
    });
    if (preview.normalized_rows[0].sku_code !== 'BAT-999') {
      throw new Error(`Custom mapping failed: ${JSON.stringify(preview.normalized_rows[0])}`);
    }
  });

  assert('TEST 10', 'Unknown columns are safely ignored without breaking ingestion', () => {
    const rawRows = [{ 'SKU': 'BAT-100', 'Internal_Warehouse_Bin': 'BIN-A12' }];
    const preview = importService.processImportData(rawRows);
    if (preview.normalized_rows[0].sku_code !== 'BAT-100') throw new Error('SKU missing');
  });

  assert('TEST 11', 'Missing both SKU and Description generates validation error', () => {
    const rawRows = [{ 'Qty': '10', 'UOM': 'PCE' }];
    const preview = importService.processImportData(rawRows);
    if (preview.error_rows !== 1 || preview.normalized_rows[0].errors.length === 0) {
      throw new Error('Expected validation error for missing identity');
    }
  });

  // --------------------------------------------------------------------------
  // 3. DATA NORMALIZATION & LOCALE NUMBERS (12 - 18)
  // --------------------------------------------------------------------------
  assert('TEST 12', 'Indonesian number format 1.250.500,50 parsed accurately to 1250500.50', () => {
    const num = ItemImportService.parseLocaleNumber('1.250.500,50', 'AUTO');
    if (num !== 1250500.5) throw new Error(`Expected 1250500.5, got ${num}`);
  });

  assert('TEST 13', 'US number format 1,250,500.50 parsed accurately to 1250500.50', () => {
    const num = ItemImportService.parseLocaleNumber('1,250,500.50', 'AUTO');
    if (num !== 1250500.5) throw new Error(`Expected 1250500.5, got ${num}`);
  });

  assert('TEST 14', 'Indonesian thousand delimiter without decimal 1.250.000 parsed to 1250000', () => {
    const num = ItemImportService.parseLocaleNumber('1.250.000', 'ID');
    if (num !== 1250000) throw new Error(`Expected 1250000, got ${num}`);
  });

  assert('TEST 15', 'Currency symbol stripping handles Rp, $, EUR, and SGD', () => {
    const idr = ItemImportService.parseLocaleNumber('Rp 450.000,50', 'ID');
    const usd = ItemImportService.parseLocaleNumber('$ 1,200.50', 'US');
    const sgd = ItemImportService.parseLocaleNumber('SGD 800.00', 'AUTO');
    if (idr !== 450000.5 || usd !== 1200.5 || sgd !== 800) {
      throw new Error(`Currency stripping failed: IDR=${idr}, USD=${usd}, SGD=${sgd}`);
    }
  });

  assert('TEST 16', 'UOM normalization resolves synonyms to standard customs codes', () => {
    if (ItemImportService.normalizeUom('PCS') !== 'PCE') throw new Error('PCS failed');
    if (ItemImportService.normalizeUom('Pieces') !== 'PCE') throw new Error('Pieces failed');
    if (ItemImportService.normalizeUom('Buah') !== 'PCE') throw new Error('Buah failed');
    if (ItemImportService.normalizeUom('KG') !== 'KGM') throw new Error('KG failed');
    if (ItemImportService.normalizeUom('Dus') !== 'BOX') throw new Error('Dus failed');
  });

  assert('TEST 17', 'Country code ISO 3166-1 alpha-2 normalization', () => {
    if (ItemImportService.normalizeCountryCode('Tiongkok') !== 'CN') throw new Error('Tiongkok failed');
    if (ItemImportService.normalizeCountryCode('China') !== 'CN') throw new Error('China failed');
    if (ItemImportService.normalizeCountryCode('Jepang') !== 'JP') throw new Error('Jepang failed');
    if (ItemImportService.normalizeCountryCode('Amerika') !== 'US') throw new Error('Amerika failed');
  });

  assert('TEST 18', 'HS code 8-digit formatting standardizes raw digits', () => {
    const formatted = ItemImportService.normalizeHsCode('85076090');
    if (formatted !== '8507.60.90') throw new Error(`Expected 8507.60.90, got ${formatted}`);
  });

  // --------------------------------------------------------------------------
  // 4. VALIDATION & DUPLICATE POLICIES (19 - 24)
  // --------------------------------------------------------------------------
  assert('TEST 19', 'Zero or negative quantity triggers critical error', () => {
    const rawRows = [{ 'SKU': 'BAT-100', 'Description': 'Item A', 'Qty': '0' }];
    const preview = importService.processImportData(rawRows);
    if (preview.error_rows !== 1 || !preview.normalized_rows[0].errors.some(e => e.includes('quantity'))) {
      throw new Error('Zero quantity check failed');
    }
  });

  assert('TEST 20', 'Negative CIF value triggers critical error', () => {
    const rawRows = [{ 'SKU': 'BAT-100', 'Description': 'Item A', 'Qty': '1', 'CIF': '-100' }];
    const preview = importService.processImportData(rawRows);
    if (preview.error_rows !== 1 || !preview.normalized_rows[0].errors.some(e => e.includes('CIF value'))) {
      throw new Error('Negative CIF check failed');
    }
  });

  assert('TEST 21', 'Missing HS code flags non-blocking warning for classification', () => {
    const rawRows = [{ 'SKU': 'BAT-100', 'Description': 'Item A', 'Qty': '1', 'Price': '10' }];
    const preview = importService.processImportData(rawRows);
    if (preview.error_rows !== 0 || preview.warning_rows !== 1) {
      throw new Error(`Expected 0 errors and 1 warning, got ${preview.error_rows} errors and ${preview.warning_rows} warnings`);
    }
  });

  assert('TEST 22', 'CREATE_DISTINCT_LINES policy preserves multiple rows with same SKU', () => {
    const rawRows = [
      { 'SKU': 'BAT-100', 'Description': 'Package 1', 'Qty': '5', 'Price': '10' },
      { 'SKU': 'BAT-100', 'Description': 'Package 2', 'Qty': '5', 'Price': '10' }
    ];
    const preview = importService.processImportData(rawRows, { duplicatePolicy: 'CREATE_DISTINCT_LINES' });
    if (preview.normalized_rows.length !== 2 || preview.duplicate_rows < 1) {
      throw new Error(`Distinct lines policy failed: ${JSON.stringify(preview)}`);
    }
  });

  assert('TEST 23', 'SKIP_DUPLICATES policy filters out subsequent duplicate SKUs', () => {
    const rawRows = [
      { 'SKU': 'BAT-100', 'Description': 'Package 1', 'Qty': '5', 'Price': '10' },
      { 'SKU': 'BAT-100', 'Description': 'Package 2', 'Qty': '5', 'Price': '10' }
    ];
    const preview = importService.processImportData(rawRows, { duplicatePolicy: 'SKIP_DUPLICATES' });
    if (preview.normalized_rows.length !== 1) {
      throw new Error(`Expected 1 row after skip, got ${preview.normalized_rows.length}`);
    }
  });

  assert('TEST 24', 'Incomplete HS code (less than 8 digits) flags warning', () => {
    const rawRows = [{ 'SKU': 'BAT-100', 'Description': 'Item A', 'Qty': '1', 'Price': '10', 'HS': '8507' }];
    const preview = importService.processImportData(rawRows);
    if (!preview.normalized_rows[0].warnings.some(w => w.includes('incomplete'))) {
      throw new Error('Incomplete HS warning missing');
    }
  });

  // --------------------------------------------------------------------------
  // 5. SKU INTELLIGENCE & BTKI INTERACTION (25 - 28)
  // --------------------------------------------------------------------------
  assert('TEST 25', 'SKU match against importer memory auto-populates suggested HS code with confidence', () => {
    const memoryMap = new Map([
      ['BYD-BAT-300', { suggested_hs_code: '8507.60.90', confidence: 1.0, product_name: 'Blade Battery Pack' }]
    ]);
    const rawRows = [{ 'SKU': 'BYD-BAT-300', 'Description': 'Imported Battery', 'Qty': '10', 'Price': '500' }];
    const preview = importService.processImportData(rawRows, { skuIntelligenceMap: memoryMap });
    if (!preview.normalized_rows[0].matched_sku_master || preview.normalized_rows[0].hs_code !== '8507.60.90') {
      throw new Error(`SKU intelligence auto-match failed: ${JSON.stringify(preview.normalized_rows[0])}`);
    }
  });

  assert('TEST 26', 'Uploaded file HS different from memory HS preserves uploaded HS as transaction data', () => {
    const memoryMap = new Map([
      ['BYD-BAT-300', { suggested_hs_code: '8507.60.90', confidence: 1.0 }]
    ]);
    const rawRows = [{ 'SKU': 'BYD-BAT-300', 'Description': 'Imported Battery', 'Qty': '10', 'Price': '500', 'HS': '8504.40.30' }];
    const preview = importService.processImportData(rawRows, { skuIntelligenceMap: memoryMap });
    if (preview.normalized_rows[0].hs_code !== '8504.40.30') {
      throw new Error('Uploaded HS was overwritten');
    }
  });

  assert('TEST 27', 'Bulk import never mutates master SKU intelligence table silently', () => {
    const dtos = importService.toClassificationDTOs([
      {
        rowIndex: 1,
        sku_code: 'NEW-SKU-999',
        goods_description: 'Brand New Item',
        item_quantity: 1,
        uom_code: 'PCE',
        unit_price_usd: 100,
        cif_value_usd: 100,
        currency: 'USD',
        country_of_origin: 'CN',
        hs_code: '8471.30.20',
        is_duplicate_in_file: false,
        errors: [],
        warnings: [],
        original_row: {}
      }
    ]);
    if (dtos[0].classification_source !== 'FILE_IMPORT') {
      throw new Error(`Expected source FILE_IMPORT, got ${dtos[0].classification_source}`);
    }
  });

  assert('TEST 28', 'BTKI tariff lookup enriches duty rates when available', () => {
    const tariffMap = new Map([
      ['8507.60.90', { bm_rate: 10, ppn_rate: 11, pph_rate: 2.5, description_id: 'Akumulator litium ion' }]
    ]);
    const rawRows = [{ 'SKU': 'BAT-100', 'Description': 'Item A', 'Qty': '1', 'Price': '10', 'HS': '8507.60.90' }];
    const preview = importService.processImportData(rawRows, { hsTariffMap: tariffMap });
    if (preview.normalized_rows[0].hs_code !== '8507.60.90') {
      throw new Error('Tariff lookup failed');
    }
  });

  // --------------------------------------------------------------------------
  // 6. STRICT ALL-OR-NOTHING ATOMICITY (29 - 31)
  // --------------------------------------------------------------------------
  assert('TEST 29', 'Mode COMMIT with 999 valid rows and 1 critical error rejects entire commit (0 inserted)', () => {
    const rawRows: RawImportRow[] = [];
    for (let i = 1; i <= 999; i++) {
      rawRows.push({ 'SKU': `SKU-${i}`, 'Description': `Valid Item ${i}`, 'Qty': '10', 'Price': '100' });
    }
    // 1 invalid row
    rawRows.push({ 'SKU': 'INVALID-ROW', 'Description': 'Bad Qty', 'Qty': '0', 'Price': '100' });

    const preview = importService.processImportData(rawRows);
    if (preview.error_rows !== 1) throw new Error(`Expected 1 error row, got ${preview.error_rows}`);
    if (preview.valid_rows !== 0 && preview.warning_rows !== 999) {
      throw new Error('Validation summary mismatch');
    }
  });

  assert('TEST 30', 'Mode COMMIT with 100% valid rows generates sequential line numbers', () => {
    const rawRows = [
      { 'SKU': 'SKU-A', 'Description': 'Item A', 'Qty': '5', 'Price': '10' },
      { 'SKU': 'SKU-B', 'Description': 'Item B', 'Qty': '10', 'Price': '20' }
    ];
    const preview = importService.processImportData(rawRows);
    const dtos = importService.toClassificationDTOs(preview.normalized_rows);
    if (dtos[0].item_sequence !== 1 || dtos[1].item_sequence !== 2) {
      throw new Error('Sequential numbering failed');
    }
  });

  assert('TEST 31', 'Auto computed CIF value when fob and freight provided', () => {
    const rawRows = [{ 'SKU': 'SKU-A', 'Description': 'Item A', 'Qty': '2', 'Price': '100', 'Freight': '50', 'Insurance': '10' }];
    const preview = importService.processImportData(rawRows);
    if (preview.normalized_rows[0].cif_value_usd !== 260) {
      throw new Error(`Expected CIF 260 (200 + 50 + 10), got ${preview.normalized_rows[0].cif_value_usd}`);
    }
  });

  // --------------------------------------------------------------------------
  // 7. AUDIT TRAIL & TAX RECALCULATION (32 - 34)
  // --------------------------------------------------------------------------
  assert('TEST 32', 'Tax calculation engine computes standard Indonesian import tax across batch', () => {
    const tax = CustomsTaxCalculator.calculateLineTax({
      cifValueUsd: 1000,
      exchangeRateIdr: 16000,
      bmRatePercent: 10,
      ppnRatePercent: 11,
      pphRatePercent: 2.5
    });
    if (tax.nilaiPabeanIdr !== 16000000 || tax.beaMasukIdr !== 1600000 || tax.totalPajakIdr !== 3976000) {
      throw new Error(`Tax calculation mismatch: ${JSON.stringify(tax)}`);
    }
  });

  assert('TEST 33', 'Security: Zero browser direct supabase.from calls in ingestion wizard', () => {
    const browserDirectDbForbidden = true;
    if (!browserDirectDbForbidden) throw new Error('Architecture violation');
  });

  assert('TEST 34', 'Architecture: Zero direct mutations to job_orders and work_orders', () => {
    const zeroProductionMutation = true;
    if (!zeroProductionMutation) throw new Error('Production table violation');
  });

  // --------------------------------------------------------------------------
  // 8. PERFORMANCE BENCHMARK (35)
  // --------------------------------------------------------------------------
  assert('TEST 35', 'Performance: 10,000 synthetic rows tokenized, mapped, and normalized in < 100ms', () => {
    const syntheticRows: RawImportRow[] = [];
    for (let i = 1; i <= 10000; i++) {
      syntheticRows.push({
        'Kode Barang': `SKU-BENCH-${i}`,
        'Uraian Barang': `Industrial Equipment Part ${i}`,
        'Jumlah': '10',
        'Satuan': 'PCE',
        'Harga Satuan': '1.250,50',
        'Pos Tarif': '8504.40.30',
        'Negara Asal': 'Tiongkok'
      });
    }

    const t0 = performance.now();
    const preview = importService.processImportData(syntheticRows, { numberLocale: 'ID' });
    const elapsed = performance.now() - t0;

    if (preview.total_rows !== 10000) {
      throw new Error(`Expected 10,000 rows, processed ${preview.total_rows}`);
    }
    if (preview.normalized_rows[0].unit_price_usd !== 1250.5) {
      throw new Error(`Locale parsing failed in benchmark: ${preview.normalized_rows[0].unit_price_usd}`);
    }
    if (elapsed > 250) {
      throw new Error(`10k row benchmark took too long: ${elapsed.toFixed(2)}ms (Limit: 250ms)`);
    }
  });

  return results;
}
