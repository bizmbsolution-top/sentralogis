"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { format } from "date-fns";
import { X, Loader2, PackageSearch, ArrowDownRight, ArrowUpRight, Search } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface Movement {
  id: string;
  movement_type: string;
  quantity: number;
  reference_type: string;
  reference_id: string;
  location: string;
  notes: string;
  created_at: string;
  created_by_name?: string;
}

interface StockCardModalProps {
  productId: string;
  skuCode: string;
  productName: string;
  onClose: () => void;
  tenantId: string;
}

interface LocationStock {
  id: string;
  location_code: string;
  quantity: number;
  status: string;
}

export default function StockCardModal({ productId, skuCode, productName, onClose, tenantId }: StockCardModalProps) {
  const supabase = createClient()!;
  const [loading, setLoading] = useState(true);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [locations, setLocations] = useState<LocationStock[]>([]);

  useEffect(() => {
    fetchHistory();
  }, [productId]);

  async function fetchHistory() {
    try {
      setLoading(true);
      
      // 1. Fetch Inbound History
      const { data: inboundData, error: inboundError } = await supabase
        .from('wh_inbound_receipt_items')
        .select(`
          id, actual_good_qty, created_at, putaway_entries, putaway_location_id,
          wh_inbound_receipts (
            receipt_number, status, wo_item_id
          )
        `)
        .eq('product_sku_id', productId)
        .order('created_at', { ascending: false });

      // 2. Fetch Outbound History
      const { data: outboundData, error: outboundError } = await supabase
        .from('wh_outbound_shipment_items')
        .select(`
          id, picked_qty, damage_qty, created_at, picking_entries,
          wh_outbound_shipments (
            shipment_number, status, wo_item_id
          )
        `)
        .eq('product_sku_id', productId)
        .order('created_at', { ascending: false });

      if (inboundError) console.error("Inbound error:", inboundError);
      if (outboundError) console.error("Outbound error:", outboundError);

      // Fetch JO Numbers
      const woItemIds = [
        ...(inboundData || []).map((m: any) => m.wh_inbound_receipts?.wo_item_id).filter(Boolean),
        ...(outboundData || []).map((m: any) => m.wh_outbound_shipments?.wo_item_id).filter(Boolean)
      ];

      const joMap: Record<string, string> = {};
      if (woItemIds.length > 0) {
        const { data: joData } = await supabase
          .from('job_orders')
          .select('jo_number, wo_item_id')
          .in('wo_item_id', woItemIds);
        (joData || []).forEach((jo: any) => {
          if (jo.wo_item_id) joMap[jo.wo_item_id] = jo.jo_number;
        });
      }

      const allMovements: Movement[] = [];

      (inboundData || []).forEach((m: any) => {
        const receipt = m.wh_inbound_receipts;
        if (!receipt) return;
        
        const refId = receipt.wo_item_id && joMap[receipt.wo_item_id] ? joMap[receipt.wo_item_id] : (receipt.receipt_number || '-');

        if (m.putaway_entries && Array.isArray(m.putaway_entries) && m.putaway_entries.length > 0) {
          m.putaway_entries.forEach((e: any, idx: number) => {
            const loc = e.location_code || e.location_id || m.putaway_location_id || '-';
            const qty = Number(e.quantity || e.qty || 0);
            const status = e.status || 'AVAILABLE';
            
            allMovements.push({
              id: `${m.id}-putaway-${idx}`,
              movement_type: status === 'AVAILABLE' ? 'INBOUND' : `INBOUND (${status})`,
              quantity: qty,
              reference_type: 'JO',
              reference_id: refId,
              location: loc,
              notes: '',
              created_at: m.created_at,
            });
          });
        } else {
          allMovements.push({
            id: m.id,
            movement_type: 'INBOUND',
            quantity: Number(m.actual_good_qty || 0),
            reference_type: 'JO',
            reference_id: refId,
            location: m.putaway_location_id || '-',
            notes: '',
            created_at: m.created_at,
          });
        }
      });

      (outboundData || []).forEach((m: any) => {
        const shipment = m.wh_outbound_shipments;
        if (!shipment) return;
        
        const refId = shipment.wo_item_id && joMap[shipment.wo_item_id] ? joMap[shipment.wo_item_id] : (shipment.shipment_number || '-');

        if (m.picking_entries && Array.isArray(m.picking_entries) && m.picking_entries.length > 0) {
          m.picking_entries.forEach((e: any, idx: number) => {
            const loc = e.location_code || e.location_id || '-';
            const qty = Number(e.qty || e.quantity || 0);
            
            allMovements.push({
              id: `${m.id}-picking-${idx}`,
              movement_type: 'OUTBOUND',
              quantity: qty,
              reference_type: 'JO',
              reference_id: refId,
              location: loc,
              notes: '',
              created_at: m.created_at,
            });
          });
        } else {
          allMovements.push({
            id: m.id,
            movement_type: 'OUTBOUND',
            quantity: Number(m.picked_qty || 0),
            reference_type: 'JO',
            reference_id: refId,
            location: '-',
            notes: '',
            created_at: m.created_at,
          });
        }

        // Handle Damaged Items During Outbound Checking
        const dmg = Number(m.damage_qty || 0);
        if (dmg > 0) {
          allMovements.push({
            id: `${m.id}-damage`,
            movement_type: 'INBOUND (QUARANTINE)',
            quantity: dmg,
            reference_type: 'JO',
            reference_id: refId,
            location: 'Quarantine Zone',
            notes: 'Damaged item returned to quarantine',
            created_at: m.created_at, // Use the same timestamp
          });
        }
      });

      // Sort combined array by created_at descending (newest first)
      allMovements.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      
      setMovements(allMovements);

      // Dynamically calculate current active locations from ledger history
      const locationBalances: Record<string, { location_code: string; status: string; quantity: number }> = {};
      
      // We process from oldest to newest to build the balance
      [...allMovements].reverse().forEach(m => {
        const isOut = m.movement_type.includes('OUTBOUND') || m.movement_type.includes('MINUS');
        const loc = m.location;
        const status = m.movement_type.includes('QUARANTINE') ? 'QUARANTINE' : 'AVAILABLE';
        const key = `${loc}|${status}`;
        
        if (!locationBalances[key]) {
          locationBalances[key] = { location_code: loc, status, quantity: 0 };
        }
        
        if (isOut) {
          locationBalances[key].quantity -= m.quantity;
        } else {
          locationBalances[key].quantity += m.quantity;
        }
      });

      const computedLocations = Object.values(locationBalances)
        .filter(l => l.quantity !== 0) // Show locations with active or negative stock
        .map((l, i) => ({ id: `dyn-${i}`, ...l }));
      
      // Sort locations alphabetically
      computedLocations.sort((a, b) => a.location_code.localeCompare(b.location_code));
      setLocations(computedLocations);

    } catch (e) {
      console.error('Failed to fetch stock card history:', e);
    } finally {
      setLoading(false);
    }
  }

  // Calculate a running balance from the bottom up
  const ledger = [...movements].reverse().reduce((acc, m) => {
    const isOut = m.movement_type.includes('OUTBOUND') || m.movement_type.includes('MINUS') || m.movement_type.includes('PICKING');
    const prevBalance = acc.length > 0 ? acc[acc.length - 1].balance : 0;
    const balance = isOut ? prevBalance - m.quantity : prevBalance + m.quantity;
    
    acc.push({ ...m, balance, isOut });
    return acc;
  }, [] as (Movement & { balance: number; isOut: boolean })[]).reverse(); // Reverse back for latest first

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50">
          <div>
            <h2 className="text-xl font-black text-black">Stock Card History</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-200 text-slate-700 rounded">
                {skuCode}
              </span>
              <span className="text-sm font-medium text-slate-600">{productName}</span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6 bg-slate-50/50 flex flex-col gap-6">
          {/* Current Stock By Location Section */}
          {!loading && (
            <div>
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider mb-3">Current Stock by Location</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 mb-2">
                {locations.length === 0 && (
                  <div className="col-span-full bg-white border border-slate-200 rounded-xl p-4 text-slate-500 text-sm font-medium">
                    No active stock locations
                  </div>
                )}
                {locations.map((loc) => (
                  <div key={loc.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 w-16 h-16 bg-slate-50 rounded-full opacity-50 z-0 transition-transform group-hover:scale-110"></div>
                    <span className="text-xs font-bold text-slate-500 mb-1 relative z-10">{loc.location_code}</span>
                    <div className="flex items-end gap-2 relative z-10">
                      <span className={`text-2xl font-black ${loc.quantity < 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                        {loc.quantity.toLocaleString()}
                      </span>
                    </div>
                    {loc.status !== 'AVAILABLE' && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded mt-2 self-start relative z-10 uppercase">
                        {loc.status}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400 mb-4" />
              <p className="text-slate-500 font-medium">Loading ledger history...</p>
            </div>
          ) : movements.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <PackageSearch size={32} className="text-slate-300" />
              </div>
              <h3 className="text-slate-900 font-bold mb-1">No Transactions Found</h3>
              <p className="text-slate-500 text-sm max-w-sm">
                There is no recorded inbound or outbound history for this product yet.
              </p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
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
                  {ledger.map((row, idx) => (
                    <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-600 font-medium">
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
                      <td className="px-4 py-3 text-right font-black text-emerald-600">
                        {!row.isOut ? `+${row.quantity.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-rose-600">
                        {row.isOut ? `-${row.quantity.toLocaleString()}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right font-black text-black">
                        {row.balance.toLocaleString()}
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
