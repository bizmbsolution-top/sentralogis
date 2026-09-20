'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Package, MapPin, Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDriverAuth } from '@/lib/hooks/useDriverAuth';

interface DriverFeed {
  success: boolean;
  driver: {
    id: string;
    name: string;
    whatsapp: string;
    photo_url: string | null;
    trust_score: number;
    total_jobs_completed: number;
    total_km_driven: number;
    total_coins: number;
    total_coin_value: number;
  };
  active_job: any | null;
  queued_jobs: any[];
  completed_jobs: any[];
  finances: {
    total_hak: number;
    total_advance: number;
    total_pelunasan: number;
    outstanding: number;
  };
  coins: { balance: number; rupiah_value: number };
  total_completed_month: number;
  total_km: number;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(amount || 0);
}

function formatDate(dateStr: string | null | undefined) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function jobStatusLabel(status: string): string {
  const s = (status || '').toLowerCase();
  if (s.includes('selesai') || s === 'completed' || s === 'done') return 'Completed';
  if (s.includes('proses') || s === 'in_progress' || s.includes('perjalanan')) return 'In Progress';
  return status || '—';
}

export default function VendorCompletedJobsPage() {
  const router = useRouter();
  const { session, getAuthHeaders } = useDriverAuth();
  const [feed, setFeed] = useState<DriverFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFeed = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    try {
      const headers = getAuthHeaders();
      const res = await fetch('/api/driver/feed', { headers });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}: Failed to load jobs`);
      }
      const json = await res.json();
      setFeed(json);
    } catch (err: any) {
      setError(err.message || 'Failed to load jobs');
    } finally {
      setLoading(false);
    }
  }, [session, getAuthHeaders]);

  useEffect(() => {
    fetchFeed();
  }, [fetchFeed]);

  if (loading) {
    return (
      <div className="pb-6">
        <div className="bg-gradient-to-b from-indigo-600 to-indigo-700 px-6 pt-12 pb-6 text-white">
          <button
            onClick={() => router.back()}
            className="p-1 rounded-full bg-indigo-500/30 hover:bg-indigo-500/50 transition-colors mb-2"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Completed Jobs</h1>
        </div>
        <div className="px-4 py-8 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="pb-6">
        <div className="bg-gradient-to-b from-indigo-600 to-indigo-700 px-6 pt-12 pb-6 text-white">
          <button
            onClick={() => router.back()}
            className="p-1 rounded-full bg-indigo-500/30 hover:bg-indigo-500/50 transition-colors mb-2"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold">Completed Jobs</h1>
        </div>
        <div className="px-4 py-8 text-center">
          <p className="text-red-500 text-sm mb-3">{error}</p>
          <button
            onClick={fetchFeed}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const completed = feed?.completed_jobs || [];

  return (
    <div className="pb-6">
      <div className="bg-gradient-to-b from-indigo-600 to-indigo-700 px-6 pt-12 pb-6 text-white">
        <button
          onClick={() => router.back()}
          className="p-1 rounded-full bg-indigo-500/30 hover:bg-indigo-500/50 transition-colors mb-2"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Completed Jobs</h1>
        <p className="text-indigo-200 text-sm">{completed.length} jobs completed</p>
      </div>

      <div className="px-4 pt-4">
        {completed.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">No completed jobs yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {completed.map((j) => (
              <div key={j.id} className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold text-indigo-600 uppercase">
                    {j.wo_items?.item_code || 'Job'}
                  </span>
                  <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                    {jobStatusLabel(j.status)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  <MapPin className="w-3 h-3" />
                  <span>{j.pickup_location || '—'} → {j.delivery_location || '—'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  <span>Completed: {formatDate(j.completed_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
