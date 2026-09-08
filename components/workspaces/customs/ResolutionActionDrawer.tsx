'use client';

import React, { useState } from 'react';
import { CustomsDeclarationException, CustomsClassificationLine } from '@/lib/domain/customs/types';
import { Button } from '@/components/ui/Button';
import GradientButton from '@/components/ui/GradientButton';
import {
  CheckCircle2,
  AlertTriangle,
  FileEdit,
  ShieldCheck,
  Upload,
  ArrowRight,
  Loader2,
  Check,
  X,
  Sparkles
} from 'lucide-react';

interface ResolutionActionDrawerProps {
  declarationId: string;
  exception: CustomsDeclarationException | null;
  line?: CustomsClassificationLine | null;
  onSuccess: () => void;
  onNavigateTab?: (tab: string, filter?: string) => void;
}

export function ResolutionActionDrawer({
  declarationId,
  exception,
  line,
  onSuccess,
  onNavigateTab
}: ResolutionActionDrawerProps) {
  const [activeAction, setActiveAction] = useState<'FIX_DATA' | 'WAIVE' | 'ACKNOWLEDGE' | 'NONE'>('NONE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states for FIX_DATA
  const [newHsCode, setNewHsCode] = useState(line?.hs_code || '');
  const [newQuantity, setNewQuantity] = useState(String(line?.item_quantity || ''));
  const [newPrice, setNewPrice] = useState(String(line?.unit_price_usd || ''));
  const [newDescription, setNewDescription] = useState(line?.goods_description || '');

  // Form states for WAIVE
  const [waiverReason, setWaiverReason] = useState('');

  if (!exception) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-white border border-slate-200 rounded-3xl text-slate-400 space-y-2">
        <Sparkles size={32} className="text-slate-300" />
        <h4 className="text-xs font-bold text-slate-600">Remediation Controls</h4>
        <p className="text-[11px] text-slate-400 max-w-xs">
          Select an exception to unlock context-aware resolution actions and waiver controls.
        </p>
      </div>
    );
  }

  const isResolved = exception.status === 'RESOLVED' || exception.status === 'WAIVED';
  const canWaive = exception.severity !== 'BLOCKING' || exception.resolution_policy !== 'FIX_REQUIRED';

  // 1. Acknowledge action
  const handleAcknowledge = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/customs/declarations/${declarationId}/exceptions/${exception.id}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error?.message || 'Failed to acknowledge exception');
      }
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 2. Resolve via Data Correction
  const handleResolveDataFix = async () => {
    setLoading(true);
    setError(null);
    try {
      const overrideData: Record<string, any> = {};
      if (newHsCode.trim()) overrideData.hs_code = newHsCode.trim();
      if (newQuantity.trim() && Number(newQuantity) > 0) overrideData.item_quantity = Number(newQuantity);
      if (newPrice.trim() && Number(newPrice) >= 0) overrideData.unit_price_usd = Number(newPrice);
      if (newDescription.trim()) overrideData.goods_description = newDescription.trim();

      const res = await fetch(`/api/v1/customs/declarations/${declarationId}/exceptions/${exception.id}/resolve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resolution_type: 'DATA_CORRECTED',
          resolution_note: `Corrected line data via Resolution Drawer`,
          override_data: overrideData
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error?.message || 'Failed to apply data correction');
      }

      setActiveAction('NONE');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 3. Waive Warning Exception
  const handleWaive = async () => {
    if (!waiverReason.trim() || waiverReason.trim().length < 5) {
      setError('Please provide a specific justification reason (minimum 5 characters).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/customs/declarations/${declarationId}/exceptions/${exception.id}/waive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          justification_reason: waiverReason.trim()
        })
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error?.message || 'Failed to waive exception');
      }

      setActiveAction('NONE');
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
      {/* Header */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
          <ShieldCheck size={14} className="text-indigo-600" />
          Resolution Action Controls
        </h3>
        <p className="text-[11px] text-slate-400 mt-0.5">
          Execute auditable remediation actions tailored to this rule
        </p>
      </div>

      {/* Action Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Error banner */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
            {error}
          </div>
        )}

        {isResolved ? (
          <div className="p-6 text-center space-y-2 bg-emerald-50/50 border border-emerald-200 rounded-2xl">
            <CheckCircle2 size={32} className="mx-auto text-emerald-600" />
            <h4 className="text-xs font-bold text-emerald-900">
              Exception is {exception.status}
            </h4>
            <p className="text-[11px] text-emerald-700">
              This issue has been resolved ({exception.resolution_type || 'Resolved'}). Run re-validation to refresh overall readiness.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Primary Action Buttons */}
            {activeAction === 'NONE' && (
              <div className="space-y-2.5">
                {/* 1. Fix Data button if line exists */}
                {exception.classification_line_id && (
                  <button
                    onClick={() => {
                      setNewHsCode(line?.hs_code || '');
                      setNewQuantity(String(line?.item_quantity || ''));
                      setNewPrice(String(line?.unit_price_usd || ''));
                      setNewDescription(line?.goods_description || '');
                      setActiveAction('FIX_DATA');
                    }}
                    className="w-full p-3 bg-indigo-50 hover:bg-indigo-100/80 border border-indigo-200 rounded-2xl text-left transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                        <FileEdit size={14} className="text-indigo-600" /> Quick Data Fix
                      </div>
                      <p className="text-[11px] text-indigo-700 mt-0.5">
                        Update HS code, quantity, description or pricing
                      </p>
                    </div>
                    <ArrowRight size={14} className="text-indigo-600 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}

                {/* 2. Upload Document Link if category is DOCUMENTS or LARTAS */}
                {(exception.category === 'DOCUMENTS' || exception.category === 'LARTAS') && onNavigateTab && (
                  <button
                    onClick={() => onNavigateTab('documents')}
                    className="w-full p-3 bg-amber-50 hover:bg-amber-100/80 border border-amber-200 rounded-2xl text-left transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                        <Upload size={14} className="text-amber-600" /> Attach Supporting Document
                      </div>
                      <p className="text-[11px] text-amber-700 mt-0.5">
                        Upload invoice, permit, or COO in Document Vault
                      </p>
                    </div>
                    <ArrowRight size={14} className="text-amber-600 group-hover:translate-x-1 transition-transform" />
                  </button>
                )}

                {/* 3. Waive Warning Option */}
                {canWaive ? (
                  <button
                    onClick={() => setActiveAction('WAIVE')}
                    className="w-full p-3 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-2xl text-left transition-all flex items-center justify-between group"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                        <CheckCircle2 size={14} className="text-emerald-600" /> Waive Warning Exception
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Accept warning with mandatory written justification
                      </p>
                    </div>
                    <ArrowRight size={14} className="text-slate-400 group-hover:translate-x-1 transition-transform" />
                  </button>
                ) : (
                  <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-2xl text-[11px] text-rose-800">
                    <strong className="block font-bold">Waiver Forbidden for this Rule:</strong>
                    This rule is marked as <span className="font-mono font-bold">FIX_REQUIRED</span>. The underlying declaration data must be corrected before submission.
                  </div>
                )}

                {/* 4. Acknowledge */}
                {exception.status === 'OPEN' && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleAcknowledge}
                    disabled={loading}
                    className="w-full text-xs font-semibold"
                  >
                    {loading ? <Loader2 size={13} className="animate-spin mr-1" /> : null}
                    Mark as Acknowledged
                  </Button>
                )}
              </div>
            )}

            {/* FORM: FIX DATA */}
            {activeAction === 'FIX_DATA' && (
              <div className="space-y-3 p-3.5 bg-indigo-50/50 border border-indigo-200 rounded-2xl animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-indigo-950">Quick Correct Line Data</h4>
                  <button onClick={() => setActiveAction('NONE')} className="text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">HS Code (8-Digit):</label>
                    <input
                      type="text"
                      value={newHsCode}
                      onChange={e => setNewHsCode(e.target.value)}
                      placeholder="e.g. 8507.60.90"
                      className="w-full p-2 text-xs font-mono font-bold bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Quantity:</label>
                      <input
                        type="number"
                        value={newQuantity}
                        onChange={e => setNewQuantity(e.target.value)}
                        className="w-full p-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Unit Price USD:</label>
                      <input
                        type="number"
                        value={newPrice}
                        onChange={e => setNewPrice(e.target.value)}
                        className="w-full p-2 text-xs font-mono bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-600 block mb-0.5">Description:</label>
                    <textarea
                      rows={2}
                      value={newDescription}
                      onChange={e => setNewDescription(e.target.value)}
                      className="w-full p-2 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button variant="secondary" size="sm" onClick={() => setActiveAction('NONE')} className="text-xs">
                    Cancel
                  </Button>
                  <GradientButton
                    onClick={handleResolveDataFix}
                    disabled={loading}
                    className="flex-1 text-xs py-2"
                  >
                    {loading ? <Loader2 size={13} className="animate-spin mr-1" /> : <Check size={13} className="mr-1" />}
                    Save & Resolve
                  </GradientButton>
                </div>
              </div>
            )}

            {/* FORM: WAIVE */}
            {activeAction === 'WAIVE' && (
              <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900">Waive Warning Exception</h4>
                  <button onClick={() => setActiveAction('NONE')} className="text-slate-400 hover:text-slate-600">
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-2 text-xs">
                  <label className="text-[10px] font-bold text-slate-700 block">
                    Mandatory Written Justification Reason:
                  </label>
                  <textarea
                    rows={3}
                    value={waiverReason}
                    onChange={e => setWaiverReason(e.target.value)}
                    placeholder="e.g. Price variance of 65% is justified by signed annual volume rebate contract #VR-2026-BYD"
                    className="w-full p-2.5 text-xs bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-hidden"
                  />
                  <p className="text-[10px] text-slate-400">
                    This justification is permanently stored in the audit trail and attached to the declaration snapshot.
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button variant="secondary" size="sm" onClick={() => setActiveAction('NONE')} className="text-xs">
                    Cancel
                  </Button>
                  <GradientButton
                    onClick={handleWaive}
                    disabled={loading || waiverReason.trim().length < 5}
                    className="flex-1 text-xs py-2"
                  >
                    {loading ? <Loader2 size={13} className="animate-spin mr-1" /> : <Check size={13} className="mr-1" />}
                    Confirm Waiver
                  </GradientButton>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
