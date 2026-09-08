'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  History,
  ShieldCheck,
  ShieldAlert,
  Download,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Cpu,
  Layers,
  ArrowRight,
  Plus,
  Lock,
  Boxes,
  Scale,
  Send,
  Sparkles,
  FileCode
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  CustomsDeclaration,
  CustomsClassificationLine,
  CustomsDeclarationDocument
} from '@/lib/domain/customs/types';
import {
  CustomsAuditEvent,
  CustomsAuditEventCategory,
  CustomsDecision,
  AuditIntegrityReport,
  DeclarationJourneyMilestone
} from '@/lib/domain/customs/audit/types';

interface AuditWorkspaceProps {
  declaration: CustomsDeclaration;
  lines: CustomsClassificationLine[];
  documents?: CustomsDeclarationDocument[];
  onNavigateTab?: (tabId: string, filter?: string) => void;
  onRefreshDeclaration?: () => void;
}

export function AuditWorkspace({
  declaration,
  lines,
  documents = [],
  onNavigateTab,
  onRefreshDeclaration
}: AuditWorkspaceProps) {
  const [events, setEvents] = useState<CustomsAuditEvent[]>([]);
  const [journey, setJourney] = useState<DeclarationJourneyMilestone[]>([]);
  const [integrity, setIntegrity] = useState<AuditIntegrityReport | null>(null);
  const [decisions, setDecisions] = useState<CustomsDecision[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // Filters & Selection
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CustomsAuditEvent | null>(null);

  // Decision Modal State
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [decisionType, setDecisionType] = useState<string>('VALUATION_REVIEW');
  const [decisionOutcome, setDecisionOutcome] = useState<string>('ACCEPTED');
  const [decisionReason, setDecisionReason] = useState('');
  const [decisionJustification, setDecisionJustification] = useState('');

  const fetchAuditData = useCallback(async () => {
    setLoading(true);
    try {
      const [auditRes, decisionsRes] = await Promise.all([
        fetch(`/api/v1/customs/declarations/${declaration.id}/audit`),
        fetch(`/api/v1/customs/declarations/${declaration.id}/decisions`)
      ]);

      if (auditRes.ok) {
        const json = await auditRes.json();
        if (json.success && json.data) {
          setEvents(json.data.events || []);
          setJourney(json.data.journey || []);
          setIntegrity(json.data.integrity || null);
          if (json.data.events?.length > 0 && !selectedEvent) {
            setSelectedEvent(json.data.events[0]);
          }
        }
      }

      if (decisionsRes.ok) {
        const decJson = await decisionsRes.json();
        if (decJson.success && decJson.data) {
          setDecisions(decJson.data || []);
        }
      }
    } catch (err) {
      console.error('Failed to load audit data:', err);
    } finally {
      setLoading(false);
    }
  }, [declaration.id, selectedEvent]);

  useEffect(() => {
    fetchAuditData();
  }, [fetchAuditData]);

  // Export Audit Package
  const handleExport = async (format: 'JSON' | 'CSV') => {
    setExporting(true);
    try {
      const res = await fetch(`/api/v1/customs/declarations/${declaration.id}/audit/export`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CustomsAudit_${declaration.declaration_number || 'AJU'}.${format.toLowerCase()}`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  // Record Decision
  const handleRecordDecision = async () => {
    if (!decisionReason || decisionReason.trim().length < 5) return;

    try {
      const res = await fetch(`/api/v1/customs/declarations/${declaration.id}/decisions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          decisionType,
          outcome: decisionOutcome,
          reason: decisionReason,
          justification: decisionJustification,
          actorName: 'PPJK Specialist',
          actorRole: 'PPJK_OPERATOR'
        })
      });
      if (res.ok) {
        setIsDecisionModalOpen(false);
        setDecisionReason('');
        setDecisionJustification('');
        fetchAuditData();
        onRefreshDeclaration?.();
      }
    } catch (err) {
      console.error('Failed to record decision:', err);
    }
  };

  // Filter events
  const filteredEvents = events.filter(e => {
    const matchesCat = selectedCategory === 'ALL' || e.event_category === selectedCategory;
    const q = searchQuery.toLowerCase();
    const matchesQuery =
      !q ||
      e.summary.toLowerCase().includes(q) ||
      e.event_type.toLowerCase().includes(q) ||
      (e.actor_name || '').toLowerCase().includes(q) ||
      String(e.sequence_no).includes(q);
    return matchesCat && matchesQuery;
  });

  return (
    <div className="space-y-6">
      {/* 1. TOP COCKPIT: DECLARATION JOURNEY & INTEGRITY BANNER */}
      <Card className="p-4 border-slate-200 bg-slate-50/70 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <History size={18} className="text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Customs Declaration Journey</h3>
              <p className="text-[11px] text-slate-500">
                End-to-end milestone progression reconstructed from immutable audit events
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {integrity?.status === 'VALID' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-100/80 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-lg shadow-2xs">
                <ShieldCheck size={14} className="text-emerald-600" />
                CHAIN VALID (SHA-256)
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-100/80 border border-rose-200 text-rose-800 text-xs font-bold rounded-lg shadow-2xs">
                <ShieldAlert size={14} className="text-rose-600" />
                TAMPER DETECTED
              </span>
            )}

            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExport('JSON')}
              disabled={exporting}
              className="text-xs font-bold"
            >
              <Download size={12} className="mr-1" /> JSON
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleExport('CSV')}
              disabled={exporting}
              className="text-xs font-bold"
            >
              <Download size={12} className="mr-1" /> CSV
            </Button>
          </div>
        </div>

        {/* Visual Journey Strip */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {journey.map((m, idx) => (
            <div
              key={m.stageId}
              className={`p-2 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                m.status === 'COMPLETED'
                  ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                  : m.status === 'IN_PROGRESS'
                    ? 'bg-indigo-50/70 border-indigo-200 text-indigo-950'
                    : m.status === 'ATTENTION_REQUIRED'
                      ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                      : 'bg-white border-slate-200 text-slate-500'
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold opacity-60">#{idx + 1}</span>
                  {m.status === 'COMPLETED' && <CheckCircle2 size={12} className="text-emerald-600" />}
                  {m.status === 'IN_PROGRESS' && <Sparkles size={12} className="text-indigo-600" />}
                  {m.status === 'ATTENTION_REQUIRED' && <AlertTriangle size={12} className="text-amber-600" />}
                  {m.status === 'PENDING' && <div className="w-2 h-2 rounded-full bg-slate-300" />}
                </div>
                <p className="font-bold text-[11px] mt-1 leading-snug line-clamp-1">{m.title}</p>
              </div>
              <p className="text-[10px] opacity-75 mt-1.5 line-clamp-1">{m.summary}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* 2. 3-PANEL CONTROL WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* PANEL 1: AUDIT EVENT TIMELINE (4 COLS) */}
        <Card className="lg:col-span-4 border-slate-200 shadow-xs flex flex-col h-[560px]">
          <div className="p-3 border-b border-slate-200 bg-slate-50/75 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <History size={14} className="text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Audit Timeline ({filteredEvents.length})
                </h4>
              </div>
              <span className="text-[10px] font-bold text-slate-400">Append-Only</span>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1 no-scrollbar text-[10px]">
              {['ALL', 'DECLARATION', 'ITEM', 'DOCUMENT', 'VALIDATION', 'EXCEPTION', 'VALUATION', 'LARTAS', 'CEISA'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2 py-0.5 rounded-full font-bold whitespace-nowrap ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search audit trail..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-2 py-1 text-xs border border-slate-200 rounded-lg bg-white"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {filteredEvents.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No audit events recorded for current filter.
              </div>
            ) : (
              filteredEvents.map(evt => {
                const isSelected = selectedEvent?.id === evt.id;
                return (
                  <div
                    key={evt.id}
                    onClick={() => setSelectedEvent(evt)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-100 bg-indigo-50/40'
                        : 'border-slate-200 hover:bg-slate-50/80 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.2 rounded-sm">
                          #{evt.sequence_no}
                        </span>
                        <span className="text-[10px] font-bold text-slate-700 uppercase">
                          {evt.event_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        {new Date(evt.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>

                    <p className="font-medium text-slate-800 text-[11px] mt-1 line-clamp-2">
                      {evt.summary}
                    </p>

                    <div className="mt-1.5 flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-100 pt-1">
                      <span className="flex items-center gap-1">
                        {evt.actor_type === 'USER' ? <User size={10} /> : <Cpu size={10} />}
                        {evt.actor_name || 'SYSTEM'}
                      </span>
                      <span className="font-mono text-slate-400 truncate max-w-[100px]">
                        {evt.event_hash.slice(0, 8)}...
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>

        {/* PANEL 2: EVENT INSPECTOR & DIFF VIEWER (5 COLS) */}
        <Card className="lg:col-span-5 border-slate-200 shadow-xs flex flex-col h-[560px]">
          <div className="p-3 border-b border-slate-200 bg-slate-50/75 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FileText size={14} className="text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Event Inspector
              </h4>
            </div>
            {selectedEvent && (
              <span className="font-mono text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                Sequence #{selectedEvent.sequence_no}
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {selectedEvent ? (
              <>
                {/* Event Header Card */}
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
                      {selectedEvent.event_category} • {selectedEvent.event_type}
                    </span>
                    <span className="text-[10px] text-slate-400">{selectedEvent.created_at}</span>
                  </div>
                  <h4 className="font-bold text-slate-900 text-sm leading-snug">{selectedEvent.summary}</h4>
                  <div className="flex items-center gap-3 text-[11px] text-slate-600 pt-1">
                    <span>
                      <strong className="text-slate-700">Actor:</strong> {selectedEvent.actor_name || 'SYSTEM'} (
                      {selectedEvent.actor_role || 'SYSTEM'})
                    </span>
                    <span>
                      <strong className="text-slate-700">Type:</strong> {selectedEvent.actor_type}
                    </span>
                  </div>
                </div>

                {/* Structured Diff Section */}
                <div>
                  <h5 className="text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers size={13} className="text-indigo-600" />
                    Structured Before / After Diff
                  </h5>

                  {selectedEvent.diff && Object.keys(selectedEvent.diff).length > 0 ? (
                    <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-200">
                      <div className="grid grid-cols-12 bg-slate-100/80 p-2 text-[10px] font-bold text-slate-600 uppercase">
                        <span className="col-span-4">Field</span>
                        <span className="col-span-4">Previous (Before)</span>
                        <span className="col-span-4">Updated (After)</span>
                      </div>
                      {Object.entries(selectedEvent.diff).map(([key, delta]) => (
                        <div key={key} className="grid grid-cols-12 p-2 text-[11px] items-center hover:bg-slate-50">
                          <span className="col-span-4 font-mono font-bold text-slate-800">{key}</span>
                          <span className="col-span-4 font-mono text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-sm truncate mr-1">
                            {JSON.stringify(delta.before)}
                          </span>
                          <span className="col-span-4 font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-sm truncate">
                            {JSON.stringify(delta.after)}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-center text-[11px]">
                      No field mutations in this business event (State snapshot or confirmation).
                    </div>
                  )}
                </div>

                {/* Cryptographic Linkage Details */}
                <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[10px] space-y-1.5">
                  <div className="flex items-center justify-between text-indigo-300 font-bold">
                    <span>CRYPTOGRAPHIC HASH INTEGRITY</span>
                    <span>SHA-256</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Event Hash:</span>
                    <span className="text-emerald-400 break-all">{selectedEvent.event_hash}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Previous Event Hash:</span>
                    <span className="text-slate-300 break-all">{selectedEvent.previous_event_hash || '0000000000... (GENESIS)'}</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-400">Select an audit event from the timeline to inspect.</div>
            )}
          </div>
        </Card>

        {/* PANEL 3: CUSTOMS DECISIONS & EVIDENCE VAULT (3 COLS) */}
        <Card className="lg:col-span-3 border-slate-200 shadow-xs flex flex-col h-[560px]">
          <div className="p-3 border-b border-slate-200 bg-slate-50/75 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Decisions ({decisions.length})
              </h4>
            </div>
            <Button
              size="sm"
              onClick={() => setIsDecisionModalOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold h-6 px-2 shadow-2xs"
            >
              <Plus size={10} className="mr-0.5" /> New Decision
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {decisions.length === 0 ? (
              <div className="p-8 text-center text-slate-400 text-xs">
                No formal decisions locked for this declaration.
              </div>
            ) : (
              decisions.map(d => (
                <div key={d.id} className="p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50/70 transition-all text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-800 text-[10px]">{d.decision_number}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-sm ${
                        d.outcome === 'APPROVED' || d.outcome === 'ACCEPTED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : d.outcome === 'WAIVED'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {d.outcome}
                    </span>
                  </div>

                  <p className="font-semibold text-slate-900 text-[11px] leading-snug">{d.reason}</p>

                  {d.justification && (
                    <p className="text-[10px] text-slate-600 bg-slate-50 p-1.5 rounded-md border border-slate-200 font-medium">
                      <strong className="text-slate-700">Justification:</strong> {d.justification}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                    <span>{d.actor_name} ({d.actor_role})</span>
                    <span>{new Date(d.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* 3. RECORD FORMAL DECISION MODAL */}
      {isDecisionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md p-5 bg-white border-slate-200 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Record Formal Customs Decision</h3>
              </div>
              <button
                onClick={() => setIsDecisionModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ×
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Decision Type</label>
                <select
                  value={decisionType}
                  onChange={e => setDecisionType(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white"
                >
                  <option value="VALUATION_REVIEW">Valuation Review / Price Benchmark</option>
                  <option value="LARTAS_REQUIREMENT">Lartas Import Quota Determination</option>
                  <option value="EXCEPTION_WAIVER">Compliance Warning Waiver</option>
                  <option value="CLASSIFICATION_OVERRIDE">Classification Specialist Override</option>
                  <option value="SUBMISSION_AUTHORIZATION">CEISA Submission Authorization</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Decision Outcome</label>
                <select
                  value={decisionOutcome}
                  onChange={e => setDecisionOutcome(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs bg-white"
                >
                  <option value="ACCEPTED">ACCEPTED</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="WAIVED">WAIVED (Warning only)</option>
                  <option value="REJECTED">REJECTED</option>
                  <option value="ESCALATED">ESCALATED</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Decision Reason / Statutory Finding</label>
                <input
                  type="text"
                  placeholder="e.g. Historical price variance within accepted tolerance of PMK 144/2022"
                  value={decisionReason}
                  onChange={e => setDecisionReason(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Written Justification & Evidence</label>
                <textarea
                  rows={3}
                  placeholder="Mandatory justification detailing evidence, documents, or supervisor approval..."
                  value={decisionJustification}
                  onChange={e => setDecisionJustification(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="secondary" size="sm" onClick={() => setIsDecisionModalOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleRecordDecision}
                disabled={!decisionReason || decisionReason.trim().length < 5}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold"
              >
                Lock Decision
              </Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
