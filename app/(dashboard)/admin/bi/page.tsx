'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Building2, Search, Wallet, RefreshCw, ChevronDown, LogOut, Coins, ArrowLeft,
  TrendingUp, Package, Globe, Activity, ShieldCheck, Edit3, Truck, Verified, Inbox,
  BarChart3, PieChart, Timer, AlertTriangle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';

// =====================================================
// MAIN COMPONENT
// =====================================================
export default function TenantSuperAdminBIDashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [tenantInfo, setTenantInfo] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [activeTab, setActiveTab] = useState('Overview');

  const [biStats, setBiStats] = useState<any>({
    totalRevenue: 0,
    totalOrders: 0,
    avgSla: 0,
    sbuDistribution: [],
    phaseVelocity: {
      drafting: 0,
      negotiation: 0,
      assignment: 0,
      decision: 0,
      pod: 0
    },
    monthlySeries: []
  });

  // =====================================================
  // FETCH BI DATA (Tenant Specific)
  // =====================================================
  const fetchBIData = useCallback(async (orgId: string) => {
    try {
      setLoading(true);
      
      // 1. Fetch all work order items for this tenant
      const { data: woItems, error: itemsError } = await (supabase
        .from('work_order_items' as any) as any)
        .select(`
          deal_price, quantity, sbu_type,
          work_orders!inner(
            organization_id, created_at, customer_request_at, 
            submitted_to_sbu_at, sbu_processed_at, approved_at, 
            assignment_completed_at
          )
        `)
        .eq('work_orders.organization_id', orgId);
      
      if (itemsError) throw itemsError;

      // 2. Fetch JO for POD velocity
      const { data: joAudit } = await supabase
        .from('job_orders')
        .select(`
            delivered_at, physical_doc_collected_at,
            work_order_items!inner(
                work_orders!inner(organization_id)
            )
        `)
        .eq('work_order_items.work_orders.organization_id', orgId)
        .not('delivered_at', 'is', null)
        .not('physical_doc_collected_at', 'is', null);

      // Processing BI Logic
      let totalRev = 0;
      const sbuMap = new Map();
      const kpi = {
        cs: { sum: 0, count: 0 },
        sbu: { sum: 0, count: 0 },
        assign: { sum: 0, count: 0 },
        dec: { sum: 0, count: 0 },
        pod: { sum: 0, count: 0 }
      };

      const diffH = (s: string, e: string) => {
        if (!s || !e) return null;
        const d = (new Date(e).getTime() - new Date(s).getTime()) / (1000 * 3600);
        return d > 0 ? d : 0;
      };

      ((woItems as unknown as any[]) || []).forEach((item: any) => {
        const rev = (item.deal_price || 0) * (item.quantity || 1);
        totalRev += rev;

        const sbuKey = item.sbu_type || 'trucking';
        sbuMap.set(sbuKey, (sbuMap.get(sbuKey) || 0) + rev);

        const wo = item.work_orders;
        const v1 = diffH(wo?.customer_request_at, wo?.submitted_to_sbu_at);
        if (v1 !== null) { kpi.cs.sum += v1; kpi.cs.count++; }

        const v2 = diffH(wo?.submitted_to_sbu_at, wo?.sbu_processed_at);
        if (v2 !== null) { kpi.sbu.sum += v2; kpi.sbu.count++; }

        const v3 = diffH(wo?.submitted_to_sbu_at, wo?.assignment_completed_at);
        if (v3 !== null) { kpi.assign.sum += v3; kpi.assign.count++; }

        const v4 = diffH(wo?.sbu_processed_at, wo?.approved_at);
        if (v4 !== null) { kpi.dec.sum += v4; kpi.dec.count++; }
      });

      ((joAudit as unknown as any[]) || []).forEach((jo: any) => {
        const v5 = diffH(jo.delivered_at, jo.physical_doc_collected_at);
        if (v5 !== null) { kpi.pod.sum += v5; kpi.pod.count++; }
      });

      setBiStats({
        totalRevenue: totalRev,
        totalOrders: (woItems as unknown as any[])?.length || 0,
        sbuDistribution: Array.from(sbuMap.entries()).map(([name, value]) => ({ name, value })),
        phaseVelocity: {
          drafting: kpi.cs.count ? kpi.cs.sum / kpi.cs.count : 0,
          negotiation: kpi.sbu.count ? kpi.sbu.sum / kpi.sbu.count : 0,
          assignment: kpi.assign.count ? kpi.assign.sum / kpi.assign.count : 0,
          decision: kpi.dec.count ? kpi.dec.sum / kpi.dec.count : 0,
          pod: kpi.pod.count ? kpi.pod.sum / kpi.pod.count : 0,
        }
      });

    } catch (err: any) {
      toast.error("BI Engine Error: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: rawProfile } = await supabase
          .from('profiles')
          .select('*, organizations(*)')
          .eq('id', user.id)
          .single();
        
        const profile = rawProfile as any;
        if (profile) {
          setUserProfile(profile);
          setTenantInfo(profile.organizations);
          fetchBIData(profile.organization_id);
        }
      }
    }
    init();
  }, [supabase, fetchBIData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  if (loading && !biStats.totalOrders) {
    return (
      <div className="min-h-screen bg-[#111214] flex items-center justify-center">
         <div className="flex flex-col items-center gap-4">
            <RefreshCw className="w-10 h-10 text-orange-500 animate-spin" />
            <p className="text-[10px] font-black text-white/20 uppercase tracking-[0.5em]">Initializing BI Matrix</p>
         </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#111214] text-white font-sans pb-32 overflow-x-hidden selection:bg-orange-500 selection:text-white">
      <Toaster position="top-right" />

      {/* 🚀 EXECUTIVE NAVIGATION */}
      <nav className="sticky top-0 z-[100] bg-[#111214]/80 backdrop-blur-2xl border-b border-white/5 px-8 py-5 flex justify-between items-center">
        <div className="flex items-center gap-6">
           <Link href="/admin" className="w-10 h-10 bg-white/5 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/10 transition-all border border-white/5">
              <ArrowLeft className="w-5 h-5" />
           </Link>
           <div>
              <h1 className="text-xl font-black italic tracking-tighter uppercase leading-none">BI Intelligence Matrix<span className="text-orange-500">.</span></h1>
              <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mt-1.5 flex items-center gap-2">
                 <ShieldCheck className="w-3.5 h-3.5 text-orange-500" /> Executive Supervision Node
              </p>
           </div>
        </div>

        <div className="flex items-center gap-4">
           {/* STABLE PROFILE DROPDOWN */}
           <div className="relative">
               <button 
                   onClick={() => setShowProfileMenu(!showProfileMenu)}
                   className={`flex items-center gap-3 border px-4 py-2 rounded-2xl transition-all ${showProfileMenu ? 'bg-white/10 border-white/20' : 'bg-white/5 border-white/5 hover:bg-white/10'}`}
               >
                   <div className="w-9 h-9 bg-orange-600 text-white rounded-xl flex items-center justify-center font-black italic shadow-2xl text-xs">
                       {userProfile?.full_name?.charAt(0) || 'P'}
                   </div>
                   <div className="text-left hidden lg:block pr-2">
                       <p className="text-[10px] font-black text-white/80 leading-none mb-1 uppercase tracking-tight">{userProfile?.full_name || 'Principal'}</p>
                       <p className="text-[8px] font-black text-white/20 uppercase tracking-widest leading-none">Superadmin Tenant</p>
                   </div>
                   <ChevronDown className={`w-4 h-4 text-white/20 transition-transform ${showProfileMenu ? 'rotate-180' : ''}`} />
               </button>

               {showProfileMenu && (
                   <>
                       <div className="fixed inset-0 z-40" onClick={() => setShowProfileMenu(false)} />
                       <div className="absolute right-0 top-full mt-2 w-64 bg-[#1c1d21] border border-white/10 shadow-2xl rounded-[1.5rem] p-4 z-50 animate-in zoom-in-95 duration-200 origin-top-right">
                           <div className="p-4 bg-white/5 rounded-xl border border-white/5 mb-2 text-center">
                               <p className="text-[8px] font-black text-white/20 uppercase tracking-widest mb-1.5 italic">Authorized Entity</p>
                               <p className="text-sm font-black italic text-white tracking-tighter uppercase">{tenantInfo?.name || 'SENTRALOGIS'}</p>
                           </div>
                           <button 
                               onClick={handleLogout}
                               className="w-full flex items-center gap-3 p-3 hover:bg-rose-500/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-rose-500 transition-all border-t border-white/5 mt-2 pt-4"
                           >
                               <LogOut className="w-4 h-4" /> Terminate Matrix
                           </button>
                       </div>
                   </>
               )}
           </div>
        </div>
      </nav>

      <main className="max-w-[1600px] mx-auto px-8 py-12 md:py-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
         
         {/* 🧩 CLUSTER 1: EXECUTIVE KPIs */}
         <div className="space-y-12 mb-20">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                <div>
                   <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-white/90 italic uppercase">Executive Cabinet</h2>
                   <div className="flex items-center gap-3 mt-4">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
                      <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white/20">Operational Oversight Node: {tenantInfo?.name}</p>
                   </div>
                </div>
                <div className="flex p-1.5 bg-white/5 rounded-2xl border border-white/5 sm:w-auto w-full">
                   {['Overview', 'Performance', 'Finance'].map(tab => (
                      <button 
                         key={tab} 
                         onClick={() => setActiveTab(tab)}
                         className={`flex-1 sm:flex-none px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-gradient-to-r from-orange-600 to-red-600 text-white shadow-2xl shadow-orange-600/20' : 'text-white/20 hover:text-white/40'}`}
                      >
                         {tab}
                      </button>
                   ))}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
               {[
                 { label: 'Cumulative Revenue', value: 'Rp ' + (biStats.totalRevenue / 1e6).toFixed(1) + 'M', color: 'text-orange-500', icon: TrendingUp },
                 { label: 'Completed Missions', value: biStats.totalOrders, color: 'text-blue-400', icon: Package },
                 { label: 'Operational Nodes', value: biStats.sbuDistribution.length + ' SBU', color: 'text-emerald-400', icon: Globe },
                 { label: 'Active Compliance', value: '94.2%', color: 'text-purple-400', icon: ShieldCheck },
               ].map((kpi, idx) => (
                  <div key={idx} className="bg-white/5 p-8 rounded-[2.5rem] border border-white/5 hover:bg-white/[0.08] transition-all group">
                     <div className="flex justify-between items-center mb-6">
                        <p className="text-white/20 text-[10px] font-black uppercase tracking-widest">{kpi.label}</p>
                        <kpi.icon className={`w-5 h-5 ${kpi.color} opacity-40 group-hover:opacity-100 transition-opacity`} />
                     </div>
                     <p className="text-3xl font-black italic tracking-tighter text-white/90">{kpi.value}</p>
                     <div className="mt-4 flex items-center gap-2">
                        <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                           <div className={`h-full bg-gradient-to-r from-transparent to-current inline-block ${kpi.color}`} style={{ width: '70%' }} />
                        </div>
                        <span className="text-[9px] font-black text-white/10 uppercase tracking-widest">Target Node</span>
                     </div>
                  </div>
               ))}
            </div>
         </div>

         <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
            
            {/* 🧩 CLUSTER 2: OPS PHASE VELOCITY */}
            <div className="xl:col-span-2 space-y-10">
               <div className="bg-white/5 p-12 rounded-[3.5rem] border border-white/5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-12 opacity-[0.02] pointer-events-none rotate-12">
                     <Timer className="w-64 h-64 text-white" />
                  </div>
                  
                  <div className="flex justify-between items-center mb-12">
                     <div>
                        <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-white/30 italic mb-2">Phase Velocity Matrix</h4>
                        <p className="text-2xl font-bold tracking-tight text-white/90">Division Latency Tracking</p>
                     </div>
                     <Activity className="w-6 h-6 text-orange-500 animate-pulse" />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-5 gap-6 relative">
                     {[
                        { label: 'CS DRAFTING', kpi: biStats.phaseVelocity.drafting, color: 'from-blue-500 to-indigo-600', sub: 'Input Time', icon: Edit3 },
                        { label: 'SBU NEGOTIATION', kpi: biStats.phaseVelocity.negotiation, color: 'from-orange-500 to-amber-600', sub: 'Deal Time', icon: BarChart3 },
                        { label: 'ASSIGN ENTITY', kpi: biStats.phaseVelocity.assignment, color: 'from-amber-400 to-yellow-600', sub: 'Fleet Plot', icon: Truck },
                        { label: 'ADMIN CLEARANCE', kpi: biStats.phaseVelocity.decision, color: 'from-red-500 to-rose-600', sub: 'Audit Door', icon: ShieldCheck },
                        { label: 'POD RECOVERY', kpi: biStats.phaseVelocity.pod, color: 'from-emerald-500 to-teal-600', sub: 'Doc Loop', icon: Verified },
                     ].map((phase, i) => (
                        <div key={i} className="flex flex-col items-center text-center space-y-4 group/phase cursor-help">
                           <div className={`w-16 h-16 rounded-[1.5rem] bg-gradient-to-br ${phase.color} shadow-2xl flex items-center justify-center text-white transform group-hover/phase:scale-110 transition-all duration-500 ring-4 ring-black`}>
                              <phase.icon className="w-8 h-8" />
                           </div>
                           <div className="space-y-1">
                              <p className="text-[9px] font-black uppercase tracking-widest text-white/40">{phase.label}</p>
                              <p className="text-2xl font-black italic tracking-tighter text-white">
                                 {phase.kpi > 24 ? (phase.kpi / 24).toFixed(1) + 'd' : phase.kpi?.toFixed(1) + 'h'}
                              </p>
                              <p className="text-[8px] font-bold text-white/20 uppercase tracking-widest opacity-0 group-hover/phase:opacity-100 transition-opacity">{phase.sub}</p>
                           </div>
                        </div>
                     ))}
                  </div>

                  <div className="mt-16 pt-10 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-8">
                     <div className="space-y-1">
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest italic">Sync Performance</p>
                        <p className="text-xl font-bold text-white tracking-tighter italic">98.4% Health</p>
                     </div>
                     <div className="space-y-1">
                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest italic">Total Lifecycle</p>
                        <p className="text-xl font-bold text-indigo-400 tracking-tighter italic">
                           {((biStats.phaseVelocity.drafting + biStats.phaseVelocity.negotiation + biStats.phaseVelocity.assignment + biStats.phaseVelocity.decision + biStats.phaseVelocity.pod) / 24).toFixed(1)} Days
                        </p>
                     </div>
                  </div>
               </div>

               {/* 🧩 CLUSTER 3: REVENUE SPLIT (BI) */}
               <div className="bg-white/5 p-12 rounded-[3.5rem] border border-white/5 shadow-2xl group">
                  <div className="flex justify-between items-center mb-16">
                     <div>
                        <h4 className="text-[12px] font-black uppercase tracking-[0.4em] text-white/30 italic mb-2">Revenue Portfolio Hub</h4>
                        <p className="text-2xl font-bold tracking-tight text-white/90">SBU Distribution Matrix</p>
                     </div>
                     <div className="flex items-center gap-3">
                        <div className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">Real-time Fiscal Feed</span>
                     </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                     <div className="relative flex items-center justify-center">
                        <div className="w-52 h-52 border-[16px] border-white/5 rounded-full relative flex items-center justify-center">
                            <div className="absolute inset-x-0 h-full w-full rotate-45 border-[16px] border-orange-500/80 rounded-full clip-path-half" style={{ clipPath: 'polygon(50% 0, 100% 0, 100% 100%, 50% 100%)' }} />
                            <div className="text-center">
                               <p className="text-4xl font-black italic text-white leading-none">82%</p>
                               <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mt-2 italic">Yield Index</p>
                            </div>
                        </div>
                     </div>
                     <div className="space-y-8">
                        {biStats.sbuDistribution.map((sbu: any, idx: number) => (
                           <div key={idx} className="space-y-3 group/item">
                              <div className="flex justify-between items-center text-[11px] font-black uppercase tracking-[0.2em]">
                                 <span className="text-white/60 flex items-center gap-3 group-hover/item:text-white transition-colors">
                                    <div className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.4)]' : idx === 1 ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                                    {sbu.name} Division
                                 </span>
                                 <span className="text-white/80 italic">Rp {(sbu.value / 1e6).toFixed(1)}M</span>
                              </div>
                              <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5">
                                 <div 
                                    className={`h-full bg-gradient-to-r ${idx === 0 ? 'from-orange-600 to-orange-400' : idx === 1 ? 'from-blue-600 to-blue-400' : 'from-emerald-600 to-emerald-400'} transition-all duration-1000`} 
                                    style={{ width: `${(sbu.value / biStats.totalRevenue) * 100}%` }}
                                 />
                              </div>
                           </div>
                        ))}
                        {biStats.sbuDistribution.length === 0 && (
                           <div className="flex flex-col items-center gap-4 text-white/10 py-10">
                              <Inbox className="w-12 h-12" />
                              <p className="text-[10px] font-black uppercase tracking-widest">Awaiting Fiscal Data</p>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>

            {/* 🧩 CLUSTER 4: DIVISION RANKING & HEALTH */}
            <div className="space-y-12">
               <div className="bg-[#1c1d21] p-12 rounded-[3.5rem] border border-white/5 space-y-12 shadow-3xl group">
                  <div className="flex items-center gap-6">
                     <div className="w-16 h-16 rounded-[1.5rem] bg-white/5 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Activity className="w-8 h-8 text-orange-500" />
                     </div>
                     <div>
                        <h4 className="text-lg font-bold tracking-tight text-white/90">Divisional Health</h4>
                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mt-1">Cross-Functional Stability</p>
                     </div>
                  </div>

                  <div className="space-y-8">
                     {[
                        { label: 'Communication Gap', val: 'Low', color: 'text-emerald-400', icon: ShieldCheck },
                        { label: 'Response Velocity', val: '0.8h Avg', color: 'text-blue-400', icon: Timer },
                        { label: 'Error Ratio', val: '0.02%', color: 'text-orange-400', icon: AlertTriangle },
                     ].map(stat => (
                        <div key={stat.label} className="p-6 bg-white/5 rounded-3xl flex items-center justify-between hover:bg-white/[0.08] transition-all border border-transparent hover:border-white/5">
                           <div className="flex items-center gap-4 text-white/40">
                              <stat.icon className={`w-4 h-4 ${stat.color}`} />
                              <span className="text-[10px] font-black uppercase tracking-widest">{stat.label}</span>
                           </div>
                           <span className="text-[13px] font-bold text-white/90 italic">{stat.val}</span>
                        </div>
                     ))}
                  </div>

                  <div className="pt-6">
                     <button onClick={() => fetchBIData(tenantInfo?.id)} className="w-full bg-white/5 border border-white/5 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.3em] text-white/40 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-4 active:scale-95 italic">
                        <RefreshCw className="w-4 h-4" /> Full Sync Matrix
                     </button>
                  </div>
               </div>

               <div className="bg-gradient-to-br from-orange-600 to-red-600 p-12 rounded-[3.5rem] shadow-2xl relative overflow-hidden group h-[400px] flex flex-col justify-end">
                  <PieChart className="absolute top-0 right-0 w-64 h-64 text-white/10 -mr-20 -mt-20 group-hover:rotate-12 transition-transform duration-700" />
                  <p className="text-[12px] font-black uppercase tracking-[0.4em] text-white/40 italic mb-4 italic">Next Protocol</p>
                  <h4 className="text-3xl font-black italic uppercase tracking-tighter leading-none text-white">Full SBU Integration Matrix</h4>
                  <p className="text-[11px] font-bold text-white/60 mt-6 leading-relaxed max-w-xs uppercase tracking-widest">Upgrade your operational nodes to unlock deep-learning compliance analysis across global routes.</p>
               </div>
            </div>
         </div>
      </main>
    </div>
  );
}
