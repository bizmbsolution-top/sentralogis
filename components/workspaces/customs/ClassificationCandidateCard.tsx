'use client';

import React from 'react';
import { Sparkles, Check, ShieldAlert, History, Tag } from 'lucide-react';

export interface CandidateProps {
  hs_code: string;
  description_id: string;
  description_en?: string | null;
  confidence: number;
  match_type: string;
  rationale: string;
  bm_rate: number;
  ppn_rate: number;
  pph_rate: number;
  lartas_flag: boolean;
  lartas_permit_type?: string | null;
  historical_declarations_count?: number;
  average_price_usd?: number;
  isCurrent?: boolean;
  onApprove: (hsCode: string) => void;
  onSelectInspect?: (hsCode: string) => void;
}

export function ClassificationCandidateCard({
  hs_code,
  description_id,
  description_en,
  confidence,
  match_type,
  rationale,
  bm_rate,
  ppn_rate,
  pph_rate,
  lartas_flag,
  lartas_permit_type,
  historical_declarations_count,
  average_price_usd,
  isCurrent = false,
  onApprove,
  onSelectInspect
}: CandidateProps) {
  // Confidence meter color
  const confColor =
    confidence >= 90 ? 'bg-emerald-500 text-emerald-700' :
    confidence >= 75 ? 'bg-indigo-500 text-indigo-700' :
    'bg-amber-500 text-amber-700';

  const badgeStyle =
    match_type === 'EXACT_SKU' ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
    match_type === 'SKU_MANUFACTURER' ? 'bg-indigo-100 text-indigo-800 border-indigo-200' :
    match_type === 'SKU_SUPPLIER' ? 'bg-blue-100 text-blue-800 border-blue-200' :
    match_type === 'FINGERPRINT' ? 'bg-purple-100 text-purple-800 border-purple-200' :
    'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <div
      className={`p-3.5 rounded-xl border transition-all ${
        isCurrent
          ? 'bg-emerald-50/50 border-emerald-300 ring-2 ring-emerald-100'
          : 'bg-white border-slate-200 hover:border-indigo-300 shadow-xs'
      }`}
    >
      {/* Top Header: HS Code & Confidence Badge */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
            {hs_code}
          </span>
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full border ${badgeStyle}`}>
            {match_type.replace('_', ' ')}
          </span>
        </div>

        {/* Confidence Percentage Badge */}
        <div className="flex items-center gap-1.5">
          <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full ${confColor.split(' ')[0]}`}
              style={{ width: `${Math.min(100, Math.max(0, confidence))}%` }}
            />
          </div>
          <span className="text-xs font-black font-mono text-slate-700">
            {confidence}%
          </span>
        </div>
      </div>

      {/* Description */}
      <div className="mt-2 text-xs text-slate-800 font-medium line-clamp-2">
        {description_id}
      </div>
      {description_en && (
        <div className="text-[11px] text-slate-500 italic line-clamp-1 mt-0.5">
          {description_en}
        </div>
      )}

      {/* Rationale & Evidence */}
      <div className="mt-2 text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 flex items-start gap-1.5">
        <Sparkles size={13} className="text-indigo-600 shrink-0 mt-0.5" />
        <span className="leading-tight">{rationale}</span>
      </div>

      {/* Tariff & Lartas Bar */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-700">
          <span>BM: <strong className="text-slate-900">{bm_rate}%</strong></span>
          <span>PPN: <strong className="text-slate-900">{ppn_rate}%</strong></span>
          <span>PPh: <strong className="text-slate-900">{pph_rate}%</strong></span>
          {lartas_flag && (
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-purple-100 text-purple-800 text-[10px] font-bold rounded">
              <ShieldAlert size={11} />
              {lartas_permit_type || 'Lartas Permit'}
            </span>
          )}
        </div>

        {historical_declarations_count !== undefined && historical_declarations_count > 0 && (
          <div className="inline-flex items-center gap-1 text-[10px] text-slate-500 font-mono">
            <History size={11} />
            Used {historical_declarations_count}x in PIB
          </div>
        )}
      </div>

      {/* Bottom Action */}
      <div className="mt-3 flex items-center justify-end gap-2">
        {onSelectInspect && (
          <button
            onClick={() => onSelectInspect(hs_code)}
            className="px-2.5 py-1 text-xs text-indigo-600 hover:text-indigo-800 font-semibold transition-colors"
          >
            Inspect in BTKI
          </button>
        )}
        <button
          onClick={() => onApprove(hs_code)}
          disabled={isCurrent}
          className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all inline-flex items-center gap-1.5 ${
            isCurrent
              ? 'bg-emerald-600 text-white cursor-default'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
          }`}
        >
          {isCurrent ? (
            <>
              <Check size={14} />
              Active Classification
            </>
          ) : (
            <>
              <Check size={14} />
              Approve This HS
            </>
          )}
        </button>
      </div>
    </div>
  );
}
