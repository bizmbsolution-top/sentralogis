"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { format } from "date-fns";
import {
  Loader2, Search, PackageSearch, ArrowDownRight, ArrowUpRight, Printer, RotateCcw
} from "lucide-react";
import { toast } from "react-hot-toast";

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
  
  // Case A: Current unit is the larger unit
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
  
  // Case B: Current unit is the smaller unit
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
  
  // Case C: Fallback to conversion_to_base
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

interface Movement {
  id: string;
  movement_type: string;
  quantity: number;
  reference_type: string;
  reference_id: string;
  location: string;
  notes: string;
  created_at: string;
}

interface LocationStock {
  id: string;
  location_code: string;
  quantity: number;
  status: string;
}

export default function StockCardPage() {
  const supabase = createClient()!;
  const { profile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('');

  const [products, setProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<{ 
    id: string; 
    skuCode: string; 
    name: string;
    unit?: string;
    base_uom?: string;
    sku_level?: string;
    conversion_to_base?: number;
    uom_conversions?: any;
  } | null>(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateUntil, setDateUntil] = useState('');

  const [locations, setLocations] = useState<LocationStock[]>([]);
  const [movements, setMovements] = useState<Movement[]>([]);

  useEffect(() => {
    if (!profile) return;
    const init = async () => {
      const tenantId = profile?.tenant_id;
      if (!tenantId) return;
      const { data: whData } = await supabase.from('md_warehouses').select('id, name').eq('tenant_id', tenantId);
      if (whData) {
        setWarehouses(whData);
        const whId = profile?.warehouse_id || whData[0]?.id;
        if (whId) {
          setSelectedWarehouse(whId);
        }
      }
    };
    init();
  }, [profile]);

  useEffect(() => {
    if (!selectedWarehouse || !selectedProduct) return;
    fetchStockCard();
  }, [selectedWarehouse, selectedProduct, dateFrom, dateUntil]);

  async function fetchStockCard() {
    if (!selectedWarehouse || !selectedProduct) return;
    setLoading(true);
    try {
      const tenantId = profile?.tenant_id || '';

      const { data: invSnapshot } = await supabase
        .from('wh_inventory')
        .select('quantity, status, location_id, location:location_id(code)')
        .eq('product_sku_id', selectedProduct.id)
        .eq('tenant_id', tenantId)
        .eq('warehouse_id', selectedWarehouse);

      const locMap: Record<string, LocationStock> = {};
      (invSnapshot || []).forEach((i: any) => {
        const qty = Number(i.quantity || 0);
        if (qty === 0) return;
        const locCode = i.location?.code || (i.location_id ? i.location_id.substring(0, 8) : '-');
        const status = i.status || 'AVAILABLE';
        const key = `${locCode}|${status}`;
        if (!locMap[key]) {
          locMap[key] = { id: key, location_code: locCode, quantity: 0, status };
        }
        locMap[key].quantity += qty;
      });
      setLocations(Object.values(locMap).sort((a, b) => a.location_code.localeCompare(b.location_code)));

      const { data: inboundData } = await supabase
        .from('wh_inbound_receipt_items')
        .select(`
          id, actual_good_qty, created_at, putaway_entries, putaway_location_id,
          wh_inbound_receipts!inner(receipt_number, status, wo_item_id, tenant_id, warehouse_id)`)
        .eq('product_sku_id', selectedProduct.id)
        .eq('wh_inbound_receipts.tenant_id', tenantId)
        .eq('wh_inbound_receipts.warehouse_id', selectedWarehouse)
        .order('created_at', { ascending: false });

      const { data: outboundData } = await supabase
        .from('wh_outbound_shipment_items')
        .select(`
          id, picked_qty, created_at, picking_entries,
          wh_outbound_shipments!inner(shipment_number, status, wo_item_id, tenant_id, warehouse_id)`)
        .eq('product_sku_id', selectedProduct.id)
        .eq('wh_outbound_shipments.tenant_id', tenantId)
        .order('created_at', { ascending: false });

      const { data: transferInData } = await supabase
        .from('wh_outbound_shipment_items')
        .select(`
          picked_qty, product_sku_id, created_at,
          wh_outbound_shipments!inner(transfer_id, status, shipment_number)`)
        .eq('product_sku_id', selectedProduct.id)
        .eq('wh_outbound_shipments.status', 'COMPLETED')
        .not('wh_outbound_shipments.transfer_id', 'is', null)
        .order('created_at', { ascending: false });

      const { data: internalData } = await supabase
        .from('wh_internal_movements')
        .select(`
          id, quantity, movement_date, status, reference_type, reference_id,
          from_location:from_location_id(code), to_location:to_location_id(code)`)
        .eq('product_sku_id', selectedProduct.id)
        .eq('tenant_id', tenantId)
        .eq('status', 'COMPLETED')
        .order('movement_date', { ascending: false });

      const woItemIds = [
        ...(inboundData || []).map((m: any) => m.wh_inbound_receipts?.wo_item_id).filter(Boolean),
        ...(outboundData || []).map((m: any) => m.wh_outbound_shipments?.wo_item_id).filter(Boolean),
        ...(internalData || []).map((m: any) => m.reference_id).filter(Boolean),
      ];

      const joMap: Record<string, string> = {};
      if (woItemIds.length > 0) {
        const { data: joData } = await supabase.from('job_orders').select('jo_number, wo_item_id').in('wo_item_id', woItemIds);
        (joData || []).forEach((jo: any) => { if (jo.wo_item_id) joMap[jo.wo_item_id] = jo.jo_number; });
      }

      const allMovements: Movement[] = [];

      (inboundData || []).forEach((m: any) => {
        const r = m.wh_inbound_receipts;
        if (!r) return;
        const refId = r.wo_item_id && joMap[r.wo_item_id] ? joMap[r.wo_item_id] : (r.receipt_number || '-');
        if (m.putaway_entries && Array.isArray(m.putaway_entries) && m.putaway_entries.length > 0) {
          m.putaway_entries.forEach((e: any, idx: number) => {
            allMovements.push({
              id: `${m.id}-putaway-${idx}`,
              movement_type: (e.status || 'AVAILABLE') === 'AVAILABLE' ? 'INBOUND' : `INBOUND (${e.status})`,
              quantity: Number(e.quantity || e.qty || 0),
              reference_type: 'JO', reference_id: refId,
              location: e.location_code || e.location_id || m.putaway_location_id || '-',
              notes: '', created_at: m.created_at,
            });
          });
        } else {
          allMovements.push({
            id: m.id, movement_type: 'INBOUND',
            quantity: Number(m.actual_good_qty || 0),
            reference_type: 'JO', reference_id: refId,
            location: m.putaway_location_id || '-',
            notes: '', created_at: m.created_at,
          });
        }
      });

      (outboundData || []).forEach((m: any) => {
        const s = m.wh_outbound_shipments;
        if (!s) return;
        const refId = s.wo_item_id && joMap[s.wo_item_id] ? joMap[s.wo_item_id] : (s.shipment_number || '-');
        if (m.picking_entries && Array.isArray(m.picking_entries) && m.picking_entries.length > 0) {
          m.picking_entries.forEach((e: any, idx: number) => {
            allMovements.push({
              id: `${m.id}-picking-${idx}`,
              movement_type: 'OUTBOUND', quantity: Number(e.qty || e.quantity || 0),
              reference_type: 'JO', reference_id: refId,
              location: e.location_code || e.location_id || '-',
              notes: '', created_at: m.created_at,
            });
          });
        } else {
          allMovements.push({
            id: m.id, movement_type: 'OUTBOUND', quantity: Number(m.picked_qty || 0),
            reference_type: 'JO', reference_id: refId,
            location: '-', notes: '', created_at: m.created_at,
          });
        }
      });

      (internalData || []).forEach((m: any) => {
        const refId = m.reference_id && joMap[m.reference_id] ? joMap[m.reference_id] : (m.reference_id || '-');
        allMovements.push({
          id: `${m.id}-out`, movement_type: 'MOVEMENT OUT', quantity: Number(m.quantity),
          reference_type: m.reference_type || 'MANUAL', reference_id: refId,
          location: m.from_location?.code || '-', notes: '', created_at: m.movement_date,
        });
        allMovements.push({
          id: `${m.id}-in`, movement_type: 'MOVEMENT IN', quantity: Number(m.quantity),
          reference_type: m.reference_type || 'MANUAL', reference_id: refId,
          location: m.to_location?.code || '-', notes: '', created_at: m.movement_date,
        });
      });

      (transferInData || []).forEach((m: any) => {
        const s = m.wh_outbound_shipments;
        if (!s) return;
        allMovements.push({
          id: `${m.id}-transfer-in`, movement_type: 'TRANSFER IN', quantity: Number(m.picked_qty || 0),
          reference_type: 'TRANSFER', reference_id: s.transfer_id || s.shipment_number || '-',
          location: '-', notes: '', created_at: m.created_at,
        });
      });

      allMovements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      if (dateFrom || dateUntil) {
        const fromMs = dateFrom ? new Date(dateFrom).getTime() : 0;
        const untilMs = dateUntil ? new Date(dateUntil + 'T23:59:59').getTime() : Infinity;
        const filtered = allMovements.filter(m => {
          const t = new Date(m.created_at).getTime();
          return t >= fromMs && t <= untilMs;
        });
        setMovements(filtered);
      } else {
        setMovements(allMovements);
      }
    } catch (e) {
      console.error(e);
      toast.error('Gagal memuat stock card');
    } finally {
      setLoading(false);
    }
  }

  const currentStockTotal = locations.reduce((sum, l) => sum + l.quantity, 0);
  const ledger = (() => {
    let running = currentStockTotal;
    return movements.map((m) => {
      const isOut = m.movement_type.includes('OUTBOUND') || m.movement_type.includes('MINUS') || m.movement_type.includes('PICKING') || m.movement_type === 'MOVEMENT OUT';
      const balance = running;
      running = isOut ? running + m.quantity : running - m.quantity;
      return { ...m, balance, isOut };
    });
  })();

  async function searchProducts(query: string) {
    setProductSearch(query);
    if (!query || query.length < 2) return;
    const tenantId = profile?.tenant_id || '';
    if (!tenantId) return;
    const { data } = await supabase
      .from('md_product_skus')
      .select('id, sku_code, name, base_uom, uom_conversions, sku_level, conversion_to_base, unit')
      .eq('tenant_id', tenantId)
      .or(`sku_code.ilike.%${query}%,name.ilike.%${query}%`)
      .limit(20);
    setProducts(data || []);
  }

  return (
    <>
      <div className="space-y-6 print:space-y-3 stock-card-page">
        {/* Header & Controls (hidden when printing) */}
        <div className="print:hidden space-y-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-black text-black">Stock Card</h1>
            <div className="flex gap-3">
              <button
                onClick={fetchStockCard}
                className="px-4 py-2.5 bg-white text-slate-700 border border-slate-200 font-bold rounded-xl hover:bg-slate-50 flex items-center gap-2 text-sm"
              >
                <RotateCcw size={16} /> Refresh
              </button>
              <button
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl shadow-md shadow-blue-600/20 hover:bg-blue-700 flex items-center gap-2 text-sm"
              >
                <Printer size={16} /> Cetak / PDF
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 flex flex-wrap gap-4 items-end">
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Warehouse</label>
              <select
                value={selectedWarehouse}
                onChange={e => setSelectedWarehouse(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm font-bold text-slate-700"
              >
                {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </div>
            <div className="flex-1 min-w-[200px] relative">
              <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Product</label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari SKU atau nama produk..."
                  value={productSearch}
                  onChange={e => searchProducts(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 rounded-lg border border-slate-200 text-sm font-medium"
                />
              </div>
              {products.length > 0 && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-auto">
                  {products.map(p => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedProduct({ 
                          id: p.id, 
                          skuCode: p.sku_code, 
                          name: p.name,
                          unit: p.unit,
                          base_uom: p.base_uom,
                          sku_level: p.sku_level,
                          conversion_to_base: p.conversion_to_base,
                          uom_conversions: p.uom_conversions
                        });
                        setProductSearch(`${p.sku_code} — ${p.name}`);
                        setProducts([]);
                      }}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 font-medium"
                    >
                      <span className="font-mono font-bold">{p.sku_code}</span> — {p.name}
                    </button>
                  ))}
                </div>
              )}
              {selectedProduct && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded">{selectedProduct.skuCode}</span>
                  <span className="text-sm font-bold text-slate-700">{selectedProduct.name}</span>
                  <button
                    onClick={() => { setSelectedProduct(null); setProductSearch(''); setMovements([]); setLocations([]); }}
                    className="ml-1 text-slate-400 hover:text-red-500 text-xs"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Dari Tanggal</label>
              <input
                type="date"
                value={dateFrom}
                onChange={e => setDateFrom(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm font-medium"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 mb-1 block uppercase tracking-wider">Sampai Tanggal</label>
              <input
                type="date"
                value={dateUntil}
                onChange={e => setDateUntil(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg bg-white text-sm font-medium"
              />
            </div>
          </div>
        </div>

        {!selectedProduct ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <PackageSearch size={48} className="text-slate-300 mb-4" />
            <h3 className="text-slate-900 font-bold text-lg mb-1">Pilih Produk</h3>
            <p className="text-slate-500 text-sm">Cari dan pilih produk untuk melihat stock card</p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Current Stock by Location */}
            <div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-3">
                Current Stock by Location
                <span className="ml-3 text-base font-black text-slate-900">Total: {formatQtyWithConversion(currentStockTotal, selectedProduct)}</span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {locations.length === 0 ? (
                  <div className="col-span-full bg-white border border-slate-200 rounded-xl p-4 text-slate-500 text-sm font-medium">
                    No active stock locations
                  </div>
                ) : (
                  locations.map(loc => (
                    <div key={loc.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
                      <span className="text-xs font-bold text-slate-500 mb-1">{loc.location_code}</span>
                      <span className={`text-sm font-black ${loc.quantity < 0 ? 'text-rose-600' : 'text-slate-900'} whitespace-nowrap`}>
                        {formatQtyWithConversion(loc.quantity, selectedProduct)}
                      </span>
                      {loc.status !== 'AVAILABLE' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded mt-2 self-start uppercase">{loc.status}</span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Stock Label */}
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">
                Ledger History
                {(dateFrom || dateUntil) && (
                  <span className="ml-2 font-medium normal-case text-slate-500">
                    ({dateFrom || '∞'} — {dateUntil || '∞'})
                  </span>
                )}
              </h3>
              {movements.length > 0 && (
                <span className="text-xs font-bold text-slate-400">{movements.length} transaksi</span>
              )}
            </div>

            {/* Ledger Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              {movements.length === 0 ? (
                <div className="flex flex-col items-center py-16 text-center">
                  <PackageSearch size={32} className="text-slate-300 mb-3" />
                  <p className="text-slate-500 font-medium">Tidak ada transaksi dalam periode ini</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-black">
                        <th className="text-left px-4 py-3 font-black">Date & Time</th>
                        <th className="text-left px-4 py-3 font-black">JO ID</th>
                        <th className="text-left px-4 py-3 font-black">Movement Type</th>
                        <th className="text-left px-4 py-3 font-black">Lokasi</th>
                        <th className="text-right px-4 py-3 font-black text-emerald-700">IN</th>
                        <th className="text-right px-4 py-3 font-black text-rose-700">OUT</th>
                        <th className="text-right px-4 py-3 font-black">Balance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {ledger.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 text-slate-600 font-medium whitespace-nowrap">
                            {format(new Date(row.created_at), 'dd MMM yyyy, HH:mm')}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs font-bold text-black">{row.reference_id}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold ${
                              row.isOut ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {row.isOut ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                              {row.movement_type.replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-700">{row.location}</td>
                          <td className="px-4 py-3 text-right font-black text-emerald-600 whitespace-nowrap">
                            {!row.isOut ? `+${formatQtyWithConversion(row.quantity, selectedProduct)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-rose-600 whitespace-nowrap">
                            {row.isOut ? `-${formatQtyWithConversion(row.quantity, selectedProduct)}` : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-black text-black whitespace-nowrap">{formatQtyWithConversion(row.balance, selectedProduct)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          body * { visibility: hidden !important; }
          .stock-card-page, .stock-card-page * { visibility: visible !important; }
          .stock-card-page { position: absolute; left: 0; top: 0; width: 100%; }
          @page { margin: 10mm; }
        }
      `}} />
    </>
  );
}
