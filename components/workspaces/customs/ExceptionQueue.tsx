'use client';

import React from 'react';
import { CustomsDeclarationException, CustomsExceptionSeverity, CustomsExceptionCategory } from '@/lib/domain/customs/types';
import {
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  HelpCircle,
  DollarSign,
  ShieldAlert,
  FileText,
  Boxes,
  Globe2,
  Building2,
  Receipt,
  Search,
  Check
} from 'lucide-react';

interface ExceptionQueueProps {
  exceptions: CustomsDeclarationException[];
  selectedExceptionId: string | null;
  onSelectException: (exceptionId: string) => void;
  severityFilter: string;
  onSeverityFilterChange: (severity: string) => void;
  categoryFilter: string;
  onCategoryFilterChange: (category: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
}

export function ExceptionQueue({
  exceptions,
  selectedExceptionId,
  onSelectException,
  severityFilter,
  onSeverityFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  statusFilter,
  onStatusFilterChange,
  searchQuery,
  onSearchQueryChange
}: ExceptionQueueProps) {
  // Filter exceptions
  const filteredExceptions = exceptions.filter(exc => {
    if (severityFilter !== 'ALL' && exc.severity !== severityFilter) return false;
    if (categoryFilter !== 'ALL' && exc.category !== categoryFilter) return false;
    if (statusFilter !== 'ALL' && exc.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = exc.rule_code.toLowerCase().includes(q);
      const matchTitle = exc.title.toLowerCase().includes(q);
      const matchDesc = exc.description.toLowerCase().includes(q);
      const matchSku = exc.sku_code?.toLowerCase().includes(q) || false;
      if (!matchCode && !matchTitle && !matchDesc && !matchSku) return false;
    }
    return true;
  });

  // Sort: BLOCKING first, then WARNING, then INFORMATIONAL; within same severity, OPEN first
  const sortedExceptions = [...filteredExceptions].sort((a, b) => {
    const sevScore: Record<CustomsExceptionSeverity, number> = { BLOCKING: 3, WARNING: 2, INFORMATIONAL: 1 };
    const statScore: Record<string, number> = { OPEN: 3, REOPENED: 3, ACKNOWLEDGED: 2, WAIVED: 1, RESOLVED: 0 };

    const aSev = sevScore[a.severity] || 0;
    const bSev = sevScore[b.severity] || 0;
    if (aSev !== bSev) return bSev - aSev;

    const aStat = statScore[a.status] || 0;
    const bStat = statScore[b.status] || 0;
    if (aStat !== bStat) return bStat - aStat;

    return (a.item_sequence || 0) - (b.item_sequence || 0);
  });

  const getCategoryIcon = (category: CustomsExceptionCategory) => {
    switch (category) {
      case 'CLASSIFICATION': return <HelpCircle size={13} className="text-indigo-600" />;
      case 'VALUATION': return <DollarSign size={13} className="text-emerald-600" />;
      case 'LARTAS': return <ShieldAlert size={13} className="text-rose-600" />;
      case 'DOCUMENTS': return <FileText size={13} className="text-amber-600" />;
      case 'CARGO': return <Boxes size={13} className="text-blue-600" />;
      case 'ORIGIN': return <Globe2 size={13} className="text-cyan-600" />;
      case 'IDENTITY': return <Building2 size={13} className="text-slate-600" />;
      case 'TAX': return <Receipt size={13} className="text-purple-600" />;
    }
  };

  const getSeverityBadge = (severity: CustomsExceptionSeverity) => {
    switch (severity) {
      case 'BLOCKING':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-300">
            <AlertOctagon size={11} /> Blocking
          </span>
        );
      case 'WARNING':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
            <AlertTriangle size={11} /> Warning
          </span>
        );
      case 'INFORMATIONAL':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full border border-blue-300">
            <Info size={11} /> Info
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">Open</span>;
      case 'ACKNOWLEDGED':
        return <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">Acknowledged</span>;
      case 'RESOLVED':
        return <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded flex items-center gap-0.5"><Check size={10} /> Resolved</span>;
      case 'WAIVED':
        return <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">Waived</span>;
      case 'REOPENED':
        return <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded">Reopened</span>;
      default:
        return <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{status}</span>;
    }
  };

  const blockingCount = exceptions.filter(e => e.severity === 'BLOCKING' && e.status !== 'RESOLVED' && e.status !== 'WAIVED').length;
  const warningCount = exceptions.filter(e => e.severity === 'WARNING' && e.status !== 'RESOLVED' && e.status !== 'WAIVED').length;
  const resolvedCount = exceptions.filter(e => e.status === 'RESOLVED' || e.status === 'WAIVED').length;

  return (
    <div className="flex flex-col h-full bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-xs">
      {/* Header & Filter Controls */}
      <div className="p-4 border-b border-slate-100 bg-slate-50/70 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Exception Queue
            </h3>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800">
              {exceptions.length} Total
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-[11px] font-bold">
            {blockingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-mono">
                {blockingCount} Blocking
              </span>
            )}
            {warningCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-mono">
                {warningCount} Warn
              </span>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search rule code, SKU, or keyword..."
            value={searchQuery}
            onChange={e => onSearchQueryChange(e.target.value)}
            className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden text-slate-800"
          />
        </div>

        {/* Severity Filter Pills */}
        <div className="flex gap-1 overflow-x-auto pb-1 text-[11px] font-bold">
          <button
            onClick={() => onSeverityFilterChange('ALL')}
            className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
              severityFilter === 'ALL' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            All ({exceptions.length})
          </button>
          <button
            onClick={() => onSeverityFilterChange('BLOCKING')}
            className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
              severityFilter === 'BLOCKING' ? 'bg-rose-600 text-white' : 'bg-white text-rose-700 border border-rose-200 hover:bg-rose-50'
            }`}
          >
            Blocking ({blockingCount})
          </button>
          <button
            onClick={() => onSeverityFilterChange('WARNING')}
            className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
              severityFilter === 'WARNING' ? 'bg-amber-600 text-white' : 'bg-white text-amber-700 border border-amber-200 hover:bg-amber-50'
            }`}
          >
            Warnings ({warningCount})
          </button>
          <button
            onClick={() => onStatusFilterChange(statusFilter === 'RESOLVED' ? 'ALL' : 'RESOLVED')}
            className={`px-2.5 py-1 rounded-lg transition-colors whitespace-nowrap ${
              statusFilter === 'RESOLVED' ? 'bg-emerald-600 text-white' : 'bg-white text-emerald-700 border border-emerald-200 hover:bg-emerald-50'
            }`}
          >
            Resolved ({resolvedCount})
          </button>
        </div>
      </div>

      {/* Exception List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2 space-y-1.5">
        {sortedExceptions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 space-y-2">
            <CheckCircle2 size={32} className="mx-auto text-emerald-500" />
            <p className="text-xs font-bold text-slate-700">No Exceptions Found</p>
            <p className="text-[11px] text-slate-400">All evaluated rules passed or no matching filter criteria.</p>
          </div>
        ) : (
          sortedExceptions.map(exc => {
            const isSelected = selectedExceptionId === exc.id;
            const isResolved = exc.status === 'RESOLVED' || exc.status === 'WAIVED';

            return (
              <div
                key={exc.id}
                onClick={() => onSelectException(exc.id)}
                className={`p-3.5 rounded-2xl cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-indigo-50/70 border-indigo-300 shadow-xs ring-2 ring-indigo-500/20'
                    : isResolved
                    ? 'bg-slate-50/50 border-slate-200 opacity-60 hover:opacity-100'
                    : exc.severity === 'BLOCKING'
                    ? 'bg-rose-50/30 border-rose-200/80 hover:bg-rose-50/70'
                    : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {getCategoryIcon(exc.category)}
                    <span className="font-mono font-bold text-xs text-slate-800">
                      {exc.rule_code}
                    </span>
                    {exc.item_sequence && (
                      <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                        Line #{exc.item_sequence}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {getSeverityBadge(exc.severity)}
                    {getStatusBadge(exc.status)}
                  </div>
                </div>

                <h4 className="text-xs font-bold text-slate-900 leading-tight line-clamp-1 mb-1">
                  {exc.title}
                </h4>

                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                  {exc.description}
                </p>

                {exc.sku_code && (
                  <div className="mt-2 text-[10px] font-mono font-bold text-indigo-700 bg-indigo-50/80 px-2 py-0.5 rounded inline-block">
                    SKU: {exc.sku_code}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
