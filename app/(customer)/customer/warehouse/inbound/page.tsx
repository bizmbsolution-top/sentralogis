'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { supabase } from '@/lib/supabaseClient';
import { 
  ArrowDownLeft, 
  Search, 
  Loader2, 
  FileText, 
  CheckCircle2, 
  Clock, 
  ExternalLink,
  Eye,
  RefreshCw,
  Printer
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CustomerInboundPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [inbounds, setInbounds] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  // Detail Modal
  const [selectedReceipt, setSelectedReceipt] = useState<any | null>(null);
  const [receiptItems, setReceiptItems] = useState<any[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);

  const fetchInbounds = async () => {
    if (!profile?.customer_id) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data } = await supabase
        .from('wh_inbound_receipts')
        .select(`
          id,
          receipt_number,
          receipt_date,
          status,
          supplier_name,
          notes,
          created_at,
          completed_at
        `)
        .eq('customer_id', profile.customer_id)
        .order('created_at', { ascending: false });

      setInbounds((data as any[]) || []);
    } catch (err) {
      console.error('Error fetching inbounds:', err);
      toast.error('Gagal memuat data barang masuk');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInbounds();
  }, [profile?.customer_id]);

  const handleOpenDetail = async (receipt: any) => {
    setSelectedReceipt(receipt);
    setItemsLoading(true);
    try {
      const { data } = await supabase
        .from('wh_inbound_receipt_items')
        .select(`
          id,
          expected_qty,
          actual_good_qty,
          md_product_skus (sku_code, name, uom)
        `)
        .eq('receipt_id', receipt.id);

      setReceiptItems((data as any[]) || []);
    } catch (e) {
      console.error('Error fetching receipt items:', e);
      toast.error('Gagal memuat rincian item');
    } finally {
      setItemsLoading(false);
    }
  };

  const filtered = inbounds.filter(
    (i) =>
      (i.receipt_number || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (i.supplier_name || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/60 backdrop-blur-2xl border border-white/[0.08] p-6 rounded-3xl shadow-xl">
        <div>
          <div className="inline-flex items-center gap-2 text-emerald-400 text-xs font-black uppercase tracking-widest mb-1">
            <ArrowDownLeft className="w-4 h-4" /> Inbound Receiving History
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Riwayat Barang Masuk
          </h1>
          <p className="text-xs text-slate-400 font-medium mt-1">
            Pantau seluruh proses bongkar dan penerimaan barang milik Anda ke dalam gudang.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchInbounds}
            disabled={loading}
            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 active:scale-95 transition-all"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex items-center justify-between gap-4 bg-slate-900/40 border border-white/5 p-4 rounded-2xl">
        <div className="relative w-full sm:max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Cari berdasarkan No. Penerimaan atau Supplier..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950/80 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
          Total: <span className="text-emerald-400 font-black">{filtered.length}</span> Dokumen
        </div>
      </div>

      {/* Inbound Table */}
      <div className="bg-slate-900/60 backdrop-blur-2xl border border-white/[0.08] rounded-3xl overflow-hidden shadow-2xl">
        {loading ? (
          <div className="py-24 text-center flex flex-col items-center">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin mb-3" />
            <p className="text-xs text-slate-400 font-medium">Memuat riwayat barang masuk...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-slate-500 text-xs">
            Tidak ada dokumen barang masuk yang sesuai dengan pencarian Anda.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/60 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  <th className="py-4 px-5">No. Penerimaan</th>
                  <th className="py-4 px-5">Tanggal Masuk</th>
                  <th className="py-4 px-5">Supplier / Asal Pengirim</th>
                  <th className="py-4 px-5">Catatan</th>
                  <th className="py-4 px-5">Status</th>
                  <th className="py-4 px-5 text-center">Aksi & BAST</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-xs">
                {filtered.map((row) => (
                  <tr key={row.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-4 px-5 font-black text-white font-mono">
                      {row.receipt_number || 'INB-DRAFT'}
                    </td>
                    <td className="py-4 px-5 text-slate-300 font-medium">
                      {row.receipt_date || row.created_at?.slice(0, 10) || '-'}
                    </td>
                    <td className="py-4 px-5 text-slate-300 font-bold">
                      {row.supplier_name || 'Direct'}
                    </td>
                    <td className="py-4 px-5 text-slate-400 italic max-w-xs truncate">
                      {row.notes || '-'}
                    </td>
                    <td className="py-4 px-5">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        row.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                        row.status === 'RECEIVING' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' :
                        'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-center">
                      <button
                        onClick={() => handleOpenDetail(row)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-black text-[10px] uppercase tracking-wider transition-all active:scale-95 inline-flex items-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Detail & BAST
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-6 bg-slate-950/60 border-b border-white/10 flex items-center justify-between">
              <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Detail Penerimaan Barang (Inbound)</div>
                <h3 className="text-lg font-black text-white">{selectedReceipt.receipt_number || 'INB-DRAFT'}</h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Cetak BAST
                </button>
                <button
                  onClick={() => setSelectedReceipt(null)}
                  className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white text-xs font-black uppercase tracking-wider transition-colors"
                >
                  Tutup
                </button>
              </div>
            </div>

            <div className="p-6 flex-1 overflow-y-auto space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Tanggal Masuk</span>
                  <span className="font-black text-white mt-0.5 block">{selectedReceipt.receipt_date || '-'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Asal Supplier</span>
                  <span className="font-black text-white mt-0.5 block">{selectedReceipt.supplier_name || 'Direct'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Status Penerimaan</span>
                  <span className="font-black text-emerald-400 mt-0.5 block">{selectedReceipt.status}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] font-bold uppercase">Selesai Pada</span>
                  <span className="font-black text-slate-300 mt-0.5 block">{selectedReceipt.completed_at?.slice(0, 16) || '-'}</span>
                </div>
              </div>

              <h4 className="text-xs font-black text-white uppercase tracking-wider">Rincian Item Barang Diterima</h4>

              {itemsLoading ? (
                <div className="py-12 text-center">
                  <Loader2 className="w-6 h-6 text-cyan-400 animate-spin mx-auto mb-2" />
                  <span className="text-xs text-slate-400">Memuat rincian item...</span>
                </div>
              ) : receiptItems.length === 0 ? (
                <div className="text-center py-10 text-slate-500 text-xs bg-white/[0.02] rounded-2xl border border-white/5">
                  Belum ada rincian item tersimpan pada dokumen ini.
                </div>
              ) : (
                <div className="border border-white/10 rounded-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-950 border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <th className="py-3 px-4">Kode SKU</th>
                        <th className="py-3 px-4">Nama Barang</th>
                        <th className="py-3 px-4 text-right">Expected</th>
                        <th className="py-3 px-4 text-right">Received (Actual)</th>
                        <th className="py-3 px-4">Satuan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {receiptItems.map((item) => {
                        const sku = item.md_product_skus || {};
                        const exp = Number(item.expected_qty || item.quantity_expected || 0);
                        const rec = Number(item.actual_good_qty || item.quantity_received || 0);
                        const match = rec === exp && exp > 0;
                        return (
                          <tr key={item.id} className="hover:bg-white/[0.03]">
                            <td className="py-3 px-4 font-mono font-black text-cyan-300">{sku.sku_code || 'SKU'}</td>
                            <td className="py-3 px-4 font-bold text-white">{sku.name || 'Unknown Item'}</td>
                            <td className="py-3 px-4 text-right font-bold text-slate-400">{exp.toLocaleString('id-ID')}</td>
                            <td className="py-3 px-4 text-right font-black">
                              <span className={match ? 'text-emerald-400' : 'text-amber-300'}>
                                {rec.toLocaleString('id-ID')}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-bold text-slate-400">{sku.uom || 'PCS'}</td>
                          </tr>
                        );
                      })}
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
