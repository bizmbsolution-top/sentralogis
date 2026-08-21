"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast } from "react-hot-toast";
import {
  Loader2, Search, Package, ChevronRight, Layers, Users, MapPin, Calendar, Clock
} from "lucide-react";
import StockLocationModal from "../../inventory/components/StockLocationModal";

interface ProductSummary {
  product_sku_id: string;
  sku_code: string;
  product_name: string;
  customer_name: string;
  image_url: string;
  total_qty: number;
  good_qty: number;
  damaged_qty: number;
  quarantine_qty: number;
  location_count: number;
  product_sku?: any;
}

const getUomConversion = (productSku: any) => {
  if (!productSku) return null;
  
  let conversions: any[] = [];
  try {
    if (typeof productSku.uom_conversions === 'string') {
      conversions = JSON.parse(productSku.uom_conversions) || [];
    } else if (Array.isArray(productSku.uom_conversions)) {
      conversions = productSku.uom_conversions;
    }
  } catch (e) {
    console.error('Failed to parse uom_conversions:', e);
  }
  
  const currentUnit = String(productSku.unit || 'PCS').toUpperCase();
  const baseUom = String(productSku.base_uom || 'PCS').toUpperCase();
  
  let conv = conversions.find((c: any) => String(c.from_uom).toUpperCase() === currentUnit);
  if (conv) {
    const multiplier = Number(conv.multiplier);
    if (multiplier > 1) {
      return {
        direction: 'MULTIPLY',
        unit: currentUnit,
        targetUom: String(conv.to_uom).toUpperCase(),
        multiplier
      };
    }
  }
  
  conv = conversions.find((c: any) => 
    String(c.to_uom).toUpperCase() === currentUnit || 
    String(c.to_uom).toUpperCase() === baseUom ||
    (currentUnit === 'PCS' && String(c.to_uom).toUpperCase() === 'PACK')
  );
  if (conv) {
    const multiplier = Number(conv.multiplier);
    if (multiplier > 1) {
      return {
        direction: 'DIVIDE',
        unit: String(conv.from_uom).toUpperCase(),
        targetUom: currentUnit,
        multiplier
      };
    }
  }
  
  const multiplier = Number(productSku.conversion_to_base) || 1;
  if (multiplier > 1 && currentUnit !== baseUom) {
    return {
      direction: 'MULTIPLY',
      unit: currentUnit,
      targetUom: baseUom,
      multiplier
    };
  }
  
  return null;
};

const formatQtyWithConversion = (qty: number, productSku: any) => {
  if (!productSku) return `${qty.toLocaleString()}`;
  
  const conv = getUomConversion(productSku);
  if (conv) {
    if (conv.direction === 'MULTIPLY') {
      const baseQty = qty * conv.multiplier;
      return `${qty.toLocaleString()} ${conv.unit}, ${baseQty.toLocaleString()} ${conv.targetUom}`;
    } else {
      const largerQty = qty / conv.multiplier;
      const formattedLarger = Number(largerQty.toFixed(2)).toLocaleString();
      return `${formattedLarger} ${conv.unit}, ${qty.toLocaleString()} ${conv.targetUom}`;
    }
  }
  
  return `${qty.toLocaleString()} ${productSku.unit || 'PCS'}`;
};

const getPeriodLabel = (dateStr?: string) => {
  if (!dateStr) return 'No Date Recorded';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'No Date Recorded';
    const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return `${months[d.getMonth()]} ${d.getFullYear()}`;
  } catch {
    return 'No Date Recorded';
  }
};

type ViewMode = 'overview' | 'customer' | 'location' | 'fifo';

