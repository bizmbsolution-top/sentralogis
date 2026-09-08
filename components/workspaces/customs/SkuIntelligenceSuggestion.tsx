'use client';

import React from 'react';
import { Sparkles, Check, X, ShieldAlert, History, DollarSign, Globe2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export interface SkuSuggestionData {
  skuCode: string;
  suggestedHsCode: string;
  hsDescription?: string;
  confidence: number;
  matchType: string;
  historicalDeclarationsCount?: number;
  averagePriceUsd?: number;
  countryOfOrigin?: string;
  lartasFlag?: boolean;
}

interface SkuIntelligenceSuggestionProps {
  suggestion: SkuSuggestionData;
  onApply: (suggestion: SkuSuggestionData) => void;
  onDismiss: () => void;
}

export function SkuIntelligenceSuggestion({
  suggestion,
  onApply,
  onDismiss
}: SkuIntelligenceSuggestionProps) {
  const isHighConfidence = suggestion.confidence >= 95;

  return (
    <div className="absolute top-full left-0 mt-1 w-80 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-2xl border border-indigo-500/40 p-4 z-50 animate-in fade-in zoom-in-95 duration-150 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-indigo-800/60 pb-2">
        <div className="flex items-center gap-1.5 text-indigo-300 font-bold text-xs">
          <Sparkles size={14} className="text-amber-400" />
          <span>SKU INTELLIGENCE MATCH</span>
        </div>
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
            isHighConfidence
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
          }`}
        >
          {suggestion.confidence}% Match
        </span>
      </div>

      {/* Suggested HS Block */}
      <div className="space-y-1.5 text-xs">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px] text-slate-400">Suggested HS Code:</span>
          <span className="font-mono font-black text-sm text-amber-300 tracking-wider">
            {suggestion.suggestedHsCode}
          </span>
        </div>

        {suggestion.hsDescription && (
          <p className="text-[11px] text-slate-300 line-clamp-2 italic">
            {suggestion.hsDescription}
          </p>
        )}

        {/* Historical Metadata Details */}
        <div className="p-2.5 bg-white/10 rounded-xl space-y-1 text-[11px] border border-white/10">
          <div className="flex justify-between text-slate-300">
            <span className="flex items-center gap-1">
              <History size={11} className="text-slate-400" /> Declarations:
            </span>
            <span className="font-mono font-bold text-white">
              {suggestion.historicalDeclarationsCount || 1} uses
            </span>
          </div>

          {suggestion.averagePriceUsd !== undefined && (
            <div className="flex justify-between text-slate-300">
              <span className="flex items-center gap-1">
                <DollarSign size={11} className="text-slate-400" /> Historical Price:
              </span>
              <span className="font-mono font-bold text-emerald-300">
                ${suggestion.averagePriceUsd.toLocaleString()} USD
              </span>
            </div>
          )}

          {suggestion.countryOfOrigin && (
            <div className="flex justify-between text-slate-300">
              <span className="flex items-center gap-1">
                <Globe2 size={11} className="text-slate-400" /> Origin:
              </span>
              <span className="font-mono font-bold text-white">{suggestion.countryOfOrigin}</span>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons: Explicit Human Confirmation */}
      <div className="flex items-center justify-end gap-2 pt-1">
        <Button
          size="sm"
          variant="ghost"
          onClick={onDismiss}
          className="text-xs text-slate-300 hover:text-white hover:bg-white/10 h-7 px-2.5"
        >
          Dismiss
        </Button>
        <Button
          size="sm"
          variant="primary"
          onClick={() => onApply(suggestion)}
          className="text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white h-7 px-3 shadow-md shadow-emerald-900/40"
        >
          <Check size={13} className="mr-1" />
          Apply Suggestion
        </Button>
      </div>
    </div>
  );
}
