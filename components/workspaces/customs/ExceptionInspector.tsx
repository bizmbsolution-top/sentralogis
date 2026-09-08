'use client';

import React, { useState } from 'react';
import { CustomsDeclarationException, CustomsClassificationLine } from '@/lib/domain/customs/types';
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  FileQuestion,
  BookOpen,
  Code2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ArrowRight,
  ShieldAlert,
  Clock,
  User,
  Check
} from 'lucide-react';

interface ExceptionInspectorProps {
  exception: CustomsDeclarationException | null;
  line?: CustomsClassificationLine | null;
  onQuickNavigateTab?: (tab: string, filter?: string) => void;
}

export function ExceptionInspector({
  exception,
  line,
  onQuickNavigateTab
}: ExceptionInspectorProps) {
  const [showEvidence, setShowEvidence] = useState(false);

  if (!exception) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white border border-slate-200 rounded-3xl text-slate-400 space-y-3">
        <FileQuestion size={40} className="text-slate-300 animate-pulse" />
        <div>
          <h3 className="text-xs font-bold text-slate-700">No Exception Selected</h3>
          <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
            Select an active issue from the Exception Queue to inspect its regulatory context, evidence, and remediation actions.
          </p>
        </div>
      </div>
    );
  }

  const isResolved = exception.status === 'RESOLVED' || exception.status === 'WAIVED';

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 bg-slate-50/70 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
              {exception.rule_code}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {exception.category}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {exception.severity === 'BLOCKING' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full border border-rose-300">
                <AlertOctagon size={12} /> Blocking
              </span>
            ) : exception.severity === 'WARNING' ? (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full border border-amber-300">
                <AlertTriangle size={12} /> Warning
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full border border-blue-300">
                <Info size={12} /> Info
              </span>
            )}
          </div>
        </div>

        <h2 className="text-sm font-black text-slate-900 leading-snug">
          {exception.title}
        </h2>

        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
          <span>Policy: <strong className="text-slate-700">{exception.resolution_policy}</strong></span>
          <span>•</span>
          <span>Impact: <strong className="text-slate-700">{exception.readiness_impact}</strong></span>
        </div>
      </div>

      {/* Body Content */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* 1. Legal / Regulatory Source */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <BookOpen size={14} className="text-indigo-600" />
            <span>Regulatory & Policy Authority</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            {exception.rule_source || 'RULE SOURCE REQUIRED'}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">
            {exception.description}
          </p>
        </div>

        {/* 2. Affected Item Context */}
        {(exception.item_sequence || exception.sku_code || line) && (
          <div className="p-4 bg-indigo-50/40 border border-indigo-100 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-indigo-900">
                Affected Item Context
              </span>
              {exception.item_sequence && (
                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-full">
                  Item Line #{exception.item_sequence}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">SKU Code:</span>
                <span className="font-bold text-slate-800">{exception.sku_code || line?.sku_code || '—'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Pos Tarif (HS):</span>
                <span className="font-bold text-indigo-700">{line?.hs_code || exception.current_value || '—'}</span>
              </div>
              {line && (
                <>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Quantity:</span>
                    <span className="font-bold text-slate-800">{line.item_quantity} {line.uom_code}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-sans">Unit Price USD:</span>
                    <span className="font-bold text-slate-800">${line.unit_price_usd?.toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>

            {line?.goods_description && (
              <div className="text-xs text-slate-700 pt-1 border-t border-indigo-100/80 font-sans">
                <span className="text-[10px] text-slate-400 block">Description:</span>
                {line.goods_description}
              </div>
            )}
          </div>
        )}

        {/* 3. Current vs Expected Value Diff */}
        {(exception.current_value || exception.expected_value) && (
          <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
            <div className="bg-slate-100 px-4 py-2 font-bold text-slate-700 uppercase tracking-wider text-[10px]">
              Value Comparison & Expectations
            </div>
            <div className="grid grid-cols-2 divide-x divide-slate-200 p-3 bg-white font-mono">
              <div className="pr-3 space-y-1">
                <span className="text-[10px] font-bold text-rose-700 font-sans block">Current Declared Value:</span>
                <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 font-bold break-all">
                  {exception.current_value || '(empty)'}
                </div>
              </div>
              <div className="pl-3 space-y-1">
                <span className="text-[10px] font-bold text-emerald-700 font-sans block">Expected / Benchmark:</span>
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 font-bold break-all">
                  {exception.expected_value || '(standard)'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 4. Diagnostics & Evidence Payload */}
        <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs">
          <button
            onClick={() => setShowEvidence(!showEvidence)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 transition-colors font-bold text-slate-700"
          >
            <span className="flex items-center gap-1.5 text-[11px]">
              <Code2 size={13} className="text-slate-500" /> Technical Evidence & Fingerprint
            </span>
            {showEvidence ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {showEvidence && (
            <div className="p-3 bg-slate-900 text-slate-200 font-mono text-[11px] space-y-2">
              <div>
                <span className="text-slate-400 block text-[10px]">Fingerprint ID:</span>
                <span className="text-indigo-400 break-all">{exception.fingerprint}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Validation Run ID:</span>
                <span className="text-slate-300 break-all">{exception.validation_run_id || 'untracked'}</span>
              </div>
              {exception.evidence && Object.keys(exception.evidence).length > 0 && (
                <div>
                  <span className="text-slate-400 block text-[10px]">Evidence Context:</span>
                  <pre className="text-[10px] text-emerald-400 overflow-x-auto p-2 bg-slate-950 rounded-lg">
                    {JSON.stringify(exception.evidence, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5. Audit History Snapshot */}
        <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 text-[11px]">
            <Clock size={12} className="text-slate-500" />
            <span>Audit & Detection Timeline</span>
          </div>

          <div className="text-[11px] text-slate-500 space-y-1 font-mono">
            <div>Detected: <span className="text-slate-700">{new Date(exception.detected_at).toLocaleString()}</span></div>
            {exception.acknowledged_at && (
              <div>Acknowledged: <span className="text-slate-700">{new Date(exception.acknowledged_at).toLocaleString()}</span></div>
            )}
            {exception.resolved_at && (
              <div>
                Resolved ({exception.resolution_type}): <span className="text-emerald-700 font-bold">{new Date(exception.resolved_at).toLocaleString()}</span>
              </div>
            )}
            {exception.resolution_note && (
              <div className="p-2 bg-white border border-slate-200 rounded-lg text-slate-800 font-sans italic mt-1">
                &ldquo;{exception.resolution_note}&rdquo;
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
