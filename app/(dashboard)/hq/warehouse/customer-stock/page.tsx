"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Search, Eye, Users, Package, Box } from "lucide-react";

export default function HQWarehouseCustomerStock() {
  const supabase = createClient()!;
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [grouped, setGrouped] = useState<any[]>([]);

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) { setLoading(false); return; }
    setLoading(true);
    try {
      const { data } = await supabase
        .from("wh_inventory")
        .select(`
          id, quantity, status, batch_number,
          product_sku:md_product_skus!product_sku_id (sku_code, name)
        `)
        .eq("tenant_id", profile.tenant_id)
        .in("status", ["AVAILABLE", "RESERVED"])
        .limit(500);

      const map = new Map<string, { sku: string; name: string; qty: number; lots: Set<string> }>();
      (data || []).forEach((i: any) => {
        const key = i.product_sku?.sku_code || "UNKNOWN";
        if (!map.has(key)) map.set(key, { sku: key, name: i.product_sku?.name || "-", qty: 0, lots: new Set() });
        const entry = map.get(key)!;
        entry.qty += i.quantity;
        if (i.batch_number) entry.lots.add(i.batch_number);
      });

      setGrouped(Array.from(map.values()).map(e => ({ ...e, lots: Array.from(e.lots) })));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [profile, supabase]);

  useEffect(() => { if (profile) fetchData(); }, [profile, fetchData]);

  const filtered = grouped.filter(g =>
    g.sku.toLowerCase().includes(search.toLowerCase()) ||
    g.name.toLowerCase().includes(search.toLowerCase())
  );

  const totalQty = grouped.reduce((s, g) => s + g.qty, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Customer Stock Visibility</h1>
        <p className="text-slate-500 text-sm mt-1">Ringkasan stok untuk customer 3PL</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{grouped.length}</p>
              <p className="text-xs text-slate-500">Unique SKUs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Box className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">{totalQty}</p>
              <p className="text-xs text-slate-500">Total Units</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center">
              <Users className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-900">1</p>
              <p className="text-xs text-slate-500">Customers</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Cari SKU atau nama produk..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-900/10"
        />
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
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">SKU</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Product Name</th>
                  <th className="text-right px-4 py-3 font-semibold text-slate-600">Total Qty</th>
                  <th className="text-left px-4 py-3 font-semibold text-slate-600">Active Lots</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <tr><td colSpan={4} className="text-center py-12 text-slate-400">No stock data available</td></tr>
                ) : filtered.map((g) => (
                  <tr key={g.sku} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-mono text-xs font-medium text-slate-700">{g.sku}</td>
                    <td className="px-4 py-3 text-slate-600">{g.name}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">{g.qty}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {g.lots.length === 0 ? <span className="text-xs text-slate-400">No lots</span> :
                          g.lots.map((l: string) => <Badge key={l} variant="default">{l}</Badge>)
                        }
                      </div>
                    </td>
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

