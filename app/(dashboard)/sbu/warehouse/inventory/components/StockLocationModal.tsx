"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { X, Loader2, CalendarDays } from "lucide-react";

interface StockLocationModalProps {
  productId: string;
  skuCode: string;
  productName: string;
  customerName?: string;
  tenantId: string;
  warehouseId?: string;
  onClose: () => void;
}

interface LocRow {
  id: string;
  location_code: string;
  batch_number: string;
  quantity: number;
  status: string;
  received_date: string;
  expiry_date: string;
  age_days: number;
  storage_rule: string;
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

export default function StockLocationModal({ productId, skuCode, productName, customerName, tenantId, warehouseId, onClose }: StockLocationModalProps) {
  const supabase = createClient()!;
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<LocRow[]>([]);

  useEffect(() => {
    fetchData();
  }, [productId]);

  async function fetchData() {
    setLoading(true);
    try {
      const { data: invData } = await supabase
        .from('wh_inventory')
        .select(`
          id, quantity, status, batch_number, received_date, expiry_date, location_id,
          location:location_id(code),
          product_sku:product_sku_id(storage_rule, unit, base_uom, conversion_to_base)
        `)
        .eq('product_sku_id', productId)
        .eq('tenant_id', tenantId)
        .filter('warehouse_id', 'eq', warehouseId || '__NONE__');

      const now = new Date();
      const result: LocRow[] = (invData || [])
        .filter((i: any) => Number(i.quantity) !== 0)
        .map((i: any) => ({
          id: i.id,
          location_code: i.location?.code || (i.location_id ? i.location_id.substring(0, 8) : '-'),
          batch_number: i.batch_number || '-',
          quantity: Number(i.quantity || 0),
          status: i.status || 'AVAILABLE',
          received_date: i.received_date || '',
          expiry_date: i.expiry_date || '',
          age_days: i.received_date ? Math.floor((now.getTime() - new Date(i.received_date).getTime()) / (1000 * 60 * 60 * 24)) : 0,
          storage_rule: i.product_sku?.storage_rule || '-',
          product_sku: i.product_sku,
        }));

      result.sort((a, b) => a.location_code.localeCompare(b.location_code) || a.batch_number.localeCompare(b.batch_number));
      setRows(result);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-xl font-black text-black">Current Stock Locations</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded">{skuCode}</span>
              <span className="text-sm font-medium text-slate-600">{productName}</span>
              {customerName && (
                <span className="text-xs font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-100">
                  👤 {customerName}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"><X size={20} /></button>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-slate-50/50">
          {loading ? (
            <div className="flex items-center justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 text-slate-400 font-medium">No stock locations found</div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-black">
                    <th className="text-left px-4 py-3 font-black">Lokasi</th>
                    <th className="text-left px-4 py-3 font-black">Batch</th>
                    <th className="text-center px-4 py-3 font-black">Rule</th>
                    <th className="text-center px-4 py-3 font-black">Qty</th>
                    <th className="text-center px-4 py-3 font-black">Aging</th>
                    <th className="text-center px-4 py-3 font-black">Expired</th>
                    <th className="text-center px-4 py-3 font-black">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map(r => {
                    const expired = r.expiry_date && new Date(r.expiry_date) < new Date();
                    const expiringSoon = r.expiry_date && !expired && new Date(r.expiry_date).getTime() - Date.now() < 30 * 24 * 60 * 60 * 1000;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs font-bold text-slate-700">{r.location_code}</td>
                        <td className="px-4 py-3 font-mono text-xs text-slate-600">{r.batch_number}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                            r.storage_rule === 'FEFO' ? 'bg-blue-100 text-blue-700' :
                            r.storage_rule === 'FIFO' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>{r.storage_rule}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-black whitespace-nowrap">{formatQtyWithConversion(r.quantity, r.product_sku)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-xs font-bold ${
                            r.age_days > 90 ? 'text-rose-600' :
                            r.age_days > 30 ? 'text-amber-600' :
                            'text-slate-600'
                          }`}>
                            <CalendarDays size={12} />
                            {r.age_days} hr
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {r.expiry_date ? (
                            <span className={`text-xs font-bold ${expired ? 'text-rose-600' : expiringSoon ? 'text-amber-600' : 'text-slate-600'}`}>
                              {new Date(r.expiry_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </span>
                          ) : '-'}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                            r.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' :
                            r.status === 'RESERVED' ? 'bg-blue-100 text-blue-700' :
                            r.status === 'QUARANTINE' ? 'bg-amber-100 text-amber-700' :
                            'bg-rose-100 text-rose-700'
                          }`}>{r.status}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-3 text-xs text-slate-400">
            Total {(() => {
              const total = rows.reduce((s, r) => s + r.quantity, 0);
              return formatQtyWithConversion(total, rows[0]?.product_sku);
            })()} di {rows.length} baris
          </div>
        </div>
      </div>
    </div>
  );
}
