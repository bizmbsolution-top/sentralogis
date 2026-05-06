'use client';

import React, { useState, useEffect } from 'react';
import { Box, MoveRight, Scan, Maximize, AlertCircle, PieChart, PlusCircle, Activity, LayoutGrid, Search, Building2, Wallet, RefreshCw, LogOut, ChevronDown, Coins, Clock } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toast, Toaster } from 'react-hot-toast';

// Standard Components
import WarehouseHeader from "./components/WarehouseHeader";
import WarehouseHero from "./components/WarehouseHero";

export default function WarehouseDashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [tenantInfo, setTenantInfo] = useState<any>({ name: 'SENTRALOGIS' });
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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

  const categories = [
    { id: "staged", label: "Awaiting Measure", desc: "Barang Baru, Butuh Scan", count: 142, text: "text-orange-600", bg: "bg-white", border: "border-orange-500", icon: Scan },
    { id: "stored", label: "Inventory Ready", desc: "Tersimpan di Rak", count: 1280, text: "text-blue-600", bg: "bg-white", border: "border-blue-500", icon: Box },
    { id: "release", label: "Order Release", desc: "Siap Keluar Gudang", count: 12, text: "text-emerald-600", bg: "bg-white", border: "border-emerald-500", icon: Activity },
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
        
        {/* HERO BANNER */}
        <WarehouseHero />

        {/* 📊 KPI GRID */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {categories.map((cat) => (
                <div key={cat.id} className={`group bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm hover:shadow-2xl transition-all cursor-default relative overflow-hidden`}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rotate-45 -mr-16 -mt-16 group-hover:bg-orange-50 transition-colors" />
                    <div className="flex justify-between items-start mb-8 relative z-10">
                        <div className={`p-5 rounded-2xl bg-slate-50 ${cat.text} group-hover:scale-110 transition-transform shadow-sm border border-slate-100`}>
                            <cat.icon className="w-8 h-8" />
                        </div>
                        <div className="text-right">
                            <p className="text-5xl font-black italic tracking-tighter text-slate-900 leading-none mb-1">{cat.count}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Units</p>
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-md font-black text-slate-900 uppercase tracking-tight mb-1">{cat.label}</h3>
                        <p className="text-[11px] font-bold text-slate-400 italic uppercase">{cat.desc}</p>
                    </div>
                </div>
            ))}
        </div>

        {/* 🛠️ NAVIGATION GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* INBOUND CARD */}
            <Link href="/sbu/warehouse/inbound" className="lg:col-span-8 group relative bg-[#111214] p-12 rounded-[3.5rem] border border-white/5 overflow-hidden shadow-2xl hover:border-orange-500/50 transition-all h-[400px] flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/10 blur-[100px] group-hover:bg-orange-500/20 transition-all" />
                <div className="relative z-10 text-white">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-orange-400">Tactical Inbound Gate</p>
                    </div>
                    <h3 className="text-4xl md:text-5xl font-black italic tracking-tighter uppercase leading-none mb-6">Cargo Intake<br/>Synchronization</h3>
                    <p className="text-sm text-white/40 leading-relaxed max-w-[400px]">Execute multi-agent unloading, precise measurement verification, and real-time stock allocation protocols.</p>
                </div>
                <div className="relative z-10 flex justify-between items-center text-white/20 group-hover:text-orange-500 transition-colors">
                    <Scan className="w-16 h-16 opacity-50" />
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] border border-white/10 px-6 py-3 rounded-full hover:bg-orange-600 hover:text-white transition-all italic">Initiate Session</span>
                </div>
            </Link>

            {/* QUICK STATS / ANALYTICS */}
            <div className="lg:col-span-4 bg-white border border-slate-200 rounded-[3.5rem] p-12 flex flex-col justify-between shadow-sm">
                <div className="space-y-8">
                    <div className="flex items-center justify-between">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic">Efficiency Index</h4>
                        <PieChart className="w-5 h-5 text-indigo-500" />
                    </div>
                    <div>
                        <p className="text-6xl font-black italic tracking-tighter text-slate-900 leading-none mb-2">94.2<span className="text-2xl mt-4">%</span></p>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Capacity Utilization</p>
                    </div>
                    <div className="space-y-4 pt-8 border-t border-slate-100">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Throughput</span>
                            <span className="text-xs font-mono font-black text-emerald-600">+12% TODAY</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-slate-400 uppercase">Wait Time</span>
                            <span className="text-xs font-mono font-black text-slate-900">0.8s AVG</span>
                        </div>
                    </div>
                </div>
                <button className="w-full mt-10 py-5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-black text-slate-400 uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-inner">
                    Operational Insights
                </button>
            </div>
        </div>

      </main>
    </div>
  );
}
