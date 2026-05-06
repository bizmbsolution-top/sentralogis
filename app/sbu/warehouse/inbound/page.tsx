'use client';

import React, { useState, useEffect } from 'react';
import { Package, Scan, Plus, ChevronRight, LayoutGrid, Info, ArrowUpRight, CheckCircle2, QrCode, Search, Building2, Wallet, RefreshCw, LogOut, ChevronDown, Coins, Clock, ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast, Toaster } from 'react-hot-toast';
import Link from 'next/link';

// Standard Components
import WarehouseHeader from "../components/WarehouseHeader";
import WarehouseHero from "../components/WarehouseHero";

export default function WarehouseInbound() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [tenantInfo, setTenantInfo] = useState<any>({ name: 'SENTRALOGIS' });
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showScanner, setShowScanner] = useState(false);

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

  const queueItems = [
    { id: 'WB-2024-001', customer: 'Global Logix', eta: '10:30', status: 'UNLOADING', units: 12 },
    { id: 'WB-2024-002', customer: 'Nexus Asia', eta: '11:15', status: 'QUEUED', units: 45 },
    { id: 'WB-2024-003', customer: 'SBU Forwarding', eta: '11:45', status: 'QUEUED', units: 8 },
  ];

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Toaster position="top-right" />
      
      {/* STANDARDIZED HEADER */}
      <WarehouseHeader 
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
        <WarehouseHero 
            title={(
                <>
                    Tactical Inbound<br/>
                    <span className="text-orange-500">Cargo Intake Synchronization</span>
                </>
            )}
        />

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
          
          {/* Left Column: Intake Queue */}
          <div className="xl:col-span-4 space-y-8">
            <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm">
                <div className="flex items-center justify-between mb-10">
                    <div className="flex items-center gap-4">
                        <Link href="/sbu/warehouse" className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-orange-600 hover:bg-white hover:shadow-xl transition-all group/back">
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        </Link>
                        <h3 className="text-[10px] font-black text-slate-400 tracking-[0.4em] uppercase italic">Intake Queue</h3>
                    </div>
                    <span className="text-[10px] font-black bg-orange-50 text-orange-600 px-4 py-1.5 rounded-full border border-orange-100">8 Units Active</span>
                </div>
                
                <div className="space-y-4 max-h-[calc(100vh-500px)] overflow-y-auto pr-2 no-scrollbar">
                    {queueItems.map((item, i) => (
                        <div key={i} className={`p-6 border rounded-[2rem] transition-all cursor-pointer group shadow-sm hover:shadow-xl ${item.status === 'UNLOADING' ? 'bg-orange-50 border-orange-200' : 'bg-white border-slate-100 hover:border-orange-500/30'}`}>
                            <div className="flex justify-between items-start mb-5">
                                <div className={`p-4 rounded-2xl ${item.status === 'UNLOADING' ? 'bg-orange-600 text-white animate-pulse' : 'bg-slate-50 text-slate-300 group-hover:text-orange-600'} transition-all`}>
                                    <Package className="w-6 h-6" />
                                </div>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{item.eta} ETA</span>
                            </div>
                            <p className="text-sm font-black text-slate-900 uppercase tracking-tight mb-1">{item.customer}</p>
                            <p className="text-[10px] font-black text-slate-400 italic uppercase mb-5">{item.id} • {item.units} Units</p>
                            <div className="flex justify-between items-center pt-5 border-t border-slate-200/50">
                                <span className={`text-[9px] font-black uppercase tracking-[0.2em] italic ${item.status === 'UNLOADING' ? 'text-orange-600' : 'text-slate-300'}`}>{item.status}</span>
                                <Plus className={`w-4 h-4 ${item.status === 'UNLOADING' ? 'text-orange-600' : 'text-slate-200'}`} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <button onClick={() => setShowScanner(true)} className="w-full py-7 bg-slate-900 hover:bg-orange-600 text-white rounded-[2rem] text-[11px] font-black tracking-[0.4em] uppercase shadow-2xl shadow-orange-950/20 transition-all active:scale-95 flex items-center justify-center gap-4 italic">
                <QrCode className="w-5 h-5 opacity-50" /> Initiate Scan Protocol
            </button>
          </div>

          {/* Right Column: Intake Workspace */}
          <div className="xl:col-span-8 flex flex-col gap-8">
            <div className="bg-white border border-slate-200 rounded-[3.5rem] p-12 shadow-sm relative overflow-hidden flex-1">
                <div className="flex flex-col md:flex-row justify-between gap-10 mb-12 relative z-10">
                    <div>
                        <div className="flex items-center gap-3 mb-3">
                            <div className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-pulse" />
                            <span className="text-[10px] font-black text-orange-500 uppercase tracking-[0.3em] italic">Active Synchronizing</span>
                        </div>
                        <h2 className="text-4xl font-black italic tracking-tighter text-slate-900 mb-2 uppercase leading-none">WB-2024-001</h2>
                        <div className="flex items-center gap-6 mt-4">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                                <PlusCircle className="w-4 h-4 text-indigo-500" /> GLOBAL LOGIX ASIA
                            </span>
                        </div>
                    </div>
                    <div className="flex gap-4 h-fit">
                        <button className="px-10 py-5 bg-orange-600 hover:bg-orange-500 text-white text-[11px] font-black tracking-widest uppercase transition-all rounded-2xl flex items-center gap-3 shadow-xl shadow-orange-950/20 active:scale-95 italic">
                           Finalize Cargo <ArrowUpRight className="w-5 h-5 opacity-50" />
                        </button>
                        <button className="px-8 py-5 bg-slate-50 border border-slate-200 hover:bg-white text-slate-400 text-[11px] font-black tracking-widest uppercase transition-all rounded-2xl italic">
                           Hold Unit
                        </button>
                    </div>
                </div>

                {/* Entry Field List */}
                <div className="space-y-6 relative z-10">
                    <div className="flex items-center gap-3 mb-8">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] italic">Inbound Payload Matrix</span>
                        <div className="h-px flex-1 bg-slate-50" />
                    </div>

                    {[1, 2, 3].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] hover:bg-white hover:border-orange-500/30 hover:shadow-2xl transition-all group">
                            <div className="flex items-center gap-8">
                                <div className="w-16 h-16 bg-white border border-slate-100 rounded-2.5xl flex items-center justify-center text-slate-200 group-hover:text-orange-600 shadow-inner group-hover:scale-110 transition-transform">
                                    <Scan className="w-8 h-8 opacity-50 text-orange-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-black text-slate-900 uppercase tracking-tight group-hover:text-orange-600 transition-colors">UNIT-992-00{i+1}</p>
                                    <p className="text-[10px] font-black text-slate-300 italic uppercase mt-1 tracking-widest">Dimension: 120 x 80 x 100 cm</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-12">
                                <div className="text-right hidden sm:block">
                                    <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.2em] mb-2 italic">Volume (Chargeable)</p>
                                    <p className="text-sm font-black text-slate-900 font-mono">0.96 CBM</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.2em] mb-2 italic">Weight Index</p>
                                    <p className="text-sm font-black text-slate-900 font-mono">145.00 KG</p>
                                </div>
                                <div className="p-4 bg-emerald-500/10 rounded-2xl group-hover:bg-emerald-500 transition-all text-emerald-500 group-hover:text-white">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Atmosphere */}
                <div className="absolute right-0 top-0 bottom-0 w-64 bg-orange-500/5 blur-[100px] pointer-events-none" />
            </div>

            {/* Strategic Quick Add */}
            <div className="bg-white border border-slate-200 rounded-[3rem] p-10 flex flex-col md:flex-row items-center justify-between gap-8 group">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-indigo-50 rounded-2.5xl flex items-center justify-center text-indigo-600 shadow-sm group-hover:scale-110 transition-transform">
                        <Plus className="w-8 h-8" />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight">Manual Manifest Entry</h4>
                        <p className="text-[11px] text-slate-400 italic uppercase mt-1 tracking-widest">For units without compliant barcode nodes.</p>
                    </div>
                </div>
                <button className="w-full md:w-auto px-10 py-5 bg-white border border-slate-200 hover:border-indigo-500 hover:text-indigo-600 rounded-2xl text-[10px] font-black tracking-widest uppercase transition-all italic shadow-sm hover:shadow-xl">
                    Open Entry Wizard
                </button>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
