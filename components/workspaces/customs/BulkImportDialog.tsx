'use client';

import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { ItemImportService } from '@/lib/domain/customs/item-import-service';
import { Button } from '@/components/ui/Button';
import GradientButton from '@/components/ui/GradientButton';
import {
  X,
  Upload,
  Clipboard,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Check
} from 'lucide-react';

interface BulkImportDialogProps {
  declarationId: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type WizardStage = 'SOURCE' | 'MAPPING' | 'OPTIONS' | 'PREVIEW' | 'CONFIRM' | 'RESULT';

const CANONICAL_FIELD_OPTIONS = [
  { value: 'sku_code', label: 'SKU Code (Kode Barang)', required: true },
  { value: 'goods_description', label: 'Goods Description (Uraian Barang)', required: true },
  { value: 'item_quantity', label: 'Quantity (Jumlah)', required: true },
  { value: 'uom_code', label: 'UOM / Satuan', required: true },
  { value: 'unit_price_usd', label: 'Unit Price USD (Harga Satuan)', required: true },
  { value: 'cif_value_usd', label: 'CIF Value USD (Total Nilai Pabean)', required: false },
  { value: 'hs_code', label: 'HS Code / Pos Tarif (8-Digit)', required: false },
  { value: 'country_of_origin', label: 'Country of Origin (Negara Asal)', required: false },
  { value: 'invoice_number', label: 'Invoice Number (Nomor Invoice)', required: false },
  { value: 'brand', label: 'Brand / Merek', required: false },
  { value: 'model', label: 'Model / Tipe', required: false },
  { value: 'manufacturer_name', label: 'Manufacturer (Pabrikan)', required: false },
  { value: 'supplier_name', label: 'Supplier (Pemasok)', required: false },
  { value: 'currency', label: 'Currency (Mata Uang)', required: false },
  { value: 'IGNORE', label: '-- Do Not Import (Abaikan Kolom) --', required: false }
];

export function BulkImportDialog({
  declarationId,
  isOpen,
  onClose,
  onSuccess
}: BulkImportDialogProps) {
  const [stage, setStage] = useState<WizardStage>('SOURCE');
  const [sourceType, setSourceType] = useState<'FILE' | 'CLIPBOARD'>('CLIPBOARD');
  const [pastedText, setPastedText] = useState('');
  const [fileName, setFileName] = useState('');
  
  // Ingested raw table data
  const [rawHeaders, setRawHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, any>[]>([]);
  const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});
  
  // Options
  const [numberLocale, setNumberLocale] = useState<'AUTO' | 'ID' | 'US'>('AUTO');
  const [defaultOrigin, setDefaultOrigin] = useState('CN');
  const [defaultCurrency, setDefaultCurrency] = useState('USD');
  const [duplicatePolicy, setDuplicatePolicy] = useState<'CREATE_DISTINCT_LINES' | 'SKIP_DUPLICATES' | 'REPLACE_EXISTING'>('CREATE_DISTINCT_LINES');
  
  // Preview & Results
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [previewFilter, setPreviewFilter] = useState<'ALL' | 'VALID' | 'ERRORS' | 'WARNINGS' | 'SKU_MATCHED' | 'DUPLICATES'>('ALL');
  const [loading, setLoading] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [commitResult, setCommitResult] = useState<any>(null);

  if (!isOpen) return null;

  // --------------------------------------------------------------------------
  // STAGE 1: PARSING & SOURCE INGESTION
  // --------------------------------------------------------------------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError(null);
    setLoading(true);

    const reader = new FileReader();
    reader.onload = async evt => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const jsonRows: any[] = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (!jsonRows || jsonRows.length === 0) {
          throw new Error('File tidak memiliki baris data atau kosong.');
        }

        const headers = Object.keys(jsonRows[0]);
        setRawHeaders(headers);
        setRawRows(jsonRows);

