"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/hooks/useAuth";
import { Loader2, ArrowLeft, ClipboardCheck, Search, CheckCircle2, AlertTriangle, UserCheck } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { useParams, useRouter } from "next/navigation";

export default function StockOpnameDetail() {
  const { id } = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  
  const [opname, setOpname] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const canApprove = profile?.role === "sbu_manager_wh" || profile?.role === "sbu_admin_wh";
  const canCount = profile?.role === "sbu_manager_wh" || profile?.role === "sbu_ops_wh" || profile?.role === "sbu_admin_wh";

  const load = useCallback(async () => {
    if (!id || !profile?.tenant_id) return;
    setLoading(true);
    try {
      const [headerRes, itemsRes] = await Promise.all([
        supabase
          .from("wh_stock_opname")
          .select("*, warehouse:warehouse_id(name), creator:created_by(full_name), approver:approved_by(full_name)")
          .eq("id", id)
          .single(),
        supabase
          .from("wh_stock_opname_items")
          .select("*, product:product_sku_id(name, sku_code), location:location_id(code), counter:counted_by(full_name)")
          .eq("opname_id", id)
          .order("created_at", { ascending: true })
      ]);

      if (headerRes.error) throw headerRes.error;
      
      setOpname(headerRes.data);
      setItems(itemsRes.data || []);
    } catch (err: any) {
      console.error(err);
      alert("Failed to load stock opname details");
      router.push("/sbu/warehouse/stock-opname");
    } finally {
      setLoading(false);
    }
  }, [id, profile?.tenant_id, router]);

  useEffect(() => { load(); }, [load]);

  const handleUpdateCount = async (itemId: string, val: string) => {
    if (!profile?.id) return;
    
    // Parse the value, allow empty string
    const counted_qty = val === "" ? null : parseFloat(val);
    
    setSaving(itemId);
    try {
      const { error } = await supabase
        .from("wh_stock_opname_items")
        .update({ 
          counted_qty, 
          count_status: counted_qty !== null ? 'COUNTED' : 'PENDING',
          counted_by: counted_qty !== null ? profile.id : null,
          counted_at: counted_qty !== null ? new Date().toISOString() : null
        })
        .eq("id", itemId);

      if (error) throw error;
      
      // Update local state without full reload
      setItems(prev => prev.map(item => {
        if (item.id !== itemId) return item;
        const sysQty = item.system_qty;
        const variance = counted_qty !== null ? counted_qty - sysQty : 0;
        const variance_pct = sysQty > 0 ? (variance / sysQty) * 100 : 0;
        return { 
          ...item, 
          counted_qty, 
          variance, 
          variance_pct,
          count_status: counted_qty !== null ? 'COUNTED' : 'PENDING' 
        };
      }));

      // Update header status if it was DRAFT
      if (opname.status === 'DRAFT') {
        await supabase.from("wh_stock_opname").update({ status: 'IN_PROGRESS', started_at: new Date().toISOString() }).eq("id", id);
        setOpname((prev: any) => ({ ...prev, status: 'IN_PROGRESS' }));
      }

    } catch (err) {
      console.error(err);
      alert("Failed to update count");
    } finally {
      setSaving(null);
    }
  };

  const handleSubmitForReview = async () => {
    const uncounted = items.filter(i => i.count_status === 'PENDING').length;
    if (uncounted > 0) {
      if (!confirm(`There are ${uncounted} uncounted items. Are you sure you want to submit for review? Uncounted items will be treated as zero quantity counted.`)) {
        return;
      }
    }
    
    setSubmitting(true);
    try {
      const { error } = await supabase.from("wh_stock_opname").update({ status: 'REVIEW' }).eq("id", id);
      if (error) throw error;
      setOpname((prev: any) => ({ ...prev, status: 'REVIEW' }));
    } catch (err) {
      alert("Failed to submit for review");
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveAndAdjust = async () => {
    if (!profile?.id) return;
    if (!confirm("This will permanently adjust the inventory and create movement logs for any variances. Continue?")) return;
    
    setSubmitting(true);
    try {
      const { error } = await supabase.rpc("finalize_stock_opname", {
        p_opname_id: id,
        p_user_id: profile.id
      });
      if (error) throw error;
      await load();
    } catch (err: any) {
      alert(err.message || "Failed to finalize opname");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;
  }
  if (!opname) return null;

  const totalItems = items.length;
  const countedItems = items.filter(i => i.count_status !== 'PENDING').length;
  const varianceItems = items.filter(i => i.count_status !== 'PENDING' && i.variance !== 0).length;
  const progressPct = totalItems > 0 ? (countedItems / totalItems) * 100 : 0;
  
  const filteredItems = items.filter(item => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return item.product?.sku_code?.toLowerCase().includes(q) || item.product?.name?.toLowerCase().includes(q) || item.location?.code?.toLowerCase().includes(q);
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-6 pb-24">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8">
          <div>
            <Link href="/sbu/warehouse/stock-opname" className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-indigo-600 mb-4 transition-colors">
              <ArrowLeft size={14} /> Back to Opnames
            </Link>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200">
                <ClipboardCheck size={24} className="text-slate-700" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">
                  {opname.opname_number}
                </h1>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  {opname.warehouse?.name} • {opname.opname_type.replace('_', ' ')}
                </p>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end gap-3">
            <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
              opname.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' :
              opname.status === 'REVIEW' ? 'bg-amber-100 text-amber-700' :
              opname.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
              'bg-slate-200 text-slate-700'
            }`}>
              {opname.status.replace('_', ' ')}
            </span>
            
            {opname.status === 'IN_PROGRESS' && canCount && (
              <button
                onClick={handleSubmitForReview}
                disabled={submitting}
                className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 transition-all"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <UserCheck size={14} />}
                Submit for Review
              </button>
            )}
            
            {opname.status === 'REVIEW' && canApprove && (
              <button
                onClick={handleApproveAndAdjust}
                disabled={submitting}
                className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 transition-all"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Approve & Adjust Inventory
              </button>
            )}
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Progress</p>
            <div className="flex items-end gap-2 mb-2">
              <span className="text-2xl font-black text-slate-900 leading-none">{countedItems}</span>
              <span className="text-sm font-bold text-slate-400 mb-0.5">/ {totalItems}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="bg-indigo-500 h-1.5 rounded-full transition-all" style={{ width: `${progressPct}%` }}></div>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Variance Found</p>
            <div className="flex items-center gap-3">
              <span className={`text-2xl font-black leading-none ${varianceItems > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {varianceItems}
              </span>
              <span className="text-xs font-bold text-slate-400">SKUs</span>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm md:col-span-2">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Opname Details</p>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500">Created By:</span>
                <p className="font-bold text-slate-900 mt-0.5">{opname.creator?.full_name || 'System'}</p>
              </div>
              <div>
                <span className="text-slate-500">Scheduled:</span>
                <p className="font-bold text-slate-900 mt-0.5">{opname.schedule_date ? format(new Date(opname.schedule_date), 'dd MMM yyyy') : '-'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Count List</h2>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search SKU..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-1.5 border border-slate-200 rounded-lg bg-white text-xs font-medium outline-none focus:ring-2 focus:ring-indigo-500/20 w-[200px]"
              />
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-500 text-[10px] uppercase tracking-wider font-bold">
                  <th className="px-6 py-4">Product / SKU</th>
                  <th className="px-6 py-4">Location</th>
                  <th className="px-6 py-4 text-center">System Qty</th>
                  <th className="px-6 py-4 text-center">Counted Qty</th>
                  <th className="px-6 py-4 text-center">Variance</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const hasVariance = item.variance !== 0 && item.count_status !== 'PENDING';
                  const isEditable = (opname.status === 'DRAFT' || opname.status === 'IN_PROGRESS') && canCount;
                  
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50/50 transition-colors ${hasVariance ? 'bg-rose-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-xs">{item.product?.name || "-"}</div>
                        <div className="text-[10px] font-mono text-slate-500 flex gap-2">
                          {item.product?.sku_code || "-"}
                          {item.batch_number && <span className="text-indigo-500">[{item.batch_number}]</span>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-[10px] font-bold">
                          {item.location?.code || "-"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="font-black text-slate-600">{Number(item.system_qty).toLocaleString()}</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex justify-center relative">
                          <input
                            type="number"
                            disabled={!isEditable}
                            value={item.counted_qty ?? ""}
                            onChange={(e) => handleUpdateCount(item.id, e.target.value)}
                            className={`w-24 px-3 py-1.5 text-center text-xs font-black rounded-lg border focus:ring-2 outline-none transition-all ${
                              item.count_status === 'PENDING' ? 'border-amber-300 bg-amber-50 text-amber-900 focus:border-amber-500 focus:ring-amber-500/20' :
                              hasVariance ? 'border-rose-300 bg-rose-50 text-rose-900 focus:border-rose-500 focus:ring-rose-500/20' :
                              'border-emerald-200 bg-emerald-50 text-emerald-900 focus:border-emerald-500 focus:ring-emerald-500/20'
                            }`}
                            placeholder="---"
                          />
                          {saving === item.id && (
                            <div className="absolute -right-6 top-1/2 -translate-y-1/2">
                              <Loader2 size={14} className="animate-spin text-slate-400" />
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        {item.count_status === 'PENDING' ? (
                          <span className="text-slate-300 font-black">-</span>
                        ) : (
                          <span className={`text-xs font-black flex items-center justify-center gap-1 ${
                            item.variance > 0 ? 'text-emerald-600' :
                            item.variance < 0 ? 'text-rose-600' :
                            'text-slate-400'
                          }`}>
                            {item.variance > 0 ? '+' : ''}{Number(item.variance).toLocaleString()}
                            {hasVariance && <AlertTriangle size={12} className={item.variance < 0 ? 'text-rose-500' : 'text-emerald-500'} />}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          item.count_status === 'COUNTED' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          {item.count_status === 'COUNTED' && <CheckCircle2 size={10} />}
                          {item.count_status}
                        </span>
                        {item.counter?.full_name && (
                          <div className="text-[9px] text-slate-400 mt-1">{item.counter.full_name.split(' ')[0]}</div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
