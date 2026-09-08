'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CustomsDeclaration,
  CustomsClassificationLine,
  CustomsDeclarationDocument,
  CustomsValidationResult,
  CustomsDeclarationException,
  CustomsExceptionCategory
} from '@/lib/domain/customs/types';
import { ExceptionQueue } from './ExceptionQueue';
import { ExceptionInspector } from './ExceptionInspector';
import { ResolutionActionDrawer } from './ResolutionActionDrawer';
import { Button } from '@/components/ui/Button';
import GradientButton from '@/components/ui/GradientButton';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Download,
  Loader2,
  ShieldCheck,
  Sparkles,
  HelpCircle,
  DollarSign,
  ShieldAlert,
  FileText,
  Boxes,
  Globe2,
  Receipt,
  Building2
} from 'lucide-react';

interface ValidationWorkspaceProps {
  declaration: CustomsDeclaration;
  lines: CustomsClassificationLine[];
  documents?: CustomsDeclarationDocument[];
  onDeclarationUpdated?: (updatedDec: CustomsDeclaration) => void;
  onLinesUpdated?: (updatedLines: CustomsClassificationLine[]) => void;
  onNavigateTab?: (tab: string, filter?: string) => void;
  initialFilter?: string;
}

export function ValidationWorkspace({
  declaration,
  lines,
  documents = [],
  onDeclarationUpdated,
  onLinesUpdated,
  onNavigateTab,
  initialFilter
}: ValidationWorkspaceProps) {
  const [validationResult, setValidationResult] = useState<CustomsValidationResult | null>(null);
  const [exceptions, setExceptions] = useState<CustomsDeclarationException[]>([]);
  const [selectedExceptionId, setSelectedExceptionId] = useState<string | null>(null);

  // Filter states
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState(initialFilter || '');

  const [loading, setLoading] = useState(true);
  const [validating, setValidating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Fetch & Run Validation Pipeline
  const runValidation = useCallback(async (isManualTrigger = false) => {
    if (!declaration?.id) return;
    if (isManualTrigger) setValidating(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/v1/customs/declarations/${declaration.id}/validation`, {
        method: isManualTrigger ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
        body: isManualTrigger ? JSON.stringify({ triggerType: 'MANUAL' }) : undefined
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error?.message || 'Failed to run customs validation engine');
      }

      const json = await res.json();
      if (json.success && json.data) {
        setValidationResult(json.data);
        const excList = json.data.active_exceptions || [];
        setExceptions(excList);

        // Auto select first blocking or first exception if none selected
        if (!selectedExceptionId && excList.length > 0) {
          const firstBlocking = excList.find((e: CustomsDeclarationException) => e.severity === 'BLOCKING' && e.status !== 'RESOLVED');
          setSelectedExceptionId(firstBlocking ? firstBlocking.id : excList[0].id);
        }
      }
    } catch (err: any) {
      console.error('[Validation Workspace Error]:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setValidating(false);
    }
  }, [declaration?.id, selectedExceptionId]);

  useEffect(() => {
    runValidation();
  }, [runValidation]);

  // Selected Exception & corresponding Line item
  const selectedException = useMemo(() => {
    return exceptions.find(e => e.id === selectedExceptionId) || null;
  }, [exceptions, selectedExceptionId]);

  const selectedLine = useMemo(() => {
    if (!selectedException) return null;
    if (selectedException.classification_line_id) {
      return lines.find(l => l.id === selectedException.classification_line_id) || null;
    }
    if (selectedException.item_sequence) {
      return lines.find(l => l.item_sequence === selectedException.item_sequence) || null;
    }
    return null;
  }, [selectedException, lines]);

  // 2. Export Exceptions as TSV
  const handleExportExceptions = () => {
    if (exceptions.length === 0) return;

    const headers = ['Rule Code', 'Severity', 'Category', 'Status', 'Line No', 'SKU', 'Title', 'Description', 'Current Value', 'Expected Value'];
    const rows = exceptions.map(e => [
      e.rule_code,
      e.severity,
      e.category,
      e.status,
      e.item_sequence || '',
      e.sku_code || '',
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${(e.description || '').replace(/"/g, '""')}"`,
      `"${(e.current_value || '').replace(/"/g, '""')}"`,
      `"${(e.expected_value || '').replace(/"/g, '""')}"`
    ]);

    const tsvContent = [headers.join('\t'), ...rows.map(r => r.join('\t'))].join('\n');
    const blob = new Blob([tsvContent], { type: 'text/tab-separated-values;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `exceptions_${declaration.declaration_number || declaration.id}.tsv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getOverallReadinessBadge = () => {
    const status = validationResult?.overall_status || 'NOT_READY';
    switch (status) {
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
            <CheckCircle2 size={14} /> READY FOR CEISA 4.0
          </span>
        );
      case 'READY_WITH_WARNINGS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 border border-amber-300">
            <AlertTriangle size={14} /> READY WITH WARNINGS
          </span>
        );
      case 'BLOCKED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
            <XCircle size={14} /> SUBMISSION BLOCKED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
            NOT READY
          </span>
        );
    }
  };

  const categoryPills: { key: CustomsExceptionCategory; label: string; icon: any }[] = [
    { key: 'IDENTITY', label: 'Identity', icon: Building2 },
    { key: 'CARGO', label: 'Cargo', icon: Boxes },
    { key: 'CLASSIFICATION', label: 'Classification', icon: HelpCircle },
    { key: 'VALUATION', label: 'Valuation', icon: DollarSign },
    { key: 'ORIGIN', label: 'Origin', icon: Globe2 },
    { key: 'DOCUMENTS', label: 'Documents', icon: FileText },
    { key: 'TAX', label: 'Tax', icon: Receipt },
    { key: 'LARTAS', label: 'Lartas', icon: ShieldAlert }
  ];

  return (
    <div className="space-y-4">
      {/* 1. TOP CONTROL COCKPIT */}
      <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <ShieldCheck size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black tracking-tight text-white">
                  Customs Declaration Control & Exception Cockpit
                </h2>
                {getOverallReadinessBadge()}
              </div>
              <p className="text-xs text-slate-400">
                Deterministic compliance engine with persistent Exception Registry and auditable waiver governance
              </p>
            </div>
          </div>
        </div>

        {/* Readiness Meter & Trigger Buttons */}
        <div className="flex items-center gap-3">
          <div className="bg-white/10 px-4 py-2 rounded-2xl border border-white/10 text-right">
            <span className="text-[10px] uppercase font-bold text-indigo-300 block">Readiness Score</span>
            <span className="text-xl font-mono font-black text-white">
              {validationResult?.readiness_percentage ?? 0}%
            </span>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={handleExportExceptions}
            disabled={exceptions.length === 0}
            className="text-xs font-semibold bg-white/10 border-white/20 text-white hover:bg-white/20"
          >
            <Download size={13} className="mr-1" /> Export TSV
          </Button>

          <GradientButton
            onClick={() => runValidation(true)}
            disabled={validating}
            className="px-4 py-2 text-xs font-bold"
          >
            {validating ? (
              <>
                <Loader2 size={13} className="animate-spin mr-1" /> Running Engine...
              </>
            ) : (
              <>
                <RefreshCw size={13} className="mr-1" /> Run Re-validation
              </>
            )}
          </GradientButton>
        </div>
      </div>

      {/* 2. CATEGORY STATUS PILLS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
        {categoryPills.map(cat => {
          const Icon = cat.icon;
          const status = validationResult?.readiness_by_category?.[cat.key] || 'READY';
          const isCatSelected = categoryFilter === cat.key;
          const catIssuesCount = exceptions.filter(e => e.category === cat.key && e.status !== 'RESOLVED' && e.status !== 'WAIVED').length;

          return (
            <button
              key={cat.key}
              onClick={() => setCategoryFilter(isCatSelected ? 'ALL' : cat.key)}
              className={`p-2.5 rounded-2xl border transition-all text-left flex flex-col justify-between ${
                isCatSelected
                  ? 'ring-2 ring-indigo-500 bg-indigo-50/70 border-indigo-300 shadow-xs'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <Icon size={14} className={status === 'BLOCKED' ? 'text-rose-600' : status === 'WARNING' ? 'text-amber-600' : 'text-emerald-600'} />
                {catIssuesCount > 0 && (
                  <span className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${status === 'BLOCKED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'}`}>
                    {catIssuesCount}
                  </span>
                )}
              </div>
              <div className="mt-1">
                <span className="text-[11px] font-bold text-slate-800 block truncate">{cat.label}</span>
                <span className={`text-[9px] font-black uppercase ${status === 'BLOCKED' ? 'text-rose-700' : status === 'WARNING' ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {status}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. MAIN 3-PANE WORKSPACE */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 min-h-[620px]">
        {/* LEFT PANE: EXCEPTION QUEUE (4 cols) */}
        <div className="lg:col-span-4 h-full">
          <ExceptionQueue
            exceptions={exceptions}
            selectedExceptionId={selectedExceptionId}
            onSelectException={setSelectedExceptionId}
            severityFilter={severityFilter}
            onSeverityFilterChange={setSeverityFilter}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
          />
        </div>

        {/* CENTER PANE: EXCEPTION INSPECTOR (5 cols) */}
        <div className="lg:col-span-5 h-full">
          <ExceptionInspector
            exception={selectedException}
            line={selectedLine}
            onQuickNavigateTab={onNavigateTab}
          />
        </div>

        {/* RIGHT PANE: RESOLUTION ACTION DRAWER (3 cols) */}
        <div className="lg:col-span-3 h-full">
          <ResolutionActionDrawer
            declarationId={declaration.id}
            exception={selectedException}
            line={selectedLine}
            onSuccess={() => runValidation(true)}
            onNavigateTab={onNavigateTab}
          />
        </div>
      </div>
    </div>
  );
}
