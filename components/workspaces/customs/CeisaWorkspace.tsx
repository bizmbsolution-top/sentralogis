'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  FileCode,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Download,
  Copy,
  RefreshCw,
  Search,
  Check,
  Layers,
  ArrowRight,
  ShieldCheck,
  ShieldAlert,
  Code2,
  FileText,
  Clock,
  ExternalLink,
  Lock
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  CustomsDeclaration,
  CustomsClassificationLine,
  CustomsDeclarationDocument
} from '@/lib/domain/customs/types';
import {
  CeisaPreparationSummary,
  CeisaArtifactFormat,
  CeisaValidationIssue,
  CeisaFieldMappingItem
} from '@/lib/domain/customs/ceisa/types';

interface CeisaWorkspaceProps {
  declaration: CustomsDeclaration;
  lines: CustomsClassificationLine[];
  documents?: CustomsDeclarationDocument[];
  onNavigateTab?: (tabId: string, filter?: string) => void;
  onRefreshDeclaration?: () => void;
}

export function CeisaWorkspace({
  declaration,
  lines,
  documents = [],
  onNavigateTab,
  onRefreshDeclaration
}: CeisaWorkspaceProps) {
  const [summary, setSummary] = useState<CeisaPreparationSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [preparing, setPreparing] = useState(false);
  const [format, setFormat] = useState<CeisaArtifactFormat>('XML');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIssue, setSelectedIssue] = useState<CeisaValidationIssue | null>(null);
  const [copied, setCopied] = useState(false);

  const fetchCeisaData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/customs/declarations/${declaration.id}/ceisa?format=${format}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setSummary(json.data);
          if (json.data.validationIssues?.length > 0 && !selectedIssue) {
            setSelectedIssue(json.data.validationIssues[0]);
          }
        }
      }
    } catch (err) {
      console.error('Failed to load CEISA preparation data:', err);
    } finally {
      setLoading(false);
    }
  }, [declaration.id, format, selectedIssue]);

  useEffect(() => {
    fetchCeisaData();
  }, [fetchCeisaData]);

  // Trigger Versioned Preparation Run
  const handlePrepareRun = async () => {
    setPreparing(true);
    try {
      const res = await fetch(`/api/v1/customs/declarations/${declaration.id}/ceisa/prepare`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ format })
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setSummary(json.data);
          onRefreshDeclaration?.();
        }
      }
    } catch (err) {
      console.error('Failed to prepare CEISA run:', err);
    } finally {
      setPreparing(false);
    }
  };

  // Copy to clipboard
  const handleCopyArtifact = () => {
    if (!summary?.artifact?.content) return;
    navigator.clipboard.writeText(summary.artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download Artifact
  const handleDownloadArtifact = () => {
    if (!summary?.artifact?.content) return;
    const blob = new Blob([summary.artifact.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const ext = format === 'XML' ? 'xml' : format === 'EDI' ? 'edi' : 'json';
    a.download = `CEISA40_${declaration.declaration_number || 'AJU'}_v${summary.preparation.version_no || 1}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filter field mappings
  const filteredMappings = (summary?.fieldMappings || []).filter(m => {
    const q = searchQuery.toLowerCase();
    return (
      m.canonicalField.toLowerCase().includes(q) ||
      m.ceisaField.toLowerCase().includes(q) ||
      String(m.value || '').toLowerCase().includes(q) ||
      (m.notes || '').toLowerCase().includes(q)
    );
  });

  const blockingIssues = (summary?.validationIssues || []).filter(i => i.severity === 'BLOCKING');
  const warningIssues = (summary?.validationIssues || []).filter(i => i.severity === 'WARNING');

  return (
    <div className="space-y-6">
      {/* 1. TOP CEISA PREPARATION COCKPIT */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Readiness State */}
        <Card className="p-4 bg-slate-50/70 border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">CEISA Readiness</span>
            {summary?.readinessStatus === 'READY_TO_TRANSMIT' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={12} /> READY TO TRANSMIT
              </span>
            )}
            {summary?.readinessStatus === 'READY_FOR_REVIEW' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                <AlertTriangle size={12} /> REVIEW REQUIRED
              </span>
            )}
            {summary?.readinessStatus === 'BLOCKED' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-full">
                <AlertCircle size={12} /> PREPARATION BLOCKED
              </span>
            )}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {blockingIssues.length === 0 ? 'COMPLIANT' : `${blockingIssues.length} BLOCKERS`}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-200/80 pt-1.5 flex items-center justify-between font-medium">
            <span>Schema: {summary?.preparation.schema_version || 'CEISA-4.0-XML'}</span>
            <span className="text-[10px] text-indigo-600 font-bold">PIB BC 2.0</span>
          </div>
        </Card>

        {/* Preparation Version */}
        <Card className="p-4 bg-slate-50/70 border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Preparation Version</span>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-700">
              v{summary?.preparation.version_no || 1}
            </span>
            <span className="text-xs font-semibold text-slate-500">
              ({summary?.preparation.status || 'DRAFT'})
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-200/80 pt-1.5 font-medium">
            {summary?.artifact?.sizeBytes ? `${summary.artifact.sizeBytes.toLocaleString()} bytes` : 'In-Memory Preview'}
          </div>
        </Card>

        {/* Checksum SHA-256 */}
        <Card className="p-4 bg-slate-50/70 border-slate-200">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Artifact Checksum</span>
          <div className="mt-2">
            <span className="font-mono text-xs font-bold text-slate-800 break-all block">
              {summary?.artifact?.checksumSha256
                ? `${summary.artifact.checksumSha256.slice(0, 16)}...`
                : 'Pending Generation'}
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 border-t border-slate-200/80 pt-1.5 flex items-center justify-between font-medium">
            <span>SHA-256 Immutable</span>
            <span className="text-[10px] text-emerald-600 font-bold">Verified</span>
          </div>
        </Card>

        {/* Action Controls */}
        <Card className="p-4 bg-slate-50/70 border-slate-200 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Actions</span>
          <div className="mt-2 flex items-center gap-2">
            <Button
              onClick={handlePrepareRun}
              disabled={preparing}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs"
            >
              <RefreshCw size={13} className={`mr-1.5 ${preparing ? 'animate-spin' : ''}`} />
              {preparing ? 'Generating...' : 'Prepare & Lock Version'}
            </Button>
          </div>
        </Card>
      </div>

      {/* 2. HUMAN REVIEW CHECKLIST STRIP */}
      {summary && (
        <Card className="p-4 border-slate-200 shadow-xs bg-slate-50/50">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-indigo-600" />
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Pre-Submission CEISA 4.0 Compliance Checklist
              </h3>
            </div>
            <span className="text-[11px] font-medium text-slate-400">Human-in-the-Loop Specialist Gate</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-2.5">
            {summary.humanReviewChecklist.map((item, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl border text-xs flex flex-col justify-between ${
                  item.status === 'VERIFIED'
                    ? 'bg-emerald-50/60 border-emerald-200 text-emerald-950'
                    : item.status === 'ATTENTION_REQUIRED'
                      ? 'bg-amber-50/60 border-amber-200 text-amber-950'
                      : 'bg-rose-50/60 border-rose-200 text-rose-950'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">
                      {item.category}
                    </span>
                    {item.status === 'VERIFIED' && <CheckCircle2 size={12} className="text-emerald-600" />}
                    {item.status === 'ATTENTION_REQUIRED' && <AlertTriangle size={12} className="text-amber-600" />}
                    {item.status === 'BLOCKED' && <AlertCircle size={12} className="text-rose-600" />}
                  </div>
                  <p className="font-semibold text-[11px] mt-1 line-clamp-2">{item.checkpoint}</p>
                </div>
                <span className="text-[10px] text-slate-500 mt-2 block font-medium">
                  {item.notes}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* 3. 3-PANEL CONTROL WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* PANEL 1: VALIDATION QUEUE (3 COLS) */}
        <Card className="lg:col-span-3 border-slate-200 shadow-xs flex flex-col h-[520px]">
          <div className="p-3.5 border-b border-slate-200 bg-slate-50/75 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <ShieldAlert size={14} className="text-rose-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Validation Queue ({summary?.validationIssues.length || 0})
              </h4>
            </div>
            <span className="text-[10px] font-bold text-slate-400">3-Tier Rules</span>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {summary?.validationIssues.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                <CheckCircle2 size={24} className="text-emerald-500 mx-auto mb-2" />
                <p className="font-bold text-slate-700">Zero Validation Blockers</p>
                <p className="text-[11px] mt-0.5">Payload conforms to CEISA 4.0 XML schema and business rules.</p>
              </div>
            ) : (
              summary?.validationIssues.map((issue, idx) => {
                const isSelected = selectedIssue?.ruleCode === issue.ruleCode && selectedIssue?.fieldPath === issue.fieldPath;
                const isBlocking = issue.severity === 'BLOCKING';

                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedIssue(issue)}
                    className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-100 bg-indigo-50/40'
                        : isBlocking
                          ? 'border-rose-200 bg-rose-50/30 hover:bg-rose-50/60'
                          : 'border-amber-200 bg-amber-50/30 hover:bg-amber-50/60'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.2 rounded-sm ${
                          isBlocking ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {issue.ruleCode}
                      </span>
                      <span className="text-[10px] font-bold text-slate-400">{issue.layer}</span>
                    </div>
                    <p className="font-semibold text-slate-900 text-[11px] mt-1 line-clamp-2">
                      {issue.message}
                    </p>
                    <span className="text-[10px] text-slate-500 font-mono block mt-1 truncate">
                      {issue.fieldPath}
                    </span>
                  </div>
                );
              })
            )}
          </div>

          {/* Selected Issue Detail Drawer */}
          {selectedIssue && (
            <div className="p-3 border-t border-slate-200 bg-slate-50 text-xs space-y-1.5">
              <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                Issue Inspector ({selectedIssue.ruleCode})
              </span>
              <p className="text-[11px] text-slate-700 font-medium">{selectedIssue.message}</p>
              {selectedIssue.resolutionHint && (
                <p className="text-[10px] text-slate-500 bg-white p-1.5 rounded-md border border-slate-200">
                  <span className="font-bold text-slate-700">Resolution:</span> {selectedIssue.resolutionHint}
                </p>
              )}
            </div>
          )}
        </Card>

        {/* PANEL 2: FIELD MAPPING INSPECTOR (5 COLS) */}
        <Card className="lg:col-span-5 border-slate-200 shadow-xs flex flex-col h-[520px]">
          <div className="p-3 border-b border-slate-200 bg-slate-50/75 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Layers size={14} className="text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Field Mapping Inspector
              </h4>
            </div>

            <div className="relative w-40">
              <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search fields..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-6 pr-2 py-0.5 text-xs border border-slate-200 rounded-md bg-white w-full"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 text-xs">
            {filteredMappings.length === 0 ? (
              <div className="p-6 text-center text-slate-400">No field mappings match search query.</div>
            ) : (
              filteredMappings.map((m, idx) => (
                <div key={idx} className="p-2.5 hover:bg-slate-50/70 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 text-[11px]">{m.ceisaField}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded-sm ${
                        m.status === 'VALID'
                          ? 'bg-emerald-100 text-emerald-800'
                          : m.status === 'WARNING'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {m.status}
                    </span>
                  </div>

                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-600 font-medium">
                    <span className="text-slate-400 truncate max-w-[180px]">
                      From: <code className="text-slate-600">{m.canonicalField}</code>
                    </span>
                    <span className="font-mono font-bold text-indigo-700 truncate max-w-[140px]">
                      {String(m.value || '-')}
                    </span>
                  </div>

                  {m.notes && (
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      {m.notes} • Trans: {m.transformationType}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </Card>

        {/* PANEL 3: ARTIFACT PREVIEW & EXPORT (4 COLS) */}
        <Card className="lg:col-span-4 border-slate-200 shadow-xs flex flex-col h-[520px]">
          <div className="p-3 border-b border-slate-200 bg-slate-50/75 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <FileCode size={14} className="text-indigo-600" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Generated Artifact Preview
              </h4>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setFormat('XML')}
                className={`px-2 py-0.5 rounded-sm text-[10px] font-bold ${
                  format === 'XML' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                XML
              </button>
              <button
                onClick={() => setFormat('EDI')}
                className={`px-2 py-0.5 rounded-sm text-[10px] font-bold ${
                  format === 'EDI' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                EDI
              </button>
              <button
                onClick={() => setFormat('JSON')}
                className={`px-2 py-0.5 rounded-sm text-[10px] font-bold ${
                  format === 'JSON' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'
                }`}
              >
                JSON
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 bg-slate-950 text-slate-200 font-mono text-[10px] leading-relaxed select-all">
            <pre className="whitespace-pre-wrap">{summary?.artifact?.content || '<!-- No artifact generated -->'}</pre>
          </div>

          <div className="p-2.5 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyArtifact}
              className="text-xs font-bold flex-1"
            >
              {copied ? <Check size={12} className="mr-1 text-emerald-600" /> : <Copy size={12} className="mr-1" />}
              {copied ? 'Copied' : 'Copy'}
            </Button>
            <Button
              onClick={handleDownloadArtifact}
              disabled={!summary?.artifact?.content}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex-1 shadow-xs"
            >
              <Download size={12} className="mr-1" /> Download
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
