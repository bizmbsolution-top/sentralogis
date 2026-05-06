'use client';

import React, { useState, useEffect } from 'react';
import { Package, Ship, Clipboard, CreditCard, LayoutGrid, Building2, Wallet, LogOut, ChevronDown, Coins } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toast, Toaster } from 'react-hot-toast';

// Standard Components
import ForwardingHeader from "./components/ForwardingHeader";
import ForwardingHero from "./components/ForwardingHero";

/**
 * FORWARDING DASHBOARD: LCL/FCL & CONSOL CONTROL
 */

export default function ForwardingDashboard() {
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

  const stats = [
    { label: 'ACTIVE CONSOL', value: '12', icon: LayoutGrid, color: 'text-purple-400' },
    { label: 'BOOKING CONFIRMED', value: '08', icon: Ship, color: 'text-blue-400' },
    { label: 'STUFFING TODAY', value: '03', icon: Package, color: 'text-green-400' },
    { label: 'BILLING PENDING', value: 'Rp 42M', icon: CreditCard, color: 'text-yellow-400' },
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
        
        {/* HERO BANNER */}
        <ForwardingHero />

        {/* 📊 KPI GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((s, i) => (
                <div key={i} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:shadow-xl transition-all group cursor-default relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rotate-45 -mr-12 -mt-12 group-hover:bg-indigo-50 transition-colors" />
                    <div className="flex justify-between items-start mb-6 relative z-10">
                        <div className={`p-4 rounded-2xl bg-slate-50 ${s.color} group-hover:bg-white border border-slate-100 transition-all shadow-sm`}>
                            <s.icon className="w-6 h-6" />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">{s.label}</p>
                        <p className="text-3xl font-black text-slate-900 tracking-tighter italic">{s.value}</p>
                    </div>
                </div>
            ))}
        </div>

        {/* 🛠️ QUICK ACCESS - Redesigned to match Mission Control */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Link href="/sbu/forwarding/consol" className="group relative bg-[#111214] p-10 rounded-[3rem] border border-white/5 overflow-hidden shadow-2xl hover:border-indigo-500/50 transition-all h-[340px] flex flex-col justify-between">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] group-hover:bg-indigo-500/20 transition-all" />
                <div className="relative z-10 text-white">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-indigo-400 mb-2">Operational Module</p>
                    <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Consolidation<br/>Planner</h3>
                    <p className="text-sm text-white/40 mt-6 leading-relaxed max-w-[200px]">Strategic cargo grouping & container stuffing control.</p>
                </div>
                <div className="relative z-10 flex justify-between items-center text-white/20 group-hover:text-indigo-400 transition-colors">
                    <LayoutGrid className="w-12 h-12" />
                    <span className="text-[10px] font-black uppercase tracking-widest border border-white/10 px-4 py-2 rounded-full">Explore Unit</span>
                </div>
            </Link>

            <Link href="/sbu/forwarding/hs-codes" className="group relative bg-white p-10 rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-2xl hover:border-indigo-500/30 transition-all h-[340px] flex flex-col justify-between">
                <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-slate-50 rounded-full blur-[80px] group-hover:bg-indigo-50 transition-all" />
                <div className="relative z-10">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-2">Regulatory Hub</p>
                    <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none text-slate-900">Customs &<br/>HS Code Lab</h3>
                    <p className="text-sm text-slate-500 mt-6 leading-relaxed max-w-[200px]">Classify goods with precision using AI-Assisted matching.</p>
                </div>
                <div className="relative z-10 flex justify-between items-center text-slate-200 group-hover:text-indigo-600 transition-colors">
                    <Clipboard className="w-12 h-12" />
                    <span className="text-[10px] font-black uppercase tracking-widest border border-slate-100 px-4 py-2 rounded-full">Access Database</span>
                </div>
            </Link>

            <Link href="/sbu/forwarding/billing-review" className="group relative bg-[#4D148C] p-10 rounded-[3rem] border border-purple-400/20 overflow-hidden shadow-2xl hover:-translate-y-2 transition-all h-[340px] flex flex-col justify-between">
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 via-transparent to-transparent z-0" />
                <div className="relative z-10 text-white">
                    <p className="text-[10px] font-black uppercase tracking-[0.4em] text-purple-200 mb-2">Fiscal Gate</p>
                    <h3 className="text-3xl font-black italic tracking-tighter uppercase leading-none">Invoicing<br/>Authority</h3>
                    <p className="text-sm text-purple-100/60 mt-6 leading-relaxed max-w-[200px]">Validate measurements & trigger financial settlement.</p>
                </div>
                <div className="relative z-10 flex justify-between items-center text-white/30 group-hover:text-white transition-colors">
                    <CreditCard className="w-12 h-12" />
                    <span className="text-[10px] font-black uppercase tracking-widest bg-white/10 px-4 py-2 rounded-full">Process Bills</span>
                </div>
            </Link>
        </div>

      </main>
    </div>
  );
}
