"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast } from "react-hot-toast";
import {
  Loader2, Search, Package, CheckCircle2, Filter, ChevronRight, XCircle, AlertTriangle
} from "lucide-react";
import StockCardModal from "./components/StockCardModal";

interface ProductSummary {
  product_sku_id: string;
  sku_code: string;
  product_name: string;
  total_qty: number;
  good_qty: number;
  damaged_qty: number;
  quarantine_qty: number;
  location_count: number;
  _locations: Set<string>;
}

export default function SBUInventoryPage() {
  const supabase = createClient()!;
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<ProductSummary[]>([]);
  const [search, setSearch] = useState("");
  
  // Modal state
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; skuCode: string; name: string } | null>(null);

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

      // 1. Fetch Inbound Ledger
      const { data: inboundData } = await supabase
        .from('wh_inbound_receipt_items')
        .select(`
          actual_good_qty, product_sku_id,
          product_sku:product_sku_id(id, sku_code, name),
          wh_inbound_receipts!inner(tenant_id)
        `)
        .eq('wh_inbound_receipts.tenant_id', tenantId);

      // 2. Fetch Outbound Ledger
      const { data: outboundData } = await supabase
        .from('wh_outbound_shipment_items')
        .select(`
          picked_qty, damage_qty, product_sku_id,
          wh_outbound_shipments!inner(tenant_id)
        `)
        .eq('wh_outbound_shipments.tenant_id', tenantId);

      // 3. Fetch Locations from wh_inventory
      const { data: invData } = await (supabase as any)
        .from('wh_inventory')
        .select('product_sku_id, location_id')
        .eq('tenant_id', tenantId);

      // Group by product
      const grouped: Record<string, ProductSummary> = {};
      
      const initGroup = (skuId: string, skuCode: string, name: string) => {
        if (!grouped[skuId]) {
          grouped[skuId] = {
            product_sku_id: skuId,
            sku_code: skuCode || '-',
            product_name: name || '-',
            total_qty: 0,
            good_qty: 0,
            damaged_qty: 0,
            quarantine_qty: 0,
            location_count: 0,
            _locations: new Set()
          };
        }
      };

      (inboundData || []).forEach((item: any) => {
        const skuId = item.product_sku_id;
        if (!skuId) return;
        initGroup(skuId, item.product_sku?.sku_code, item.product_sku?.name);
        grouped[skuId].total_qty += Number(item.actual_good_qty || 0);
      });

      (outboundData || []).forEach((item: any) => {
        const skuId = item.product_sku_id;
        if (!skuId || !grouped[skuId]) return;
        grouped[skuId].total_qty -= Number(item.picked_qty || 0);
        grouped[skuId].total_qty += Number(item.damage_qty || 0);
      });

      (invData || []).forEach((item: any) => {
        const skuId = item.product_sku_id;
        if (skuId && grouped[skuId] && item.location_id) {
          grouped[skuId]._locations.add(item.location_id);
        }
      });

      const summaries = Object.values(grouped).map(g => ({
        ...g,
        location_count: g._locations.size
      }));

      setSummaries(summaries);
    } catch (e) {
      console.error('Failed to fetch inventory:', e);
      toast.error('Gagal mengambil data inventory');
    } finally {
      setLoading(false);
    }
  }

  const filtered = summaries.filter(s => {
    if (search) {
      const q = search.toLowerCase();
      return s.sku_code.toLowerCase().includes(q) ||
             s.product_name.toLowerCase().includes(q);
    }
    return true;
  });

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-2xl font-black text-black">Inventory Summary</h1>
        <p className="text-slate-500 text-sm mt-1 font-medium">Real-time stock overview by product</p>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU or Product Name..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 font-medium placeholder:font-normal"
          />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-5 py-4 font-black text-black">SKU</th>
              <th className="text-left px-5 py-4 font-black text-black">Product Name</th>
              <th className="text-right px-5 py-4 font-black text-black">Total Sisa Barang (Stock Card)</th>
              <th className="text-center px-5 py-4 font-black text-black">Locations Count</th>
              <th className="text-center px-5 py-4 font-black text-black w-24">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-16 text-slate-400">
                  <Package size={40} className="mx-auto mb-3 text-slate-300" />
                  <p className="font-medium text-slate-500">No inventory found</p>
                </td>
              </tr>
            )}
            {filtered.map((item) => (
              <tr 
                key={item.product_sku_id} 
                className="hover:bg-slate-50 transition-colors group cursor-pointer"
                onClick={() => setSelectedProduct({ id: item.product_sku_id, skuCode: item.sku_code, name: item.product_name })}
              >
                <td className="px-5 py-4 font-mono text-xs font-black text-black">{item.sku_code}</td>
                <td className="px-5 py-4 font-bold text-black">{item.product_name}</td>
                <td className="px-5 py-4 text-right font-black text-black text-base">{item.total_qty.toLocaleString()}</td>
                <td className="px-5 py-4 text-center">
                  <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 bg-slate-100 text-slate-700 rounded-md font-black text-xs">
                    {item.location_count}
                  </span>
                </td>
                <td className="px-5 py-4 text-center">
                  <button className="p-2 text-slate-400 group-hover:text-black group-hover:bg-slate-200 rounded-lg transition-all">
                    <ChevronRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedProduct && (
        <StockCardModal 
          productId={selectedProduct.id}
          skuCode={selectedProduct.skuCode}
          productName={selectedProduct.name}
          tenantId={profile?.tenant_id || ''}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
