'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Package, MapPin, Clock, User, Wallet, ChevronRight } from 'lucide-react';
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
  coins: {
    balance: number;
    rupiah_value: number;
  };
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
  if (s.includes('assigned') || s.includes('ditugaskan')) return 'Assigned';
  return status || '—';
}

export default function VendorDashboardPage() {
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

  return (
    <div className="pb-6">
      <div className="bg-gradient-to-b from-indigo-600 to-indigo-700 px-6 pt-10 pb-6 text-white">
        <h1 className="text-xl font-bold">My Jobs</h1>
        <p className="text-indigo-200 text-sm">{feed?.driver.name || 'Vendor'}</p>
      </div>

      {loading ? (
        <div className="px-4 py-8 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
          <p className="text-sm">Loading your jobs...</p>
        </div>
      ) : error ? (
        <div className="px-4 py-8 text-center">
          <p className="text-red-500 text-sm mb-3">{error}</p>
          <button
            onClick={fetchFeed}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Retry
          </button>
        </div>
      ) : (
        <>
          <div className="px-4 pt-4 space-y-4">
            {feed && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white border border-slate-100 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-slate-800">{feed.total_completed_month}</p>
                    <p className="text-xs text-slate-500">This Month</p>
                  </div>
                  <div className="bg-white border border-slate-100 rounded-xl p-3 text-center">
                    <p className="text-xl font-black text-slate-800">{feed.completed_jobs.length}</p>
                    <p className="text-xs text-slate-500">All Time</p>
                  </div>
                </div>

                {feed.active_job && (
                  <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold text-indigo-600 uppercase">
                        {feed.active_job.wo_items?.item_code || 'ACTIVE JOB'}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                        {jobStatusLabel(feed.active_job.status)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                      <MapPin className="w-3 h-3" />
                      <span>{feed.active_job.pickup_location || '—'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500 mb-2">
                      <MapPin className="w-3 h-3" />
                      <span>{feed.active_job.delivery_location || '—'}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500">
                        {formatDate(feed.active_job.assigned_at || feed.active_job.created_at)}
                      </span>
                      <button
                        onClick={() =>
                          feed.active_job.tracking_token &&
                          router.push(`/portal/vendor/jobs/${feed.active_job.tracking_token}`)
                        }
                        className="text-indigo-600 font-medium"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                )}

                {feed.queued_jobs.length > 0 && (
                  <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                      Upcoming Jobs ({feed.queued_jobs.length})
                    </h3>
                    <div className="space-y-2">
                      {feed.queued_jobs.map((j) => (
                        <div key={j.id} className="border border-slate-100 rounded-lg p-3">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-medium text-slate-700">
                              {j.wo_items?.item_code || 'Job'}
                            </span>
                            <span className="text-xs text-slate-400">
                              {formatDate(j.created_at)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {feed.coins.balance > 0 && (
                  <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <Wallet className="w-5 h-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">Driver Coins</p>
                        <p className="text-xs text-slate-500">
                          {feed.coins.balance} coins = {formatCurrency(feed.coins.rupiah_value)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {!feed?.active_job && !feed?.queued_jobs.length && (
              <div className="text-center py-12">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm font-medium">No jobs assigned</p>
                <p className="text-slate-400 text-xs mt-1">Waiting for new assignments from the office</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
