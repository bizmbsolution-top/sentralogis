'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  Banknote, Wallet, TrendingUp, Clock, AlertCircle, 
  Search, Loader2, Receipt, 
  ShieldCheck, ArrowUpRight, 
  PlusCircle, Activity, Box, FileText,
  DollarSign, PieChart, Coins
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast, Toaster } from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import Link from 'next/link';

export default function TruckingFinanceCockpit() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('unbilled');
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    try {
      // Simplify query to avoid 500 error from complex joins
      const { data: jos, error: joError } = await supabase
        .from('job_orders')
        .select(`
            id, jo_number, status, base_price, purchase_price, created_at, 
            wo_item_id, advance_amount, advance_status, is_doc_finished, is_cost_finished
        `)
        .eq('tenant_id', profile.tenant_id)
        .order('created_at', { ascending: false });
      
      if (joError) throw joError;

      if (jos && jos.length > 0) {
        // Fetch related WO items and customers separately
        const woItemIds = Array.from(new Set(jos.map(j => j.wo_item_id).filter(Boolean)));
        const { data: items, error: itemError } = await supabase
          .from('wo_items')
          .select('id, wo:work_orders(wo_number, customer:md_entities!customer_id(name))')
          .in('id', woItemIds);
        
        if (itemError) console.error('Item Fetch Error:', itemError);

        const mapped = jos.map(j => ({
          ...j,
          wo_item: items?.find(i => i.id === j.wo_item_id)
        }));
        setJobOrders(mapped);
      } else {
        setJobOrders([]);
      }
    } catch (err: any) {
      console.error('Fetch Error:', err);
      toast.error('Gagal mengambil data keuangan');
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredJobs = useMemo(() => {
    return jobOrders.filter(jo => {
      const matchesSearch = 
        jo.jo_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        jo.wo_item?.wo?.wo_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        jo.wo_item?.wo?.customer?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesCategory = true;
      if (activeCategory === 'unbilled') matchesCategory = jo.status === 'completed' || jo.status === 'ready_for_billing';
      else if (activeCategory === 'audit') matchesCategory = jo.status === 'awaiting_audit' || jo.status === 'need_approval';
      
      return matchesSearch && matchesCategory;
    });
  }, [jobOrders, searchTerm, activeCategory]);

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase().replace(/_/g, ' ') || 'UNKNOWN';
    if (status === 'completed' || status === 'ready_for_billing') return <Badge className="bg-slate-900 text-white border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">{s}</Badge>;
    if (status === 'awaiting_audit' || status === 'need_approval') return <Badge className="bg-amber-100 text-amber-600 border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic animate-pulse">{s}</Badge>;
    return <Badge className="bg-slate-100 text-slate-400 border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">{s}</Badge>;
  };

  const formatRupiah = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  };

  const stats = useMemo(() => ({
    unbilledCount: jobOrders.filter(j => j.status === 'completed' || j.status === 'ready_for_billing').length,
    auditCount: jobOrders.filter(j => j.status === 'awaiting_audit' || j.status === 'need_approval').length,
    totalRevenue: jobOrders.reduce((acc, j) => acc + (j.base_price || 0), 0),
    unbilledAmount: jobOrders.filter(j => j.status === 'completed' || j.status === 'ready_for_billing').reduce((acc, j) => acc + (j.base_price || 0), 0),
    auditAmount: jobOrders.filter(j => j.status === 'awaiting_audit' || j.status === 'need_approval').reduce((acc, j) => acc + (j.base_price || 0), 0),
  }), [jobOrders]);

  if (loading && jobOrders.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-slate-900 animate-spin mb-4" />
        <p className="text-slate-900 font-black tracking-widest text-[10px] uppercase">Syncing Financial Ledger...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-6">
      <Toaster position="top-right" />
      
      {/* Header Section */}
      <div className="max-w-[1600px] mx-auto mb-10">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm rotate-3 hover:rotate-0 transition-transform duration-500 border border-emerald-100">
              <Banknote size={24} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="w-6 h-[2px] bg-emerald-500 rounded-full"></span>
                <p className="text-[9px] font-black text-emerald-500 uppercase tracking-[0.3em]">Revenue & Cost Cockpit</p>
              </div>
              <h1 className="text-2xl font-black text-indigo-950 italic uppercase tracking-tighter leading-none">SBU Finances</h1>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative group w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search JO, WO, or Customer..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-white border border-emerald-100 rounded-2xl text-[11px] font-black focus:border-emerald-500/30 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none shadow-sm text-indigo-900"
              />
            </div>
          </div>
        </div>

        {/* Finance Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
           <Card className="p-6 border border-slate-100 shadow-sm rounded-3xl bg-white group hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4 mb-3">
                 <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center group-hover:bg-emerald-100 transition-all duration-300">
                    <DollarSign size={24} />
                 </div>
                 <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Total Lifecycle Revenue</p>
                    <p className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">{formatRupiah(stats.totalRevenue)}</p>
                 </div>
              </div>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Cumulative base price across all units</p>
           </Card>

           <Card className="p-6 border border-slate-100 shadow-sm rounded-3xl bg-white group hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4 mb-3">
                 <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition-all duration-300">
                    <PieChart size={24} />
                 </div>
                 <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Awaiting Audit</p>
                    <p className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">{formatRupiah(stats.auditAmount)}</p>
                 </div>
              </div>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">{stats.auditCount} missions pending financial verification</p>
           </Card>

           <Card className="p-6 border border-emerald-100 shadow-sm rounded-3xl bg-emerald-50 group hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4 mb-3">
                 <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-xl flex items-center justify-center group-hover:bg-emerald-200 transition-all duration-300">
                    <Coins size={24} />
                 </div>
                 <div>
                    <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest italic">Ready for Billing</p>
                    <p className="text-xl font-black text-emerald-900 italic uppercase tracking-tighter">{formatRupiah(stats.unbilledAmount)}</p>
                 </div>
              </div>
              <p className="text-[8px] font-bold text-emerald-600 uppercase tracking-tight">{stats.unbilledCount} missions completed and awaiting invoice</p>
           </Card>
        </div>

        {/* Filter Tabs */}
        <div className="mt-8 flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-fit">
          {[
            { id: 'unbilled', label: 'Ready for Billing', count: stats.unbilledCount },
            { id: 'audit', label: 'Under Audit', count: stats.auditCount },
            { id: 'all', label: 'All Transactions', count: jobOrders.length }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`h-10 px-5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                activeCategory === tab.id 
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-200 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 rounded-md text-[8px] ${activeCategory === tab.id ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-100 text-slate-500'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredJobs.length === 0 ? (
          <div className="col-span-full p-32 text-center bg-white rounded-[3.5rem] shadow-sm border border-slate-100">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
                <AlertCircle size={48} className="text-slate-200" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">No Financial Records</h3>
            <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-[10px]">Your current ledger filter contains no matching transactions.</p>
          </div>
        ) : (
          filteredJobs.map((jo) => (
            <Card key={jo.id} className="group border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 rounded-3xl bg-white">
               <div className="p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 group-hover:rotate-0 transition-transform duration-700">
                     <Banknote size={120} className="text-slate-900" />
                  </div>

                  <div className="flex items-center justify-between mb-6 relative z-10">
                     <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center shadow-sm rotate-3 group-hover:rotate-0 transition-transform duration-300">
                        <Receipt size={20} />
                     </div>
                     {getStatusBadge(jo.status)}
                  </div>

                  <div className="space-y-3 mb-6 relative z-10">
                     <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[8px] font-black uppercase tracking-widest">
                           {jo.jo_number}
                        </span>
                        <span className="text-[12px] font-black text-emerald-600 italic tracking-tighter">
                           {formatRupiah(jo.base_price || 0)}
                        </span>
                     </div>
                     <h3 className="text-lg font-black text-slate-900 italic uppercase tracking-tighter leading-none group-hover:text-blue-600 transition-colors">
                        {jo.wo_item?.wo?.customer?.name || 'Private Logistics'}
                     </h3>
                     {jo.advance_amount > 0 && (
                        <div className="flex items-center gap-2 mt-2">
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Uang Jalan:</p>
                           <p className="text-[10px] font-black text-slate-900">{new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(jo.advance_amount)}</p>
                           <Badge className={`text-[8px] font-black px-2 py-0.5 rounded-md ${jo.advance_status === 'paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                              {jo.advance_status?.toUpperCase()}
                           </Badge>
                        </div>
                     )}
                  </div>

                  <div className="grid grid-cols-2 gap-4 mb-6 relative z-10">
                     <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:border-blue-500/20 transition-all duration-300">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Billing Path</p>
                        <div className="flex items-center gap-2">
                           <ShieldCheck size={12} className="text-emerald-500" />
                           <p className="text-[10px] font-black text-slate-700 uppercase italic">TRUSTED</p>
                        </div>
                     </div>
                     <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:border-amber-500/20 transition-all duration-300">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Cost Audit</p>
                        <div className="flex items-center gap-2">
                           <Activity size={12} className="text-amber-500" />
                           <p className="text-[10px] font-black text-slate-700 uppercase italic">READY</p>
                        </div>
                     </div>
                  </div>

                  <div className="flex items-center gap-3 relative z-10">
                     <Link href={`/sbu/trucking/completed?jo=${jo.jo_number}`} className="flex-1">
                        <Button className="w-full h-12 bg-indigo-100 hover:bg-indigo-200 text-indigo-900 border border-indigo-200 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm">
                           View Revenue <ArrowUpRight size={14} />
                        </Button>
                     </Link>
                     <Link href={`/sbu/trucking/cost-management?jo_id=${jo.id}`}>
                        <Button className="w-12 h-12 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 border border-emerald-100 rounded-xl flex items-center justify-center transition-all duration-300 shadow-sm active:scale-90">
                           <PlusCircle size={20} />
                        </Button>
                     </Link>
                  </div>
               </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
