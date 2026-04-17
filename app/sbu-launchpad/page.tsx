"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import {
  Truck, FileText, Ship, Warehouse, HardHat,
  ChevronRight, Activity, Globe2, Layers,
  LayoutGrid, RefreshCw, BarChart3, TrendingUp, History,
  ArrowUpRight, Target, Zap, Wallet
} from "lucide-react";
import Link from "next/link";

const SBULaunchpad = () => {
  const [stats, setStats] = useState({
    trucking: 0,
    clearances: 0,
    forwarding: 0,
    warehouse: 0,
    project: 0
  });

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLiveCounts = async () => {
      try {
        const { data, error } = await supabase
          .from("work_order_items")
          .select("sbu_type");
        
        if (error) throw error;

        const counts = {
          trucking: data.filter(i => i.sbu_type === 'trucking').length,
          clearances: data.filter(i => i.sbu_type === 'clearances').length,
          forwarding: 0,
          warehouse: 0,
          project: 0
        };

        setStats(counts);
      } catch (err) {
        console.error("Failed to fetch SBU counts:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchLiveCounts();
  }, []);

  const sbuModules = [
    {
      id: 'trucking',
      name: 'SBU Trucking',
      subtitle: 'Surface Transport & Fleet',
      icon: Truck,
      color: 'blue',
      status: 'High Load',
      path: '/sbu/trucking',
      metric: `${stats.trucking} Active`
    },
    {
      id: 'clearances',
      name: 'Customs Clearances',
      subtitle: 'Documentation & Regulatory',
      icon: FileText,
      color: 'amber',
      status: 'Processing',
      path: '/sbu/clearances',
      metric: `${stats.clearances} Pending`
    },
    {
      id: 'forwarding',
      name: 'Freight Forwarding',
      subtitle: 'Ocean & Air Logistics',
      icon: Ship,
      color: 'indigo',
      status: 'Global Transit',
      path: '#',
      metric: `${stats.forwarding} Shipments`
    },
    {
      id: 'warehouse',
      name: 'SBU Warehouse',
      subtitle: 'Inventory & Fulfillment',
      icon: Warehouse,
      color: 'emerald',
      status: 'Optimized',
      path: '#',
      metric: `${stats.warehouse}% Cap.`
    },
    {
      id: 'project',
      name: 'Project Logistics',
      subtitle: 'Heavy Lift & Industrial',
      icon: HardHat,
      color: 'rose',
      status: 'Strategic',
      path: '#',
      metric: `${stats.project} Contracts`
    }
  ];

  return (
    <div className="min-h-screen bg-[#050a18] text-slate-200 p-8 pb-32 relative overflow-hidden font-sans">
      {/* Tactical Grid Background */}
      <div className="absolute inset-0 opacity-20 pointer-events-none" 
           style={{ 
             backgroundImage: 'radial-gradient(circle at 2px 2px, #334155 1px, transparent 0)', 
             backgroundSize: '40px 40px' 
           }} 
      />
      
      {/* Decorative Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Command Header */}
        <header className="mb-20 flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-2xl shadow-blue-600/40">
                <Target className="w-6 h-6 text-white" />
              </div>
              <span className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em]">Central Command</span>
            </div>
            <h1 className="text-6xl font-black text-white italic tracking-tighter leading-none">
              SENTRALOGIS <br/>
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-600">MISSION CONTROL</span>
            </h1>
            <p className="max-w-xl text-slate-500 text-sm font-bold uppercase tracking-widest leading-relaxed">
              Managing 5 Strategic Business Units through a unified tactical engine. Choose a sector to initialize operations.
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-xl">
               <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Network Health</p>
               <div className="flex items-center gap-3">
                  <div className="flex -space-x-2">
                     {[1,2,3,4].map(i => (
                       <div key={i} className="w-8 h-8 rounded-full border-2 border-[#050a18] bg-blue-500/20 flex items-center justify-center">
                          <Zap className="w-3 h-3 text-blue-400" />
                       </div>
                     ))}
                  </div>
                  <span className="text-xl font-black text-white italic">SYNK_OK</span>
               </div>
            </div>
          </div>
        </header>

        {/* Launchpad Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {sbuModules.map((sbu) => (
            <Link 
              href={sbu.path} 
              key={sbu.id}
              className="group relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-[3rem] opacity-0 group-hover:opacity-100 transition-all duration-500 blur-xl" />
              <div className="relative h-full bg-[#151f32]/60 backdrop-blur-2xl border border-white/5 p-10 rounded-[3.5rem] group-hover:border-white/20 transition-all duration-300 flex flex-col justify-between group-hover:-translate-y-2">
                
                <div className="flex justify-between items-start mb-12">
                   <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center border transition-all duration-500 shadow-2xl ${
                     sbu.color === 'blue' ? 'bg-blue-500/10 border-blue-500/20 text-blue-500 group-hover:bg-blue-500 group-hover:text-white' :
                     sbu.color === 'amber' ? 'bg-amber-500/10 border-amber-500/20 text-amber-500 group-hover:bg-amber-500 group-hover:text-white' :
                     sbu.color === 'indigo' ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500 group-hover:bg-indigo-500 group-hover:text-white' :
                     sbu.color === 'emerald' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500 group-hover:bg-emerald-500 group-hover:text-white' :
                     'bg-rose-500/10 border-rose-500/20 text-rose-500 group-hover:bg-rose-500 group-hover:text-white'
                   }`}>
                      <sbu.icon className="w-8 h-8" />
                   </div>
                   <div className="flex flex-col items-end">
                      <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-500">
                         <Activity className="w-3 h-3 text-emerald-500" /> {sbu.status}
                      </div>
                      <span className="text-lg font-black text-white italic mt-1">{sbu.metric}</span>
                   </div>
                </div>

                <div className="space-y-4">
                   <h2 className="text-3xl font-black text-white italic tracking-tighter leading-tight">{sbu.name}</h2>
                   <p className="text-sm font-bold text-slate-500 uppercase tracking-widest leading-none">{sbu.subtitle}</p>
                </div>

                <div className="mt-12 flex justify-between items-center">
                   <div className="w-1/2 h-1 bg-white/5 rounded-full overflow-hidden">
                      <div className={`h-full bg-${sbu.color}-500/50 w-full animate-progress`} />
                   </div>
                   <button className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-white group-hover:text-blue-400 transition-colors">
                      Initialize <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                   </button>
                </div>
              </div>
            </Link>
          ))}
          
          {/* External Network Tile */}
          <div className="bg-gradient-to-br from-blue-600/20 to-transparent border border-blue-500/10 p-10 rounded-[3.5rem] flex flex-col justify-center items-center text-center group cursor-pointer hover:border-blue-500/30 transition-all">
             <Globe2 className="w-12 h-12 text-blue-500 mb-6 group-hover:rotate-12 transition-transform" />
             <h3 className="text-xl font-black text-white italic tracking-tight uppercase">External Network</h3>
             <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mt-2">Connecting to 24 Partners</p>
          </div>
        </div>
      </div>

      {/* Persistent Bottom Nav Overlay */}
      <nav className="fixed bottom-0 inset-x-0 bg-[#0a0f1e]/80 backdrop-blur-2xl border-t border-white/5 p-4 pb-8 flex justify-around items-center z-50">
        <Link href="/admin" className="flex flex-col items-center gap-1.5 text-slate-600 hover:text-white transition-colors">
            <LayoutGrid className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-tighter">Admin</span>
        </Link>
        <div className="-mt-14 relative">
            <button className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center shadow-[0_20px_40px_rgba(59,130,246,0.3)] text-white border-4 border-[#0a0f1e] active:scale-90 transition-all">
                <RefreshCw className="w-8 h-8" />
            </button>
        </div>
        <Link href="/finance" className="flex flex-col items-center gap-1.5 text-slate-600 hover:text-white transition-colors">
            <Wallet className="w-5 h-5" />
            <span className="text-[8px] font-black uppercase tracking-tighter">Finance</span>
        </Link>
      </nav>
    </div>
  );
};

export default SBULaunchpad;
