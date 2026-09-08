'use client';

import React, { useState, useEffect } from 'react';
import { CustomsClassificationLine, CustomsDeclaration } from '@/lib/domain/customs/types';
import { ClassificationCandidateCard, CandidateProps } from './ClassificationCandidateCard';
import { Sparkles, AlertTriangle, ShieldAlert, CheckCircle2, History, Edit3, X, HelpCircle, RefreshCw } from 'lucide-react';

interface ClassificationCockpitProps {
  declaration: CustomsDeclaration;
  selectedLine: CustomsClassificationLine | null;
  onClassificationApproved: (updatedLine: CustomsClassificationLine, updatedDec: CustomsDeclaration) => void;
  onInspectInBtki?: (hsCode: string) => void;
}

export function ClassificationCockpit({
  declaration,
  selectedLine,
  onClassificationApproved,
  onInspectInBtki
}: ClassificationCockpitProps) {
  const [candidates, setCandidates] = useState<any[]>([]);
  const [skuMatch, setSkuMatch] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState(false);

  // Manual Override Dialog State
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [overrideHs, setOverrideHs] = useState('');
  const [overrideReason, setOverrideReason] = useState('');
  const [updateMemory, setUpdateMemory] = useState(true);

  // Load classification candidates when selectedLine changes
  useEffect(() => {
    async function loadCandidates() {
      if (!selectedLine) {
        setCandidates([]);
        setSkuMatch(null);
        return;
      }
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/customs/declarations/${declaration.id}/classification-candidates`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ line: selectedLine })
        });
        const json = await res.json();
        if (json.success && json.data) {
          setCandidates(json.data.candidates || []);
          setSkuMatch(json.data.skuMatch || null);
        }
      } catch (err) {
        console.error('Failed to load candidates', err);
      } finally {
        setLoading(false);
      }
    }
    loadCandidates();
  }, [selectedLine, declaration.id]);

  // Execute Human-in-the-Loop Approval
  const handleApproveHs = async (hsCode: string, justification?: string) => {
    if (!selectedLine) return;
    setActionInProgress(true);
    try {
      const res = await fetch(`/api/v1/customs/declarations/${declaration.id}/classify-line`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          line_id: selectedLine.id,
          hs_code: hsCode,
          justification: justification || `Approved by PPJK specialist from candidate suggestions`,
          update_sku_memory: updateMemory
        })
      });
      const json = await res.json();
      if (json.success && json.data) {
        onClassificationApproved(json.data.line, json.data.declaration);
        setShowOverrideModal(false);
      } else {
        alert(json.error?.message || 'Failed to approve classification');
      }
    } catch (err) {
      console.error('Approval failed', err);
      alert('Network error while approving classification');
    } finally {
      setActionInProgress(false);
    }
  };

  const handleCustomOverrideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideHs.trim()) {
      alert('Please enter a valid 8-digit HS Code');
      return;
    }
    if (!overrideReason.trim()) {
      alert('Please provide a justification for this manual override');
      return;
    }
    handleApproveHs(overrideHs.trim(), overrideReason.trim());
  };

  if (!selectedLine) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-white border border-slate-200 rounded-2xl p-8 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
          <Sparkles size={24} />
        </div>
        <h3 className="text-sm font-bold text-slate-800">Select an Item from the Priority Queue</h3>
        <p className="text-xs text-slate-500 max-w-sm mt-1">
          Inspect SKU intelligence memory, historical classification evidence, and explore BTKI hierarchy tree.
        </p>
      </div>
    );
  }

  const isApproved = selectedLine.classification_source === 'PPJK_APPROVED' || selectedLine.classification_source === 'SKU_MEMORY';

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      {/* Top Header: Active Item Identity */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
              Line #{selectedLine.item_sequence}
            </span>
            <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
              {selectedLine.sku_code || 'NO-SKU'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {isApproved ? (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-100 text-emerald-800 text-xs font-bold rounded-full">
                <CheckCircle2 size={12} />
                PPJK Approved
              </span>
            ) : selectedLine.hs_code ? (
              <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs font-bold rounded-full font-mono">
                {selectedLine.hs_code} (Unconfirmed)
              </span>
            ) : (
              <span className="px-2 py-0.5 bg-red-100 text-red-800 text-xs font-bold rounded-full animate-pulse">
                Unclassified
              </span>
            )}
          </div>
        </div>

        {/* Product Description */}
        <h2 className="text-sm font-bold text-slate-900 leading-snug">
          {selectedLine.goods_description || 'No description entered'}
        </h2>

        {/* Specifications & Commercial Details */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-[11px] text-slate-600">
          <div>
            <span className="text-slate-400 block text-[10px]">Brand / Model:</span>
            <strong className="text-slate-800">{selectedLine.brand || '—'} / {selectedLine.model || '—'}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Origin / UOM:</span>
            <strong className="text-slate-800">{selectedLine.country_of_origin || 'CN'} · {selectedLine.item_quantity} {selectedLine.uom_code}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Unit Price (USD):</span>
            <strong className="text-slate-800 font-mono">${(selectedLine.unit_price_usd || 0).toLocaleString()}</strong>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px]">Manufacturer:</span>
            <strong className="text-slate-800 truncate block">{selectedLine.manufacturer_name || '—'}</strong>
          </div>
        </div>
      </div>

      {/* Main Candidate & Evidence Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* SKU Intelligence Memory Box */}
        {skuMatch?.matched && (
          <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                <Sparkles size={14} className="text-indigo-600" />
                SKU Product Memory Match ({skuMatch.match_type.replace('_', ' ')})
              </div>
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-full font-mono">
                {Math.round(skuMatch.confidence_score * 100)}% Confidence
              </span>
            </div>

            <p className="text-xs text-slate-700">
              Matched from importer product memory with <strong>{skuMatch.historical_declarations_count} previous declarations</strong>.
              Average historical price: <strong>${skuMatch.average_unit_price_usd?.toLocaleString() || '—'}</strong>.
            </p>
          </div>
        )}

        {/* Candidate HS Codes */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Ranked Classification Candidates ({candidates.length})
            </span>
            <button
              onClick={() => {
                setOverrideHs(selectedLine.hs_code || '');
                setShowOverrideModal(true);
              }}
              className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors"
            >
              <Edit3 size={13} />
              Manual Override
            </button>
          </div>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <RefreshCw size={18} className="animate-spin mx-auto mb-2 text-indigo-600" />
              Evaluating SKU Intelligence candidates...
            </div>
          ) : candidates.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <HelpCircle size={20} className="mx-auto mb-1 text-slate-300" />
              No automatic candidates found. Use the BTKI Explorer on the right to select a tariff code or click Manual Override.
            </div>
          ) : (
            candidates.map((cand, idx) => (
              <ClassificationCandidateCard
                key={cand.hs_code || idx}
                hs_code={cand.hs_code}
                description_id={cand.description_id}
                description_en={cand.description_en}
                confidence={cand.confidence}
                match_type={cand.match_type}
                rationale={cand.rationale}
                bm_rate={cand.bm_rate}
                ppn_rate={cand.ppn_rate}
                pph_rate={cand.pph_rate}
                lartas_flag={cand.lartas_flag}
                lartas_permit_type={cand.lartas_permit_type}
                historical_declarations_count={cand.historical_declarations_count}
                average_price_usd={cand.average_price_usd}
                isCurrent={selectedLine.hs_code === cand.hs_code && isApproved}
                onApprove={hs => handleApproveHs(hs, cand.rationale)}
                onSelectInspect={onInspectInBtki}
              />
            ))
          )}
        </div>

        {/* Existing Valuation / Price Anomaly Warning */}
        {selectedLine.price_anomaly_flag && (
          <div className="p-3 bg-orange-50 border border-orange-200 rounded-xl flex items-start gap-2 text-xs text-orange-900">
            <AlertTriangle size={16} className="text-orange-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Valuation Warning: Unit Price Variance Detected</strong>
              Current price (${selectedLine.unit_price_usd}) deviates from historical catalog baseline. Customs inspection may query commercial invoice valuation.
            </div>
          </div>
        )}
      </div>

      {/* Manual Override Modal */}
      {showOverrideModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-5 space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Edit3 size={16} className="text-indigo-600" />
                Custom HS Classification Override
              </h3>
              <button
                onClick={() => setShowOverrideModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCustomOverrideSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  8-Digit BTKI HS Code *
                </label>
                <input
                  type="text"
                  value={overrideHs}
                  onChange={e => setOverrideHs(e.target.value)}
                  placeholder="e.g. 8504.40.30"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Specialist Justification / Reason *
                </label>
                <textarea
                  value={overrideReason}
                  onChange={e => setOverrideReason(e.target.value)}
                  placeholder="e.g. Reclassified based on technical specification sheet showing AC motor with output > 75kW"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[70px]"
                  required
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="updateMemory"
                  checked={updateMemory}
                  onChange={e => setUpdateMemory(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                />
                <label htmlFor="updateMemory" className="text-xs text-slate-700 font-medium">
                  Update SKU Intelligence Memory for Importer
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowOverrideModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-800 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={actionInProgress}
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors"
                >
                  {actionInProgress ? 'Saving...' : 'Confirm Override'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
