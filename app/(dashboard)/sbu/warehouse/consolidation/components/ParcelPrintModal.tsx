'use client'

import React, { useEffect, useRef } from 'react'
import { Printer, X } from 'lucide-react'

interface ParcelPrintModalProps {
  parcel: any;
  onClose: () => void;
}

/* ── Code128-B encoder ─────────────────────────────────────────────────
   Produces real Code128-B bar patterns (scannable by any barcode reader).
   Returns an array of 0/1 representing module widths.                    */
function encodeCode128B(text: string): number[] {
  const CODE128B_START = 104;
  const CODE128_STOP = 106;

  // Code128 patterns – each entry is 6 alternating bar/space widths
  const PATTERNS: number[][] = [
    [2,1,2,2,2,2],[2,2,2,1,2,2],[2,2,2,2,2,1],[1,2,1,2,2,3],[1,2,1,3,2,2],
    [1,3,1,2,2,2],[1,2,2,2,1,3],[1,2,2,3,1,2],[1,3,2,2,1,2],[2,2,1,2,1,3],
    [2,2,1,3,1,2],[2,3,1,2,1,2],[1,1,2,2,3,2],[1,2,2,1,3,2],[1,2,2,2,3,1],
    [1,1,3,2,2,2],[1,2,3,1,2,2],[1,2,3,2,2,1],[2,2,3,2,1,1],[2,2,1,1,3,2],
    [2,2,1,2,3,1],[2,1,3,2,1,2],[2,2,3,1,1,2],[3,1,2,1,3,1],[3,1,1,2,2,2],
    [3,2,1,1,2,2],[3,2,1,2,2,1],[3,1,2,2,1,2],[3,2,2,1,1,2],[3,2,2,2,1,1],
    [2,1,2,1,2,3],[2,1,2,3,2,1],[2,3,2,1,2,1],[1,1,1,3,2,3],[1,3,1,1,2,3],
    [1,3,1,3,2,1],[1,1,2,3,1,3],[1,3,2,1,1,3],[1,3,2,3,1,1],[2,1,1,3,1,3],
    [2,3,1,1,1,3],[2,3,1,3,1,1],[1,1,2,1,3,3],[1,1,2,3,3,1],[1,3,2,1,3,1],
    [1,1,3,1,2,3],[1,1,3,3,2,1],[1,3,3,1,2,1],[3,1,3,1,2,1],[2,1,1,3,3,1],
    [2,3,1,1,3,1],[2,1,3,1,1,3],[2,1,3,3,1,1],[2,1,3,1,3,1],[3,1,1,1,2,3],
    [3,1,1,3,2,1],[3,3,1,1,2,1],[3,1,2,1,1,3],[3,1,2,3,1,1],[3,3,2,1,1,1],
    [3,1,4,1,1,1],[2,2,1,4,1,1],[4,3,1,1,1,1],[1,1,1,2,2,4],[1,1,1,4,2,2],
    [1,2,1,1,2,4],[1,2,1,4,2,1],[1,4,1,1,2,2],[1,4,1,2,2,1],[1,1,2,2,1,4],
    [1,1,2,4,1,2],[1,2,2,1,1,4],[1,2,2,4,1,1],[1,4,2,1,1,2],[1,4,2,2,1,1],
    [2,4,1,2,1,1],[2,2,1,1,1,4],[4,1,3,1,1,1],[2,4,1,1,1,2],[1,3,4,1,1,1],
    [1,1,1,2,4,2],[1,2,1,1,4,2],[1,2,1,2,4,1],[1,1,4,2,1,2],[1,2,4,1,1,2],
    [1,2,4,2,1,1],[4,1,1,2,1,2],[4,2,1,1,1,2],[4,2,1,2,1,1],[2,1,2,1,4,1],
    [2,1,4,1,2,1],[4,1,2,1,2,1],[1,1,1,1,4,3],[1,1,1,3,4,1],[1,3,1,1,4,1],
    [1,1,4,1,1,3],[1,1,4,3,1,1],[4,1,1,1,1,3],[4,1,1,3,1,1],[1,1,3,1,4,1],
    [1,1,4,1,3,1],[3,1,1,1,4,1],[4,1,1,1,3,1],[2,1,1,4,1,2],[2,1,1,2,1,4],
    [2,1,1,2,3,2],
  ];
  const STOP_PATTERN = [2,3,3,1,1,1,2]; // stop + final bar

  const values: number[] = [CODE128B_START];
  for (let i = 0; i < text.length; i++) {
    const v = text.charCodeAt(i) - 32;
    values.push(v >= 0 && v < 95 ? v : 0);
  }
  // checksum
  let checksum = values[0];
  for (let i = 1; i < values.length; i++) checksum += values[i] * i;
  values.push(checksum % 103);

  const modules: number[] = [];
  for (const v of values) {
    const p = PATTERNS[v];
    for (let j = 0; j < 6; j++) {
      const count = p[j];
      const isBar = j % 2 === 0;
      for (let k = 0; k < count; k++) modules.push(isBar ? 1 : 0);
    }
  }
  // stop
  for (let j = 0; j < STOP_PATTERN.length; j++) {
    const count = STOP_PATTERN[j];
    const isBar = j % 2 === 0;
    for (let k = 0; k < count; k++) modules.push(isBar ? 1 : 0);
  }
  return modules;
}

