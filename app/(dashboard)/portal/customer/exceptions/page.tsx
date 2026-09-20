'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertCircle, Package, ChevronRight } from 'lucide-react';

interface ExceptionView {
  id: string;
  workOrderId: string;
  woNumber: string;
  status: string;
  severity: string;
  category: string;
  message: string;
  occurredAt: string;
}

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-800',
  WARNING: 'bg-amber-100 text-amber-800',
  BLOCKING: 'bg-red-100 text-red-800',
};

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function CustomerExceptionsPage() {
  const router = useRouter();
  const [exceptions, setExceptions] = useState<ExceptionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchExceptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/v1/commercial/exceptions', {
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}: Failed to fetch exceptions`);
      }
      const json = await res.json();
      const raw: any[] = json.data || [];
      const mapped: ExceptionView[] = raw.map((e) => ({
        id: e.id || `${e.workOrderId}-${e.category}`,
        workOrderId: e.workOrderId || e.work_order_id,
        woNumber: e.woNumber || e.work_order_number,
        status: e.status,
        severity: e.severity,
        category: e.category,
        message: e.message,
        occurredAt: e.occurredAt || e.occurred_at,
      }));
      setExceptions(mapped);
    } catch (err: any) {
      setError(err.message || 'Failed to load exceptions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchExceptions();
  }, [fetchExceptions]);

  return (
    <div className="pb-6">
      <div className="bg-gradient-to-b from-indigo-600 to-indigo-700 px-6 pt-10 pb-6 text-white">
        <h1 className="text-xl font-bold mb-1">Exceptions</h1>
        <p className="text-indigo-200 text-sm">Issues requiring attention</p>
      </div>

      <div className="px-4 pt-4">
        {loading ? (
          <div className="text-center py-12 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            <p className="text-sm">Loading exceptions...</p>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-500 text-sm mb-3">{error}</p>
            <button
              onClick={fetchExceptions}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : exceptions.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">No exceptions</p>
            <p className="text-slate-400 text-xs mt-1">All your orders are proceeding normally</p>
          </div>
        ) : (
          <div className="space-y-3">
            {exceptions.map((e) => (
              <button
                key={e.id}
                onClick={() => router.push(`/portal/customer/orders/${e.workOrderId}`)}
                className="w-full bg-white border border-slate-100 rounded-xl p-4 shadow-sm text-left transition-all active:scale-[0.98]"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500" />
                    <span className="text-xs font-bold text-slate-700">{e.woNumber}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${SEVERITY_COLORS[e.severity] || 'bg-slate-100 text-slate-600'}`}>
                      {e.severity}
                    </span>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-300" />
                </div>
                <p className="text-sm text-slate-700 mb-1">{e.message}</p>
                <div className="flex justify-between text-xs text-slate-400">
                  <span>{e.category?.replace(/_/g, ' ')}</span>
                  <span>{formatDate(e.occurredAt)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
