"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { 
  Activity, 
  TrendingUp, 
  ShieldCheck, 
  Truck, 
  Users, 
  FileText, 
  ArrowUpRight, 
  Layers,
  Search,
  Navigation as NavIcon,
  Box,
  Clock,
  Zap,
  CheckCircle2,
  AlertCircle,
  Timer,
  BarChart3,
  MousePointer2
} from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { formatThousand } from '../../sbu/trucking/utils';

export default function HQOpsDashboardPage() {
  const supabase = createClient();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  
  // SLA & KPI States
  const [slaScores, setSlaScores] = useState({
    stage1: 0, // WO -> SBU (60m)
    stage2: 0, // Assign -> WA (120m)
    stage3: 0, // Done -> Invoice (3 days)
    global: 0
  });

  const [metrics, setMetrics] = useState({
    activeMissions: 0,
    totalFleet: 0,
    activeDrivers: 0,
    pendingJobs: 0,
    readyToInvoice: 0
  });

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) return;
    
    try {
      setLoading(true);

      // 1. Fetch Job Orders with relationship data
      const { data: jos, error: joError } = await supabase
        .from('job_orders')
        .select(`
            id, status, created_at, updated_at, wa_link_sent_at, completed_at,
            wo_item:wo_items!wo_item_id (
                sbu_type,
                wo:work_orders!wo_id (created_at)
            )
        `)
        .eq('tenant_id', profile.tenant_id);

      if (joError) throw joError;

      // 2. Fetch Fleet & Driver stats
      const [fleetRes, driverRes] = await Promise.all([
          supabase.from('md_fleets').select('id', { count: 'exact', head: true }).eq('tenant_id', profile.tenant_id),
          supabase.from('md_drivers').select('id', { count: 'exact', head: true }).eq('tenant_id', profile.tenant_id)
      ]);

      // 3. Calculate SLAs
      const now = new Date();
      let s1_total = 0, s1_pass = 0;
      let s2_total = 0, s2_pass = 0;
      let s3_total = 0, s3_pass = 0;

      (jos || []).forEach(jo => {
          const joCreated = new Date(jo.created_at);
          const woCreated = new Date((jo as any).wo_item?.wo?.created_at);
          
          // SLA 1: WO -> SBU (60 min)
          if (woCreated && joCreated) {
              s1_total++;
              const diffMin = (joCreated.getTime() - woCreated.getTime()) / (1000 * 60);
              if (diffMin <= 60) s1_pass++;
          }

          // SLA 2: Assign -> WA (120 min)
          // Since assigned_at isn't always there, we use created_at as assignment start
          if (jo.wa_link_sent_at) {
              s2_total++;
              const waSent = new Date(jo.wa_link_sent_at);
              const diffMin = (waSent.getTime() - joCreated.getTime()) / (1000 * 60);
              if (diffMin <= 120) s2_pass++;
          }

          // SLA 3: Done -> Invoice (3 days)
          if (jo.completed_at && jo.status === 'ready_for_billing') {
              s3_total++;
              const completedAt = new Date(jo.completed_at);
              const readyAt = new Date(jo.updated_at); // Approximation
              const diffDays = (readyAt.getTime() - completedAt.getTime()) / (1000 * 60 * 60 * 24);
              if (diffDays <= 3) s3_pass++;
          }
      });

      const s1 = s1_total > 0 ? (s1_pass / s1_total) * 100 : 0;
      const s2 = s2_total > 0 ? (s2_pass / s2_total) * 100 : 0;
      const s3 = s3_total > 0 ? (s3_pass / s3_total) * 100 : 0;
      
      // Weighting logic: 30% S1, 30% S2, 40% S3 (Billing is priority)
      const global = (s1 * 0.3) + (s2 * 0.3) + (s3 * 0.4);

      setSlaScores({
          stage1: Math.round(s1),
          stage2: Math.round(s2),
          stage3: Math.round(s3),
          global: Math.round(global)
      });

      setMetrics({
          activeMissions: (jos || []).filter(j => !['completed', 'cancelled', 'paid', 'ready_for_billing'].includes(j.status)).length,
          totalFleet: fleetRes.count || 0,
          activeDrivers: driverRes.count || 0,
          pendingJobs: (jos || []).filter(j => j.status === 'pending').length,
          readyToInvoice: (jos || []).filter(j => j.status === 'ready_for_billing').length
      });

    } catch (err) {
      console.error("Ops Command Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, profile]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
      return (
          <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50">
              <div className="w-10 h-10 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4" />
              <p className="text-xs text-slate-400">Loading dashboard...</p>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6 lg:p-8">
      {/* Header Section */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shadow-sm">
              <Activity size={22} />
            </div>
            <div>
              <p className="text-xs font-medium text-blue-600 uppercase tracking-wide">Operations Dashboard</p>
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900 leading-tight">Operations</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
             <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center gap-3">
                <div className={`w-10 h-10 ${slaScores.global >= 70 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'} rounded-lg flex items-center justify-center`}>
                   <ShieldCheck size={18} />
                </div>
                <div>
                   <p className="text-[10px] font-medium text-slate-400 uppercase">Health Score</p>
                   <p className={`text-sm font-semibold ${slaScores.global >= 70 ? 'text-emerald-600' : 'text-rose-600'}`}>{slaScores.global}% - {slaScores.global >= 90 ? 'Optimal' : slaScores.global >= 70 ? 'Stable' : 'Critical'}</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* SLA Metrics */}
      <div className="max-w-7xl mx-auto mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {[
                  { label: 'CS Response', desc: 'WO to SBU', sla: '60 min', score: slaScores.stage1, icon: <Zap size={18}/>, color: 'blue' },
                  { label: 'Dispatch', desc: 'Assign to WA', sla: '120 min', score: slaScores.stage2, icon: <Timer size={18}/>, color: 'indigo' },
                  { label: 'Billing', desc: 'Done to Invoice', sla: '3 days', score: slaScores.stage3, icon: <CheckCircle2 size={18}/>, color: 'emerald' },
              ].map((sla, idx) => (
                  <Card key={idx} className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white">
                      <div className="flex justify-between items-start mb-4">
                          <div>
                              <h4 className="text-sm font-semibold text-slate-900">{sla.label}</h4>
                              <p className="text-xs text-slate-400 mt-0.5">{sla.desc}</p>
                          </div>
                          <span className="px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] font-medium text-slate-500">SLA: {sla.sla}</span>
                      </div>
                      
                      <div className="flex items-end gap-3 mb-4">
                          <h2 className="text-2xl font-semibold text-slate-900">{sla.score}%</h2>
                          <span className={`text-xs font-medium mb-0.5 ${sla.score >= 80 ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {sla.score >= 90 ? 'Excellent' : sla.score >= 70 ? 'Stable' : 'Delays'}
                          </span>
                      </div>

                      <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                              className={`h-full rounded-full transition-all duration-1000 ${sla.score >= 80 ? 'bg-blue-500' : 'bg-amber-500'}`} 
                              style={{ width: `${sla.score}%` }}
                          />
                      </div>
                  </Card>
              ))}
          </div>
      </div>

      {/* Quick Access Grid */}
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/hq/work-orders" className="group">
            <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white hover:border-blue-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center mb-3 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                <FileText size={18} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Work Orders</h3>
              <p className="text-xs text-slate-400">Manage requests</p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Active: {metrics.activeMissions}</span>
                <ArrowUpRight size={14} className="text-blue-500 group-hover:text-blue-600" />
              </div>
            </Card>
          </Link>

          <Link href="/hq/job-orders" className="group">
            <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white hover:border-emerald-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <Truck size={18} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Job Orders</h3>
              <p className="text-xs text-slate-400">Dispatch tracking</p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Live: {metrics.activeMissions}</span>
                <ArrowUpRight size={14} className="text-emerald-500 group-hover:text-emerald-600" />
              </div>
            </Card>
          </Link>

          <Link href="/hq/sbu-activities" className="group">
            <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white hover:border-purple-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mb-3 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                <NavIcon size={18} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Mission Radar</h3>
              <p className="text-xs text-slate-400">Live operations</p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Activity: {metrics.activeMissions}</span>
                <ArrowUpRight size={14} className="text-purple-500 group-hover:text-purple-600" />
              </div>
            </Card>
          </Link>

          <Link href="/hq/finance/cost-audit" className="group">
            <Card className="p-5 border border-slate-200 shadow-sm rounded-xl bg-white hover:border-amber-300 hover:shadow-md transition-all">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-lg flex items-center justify-center mb-3 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                <TrendingUp size={18} />
              </div>
              <h3 className="text-sm font-semibold text-slate-900 mb-1">Finance</h3>
              <p className="text-xs text-slate-400">Cost audit</p>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-500">Pending: {metrics.readyToInvoice}</span>
                <ArrowUpRight size={14} className="text-amber-500 group-hover:text-amber-600" />
              </div>
            </Card>
          </Link>
        </div>

        {/* Fleet Readiness */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-6 border border-slate-200 shadow-sm rounded-xl bg-white">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-sm font-semibold text-slate-900">Fleet Readiness</h2>
                        <p className="text-xs text-slate-400 mt-0.5">Real-time asset capacity</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {[
                        { label: 'Total Fleet', value: metrics.totalFleet, color: 'blue', sub: 'Owned assets' },
                        { label: 'Active Drivers', value: metrics.activeDrivers, color: 'emerald', sub: 'Verified' },
                        { label: 'Utilisation', value: `${metrics.totalFleet > 0 ? Math.round((metrics.activeMissions / metrics.totalFleet) * 100) : 0}%`, color: 'purple', sub: 'Asset load' },
                    ].map((m, i) => (
                        <div key={i} className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                            <p className="text-[10px] font-medium text-slate-400 uppercase mb-1">{m.label}</p>
                            <h3 className={`text-xl font-semibold text-${m.color}-600 mb-1`}>{m.value}</h3>
                            <p className="text-xs text-slate-400">{m.sub}</p>
                        </div>
                    ))}
                </div>
            </Card>

            <Card className="p-6 border border-slate-200 shadow-sm rounded-xl bg-white">
               <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center"><ShieldCheck size={16}/></div>
                  <h3 className="text-sm font-semibold text-slate-900">System Status</h3>
               </div>
               
               <div className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                     <span className="text-xs text-slate-500">Cloud Sync</span>
                     <span className="text-xs font-medium text-emerald-600 flex items-center gap-1.5">
                         <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div> Active
                     </span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b border-slate-100">
                     <span className="text-xs text-slate-500">Tenant Nodes</span>
                     <span className="text-xs font-medium text-slate-700">Consolidated</span>
                  </div>
                  <div className="flex justify-between items-center py-2">
                     <span className="text-xs text-slate-500">Last Check</span>
                     <span className="text-xs font-medium text-slate-700">{new Date().toLocaleTimeString()}</span>
                  </div>
               </div>
            </Card>
        </div>
      </div>
    </div>
  );
}
