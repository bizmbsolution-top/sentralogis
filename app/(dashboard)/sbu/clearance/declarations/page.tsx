'use client';

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { DeclarationDirectoryTable, DeclarationDirectoryItem } from '@/components/workspaces/customs/DeclarationDirectoryTable';
import { DeclarationCard } from '@/components/workspaces/customs/DeclarationCard';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import {
  Layers,
  Search,
  Filter,
  RefreshCw,
  Plus,
  ArrowLeft,
  X,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

function DeclarationDirectoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialStatus = searchParams.get('status') || 'ALL';
  const initialChannel = searchParams.get('channel') || 'ALL';
  const initialIssue = searchParams.get('issue') || 'ALL';
  const initialReadiness = searchParams.get('readiness') || 'ALL';

  const [declarations, setDeclarations] = useState<DeclarationDirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [channelFilter, setChannelFilter] = useState(initialChannel);
  const [issueFilter, setIssueFilter] = useState(initialIssue);

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch from REST Gateway
  const fetchDeclarations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let url = '/api/v1/customs/declarations?limit=100';
      if (statusFilter !== 'ALL') {
        url += `&status=${encodeURIComponent(statusFilter)}`;
      }
      if (channelFilter !== 'ALL') {
        url += `&channel=${encodeURIComponent(channelFilter)}`;
      }

      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load declarations (HTTP ${res.status})`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data)) {
        const mapped: DeclarationDirectoryItem[] = json.data.map((d: any) => {
          let primary_issue: DeclarationDirectoryItem['primary_issue'] = 'READY';
          let readiness_percentage = 100;

          if (d.status === 'DRAFT' || d.status === 'READY_FOR_CLASSIFICATION') {
            primary_issue = 'MISSING_HS';
            readiness_percentage = 60;
          } else if (d.status === 'DOCUMENTS_PENDING') {
            primary_issue = 'MISSING_DOC';
            readiness_percentage = 70;
          } else if (d.status === 'RELEASED' || d.status === 'COMPLETED') {
            primary_issue = 'RELEASED';
            readiness_percentage = 100;
          }

          return {
            ...d,
            importer_name: d.importer_name || `PT Importir ${d.importer_id ? d.importer_id.slice(0, 8) : 'Mandiri'}`,
            total_items_count: d.total_items_count || 1,
            total_cif_usd: d.total_cif_usd || 15000,
            total_tax_idr: d.total_duty_and_tax || 24000000,
            readiness_percentage,
            primary_issue
          };
        });
        setDeclarations(mapped);
      } else {
        setDeclarations([]);
      }
    } catch (err: any) {
      console.error('[Declaration Directory Fetch Error]:', err);
      setError(err.message || 'Unable to fetch declarations');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, channelFilter]);

  useEffect(() => {
    fetchDeclarations();
  }, [fetchDeclarations]);

  // Client-side filtering for issue and debounced search
  const filteredDeclarations = useMemo(() => {
    return declarations.filter(dec => {
      // 1. Search filter
      if (debouncedSearch.trim()) {
        const q = debouncedSearch.toLowerCase().trim();
        const ajuMatch = dec.declaration_number?.toLowerCase().includes(q);
        const importerMatch = dec.importer_name?.toLowerCase().includes(q) || dec.importer_id?.toLowerCase().includes(q);
        if (!ajuMatch && !importerMatch) return false;
      }

      // 2. Issue filter
      if (issueFilter !== 'ALL') {
        if (issueFilter === 'READY' && dec.primary_issue !== 'READY' && dec.primary_issue !== 'RELEASED') return false;
        if (issueFilter === 'MISSING_HS' && dec.primary_issue !== 'MISSING_HS') return false;
        if (issueFilter === 'MISSING_DOCUMENT' && dec.primary_issue !== 'MISSING_DOC') return false;
        if (issueFilter === 'PRICE_ANOMALY' && dec.primary_issue !== 'PRICE_ANOMALY') return false;
      }

      return true;
    });
  }, [declarations, debouncedSearch, issueFilter]);

  const handleOpenWorkbench = (declarationId: string) => {
    router.push(`/sbu/clearance/declarations/${declarationId}`);
  };

  const handleClearFilters = () => {
    setSearchTerm('');
    setDebouncedSearch('');
    setStatusFilter('ALL');
    setChannelFilter('ALL');
    setIssueFilter('ALL');
  };

  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'ALL' || channelFilter !== 'ALL' || issueFilter !== 'ALL';

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* 1. Directory Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 bg-white rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Link
              href="/sbu/clearance"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <ArrowLeft size={18} />
            </Link>
            <h1 className="text-xl font-bold text-slate-900">Customs Declaration Directory</h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {filteredDeclarations.length} Active
            </span>
          </div>
          <p className="text-xs text-slate-500 pl-8">
            PPJK Work Queue • Search, filter, inspect readiness, and open workbench
          </p>
        </div>

        <div className="flex items-center gap-2 pl-8 md:pl-0">
          <Button
            variant="secondary"
            size="sm"
            onClick={fetchDeclarations}
            disabled={loading}
            className="text-xs font-semibold"
          >
            <RefreshCw size={13} className={`mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>

          <Button
            size="sm"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm"
          >
            <Plus size={14} className="mr-1" /> New Declaration
          </Button>
        </div>
      </div>

      {/* 2. Error Banner */}
      {error && (
        <Card className="p-4 bg-red-50 border border-red-200 text-red-800 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <AlertCircle size={18} className="text-red-600 shrink-0" />
            <p className="text-xs font-semibold">{error}</p>
          </div>
          <Button size="sm" variant="secondary" onClick={fetchDeclarations} className="text-xs font-bold border-red-300">
            <RefreshCw size={12} className="mr-1" /> Retry
          </Button>
        </Card>
      )}

      {/* 3. Search & Operational Filter Bar */}
      <Card className="p-4 bg-white border border-slate-200 rounded-2xl shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Input */}
          <div className="relative flex-1 w-full">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search AJU (Nomor Pengajuan), Importer name, or Document ID..."
              className="pl-9 text-xs bg-slate-50 border-slate-200 focus:bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="READY_FOR_CLASSIFICATION">Waiting Classification</option>
              <option value="CLASSIFIED">Classified</option>
              <option value="READY_FOR_SUBMISSION">Ready for Submission</option>
              <option value="RELEASED">SPPB Released</option>
            </select>

            {/* Channel Filter */}
            <select
              value={channelFilter}
              onChange={e => setChannelFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Channels</option>
              <option value="GREEN">Jalur Hijau</option>
              <option value="YELLOW">Jalur Kuning</option>
              <option value="RED">Jalur Merah</option>
            </select>

            {/* Issue Filter */}
            <select
              value={issueFilter}
              onChange={e => setIssueFilter(e.target.value)}
              className="text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Issues</option>
              <option value="MISSING_HS">Missing HS Code</option>
              <option value="MISSING_DOCUMENT">Missing Documents</option>
              <option value="PRICE_ANOMALY">Price Anomaly</option>
              <option value="READY">Ready Only</option>
            </select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              >
                Clear
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* 4. Declarations Table (Desktop) */}
      <div className="hidden md:block">
        <DeclarationDirectoryTable
          declarations={filteredDeclarations}
          loading={loading}
          onOpenWorkbench={handleOpenWorkbench}
        />
      </div>

      {/* 5. Declarations Cards (Mobile) */}
      <div className="grid grid-cols-1 gap-3 md:hidden">
        {filteredDeclarations.map(dec => (
          <DeclarationCard
            key={dec.id}
            declaration={dec}
            onOpenWorkbench={handleOpenWorkbench}
          />
        ))}
      </div>
    </div>
  );
}

export default function DeclarationDirectoryPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-400 text-xs animate-pulse">Loading Directory...</div>}>
      <DeclarationDirectoryContent />
    </Suspense>
  );
}
