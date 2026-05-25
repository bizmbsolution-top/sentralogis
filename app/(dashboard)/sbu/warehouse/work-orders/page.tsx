"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast, Toaster } from "react-hot-toast";
import { 
  ClipboardList, Search, RefreshCw, Warehouse,
  CheckCircle2, Clock, PlayCircle, Loader2, Package, ArrowRight
} from "lucide-react";
import { Card } from "@/components/ui/Card";
import dayjs from "dayjs";

type WOItem = {
  id: string;
  item_code: string;
  sbu_type: string;
  item_data: any;
  status: string;
  created_at: string;
  work_orders?: {
    wo_number: string;
    order_date: string;
    execution_date: string;
    customers?: { name: string };
  };
};

export default function WarehouseWorkOrdersPage() {
  const { profile } = useAuth();
  const [items, setItems] = useState<WOItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
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
      let query = supabase
        .from('wo_items')
        .select(`
          id, item_code, sbu_type, item_data, status, created_at,
          work_orders (
            wo_number, order_date, execution_date,
            customers:md_entities ( name )
          )
        `)
        .eq('tenant_id', profile.tenant_id)
        .eq('sbu_type', 'WAREHOUSE')
        .order('created_at', { ascending: false });

      if (whId) {
        // Filter by specific warehouse
        query = query.eq('item_data->>warehouse_id', whId);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      setItems((data as any) || []);

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
    item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.work_orders?.wo_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.work_orders?.customers?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const pendingCount = items.filter(i => i.status === 'need_assignment' || i.status === 'pending').length;
  const inProgressCount = items.filter(i => i.status === 'in_progress').length;
  const completedCount = items.filter(i => i.status === 'completed').length;

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

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <Card className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center">
               <Clock className="w-6 h-6" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Menunggu (Pending)</p>
               <p className="text-2xl font-black italic">{pendingCount}</p>
            </div>
         </Card>
         <Card className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
               <PlayCircle className="w-6 h-6" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Sedang Proses</p>
               <p className="text-2xl font-black italic">{inProgressCount}</p>
            </div>
         </Card>
         <Card className="p-6 bg-white border border-slate-200 rounded-3xl shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
               <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Selesai</p>
               <p className="text-2xl font-black italic">{completedCount}</p>
            </div>
         </Card>
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
         ) : filteredItems.length === 0 ? (
            <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
               <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
                  <ClipboardList className="w-8 h-8 text-slate-300" />
               </div>
               <p className="text-xs font-black uppercase tracking-widest text-slate-400">Belum ada tugas gudang.</p>
            </div>
         ) : (
            <div className="divide-y divide-slate-100">
               {filteredItems.map(item => (
                  <div key={item.id} className="p-6 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                     <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
                           <Package className="w-6 h-6" />
                        </div>
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                              <span className="text-[9px] font-black bg-amber-600 text-white px-2 py-0.5 rounded uppercase tracking-[0.2em]">
                                 {item.item_data?.task_type || 'WMS TASK'}
                              </span>
                              <span className="text-sm font-black text-slate-900 italic">{item.item_code}</span>
                           </div>
                           <p className="text-xs font-bold text-slate-500">
                              WO: {item.work_orders?.wo_number} — {item.work_orders?.customers?.name}
                           </p>
                           <div className="flex items-center gap-4 mt-2">
                              <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                 <Warehouse className="w-3 h-3" /> {item.item_data?.warehouse_name || 'Gudang Belum Dipilih'}
                              </span>
                              <span className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                 <Clock className="w-3 h-3" /> {dayjs(item.work_orders?.execution_date).format('DD MMM YYYY')}
                              </span>
                           </div>
                        </div>
                     </div>
                     <div className="flex items-center gap-4 border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                        <div className="text-right flex-1 md:flex-none">
                           <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Status</p>
                           <p className="text-xs font-black uppercase text-slate-900">{item.status.replace('_', ' ')}</p>
                        </div>
                        <button className="w-10 h-10 bg-slate-100 hover:bg-amber-600 text-slate-400 hover:text-white rounded-xl flex items-center justify-center transition-all">
                           <ArrowRight className="w-4 h-4" />
                        </button>
                     </div>
                  </div>
               ))}
            </div>
         )}
      </Card>
    </div>
  );
}
