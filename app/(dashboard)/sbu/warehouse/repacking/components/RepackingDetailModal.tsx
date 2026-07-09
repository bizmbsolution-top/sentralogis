"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Loader2, X, Package, Box, MapPin, Calendar, Clock, User, Layers } from "lucide-react";
import { format } from "date-fns";

interface RepackingDetailModalProps {
  order: any;
  onClose: () => void;
}

export default function RepackingDetailModal({ order, onClose }: RepackingDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, [order.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("wh_repacking_items")
        .select(`
          id, item_type, quantity, batch_number, expiry_date,
          product:md_product_skus(id, sku_code, name, uom:unit),
          source_loc:md_warehouse_locations!wh_repacking_items_source_location_id_fkey(code),
          target_loc:md_warehouse_locations!wh_repacking_items_target_location_id_fkey(code)
        `)
        .eq("repacking_order_id", order.id)
        .order("item_type", { ascending: false }); // SOURCE first, then RESULT

      if (!error && data) {
        setItems(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const sources = items.filter(i => i.item_type === "SOURCE");
  const results = items.filter(i => i.item_type === "RESULT");

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/20 backdrop-blur-sm">
      <div className="w-full max-w-xl bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-2">
              <Layers className="text-indigo-500" /> Detail Order
            </h2>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">
              {order.order_number}
            </p>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-500 flex items-center justify-center transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Clock size={12}/> Status</p>
              <p className="text-sm font-black text-slate-900">{order.status}</p>
            </div>
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 flex items-center gap-1"><Calendar size={12}/> Dibuat</p>
              <p className="text-sm font-black text-slate-900">{format(new Date(order.created_at), "dd MMM yyyy")}</p>
            </div>
          </div>

          {order.notes && (
            <div className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1"><User size={12}/> Catatan / Histori Staff</p>
              <p className="text-xs font-medium text-slate-700 whitespace-pre-line leading-relaxed">{order.notes}</p>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center p-10"><Loader2 className="animate-spin text-indigo-500" /></div>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-3">
                  <Package size={14} className="text-rose-500" /> Material Sumber (Source)
                </h3>
                <div className="space-y-2">
                  {sources.map(item => (
                    <div key={item.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-sm font-black text-slate-900">{item.product?.name || item.product?.sku_code}</p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded">Qty: {item.quantity} {item.product?.uom}</span>
                        <span className="flex items-center gap-1 text-slate-400"><MapPin size={10}/> Rak: {item.source_loc?.code || "-"}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2 mb-3">
                  <Box size={14} className="text-emerald-500" /> Hasil Akhir (Result)
                </h3>
                <div className="space-y-2">
                  {results.map(item => (
                    <div key={item.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm">
                      <p className="text-sm font-black text-slate-900">{item.product?.name || item.product?.sku_code}</p>
                      <div className="flex flex-wrap gap-2 mt-2 text-[10px] font-bold uppercase tracking-widest">
                        <span className="px-2 py-1 bg-emerald-50 text-emerald-600 rounded">Qty: {item.quantity} {item.product?.uom}</span>
                        <span className="flex items-center gap-1 text-slate-500 bg-slate-100 px-2 py-1 rounded"><MapPin size={10}/> Rak Tujuan: {item.target_loc?.code || "-"}</span>
                        {item.batch_number && <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded">Batch: {item.batch_number}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}