'use client'

import React from 'react'
import { Printer, X } from 'lucide-react'

interface ManifestPrintModalProps {
  masterBox: any;
  parcels: any[];
  onClose: () => void;
}

/* ── Code128-B encoder (same as ParcelPrintModal) ────────────────────── */
function encodeCode128B(text: string): number[] {
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
  const STOP_PATTERN = [2,3,3,1,1,1,2];

  const values: number[] = [104]; // START B
  for (let i = 0; i < text.length; i++) {
    const v = text.charCodeAt(i) - 32;
    values.push(v >= 0 && v < 95 ? v : 0);
  }
  let checksum = values[0];
  for (let i = 1; i < values.length; i++) checksum += values[i] * i;
  values.push(checksum % 103);

  const modules: number[] = [];
  for (const v of values) {
    const p = PATTERNS[v];
    for (let j = 0; j < 6; j++) {
      const count = p[j]; const isBar = j % 2 === 0;
      for (let k = 0; k < count; k++) modules.push(isBar ? 1 : 0);
    }
  }
  for (let j = 0; j < STOP_PATTERN.length; j++) {
    const count = STOP_PATTERN[j]; const isBar = j % 2 === 0;
    for (let k = 0; k < count; k++) modules.push(isBar ? 1 : 0);
  }
  return modules;
}

function BarcodeSVG({ value, height = 60 }: { value: string; height?: number }) {
  const modules = encodeCode128B(value);
  const mw = 2, qz = 20, tw = modules.length * mw;
  return (
    <svg viewBox={`0 0 ${tw + qz * 2} ${height}`} preserveAspectRatio="xMidYMid meet" className="w-full block" style={{ maxHeight: `${height}px` }}>
      {modules.map((m, i) => m === 1 ? <rect key={i} x={qz + i * mw} y={0} width={mw} height={height} fill="#000" /> : null)}
    </svg>
  );
}

