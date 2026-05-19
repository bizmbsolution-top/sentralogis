'use client';

import React, { useState, useEffect } from 'react';
import { Ship, Package, Plus, ChevronRight, LayoutGrid, Info, ArrowUpRight, DollarSign, Truck, Building2, Coins, Search, Wallet, LogOut, ChevronDown, Clock, TrendingUp } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast, Toaster } from 'react-hot-toast';

// Standard Components
import ForwardingHeader from "../components/ForwardingHeader";
import ForwardingHero from "../components/ForwardingHero";

export default function ConsolidationPlanner() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [tenantInfo, setTenantInfo] = useState<any>({ name: 'SENTRALOGIS' });
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedContainer, setSelectedContainer] = useState('CON-2024-001');

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('*, organizations(*)')
          .eq('id', user.id)
          .single();
        if (profile) {
          setUserProfile(profile);
          setTenantInfo({
            name: profile.organizations?.name || 'SENTRALOGIS',
            logo: profile.organizations?.logo_url,
            mission_credits: profile.organizations?.mission_credits || 0
          });
        }
      }
      setLoading(false);
    }
    init();
  }, [supabase]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = "/";
    } catch (error: any) {
      toast.error("Logout gagal: " + error.message);
    }
  };

  const containers = [
    { id: 'CON-2024-001', type: '20GP', destination: 'SINGAPORE', vessel: 'EVER PROMPT', status: 'PLANNING', cbm: 12.4, maxCbm: 33 },
    { id: 'CON-2024-002', type: '40HC', destination: 'ROTTERDAM', vessel: 'MAERSK LINE', status: 'BOOKING', cbm: 45.0, maxCbm: 76 },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Toaster position="top-right" />
      
      {/* STANDARDIZED HEADER */}
      <ForwardingHeader 
        tenantInfo={tenantInfo}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        userProfile={userProfile}
        showProfileMenu={showProfileMenu}
        setShowProfileMenu={setShowProfileMenu}
        onLogout={handleLogout}
      />

      <main className="p-6 md:p-10 max-w-[1600px] mx-auto space-y-10 animate-in fade-in slide-in-from-top-4 duration-700">
        
        {/* HERO BANNER - Custom Title */}
        <ForwardingHero 
            title={(
                <>
                    Consolidation<br/>
                    <span className="text-blue-400">Strategic Load Planning</span>
                </>
            )}
        />

        <div className="flex flex-col lg:flex-row gap-8 min-h-[600px]">
          
          {/* Left Sidebar: Ready Inventory */}
          <div className="w-full lg:w-96 bg-white border border-slate-200 rounded-[2.5rem] p-8 space-y-8 shadow-sm">
            <div className="flex items-center justify-between">
               <h3 className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase italic">Ready for Consol</h3>
               <span className="text-[10px] font-black bg-indigo-50 text-indigo-600 px-3 py-1 rounded-full border border-indigo-100">12 Item Ready</span>
            </div>
            
            <div className="space-y-4 max-h-[calc(100vh-400px)] overflow-y-auto pr-2 no-scrollbar">
              {[1, 2, 3, 4, 5].map((_, i) => (
                <div key={i} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 hover:border-indigo-500/30 hover:bg-white transition-all cursor-pointer group shadow-sm hover:shadow-xl">
                   <div className="flex justify-between items-start mb-4">
                      <div className="p-3 rounded-xl bg-white border border-slate-100 text-slate-400 group-hover:text-indigo-600 group-hover:border-indigo-100 transition-all">
                         <Package className="w-5 h-5" />
                      </div>
                      <button className="p-2 bg-indigo-600 rounded-xl hover:bg-indigo-500 transition-all text-white shadow-lg shadow-indigo-600/20 active:scale-95">
                         <Plus className="w-4 h-4" />
                      </button>
                   </div>
                   <p className="text-xs font-black text-slate-900 mb-1 uppercase tracking-tight">ITEM-9902{i}</p>
                   <p className="text-[10px] font-bold text-slate-400 truncate mb-4 italic uppercase">Global Forwarder X</p>
                   <div className="flex justify-between items-center pt-4 border-t border-slate-100">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">0.450 CBM</span>
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest italic font-mono">120 KG</span>
                   </div>
                </div>
              ))}
            </div>
          </div>

          {/* Main Container Workspace */}
          <div className="flex-1 space-y-8">
            {/* Container Selector Tabs */}
            <div className="flex gap-4 border-b border-slate-200">
              {containers.map((c) => (
                <button 
                  key={c.id}
                  onClick={() => setSelectedContainer(c.id)}
                  className={`pb-5 px-6 text-[10px] font-black uppercase tracking-[0.2em] transition-all relative ${selectedContainer === c.id ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  {c.id} ({c.type})
                  {selectedContainer === c.id && <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-600 rounded-t-full shadow-[0_-4px_10px_rgba(79,70,229,0.4)]" />}
                </button>
              ))}
              <button className="pb-5 px-6 text-[10px] font-black text-slate-300 hover:text-indigo-600 transition-all flex items-center gap-2 uppercase tracking-widest italic">
                <Plus className="w-4 h-4" /> New Consol
              </button>
            </div>

            {/* Selected Container Detail */}
            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
              <div className="xl:col-span-8 space-y-8">
                <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm relative overflow-hidden">
                   <div className="flex flex-col md:flex-row justify-between gap-8 mb-12 relative z-10">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] italic">Active Mission Fleet</span>
                            <div className="h-px w-10 bg-indigo-100" />
                        </div>
                        <h2 className="text-3xl md:text-4xl font-black italic tracking-tighter text-slate-900 mb-2 uppercase">{selectedContainer}</h2>
                        <div className="flex items-center gap-6">
                           <span className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              <Ship className="w-4 h-4 text-blue-500" /> MV EVER PROMPT
                           </span>
                           <span className="flex items-center gap-2 text-[10px] font-black text-rose-500 uppercase tracking-widest animate-pulse">
                              <Clock className="w-4 h-4" /> CLOSING: 24 APR
                           </span>
                        </div>
                      </div>
                      <div className="flex gap-3 h-fit">
                        <button className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-black tracking-widest uppercase transition-all rounded-2xl flex items-center gap-3 shadow-xl shadow-indigo-600/20 active:scale-95 italic">
                           BOOK CONTAINER <ArrowUpRight className="w-4 h-4 text-white/50" />
                        </button>
                        <button className="px-6 py-4 bg-slate-50 border border-slate-200 hover:bg-white text-slate-400 text-[10px] font-black tracking-widest uppercase transition-all rounded-2xl italic">
                           Edit Plan
                        </button>
                      </div>
                   </div>

                   {/* Manifest Table */}
                   <div className="space-y-4 relative z-10">
                      <div className="flex items-center gap-3 mb-6">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">Cargo Manifest Matrix</span>
                        <div className="h-px flex-1 bg-slate-50" />
                      </div>
                      {[1, 2].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-6 bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:border-indigo-100 hover:shadow-xl transition-all group cursor-default">
                           <div className="flex items-center gap-5">
                              <div className="w-12 h-12 rounded-xl bg-white border border-slate-100 flex items-center justify-center text-indigo-600 font-black italic shadow-sm group-hover:scale-110 transition-transform">
                                 #{i+1}
                              </div>
                              <div>
                                 <p className="text-xs font-black text-slate-900 uppercase tracking-tight">ITEM-2024-X992{i}</p>
                                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic mt-1">Global Forwarding Asia</p>
                              </div>
                           </div>
                           <div className="flex items-center gap-16 text-right">
                              <div className="hidden sm:block">
                                 <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1.5 opacity-50 italic">Load Factor</p>
                                 <p className="text-xs font-black font-mono text-slate-900">0.850 CBM | 145 KG</p>
                              </div>
                              <div>
                                 <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1.5 opacity-50 italic">SBU Revenue</p>
                                 <p className="text-sm font-black text-emerald-600 italic font-mono">$102.00</p>
                              </div>
                              <button className="p-3 bg-white border border-slate-100 text-slate-300 hover:text-rose-500 hover:border-rose-100 hover:shadow-md transition-all rounded-xl">
                                 <Plus className="w-5 h-5 rotate-45" />
                              </button>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>

                {/* SBU Integration Card - High Density */}
                <div className="bg-gradient-to-r from-blue-500/5 to-transparent border border-blue-500/10 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden group">
                   <div className="absolute -left-12 -top-12 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl" />
                   <div className="flex items-center gap-6 relative z-10">
                      <div className="w-16 h-16 bg-white rounded-2xl border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm group-hover:scale-110 transition-transform">
                         <Truck className="w-8 h-8" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-sm font-black uppercase tracking-tight text-slate-900">SBU Trucking Sync</h4>
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        </div>
                        <p className="text-[11px] text-slate-500 italic max-w-[300px]">Strategic bridge: Trigger port-haulage mission for this unit instantly.</p>
                      </div>
                   </div>
                   <button className="w-full md:w-auto px-10 py-5 bg-blue-600 hover:bg-blue-500 text-[10px] font-black tracking-[0.2em] uppercase transition-all rounded-[1.5rem] text-white active:scale-95 shadow-xl shadow-blue-500/20 italic">
                      Trigger Port Transit
                   </button>
                </div>
              </div>

              {/* Load Analysis Sidebar */}
              <div className="xl:col-span-4 space-y-8">
                 <div className="bg-[#111214] border border-white/5 rounded-[3rem] p-10 shadow-2xl relative overflow-hidden group">
                    <div className="absolute -top-12 -right-12 w-32 h-32 bg-indigo-500/5 blur-3xl pointer-events-none" />
                    <h3 className="text-[10px] font-black text-indigo-400 tracking-[0.4em] uppercase mb-12 text-center italic">Load Analysis Index</h3>
                    
                    <div className="relative w-56 h-56 mx-auto mb-12">
                       <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                          <circle cx="18" cy="18" r="16" fill="none" className="stroke-white/5" strokeWidth="2.5" />
                          <circle cx="18" cy="18" r="16" fill="none" className="stroke-indigo-500 drop-shadow-[0_0_15px_rgba(99,102,241,0.5)]" strokeWidth="2.5" strokeDasharray="65, 100" strokeLinecap="round" />
                       </svg>
                       <div className="absolute inset-0 flex flex-col items-center justify-center">
                          <span className="text-5xl font-black text-white italic tracking-tighter">65%</span>
                          <span className="text-[9px] font-black text-white/20 tracking-[0.3em] uppercase mt-2">Space fill rate</span>
                       </div>
                    </div>

                    <div className="space-y-6 px-4">
                       <div className="flex justify-between items-center pt-8 border-t border-white/5">
                          <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] italic">Total Weight</span>
                          <span className="text-xs font-mono font-black text-white/80 uppercase">1,240 / 18,000 KG</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] italic">Current Volume</span>
                          <div className="text-right">
                            <p className="text-sm font-mono font-black text-indigo-400 italic">21.45 CBM</p>
                            <p className="text-[8px] text-white/10 uppercase font-bold mt-1 tracking-widest">33.00 Max Capacity</p>
                          </div>
                       </div>
                    </div>

                    <div className="mt-12 bg-emerald-500 text-white rounded-[2rem] p-8 shadow-2xl shadow-emerald-950/40 relative group/rev">
                       <div className="relative z-10">
                           <div className="flex items-center gap-3 mb-3">
                              <DollarSign className="w-4 h-4 text-white/50" />
                              <span className="text-[9px] font-black uppercase tracking-[0.3em]">Projected SBU Revenue</span>
                           </div>
                           <p className="text-4xl font-black italic tracking-tighter leading-none">
                              $2,574<span className="text-lg opacity-50">.00</span>
                           </p>
                       </div>
                       <div className="absolute right-6 bottom-6 opacity-20 group-hover/rev:scale-110 transition-transform">
                            <TrendingUp className="w-12 h-12" />
                       </div>
                    </div>
                 </div>

                 <button className="w-full py-7 bg-white border border-slate-200 hover:border-indigo-500 hover:translate-y-[-4px] transition-all rounded-[2rem] text-[11px] font-black tracking-[0.4em] uppercase group flex items-center justify-center gap-4 shadow-sm hover:shadow-2xl italic">
                    Finalize for Stuffing
                    <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform text-indigo-500" />
                 </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
