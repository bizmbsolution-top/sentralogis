'use client';

import React, { useState, useEffect } from 'react';
import { CreditCard, FileText, Download, Send, CheckCircle2, AlertCircle, TrendingUp, DollarSign, Building2, Coins, LogOut, ChevronDown, Wallet, Search, Clock, ArrowRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast, Toaster } from 'react-hot-toast';

// Standard Components
import ForwardingHeader from "../components/ForwardingHeader";
import ForwardingHero from "../components/ForwardingHero";

export default function ForwardingBillingReview() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [tenantInfo, setTenantInfo] = useState<any>({ name: 'SENTRALOGIS' });
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isFinalized, setIsFinalized] = useState(false);

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

  // Mock data of generated invoices from consolidation CON-2024-001
  const draftInvoices = [
    { id: 'INV-DRAFT-001', customer: 'Global Forwarding Asia', cbm: 4.25, rate: 120, total: 510, status: 'DRAFT' },
    { id: 'INV-DRAFT-002', customer: 'Pacific Logistics Ltd', cbm: 6.80, rate: 115, total: 782, status: 'DRAFT' },
    { id: 'INV-DRAFT-003', customer: 'SMT Forwarders', cbm: 1.40, rate: 140, total: 196, status: 'DRAFT' },
  ];

  const totalRevenue = draftInvoices.reduce((acc, inv) => acc + inv.total, 0);

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
                    Billing Review<br/>
                    <span className="text-blue-400">Financial Execution Gate</span>
                </>
            )}
        />

        {/* 📑 FISCAL HEADER SECTION */}
        <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm relative overflow-hidden flex flex-col md:flex-row justify-between items-center gap-10">
            <div className="relative z-10">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shadow-sm">
                        <CreditCard className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl md:text-3xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">Stuffing Finalization</h1>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-2 italic flex items-center gap-2">
                             CONSOLIDATION ID: <span className="text-indigo-500 underline decoration-indigo-200 underline-offset-4">CON-2024-001</span> | 4/4 PARTNERS READY
                        </p>
                    </div>
                </div>
            </div>

            <div className="relative z-10 w-full md:w-auto">
                {!isFinalized ? (
                    <button 
                        onClick={() => setIsFinalized(true)}
                        className="w-full md:w-auto px-12 py-6 bg-slate-900 hover:bg-indigo-600 text-white rounded-[1.8rem] text-[11px] font-black tracking-[0.3em] uppercase transition-all flex items-center justify-center gap-4 shadow-2xl shadow-indigo-600/20 active:scale-95 italic group"
                    >
                        Authorize & Generate Invoices <TrendingUp className="w-5 h-5 text-indigo-400 group-hover:text-white transition-colors" />
                    </button>
                ) : (
                    <div className="flex flex-wrap gap-4">
                        <button className="px-8 py-5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:bg-slate-50 transition-all shadow-sm italic hover:shadow-xl hover:translate-y-[-2px]">
                            <Download className="w-5 h-5 text-indigo-600" /> Bundle PDF Export
                        </button>
                        <button className="px-10 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center gap-3 shadow-2xl shadow-emerald-950/20 transition-all active:scale-95 italic">
                            <Send className="w-5 h-5 opacity-50" /> Dispatch to Partners
                        </button>
                    </div>
                )}
            </div>
            
            {/* Atmospheric Background Element */}
            <div className="absolute right-0 top-0 bottom-0 w-64 bg-indigo-500/5 blur-[100px] pointer-events-none" />
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
            {/* Invoice List Workspace */}
            <div className="xl:col-span-8 space-y-6">
                <div className="bg-white border border-slate-200 rounded-[3.5rem] overflow-hidden shadow-sm shadow-slate-200/50">
                    <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                            <span className="text-[10px] font-black tracking-[0.4em] text-slate-400 uppercase italic">Draft Invoices (FOR-LCL)</span>
                        </div>
                        <span className="text-[9px] font-black text-indigo-600 italic bg-white px-4 py-1.5 rounded-full border border-indigo-50 shadow-sm">AUTO-CALCULATED VIA ACTUAL MEASUREMENTS</span>
                    </div>
                    
                    <div className="divide-y divide-slate-50">
                        {draftInvoices.map((inv) => (
                        <div key={inv.id} className="p-10 flex flex-col md:flex-row items-center justify-between hover:bg-slate-50/50 transition-all group cursor-default">
                            <div className="flex items-center gap-6 mb-6 md:mb-0 w-full md:w-auto">
                                <div className="w-16 h-16 bg-slate-50 rounded-2.5xl flex items-center justify-center text-slate-300 group-hover:text-indigo-600 group-hover:bg-white group-hover:shadow-xl transition-all border border-slate-100 shadow-inner">
                                    <FileText className="w-8 h-8 opacity-60" />
                                </div>
                                <div>
                                    <h4 className="text-md font-black text-slate-900 uppercase tracking-tight">{inv.customer}</h4>
                                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em] mt-1 italic">{inv.id}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-16 w-full md:w-auto justify-between md:justify-end">
                                <div className="text-right">
                                    <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.2em] mb-2 italic">Rate / Volume Matrix</p>
                                    <p className="text-sm font-mono font-black text-slate-500 uppercase tracking-tighter">{inv.cbm} CBM @ <span className="text-indigo-400">${inv.rate}</span></p>
                                </div>
                                <div className="text-right min-w-[140px]">
                                    <p className="text-[9px] text-slate-300 font-black uppercase tracking-[0.2em] mb-2 italic">Total Indebtedness</p>
                                    <p className="text-3xl font-black italic text-slate-900 font-mono tracking-tighter">${inv.total.toFixed(2)}</p>
                                </div>
                                <button className="p-4 bg-white border border-slate-100 rounded-2xl hover:border-indigo-500 hover:text-indigo-600 hover:shadow-xl transition-all text-slate-200">
                                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                </button>
                            </div>
                        </div>
                        ))}
                    </div>
                </div>
                
                <div className="p-8 bg-amber-500/5 border border-amber-500/10 rounded-[2.5rem] flex items-center gap-6 group hover:bg-amber-500/10 transition-all cursor-default">
                    <div className="p-4 bg-white rounded-2xl shadow-sm group-hover:scale-110 transition-transform">
                        <AlertCircle className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                        <p className="text-[11px] text-amber-600/80 leading-relaxed italic font-black uppercase tracking-[0.2em]">
                            Legal Directive: Confirmed invoice generation triggers automatic GL entries & payment aging across all partner nodes. Use caution.
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Dashboard: Economic Summary */}
            <div className="xl:col-span-4 space-y-8">
                <div className="bg-[#111214] border border-white/5 rounded-[3.5rem] p-12 relative overflow-hidden shadow-2xl group/card">
                    <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-500/5 rounded-full blur-[100px] pointer-events-none group-hover/card:bg-emerald-500/10 transition-all duration-1000" />
                    
                    <div className="flex items-center gap-3 mb-10">
                        <div className="h-0.5 w-8 bg-emerald-500" />
                        <h3 className="text-[10px] font-black text-emerald-500 tracking-[0.5em] uppercase italic">Consol Economics</h3>
                    </div>
                    
                    <div className="space-y-10 relative z-10">
                        <div className="space-y-4">
                            <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.3em] italic">Projected Gross Revenue</p>
                            <p className="text-6xl font-black italic tracking-tighter text-white drop-shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                                <span className="text-2xl text-emerald-500 not-italic mr-2">$</span>{totalRevenue.toFixed(0)}<span className="text-xl opacity-30">.{(totalRevenue % 1).toFixed(2).split('.')[1]}</span>
                            </p>
                        </div>

                        <div className="pt-10 border-t border-white/5 space-y-6">
                            <div className="flex justify-between items-center group/item cursor-default">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/20 group-hover/item:text-white/40 transition-colors">Total Load Weight</span>
                                <span className="text-sm font-mono font-black text-white/80">1,485.00 <span className="text-[10px] text-white/20">KG</span></span>
                            </div>
                            <div className="flex justify-between items-center group/item cursor-default">
                                <span className="text-[10px] font-black uppercase tracking-widest text-white/20 group-hover/item:text-white/40 transition-colors">Efficiency Index / CBM</span>
                                <span className="text-sm font-mono font-black text-emerald-400 italic bg-emerald-500/10 px-4 py-1.5 rounded-full border border-emerald-500/10">$124.50</span>
                            </div>
                        </div>

                        {isFinalized && (
                        <div className="p-8 bg-emerald-500 text-white rounded-[2rem] shadow-2xl shadow-emerald-950/50 animate-in zoom-in-95 duration-500 relative overflow-hidden group/success">
                            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover/success:scale-125 transition-transform duration-700">
                                <CheckCircle2 className="w-16 h-16" />
                            </div>
                            <div className="relative z-10">
                                <div className="flex items-center gap-3 mb-3">
                                    <span className="text-[10px] font-black uppercase tracking-[0.3em]">Ledger Sync Protocol</span>
                                    <div className="h-px flex-1 bg-white/20" />
                                </div>
                                <h4 className="text-xl font-black italic uppercase tracking-tighter mb-2 leading-none">Authentication Successful</h4>
                                <p className="text-[10px] text-white/60 leading-relaxed font-black uppercase tracking-widest">
                                    Published to partner dashboards. Secure payment link generated & active.
                                </p>
                            </div>
                        </div>
                        )}
                    </div>
                </div>

                <div className="bg-white border border-slate-200 rounded-[3rem] p-10 shadow-sm shadow-slate-200/50 group">
                    <h4 className="text-[10px] font-black text-slate-400 mb-8 tracking-[0.4em] uppercase italic text-center">Quick Fiscal Modifiers</h4>
                    <div className="grid grid-cols-2 gap-6">
                        <button className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:border-indigo-200 hover:shadow-xl transition-all text-center group/btn shadow-inner">
                            <p className="text-3xl font-black italic tracking-tighter text-slate-900 group-hover/btn:scale-110 transition-transform">15%</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase mt-2 tracking-widest opacity-60">Tax Override</p>
                        </button>
                        <button className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100 hover:bg-white hover:border-indigo-200 hover:shadow-xl transition-all text-center group/btn shadow-inner">
                            <p className="text-3xl font-black italic tracking-tighter text-slate-900 group-hover/btn:scale-110 transition-transform">LCL</p>
                            <p className="text-[9px] font-black text-slate-400 uppercase mt-2 tracking-widest opacity-60">Fee Engine</p>
                        </button>
                    </div>
                </div>
            </div>
        </div>

      </main>
    </div>
  );
}
