"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import {
  Loader2, Search, Package, AlertTriangle,
  CheckCircle2, Filter
} from "lucide-react";
import { Card } from "@/components/ui/Card";

interface InventoryItem {
  id: string;
  sku_code: string;
  product_name: string;
  quantity: number;
  available_quantity: number;
  reserved_quantity: number;
  batch_number: string;
  expiry_date: string;
  location_code: string;
  status: string;
}

const statusColor: Record<string, string> = {
  AVAILABLE: "text-emerald-600 bg-emerald-100",
  RESERVED: "text-blue-600 bg-blue-100",
  QUARANTINE: "text-amber-600 bg-amber-100",
  DAMAGED: "text-red-600 bg-red-100",
  EXPIRED: "text-slate-500 bg-slate-100",
};

export default function SBUInventoryPage() {
  const supabase = createClient()!;
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("ALL");

  useEffect(() => {
    if (!profile) return;
    fetchInventory();
  }, [profile]);

  async function fetchInventory() {
    try {
      setLoading(true);
      let tenantId = profile?.tenant_id;
      if (!tenantId && (profile?.role?.startsWith('hq_') || profile?.role === 'owner_sentralogis')) {
        const { data } = await supabase.from('tenants').select('id').limit(1);
        if (data?.length) tenantId = data[0].id;
      }
      if (!tenantId) return;

      const { data, error } = await (supabase as any)
        .from('wh_inventory')
        .select(`
          id, quantity, available_quantity, reserved_quantity,
          batch_number, expiry_date, status,
          product_sku:product_sku_id(sku_code, name),
          location:location_id(code)
        `)
        .eq('tenant_id', tenantId)
        .order('expiry_date', { ascending: true, nullsLast: true })
        .limit(100);

      if (error) throw error;

      const mapped = (data || []).map((i: any) => ({
        id: i.id,
        sku_code: i.product_sku?.sku_code || '',
        product_name: i.product_sku?.name || '',
        quantity: Number(i.quantity || 0),
        available_quantity: Number(i.available_quantity || 0),
        reserved_quantity: Number(i.reserved_quantity || 0),
        batch_number: i.batch_number || '-',
        expiry_date: i.expiry_date || '-',
        location_code: i.location?.code || '-',
        status: i.status,
      }));

      setItems(mapped);
    } catch (e) {
      console.error('Failed to fetch inventory:', e);
    } finally {
      setLoading(false);
    }
  }

  const filtered = items.filter(i => {
    if (filter !== "ALL" && i.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return i.sku_code.toLowerCase().includes(q) ||
             i.product_name.toLowerCase().includes(q) ||
             i.batch_number.toLowerCase().includes(q) ||
             i.location_code.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inventory</h1>
        <p className="text-slate-500 text-sm mt-1">Stock Overview</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU, product, batch, location..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
          />
        </div>
        <div className="flex gap-2">
          {["ALL", "AVAILABLE", "RESERVED", "QUARANTINE", "DAMAGED"].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === s
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 font-semibold text-slate-700">SKU</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Product</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-700">Qty</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-700">Available</th>
              <th className="text-right px-4 py-3 font-semibold text-slate-700">Reserved</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Batch</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Expiry</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Location</th>
              <th className="text-left px-4 py-3 font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center py-12 text-slate-400">
                  <Package size={32} className="mx-auto mb-2 text-slate-300" />
                  No inventory found
                </td>
              </tr>
            )}
            {filtered.map((item) => (
              <tr key={item.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-700">{item.sku_code}</td>
                <td className="px-4 py-3 text-slate-900 font-medium">{item.product_name}</td>
                <td className="px-4 py-3 text-right font-semibold">{item.quantity.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-emerald-600 font-semibold">{item.available_quantity.toLocaleString()}</td>
                <td className="px-4 py-3 text-right text-blue-600 font-semibold">{item.reserved_quantity.toLocaleString()}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{item.batch_number}</td>
                <td className="px-4 py-3 text-xs">{item.expiry_date}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{item.location_code}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${statusColor[item.status] || "bg-slate-100 text-slate-600"}`}>
                    {item.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