export default function SBUInventoryPage() {
  const supabase = createClient()!;
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [summaries, setSummaries] = useState<ProductSummary[]>([]);
  const [rawItems, setRawItems] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [fifoSort, setFifoSort] = useState<'FIFO' | 'FEFO'>('FIFO');
  
  const [selectedProduct, setSelectedProduct] = useState<{ id: string; skuCode: string; name: string; customerName?: string } | null>(null);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');

  useEffect(() => {
    if (!profile) return;
    fetchInventory();
  }, [profile, selectedWarehouse]);

  async function fetchInventory() {
    try {
      setLoading(true);
      let tenantId = profile?.tenant_id;
      if (!tenantId && (profile?.role?.startsWith('hq_') || profile?.role === 'owner_sentralogis')) {
        const { data } = await supabase.from('tenants').select('id').limit(1);
        if (data?.length) tenantId = data[0].id;
      }
      if (!tenantId) return;

      const { data: whData } = await supabase.from('md_warehouses').select('id, name').eq('tenant_id', tenantId);
      if (whData) setWarehouses(whData);

      let whId: string = profile?.warehouse_id || '';
      if (!whId) {
        if (selectedWarehouse) {
          whId = selectedWarehouse;
        } else if (whData && whData.length > 0) {
          whId = whData[0].id || '';
          setSelectedWarehouse(whId);
        } else {
          setLoading(false);
          return;
        }
      } else {
        setSelectedWarehouse(whId);
      }

      const { data: invData, error: invError } = await supabase
        .from('wh_inventory')
        .select(`
          id,
          product_sku_id,
          quantity,
          status,
          location_id,
          batch_number,
          received_date,
          expiry_date,
          created_at,
          location:location_id(code),
          product_sku:product_sku_id(id, sku_code, name, image_urls, customer_id, base_uom, uom_conversions, sku_level, conversion_to_base, unit),
          customer_id
        `)
        .eq('tenant_id', tenantId)
        .eq('warehouse_id', whId);

      if (invError) {
        console.error('Inventory fetch error:', invError);
        toast.error('Gagal mengambil data inventory: ' + invError.message);
        setLoading(false);
        return;
      }

      const { data: customersData } = await supabase
        .from('md_entities')
        .select('id, name');
      
      const customerMap = new Map((customersData || []).map(c => [c.id, c.name]));

      const { data: parcelsData } = await supabase
        .from('wh_parcel_inbound')
        .select('*, location:location_id(code), customer:customer_id(name)')
        .eq('tenant_id', tenantId)
        .eq('warehouse_id', whId)
        .in('status', ['RECEIVED', 'PUTAWAY']);

      const { data: boxesData } = await supabase
        .from('wh_master_boxes')
        .select('*, location:location_id(code)')
        .eq('tenant_id', tenantId)
        .eq('warehouse_id', whId)
        .eq('status', 'SEALED');

      const parcelRows = (parcelsData || []).map((p: any) => {
        const custName = p.customer?.name || p.shipper_name || '-';
        const locCode = p.location?.code || (p.location_id ? p.location_id.substring(0, 8) : 'Rak Staging');
        return {
          ...p,
          id: p.id,
          product_sku_id: `PCL_${p.id}`,
          quantity: Number(p.qty || 1),
          status: 'AVAILABLE',
          location_id: p.location_id || 'STAGING',
          batch_number: p.parcel_code,
          received_date: p.created_at ? p.created_at.substring(0, 10) : new Date().toISOString().substring(0, 10),
          customer_name: `${custName} ➔ ${p.consignee_name}`,
          location_code: locCode,
          sku_code: p.parcel_code,
          product_name: `📦 [Parcel Inbound] Ke: ${p.destination_city}`,
          unit: 'BOX',
          product_sku: { id: `PCL_${p.id}`, sku_code: p.parcel_code, name: `📦 [Parcel Inbound] Ke: ${p.destination_city} (${p.consignee_name})`, unit: 'BOX', base_uom: 'BOX' }
        };
      });

      const boxRows = (boxesData || []).map((b: any) => {
        const locCode = b.location?.code || (b.location_id ? b.location_id.substring(0, 8) : 'Rak Master');
        return {
          ...b,
          id: b.id,
          product_sku_id: `MBX_${b.id}`,
          quantity: 1,
          status: 'AVAILABLE',
          location_id: b.location_id || 'STAGING',
          batch_number: b.master_box_code,
          received_date: b.created_at ? b.created_at.substring(0, 10) : new Date().toISOString().substring(0, 10),
          customer_name: `Hub ${b.destination_city} (${b.total_parcels} pcs)`,
          location_code: locCode,
          sku_code: b.master_box_code,
          product_name: `🗃️ [Master Box] ${b.packing_material} ➔ ${b.destination_city}`,
          unit: 'MASTER',
          product_sku: { id: `MBX_${b.id}`, sku_code: b.master_box_code, name: `🗃️ [Master Box] ${b.packing_material} ➔ ${b.destination_city}`, unit: 'MASTER', base_uom: 'MASTER' }
        };
      });
      
      const processedRaw = [
        ...(invData || []).map((item: any) => {
          const custId = item.customer_id || item.product_sku?.customer_id;
          const custName = custId ? customerMap.get(custId) || '-' : '-';
          const locCode = item.location?.code || (item.location_id ? item.location_id.substring(0, 8) : 'Unassigned');
          return {
            ...item,
            customer_name: custName,
            location_code: locCode,
            sku_code: item.product_sku?.sku_code || '-',
            product_name: item.product_sku?.name || '-',
            unit: item.product_sku?.unit || 'PCS',
          };
        }),
        ...parcelRows,
        ...boxRows
      ];
      setRawItems(processedRaw);

      const grouped: Record<string, any> = {};

      processedRaw.forEach((item: any) => {
        const skuId = item.product_sku_id;
        if (!skuId) return;

        if (!grouped[skuId]) {
          const urls = typeof item.product_sku?.image_urls === 'string'
            ? JSON.parse(item.product_sku.image_urls)
            : (item.product_sku?.image_urls || []);
          grouped[skuId] = {
            product_sku_id: skuId,
            sku_code: item.sku_code || '-',
            product_name: item.product_name || '-',
            customer_name: item.customer_name || '-',
            image_url: urls.length > 0 ? urls[0] : '',
            total_qty: 0,
            good_qty: 0,
            damaged_qty: 0,
            quarantine_qty: 0,
            location_count: 0,
            _locSet: new Set<string>(),
            product_sku: item.product_sku,
          };
        }

        const g = grouped[skuId];
        const qty = Number(item.quantity || 0);
        const status = (item.status || '').toUpperCase();

        g.total_qty += qty;
        if (status === 'AVAILABLE' || status === 'RESERVED') {
          g.good_qty += qty;
        } else if (status === 'QUARANTINE') {
          g.quarantine_qty += qty;
        } else if (status === 'DAMAGED' || status === 'EXPIRED') {
          g.damaged_qty += qty;
        }
        if (item.location_id) g._locSet.add(item.location_id);
      });

      const summaries = Object.values(grouped).map((g: any) => ({
        product_sku_id: g.product_sku_id,
        sku_code: g.sku_code,
        product_name: g.product_name,
        customer_name: g.customer_name,
        image_url: g.image_url,
        total_qty: g.total_qty,
        good_qty: g.good_qty,
        damaged_qty: g.damaged_qty,
        quarantine_qty: g.quarantine_qty,
        location_count: g._locSet.size,
        product_sku: g.product_sku,
      }));

      setSummaries(summaries);
    } catch (e) {
      console.error('Failed to fetch inventory:', e);
      toast.error('Gagal mengambil data inventory');
    } finally {
      setLoading(false);
    }
  }

  const filteredSummaries = summaries.filter(s => {
    if (search) {
      const q = search.toLowerCase();
      return s.sku_code.toLowerCase().includes(q) ||
             s.product_name.toLowerCase().includes(q) ||
             s.customer_name.toLowerCase().includes(q);
    }
    return true;
  });

  const filteredRaw = rawItems.filter(item => {
    if (!search) return true;
    const q = search.toLowerCase();
    return item.sku_code.toLowerCase().includes(q) ||
           item.product_name.toLowerCase().includes(q) ||
           item.customer_name.toLowerCase().includes(q) ||
           item.location_code.toLowerCase().includes(q) ||
           (item.batch_number || '').toLowerCase().includes(q);
  });

  // Grouping for Customer Tab
  const customerGroups = Object.entries(
    filteredSummaries.reduce((acc, item) => {
      const c = item.customer_name || 'Unassigned Customer';
      if (!acc[c]) acc[c] = [];
      acc[c].push(item);
      return acc;
    }, {} as Record<string, ProductSummary[]>)
  ).sort((a, b) => a[0].localeCompare(b[0]));

  // Grouping for Location Tab
  const locationGroups = Object.entries(
    filteredRaw.reduce((acc, item) => {
      const loc = item.location_code || 'Unassigned';
      if (!acc[loc]) acc[loc] = [];
      acc[loc].push(item);
      return acc;
    }, {} as Record<string, any[]>)
  ).sort((a, b) => a[0].localeCompare(b[0]));

  // Grouping for FIFO / FEFO Tab
  const fifoGroups = Object.entries(
    filteredRaw.reduce((acc, item) => {
      const dateStr = fifoSort === 'FIFO' 
        ? (item.received_date || item.created_at) 
        : item.expiry_date;
      const period = getPeriodLabel(dateStr);
      if (!acc[period]) acc[period] = [];
      acc[period].push(item);
      return acc;
    }, {} as Record<string, any[]>)
  );

  if (loading) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <Loader2 className="w-8 h-8 animate-spin text-slate-800" />
    </div>
  );

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-col">
          <h1 className="text-2xl font-black text-black">Inventory Report</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Laporan rincian stok gudang dengan multi-dimensi analisis</p>
        </div>
        {!profile?.warehouse_id && warehouses.length > 0 && (
          <select
            value={selectedWarehouse}
            onChange={(e) => setSelectedWarehouse(e.target.value)}
            className="ml-4 px-4 py-2 border border-slate-200 rounded-xl bg-white text-sm font-bold text-slate-700 shadow-sm outline-none focus:ring-2 focus:ring-slate-900/10"
          >
            {warehouses.map(w => (
              <option key={w.id} value={w.id}>{w.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Navigation Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 pb-4">
        <button
          onClick={() => setViewMode('overview')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            viewMode === 'overview' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Layers size={15} /> By Products (Overview)
        </button>
        <button
          onClick={() => setViewMode('customer')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            viewMode === 'customer' ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Users size={15} /> By Customers (Per Pelanggan)
        </button>
        <button
          onClick={() => setViewMode('location')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            viewMode === 'location' ? 'bg-emerald-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <MapPin size={15} /> By Locations (Per Lokasi)
        </button>
        <button
          onClick={() => setViewMode('fifo')}
          className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
            viewMode === 'fifo' ? 'bg-amber-600 text-white shadow-md' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          <Calendar size={15} /> By FIFO / FEFO (Per Bulan & Tahun)
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search SKU, Product Name, Customer, Location or Batch..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/20 font-medium placeholder:font-normal bg-white shadow-2xs"
          />
        </div>

        {viewMode === 'fifo' && (
          <div className="flex items-center gap-2 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 shadow-2xs">
            <Clock size={15} className="text-amber-700" />
            <span className="text-xs font-black uppercase text-amber-900 mr-1">Sort Mode:</span>
            <div className="flex bg-white rounded-lg p-1 border border-amber-200">
              <button
                onClick={() => setFifoSort('FIFO')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  fifoSort === 'FIFO' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                📅 FIFO (Tanggal Masuk)
              </button>
              <button
                onClick={() => setFifoSort('FEFO')}
                className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
                  fifoSort === 'FEFO' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                ⚠️ FEFO (Kadaluarsa)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* VIEW 1: OVERVIEW */}
      {viewMode === 'overview' && (
        <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-5 py-4 font-black text-black w-12">Photo</th>
                <th className="text-left px-5 py-4 font-black text-black">SKU</th>
                <th className="text-left px-5 py-4 font-black text-black">Product Name</th>
                <th className="text-left px-5 py-4 font-black text-black">Customer</th>
                <th className="text-right px-5 py-4 font-black text-emerald-600">Good Stock</th>
                <th className="text-right px-5 py-4 font-black text-amber-600">Quarantine</th>
                <th className="text-right px-5 py-4 font-black text-black">Total Sisa Barang</th>
                <th className="text-center px-5 py-4 font-black text-black">Locations Count</th>
                <th className="text-center px-5 py-4 font-black text-black w-24">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredSummaries.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-16 text-slate-400">
                    <Package size={40} className="mx-auto mb-3 text-slate-300" />
                    <p className="font-medium text-slate-500">No inventory found</p>
                  </td>
                </tr>
              )}
              {filteredSummaries.map((item) => (
                <tr 
                  key={item.product_sku_id} 
                  className="hover:bg-slate-50 transition-colors group cursor-pointer"
                  onClick={() => setSelectedProduct({ id: item.product_sku_id, skuCode: item.sku_code, name: item.product_name, customerName: item.customer_name })}
                >
                  <td className="px-5 py-4">
                    <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-50 border border-slate-200">
                      {item.image_url ? (
                        <img src={item.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-300">
                          <Package size={16} />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-4 font-mono text-xs font-black text-black">{item.sku_code}</td>
                  <td className="px-5 py-4 font-bold text-black">{item.product_name}</td>
                  <td className="px-5 py-4">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md text-[10px] font-black uppercase tracking-widest border border-indigo-100">
                      👤 {item.customer_name}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-black text-emerald-600 text-sm whitespace-nowrap">{formatQtyWithConversion(item.good_qty, item.product_sku)}</td>
                  <td className="px-5 py-4 text-right font-black text-amber-600 text-sm whitespace-nowrap">{formatQtyWithConversion(item.quarantine_qty, item.product_sku)}</td>
                  <td className="px-5 py-4 text-right font-black text-black text-sm whitespace-nowrap">{formatQtyWithConversion(item.total_qty, item.product_sku)}</td>
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
      )}

      {/* VIEW 2: BY CUSTOMERS */}
      {viewMode === 'customer' && (
        <div className="space-y-6">
          {customerGroups.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400 shadow-2xs">
              <Users size={48} className="mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-slate-600">No inventory found for customers</p>
            </div>
          ) : (
            customerGroups.map(([customerName, items]) => (
              <div key={customerName} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="bg-indigo-50/70 border-b border-indigo-100 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-sm">👤</span>
                    <div>
                      <h3 className="font-black text-slate-900 text-base uppercase tracking-wide">{customerName}</h3>
                      <p className="text-xs text-indigo-700 font-bold">{items.length} Distinct SKUs stored</p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200 text-xs text-slate-600 font-black uppercase">
                        <th className="text-left px-6 py-3">SKU</th>
                        <th className="text-left px-6 py-3">Product Name</th>
                        <th className="text-right px-6 py-3 text-emerald-600">Good Stock</th>
                        <th className="text-right px-6 py-3 text-amber-600">Quarantine</th>
                        <th className="text-right px-6 py-3 text-slate-900">Total Stock</th>
                        <th className="text-center px-6 py-3">Locations</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item) => (
                        <tr 
                          key={item.product_sku_id}
                          className="hover:bg-slate-50 transition-colors cursor-pointer"
                          onClick={() => setSelectedProduct({ id: item.product_sku_id, skuCode: item.sku_code, name: item.product_name, customerName: item.customer_name })}
                        >
                          <td className="px-6 py-3.5 font-mono font-black text-xs text-slate-900">{item.sku_code}</td>
                          <td className="px-6 py-3.5 font-bold text-slate-800">{item.product_name}</td>
                          <td className="px-6 py-3.5 text-right font-bold text-emerald-600 whitespace-nowrap">{formatQtyWithConversion(item.good_qty, item.product_sku)}</td>
                          <td className="px-6 py-3.5 text-right font-bold text-amber-600 whitespace-nowrap">{formatQtyWithConversion(item.quarantine_qty, item.product_sku)}</td>
                          <td className="px-6 py-3.5 text-right font-black text-slate-900 whitespace-nowrap">{formatQtyWithConversion(item.total_qty, item.product_sku)}</td>
                          <td className="px-6 py-3.5 text-center">
                            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-bold">{item.location_count}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW 3: BY LOCATIONS */}
      {viewMode === 'location' && (
        <div className="space-y-6">
          {locationGroups.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400 shadow-2xs">
              <MapPin size={48} className="mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-slate-600">No stock locations found</p>
            </div>
          ) : (
            locationGroups.map(([locCode, items]: [string, any]) => (
              <div key={locCode} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                <div className="bg-emerald-50/70 border-b border-emerald-100 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-sm">📍</span>
                    <div>
                      <h3 className="font-black text-slate-900 text-base uppercase tracking-wide">Rack / Location: <span className="font-mono text-emerald-800">{locCode}</span></h3>
                      <p className="text-xs text-emerald-700 font-bold">{(items as any[]).length} Batch items stored in this rack</p>
                    </div>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50/50 border-b border-slate-200 text-xs text-slate-600 font-black uppercase">
                        <th className="text-left px-6 py-3">SKU</th>
                        <th className="text-left px-6 py-3">Product Name</th>
                        <th className="text-left px-6 py-3">Customer</th>
                        <th className="text-left px-6 py-3">Batch Number</th>
                        <th className="text-left px-6 py-3">Received / Expiry</th>
                        <th className="text-right px-6 py-3">Quantity</th>
                        <th className="text-center px-6 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(items as any[]).map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-6 py-3.5 font-mono font-black text-xs text-slate-900">{item.sku_code}</td>
                          <td className="px-6 py-3.5 font-bold text-slate-800">{item.product_name}</td>
                          <td className="px-6 py-3.5 font-semibold text-xs text-indigo-700">{item.customer_name}</td>
                          <td className="px-6 py-3.5 font-mono text-xs text-slate-600">{item.batch_number || '-'}</td>
                          <td className="px-6 py-3.5 text-xs text-slate-600">
                            <div>In: <span className="font-medium">{item.received_date || '-'}</span></div>
                            {item.expiry_date && <div className="text-rose-600 font-semibold">Exp: {item.expiry_date}</div>}
                          </td>
                          <td className="px-6 py-3.5 text-right font-black text-slate-900 whitespace-nowrap">{formatQtyWithConversion(Number(item.quantity || 0), item.product_sku)}</td>
                          <td className="px-6 py-3.5 text-center">
                            <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                              item.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                              item.status === 'QUARANTINE' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                              'bg-rose-50 text-rose-700 border border-rose-200'
                            }`}>
                              {item.status || 'AVAILABLE'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* VIEW 4: BY FIFO / FEFO */}
      {viewMode === 'fifo' && (
        <div className="space-y-6">
          {fifoGroups.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-16 text-center text-slate-400 shadow-2xs">
              <Calendar size={48} className="mx-auto mb-3 text-slate-300" />
              <p className="font-bold text-slate-600">No batch period data found</p>
            </div>
          ) : (
            fifoGroups
              .sort((a, b) => a[0].localeCompare(b[0]))
              .map(([periodLabel, items]: [string, any]) => {
                const sortedItems = [...(items as any[])].sort((a: any, b: any) => {
                  const d1 = fifoSort === 'FIFO' ? (a.received_date || a.created_at || '') : (a.expiry_date || '');
                  const d2 = fifoSort === 'FIFO' ? (b.received_date || b.created_at || '') : (b.expiry_date || '');
                  return d1.localeCompare(d2);
                });

                return (
                  <div key={periodLabel} className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <div className="bg-amber-50/70 border-b border-amber-100 px-6 py-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center font-black text-sm">⏳</span>
                        <div>
                          <h3 className="font-black text-slate-900 text-base uppercase tracking-wide">Periode: <span className="text-amber-900">{periodLabel}</span></h3>
                          <p className="text-xs text-amber-700 font-bold">{(items as any[]).length} Batch items in this timeline ({fifoSort} order)</p>
                        </div>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-slate-50/50 border-b border-slate-200 text-xs text-slate-600 font-black uppercase">
                            <th className="text-left px-6 py-3">SKU</th>
                            <th className="text-left px-6 py-3">Product Name</th>
                            <th className="text-left px-6 py-3">Batch Number</th>
                            <th className="text-left px-6 py-3">{fifoSort === 'FIFO' ? 'Received Date' : 'Expiry Date'}</th>
                            <th className="text-left px-6 py-3">Location</th>
                            <th className="text-right px-6 py-3">Quantity</th>
                            <th className="text-center px-6 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {sortedItems.map((item: any) => (
                            <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-3.5 font-mono font-black text-xs text-slate-900">{item.sku_code}</td>
                              <td className="px-6 py-3.5 font-bold text-slate-800">{item.product_name}</td>
                              <td className="px-6 py-3.5 font-mono text-xs text-slate-600">{item.batch_number || '-'}</td>
                              <td className="px-6 py-3.5 font-bold text-xs text-slate-800">
                                {fifoSort === 'FIFO' ? (item.received_date || '-') : (item.expiry_date || 'No Expiry')}
                              </td>
                              <td className="px-6 py-3.5 font-mono font-bold text-xs text-emerald-700">{item.location_code}</td>
                              <td className="px-6 py-3.5 text-right font-black text-slate-900 whitespace-nowrap">{formatQtyWithConversion(Number(item.quantity || 0), item.product_sku)}</td>
                              <td className="px-6 py-3.5 text-center">
                                <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider ${
                                  item.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                  item.status === 'QUARANTINE' ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                  'bg-rose-50 text-rose-700 border border-rose-200'
                                }`}>
                                  {item.status || 'AVAILABLE'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}

      {selectedProduct && (
        <StockLocationModal 
          productId={selectedProduct.id}
          skuCode={selectedProduct.skuCode}
          productName={selectedProduct.name}
          customerName={selectedProduct.customerName}
          tenantId={profile?.tenant_id || ''}
          warehouseId={selectedWarehouse || profile?.warehouse_id || undefined}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
