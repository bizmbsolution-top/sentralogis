'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  ArrowLeft as ArrowLeftIcon, Wallet as WalletIcon, Banknote as BanknoteIcon, Receipt as ReceiptIcon, ArrowUpRight as ArrowUpRightIcon, TrendingUp as TrendingUpIcon, 
  Clock as ClockIcon, CheckCircle2 as CheckCircle2Icon, AlertCircle as AlertCircleIcon, PlusCircle as PlusCircleIcon, Search as SearchIcon, Filter as FilterIcon, 
  ChevronDown as ChevronDownIcon, Download as DownloadIcon, Printer as PrinterIcon, X as XIcon, LayoutGrid as LayoutGridIcon, Box as BoxIcon, History as HistoryIcon,
  Activity as ActivityIcon, ShieldCheck as ShieldCheckIcon, Coins as CoinsIcon, PieChart as PieChartIcon, BarChart3 as BarChart3Icon, Loader2 as Loader2Icon, Save as SaveIcon,
  LogOut, Building2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { toast, Toaster } from 'react-hot-toast';

// Standard Components
import WarehouseHeader from "../components/WarehouseHeader";
import WarehouseHero from "../components/WarehouseHero";

export default function WarehouseFinanceDashboard() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab ] = useState<'billing' | 'petty_cash'>('billing');
  const [whItems, setWhItems] = useState<any[]>([]);
  const [pettyCash, setPettyCash] = useState<any[]>([]);
  const [stats, setStats] = useState({
    pendingInvoices: 0,
    totalRevenue: 0,
    pettyCashBalance: 0,
    activeMissions: 0,
    mission_credits: 0
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

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
          setCurrentUser(profile);
          setTenant({
            name: profile.organizations?.name || 'SENTRALOGIS',
            logo: profile.organizations?.logo_url,
            mission_credits: profile.organizations?.mission_credits || 0
          });
          fetchData(profile.organization_id);
        }
      }
    }
    init();
  }, [supabase]);

  const fetchData = useCallback(async (orgId: string) => {
    setLoading(true);
    try {
      const { data: items } = await supabase
        .from('wh_items')
        .select('*, customers(name)')
        .eq('organization_id', orgId)
        .order('created_at', { ascending: false });
      
      if (items) setWhItems(items);

      const { data: transactions } = await supabase
        .from('finance_transactions')
        .select('*')
        .eq('organization_id', orgId)
        .eq('sbu_type', 'warehouse')
        .order('created_at', { ascending: false });
      
      if (transactions) setPettyCash(transactions);

      const rev = items?.reduce((sum, i) => sum + (Number(i.handling_fee || 0)), 0) || 0;
      const pcBalance = transactions?.reduce((sum, t) => sum + (t.type === 'income' ? (Number(t.amount)||0) : -(Number(t.amount)||0)), 0) || 0;

      setStats(prev => ({
        ...prev,
        pendingInvoices: items?.filter(i => i.billing_status !== 'paid').length || 0,
        totalRevenue: rev,
        pettyCashBalance: pcBalance,
        activeMissions: items?.filter(i => i.status === 'stored').length || 0
      }));

    } catch (err) {
      console.error(err);
      toast.error("Resource Sync Failed");
    } finally {
      setLoading(false);
    }
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

  if (loading && !currentUser) {
     return (
       <div className="min-h-screen flex items-center justify-center bg-slate-50">
          <Loader2Icon className="w-10 h-10 text-slate-300 animate-spin" />
       </div>
     );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Toaster position="top-right" />
      
      {/* STANDARDIZED HEADER */}
      <WarehouseHeader 
        tenantInfo={tenant || { name: 'SENTRALOGIS', logo: null, mission_credits: 0 }}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        userProfile={currentUser}
        showProfileMenu={showProfileMenu}
        setShowProfileMenu={setShowProfileMenu}
        onLogout={handleLogout}
      />

      <main className="max-w-[1600px] mx-auto px-8 py-10 space-y-10">
        
        {/* HERO BANNER - Custom Title */}
        <WarehouseHero 
            title={(
                <>
                    Precision Invoicing,<br/>
                    <span className="text-orange-500">Inventory Integrity</span>
                </>
            )}
        />

        {/* 📊 KPI GRID */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {[
            { label: 'Unbilled Revenue', val: `Rp ${stats.totalRevenue.toLocaleString()}`, sub: `${stats.pendingInvoices} Pending Items`, icon: TrendingUpIcon, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
            { label: 'Petty Cash', val: `Rp ${stats.pettyCashBalance.toLocaleString()}`, sub: 'Ready Availability', icon: WalletIcon, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
            { label: 'Active Missions', val: stats.activeMissions, sub: 'Inventory Stored', icon: BoxIcon, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100' },
            { label: 'System Integrity', val: '100%', sub: 'No Drift Detected', icon: ShieldCheckIcon, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
          ].map((card, i) => (
            <div key={i} className={`bg-white p-8 rounded-[2.5rem] border ${card.border} shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-500`}>
              <div className={`absolute top-0 right-0 w-32 h-32 ${card.bg} rounded-full -translate-y-1/2 translate-x-1/2 opacity-50 group-hover:scale-125 transition-transform duration-700`} />
              <div className="relative z-10">
                <div className={`w-12 h-12 rounded-2xl ${card.bg} ${card.color} flex items-center justify-center mb-6 border border-white`}>
                   <card.icon className="w-6 h-6" />
                </div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</h4>
                <p className="text-2xl font-black italic text-slate-900 tracking-tighter uppercase mb-1">{card.val}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{card.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* 🧬 TAB INTERFACE */}
        <div className="flex gap-4 p-2 bg-slate-100/50 rounded-[2rem] w-fit shadow-inner border border-slate-200/50">
           <button 
             onClick={() => setActiveTab('billing')}
             className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'billing' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
           >
              Invoicing & Billing
           </button>
           <button 
             onClick={() => setActiveTab('petty_cash')}
             className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'petty_cash' ? 'bg-white text-slate-900 shadow-xl' : 'text-slate-400 hover:text-slate-600'}`}
           >
              Petty Cash Ledger
           </button>
        </div>

        {activeTab === 'billing' && (
          <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-700">
             <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                   <h3 className="text-xl font-black italic tracking-tighter text-slate-900 uppercase">Billing Matrix</h3>
                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Audit active warehouse inventory units</p>
                </div>
                <div className="flex items-center gap-4">
                   <div className="relative">
                      <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="SEARCH SKU OR OWNER..." 
                        className="pl-12 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest focus:outline-none focus:border-orange-500 transition-all w-72 shadow-sm"
                      />
                   </div>
                </div>
             </div>

             <div className="p-8 overflow-x-auto">
                <table className="w-full text-left border-separate border-spacing-y-4">
                   <thead>
                      <tr className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] italic">
                         <th className="pb-4 px-8">Mission Unit</th>
                         <th className="pb-4">Owner / Customer</th>
                         <th className="pb-4">Storage Metrics</th>
                         <th className="pb-4">Fiscal Status</th>
                         <th className="pb-4 text-right px-8">Terminal</th>
                      </tr>
                   </thead>
                   <tbody>
                      {whItems.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-24 text-center">
                            <div className="flex flex-col items-center gap-4 text-slate-300">
                               <BoxIcon className="w-16 h-16 opacity-20" />
                               <p className="text-xs font-black uppercase tracking-widest italic opacity-40">No Inventory Records Detected</p>
                            </div>
                          </td>
                        </tr>
                      ) : whItems.map((item, idx) => (
                        <tr key={idx} className="group hover:bg-slate-50 transition-all">
                           <td className="bg-slate-50/30 rounded-l-[2rem] p-8 border-y border-l border-slate-100">
                              <div className="flex items-center gap-5">
                                 <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center border border-slate-200 text-slate-400 shadow-sm group-hover:scale-110 transition-transform">
                                    <BoxIcon className="w-6 h-6" />
                                 </div>
                                 <div className="leading-tight">
                                    <p className="text-[13px] font-black italic text-slate-900 uppercase tracking-tight">{item.sku || 'N/A'}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-2">{item.name}</p>
                                 </div>
                              </div>
                           </td>
                           <td className="bg-slate-50/30 p-8 border-y border-slate-100">
                              <p className="text-[12px] font-black text-slate-900 uppercase italic leading-none">{item.customers?.name || 'GENERIC OWNER'}</p>
                              <div className="flex items-center gap-2 mt-2">
                                 <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                                 <span className="text-[9px] font-black text-orange-600 uppercase tracking-widest">Active Partner</span>
                              </div>
                           </td>
                           <td className="bg-slate-50/30 p-8 border-y border-slate-100 text-slate-500">
                              <p className="text-[11px] font-black text-slate-900 uppercase italic">{( ( (item.length_cm||0) * (item.width_cm||0) * (item.height_cm||0) ) / 1000000 ).toFixed(3)} CBM</p>
                              <p className="text-[9px] font-bold uppercase tracking-widest mt-1.5 font-mono">{item.weight_kg || 0} KG Matrix</p>
                           </td>
                           <td className="bg-slate-50/30 p-8 border-y border-slate-100">
                              <div className={`px-4 py-2 rounded-xl border w-fit flex items-center gap-2.5 ${item.billing_status === 'paid' ? 'bg-emerald-50 border-emerald-100 text-emerald-600 shadow-sm shadow-emerald-500/5' : 'bg-orange-50 border-orange-100 text-orange-600'}`}>
                                 <div className={`w-1.5 h-1.5 rounded-full ${item.billing_status === 'paid' ? 'bg-emerald-500' : 'bg-orange-500 animate-pulse'}`} />
                                 <span className="text-[9px] font-black uppercase tracking-widest italic">{item.billing_status?.toUpperCase() || 'UNBILLED'}</span>
                              </div>
                           </td>
                           <td className="bg-slate-50/30 rounded-r-[2rem] p-8 border-y border-r border-slate-100 text-right">
                              <button className="px-6 py-3 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all active:scale-95 shadow-xl shadow-slate-900/10 italic">
                                 Invoice Unit
                              </button>
                           </td>
                        </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
        )}

        {/* 🧬 TAB CONTENT: PETTY CASH */}
        {activeTab === 'petty_cash' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 animate-in fade-in slide-in-from-bottom-5 duration-700">
             <div className="lg:col-span-4">
                <div className="bg-white rounded-[3.5rem] border border-slate-200 p-12 shadow-sm sticky top-32">
                   <h3 className="text-xl font-black italic tracking-tighter text-slate-900 uppercase mb-10 flex items-center gap-4">
                      <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center border border-orange-100">
                        <PlusCircleIcon className="w-5 h-5 text-orange-600" />
                      </div>
                      Ledger Protocol
                   </h3>
                   <div className="space-y-10">
                      <div className="space-y-4">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                             <div className="w-1 h-3 bg-slate-200" /> Transaction Memo
                         </label>
                         <input type="text" placeholder="REFUELLING / LOGISTICS" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-6 px-8 text-xs font-black italic text-slate-900 focus:outline-none focus:border-orange-500/30 transition-all font-mono shadow-inner outline-none" />
                      </div>
                      <div className="space-y-4">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                            <div className="w-1 h-3 bg-slate-200" /> Quantum Amount (Rp)
                         </label>
                         <input type="number" placeholder="0" className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-6 px-8 text-2xl font-black italic tracking-tighter text-slate-900 focus:outline-none focus:border-orange-500/30 transition-all shadow-inner outline-none" />
                      </div>
                      <div className="grid grid-cols-2 gap-5">
                         <button className="py-6 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-emerald-950/20 active:scale-95 transition-all italic">Log Income</button>
                         <button className="py-6 bg-rose-600 hover:bg-rose-500 text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-rose-950/20 active:scale-95 transition-all italic">Log Expense</button>
                      </div>
                   </div>
                </div>
             </div>

             <div className="lg:col-span-8">
                <div className="bg-[#111214] rounded-[3.5rem] border border-white/5 p-12 shadow-2xl flex flex-col min-h-[700px] relative overflow-hidden">
                   <div className="absolute top-0 right-0 p-20 opacity-5 pointer-events-none">
                        <HistoryIcon className="w-64 h-64 text-white" />
                   </div>
                   
                   <div className="flex justify-between items-center mb-12 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                        <h3 className="text-[11px] font-black text-white/40 tracking-[0.4em] uppercase italic">Financial Ledger Sync</h3>
                      </div>
                      <button className="text-[10px] font-black text-orange-400 uppercase tracking-widest flex items-center gap-3 hover:text-orange-300 transition-colors bg-white/5 px-6 py-2.5 rounded-full border border-white/5">
                         <DownloadIcon className="w-4 h-4 opacity-50" /> Export Audit Log
                      </button>
                   </div>

                   <div className="space-y-4 relative z-10">
                      {pettyCash.length === 0 ? (
                        <div className="py-32 text-center flex flex-col items-center gap-8">
                           <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center text-white/10 border border-white/5">
                              <HistoryIcon className="w-12 h-12" />
                           </div>
                           <div className="space-y-3">
                              <p className="text-md font-black italic text-white/40 uppercase tracking-tight">Ledger Matrix Sync Empty</p>
                              <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em]">No warehouse transactions detected in current session</p>
                           </div>
                        </div>
                      ) : pettyCash.map((t, idx) => (
                        <div key={idx} className="flex justify-between items-center p-8 bg-white/[0.03] hover:bg-white/[0.06] border border-white/5 rounded-[2.5rem] transition-all group cursor-default">
                           <div className="flex items-center gap-6">
                              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border shadow-2xl transition-all ${t.type === 'income' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 shadow-emerald-500/10' : 'bg-rose-500/10 border-rose-500/20 text-rose-400 shadow-rose-500/10'}`}>
                                 {t.type === 'income' ? <PlusCircleIcon className="w-6 h-6" /> : <ReceiptIcon className="w-6 h-6" />}
                              </div>
                              <div>
                                 <p className="text-base font-black italic text-white/80 uppercase tracking-tighter leading-none group-hover:text-white transition-colors">{t.description}</p>
                                 <p className="text-[10px] font-bold text-white/20 uppercase tracking-widest mt-2.5 italic flex items-center gap-2">
                                     <ClockIcon className="w-3.5 h-3.5" /> {new Date(t.created_at).toLocaleString()}
                                 </p>
                              </div>
                           </div>
                           <div className="text-right">
                              <p className={`text-3xl font-black italic tracking-tighter leading-none ${t.type === 'income' ? 'text-emerald-400' : 'text-white'}`}>
                                 <span className="text-lg opacity-50 mr-1">{t.type === 'income' ? '+' : '-'}</span>
                                 {(t.amount||0).toLocaleString()}
                              </p>
                              <p className={`text-[9px] font-black uppercase tracking-[0.3em] mt-3 ${t.type === 'income' ? 'text-emerald-500' : 'text-rose-500'}`}>{t.type?.toUpperCase()} PROTOCOL</p>
                           </div>
                        </div>
                      ))}
                   </div>
                </div>
             </div>
          </div>
        )}
      </main>
    </div>
  );
}
