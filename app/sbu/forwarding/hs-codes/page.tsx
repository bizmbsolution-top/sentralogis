'use client';

import React, { useState, useEffect } from 'react';
import { Search, ShieldCheck, Scale, FileText, AlertTriangle, ArrowLeft, Building2, Coins, LogOut, ChevronDown, Wallet } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { toast, Toaster } from 'react-hot-toast';

// Standard Components
import ForwardingHeader from "../components/ForwardingHeader";
import ForwardingHero from "../components/ForwardingHero";

export default function HSCodeEngine() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [tenantInfo, setTenantInfo] = useState<any>({ name: 'SENTRALOGIS' });
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchQuery, setSearchQuery] = useState('');
  
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
          const org = (profile as any).organizations || {};
          setUserProfile(profile);
          setTenantInfo({
            name: org.name || 'SENTRALOGIS',
            logo: org.logo_url,
            mission_credits: org.mission_credits || 0
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

  const mockHSData = [
    {
      code: '8471.30.90',
      description_id: 'Mesin pengolah data otomatis portabel, berat tidak lebih dari 10 kg',
      description_en: 'Portable automatic data processing machines, weighing not more than 10 kg',
      bm: '0%',
      ppn: '11%',
      pph_api: '2.5%',
      lartas: 'Lartas Impor: Post Border (Laporan Surveyor)',
      regulation: 'PMK No. 199/PMK.010/2019'
    }
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
                    Compliance Hub<br/>
                    <span className="text-blue-400 text-6xl">Regulatory Intelligence</span>
                </>
            )}
        />

        {/* Tactical Search Interface */}
        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm relative overflow-hidden group">
            <div className="flex flex-col lg:flex-row gap-10 items-center justify-between relative z-10">
                <div className="flex-1 w-full">
                    <div className="flex items-center gap-5 mb-6">
                        <Link href="/sbu/forwarding" className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white hover:shadow-xl transition-all group/back">
                            <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        </Link>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 mb-1">Global Trade Network</p>
                            <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-900 italic">Regulation Engine</h1>
                        </div>
                    </div>
                    
                    <div className="relative group/input">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 w-6 h-6 group-focus-within/input:text-indigo-600 transition-colors" />
                        <input
                            type="text"
                            placeholder="Search HS Code, Keywords, or Regulations..."
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-[2rem] py-6 pl-16 pr-8 text-slate-900 font-black tracking-tight placeholder:text-slate-200 focus:outline-none focus:border-indigo-600/30 focus:bg-white focus:ring-8 focus:ring-indigo-500/5 transition-all text-sm uppercase shadow-inner"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </div>

                <div className="hidden xl:grid grid-cols-2 gap-4 w-1/4">
                    <div className="p-8 bg-slate-50 border border-slate-100 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-inner group-hover:bg-white transition-colors">
                        <span className="text-[10px] font-black text-slate-300 mb-2 uppercase tracking-widest">Protocol</span>
                        <span className="text-xs font-black text-slate-900 italic uppercase">BTKI 2022 v2</span>
                    </div>
                    <div className="p-8 bg-indigo-500/5 border border-indigo-500/10 rounded-[2rem] flex flex-col items-center justify-center text-center shadow-inner group-hover:bg-indigo-50 transition-colors">
                        <span className="text-[10px] font-black text-indigo-400 mb-2 uppercase tracking-widest">Tax Matrix</span>
                        <span className="text-xs font-black text-indigo-600 italic uppercase underline decoration-2 underline-offset-4">Verified PMK</span>
                    </div>
                </div>
            </div>
            {/* Atmospheric Detail */}
            <div className="absolute right-0 top-0 bottom-0 w-32 bg-indigo-500/5 blur-[80px] pointer-events-none" />
        </div>

        {/* 🏢 MAIN COMPLIANCE WORKSPACE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Results Display */}
            <div className="lg:col-span-8 bg-white rounded-[3.5rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/30">
                    <div className="flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <h3 className="text-[10px] font-black tracking-[0.3em] text-slate-400 uppercase italic">Classification Results</h3>
                    </div>
                    <span className="text-[10px] font-black text-indigo-600 bg-white border border-indigo-100 px-4 py-1.5 rounded-full shadow-sm">{mockHSData.length} UNIT IDENTIFIED</span>
                </div>
                
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="border-b border-slate-50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                                <th className="px-10 py-8">Regulation Key</th>
                                <th className="px-10 py-8">Product Intelligence Matrix</th>
                                <th className="px-10 py-8 text-right">Tax Matrix Node</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {mockHSData.map((item, idx) => (
                            <tr key={idx} className="group hover:bg-slate-50/50 transition-all cursor-pointer">
                                <td className="px-10 py-10 align-top">
                                    <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl text-base font-black tracking-tight italic shadow-2xl shadow-slate-900/20 w-fit group-hover:scale-105 transition-transform">
                                        {item.code}
                                    </div>
                                </td>
                                <td className="px-10 py-10">
                                    <p className="text-base font-black uppercase tracking-tighter text-slate-900 mb-3 leading-tight group-hover:text-indigo-600 transition-colors">{item.description_id}</p>
                                    <p className="text-[11px] text-slate-400 italic font-black leading-relaxed opacity-60">{item.description_en}</p>
                                </td>
                                <td className="px-10 py-10 text-right">
                                    <div className="flex flex-col gap-3 items-end translate-y-[-4px]">
                                        <div className="flex gap-2">
                                            <div className="px-4 py-2 bg-slate-100 text-slate-600 rounded-xl border border-slate-200 text-[10px] font-black italic">BM: {item.bm}</div>
                                            <div className="px-4 py-2 bg-emerald-500 text-white rounded-xl shadow-lg shadow-emerald-500/20 text-[10px] font-black italic">PPN: {item.ppn}</div>
                                        </div>
                                        <div className="px-4 py-2 bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-xl text-[10px] font-black italic group-hover:bg-indigo-600 group-hover:text-white transition-all">PPh: {item.pph_api}</div>
                                    </div>
                                </td>
                            </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* 🛡️ ADVISORY SIDEBAR */}
            <div className="lg:col-span-4 space-y-8">
                <div className="bg-[#111214] p-10 rounded-[3.5rem] shadow-2xl relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                        <ShieldCheck className="w-32 h-32 text-indigo-400" />
                    </div>
                    
                    <div className="flex items-center gap-4 mb-10 relative z-10">
                        <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-inner">
                            <ShieldCheck className="w-5 h-5" />
                        </div>
                        <h3 className="text-xs font-black tracking-[0.3em] text-white uppercase italic">Audit Hub</h3>
                    </div>
                    
                    <div className="space-y-6 relative z-10">
                        <div className="p-8 bg-white/5 border border-white/10 rounded-[2rem] hover:bg-white/10 transition-all cursor-default group/lartas">
                            <div className="flex items-center gap-3 mb-5">
                                <AlertTriangle className="text-amber-500 w-5 h-5 group-hover/lartas:animate-bounce" />
                                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest italic">Lartas Directive</span>
                            </div>
                            <p className="text-xs text-white/50 font-black leading-relaxed uppercase tracking-widest italic">
                                {mockHSData[0].lartas}
                            </p>
                        </div>

                        <div className="p-8 bg-white/5 border border-white/10 rounded-[2rem] hover:bg-white/10 transition-all cursor-default group/law">
                            <div className="flex items-center gap-3 mb-5">
                                <FileText className="text-blue-400 w-5 h-5 group-hover/law:rotate-3 transition-transform" />
                                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest italic">Legal Framework</span>
                            </div>
                            <p className="text-xs text-white/50 font-black leading-relaxed italic tracking-widest opacity-80">
                                {mockHSData[0].regulation}
                            </p>
                        </div>

                        <button className="w-full py-7 bg-indigo-600 hover:bg-indigo-500 rounded-[2rem] text-[11px] font-black tracking-[0.4em] uppercase text-white shadow-3xl shadow-indigo-600/30 transition-all active:scale-95 flex items-center justify-center gap-4 italic group/btn">
                            Authorize Permit <Scale className="w-5 h-5 group-hover/btn:rotate-12 transition-transform opacity-50" />
                        </button>
                    </div>
                </div>
                
                {/* Visual Decorative Card */}
                <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm">
                    <div className="flex items-center gap-4 text-slate-300">
                        <div className="h-px flex-1 bg-slate-50" />
                        <span className="text-[9px] font-black uppercase tracking-[0.5em] italic">System End-of-Protocol</span>
                        <div className="h-px flex-1 bg-slate-50" />
                    </div>
                </div>
            </div>
        </div>

      </main>
    </div>
  );
}
