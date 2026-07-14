"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/lib/hooks/useAuth";
import { Loader2, ScrollText, ArrowRightLeft, Search } from "lucide-react";
import { format } from "date-fns";

interface InventoryMovement {
  id: string;
  movement_type: string;
  quantity: number;
  reference_type: string | null;
  reference_id: string | null;
  notes: string | null;
  created_at: string;
  product: { name: string; sku_code: string } | null;
  from_location: { code: string } | null;
  to_location: { code: string } | null;
  warehouse: { name: string } | null;
  created_by_user: { full_name: string } | null;
}

export default function MovementLogPage() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  
  const [items, setItems] = useState<InventoryMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const load = useCallback(async () => {
    let tId = tenantId;
    if (!tId) {
       const { data: tData } = await supabase.from('tenants').select('id').limit(1);
       if (tData?.length) tId = tData[0].id;
    }
    if (!tId) return;

    setLoading(true);
    try {
      // Build query
      let query = supabase
        .from("wh_inventory_movements")
        .select(`
          id, movement_type, quantity, reference_type, reference_id, notes, created_at,
          wh_inventory!inner(
            warehouse_id,
            product:product_sku_id(name, sku_code),
            warehouse:warehouse_id(name)
          ),
          from_location:from_location_id(code),
          to_location:to_location_id(code),
          created_by_user:created_by(full_name)
        `)
        .eq("tenant_id", tId)
        .order("created_at", { ascending: false })
        .limit(200);

      if (profile?.warehouse_id) {
        query = query.eq("wh_inventory.warehouse_id", profile.warehouse_id);
      }

      if (typeFilter !== "ALL") {
        query = query.eq("movement_type", typeFilter);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Movement Log fetch error:", error);
      } else {
        // Flatten the inner wh_inventory
        const flattened = (data || []).map((row: any) => ({
          ...row,
          product: row.wh_inventory?.product,
          warehouse: row.wh_inventory?.warehouse,
        }));
        
        // Client-side search for product sku or name
        const filtered = flattened.filter((item: any) => {
          if (!searchQuery) return true;
          const q = searchQuery.toLowerCase();
          return (
            item.product?.name?.toLowerCase().includes(q) ||
            item.product?.sku_code?.toLowerCase().includes(q) ||
            item.reference_id?.toLowerCase().includes(q)
          );
        });
        
        setItems(filtered);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [tenantId, profile?.warehouse_id, typeFilter, searchQuery]);

  useEffect(() => { load(); }, [load]);

  const getMovementColor = (type: string) => {
    switch (type) {
      case 'INBOUND': return 'bg-sky-100 text-sky-700';
      case 'OUTBOUND': return 'bg-orange-100 text-orange-700';
      case 'TRANSFER': return 'bg-purple-100 text-purple-700';
      case 'ADJUSTMENT_PLUS': return 'bg-emerald-100 text-emerald-700';
      case 'ADJUSTMENT_MINUS': return 'bg-rose-100 text-rose-700';
      case 'PICKING': return 'bg-amber-100 text-amber-700';
      case 'PUTAWAY': return 'bg-indigo-100 text-indigo-700';
      case 'KITTING_CONSUME': return 'bg-rose-100 text-rose-700';
      case 'KITTING_OUTPUT': return 'bg-emerald-100 text-emerald-700';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-6">
      <div className="max-w-[1600px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-slate-200">
              <ScrollText size={24} className="text-slate-700" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight leading-none mb-1">Movement Log</h1>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Inventory Audit Trail</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search SKU / Ref ID..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white text-sm font-medium outline-none focus:ring-2 focus:ring-slate-900/10 w-[200px]"
              />
            </div>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-slate-900/10"
            >
              <option value="ALL">All Movement Types</option>
              <option value="INBOUND">Inbound</option>
              <option value="OUTBOUND">Outbound</option>
              <option value="TRANSFER">Transfer</option>
              <option value="ADJUSTMENT_PLUS">Adjustment (+)</option>
              <option value="ADJUSTMENT_MINUS">Adjustment (-)</option>
              <option value="PICKING">Picking</option>
              <option value="PUTAWAY">Putaway</option>
              <option value="KITTING_CONSUME">Kitting Consume</option>
              <option value="KITTING_OUTPUT">Kitting Output</option>
            </select>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden min-h-[500px]">
          {loading ? (
            <div className="p-12 flex justify-center">
              <Loader2 className="w-8 h-8 text-slate-400 animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <div className="p-16 flex flex-col items-center text-center">
              <ScrollText size={48} className="text-slate-200 mb-4" />
              <h3 className="text-lg font-black text-slate-900 uppercase">No Movements Found</h3>
              <p className="text-slate-500 text-xs font-medium max-w-sm mt-1">
                No inventory audit logs matching your current filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] uppercase tracking-wider font-bold">
                    <th className="px-6 py-4">Timestamp</th>
                    <th className="px-6 py-4">Movement Type</th>
                    <th className="px-6 py-4">Product / SKU</th>
                    <th className="px-6 py-4">Location (From → To)</th>
                    <th className="px-6 py-4 text-right">Quantity</th>
                    <th className="px-6 py-4">Reference</th>
                    <th className="px-6 py-4">User / Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((row) => (
                    <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 text-slate-600 font-medium text-xs">
                        {format(new Date(row.created_at), "dd MMM yy, HH:mm")}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-2 py-1 rounded text-[9px] font-black uppercase tracking-wider ${getMovementColor(row.movement_type)}`}>
                          {row.movement_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 text-xs">{row.product?.name || "-"}</div>
                        <div className="text-[10px] font-mono text-slate-500">{row.product?.sku_code || "-"}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
                          <span className="w-16 truncate">{row.from_location?.code || "-"}</span>
                          <ArrowRightLeft size={12} className="text-slate-300" />
                          <span className="w-16 truncate">{row.to_location?.code || "-"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right font-black text-slate-900">
                        {row.quantity.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-xs">
                        <div className="font-bold text-slate-700">{row.reference_type?.replace(/_/g, ' ') || "-"}</div>
                        <div className="text-[10px] text-slate-500 font-mono w-24 truncate" title={row.reference_id || ""}>
                          {row.reference_id || ""}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-bold text-slate-700">{row.created_by_user?.full_name || "System"}</div>
                        <div className="text-[10px] text-slate-500 w-32 truncate" title={row.notes || ""}>{row.notes || "-"}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
