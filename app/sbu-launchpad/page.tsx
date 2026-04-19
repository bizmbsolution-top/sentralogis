"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  Truck, FileText, Ship, Warehouse, HardHat,
  ChevronRight, Activity, Globe2, Layers,
  LayoutGrid, RefreshCw, BarChart3, TrendingUp, History,
  ArrowUpRight, Target, Zap, Wallet, Home,
  Package, Navigation, User, Search, Bell,
  PlusCircle, Sparkles, Box, ShieldCheck, Globe
} from "lucide-react";
import Link from "next/link";
import SBUActivationModal from "./components/SBUActivationModal";
import toast, { Toaster } from "react-hot-toast";

/**
 * SBU LAUNCHPAD: ATLAS ENTERPRISE MARKETPLACE
 * Fokus: Dynamic SBU Activation (Respecting Database `active_sbus`).
 */
const SBULaunchpad = () => {
  const supabase = createClient();
   const [activeSbus, setActiveSbus] = useState<string[]>(['trucking']);
  const [companyInfo, setCompanyInfo] = useState({ id: '', name: 'Subsidiary Loading...', logo: null });
  const [loading, setLoading] = useState(true);

  // Activation State
  const [showActivationModal, setShowActivationModal] = useState(false);
  const [selectedSbuForActivation, setSelectedSbuForActivation] = useState<any>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*, companies(*)')
            .eq('id', user.id)
            .single();
          
          if (profile?.companies) {
            setCompanyInfo({ 
              id: profile.companies.id,
              name: profile.companies.name, 
              logo: profile.companies.logo_url 
            });
            
            // 🎯 SYNC DATA MODUL DARI DATABASE
            if (profile.companies.active_sbus) {
                setActiveSbus(profile.companies.active_sbus);
            }
          }
        }
      } catch (err) {
        console.error("Matrix Sync Error", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [supabase]);

  const marketplaceModules = [
    { 
      group: 'SURFACES TRANSPORT & FLEET',
      items: [
        { id: 'trucking', title: 'TRUCKING OPS', desc: 'TACTICAL MISSION CONTROL', icon: Navigation, color: 'text-emerald-600', bg: 'bg-emerald-50', link: '/sbu/trucking' },
        { id: 'fleet', title: 'FLEET HUB', desc: 'PILOT & UNIT MATRIX', icon: Truck, color: 'text-emerald-600', bg: 'bg-emerald-50', link: '/sbu/trucking/fleet' },
      ]
    },
    {
      group: 'CUSTOMS & COMPLIANCE GATEWAY',
      items: [
        { id: 'clearances', title: 'CLEARANCES', desc: 'EXPORT/IMPORT FILING', icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', link: '/sbu/clearances' },
        { id: 'forwarding', title: 'FREIGHT SYNC', desc: 'INTERNATIONAL FORWARDING', icon: Ship, color: 'text-indigo-600', bg: 'bg-indigo-50', link: '#' },
      ]
    },
    {
      group: 'INFRASTRUCTURE & STORAGE',
      items: [
        { id: 'warehouse', title: 'WAREHOUSING', desc: 'COLD & DRY STORAGE', icon: Warehouse, color: 'text-emerald-600', bg: 'bg-emerald-50', link: '#' },
        { id: 'project', title: 'HEAVY LIFT', desc: 'PROJECT LOGISTICS', icon: HardHat, color: 'text-rose-600', bg: 'bg-rose-50', link: '#' },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-[#1E293B] font-sans pb-32 overflow-x-hidden">
      <Toaster position="top-right" />
      
      {/* 🚀 PREMIUM TOP GLASS NAVIGATION */}
      <nav className="sticky top-0 z-[100] bg-white/80 backdrop-blur-xl border-b border-slate-200 px-8 py-5 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-4">
           <div className="w-12 h-12 bg-[#1E293B] rounded-2xl flex items-center justify-center shadow-xl shadow-slate-900/20">
              <ShieldCheck className="text-white w-7 h-7" />
           </div>
           <div>
              <h1 className="text-2xl font-black italic tracking-tighter uppercase leading-none">Sentralogis<span className="text-emerald-500">.</span></h1>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                 <Globe2 className="w-3.5 h-3.5 text-emerald-500" strokeWidth={3} /> Unified Operational Matrix
              </p>
           </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="hidden md:flex flex-col items-end mr-2 text-right">
              <span className="text-[10px] font-black uppercase text-slate-400">Authorized Subsidiary</span>
              <span className="text-[12px] font-black italic uppercase text-[#1E293B] truncate max-w-[200px]">{companyInfo.name}</span>
           </div>
           <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center shadow-sm">
              <User className="w-5 h-5 text-slate-300" />
           </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-8 py-14 lg:py-20">
        <div className="mb-20">
           <h2 className="text-5xl font-black italic tracking-tighter uppercase text-[#1E293B] mb-2 leading-tight">Welcome Back, <br /> Operational Matrix</h2>
           <p className="text-slate-400 text-sm font-bold uppercase tracking-widest">Select your SBU Command Node to continue</p>
        </div>

        {/* 🛒 MODULAR MARKETPLACE SECTIONS */}
        <div className="space-y-24">
           {marketplaceModules.map((section, idx) => (
             <div key={idx} className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-700" style={{ animationDelay: `${idx * 150}ms` }}>
                <div className="flex items-center gap-4">
                   <h2 className="text-[12px] font-black text-slate-300 uppercase tracking-[0.5em] italic shrink-0">{section.group}</h2>
                   <div className="h-px flex-1 bg-slate-200" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
                   {section.items.map((item) => {
                     const isSubscribed = activeSbus.includes(item.id) || item.id === 'fleet';
                     return (
                       <div 
                         key={item.id} 
                         className={`group relative bg-white border border-slate-200 p-10 rounded-[3rem] shadow-[0_20px_60px_rgba(0,0,0,0.01)] transition-all overflow-hidden flex items-center justify-between ${!isSubscribed ? 'opacity-80 grayscale-[0.5]' : 'hover:shadow-2xl hover:border-[#1E293B] active:scale-[0.98]'}`}
                       >
                          <Link 
                            href={isSubscribed ? item.link : '#'}
                            className="flex items-center gap-8 relative z-10 flex-1"
                          >
                             <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center ${item.bg} ${item.color} shadow-sm border border-black/5 transition-all group-hover:scale-110 group-hover:rotate-3`}>
                                <item.icon className="w-10 h-10" />
                             </div>
                             <div>
                                <h3 className="text-[16px] font-black italic tracking-tighter uppercase text-[#1E293B] leading-none mb-2.5">{item.title}</h3>
                                {isSubscribed ? (
                                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.desc}</p>
                                ) : (
                                   <div className="flex items-center gap-2">
                                      <Zap className="w-3.5 h-3.5 text-emerald-500 fill-emerald-500" />
                                      <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Available in Marketplace</p>
                                   </div>
                                )}
                             </div>
                          </Link>

                          {isSubscribed ? (
                            <div className="relative z-10 w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-[#1E293B] group-hover:text-white transition-all">
                               <ArrowUpRight className="w-6 h-6" />
                            </div>
                          ) : (
                            <button 
                              onClick={() => {
                                setSelectedSbuForActivation(item);
                                setShowActivationModal(true);
                              }}
                              className="relative z-10 px-6 py-2.5 bg-slate-100 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-400 border border-slate-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all active:scale-95"
                            >
                              ACTIVATE
                            </button>
                          )}

                          {isSubscribed && (
                            <div className="absolute top-[-20px] right-[-20px] w-40 h-40 bg-slate-50/30 rounded-full blur-3xl group-hover:bg-[#1E293B]/5 transition-all" />
                          )}
                       </div>
                     );
                   })}
                </div>
             </div>
           ))}
        </div>
      </main>

      {/* 📱 NAVIGATION CONSOLE */}
      <footer className="fixed bottom-0 inset-x-0 bg-white/90 backdrop-blur-3xl border-t border-slate-200 p-8 flex justify-around items-center z-[110]">
          {[
            { label: 'MARKET', icon: LayoutGrid, active: true },
            { label: 'FINANCE', icon: Wallet, link: '/finance' },
            { label: 'ADMIN', icon: ShieldCheck, link: '/admin' },
          ].map((nav, i) => (
             <button 
              key={i} 
              onClick={() => nav.link && (window.location.href = nav.link)}
              className={`flex flex-col items-center gap-2.5 transition-all ${nav.active ? 'text-[#1E293B] scale-110' : 'text-slate-300 hover:text-slate-400'}`}
             >
                <nav.icon className="w-6 h-6" strokeWidth={nav.active ? 3 : 2} />
                <span className="text-[9px] font-black tracking-[0.2em] uppercase">{nav.label}</span>
             </button>
          ))}
      </footer>

      {/* 🚀 SBU ACTIVATION MODAL */}
      <SBUActivationModal 
        show={showActivationModal}
        onClose={() => setShowActivationModal(false)}
        sbu={selectedSbuForActivation}
        companyId={companyInfo.id}
        currentActiveSbus={activeSbus}
        onSuccess={(newSbus) => setActiveSbus(newSbus)}
      />
    </div>
  );
};

export default SBULaunchpad;
