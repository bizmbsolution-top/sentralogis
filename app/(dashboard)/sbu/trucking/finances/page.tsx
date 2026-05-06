'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { 
  Banknote,
  Wallet, 
  TrendingUp, 
  Clock, 
  AlertCircle, 
  Search, 
  Loader2, 
  LayoutGrid, 
  Receipt,
  History,
  ShieldCheck,
  Download,
  ArrowRight,
  ArrowUpRight,
  PlusCircle,
  Coins
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { toast, Toaster } from 'react-hot-toast';

export default function TruckingFinanceCockpit() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [pettyCash, setPettyCash] = useState<any[]>([]);
  const [stats, setStats] = useState({
    unbilledCount: 0,
    unbilledAmount: 0,
    pendingPaymentCount: 0,
    pendingPaymentAmount: 0,
    pettyCashBalance: 0,
    disputeCount: 0,
    paidCount: 0
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);

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
          fetchData(profile.organization_id);
        }
      }
    }
    init();
  }, [supabase]);

  const fetchData = useCallback(async (orgId: string) => {
    setLoading(true);
    try {
      const [josRes, pcRes] = await Promise.all([
        supabase
          .from('job_orders')
          .select(`
              *,
              work_order_items (
                  *,
                  work_orders (
                      *,
                      customers (*)
                  ),
                  origin_location:origin_location_id (*),
                  destination_location:destination_location_id (*)
              )
          `)
          .eq('organization_id', orgId)
          .order('created_at', { ascending: false }),
        supabase
          .from('finance_transactions')
          .select('*')
          .eq('organization_id', orgId)
          .eq('sbu_type', 'trucking')
          .order('created_at', { ascending: false })
      ]);
      
      if (josRes.data) setJobOrders(josRes.data);
      if (pcRes.data) setPettyCash(pcRes.data);

      const jos = josRes.data || [];
      const pc = pcRes.data || [];

      const unbilled = jos.filter(j => j.status === 'delivered' && j.billing_status === 'none');
      const pending = jos.filter(j => j.billing_status === 'invoiced');
      const disputes = jos.filter(j => j.billing_status === 'rejected');
      const balance = pc.reduce((sum, t) => sum + (t.type === 'income' ? Number(t.amount) : -Number(t.amount)), 0);

      setStats({
        unbilledCount: unbilled.length,
        unbilledAmount: unbilled.reduce((sum, j) => sum + Number(j.work_order_items?.deal_price || 0), 0),
        pendingPaymentCount: pending.length,
        pendingPaymentAmount: pending.reduce((sum, j) => sum + Number(j.work_order_items?.deal_price || 0), 0),
        pettyCashBalance: balance,
        disputeCount: disputes.length,
        paidCount: jos.filter(j => j.billing_status === 'paid').length
      });

    } catch (err) {
      toast.error("Finance Sync Failed");
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const categories = [
    { id: 'unbilled', label: 'Unbilled JOs', desc: 'Ready to Invoice', count: stats.unbilledCount, amount: stats.unbilledAmount, icon: Receipt, color: 'text-orange-600', bg: 'bg-orange-50', dot: 'bg-orange-500' },
    { id: 'pending', label: 'Pending Payment', desc: 'Waiting HQ Approval', count: stats.pendingPaymentCount, amount: stats.pendingPaymentAmount, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50', dot: 'bg-blue-500' },
    { id: 'disputes', label: 'Finance Disputes', desc: 'Need Revision', count: stats.disputeCount, amount: 0, icon: AlertCircle, color: 'text-rose-600', bg: 'bg-rose-50', dot: 'bg-rose-500' },
    { id: 'petty_cash', label: 'Petty Cash', desc: 'SBU Ledger', count: pettyCash.length, amount: stats.pettyCashBalance, icon: Wallet, color: 'text-emerald-600', bg: 'bg-emerald-50', dot: 'bg-emerald-500' }
  ];

  if (loading && !currentUser) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-10 h-10 text-slate-300 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8 p-4 md:p-8 max-w-[1600px] mx-auto">
      <Toaster position="top-right" />
      
      {/* 👑 HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-5">
           <div className="w-16 h-16 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-900/20">
              <Banknote size={32} />
           </div>
           <div>
              <h1 className="text-3xl font-black text-slate-900 italic uppercase tracking-tight">FINANCE COCKPIT</h1>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5 italic">SBU Revenue & Disbursement Control</p>
           </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="bg-white border border-slate-200 px-6 py-3 rounded-2xl shadow-sm flex items-center gap-4">
              <div className="w-10 h-10 bg-amber-500 text-white rounded-xl flex items-center justify-center">
                 <Coins size={20} />
              </div>
              <div>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Operational Credits</p>
                 <p className="text-lg font-black text-slate-900 italic tracking-tighter">{currentUser?.organizations?.mission_credits || 0} <span className="text-[9px] not-italic opacity-40 uppercase">Tokens</span></p>
              </div>
           </div>
        </div>
      </div>

      {!activeCategory ? (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* 📊 KPI CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { label: 'Unbilled Revenue', val: formatRupiah(stats.unbilledAmount), sub: 'Ready for invoicing', icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Petty Cash', val: formatRupiah(stats.pettyCashBalance), sub: 'SBU Balance', icon: Wallet, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Waiting Payment', val: formatRupiah(stats.pendingPaymentAmount), sub: 'Submitted to HQ', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Compliance', val: '100%', sub: 'Audit ready', icon: ShieldCheck, color: 'text-indigo-600', bg: 'bg-indigo-50' },
            ].map((card, i) => (
              <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
                <div className={`w-10 h-10 rounded-xl ${card.bg} ${card.color} flex items-center justify-center mb-4`}>
                  <card.icon size={20} />
                </div>
                <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</h4>
                <p className="text-xl font-black text-slate-900 tracking-tight">{card.val}</p>
                <p className="text-[8px] font-bold text-slate-400 uppercase mt-1">{card.sub}</p>
              </div>
            ))}
          </div>

          {/* 🕹️ CONTROL CATEGORIES */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {categories.map((cat) => (
              <button 
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className="bg-white p-8 rounded-[2.5rem] border border-slate-100 flex items-center justify-between group hover:border-slate-300 transition-all text-left shadow-sm hover:shadow-xl"
              >
                <div className="flex items-center gap-6">
                  <div className={`w-16 h-16 rounded-2xl ${cat.bg} ${cat.color} flex items-center justify-center shadow-inner group-hover:rotate-6 transition-transform`}>
                    <cat.icon size={32} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <div className={`w-1.5 h-1.5 rounded-full ${cat.dot} animate-pulse`} />
                      <h3 className="text-lg font-black italic text-slate-900 uppercase tracking-tight">{cat.label}</h3>
                    </div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{cat.desc}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-3xl font-black text-slate-900">{cat.count}</span>
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full">
                     Open <ArrowRight size={12} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
             <div className="flex items-center gap-4">
                <button onClick={() => setActiveCategory(null)} className="w-10 h-10 bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-400 rounded-xl flex items-center justify-center transition-all">
                  <LayoutGrid size={18} />
                </button>
                <div>
                  <h2 className="text-xl font-black italic text-slate-900 uppercase">{categories.find(c => c.id === activeCategory)?.label}</h2>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">Management Matrix / {activeCategory?.toUpperCase()}</p>
                </div>
             </div>
             <div className="flex items-center gap-3">
                <div className="relative hidden md:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                  <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-xl text-[10px] font-black uppercase focus:ring-2 focus:ring-slate-900/5 outline-none w-48" />
                </div>
                <button className="p-3 bg-slate-900 text-white rounded-xl shadow-lg"><Download size={18} /></button>
             </div>
          </div>

          {activeCategory === 'petty_cash' ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
               <div className="lg:col-span-4 space-y-6">
                  <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm">
                     <h3 className="text-sm font-black uppercase italic mb-6 flex items-center gap-2"><PlusCircle size={16} className="text-emerald-500" /> New Entry</h3>
                     <div className="space-y-4">
                        <input type="text" className="w-full p-4 bg-slate-50 border-none rounded-xl text-xs font-bold outline-none" placeholder="Description..." />
                        <input type="number" className="w-full p-4 bg-slate-50 border-none rounded-xl text-lg font-black outline-none" placeholder="Amount..." />
                        <div className="flex gap-3 pt-2">
                           <button className="flex-1 py-3.5 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all">Income</button>
                           <button className="flex-1 py-3.5 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-700 transition-all">Expense</button>
                        </div>
                     </div>
                  </div>
               </div>
               <div className="lg:col-span-8">
                  <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl min-h-[400px]">
                     <div className="flex justify-between items-center mb-8 text-white/40">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] italic">Disbursement Ledger</span>
                        <History size={16} />
                     </div>
                     <div className="space-y-3">
                        {pettyCash.length === 0 ? (
                           <p className="text-center py-20 text-[10px] font-black text-white/20 uppercase tracking-widest italic">No records found</p>
                        ) : pettyCash.map((t, idx) => (
                           <div key={idx} className="bg-white/5 border border-white/5 p-5 rounded-2xl flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                 <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${t.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                    {t.type === 'income' ? <PlusCircle size={20} /> : <Receipt size={20} />}
                                 </div>
                                 <div>
                                    <p className="text-sm font-black text-white/80 italic uppercase">{t.description}</p>
                                    <p className="text-[8px] font-bold text-white/20 uppercase mt-0.5">{new Date(t.created_at).toLocaleDateString()}</p>
                                 </div>
                              </div>
                              <p className={`text-lg font-black italic ${t.type === 'income' ? 'text-emerald-400' : 'text-white'}`}>
                                 {t.type === 'income' ? '+' : '-'}{formatRupiah(t.amount).replace('Rp', '')}
                              </p>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>
            </div>
          ) : (
            <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden">
               <div className="p-4 md:p-8 overflow-x-auto">
                  <table className="w-full text-left border-separate border-spacing-y-3">
                     <thead>
                        <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">
                           <th className="pb-3 px-6">Reference</th>
                           <th className="pb-3">Partner / Mission</th>
                           <th className="pb-3">Value Status</th>
                           <th className="pb-3 text-right px-6">Action</th>
                        </tr>
                     </thead>
                     <tbody>
                        {jobOrders.filter(j => {
                           if (activeCategory === 'unbilled') return j.status === 'delivered' && j.billing_status === 'none';
                           if (activeCategory === 'pending') return j.billing_status === 'invoiced';
                           if (activeCategory === 'disputes') return j.billing_status === 'rejected';
                           return false;
                        }).map((jo, idx) => (
                           <tr key={idx} className="group">
                              <td className="p-6 bg-slate-50/50 rounded-l-2xl border-y border-l border-slate-50">
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white border border-slate-100 rounded-lg flex items-center justify-center">
                                       <Receipt size={18} className="text-slate-400" />
                                    </div>
                                    <p className="text-xs font-black italic text-slate-900">JO-{jo.jo_number?.split('-').pop()}</p>
                                 </div>
                              </td>
                              <td className="p-6 bg-slate-50/50 border-y border-slate-50">
                                 <p className="text-[11px] font-black text-slate-900 uppercase italic truncate max-w-[150px]">{jo.work_order_items?.work_orders?.customers?.company_name || 'GUEST'}</p>
                                 <p className="text-[9px] font-bold text-slate-400 uppercase mt-0.5">{jo.work_order_items?.origin_location?.city} → {jo.work_order_items?.destination_location?.city}</p>
                              </td>
                              <td className="p-6 bg-slate-50/50 border-y border-slate-50">
                                 <p className="text-sm font-black text-emerald-600 italic font-mono">{formatRupiah(jo.work_order_items?.deal_price || 0)}</p>
                                 <span className="text-[8px] font-black text-slate-400 uppercase bg-white px-2 py-0.5 rounded border border-slate-100">{jo.billing_status?.toUpperCase() || 'DELIVERED'}</span>
                              </td>
                              <td className="p-6 bg-slate-50/50 rounded-r-2xl border-y border-r border-slate-50 text-right">
                                 <button className="px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center gap-2 ml-auto italic">
                                    Audit Unit <ArrowUpRight size={14} />
                                 </button>
                              </td>
                           </tr>
                        ))}
                     </tbody>
                  </table>
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
