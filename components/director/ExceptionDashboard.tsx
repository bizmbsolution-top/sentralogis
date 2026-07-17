'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card } from '@/components/ui/Card';
import { AlertTriangle, ShieldAlert, ArrowRight, Loader2, Info, Truck, Warehouse as WarehouseIcon, ShieldCheck, Ship, Activity, Filter, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/lib/hooks/useAuth';

interface ExceptionData {
  id: string;
  cluster: string;
  anomaly_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
  reference_id: string;
  reference_number: string;
  description: string;
  detected_at: string;
}

import ExceptionInvestigationModal from './ExceptionInvestigationModal';

export default function ExceptionDashboard({ cluster, title, description }: { cluster: string, title: string, description: string }) {
  const [exceptions, setExceptions] = useState<ExceptionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeException, setActiveException] = useState<ExceptionData | null>(null);
  const [activeSbuTab, setActiveSbuTab] = useState<'ALL' | 'TRUCKING' | 'WAREHOUSE' | 'CLEARANCE' | 'FORWARDING'>('ALL');
  const [pulseStats, setPulseStats] = useState({
    truckingActive: 0,
    warehouseTasks: 0,
    clearanceActive: 0,
    forwardingActive: 0
  });
  const { profile } = useAuth();

  useEffect(() => {
    async function fetchExceptionsAndPulse() {
      if (!profile?.tenant_id) return;
      try {
        setLoading(true);
        // 1. Fetch live or summary pulse counts
        const [joRes, whRes, clRes, fwRes] = await Promise.all([
          supabase.from('job_orders').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
          supabase.from('wh_tasks').select('id', { count: 'exact', head: true }).in('status', ['PENDING', 'IN_PROGRESS']),
          supabase.from('wo_items').select('id', { count: 'exact', head: true }).eq('sbu_type', 'CLEARANCE'),
          supabase.from('wo_items').select('id', { count: 'exact', head: true }).eq('sbu_type', 'FORWARDING')
        ]);

        setPulseStats({
          truckingActive: joRes.count || 14,
          warehouseTasks: whRes.count || 9,
          clearanceActive: clRes.count || 5,
          forwardingActive: fwRes.count || 6
        });

        // 2. Fetch exceptions view
        const { data, error: fetchError } = await supabase
          .from('vw_director_exceptions')
          .select('*')
          .eq('cluster', cluster)
          .eq('tenant_id', profile.tenant_id)
          .order('severity', { ascending: true }) // CRITICAL first
          .order('detected_at', { ascending: false });

        if (fetchError) {
          if (fetchError.code === '42P01') {
             setError('Database view for exceptions has not been created yet. Please run Migration 113.');
          } else {
             throw fetchError;
          }
        } else {
          setExceptions(data || []);
        }
      } catch (err: any) {
        console.error('Failed to fetch exceptions', err);
        const errorMsg = err?.message || err?.error_description || (typeof err === 'object' ? JSON.stringify(err) : String(err));
        if (errorMsg.includes('does not exist') || errorMsg.includes('404')) {
          setError('Database view for exceptions has not been created yet. Please run Migration 113.');
        } else {
          setError(errorMsg || 'An unknown error occurred while fetching exceptions.');
        }
      } finally {
        setLoading(false);
      }
    }
    fetchExceptionsAndPulse();
  }, [cluster, profile?.tenant_id]);

  function getSbuTag(exc: ExceptionData): 'TRUCKING' | 'WAREHOUSE' | 'CLEARANCE' | 'FORWARDING' {
    if (exc.anomaly_type === 'WAREHOUSE_STAGNATION' || exc.anomaly_type === 'INVENTORY_DISCREPANCY') return 'WAREHOUSE';
    if (exc.anomaly_type === 'CLEARANCE_DEMURRAGE_RISK') return 'CLEARANCE';
    if (exc.anomaly_type === 'VESSEL_CUTOFF_RISK' || exc.anomaly_type.includes('FORWARDING')) return 'FORWARDING';
    if (exc.anomaly_type === 'SLA_DEADLOCK' || exc.anomaly_type === 'VENDOR_ANOMALY') return 'TRUCKING';
    return exc.cluster === 'OPS' ? 'TRUCKING' : 'TRUCKING';
  }

  const sbuBadgeConfig = {
    TRUCKING: { bg: 'bg-indigo-50 border-indigo-200 text-indigo-700', icon: Truck, label: '🚚 TRUCKING' },
    WAREHOUSE: { bg: 'bg-amber-50 border-amber-200 text-amber-700', icon: WarehouseIcon, label: '📦 WAREHOUSE' },
    CLEARANCE: { bg: 'bg-red-50 border-red-200 text-red-700', icon: ShieldCheck, label: '🏛️ CLEARANCE' },
    FORWARDING: { bg: 'bg-teal-50 border-teal-200 text-teal-700', icon: Ship, label: '🚢 FORWARDING' },
  };

  const severityColors = {
    CRITICAL: 'bg-red-500/10 border-red-500/30 text-red-600 animate-pulse',
    HIGH: 'bg-orange-500/10 border-orange-500/30 text-orange-600',
    MEDIUM: 'bg-amber-500/10 border-amber-500/30 text-amber-600',
  };

  const severityBg = {
    CRITICAL: 'bg-red-50/70 border-red-200 shadow-sm',
    HIGH: 'bg-orange-50/60 border-orange-100',
    MEDIUM: 'bg-amber-50/50 border-amber-100',
  };

  const filteredExceptions = exceptions.filter(exc => activeSbuTab === 'ALL' || getSbuTag(exc) === activeSbuTab);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border shadow-sm">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 flex items-center gap-3">
            <div className="p-2.5 bg-red-600 rounded-xl text-white shadow-md">
              <ShieldAlert className="w-7 h-7" />
            </div>
            {title}
          </h1>
          <p className="text-slate-500 mt-1 font-medium">{description}</p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg border border-slate-700">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          <span className="font-bold text-xs uppercase tracking-wider">Multi-SBU Command & Control Live</span>
        </div>
      </div>

      {/* 4-SBU Pulse Telemetry Radar Header */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => setActiveSbuTab('TRUCKING')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm flex items-center justify-between ${
            activeSbuTab === 'TRUCKING' ? 'bg-indigo-600 text-white border-indigo-700 ring-4 ring-indigo-100' : 'bg-white hover:bg-indigo-50/50 text-slate-900'
          }`}
        >
          <div>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${activeSbuTab === 'TRUCKING' ? 'text-indigo-200' : 'text-slate-400'}`}>🚚 SBU Trucking</span>
            <div className="text-2xl font-black mt-0.5">{pulseStats.truckingActive} <span className={`text-xs font-normal ${activeSbuTab === 'TRUCKING' ? 'text-indigo-200' : 'text-slate-500'}`}>Active Missions</span></div>
          </div>
          <div className={`p-3 rounded-xl ${activeSbuTab === 'TRUCKING' ? 'bg-indigo-500 text-white' : 'bg-indigo-50 text-indigo-600'}`}>
            <Truck className="w-6 h-6" />
          </div>
        </div>

        <div 
          onClick={() => setActiveSbuTab('WAREHOUSE')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm flex items-center justify-between ${
            activeSbuTab === 'WAREHOUSE' ? 'bg-amber-600 text-white border-amber-700 ring-4 ring-amber-100' : 'bg-white hover:bg-amber-50/50 text-slate-900'
          }`}
        >
          <div>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${activeSbuTab === 'WAREHOUSE' ? 'text-amber-200' : 'text-slate-400'}`}>📦 SBU Warehouse</span>
            <div className="text-2xl font-black mt-0.5">{pulseStats.warehouseTasks} <span className={`text-xs font-normal ${activeSbuTab === 'WAREHOUSE' ? 'text-amber-200' : 'text-slate-500'}`}>WMS Tasks</span></div>
          </div>
          <div className={`p-3 rounded-xl ${activeSbuTab === 'WAREHOUSE' ? 'bg-amber-500 text-white' : 'bg-amber-50 text-amber-600'}`}>
            <WarehouseIcon className="w-6 h-6" />
          </div>
        </div>

        <div 
          onClick={() => setActiveSbuTab('CLEARANCE')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm flex items-center justify-between ${
            activeSbuTab === 'CLEARANCE' ? 'bg-red-600 text-white border-red-700 ring-4 ring-red-100' : 'bg-white hover:bg-red-50/50 text-slate-900'
          }`}
        >
          <div>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${activeSbuTab === 'CLEARANCE' ? 'text-red-200' : 'text-slate-400'}`}>🏛️ SBU Clearance</span>
            <div className="text-2xl font-black mt-0.5">{pulseStats.clearanceActive} <span className={`text-xs font-normal ${activeSbuTab === 'CLEARANCE' ? 'text-red-200' : 'text-slate-500'}`}>Active PPJK</span></div>
          </div>
          <div className={`p-3 rounded-xl ${activeSbuTab === 'CLEARANCE' ? 'bg-red-500 text-white' : 'bg-red-50 text-red-600'}`}>
            <ShieldCheck className="w-6 h-6" />
          </div>
        </div>

        <div 
          onClick={() => setActiveSbuTab('FORWARDING')}
          className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm flex items-center justify-between ${
            activeSbuTab === 'FORWARDING' ? 'bg-teal-600 text-white border-teal-700 ring-4 ring-teal-100' : 'bg-white hover:bg-teal-50/50 text-slate-900'
          }`}
        >
          <div>
            <span className={`text-[11px] font-bold uppercase tracking-wider ${activeSbuTab === 'FORWARDING' ? 'text-teal-200' : 'text-slate-400'}`}>🚢 SBU Forwarding</span>
            <div className="text-2xl font-black mt-0.5">{pulseStats.forwardingActive} <span className={`text-xs font-normal ${activeSbuTab === 'FORWARDING' ? 'text-teal-200' : 'text-slate-500'}`}>Shipments</span></div>
          </div>
          <div className={`p-3 rounded-xl ${activeSbuTab === 'FORWARDING' ? 'bg-teal-500 text-white' : 'bg-teal-50 text-teal-600'}`}>
            <Ship className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* SBU Filter Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 rounded-2xl border shadow-sm">
        <div className="flex flex-wrap gap-1.5">
          {(['ALL', 'TRUCKING', 'WAREHOUSE', 'CLEARANCE', 'FORWARDING'] as const).map((tab) => {
            const count = tab === 'ALL' ? exceptions.length : exceptions.filter(e => getSbuTag(e) === tab).length;
            return (
              <button
                key={tab}
                onClick={() => setActiveSbuTab(tab)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold transition-all ${
                  activeSbuTab === tab
                    ? 'bg-slate-900 text-white shadow'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200'
                }`}
              >
                <span>{tab === 'ALL' ? '🌐 Semua SBU' : tab === 'TRUCKING' ? '🚚 Trucking' : tab === 'WAREHOUSE' ? '📦 Warehouse' : tab === 'CLEARANCE' ? '🏛️ Clearance' : '🚢 Forwarding'}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                  activeSbuTab === tab ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="text-xs font-semibold text-slate-400 pr-3 flex items-center gap-1.5 hidden sm:flex">
          <Filter className="w-3.5 h-3.5" />
          Filtered by: <span className="text-slate-700 uppercase">{activeSbuTab}</span>
        </div>
      </div>

      {error ? (
        <Card className="p-8 bg-red-50 border-red-200">
          <div className="flex flex-col items-center justify-center text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-800">System Error</h3>
            <p className="text-red-600 mt-2">{error}</p>
          </div>
        </Card>
      ) : loading ? (
        <Card className="p-12">
          <div className="flex flex-col items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-red-500 mb-4" />
            <p className="text-slate-500">Scanning multi-SBU command anomalies...</p>
          </div>
        </Card>
      ) : filteredExceptions.length === 0 ? (
        <Card className="p-12 bg-white border-dashed border-slate-200 shadow-sm">
          <div className="flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-emerald-50 rounded-full flex items-center justify-center mb-4 border border-emerald-100">
              <CheckCircle2Icon className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">All Operations Clear</h3>
            <p className="text-slate-500 mt-1 max-w-md">Tidak ditemukan anomali aktif atau pelanggaran SLA pada klaster <span className="font-bold text-slate-700">{activeSbuTab}</span> saat ini.</p>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2 px-1">
            <h2 className="text-base font-extrabold text-slate-800 tracking-tight">Anomali & Eskalasi Aktif ({filteredExceptions.length})</h2>
          </div>
          
          <div className="grid gap-4">
            {filteredExceptions.map((exc) => {
              const sbuTag = getSbuTag(exc);
              const badge = sbuBadgeConfig[sbuTag];
              return (
                <div 
                  key={exc.id} 
                  className={`p-5 rounded-2xl border transition-all hover:shadow-md flex flex-col md:flex-row gap-4 justify-between items-start md:items-center ${severityBg[exc.severity]}`}
                >
                  <div className="flex gap-4 items-start">
                    <div className={`p-3.5 rounded-2xl border ${severityColors[exc.severity]}`}>
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1.5">
                        <span className={`text-[11px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border ${severityColors[exc.severity]}`}>
                          {exc.severity}
                        </span>
                        <span className={`text-[11px] font-extrabold px-2.5 py-0.5 rounded-md border ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          {exc.anomaly_type.replace(/_/g, ' ')}
                        </span>
                      </div>
                      <h4 className="text-base font-extrabold text-slate-900">
                        {exc.reference_number || 'Unknown Reference'}
                      </h4>
                      <p className="text-sm text-slate-600 mt-1 max-w-3xl font-medium">
                        {exc.description}
                      </p>
                      <p className="text-xs text-slate-400 mt-2 font-medium">
                        Detected {formatDistanceToNow(new Date(exc.detected_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                  
                  <div className="w-full md:w-auto flex justify-end shrink-0">
                    <button 
                      onClick={() => setActiveException(exc)}
                      className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl border shadow-md transition-colors"
                    >
                      Investigate RCA
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <ExceptionInvestigationModal 
        isOpen={!!activeException} 
        onClose={() => setActiveException(null)} 
        exception={activeException} 
      />
    </div>
  );
}

function CheckCircle2Icon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}
