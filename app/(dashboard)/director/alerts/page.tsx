'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertTriangle, AlertCircle, XCircle, CheckCircle2,
  Search, RefreshCw, Loader2, Filter, Calendar,
  Clock, User, ExternalLink, ChevronRight, Layers,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useRouter } from 'next/navigation';

type ExceptionSeverity = 'CRITICAL' | 'WARNING';
type ExceptionCategory = 'HANDOFF_REJECTED' | 'OPERATIONAL_FAILURE' | 'DELIVERY_STALLED' | 'REPLAN_REQUIRED';

interface ExceptionRecord {
  exceptionId: string;
  severity: ExceptionSeverity;
  category: ExceptionCategory;
  affectedDomain: string;
  affectedHandoffId: string;
  failureCode: string | null;
  message: string;
  recommendedAction: string;
  occurredAt: string;
  salesOrderId: string;
  soNumber: string;
  engagementId: string;
  woNumber: string;
}

const SEVERITY_CONFIG: Record<ExceptionSeverity, { icon: any; bg: string; text: string; border: string; label: string }> = {
  CRITICAL: {
    icon: XCircle,
    bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300', label: 'Critical',
  },
  WARNING: {
    icon: AlertTriangle,
    bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300', label: 'Warning',
  },
};

const CATEGORY_LABELS: Record<string, string> = {
  HANDOFF_REJECTED: 'Handoff Rejected',
  OPERATIONAL_FAILURE: 'Operational Failure',
  DELIVERY_STALLED: 'Delivery Stalled',
  REPLAN_REQUIRED: 'Replan Required',
};

function formatDate(dateStr: string) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function ExceptionCenterPage() {
  const router = useRouter();
  const [exceptions, setExceptions] = useState<ExceptionRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<'ALL' | ExceptionSeverity>('ALL');
  const [refreshing, setRefreshing] = useState(false);

  const fetchExceptions = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/commercial/exceptions', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}: Failed to fetch exceptions`);
      }
      const json = await res.json();
      setExceptions(json.data || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load exceptions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExceptions();
  }, [fetchExceptions]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchExceptions();
    setRefreshing(false);
  };

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return exceptions.filter((exc) => {
      const matchesSearch =
        exc.message?.toLowerCase().includes(q) ||
        exc.soNumber?.toLowerCase().includes(q) ||
        exc.failureCode?.toLowerCase().includes(q) ||
        exc.affectedDomain?.toLowerCase().includes(q);
      const matchesSeverity = severityFilter === 'ALL' || exc.severity === severityFilter;
      return matchesSearch && matchesSeverity;
    });
  }, [exceptions, searchQuery, severityFilter]);

  const stats = useMemo(() => {
    const critical = exceptions.filter((e) => e.severity === 'CRITICAL');
    const warning = exceptions.filter((e) => e.severity === 'WARNING');
    return {
      total: exceptions.length,
      critical: critical.length,
      warning: warning.length,
    };
  }, [exceptions]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded-lg w-48 mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-white rounded-xl border border-slate-200" />
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-white rounded-xl border border-slate-200" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 p-4 bg-rose-50 border border-rose-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-rose-500 flex-shrink-0" />
          <p className="text-sm text-rose-700">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 p-4 sm:p-6 lg:p-8 space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-6 h-6 text-rose-500" />
              <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                Exception Center
              </h1>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Monitor and resolve operational exceptions across all deliveries.
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 flex items-center gap-2 text-sm font-medium transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-center">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by message, SO number, failure code..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
            />
          </div>

          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as 'ALL' | ExceptionSeverity)}
            className="px-3 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-900 dark:text-white"
          >
            <option value="ALL">All Severities</option>
            <option value="CRITICAL">Critical Only</option>
            <option value="WARNING">Warnings Only</option>
          </select>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase">
                Total Exceptions
              </p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{stats.total}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/30 text-rose-600">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase">
                Critical
              </p>
              <p className="text-2xl font-black text-rose-700">{stats.critical}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 text-amber-600">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-slate-400 dark:text-slate-500 uppercase">
                Warnings
              </p>
              <p className="text-2xl font-black text-amber-700">{stats.warning}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Exception List */}
      {filtered.length === 0 ? (
        <Card className="p-12 text-center border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex flex-col items-center gap-4">
            <div className="p-3 rounded-full bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                No exceptions found
              </h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-md">
                {searchQuery || severityFilter !== 'ALL'
                  ? 'Try adjusting your search or filter criteria.'
                  : 'All operational exceptions are resolved. No action required at this time.'}
              </p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((exc) => {
            const config = SEVERITY_CONFIG[exc.severity];
            const Icon = config.icon;

            return (
              <Card
                key={exc.exceptionId}
                className={`p-4 border-l-4 ${config.border} shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className="flex items-start gap-4">
                  <div className={`p-1.5 rounded-full ${config.bg} dark:bg-opacity-20`}>
                    <Icon className={`w-4 h-4 ${config.text}`} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${config.bg} ${config.text}`}>
                            {config.label}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {CATEGORY_LABELS[exc.category] || exc.category}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white mt-1.5">
                          {exc.message}
                        </p>
                        {exc.failureCode && (
                          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-mono">
                            Code: {exc.failureCode} | Domain: {exc.affectedDomain}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(exc.occurredAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">Sales Order:</span>
                          <span className="font-mono font-medium text-slate-900 dark:text-white">
                            {exc.soNumber}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400">WO:</span>
                          <span className="font-mono font-medium text-slate-900 dark:text-white">
                            {exc.woNumber}
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => router.push(`/commercial/control-tower/${exc.salesOrderId}`)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors"
                      >
                        <Layers className="w-3 h-3" />
                        Open Workspace
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
