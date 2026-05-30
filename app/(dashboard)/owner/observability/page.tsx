"use client";

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, CheckCircle2, AlertTriangle, Database, Activity, Wrench, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import toast from 'react-hot-toast';

import type { MonitoringData, DbIntegrityIssue, CriticalAlert } from '@/components/monitoring/types';

export default function MissionControlDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<MonitoringData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [resolving, setResolving] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch('/api/observability');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch');
      setData(json.data);
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleResolve = async (anomaly_type: string, table: string, issueId: string) => {
    if (resolving) return;
    setResolving(issueId);
    const toastId = toast.loading(`Resolving issue...`);
    try {
      const res = await fetch('/api/observability/remediate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: anomaly_type, table }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Resolution failed');
      toast.success(`Berhasil menyelesaikan ${json.resolvedCount || 0} anomali`, { id: toastId });
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gagal mengeksekusi Auto-Fix', { id: toastId });
    } finally {
      setResolving(null);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-500 animate-pulse">Memindai Anomali Sistem...</p>
        </div>
      </div>
    );
  }

  // 1. Extract and normalize all issues
  const actionableIssues: Array<{
    id: string;
    title: string;
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    icon: any;
    remediable: boolean;
    anomaly_type?: string;
    table?: string;
    count?: number;
  }> = [];

  if (data) {
    // Check Health
    if (data.health.database !== 'healthy' || data.health.api !== 'online') {
      actionableIssues.push({
        id: 'sys-health',
        title: 'Koneksi Sistem Terputus',
        description: `API: ${data.health.api} | Database: ${data.health.supabase}. Harap hubungi tim infrastruktur segera.`,
        severity: 'critical',
        icon: Activity,
        remediable: false
      });
    }

    // Check Integrity (Filter out the 0 counts from mock data)
    const realAnomalies = (data.db_integrity || []).filter(i => i.count > 0);
    realAnomalies.forEach((issue, idx) => {
      actionableIssues.push({
        id: `anomaly-${idx}`,
        title: issue.type,
        description: `Terdapat ${issue.count} baris data bermasalah di tabel '${issue.table}'.`,
        severity: issue.severity,
        icon: Database,
        remediable: !!issue.remediable,
        anomaly_type: issue.anomaly_type,
        table: issue.table,
        count: issue.count
      });
    });

    // Check Alerts
    (data.alerts || []).forEach(alert => {
      actionableIssues.push({
        id: alert.id,
        title: alert.title,
        description: alert.message,
        severity: alert.severity,
        icon: ShieldAlert,
        remediable: true,
        anomaly_type: 'clear_alert',
        table: 'monitoring_checks'
      });
    });
  }

  const isAllClear = actionableIssues.length === 0 && !error;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Mission Control</h1>
            <p className="text-sm text-slate-500 mt-1">
              Pusat Kendali Auto-Fix & Anomali | Diperbarui: {lastRefresh.toLocaleTimeString()}
            </p>
          </div>
          <button 
            type="button"
            onClick={() => { setLoading(true); fetchData(); }}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span className="text-sm font-medium text-red-800">{error}</span>
          </div>
        )}

        {/* State 1: All Clear */}
        {isAllClear && (
          <div className="bg-white border border-emerald-100 rounded-3xl p-12 text-center shadow-sm flex flex-col items-center justify-center min-h-[400px]">
            <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Semua Sistem Berjalan Normal</h2>
            <p className="text-slate-500 max-w-md mx-auto">
              Tidak ada anomali atau *error* yang terdeteksi di seluruh operasional *tenant* saat ini. Anda bisa bernapas lega.
            </p>
          </div>
        )}

        {/* State 2: Issues Detected */}
        {!isAllClear && actionableIssues.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 mb-6 px-2">
              <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse" />
              <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700">
                {actionableIssues.length} Anomali Terdeteksi
              </h2>
            </div>
            
            {actionableIssues.map((issue) => {
              const Icon = issue.icon;
              const isResolving = resolving === issue.id;
              
              return (
                <div 
                  key={issue.id} 
                  className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-xl flex-shrink-0 ${
                      issue.severity === 'critical' ? 'bg-red-50 text-red-600' :
                      issue.severity === 'high' ? 'bg-orange-50 text-orange-600' :
                      'bg-amber-50 text-amber-600'
                    }`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-bold text-slate-900 text-lg">{issue.title}</h3>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                          issue.severity === 'critical' ? 'bg-red-100 text-red-700' :
                          issue.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {issue.severity}
                        </span>
                      </div>
                      <p className="text-slate-500 text-sm leading-relaxed max-w-xl">
                        {issue.description}
                      </p>
                    </div>
                  </div>

                  {issue.remediable ? (
                    <button
                      type="button"
                      onClick={() => handleResolve(issue.anomaly_type!, issue.table!, issue.id)}
                      disabled={isResolving}
                      className="w-full md:w-auto flex-shrink-0 flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-xl text-sm font-bold hover:bg-slate-800 transition-colors disabled:opacity-50"
                    >
                      {isResolving ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Wrench className="w-4 h-4" />
                      )}
                      {issue.anomaly_type === 'clear_alert' ? 'Dismiss Alert' : 'Auto-Fix Sekarang'}
                    </button>
                  ) : (
                    <div className="flex-shrink-0 px-4 py-2 bg-slate-50 text-slate-400 rounded-lg text-xs font-medium border border-dashed border-slate-200 text-center">
                      Manual Action Required
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