function BarcodeSVG({ value, height = 80 }: { value: string; height?: number }) {
  const modules = encodeCode128B(value);
  const moduleWidth = 2;
  const totalWidth = modules.length * moduleWidth;
  const quietZone = 20;

  return (
    <svg
      viewBox={`0 0 ${totalWidth + quietZone * 2} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full block"
      style={{ maxHeight: `${height}px` }}
    >
      {modules.map((m, i) =>
        m === 1 ? (
          <rect
            key={i}
            x={quietZone + i * moduleWidth}
            y={0}
            width={moduleWidth}
            height={height}
            fill="#000"
          />
        ) : null
      )}
    </svg>
  );
}

export default function ParcelPrintModal({ parcel, onClose }: ParcelPrintModalProps) {
  const handlePrint = () => window.print();

  const items = Array.isArray(parcel.items) ? parcel.items : [];

  // Generate labels: 1 label per unit (qty) per product SKU
  // e.g. Product A (qty 2) + Product B (qty 3) = 5 labels total
  type LabelData = {
    collyNum: string;         // e.g. "01/05"
    barcode: string;          // unique per label
    skuItem: any;             // product info for this label
    productColly: string;     // colly within this product e.g. "01/02"
    productTotal: number;     // total qty of this product
  };

  const labels: LabelData[] = [];

  if (items.length > 0) {
    // Total across all products
    const grandTotal = items.reduce((s: number, it: any) => s + (it.qty || 1), 0);
    let globalIdx = 0;

    for (const item of items) {
      const productQty = item.qty || 1;
      for (let u = 0; u < productQty; u++) {
        globalIdx++;
        labels.push({
          collyNum: `${String(globalIdx).padStart(2, '0')}/${String(grandTotal).padStart(2, '0')}`,
          barcode: `${parcel.parcel_code}-${String(globalIdx).padStart(2, '0')}`,
          skuItem: item,
          productColly: `${String(u + 1).padStart(2, '0')}/${String(productQty).padStart(2, '0')}`,
          productTotal: productQty,
        });
      }
    }
  } else {
    // No items detail — fall back to parcel qty
    const qty = parcel.qty || 1;
    for (let i = 0; i < qty; i++) {
      labels.push({
        collyNum: `${String(i + 1).padStart(2, '0')}/${String(qty).padStart(2, '0')}`,
        barcode: `${parcel.parcel_code}-${String(i + 1).padStart(2, '0')}`,
        skuItem: null,
        productColly: `${String(i + 1).padStart(2, '0')}/${String(qty).padStart(2, '0')}`,
        productTotal: qty,
      });
    }
  }

  const totalLabels = labels.length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <style jsx global>{`
        @media print {
          @page { size: 105mm 148mm; margin: 0; }
          body * { visibility: hidden !important; }
          .print-label-area, .print-label-area * { visibility: visible !important; }
          .print-label-area {
            position: fixed !important; left: 0 !important; top: 0 !important;
            width: 105mm !important; margin: 0 !important; padding: 0 !important;
          }
          .label-card {
            width: 105mm !important; min-height: 148mm !important; max-height: 148mm !important;
            border-radius: 0 !important; box-shadow: none !important;
            page-break-after: always; box-sizing: border-box;
            padding: 4mm !important; border-width: 1.5px !important;
          }
          .label-card:last-child { page-break-after: auto; }
        }
      `}</style>

      <div className="bg-white rounded-2xl max-w-[440px] w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* ── Header ── */}
        <div className="print:hidden px-5 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Printer size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-tight">Print Shipping Label</h3>
              <p className="text-[10px] text-slate-400 font-semibold">{totalLabels} label · A6 Thermal (105×148mm)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white rounded-lg text-xs font-black uppercase tracking-wide transition-all flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <Printer size={14} /> Cetak
            </button>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Scrollable Preview ── */}
        <div className="p-5 overflow-y-auto print:p-0 print:m-0 print:overflow-visible space-y-5 print:space-y-0 print-label-area bg-slate-100 print:bg-white">

          <div className="print:hidden bg-amber-50 border border-amber-200 text-amber-800 p-2.5 rounded-lg text-[11px] font-bold text-center">
            Preview {totalLabels} label siap cetak — 1 label per unit produk, gunakan printer thermal A6
          </div>

          {labels.map((lbl, idx) => (
            <div
              key={idx}
              className="label-card bg-white border-2 border-slate-900 rounded-xl shadow-lg print:shadow-none overflow-hidden flex flex-col"
              style={{ pageBreakAfter: idx < labels.length - 1 ? 'always' : 'auto' }}
            >
              {/* ▬▬▬ TOP STRIP: brand + city + colly ▬▬▬ */}
              <div className="flex items-center justify-between bg-slate-900 text-white px-3 py-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded bg-white flex items-center justify-center">
                    <span className="text-slate-900 font-black text-[10px] leading-none">SL</span>
                  </div>
                  <div>
                    <div className="font-black text-[11px] tracking-tight leading-tight">SENTRALOGIS</div>
                    <div className="text-[7px] font-semibold text-slate-400 tracking-wider uppercase">Shipping Label</div>
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 bg-amber-400 text-slate-900 font-black text-[10px] rounded leading-tight">
                    {lbl.collyNum}
                  </span>
                </div>
              </div>

              {/* ▬▬▬ DESTINATION CITY (BIG) ▬▬▬ */}
              <div className="bg-slate-50 border-b-2 border-slate-900 px-3 py-2 text-center">
                <div className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em]">Kota Tujuan Hub</div>
                <div className="font-black text-xl tracking-wider text-slate-900 uppercase leading-tight">
                  {parcel.destination_city}
                </div>
              </div>

              {/* ▬▬▬ BARCODE (LARGE, SCANNABLE) ▬▬▬ */}
              <div className="px-3 pt-2.5 pb-1.5 border-b border-dashed border-slate-300">
                <div className="w-full">
                  <BarcodeSVG value={lbl.barcode} height={65} />
                </div>
                <div className="text-center font-mono font-black text-sm tracking-[0.12em] text-slate-900 mt-0.5">
                  {lbl.barcode}
                </div>
              </div>

              {/* ▬▬▬ SENDER → RECEIVER ▬▬▬ */}
              <div className="grid grid-cols-2 border-b border-slate-200 text-[10px]">
                <div className="px-3 py-2 border-r border-slate-200">
                  <div className="text-[7px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Pengirim</div>
                  <div className="font-black text-slate-900 leading-tight truncate">{parcel.shipper_name}</div>
                </div>
                <div className="px-3 py-2">
                  <div className="text-[7px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Penerima</div>
                  <div className="font-black text-slate-900 leading-tight truncate">{parcel.consignee_name}</div>
                  <div className="text-[8px] text-slate-500 font-semibold">({totalLabels} colly) {lbl.collyNum}</div>
                </div>
              </div>

              {/* ▬▬▬ ADDRESS ▬▬▬ */}
              {parcel.consignee_address && (
                <div className="px-3 py-1.5 border-b border-slate-200">
                  <div className="text-[7px] font-black text-slate-400 uppercase tracking-wider mb-0.5">Alamat Tujuan</div>
                  <div className="text-[9px] font-semibold text-slate-700 leading-snug line-clamp-2">{parcel.consignee_address}</div>
                </div>
              )}

              {/* ▬▬▬ SKU / PRODUCT DETAIL ▬▬▬ */}
              {lbl.skuItem ? (
                <div className="px-3 py-1.5 border-b border-slate-200 bg-indigo-50/40">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[7px] font-black text-indigo-700 uppercase tracking-wider">Isi Kemasan — Unit {lbl.productColly}</span>
                    <span className="font-mono text-[8px] font-black text-indigo-500">[{lbl.skuItem.item_id}]</span>
                  </div>
                  <div className="font-bold text-[10px] text-slate-900 leading-tight truncate">{lbl.skuItem.product_name}</div>
                  <div className="flex items-center gap-3 mt-0.5 text-[8px] font-bold text-slate-600">
                    <span>1 pcs (of {lbl.productTotal})</span>
                    <span>·</span>
                    <span>{lbl.skuItem.weight_kg || 0} kg/pcs</span>
                    <span>·</span>
                    <span>{lbl.skuItem.length_cm || 0}×{lbl.skuItem.width_cm || 0}×{lbl.skuItem.height_cm || 0} cm</span>
                  </div>
                </div>
              ) : (
                <div className="px-3 py-1.5 border-b border-slate-200 bg-slate-50 text-center">
                  <span className="text-[9px] font-bold text-slate-500">
                    Koli {lbl.collyNum} dari {totalLabels} kemasan
                  </span>
                </div>
              )}

              {/* ▬▬▬ BOTTOM METRICS ▬▬▬ */}
              <div className="grid grid-cols-3 text-center divide-x divide-slate-200 bg-slate-50">
                <div className="py-1.5">
                  <div className="text-[7px] font-black text-slate-400 uppercase">Total Koli</div>
                  <div className="font-black text-slate-900 text-xs">{totalLabels}</div>
                </div>
                <div className="py-1.5">
                  <div className="text-[7px] font-black text-slate-400 uppercase">Berat</div>
                  <div className="font-black text-slate-900 text-xs">{parcel.weight_kg || '-'} kg</div>
                </div>
                <div className="py-1.5">
                  <div className="text-[7px] font-black text-slate-400 uppercase">Volume</div>
                  <div className="font-black text-slate-900 text-xs">{parcel.cbm || '-'} CBM</div>
                </div>
              </div>

              {/* ▬▬▬ FOOTER ▬▬▬ */}
              <div className="flex items-center justify-between px-3 py-1 bg-slate-900 text-white text-[7px] font-semibold mt-auto">
                <span>sentralogis.com</span>
                <span>{new Date(parcel.created_at || Date.now()).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </div>
            </div>
          ))}
        </div>

        {/* ── Footer ── */}
        <div className="print:hidden px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-slate-500 font-semibold">{totalLabels} label siap cetak</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all">
              Tutup
            </button>
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-black uppercase tracking-wide transition-all flex items-center gap-1.5 shadow-md active:scale-95"
            >
              <Printer size={14} /> Cetak Semua
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
