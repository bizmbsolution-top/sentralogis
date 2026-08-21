"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/hooks/useAuth";
import { Loader2, ClipboardCheck, Plus, Clock, Search, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import CreateOpnameModal from "./components/CreateOpnameModal";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function StockOpnamePage() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const tenantId = profile?.tenant_id;
  const role = profile?.role;

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const action = searchParams.get("action");
    const createParam = searchParams.get("create");
    if (action === "create" || createParam === "true") {
      setShowModal(true);
    }
  }, [searchParams]);

  const canCreate = role === "sbu_manager_wh" || role === "sbu_admin_wh" || role === "sbu_ops_wh";

  const load = useCallback(async () => {
    let tId = tenantId;
    if (!tId) {
      const { data: tData } = await supabase.from('tenants').select('id').limit(1);
      if (tData?.length) tId = tData[0].id;
    }
    if (!tId) return;
    setLoading(true);

    try {
      let query = (supabase as any)
        .from("wh_stock_opname")
        .select(`
          *,
          warehouse:warehouse_id(name)
        `)
        .eq("tenant_id", tId)
        .order("created_at", { ascending: false });

      if (profile?.warehouse_id) {
        query = query.eq("warehouse_id", profile.warehouse_id);
      }

      const { data, error } = await query;
      if (error && error.code !== "42P01") throw error;
      setItems(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, profile?.warehouse_id]);

  useEffect(() => { load(); }, [load]);

  const filteredItems = items.filter(item => {
    if (activeTab !== "all" && item.status !== activeTab) return false;
    if (searchQuery) {
      return item.opname_number.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'bg-slate-100 text-slate-700';
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700';
      case 'REVIEW': return 'bg-amber-100 text-amber-700';
      case 'APPROVED': return 'bg-emerald-100 text-emerald-700';
      case 'CANCELLED': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'DRAFT': return <Clock size={14} />;
      case 'IN_PROGRESS': return <Loader2 size={14} className="animate-spin" />;
      case 'REVIEW': return <Search size={14} />;
      case 'APPROVED': return <CheckCircle2 size={14} />;
      case 'CANCELLED': return <XCircle size={14} />;
      default: return <Clock size={14} />;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-6">
      <div className="max-w-[1600px] mx-auto mb-10">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm border border-indigo-100">
              <ClipboardCheck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="w-6 h-[2px] bg-indigo-500 rounded-full"></span>
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em]">Warehouse Operations</p>
              </div>
              <h1 className="text-2xl font-black text-indigo-950 italic uppercase tracking-tighter leading-none">Stock Opname</h1>
            </div>
          </div>

          {canCreate && (
            <button
              onClick={() => setShowModal(true)}
              className="h-12 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all flex items-center gap-2 shadow-sm shadow-indigo-200"
            >
              <Plus size={16} /> New Opname
            </button>
          )}
        </div>

        <div className="mt-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-fit">
            {[
              { id: 'all', label: 'All Opnames', count: items.length },
              { id: 'DRAFT', label: 'Draft', count: items.filter(i => i.status === 'DRAFT').length },
              { id: 'IN_PROGRESS', label: 'In Progress', count: items.filter(i => i.status === 'IN_PROGRESS').length },
              { id: 'REVIEW', label: 'Review', count: items.filter(i => i.status === 'REVIEW').length },
              { id: 'APPROVED', label: 'Approved', count: items.filter(i => i.status === 'APPROVED').length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`h-10 px-5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-sm'
                    : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
                }`}
              >
                {tab.label}
                <span className={`px-2 py-0.5 rounded-md text-[8px] ${activeTab === tab.id ? 'bg-indigo-200 text-indigo-900' : 'bg-slate-100 text-slate-500'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Opname #..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-slate-900/10 w-full md:w-[250px]"
            />
          </div>
        </div>
      </div>

      <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {loading && items.length === 0 ? (
          <div className="col-span-full p-12 flex justify-center">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="col-span-full p-32 text-center bg-white rounded-[3.5rem] shadow-sm border border-slate-100">
            <ClipboardCheck size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">No Stock Opnames</h3>
            <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-[10px]">No physical counting records found.</p>
          </div>
        ) : (
          filteredItems.map((opname) => (
            <Link key={opname.id} href={`/sbu/warehouse/stock-opname/${opname.id}`}>
              <div className="group border border-slate-100 shadow-sm hover:shadow-md transition-all rounded-3xl bg-white cursor-pointer h-full flex flex-col">
                <div className="p-6 flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {opname.opname_number}
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${getStatusColor(opname.status)}`}>
                      {getStatusIcon(opname.status)} {opname.status.replace('_', ' ')}
                    </span>
                  </div>

                  <div className="mb-4">
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                      {opname.opname_type.replace('_', ' ')} Count
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      {opname.warehouse?.name}
                    </p>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Scheduled Date</span>
                      <span className="font-bold text-slate-900">
                        {opname.schedule_date ? format(new Date(opname.schedule_date), 'dd MMM yyyy') : '-'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500">Created At</span>
                      <span className="font-bold text-slate-900">
                        {format(new Date(opname.created_at), 'dd MMM yy, HH:mm')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>

      {showModal && (
        <CreateOpnameModal 
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}
