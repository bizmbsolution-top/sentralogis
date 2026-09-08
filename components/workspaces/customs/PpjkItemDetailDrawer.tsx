'use client';

import React from 'react';
import { CustomsClassificationLine } from '@/lib/domain/customs/types';
import { ItemValidationBadge } from './ItemValidationBadge';
import { Button } from '@/components/ui/Button';
import {
  X,
  Boxes,
  HelpCircle,
  DollarSign,
  Globe2,
  FileText,
  ShieldAlert,
  Sparkles,
  History,
  AlertTriangle,
  CheckCircle2,
  Search,
  ExternalLink
} from 'lucide-react';

interface PpjkItemDetailDrawerProps {
  line: CustomsClassificationLine | null;
  onClose: () => void;
  onApplyHsCode: (hsCode: string) => void;
  onOpenHsLookup: () => void;
}

export function PpjkItemDetailDrawer({
  line,
  onClose,
  onApplyHsCode,
  onOpenHsLookup
}: PpjkItemDetailDrawerProps) {
  if (!line) return null;

  const totalCifUsd = (line.item_quantity || 1) * (line.unit_price_usd || line.cif_value_usd || 0);
  const totalTaxIdr = (line.calculated_bm_idr || 0) + (line.calculated_ppn_idr || 0) + (line.calculated_pph_idr || 0);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div
        className="w-full max-w-xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 animate-in slide-in-from-right duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-500/30 text-indigo-300 border border-indigo-400/30">
                Item Line #{line.item_sequence || 1}
              </span>
              <ItemValidationBadge
                status={line.validation_status}
                hasError={!line.hs_code || !line.goods_description}
                hasWarning={Boolean(line.lartas_flag || line.price_anomaly_flag)}
                lartas={line.lartas_flag}
                priceAnomaly={line.price_anomaly_flag}
              />
            </div>
            <h2 className="text-base font-black font-mono tracking-tight text-white">
              {line.sku_code || 'UNTITLED-SKU'}
            </h2>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-700">
          {/* 1. Product Identity */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Boxes size={14} className="text-indigo-600" />
              Product Identification
            </h3>
            <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 border border-slate-200/80">
              <div>
                <span className="text-[11px] text-slate-400 block">Goods Description (Nama Barang)</span>
                <span className="font-bold text-slate-900 text-sm">{line.goods_description || '—'}</span>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                <div>
                  <span className="text-[10px] text-slate-400 block">Brand (Merek)</span>
                  <span className="font-semibold text-slate-800">{line.brand || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Model / Tipe</span>
                  <span className="font-semibold text-slate-800">{line.model || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Classification & HS Code */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <HelpCircle size={14} className="text-indigo-600" />
                Customs Classification (BTKI)
              </h3>
              <Button
                size="sm"
                variant="secondary"
                onClick={onOpenHsLookup}
                className="h-6 text-[11px] font-bold border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-2"
              >
                <Search size={11} className="mr-1" /> Lookup HS
              </Button>
            </div>

            <div className="p-3.5 bg-indigo-50/50 rounded-xl space-y-2.5 border border-indigo-200/70">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold block">Pos Tarif HS 8-Digit</span>
                  <span className="font-mono font-black text-base text-indigo-900">
                    {line.hs_code || <span className="text-red-500 italic">BELUM DIKLASIFIKASIKAN</span>}
                  </span>
                </div>
                {line.classification_confidence !== undefined && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-indigo-100 text-indigo-800">
                    {line.classification_confidence}% Confidence
                  </span>
                )}
              </div>

              {line.hs_description_snapshot && (
                <p className="text-[11px] text-slate-700 italic bg-white/60 p-2 rounded-lg border border-indigo-100">
                  {line.hs_description_snapshot}
                </p>
              )}

              <div className="grid grid-cols-3 gap-2 pt-1 border-t border-indigo-100 text-center">
                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                  <span className="text-[10px] text-slate-400 block">Bea Masuk</span>
                  <span className="font-mono font-bold text-slate-900">{line.bm_rate_percent || 0}%</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                  <span className="text-[10px] text-slate-400 block">PPN Impor</span>
                  <span className="font-mono font-bold text-slate-900">{line.ppn_rate_percent || 11}%</span>
                </div>
                <div className="p-2 bg-white rounded-lg border border-indigo-100">
                  <span className="text-[10px] text-slate-400 block">PPh Pasal 22</span>
                  <span className="font-mono font-bold text-slate-900">{line.pph_rate_percent || 2.5}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Valuation & Taxes */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <DollarSign size={14} className="text-emerald-600" />
              Valuation & Tax Math
            </h3>
            <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 border border-slate-200/80">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-[10px] text-slate-400 block">Jumlah (Qty)</span>
                  <span className="font-mono font-bold text-slate-900">
                    {line.item_quantity || 1} {line.uom_code || 'PCE'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Harga Satuan (USD)</span>
                  <span className="font-mono font-bold text-slate-900">
                    ${(line.unit_price_usd || 0).toLocaleString()}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Total CIF (USD)</span>
                  <span className="font-mono font-black text-indigo-900">${totalCifUsd.toLocaleString()}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200/60 flex items-baseline justify-between">
                <span className="text-xs font-bold text-slate-700">Estimasi Pajak Impor (IDR):</span>
                <span className="font-mono font-black text-emerald-700 text-sm">
                  Rp {totalTaxIdr.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Origin & Logistics */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Globe2 size={14} className="text-blue-600" />
              Origin & Supply Chain
            </h3>
            <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 border border-slate-200/80 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-[10px] text-slate-400 block">Negara Asal (Origin)</span>
                  <span className="font-mono font-bold text-slate-800">{line.country_of_origin || 'CN'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Nomor Invoice</span>
                  <span className="font-mono font-bold text-slate-800">{line.invoice_number || '—'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-1 border-t border-slate-200/60">
                <div>
                  <span className="text-[10px] text-slate-400 block">Manufacturer (Pabrikan)</span>
                  <span className="font-semibold text-slate-800">{line.manufacturer_name || '—'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Supplier (Pemasok)</span>
                  <span className="font-semibold text-slate-800">{line.supplier_name || '—'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* 5. Compliance & Diagnostics */}
          {(line.lartas_flag || line.price_anomaly_flag) && (
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-rose-600" />
                Compliance Diagnostics
              </h3>
              <div className="space-y-2">
                {line.lartas_flag && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5">
                    <ShieldAlert size={16} className="text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-rose-900">Lartas: Izin Impor Diperlukan</h4>
                      <p className="text-[11px] text-rose-700 mt-0.5">
                        Komoditas ini terdaftar dalam daftar pembatasan impor BTKI (Kementerian Perdagangan / Perindustrian).
                      </p>
                    </div>
                  </div>
                )}
                {line.price_anomaly_flag && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5">
                    <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="font-bold text-amber-900">Price Anomaly: Variasi Harga Signifikan</h4>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Harga satuan USD menunjukkan selisih &gt; 50% dari rata-rata historis importir ini.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} className="text-xs font-bold">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
