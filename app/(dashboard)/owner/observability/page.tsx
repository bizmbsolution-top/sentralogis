"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/Card';
import { RefreshCw, Loader2, Activity } from 'lucide-react';
import { useAuth } from '@/lib/hooks/useAuth';
import toast from 'react-hot-toast';

import HealthCards from '@/components/monitoring/HealthCards';
import AlertTable from '@/components/monitoring/AlertTable';
import { TruckingPanel, WmsPanel, ForwardingPanel } from '@/components/monitoring/OperationalMetrics';
import WorkflowTimeline from '@/components/monitoring/WorkflowTimeline';
import ErrorCenter from '@/components/monitoring/ErrorCenter';
import AuditViewer from '@/components/monitoring/AuditViewer';
import CronStatus from '@/components/monitoring/CronStatus';
import DbIntegrityPanel from '@/components/monitoring/DbIntegrityPanel';
import InvestigationPanel from '@/components/monitoring/InvestigationPanel';
import PerformancePanel from '@/components/monitoring/PerformancePanel';

import type { MonitoringData } from '@/components/monitoring/types';

const defaultData: MonitoringData = {
  health: { api: 'online', database: 'healthy', supabase: 'connected', active_users: 0, error_rate: 0, queue_status: 'healthy' },
  alerts: [],
  trucking: { active_jo: 0, pending_driver_accept: 0, delivering: 0, delayed_delivery: 0, failed_wa: 0, unassigned_wo: 0 },
  wms: { low_stock: 0, negative_stock: 0, pending_picking: 0, pending_putaway: 0, inbound_today: 0, outbound_today: 0 },
  forwarding: { active_shipment: 0, delayed_shipment: 0, missing_documents: 0, customs_pending: 0, container_tracking_lost: 0 },
  workflows: [
    { step: 'WO Created', status: 'completed', count: 0 },
    { step: 'JO Created', status: 'completed', count: 0 },
    { step: 'WA Sent', status: 'completed', count: 0 },
    { step: 'Driver Accept', status: 'in_progress', count: 0 },
    { step: 'Pickup', status: 'pending', count: 0 },
    { step: 'Delivered', status: 'pending', count: 0 },
  ],
  errors: [],
  audit_logs: [],
  crons: [],
  db_integrity: [],
  user_activity: [],
  performance: [],
};

const CHECK_TYPES = [
  { key: 'health', label: 'Health Check' },
  { key: 'trucking', label: 'Trucking Check' },
  { key: 'wms', label: 'WMS Check' },
  { key: 'forwarding', label: 'Forwarding Check' },
];

export default function MissionControlDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<MonitoringData>(defaultData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [runningChecks, setRunningChecks] = useState<Record<string, boolean>>({});

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

  const runCheck = async (type: string) => {
    setRunningChecks((prev) => ({ ...prev, [type]: true }));
    try {
      const res = await fetch('/api/observability/run-check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Check failed');
      toast.success(`${type} check completed`);
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Check failed');
    } finally {
      setRunningChecks((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleResolve = async (anomaly_type: string, table: string) => {
    const toastId = toast.loading(`Resolving ${anomaly_type}...`);
    try {
      const res = await fetch('/api/observability/remediate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: anomaly_type, table }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Resolution failed');
      toast.success(`Successfully resolved ${json.resolvedCount || 0} issues`, { id: toastId });
      fetchData();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resolve', { id: toastId });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm font-medium text-slate-500 animate-pulse">Loading Mission Control...</p>
        </div>
      </div>
    );
  }

  const criticalCount = data.alerts.filter((a) => a.severity === 'critical' || a.severity === 'high').length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Activity className="w-7 h-7 text-slate-900" />
            <div>
              <h1 className="text-xl font-bold text-slate-900">Mission Control</h1>
              <p className="text-xs text-slate-500">
                Last updated: {lastRefresh.toLocaleTimeString()} | Auto-refresh 30s
                {criticalCount > 0 && <span className="text-red-500 font-bold ml-2">🔴 {criticalCount} critical alerts</span>}
              </p>
            </div>
          </div>
          <button onClick={() => { setLoading(true); fetchData(); }}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors">
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
            <span className="text-sm text-red-700">{error}</span>
          </div>
        )}

        {/* Section 1: System Health */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500">System Health</h2>
          </div>
          <HealthCards health={data.health} />
        </div>

        {/* Section 2: Run Checks */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-widest text-slate-500">Run Checks</span>
              <div className="flex gap-2">
                {CHECK_TYPES.map((check) => (
                  <button key={check.key} onClick={() => runCheck(check.key)} disabled={runningChecks[check.key]}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                    {runningChecks[check.key] ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    {check.label}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Critical Alerts */}
        <div className="mb-6">
          <AlertTable alerts={data.alerts} />
        </div>

        {/* Section 4: Operational Metrics */}
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Live Operational Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <TruckingPanel data={data.trucking} />
            <WmsPanel data={data.wms} />
            <ForwardingPanel data={data.forwarding} />
          </div>
        </div>

        {/* Section 5: Workflow + Errors + Audit + Crons */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <WorkflowTimeline workflows={data.workflows} />
          <ErrorCenter errors={data.errors} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <AuditViewer logs={data.audit_logs} />
          <CronStatus crons={data.crons} onRun={runCheck} />
        </div>

        {/* Section 6: DB Integrity + Performance + Investigation */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <DbIntegrityPanel issues={data.db_integrity} onResolve={handleResolve} />
          <PerformancePanel metrics={data.performance} />
          <InvestigationPanel />
        </div>
      </div>
    </div>
  );
}
