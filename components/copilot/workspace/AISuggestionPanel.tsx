'use client';

import React, { useState } from 'react';
import { Sparkles, BrainCircuit, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';

export interface AISuggestion {
  id: string;
  recommendedAction: string;
  reason: string;
  risk: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  confidence: number;
  affectedRecords: string[];
  requiredPermission: string;
  estimatedImpact: string;
}

export interface AISuggestionPanelProps {
  suggestions: AISuggestion[];
  onExecute: (suggestion: AISuggestion) => void;
}

export default function AISuggestionPanel({ suggestions, onExecute }: AISuggestionPanelProps) {
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  if (!suggestions || suggestions.length === 0) return null;

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'MEDIUM': return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'HIGH': return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      case 'CRITICAL': return 'bg-red-500/20 text-red-400 border-red-500/30 font-bold';
      default: return 'bg-slate-800 text-slate-400 border-slate-700';
    }
  };

  const getConfidenceColor = (score: number) => {
    if (score >= 80) return 'bg-emerald-500';
    if (score >= 60) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  return (
    <div className="bg-slate-800/40 backdrop-blur-md rounded-xl shadow-sm border border-slate-700/50 p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-violet-400" />
        <h3 className="font-semibold text-slate-200 text-sm">AI Suggestions</h3>
      </div>

      <div className="flex flex-col gap-4">
        {suggestions.map(suggestion => (
          <div key={suggestion.id} className="bg-slate-900/40 rounded-lg border border-slate-700/50 overflow-hidden flex flex-col hover:border-violet-500/30 transition-colors">
            <div className="p-3.5 flex flex-col gap-3">
              <div className="flex items-start justify-between gap-3">
                <h4 className="font-semibold text-sm text-slate-200">{suggestion.recommendedAction}</h4>
                <span className={`shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded flex items-center gap-1 border uppercase tracking-wider ${getRiskColor(suggestion.risk)}`}>
                  {suggestion.risk === 'CRITICAL' || suggestion.risk === 'HIGH' ? <AlertTriangle className="w-3 h-3" /> : null}
                  {suggestion.risk} RISK
                </span>
              </div>
              
              <p className="text-xs text-slate-400 leading-relaxed">
                {suggestion.reason}
              </p>

              <div className="grid grid-cols-2 gap-3 text-xs mt-1">
                <div className="flex flex-col gap-1.5">
                  <span className="text-slate-500 font-medium">Confidence Score</span>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${getConfidenceColor(suggestion.confidence)}`}
                        style={{ width: `${suggestion.confidence}%` }}
                      />
                    </div>
                    <span className="font-medium text-slate-300">{suggestion.confidence}%</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <span className="text-slate-500 font-medium">Est. Impact</span>
                  <span className="text-slate-300 font-medium truncate">{suggestion.estimatedImpact}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mt-1">
                {suggestion.affectedRecords.map((record, idx) => (
                  <span key={idx} className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded border border-slate-700">
                    {record}
                  </span>
                ))}
              </div>
            </div>

            <div className="bg-slate-800/50 p-2.5 border-t border-slate-700/50 flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                <ShieldAlert className="w-3 h-3" />
                <span className="truncate max-w-[120px] font-mono" title={suggestion.requiredPermission}>
                  {suggestion.requiredPermission}
                </span>
              </div>
              
              {confirmingId === suggestion.id ? (
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setConfirmingId(null)}
                    className="text-[11px] font-medium px-3 py-1.5 rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => {
                      onExecute(suggestion);
                      setConfirmingId(null);
                    }}
                    className="text-[11px] font-bold px-3 py-1.5 rounded-md bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 hover:text-rose-300 transition-colors border border-rose-500/30 flex items-center gap-1.5"
                  >
                    <AlertTriangle className="w-3 h-3" />
                    Confirm
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setConfirmingId(suggestion.id)}
                  className="text-[11px] font-semibold px-4 py-1.5 rounded-md bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500/30 border border-indigo-500/30 transition-colors"
                >
                  Execute Action
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
