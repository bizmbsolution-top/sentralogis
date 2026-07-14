'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { 
  Package, 
  Search, 
  Download, 
  Loader2, 
  FileSpreadsheet, 
  CheckCircle2, 
  Layers, 
  ArrowRight,
  Filter,
  RefreshCw,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';

interface InventoryItem {
  sku_id: string;
  sku_code: string;
  sku_name: string;
  uom: string;
  quantity_on_hand: number;
  quantity_allocated: number;
  quantity_available: number;
  locations: string[];
}

export default function CustomerInventoryPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [exporting, setExporting] = useState(false);

  // For Stock Card Modal
  const [selectedSku, setSelectedSku] = useState<InventoryItem | null>(null);
  const [cardHistory, setCardHistory] = useState<any[]>([]);
  const [cardLoading, setCardLoading] = useState(false);

  const fetchInventory = async () => {
    if (!profile?.customer_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const customerId = profile.customer_id;

      // 1. Fetch SKUs
      const { data: skus } = await supabase
        .from('md_product_skus')
        .select('id, sku_code, name, uom')
        .eq('customer_id', customerId)
        .eq('is_active', true);

      const skuMap: Record<string, InventoryItem> = {};
      (skus || []).forEach((s) => {
        skuMap[s.id] = {
          sku_id: s.id,
          sku_code: s.sku_code,
          sku_name: s.name,
          uom: s.uom || 'PCS',
          quantity_on_hand: 0,
          quantity_allocated: 0,
          quantity_available: 0,
          locations: [],
        };
      });

      // 2. Fetch inventory rows
      const { data: invRows } = await supabase
        .from('wh_inventory')
        .select(`
          product_sku_id,
          quantity,
          reserved_quantity,
          available_quantity,
          wh_locations (name, location_code)
        `)
        .eq('customer_id', customerId);

      (invRows || []).forEach((row) => {
        const sid = row.product_sku_id;
        if (sid && skuMap[sid]) {
          const qOnHand = Number((row as any).quantity || 0);
          const qAlloc = Number((row as any).reserved_quantity || 0);
          const qAvail = Number((row as any).available_quantity || (qOnHand - qAlloc));

          skuMap[sid].quantity_on_hand += qOnHand;
          skuMap[sid].quantity_allocated += qAlloc;
          skuMap[sid].quantity_available += qAvail;

          const locObj: any = row.wh_locations;
          if (locObj) {
            const locStr = locObj.location_code || locObj.name;
            if (locStr && !skuMap[sid].locations.includes(locStr)) {
              skuMap[sid].locations.push(locStr);
            }
          }
        }
      });

      setItems(Object.values(skuMap));
    } catch (err) {
      console.error('Error fetching inventory:', err);
      toast.error('Gagal memuat data stok barang');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [profile?.customer_id]);

  const handleOpenStockCard = async (item: InventoryItem) => {
    setSelectedSku(item);
    setCardLoading(true);
    try {
      // Fetch inbound items matching sku_id
      const { data: inbItems } = await supabase
        .from('wh_inbound_receipt_items')
        .select(`
          expected_qty,
          actual_good_qty,
          created_at,
          wh_inbound_receipts (receipt_number, receipt_date, status)
        `)
        .eq('product_sku_id', item.sku_id);

      // Fetch outbound items matching sku_id
      const { data: outItems } = await supabase
        .from('wh_outbound_shipment_items')
        .select(`
          requested_qty,
          picked_qty,
          created_at,
          wh_outbound_shipments (shipment_number, shipment_date, status)
        `)
        .eq('product_sku_id', item.sku_id);

      const combined: any[] = [];

      (inbItems || []).forEach((i) => {
        const rec: any = i.wh_inbound_receipts;
        combined.push({
          id: `in-${rec?.receipt_number}-${i.created_at}`,
          date: rec?.receipt_date || i.created_at,
          type: 'INBOUND',
          doc_number: rec?.receipt_number || 'INB-DRAFT',
          qty: Number(i.actual_good_qty || i.expected_qty || 0),
          status: rec?.status || 'PENDING',
        });
      });

      (outItems || []).forEach((o) => {
        const shp: any = o.wh_outbound_shipments;
        combined.push({
          id: `out-${shp?.shipment_number}-${o.created_at}`,
          date: shp?.shipment_date || o.created_at,
          type: 'OUTBOUND',
          doc_number: shp?.shipment_number || 'OUT-DRAFT',
          qty: -Number(o.picked_qty || o.requested_qty || 0),
          status: shp?.status || 'PLANNED',
        });
      });

      combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setCardHistory(combined);
    } catch (e) {
      console.error('Error fetching stock card:', e);
      toast.error('Gagal memuat mutasi kartu stok');
    } finally {
      setCardLoading(false);
    }
  };

  const handleExportCSV = () => {
    setExporting(true);
    try {
      const headers = ['SKU Code', 'SKU Name', 'UOM', 'Stock On Hand', 'Reserved Qty', 'Available Qty', 'Locations'];
      const rows = filteredItems.map((i) => [
        `"${i.sku_code}"`,
        `"${i.sku_name.replace(/"/g, '""')}"`,
        `"${i.uom}"`,
        i.quantity_on_hand,
        i.quantity_allocated,
        i.quantity_available,
        `"${i.locations.join('; ')}"`,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `Sentralogis_Inventory_Report_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Laporan stok berhasil diunduh!');
    } catch (err) {
      toast.error('Gagal mengekspor laporan');
    } finally {
      setExporting(false);
    }
  };

  const filteredItems = items.filter(
    (i) =>
      i.sku_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.sku_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 backdrop-blur-2xl border border-white/[0.08] p-6 rounded-3xl shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 text-cyan-400 text-xs font-black uppercase tracking-widest mb-1">
            <Package className="w-4 h-4" /> Live Stock Monitoring
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Inventory & Kartu Stok
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Daftar seluruh barang milik Anda yang terdaftar dan tersimpan di dalam gudang.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchInventory}
            disabled={loading}
            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 active:scale-95 transition-all"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleExportCSV}
            disabled={exporting || items.length === 0}
            className="px-4 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            <Download className="w-4 h-4" />
            <span>Unduh Laporan (CSV)</span>
          </button>
        </div>
      </div>

      {/* Search Bar & Stats */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-900/40 border border-white/5 p-4 rounded-2xl">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari berdasarkan Kode SKU atau Nama Barang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Menampilkan <span className="text-cyan-400 font-black">{filteredItems.length}</span> dari {items.length} SKU
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="py-24 text-center flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
            <p className="text-xs text-slate-400 font-medium">Memuat data inventory Anda...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs">
            Tidak ada produk barang yang sesuai dengan kriteria pencarian Anda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="py-4 px-5">Kode SKU</th>
                  <th className="py-4 px-5">Nama Barang / Deskripsi</th>
                  <th className="py-4 px-5">Satuan (UOM)</th>
                  <th className="py-4 px-5 text-right">Stock On Hand</th>
                  <th className="py-4 px-5 text-right">Reserved Qty</th>
                  <th className="py-4 px-5 text-right">Available Qty</th>
                  <th className="py-4 px-5">Lokasi Simpan</th>
                  <th className="py-4 px-5 text-center">Mutasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filteredItems.map((item) => (
                  <tr key={item.sku_id} className="hover:bg-white/[0.03] transition-colors group">
                    <td className="py-4 px-5 font-black text-cyan-300 font-mono tracking-wider">
                      {item.sku_code}
                    </td>
                    <td className="py-4 px-5 font-bold text-white max-w-xs truncate">
                      {item.sku_name}
                    </td>
                    <td className="py-4 px-5 text-slate-400 font-bold">
                      {item.uom}
                    </td>
                    <td className="py-4 px-5 text-right font-black text-white text-sm">
                      {item.quantity_on_hand.toLocaleString('id-ID')}
                    </td>
                    <td className="py-4 px-5 text-right font-bold text-amber-300">
                      {item.quantity_allocated > 0 ? item.quantity_allocated.toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="py-4 px-5 text-right font-black text-emerald-300 text-sm">
                      {item.quantity_available.toLocaleString('id-ID')}
                    </td>
                    <td className="py-4 px-5">
                      {item.locations.length === 0 ? (
                        <span className="text-slate-500 italic text-[11px]">-</span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {item.locations.map((l, i) => (
                            <span key={i} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300 text-[10px] font-mono font-bold">
                              {l}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-5 text-center">
                      <button
                        onClick={() => handleOpenStockCard(item)}
                        className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 inline-flex items-center gap-1.5"
                      >
                        <Layers className="w-3 h-3" />
                        Kartu Stok
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stock Card Modal */}
      {selectedSku && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-6 bg-slate-950/60 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Mutasi Kartu Stok (Stock Card)</div>
                <h3 className="text-lg font-black text-white">{selectedSku.sku_code} — {selectedSku.sku_name}</h3>
              </div>
              <button
                onClick={() => setSelectedSku(null)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-black uppercase tracking-wider transition-colors"
              >
                Tutup
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Stock On Hand</div>
                  <div className="text-xl font-black text-white mt-1">{selectedSku.quantity_on_hand.toLocaleString('id-ID')} {selectedSku.uom}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Reserved Qty</div>
                  <div className="text-xl font-black text-amber-300 mt-1">{selectedSku.quantity_allocated.toLocaleString('id-ID')} {selectedSku.uom}</div>
                </div>
                <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-center">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Available Qty</div>
                  <div className="text-xl font-black text-emerald-300 mt-1">{selectedSku.quantity_available.toLocaleString('id-ID')} {selectedSku.uom}</div>
                </div>
              </div>

              <h4 className="text-xs font-black text-white uppercase tracking-wider mb-3">Riwayat Masuk & Keluar Barang</h4>

              {cardLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-6 h-6 text-cyan-400 animate-spin mx-auto mb-2" />
                  <span className="text-xs text-slate-400">Memuat mutasi...</span>
                </div>
              ) : cardHistory.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs bg-white/[0.02] rounded-2xl border border-white/5">
                  Belum ada riwayat penerimaan atau pengiriman untuk SKU ini.
                </div>
              ) : (
                <div className="border border-white/10 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <th className="py-3 px-4">Tanggal</th>
                        <th className="py-3 px-4">Tipe Mutasi</th>
                        <th className="py-3 px-4">No. Dokumen</th>
                        <th className="py-3 px-4 text-right">Qty</th>
                        <th className="py-3 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {cardHistory.map((row) => (
                        <tr key={row.id} className="hover:bg-white/[0.03]">
                          <td className="py-3 px-4 font-medium text-slate-300">{row.date || '-'}</td>
                          <td className="py-3 px-4 font-black">
                            {row.type === 'INBOUND' ? (
                              <span className="text-emerald-400">+ MASUK (INBOUND)</span>
                            ) : (
                              <span className="text-rose-400">- KELUAR (OUTBOUND)</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-white">{row.doc_number}</td>
                          <td className="py-3 px-4 text-right font-black text-sm">
                            {row.qty > 0 ? (
                              <span className="text-emerald-400">+{row.qty.toLocaleString('id-ID')}</span>
                            ) : (
                              <span className="text-rose-400">{row.qty.toLocaleString('id-ID')}</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-bold text-slate-400">{row.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
