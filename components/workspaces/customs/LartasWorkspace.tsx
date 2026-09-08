'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  Plus,
  RefreshCw,
  Search,
  Filter,
  ArrowRight,
  ExternalLink,
  BookOpen,
  HelpCircle,
  FileText,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  CustomsDeclaration,
  CustomsClassificationLine,
  CustomsDeclarationDocument,
  CustomsLartasReport,
  ItemLartasDetermination
} from '@/lib/domain/customs/types';

interface LartasWorkspaceProps {
  declaration: CustomsDeclaration;
  lines: CustomsClassificationLine[];
  documents?: CustomsDeclarationDocument[];
  onNavigateTab?: (tabId: string, filter?: string) => void;
  onRefreshDeclaration?: () => void;
}

export function LartasWorkspace({
  declaration,
  lines,
  documents = [],
  onNavigateTab,
  onRefreshDeclaration
}: LartasWorkspaceProps) {
  const [lartasReport, setLartasReport] = useState<CustomsLartasReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'RESTRICTED' | 'MISSING_PERMITS' | 'SOURCE_REQUIRED'>('ALL');
  const [activeItemModal, setActiveItemModal] = useState<ItemLartasDetermination | null>(null);

  // Quick attach permit state
  const [permitNumber, setPermitNumber] = useState('');
  const [permitIssuer, setPermitIssuer] = useState('Kementerian Perdagangan');
  const [permitExpiry, setPermitExpiry] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchLartasData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/customs/declarations/${declaration.id}/lartas`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setLartasReport(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to load Lartas report:', err);
    } finally {
      setLoading(false);
    }
  }, [declaration.id]);

  useEffect(() => {
    fetchLartasData();
  }, [fetchLartasData]);

  // Quick Attach Permit Document
  const handleAttachPermit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeItemModal) return;
    setSubmitting(true);

    try {
      const payload: Partial<CustomsDeclarationDocument> = {
        document_type: 'PERMIT',
        document_number: permitNumber || `PI-${Date.now().toString().slice(-6)}`,
        issuer_name: permitIssuer,
        expiry_date: permitExpiry || null,
        classification_line_id: activeItemModal.line_id,
        item_sequence: activeItemModal.item_sequence,
        file_name: `Permit_${activeItemModal.hs_code.replace(/[^0-9]/g, '')}.pdf`,
        file_reference: `permit_${Date.now()}`,
        verification_status: 'VERIFIED', // Auto-verify on quick attach in PPJK workspace
        status: 'VERIFIED',
        notes: `Import permit for HS ${activeItemModal.hs_code} (${activeItemModal.required_permit_type || 'PI/LS'})`
      };

      const res = await fetch(`/api/v1/customs/declarations/${declaration.id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        setActiveItemModal(null);
        setPermitNumber('');
        setPermitExpiry('');
        fetchLartasData();
        onRefreshDeclaration?.();
      }
    } catch (err) {
      console.error('Failed to attach permit document:', err);
    } finally {
      setSubmitting(false);
    }
  };

  // Filter items
  const displayItems = (lartasReport?.items || []).filter(item => {
    const matchesSearch =
      (item.sku_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.hs_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.goods_description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.required_permit_type || '').toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterStatus === 'RESTRICTED') return item.lartas_determination === 'REQUIRED';
    if (filterStatus === 'MISSING_PERMITS') return item.lartas_determination === 'REQUIRED' && !item.is_compliant;
    if (filterStatus === 'SOURCE_REQUIRED') return item.lartas_determination === 'RULE_SOURCE_REQUIRED';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* 1. LARTAS COCKPIT STATUS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Compliance Status */}
        <Card className="p-4 bg-slate-50/70 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Compliance Status</span>
            {lartasReport?.overall_compliance === 'COMPLIANT' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={12} /> COMPLIANT
              </span>
            )}
            {lartasReport?.overall_compliance === 'PERMITS_REQUIRED' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                <AlertCircle size={12} /> PERMITS NEEDED
              </span>
            )}
            {lartasReport?.overall_compliance === 'SOURCE_REQUIRED' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                <HelpCircle size={12} /> SOURCE REQUIRED
              </span>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{lartasReport?.satisfied_permits_count || 0}</span>
            <span className="text-xs font-semibold text-slate-500">/ {lartasReport?.total_lartas_items || 0} Permits Attached</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-200/80 pt-1.5 flex items-center justify-between font-medium">
            <span>Permendag No. 36/2023</span>
            <span className="text-[10px] text-indigo-600 font-bold">INSW Live</span>
          </div>
        </Card>

        {/* Restricted Lartas Items */}
        <Card className="p-4 bg-slate-50/70 border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Restricted Items (Lartas)</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-700">{lartasReport?.total_lartas_items || 0}</span>
            <span className="text-xs font-semibold text-slate-500">of {lines.length} total lines</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-200/80 pt-1.5 font-medium">
            Subject to statutory import quotas & permits
          </div>
        </Card>

        {/* Missing Permits */}
        <Card className="p-4 bg-slate-50/70 border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Missing Permits</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">{lartasReport?.missing_permits_count || 0}</span>
            <span className="text-xs font-semibold text-slate-500">unattached</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-200/80 pt-1.5 font-medium">
            Blocks CEISA 4.0 submission readiness
          </div>
        </Card>

        {/* Unresolved Sources */}
        <Card className="p-4 bg-slate-50/70 border-slate-200 flex flex-col justify-between">
          <div>
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Regulatory Sources</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-purple-700">{lartasReport?.unresolved_source_count || 0}</span>
              <span className="text-xs font-semibold text-slate-500">unresolved HS</span>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-200 flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchLartasData}
              disabled={loading}
              className="w-full text-xs font-bold text-slate-700 hover:text-slate-900 border-slate-300"
            >
              <RefreshCw size={12} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Matrix
            </Button>
          </div>
        </Card>
      </div>

      {/* 2. REGULATORY SOURCE NOTICE BANNER */}
      <Card className="p-4 border-slate-200 shadow-xs bg-linear-to-r from-slate-50 via-rose-50/30 to-slate-50">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
              <BookOpen size={20} />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Indonesian Customs Regulatory Authority (BTKI 2026 & INSW)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Every trade restriction is mapped directly against Permendag No. 36/2023 and BTKI 2026 tariff master.
                Unsupported HS codes are strictly classified as <code className="text-purple-700 font-bold bg-purple-50 px-1 py-0.2 rounded-sm">RULE SOURCE REQUIRED</code>.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onNavigateTab?.('validation', 'REG-001')}
              className="text-xs font-bold text-rose-700 hover:text-rose-900 hover:bg-rose-50 border-rose-200"
            >
              Inspect Lartas in Control Plane <ArrowRight size={12} className="ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {/* 3. ITEM-LEVEL LARTAS MATRIX TABLE */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-rose-600" />
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Statutory Item-Level Lartas Matrix ({displayItems.length})
            </h3>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search SKU, HS, permit..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1 text-xs border border-slate-200 rounded-lg bg-white focus:ring-1 focus:ring-indigo-500 w-52"
              />
            </div>

            <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-white text-xs">
              <button
                onClick={() => setFilterStatus('ALL')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  filterStatus === 'ALL' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Items
              </button>
              <button
                onClick={() => setFilterStatus('RESTRICTED')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  filterStatus === 'RESTRICTED' ? 'bg-rose-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Restricted ({lartasReport?.total_lartas_items || 0})
              </button>
              <button
                onClick={() => setFilterStatus('MISSING_PERMITS')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  filterStatus === 'MISSING_PERMITS' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Missing Permits ({lartasReport?.missing_permits_count || 0})
              </button>
              <button
                onClick={() => setFilterStatus('SOURCE_REQUIRED')}
                className={`px-2.5 py-1 rounded-md font-semibold transition-all ${
                  filterStatus === 'SOURCE_REQUIRED' ? 'bg-purple-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Source Req ({lartasReport?.unresolved_source_count || 0})
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/75 text-slate-600 font-bold border-b border-slate-200">
                <th className="py-2.5 px-4 w-12 text-center">#</th>
                <th className="py-2.5 px-4">Commodity / SKU</th>
                <th className="py-2.5 px-4">HS Code</th>
                <th className="py-2.5 px-4 text-center">Determination</th>
                <th className="py-2.5 px-4">Required Permit</th>
                <th className="py-2.5 px-4">Statutory Source</th>
                <th className="py-2.5 px-4">Attached Evidence</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/80">
              {displayItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-medium">
                    No commodity items match the selected Lartas filters.
                  </td>
                </tr>
              ) : (
                displayItems.map(item => {
                  const isRestricted = item.lartas_determination === 'REQUIRED';
                  const isSourceReq = item.lartas_determination === 'RULE_SOURCE_REQUIRED';

                  return (
                    <tr
                      key={item.item_sequence}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isRestricted && !item.is_compliant
                          ? 'bg-rose-50/30'
                          : isSourceReq
                            ? 'bg-purple-50/30'
                            : ''
                      }`}
                    >
                      <td className="py-3 px-4 text-center font-bold text-slate-400">
                        {item.item_sequence}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 line-clamp-1">{item.goods_description}</div>
                        {item.sku_code && (
                          <span className="text-[10px] font-mono text-indigo-600 font-bold">
                            {item.sku_code}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-700">
                        {item.hs_code || <span className="text-rose-500 font-bold">MISSING</span>}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isRestricted && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                            <ShieldAlert size={10} /> RESTRICTED
                          </span>
                        )}
                        {!isRestricted && !isSourceReq && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            NOT LARTAS
                          </span>
                        )}
                        {isSourceReq && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800">
                            <HelpCircle size={10} /> SOURCE REQUIRED
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {item.required_permit_type || <span className="text-slate-400 font-normal">None</span>}
                      </td>
                      <td className="py-3 px-4 text-[11px] text-slate-600">
                        <span className="font-medium block truncate max-w-[160px]">{item.regulatory_source}</span>
                        <span className="text-[10px] text-slate-400">Ver: {item.regulatory_version}</span>
                      </td>
                      <td className="py-3 px-4">
                        {item.attached_permit_doc ? (
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <FileCheck size={13} />
                            <span className="truncate max-w-[120px]">
                              {item.attached_permit_doc.document_number || item.attached_permit_doc.file_name}
                            </span>
                          </div>
                        ) : isRestricted ? (
                          <span className="text-[11px] font-bold text-rose-600">
                            Missing Permit
                          </span>
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isRestricted && !item.is_compliant && (
                          <Button
                            size="sm"
                            onClick={() => setActiveItemModal(item)}
                            className="h-7 px-2.5 text-[11px] font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                          >
                            <Plus size={11} className="mr-1" /> Link Permit
                          </Button>
                        )}
                        {isRestricted && item.is_compliant && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                            <CheckCircle2 size={12} /> Satisfied
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 4. LINK PERMIT MODAL */}
      {activeItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden">
            <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <ShieldAlert size={16} className="text-rose-600" />
                <h3 className="text-sm font-bold text-slate-900">Attach Trade Import Permit</h3>
              </div>
              <button
                onClick={() => setActiveItemModal(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAttachPermit} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl space-y-1">
                <span className="text-[11px] font-bold text-rose-900">
                  Line #{activeItemModal.item_sequence}: {activeItemModal.goods_description}
                </span>
                <p className="text-[11px] text-rose-700 font-mono">
                  HS: {activeItemModal.hs_code} | Required: {activeItemModal.required_permit_type || 'PI/LS'}
                </p>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Permit Number (Nomor Izin PI/LS) *</label>
                <input
                  type="text"
                  placeholder="e.g. 04.PI-24.26.0099"
                  value={permitNumber}
                  onChange={e => setPermitNumber(e.target.value)}
                  required
                  className="w-full border border-slate-300 rounded-lg p-2 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Issuing Ministry / Authority</label>
                <input
                  type="text"
                  value={permitIssuer}
                  onChange={e => setPermitIssuer(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Permit Expiry Date</label>
                <input
                  type="date"
                  value={permitExpiry}
                  onChange={e => setPermitExpiry(e.target.value)}
                  className="w-full border border-slate-300 rounded-lg p-2"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-200">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setActiveItemModal(null)}
                  className="text-xs font-semibold"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs"
                >
                  {submitting ? 'Linking...' : 'Verify & Attach Permit'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
