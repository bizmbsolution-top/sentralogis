"use client";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Search, Package, Filter } from "lucide-react";

interface InventoryItem {
  id: string;
  inventory_code: string;
  sku_code: string;
  product_name: string;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  batch_number: string;
  expiry_date: string;
  status: string;
  location_code: string;
  warehouse_name: string;
}

export default function HQWarehouseInventory() {
  const supabase = createClient()!;
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await supabase
        .from("wh_inventory")
        .select(`
          id, inventory_code, quantity, reserved_quantity,
          available_quantity, batch_number, expiry_date, status,
          product_sku:md_product_skus!product_sku_id (sku_code, name),
          location:md_warehouse_locations!location_id (code, area:md_warehouse_areas!area_id (area_name, area_code), zone:md_warehouse_zones!zone_id (zone_code)),
          warehouse:md_warehouses!warehouse_id (name)
        `)
        .eq("tenant_id", profile.tenant_id)
        .order("created_at", { ascending: false })
        .limit(200);

      setItems((data || []).map((i: any) => ({
        id: i.id,
        inventory_code: i.inventory_code || i.location?.area?.area_code || i.location?.area?.area_name || "-",
        sku_code: i.product_sku?.sku_code || "-",
        product_name: i.product_sku?.name || "-",
        quantity: i.quantity,
        reserved_quantity: i.reserved_quantity,
        available_quantity: i.available_quantity,
        batch_number: i.batch_number || "-",
        expiry_date: i.expiry_date || "-",
        status: i.status,
        location_code: i.location?.code || "-",
        zone_code: i.location?.zone?.zone_code || "-",
        area_name: i.location?.area?.area_name || "-",
        area_code: i.location?.area?.area_code || "-",
        warehouse_name: i.warehouse?.name || "-",
      })));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [profile, supabase]);

  useEffect(() => { if (profile) fetchData(); }, [profile, fetchData]);

  const statusBadge = (s: string) => {
    const map: Record<string, "success" | "warning" | "danger" | "info" | "default"> = {
      AVAILABLE: "success", RESERVED: "warning", QUARANTINE: "danger",
      DAMAGED: "danger", EXPIRED: "danger",
    };
    return <Badge variant={map[s] || "default"}>{s}</Badge>;
  };

  const filtered = items.filter(i => {
    if (statusFilter !== "ALL" && i.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return i.sku_code.toLowerCase().includes(q) ||
             i.product_name.toLowerCase().includes(q) ||
             i.batch_number.toLowerCase().includes(q) ||
             i.inventory_code.toLowerCase().includes(q) ||
             i.area_name.toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Inventory Browser</h1>
        <p className="text-slate-500 text-sm mt-1">Cari dan lihat stok per SKU, lokasi, lot</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Cari SKU, nama produk, batch, lokasi, area..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10"
            />
          </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
        >
          <option value="ALL">All Status</option>
          <option value="AVAILABLE">Available</option>
          <option value="RESERVED">Reserved</option>
          <option value="QUARANTINE">Quarantine</option>
          <option value="DAMAGED">Damaged</option>
          <option value="EXPIRED">Expired</option>
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin" />
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Location Code</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Area</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Zone</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">SKU</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Product</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Qty</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Available</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Batch</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Expiry</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                    {filtered.length === 0 ? (
                      <tr><td colSpan={10} className="text-center py-12 text-slate-400">No inventory items found</td></tr>
                    ) : filtered.map((i) => (
                      <tr key={i.id} className="hover:bg-slate-50/50">
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{i.location_code}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{i.area_code || i.area_name}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{i.zone_code}</td>
                        <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{i.sku_code}</td>
                        <td className="px-4 py-3 text-slate-600">{i.product_name}</td>
                        <td className="px-4 py-3 text-right font-medium">{i.quantity}</td>
                        <td className="px-4 py-3 text-right font-medium text-emerald-600">{i.available_quantity}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-500">{i.batch_number}</td>
                        <td className="px-4 py-3 text-xs">{i.expiry_date}</td>
                        <td className="px-4 py-3">{statusBadge(i.status)}</td>
                      </tr>
                    ))}
                  </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