        // Auto map headers
        const autoMappings: Record<string, string> = {};
        headers.forEach(h => {
          const canonical = ItemImportService.mapColumnName(h);
          if (canonical) autoMappings[h] = canonical;
        });
        setColumnMappings(autoMappings);
        setStage('MAPPING');
      } catch (err: any) {
        setError(err.message || 'Gagal membaca format file Excel / CSV.');
      } finally {
        setLoading(false);
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleParseClipboard = () => {
    if (!pastedText.trim()) return;

    setError(null);
    setLoading(true);

    try {
      const rows = ItemImportService.tokenizeTsv(pastedText);
      if (rows.length < 2) {
        throw new Error('Data clipboard harus memiliki baris header dan minimal 1 baris data.');
      }

      const headers = rows[0].map((h, i) => h.trim() || `Column_${i + 1}`);
      const dataRows = rows.slice(1).map(cols => {
        const rowObj: Record<string, any> = {};
        headers.forEach((h, idx) => {
          rowObj[h] = cols[idx] || '';
        });
        return rowObj;
      });

      setRawHeaders(headers);
      setRawRows(dataRows);

      // Auto map headers
      const autoMappings: Record<string, string> = {};
      headers.forEach(h => {
        const canonical = ItemImportService.mapColumnName(h);
        if (canonical) autoMappings[h] = canonical;
      });
      setColumnMappings(autoMappings);
      setStage('MAPPING');
    } catch (err: any) {
      setError(err.message || 'Gagal mengurai teks clipboard TSV.');
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // STAGE 4: RUN SERVER-SIDE PREVIEW VALIDATION
  // --------------------------------------------------------------------------
  const runPreviewValidation = async () => {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/v1/customs/declarations/${declarationId}/items/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'PREVIEW',
          source: sourceType === 'FILE' ? 'XLSX' : 'TSV_CLIPBOARD',
          rows: rawRows,
          numberLocale,
          defaultOrigin,
          defaultCurrency,
          customColumnMappings: columnMappings,
          duplicatePolicy
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error?.message || 'Gagal memproses validasi pratinjau import.');
      }

      const json = await res.json();
      setPreviewResult(json.data);
      setStage('PREVIEW');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------------------------
  // STAGE 6: ATOMIC COMMIT
  // --------------------------------------------------------------------------
  const handleCommit = async () => {
    setCommitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/customs/declarations/${declarationId}/items/bulk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'idempotency-key': `commit_${declarationId}_${Date.now()}`
        },
        body: JSON.stringify({
          mode: 'COMMIT',
          source: sourceType === 'FILE' ? 'XLSX' : 'TSV_CLIPBOARD',
          rows: rawRows,
          numberLocale,
          defaultOrigin,
          defaultCurrency,
          customColumnMappings: columnMappings,
          duplicatePolicy
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error?.message || 'Gagal menyimpan transaksi bulk import.');
      }

      const json = await res.json();
      setCommitResult(json.data);
      setStage('RESULT');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCommitting(false);
    }
  };

  // Filter preview rows
  const filteredNormalizedRows = (previewResult?.preview?.normalized_rows || []).filter((r: any) => {
    if (previewFilter === 'VALID') return r.errors.length === 0;
    if (previewFilter === 'ERRORS') return r.errors.length > 0;
    if (previewFilter === 'WARNINGS') return r.warnings.length > 0;
    if (previewFilter === 'SKU_MATCHED') return r.matched_sku_master;
    if (previewFilter === 'DUPLICATES') return r.is_duplicate_in_file;
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-white">
                  Bulk Item Ingestion & SKU Intelligence Wizard
                </h2>
                <span className="text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                  Step {stage === 'SOURCE' ? 1 : stage === 'MAPPING' ? 2 : stage === 'OPTIONS' ? 3 : stage === 'PREVIEW' ? 4 : stage === 'CONFIRM' ? 5 : 6} of 6
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Deterministic ingestion pipeline with dynamic mapping, locale numbers, and atomic audit logging
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Wizard Stepper Bar */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 py-2.5 gap-4 text-xs font-semibold text-slate-500 overflow-x-auto">
          {[
            { id: 'SOURCE', label: '1. Source' },
            { id: 'MAPPING', label: '2. Column Mapping' },
            { id: 'OPTIONS', label: '3. Options & Locale' },
            { id: 'PREVIEW', label: '4. Deep Validation' },
            { id: 'CONFIRM', label: '5. Confirmation' },
            { id: 'RESULT', label: '6. Receipt' }
          ].map((s, idx) => (
            <div
              key={s.id}
              className={`flex items-center gap-1.5 whitespace-nowrap ${
                stage === s.id
                  ? 'text-indigo-700 font-bold'
                  : idx < ['SOURCE', 'MAPPING', 'OPTIONS', 'PREVIEW', 'CONFIRM', 'RESULT'].indexOf(stage)
                  ? 'text-emerald-700'
                  : 'text-slate-400'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  stage === s.id
                    ? 'bg-indigo-600 text-white'
                    : idx < ['SOURCE', 'MAPPING', 'OPTIONS', 'PREVIEW', 'CONFIRM', 'RESULT'].indexOf(stage)
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : 'bg-slate-200 text-slate-600'
                }`}
              >
                {idx + 1}
              </div>
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="mx-6 mt-4 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2.5">
            <AlertOctagon size={16} className="text-rose-600 shrink-0" />
            <div className="font-medium">{error}</div>
          </div>
        )}

        {/* Wizard Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ---------------------------------------------------------------- */}
          {/* STAGE 1: SOURCE INGESTION */}
          {/* ---------------------------------------------------------------- */}
          {stage === 'SOURCE' && (
            <div className="space-y-6">
              <div className="flex border-b border-slate-200 gap-2">
                <button
                  onClick={() => setSourceType('CLIPBOARD')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-t border-x ${
                    sourceType === 'CLIPBOARD'
                      ? 'bg-white text-indigo-700 border-slate-200 -mb-px'
                      : 'bg-transparent text-slate-500 border-transparent hover:text-slate-900'
                  }`}
                >
                  <Clipboard size={14} /> Paste from Excel / Google Sheets
                </button>
                <button
                  onClick={() => setSourceType('FILE')}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-colors border-t border-x ${
                    sourceType === 'FILE'
                      ? 'bg-white text-indigo-700 border-slate-200 -mb-px'
                      : 'bg-transparent text-slate-500 border-transparent hover:text-slate-900'
                  }`}
                >
                  <Upload size={14} /> Upload Spreadsheet (.xlsx, .xls, .csv)
                </button>
              </div>

              {sourceType === 'CLIPBOARD' ? (
                <div className="space-y-3">
                  <label className="text-xs font-bold text-slate-700 block">
                    Copy range directly from your spreadsheet (including header row) and paste below:
                  </label>
                  <textarea
                    rows={9}
                    value={pastedText}
                    onChange={e => setPastedText(e.target.value)}
                    placeholder="SKU&#9;Description&#9;Quantity&#9;UOM&#9;Unit Price&#9;HS Code&#9;Origin&#9;Invoice&#10;BAT-300&#9;Lithium Battery 300Ah&#9;10&#9;PCE&#9;450.00&#9;8507.60.90&#9;CN&#9;INV-2026-001"
                    className="w-full text-xs font-mono p-4 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50 leading-relaxed outline-hidden"
                  />
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>
                      {pastedText.trim() ? `${pastedText.trim().split(/\r?\n/).length} lines detected` : 'Waiting for clipboard paste'}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Supports empty columns, tab indentation, and multiline cells
                    </span>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 rounded-3xl p-10 text-center hover:border-indigo-400 transition-colors bg-slate-50/50">
                    <input
                      type="file"
                      id="file-upload"
                      accept=".xlsx, .xls, .csv"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                        <Upload size={28} />
                      </div>
                      <span className="text-sm font-bold text-slate-800">
                        {fileName || 'Click to browse or drop commercial invoice spreadsheet'}
                      </span>
                      <span className="text-xs text-slate-400 mt-1">
                        Compatible with .xlsx, .xls, and .csv (up to 15 MB)
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* STAGE 2: DYNAMIC COLUMN MAPPING */}
          {/* ---------------------------------------------------------------- */}
          {stage === 'MAPPING' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-800">Review & Map Detected Columns</h3>
                  <p className="text-xs text-slate-500">
                    Verify how each spreadsheet column corresponds to canonical customs declaration fields.
                  </p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200">
                  {rawHeaders.length} Columns · {rawRows.length} Rows
                </span>
              </div>

              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100/75 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-2.5">Source Header</th>
                      <th className="px-4 py-2.5">Sample Value (Row 1)</th>
                      <th className="px-4 py-2.5">Canonical Target Field</th>
                      <th className="px-4 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rawHeaders.map(header => {
                      const currentCanonical = columnMappings[header] || 'IGNORE';
                      const sampleVal = String(rawRows[0]?.[header] || '');
                      const isMapped = currentCanonical !== 'IGNORE';

                      return (
                        <tr key={header} className="hover:bg-slate-50/75 transition-colors">
                          <td className="px-4 py-2.5 font-mono font-bold text-slate-800">
                            {header}
                          </td>
                          <td className="px-4 py-2.5 font-mono text-slate-600 max-w-[180px] truncate" title={sampleVal}>
                            {sampleVal || <span className="text-slate-400 italic">(empty)</span>}
                          </td>
                          <td className="px-4 py-2.5">
                            <select
                              value={currentCanonical}
                              onChange={e => {
                                setColumnMappings(prev => ({
                                  ...prev,
                                  [header]: e.target.value
                                }));
                              }}
                              className={`w-full text-xs font-medium px-2.5 py-1.5 rounded-lg border focus:ring-2 focus:ring-indigo-500 outline-hidden ${
                                isMapped ? 'border-slate-300 bg-white text-slate-800' : 'border-slate-200 bg-slate-50 text-slate-400'
                              }`}
                            >
                              {CANONICAL_FIELD_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            {isMapped ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                                <Check size={10} /> Mapped
                              </span>
                            ) : (
                              <span className="inline-flex items-center text-[10px] font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                Ignored
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* STAGE 3: OPTIONS & LOCALE NORMALIZATION */}
          {/* ---------------------------------------------------------------- */}
          {stage === 'OPTIONS' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold text-slate-800">Configure Ingestion & Locale Normalization</h3>
                <p className="text-xs text-slate-500">
                  Select numerical parsing conventions and fallback defaults for incomplete records.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Number Locale */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    Number Format & Separator Convention:
                  </label>
                  <select
                    value={numberLocale}
                    onChange={e => setNumberLocale(e.target.value as any)}
                    className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="AUTO">Auto Detect (Heuristic comma & dot analysis)</option>
                    <option value="ID">Indonesian / European: 1.250.500,50 (Dot=Thousand, Comma=Decimal)</option>
                    <option value="US">US / Standard: 1,250,500.50 (Comma=Thousand, Dot=Decimal)</option>
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Automatically strips currency symbols (Rp, $, €, ¥) and handles thousand delimiters.
                  </p>
                </div>

                {/* Duplicate Policy */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    In-Batch Duplicate SKU Policy:
                  </label>
                  <select
                    value={duplicatePolicy}
                    onChange={e => setDuplicatePolicy(e.target.value as any)}
                    className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="CREATE_DISTINCT_LINES">Create Distinct Lines (Recommended for Multi-Invoice/Package)</option>
                    <option value="SKIP_DUPLICATES">Skip Subsequent Duplicate SKUs</option>
                    <option value="REPLACE_EXISTING">Replace All Prior Items in this Declaration</option>
                  </select>
                  <p className="text-[11px] text-slate-500">
                    Preserves multiple items with identical SKUs when packaged across different crates.
                  </p>
                </div>

                {/* Fallback Origin */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    Default Country of Origin (Fallback):
                  </label>
                  <select
                    value={defaultOrigin}
                    onChange={e => setDefaultOrigin(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="CN">CN - China</option>
                    <option value="JP">JP - Japan</option>
                    <option value="ID">ID - Indonesia</option>
                    <option value="US">US - United States</option>
                    <option value="SG">SG - Singapore</option>
                    <option value="KR">KR - South Korea</option>
                    <option value="DE">DE - Germany</option>
                    <option value="TH">TH - Thailand</option>
                    <option value="MY">MY - Malaysia</option>
                    <option value="VN">VN - Vietnam</option>
                  </select>
                </div>

                {/* Fallback Currency */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <label className="text-xs font-bold text-slate-800 block">
                    Default Currency (Fallback):
                  </label>
                  <select
                    value={defaultCurrency}
                    onChange={e => setDefaultCurrency(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  >
                    <option value="USD">USD - US Dollar</option>
                    <option value="IDR">IDR - Indonesian Rupiah</option>
                    <option value="EUR">EUR - Euro</option>
                    <option value="SGD">SGD - Singapore Dollar</option>
                    <option value="JPY">JPY - Japanese Yen</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* STAGE 4: DEEP VALIDATION & VIRTUALIZED PREVIEW */}
          {/* ---------------------------------------------------------------- */}
          {stage === 'PREVIEW' && previewResult && (
            <div className="space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Rows</span>
                  <span className="text-xl font-black text-slate-900">{previewResult.total_rows}</span>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">Valid Rows</span>
                  <span className="text-xl font-black text-emerald-700">{previewResult.valid_rows}</span>
                </div>
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider block">Warnings / Missing HS</span>
                  <span className="text-xl font-black text-amber-700">{previewResult.warning_rows}</span>
                </div>
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl">
                  <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Critical Errors</span>
                  <span className="text-xl font-black text-rose-700">{previewResult.error_rows}</span>
                </div>
              </div>

              {/* Filter Tabs */}
              <div className="flex border-b border-slate-200 gap-2 text-xs font-bold text-slate-600">
                <button
                  onClick={() => setPreviewFilter('ALL')}
                  className={`px-3 py-1.5 rounded-t-lg transition-colors ${previewFilter === 'ALL' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'hover:bg-slate-50'}`}
                >
                  All ({previewResult.total_rows})
                </button>
                <button
                  onClick={() => setPreviewFilter('VALID')}
                  className={`px-3 py-1.5 rounded-t-lg transition-colors ${previewFilter === 'VALID' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'hover:bg-slate-50'}`}
                >
                  Valid ({previewResult.valid_rows})
                </button>
                <button
                  onClick={() => setPreviewFilter('ERRORS')}
                  className={`px-3 py-1.5 rounded-t-lg transition-colors ${previewFilter === 'ERRORS' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'hover:bg-slate-50'}`}
                >
                  Errors ({previewResult.error_rows})
                </button>
                <button
                  onClick={() => setPreviewFilter('WARNINGS')}
                  className={`px-3 py-1.5 rounded-t-lg transition-colors ${previewFilter === 'WARNINGS' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'hover:bg-slate-50'}`}
                >
                  Warnings ({previewResult.warning_rows})
                </button>
                <button
                  onClick={() => setPreviewFilter('SKU_MATCHED')}
                  className={`px-3 py-1.5 rounded-t-lg transition-colors ${previewFilter === 'SKU_MATCHED' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'hover:bg-slate-50'}`}
                >
                  SKU Memory Matched ({previewResult.auto_matched_sku_rows})
                </button>
              </div>

              {/* Virtualized Table Preview */}
              <div className="border border-slate-200 rounded-2xl overflow-x-auto max-h-[300px] shadow-xs">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2">Row</th>
                      <th className="px-3 py-2">SKU</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2 text-right">Qty</th>
                      <th className="px-3 py-2">UOM</th>
                      <th className="px-3 py-2 text-right">Price (USD)</th>
                      <th className="px-3 py-2">HS Code</th>
                      <th className="px-3 py-2">Diagnostics</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {filteredNormalizedRows.map((r: any) => (
                      <tr key={r.rowIndex} className="hover:bg-slate-50/75 transition-colors">
                        <td className="px-3 py-2 text-slate-400">{r.rowIndex}</td>
                        <td className="px-3 py-2 font-bold text-slate-800">{r.sku_code || '-'}</td>
                        <td className="px-3 py-2 text-slate-700 max-w-[200px] truncate" title={r.goods_description}>
                          {r.goods_description}
                        </td>
                        <td className="px-3 py-2 text-right text-slate-800">{r.item_quantity}</td>
                        <td className="px-3 py-2 text-slate-600">{r.uom_code}</td>
                        <td className="px-3 py-2 text-right text-slate-800">${r.unit_price_usd.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          {r.hs_code ? (
                            <span className="font-bold text-indigo-700">{r.hs_code}</span>
                          ) : (
                            <span className="text-amber-600 italic">Missing HS</span>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          {r.errors.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                              <AlertOctagon size={10} /> {r.errors[0]}
                            </span>
                          ) : r.matched_sku_master ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                              <Sparkles size={10} /> SKU Matched
                            </span>
                          ) : r.warnings.length > 0 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                              <AlertTriangle size={10} /> {r.warnings[0]}
                            </span>
                          ) : (
                            <span className="text-emerald-600 text-[10px] font-bold">Valid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* STAGE 5: COMMIT CONFIRMATION */}
          {/* ---------------------------------------------------------------- */}
          {stage === 'CONFIRM' && previewResult && (
            <div className="space-y-6">
              <div className="p-5 bg-indigo-50/70 border border-indigo-200 rounded-3xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-indigo-600 text-white">
                    <CheckCircle2 size={24} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-indigo-950">Ready to Commit Bulk Items</h3>
                    <p className="text-xs text-indigo-700">
                      All validation checks passed. Review commit parameters before writing to the official declaration database.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-3 bg-white rounded-xl border border-indigo-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Items to Insert</span>
                    <div className="text-lg font-black text-indigo-900">{previewResult.valid_rows + previewResult.warning_rows} Lines</div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-indigo-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Duplicate Policy</span>
                    <div className="text-xs font-bold text-indigo-900 mt-1">{duplicatePolicy}</div>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-indigo-100">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">Atomicity Guarantee</span>
                    <div className="text-xs font-bold text-emerald-700 mt-1">Strict All-or-Nothing</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------- */}
          {/* STAGE 6: RESULT & AUDIT RECEIPT */}
          {/* ---------------------------------------------------------------- */}
          {stage === 'RESULT' && commitResult && (
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 size={36} />
              </div>
              <div>
                <h3 className="text-lg font-black text-slate-900">Bulk Ingestion Successfully Committed!</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Items have been persisted to the customs declaration aggregate with full tax recalculations.
                </p>
              </div>

              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl max-w-md mx-auto text-xs text-left font-mono space-y-1 text-slate-700">
                <div><span className="text-slate-400">Import ID:</span> {commitResult.import_id}</div>
                <div><span className="text-slate-400">Total Inserted:</span> {commitResult.valid_rows} rows</div>
                <div><span className="text-slate-400">Audit Status:</span> Recorded in cus_item_audit_logs</div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div>
            {stage !== 'SOURCE' && stage !== 'RESULT' && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  if (stage === 'MAPPING') setStage('SOURCE');
                  if (stage === 'OPTIONS') setStage('MAPPING');
                  if (stage === 'PREVIEW') setStage('OPTIONS');
                  if (stage === 'CONFIRM') setStage('PREVIEW');
                }}
                className="text-xs"
              >
                <ArrowLeft size={14} className="mr-1.5" /> Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-3">
            {stage === 'SOURCE' && (
              <GradientButton
                onClick={sourceType === 'CLIPBOARD' ? handleParseClipboard : undefined}
                disabled={loading || (sourceType === 'CLIPBOARD' && !pastedText.trim())}
                className="px-4 py-2 text-xs"
              >
                {loading ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <ArrowRight size={14} className="mr-1.5" />}
                Process Ingestion
              </GradientButton>
            )}

            {stage === 'MAPPING' && (
              <GradientButton onClick={() => setStage('OPTIONS')} className="px-4 py-2 text-xs">
                Continue to Options <ArrowRight size={14} className="ml-1.5" />
              </GradientButton>
            )}

            {stage === 'OPTIONS' && (
              <GradientButton onClick={runPreviewValidation} disabled={loading} className="px-4 py-2 text-xs">
                {loading ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Sparkles size={14} className="mr-1.5" />}
                Run Validation Preview
              </GradientButton>
            )}

            {stage === 'PREVIEW' && (
              <GradientButton
                onClick={() => setStage('CONFIRM')}
                disabled={previewResult?.error_rows > 0}
                className="px-4 py-2 text-xs"
              >
                Proceed to Confirm <ArrowRight size={14} className="ml-1.5" />
              </GradientButton>
            )}

            {stage === 'CONFIRM' && (
              <GradientButton onClick={handleCommit} disabled={committing} className="px-4 py-2 text-xs">
                {committing ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Check size={14} className="mr-1.5" />}
                Commit All Items to Declaration
              </GradientButton>
            )}

            {stage === 'RESULT' && (
              <Button size="sm" onClick={onClose} className="bg-slate-900 text-white hover:bg-slate-800 text-xs">
                Done & View Items
              </Button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
