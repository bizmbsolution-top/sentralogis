"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast, Toaster } from "react-hot-toast";
import { 
  ClipboardList, Search, RefreshCw, Warehouse,
  CheckCircle2, Clock, PlayCircle, Loader2, Package, ArrowRight, Truck, Calendar
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import dayjs from "dayjs";
import Link from "next/link";

type WOItem = {
  id: string;
  item_code: string;
  status: string;
  created_at: string;
  sbu_type: string;
  item_data: any;
  wo: {
    id: string;
    wo_number: string;
    order_date: string;
    execution_date: string;
    customer?: { name: string; legal_name: string };
  };
  job_orders: any[];
};

export default function WarehouseWorkOrdersPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<WOItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [assignedWarehouseId, setAssignedWarehouseId] = useState<string | null>(null);

  const fetchItems = useCallback(async () => {
    if (!profile?.tenant_id || !profile?.id) return;
    try {
      setLoading(true);

      // 1. Get Assigned Warehouse
      const { data: orgUser } = await supabase
        .from('wo_organization_users')
        .select('assigned_warehouse_id')
        .eq('user_id', profile.id)
        .maybeSingle();

      const whId = orgUser?.assigned_warehouse_id || null;
      setAssignedWarehouseId(whId);

      // 2. Fetch WO Items
      const { data, error } = await supabase
        .from('wo_items')
        .select(`
          id, item_code, status, created_at, sbu_type, item_data,
          wo:work_orders!wo_id (
            id, wo_number, order_date, execution_date,
            customer:md_entities!customer_id ( name, legal_name )
          )
        `)
        .eq('tenant_id', profile.tenant_id)
        .eq('sbu_type', 'WAREHOUSE')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      let rawItems = (data as any) || [];
      
      // Filter by assigned warehouse ID if applicable
      if (whId) {
        rawItems = rawItems.filter((item: any) => item.item_data?.warehouse_id === whId);
      }

      // 3. Fetch Job Orders
      const itemIds = rawItems.map((i: any) => i.id);
      if (itemIds.length > 0) {
        const { data: joData } = await supabase
          .from('job_orders')
          .select('*')
          .in('wo_item_id', itemIds);
        
        rawItems = rawItems.map((item: any) => ({
          ...item,
          job_orders: (joData || []).filter((jo: any) => jo.wo_item_id === item.id)
        }));
      }

      setItems(rawItems);

    } catch (err: any) {
      toast.error('Gagal memuat tugas gudang.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id, profile?.id]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const filteredItems = items.filter(item => 
    item.item_code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.wo?.wo_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.wo?.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = items.filter(i => ['need_assignment', 'pending', 'menunggu_wh_eksekusi'].includes(i.status?.toLowerCase() || '')).length;
  const inProgressCount = items.filter(i => ['in_progress', 'truck_arrived', 'unloading', 'checking', 'putaway_in_progress'].includes(i.status?.toLowerCase() || '')).length;
  const completedCount = items.filter(i => ['completed', 'done', 'selesai'].includes(i.status?.toLowerCase() || '')).length;
  const docFinancesCount = items.filter(i => i.status?.toLowerCase() === 'doc_finances').length;
  const readyBillingCount = items.filter(i => i.status?.toLowerCase() === 'ready_billing').length;
  const billingCount = items.filter(i => i.status?.toLowerCase() === 'billing').length;

  const displayItems = filteredItems.filter(item => {
     if (statusFilter === 'ALL') return true;
     const s = item.status?.toLowerCase() || '';
     if (statusFilter === 'PENDING') return ['need_assignment', 'pending', 'menunggu_wh_eksekusi'].includes(s);
     if (statusFilter === 'IN_PROGRESS') return ['in_progress', 'truck_arrived', 'unloading', 'checking', 'putaway_in_progress'].includes(s);
     if (statusFilter === 'COMPLETED') return ['completed', 'done', 'selesai'].includes(s);
     if (statusFilter === 'DOC_FINANCES') return s === 'doc_finances';
     if (statusFilter === 'READY_BILLING') return s === 'ready_billing';
     if (statusFilter === 'BILLING') return s === 'billing';
     return true;
  });

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-600 rounded-xl flex items-center justify-center shadow-sm text-white">
               <ClipboardList className="w-6 h-6" />
            </div>
            <div>
               <h1 className="text-3xl font-black text-slate-900 italic tracking-tighter uppercase">WMS Tasks</h1>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Daftar Pekerjaan Gudang</p>
            </div>
         </div>
      </div>

      {/* Summary Cards as Filters */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
         <button onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')} className={`p-4 bg-white border ${statusFilter === 'PENDING' ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md' : 'border-slate-200'} rounded-3xl shadow-sm flex flex-col gap-2 text-left transition-all hover:border-amber-300`}>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
               <Clock className="w-5 h-5" />
            </div>
            <div>
               <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 line-clamp-1">Menunggu</p>
               <p className="text-xl font-black italic">{pendingCount}</p>
            </div>
         </button>
         <button onClick={() => setStatusFilter(statusFilter === 'IN_PROGRESS' ? 'ALL' : 'IN_PROGRESS')} className={`p-4 bg-white border ${statusFilter === 'IN_PROGRESS' ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-md' : 'border-slate-200'} rounded-3xl shadow-sm flex flex-col gap-2 text-left transition-all hover:border-blue-300`}>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
               <PlayCircle className="w-5 h-5" />
            </div>
            <div>
               <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 line-clamp-1">Sedang Proses</p>
               <p className="text-xl font-black italic">{inProgressCount}</p>
            </div>
         </button>
         <button onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')} className={`p-4 bg-white border ${statusFilter === 'COMPLETED' ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md' : 'border-slate-200'} rounded-3xl shadow-sm flex flex-col gap-2 text-left transition-all hover:border-emerald-300`}>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
               <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
               <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 line-clamp-1">Selesai</p>
               <p className="text-xl font-black italic">{completedCount}</p>
            </div>
         </button>
         <button onClick={() => setStatusFilter(statusFilter === 'DOC_FINANCES' ? 'ALL' : 'DOC_FINANCES')} className={`p-4 bg-white border ${statusFilter === 'DOC_FINANCES' ? 'border-purple-500 ring-2 ring-purple-500/20 shadow-md' : 'border-slate-200'} rounded-3xl shadow-sm flex flex-col gap-2 text-left transition-all hover:border-purple-300`}>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
               <ClipboardList className="w-5 h-5" />
            </div>
            <div>
               <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 line-clamp-1">Doc & Finances</p>
               <p className="text-xl font-black italic">{docFinancesCount}</p>
            </div>
         </button>
         <button onClick={() => setStatusFilter(statusFilter === 'READY_BILLING' ? 'ALL' : 'READY_BILLING')} className={`p-4 bg-white border ${statusFilter === 'READY_BILLING' ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-md' : 'border-slate-200'} rounded-3xl shadow-sm flex flex-col gap-2 text-left transition-all hover:border-indigo-300`}>
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
               <Package className="w-5 h-5" />
            </div>
            <div>
               <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 line-clamp-1">Ready Billing</p>
               <p className="text-xl font-black italic">{readyBillingCount}</p>
            </div>
         </button>
         <button onClick={() => setStatusFilter(statusFilter === 'BILLING' ? 'ALL' : 'BILLING')} className={`p-4 bg-white border ${statusFilter === 'BILLING' ? 'border-rose-500 ring-2 ring-rose-500/20 shadow-md' : 'border-slate-200'} rounded-3xl shadow-sm flex flex-col gap-2 text-left transition-all hover:border-rose-300`}>
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
               <Warehouse className="w-5 h-5" />
            </div>
            <div>
               <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 line-clamp-1">Billing</p>
               <p className="text-xl font-black italic">{billingCount}</p>
            </div>
         </button>
      </div>

      {/* Search & List */}
      <Card className="bg-white border border-slate-200 shadow-sm !rounded-[2.5rem] overflow-hidden">
         <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="relative w-full md:w-96">
               <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input 
                 type="text" 
                 placeholder="Cari WO, Kode Item, atau Pelanggan..."
                 className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-amber-500/10 outline-none transition-all"
                 value={searchTerm}
                 onChange={(e) => setSearchTerm(e.target.value)}
               />
            </div>
            <button 
              onClick={fetchItems}
              className="w-full md:w-auto px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl text-xs font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all flex items-center justify-center gap-2"
            >
               <RefreshCw className="w-4 h-4" /> Refresh
            </button>
         </div>

         {loading ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4">
               <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Memuat Data...</p>
            </div>
         ) : displayItems.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                  <ClipboardList className="w-8 h-8 text-slate-300" />
               </div>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Tidak ada tugas ditemukan</p>
            </div>
         ) : (
            <div className="divide-y divide-slate-100">
               {displayItems.map((item) => {
                  const totalUnits = item.item_data?.unit_count || 1;
                  const jos = item.job_orders || [];
                  const isCompleted = jos.length > 0 && jos.length >= totalUnits && jos.every((j: any) => ['completed', 'done', 'selesai'].includes(j.status?.toLowerCase()));
                  
                  let displayStatus = 'Menunggu WH Eksekusi';
                  let badgeColor = 'bg-amber-100 text-amber-700';

                  if (['need_assignment', 'pending'].includes(item.status?.toLowerCase() || '')) {
                     displayStatus = 'Menunggu WH Eksekusi';
                     badgeColor = 'bg-amber-100 text-amber-700';
                  } else if (isCompleted || item.status === 'completed') {
                     displayStatus = 'Selesai';
                     badgeColor = 'bg-emerald-100 text-emerald-700';
                  } else {
                     displayStatus = 'Sedang Proses';
                     badgeColor = 'bg-blue-100 text-blue-700';
                  }

                  return (
                     <div key={item.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                        <div className="flex items-start gap-4">
                           <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
                              <Warehouse className="w-6 h-6" />
                           </div>
                           <div>
                              <div className="flex items-center gap-2 mb-1">
                                 <h3 className="font-bold text-slate-900">{item.wo?.wo_number}</h3>
                                 <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${badgeColor}`}>
                                    {displayStatus}
                                 </span>
                              </div>
                              <p className="text-xs font-semibold text-slate-500 mb-2">Item: {item.item_code} • {item.wo?.customer?.name || "Customer"}</p>
                              <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                                 <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {dayjs(item.wo?.execution_date).format('DD MMM YYYY')}</span>
                                 <span className="flex items-center gap-1"><Truck className="w-3 h-3" /> {totalUnits} Trucks/Units</span>
                              </div>
                           </div>
                        </div>
                        <div className="flex items-center gap-3">
                           <Link href={`/sbu/warehouse/work-orders/${item.wo?.id}?itemId=${item.id}`}>
                              <button className="px-6 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-slate-900/20 transition-all hover:scale-105 flex items-center gap-2">
                                 ASSIGNMENT <ArrowRight className="w-4 h-4" />
                              </button>
                           </Link>
                        </div>
                     </div>
                  );
               })}
            </div>
         )}
      </Card>
    </div>
  );
}