export default function ManifestPrintModal({ masterBox, parcels, onClose }: ManifestPrintModalProps) {
  const handlePrint = () => window.print();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <style jsx global>{`
        @media print {
          @page { size: 105mm 148mm; margin: 0; }
          body * { visibility: hidden !important; }
          .print-manifest-area, .print-manifest-area * { visibility: visible !important; }
          .print-manifest-area {
            position: fixed !important; left: 0 !important; top: 0 !important;
            width: 105mm !important; margin: 0 !important; padding: 0 !important;
          }
          .manifest-card {
            width: 105mm !important; min-height: 148mm !important;
            border-radius: 0 !important; box-shadow: none !important;
            box-sizing: border-box; padding: 3mm !important; border-width: 1.5px !important;
          }
        }
      `}</style>

      <div className="bg-white rounded-2xl max-w-[460px] w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">

        {/* ── Header ── */}
        <div className="print:hidden px-5 py-3.5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Printer size={18} className="text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-tight">Print Manifest</h3>
              <p className="text-[10px] text-slate-400 font-semibold">Master Box · A6 Thermal (105×148mm)</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="px-4 py-2 bg-indigo-500 hover:bg-indigo-400 text-white rounded-lg text-xs font-black uppercase tracking-wide transition-all flex items-center gap-1.5 shadow-md active:scale-95">
              <Printer size={14} /> Cetak
            </button>
            <button onClick={onClose} className="p-2 text-slate-500 hover:text-white hover:bg-slate-700 rounded-lg transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Printable Area ── */}
        <div className="p-5 overflow-y-auto print:p-0 print:m-0 print:overflow-visible print-manifest-area bg-slate-100 print:bg-white">

          <div className="manifest-card bg-white border-2 border-slate-900 rounded-xl shadow-lg print:shadow-none overflow-hidden flex flex-col">

            {/* ▬▬▬ TOP STRIP ▬▬▬ */}
            <div className="flex items-center justify-between bg-slate-900 text-white px-3 py-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-white flex items-center justify-center">
                  <span className="text-slate-900 font-black text-[10px] leading-none">SL</span>
                </div>
                <div>
                  <div className="font-black text-[11px] tracking-tight leading-tight">SENTRALOGIS</div>
                  <div className="text-[7px] font-semibold text-slate-400 tracking-wider uppercase">Master Box Manifest</div>
                </div>
              </div>
              <span className="px-2 py-0.5 bg-amber-400 text-slate-900 font-black text-[10px] rounded leading-tight">
                {parcels.length} PCS
              </span>
            </div>

            {/* ▬▬▬ DESTINATION ▬▬▬ */}
            <div className="bg-slate-50 border-b-2 border-slate-900 px-3 py-2 text-center">
              <div className="text-[7px] font-black text-slate-500 uppercase tracking-[0.2em]">Kota Tujuan Hub</div>
              <div className="font-black text-xl tracking-wider text-slate-900 uppercase leading-tight">
                {masterBox.destination_city}
              </div>
            </div>

            {/* ▬▬▬ BARCODE ▬▬▬ */}
            <div className="px-3 pt-2 pb-1 border-b border-dashed border-slate-300">
              <BarcodeSVG value={masterBox.master_box_code} height={55} />
              <div className="text-center font-mono font-black text-xs tracking-[0.12em] text-slate-900 mt-0.5">
                {masterBox.master_box_code}
              </div>
            </div>

            {/* ▬▬▬ PACKING LIST ▬▬▬ */}
            <div className="px-3 py-1.5 border-b border-slate-200">
              <div className="flex items-center justify-between text-[8px] font-black text-slate-500 uppercase tracking-wider mb-1">
                <span>Daftar Isi ({parcels.length} Paket)</span>
                <span>Berat</span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[200px] overflow-y-auto print:max-h-none print:overflow-visible">
                {parcels.map((p, idx) => (
                  <div key={p.id} className="py-1 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-mono font-black text-[9px] text-slate-900 leading-tight">{idx + 1}. {p.parcel_code}</div>
                      <div className="text-[8px] text-slate-500 font-semibold truncate">
                        {p.shipper_name} → {p.consignee_name}
                      </div>
                    </div>
                    <div className="font-black text-slate-900 text-[9px] whitespace-nowrap shrink-0 tabular-nums">
                      {p.weight_kg} kg
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ▬▬▬ METRICS ▬▬▬ */}
            <div className="grid grid-cols-3 text-center divide-x divide-slate-200 bg-slate-50 border-b border-slate-200">
              <div className="py-1.5">
                <div className="text-[7px] font-black text-slate-400 uppercase">Total Pcs</div>
                <div className="font-black text-slate-900 text-xs">{masterBox.total_parcels}</div>
              </div>
              <div className="py-1.5">
                <div className="text-[7px] font-black text-slate-400 uppercase">Berat</div>
                <div className="font-black text-slate-900 text-xs">{masterBox.total_weight_kg} kg</div>
              </div>
              <div className="py-1.5">
                <div className="text-[7px] font-black text-slate-400 uppercase">Volume</div>
                <div className="font-black text-slate-900 text-xs">{masterBox.total_cbm} CBM</div>
              </div>
            </div>

            {/* ▬▬▬ SIGN OFF ▬▬▬ */}
            <div className="grid grid-cols-2 border-b border-slate-200 text-[8px]">
              <div className="px-3 py-1.5 border-r border-slate-200">
                <div className="text-[7px] font-black text-slate-400 uppercase tracking-wider">Packed by</div>
                <div className="font-bold text-slate-700">{masterBox.created_by || 'Staf Gudang'}</div>
              </div>
              <div className="px-3 py-1.5">
                <div className="text-[7px] font-black text-slate-400 uppercase tracking-wider">Tanda Tangan</div>
                <div className="h-5 border-b border-dotted border-slate-400 mt-1"></div>
              </div>
            </div>

            {/* ▬▬▬ FOOTER ▬▬▬ */}
            <div className="flex items-center justify-between px-3 py-1 bg-slate-900 text-white text-[7px] font-semibold mt-auto">
              <span>sentralogis.com</span>
              <span>{new Date(masterBox.created_at).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="print:hidden px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-[10px] text-slate-500 font-semibold">1 manifest label siap cetak</span>
          <div className="flex items-center gap-2">
            <button onClick={onClose} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold transition-all">Tutup</button>
            <button onClick={handlePrint} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black uppercase tracking-wide transition-all flex items-center gap-1.5 shadow-md active:scale-95">
              <Printer size={14} /> Cetak
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
