'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';
import { 
  X, Loader2, ArrowRight, Truck, Package, PackageX, PackageCheck, AlertTriangle, User, Calendar, Edit2
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import ProductFormModal from '@/app/(dashboard)/hq/master-data/products/components/ProductFormModal';

interface ReceiptDetailModalProps {
  receiptId: string;
  onClose: () => void;
}

export default function ReceiptDetailModal({ receiptId, onClose }: ReceiptDetailModalProps) {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [editProductModalId, setEditProductModalId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch Receipt
      const { data: recData, error: recError } = await supabase
        .from('wh_inbound_receipts')
        .select(`
          *,
          transporter:transporter_id(name),
          fleet:fleet_id(plate_number),
          driver:driver_id(name, whatsapp)
        `)
        .eq('id', receiptId)
        .single();
      
      if (recError) throw recError;
      setReceipt(recData);

      // Fetch Items
      const { data: itemsData, error: itemsError } = await supabase
        .from('wh_inbound_receipt_items')
        .select(`
          *,
          product:product_sku_id(name, sku_code, unit)
        `)
        .eq('receipt_id', receiptId)
        .order('created_at', { ascending: true });
        
      if (itemsError) throw itemsError;
      setItems(itemsData || []);
    } catch (error: any) {
      toast.error('Gagal memuat detail receipt');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [receiptId, onClose]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleUpdateStatus = async (newStatus: string) => {
    setSubmitting(true);
    try {
      // Update Receipt Status
      const { error } = await supabase
        .from('wh_inbound_receipts')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', receiptId);

      if (error) throw error;

      // Log Milestone
      await supabase.from('wh_milestone_logs').insert({
        tenant_id: receipt.tenant_id,
        reference_type: 'INBOUND_RECEIPT',
        reference_id: receiptId,
        milestone_event: `Status changed to ${newStatus}`
      });

      toast.success(`Status diperbarui menjadi ${newStatus}`);
      fetchData(); // Refresh data
    } catch (error: any) {
      toast.error('Gagal memperbarui status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleItemChange = (itemId: string, field: string, value: any) => {
    setItems(items.map(item => item.id === itemId ? { ...item, [field]: value } : item));
  };

  const submitChecking = async () => {
    setSubmitting(true);
    try {
      // Update each item
      for (const item of items) {
        const { error } = await supabase
          .from('wh_inbound_receipt_items')
          .update({
            actual_good_qty: item.actual_good_qty,
            quarantine_qty: item.quarantine_qty,
            rejected_qty: item.rejected_qty,
            damage_source: item.damage_source,
            damage_condition: item.damage_condition,
            damage_notes: item.damage_notes,
          })
          .eq('id', item.id);
        if (error) throw error;
      }

      // Update status to PUTAWAY_IN_PROGRESS
      await handleUpdateStatus('PUTAWAY_IN_PROGRESS');
      toast.success('Pengecekan fisik selesai. Lanjut proses Putaway.');
    } catch (error: any) {
      toast.error('Gagal menyimpan hasil pengecekan');
      setSubmitting(false); // only reset if error, success handled by handleUpdateStatus
    }
  };

  const finishPutaway = async () => {
    setSubmitting(true);
    try {
      // In a real WMS, we would update `wh_inventory` here based on `actual_good_qty` and `quarantine_qty`.
      // Since `location_id` logic needs its own UI, we simulate it for now.
      
      // Mark as completed
      await handleUpdateStatus('COMPLETED');
    } catch (error: any) {
      toast.error('Gagal menyelesaikan Putaway');
      setSubmitting(false);
    }
  };

  if (loading || !receipt) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  // Determine actions based on status
  const isExpected = receipt.status === 'EXPECTED';
  const isArrived = receipt.status === 'TRUCK_ARRIVED';
  const isUnloading = receipt.status === 'UNLOADING';
  const isChecking = receipt.status === 'CHECKING';
  const isPutaway = receipt.status === 'PUTAWAY_IN_PROGRESS';
  const isCompleted = receipt.status === 'COMPLETED';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-none bg-slate-50">
        {/* Header */}
        <div className="p-6 bg-white border-b border-slate-200 flex flex-col md:flex-row md:items-start justify-between gap-4 sticky top-0 z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
              <DownloadCloud size={24} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-black font-mono text-slate-900">{receipt.receipt_number}</h2>
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                  ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                  {receipt.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-sm text-slate-500 font-medium">Inbound Receipt Details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors self-start">
            <X size={20} className="text-slate-400 hover:text-slate-900" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Workflow Progress */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            {['EXPECTED', 'TRUCK_ARRIVED', 'UNLOADING', 'CHECKING', 'PUTAWAY_IN_PROGRESS', 'COMPLETED'].map((step, idx, arr) => {
              const passed = arr.indexOf(receipt.status) >= idx;
              const current = receipt.status === step;
              return (
                <div key={step} className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 ${passed ? 'text-blue-600' : ''} ${current ? 'bg-blue-50 px-2 py-1 rounded' : ''}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${passed ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'}`}>
                      {passed ? <CheckCircle2 size={12} /> : idx + 1}
                    </div>
                    <span>{step.replace(/_/g, ' ')}</span>
                  </div>
                  {idx < arr.length - 1 && <ArrowRight size={14} className="opacity-50" />}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Info Cards */}
            <Card className="p-4 border-slate-200 shadow-sm space-y-4 col-span-1">
              <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                <Truck size={16} className="text-slate-500" /> Logistics Info
              </h3>
              <div className="space-y-3 text-sm">
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest">Transporter</span>
                  <span className="font-medium text-slate-900">{receipt.transporter?.name || '-'}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest">Fleet</span>
                  <span className="font-medium text-slate-900">{receipt.fleet?.plate_number || '-'}</span>
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest">Driver</span>
                  <span className="font-medium text-slate-900">{receipt.driver?.name || '-'}</span>
                  {receipt.driver?.whatsapp && <span className="block text-xs text-emerald-600">WA: {receipt.driver.whatsapp}</span>}
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest">Expected Arrival</span>
                  <span className="font-medium text-slate-900">{receipt.expected_arrival ? new Date(receipt.expected_arrival).toLocaleString('id-ID') : '-'}</span>
                </div>
              </div>
            </Card>

            {/* Items List */}
            <Card className="p-0 border-slate-200 shadow-sm col-span-1 md:col-span-2 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Package size={16} className="text-slate-500" /> Item Details
                </h3>
              </div>
              <div className="overflow-x-auto bg-white flex-1">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider">SKU & Item</th>
                      <th className="px-4 py-3 font-semibold text-right uppercase tracking-wider">Expected Qty</th>
                      {isChecking || isPutaway || isCompleted ? (
                        <>
                          <th className="px-4 py-3 font-semibold text-right uppercase tracking-wider text-emerald-600">Good</th>
                          <th className="px-4 py-3 font-semibold text-right uppercase tracking-wider text-amber-600">Quarantine</th>
                          <th className="px-4 py-3 font-semibold text-right uppercase tracking-wider text-rose-600">Reject</th>
                        </>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 group/item">
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            {item.product?.name}
                            <button onClick={() => setEditProductModalId(item.product_sku_id)} title="Edit Master Produk" className="text-slate-300 hover:text-indigo-600 transition-colors opacity-0 group-hover/item:opacity-100">
                                <Edit2 size={12} />
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{item.product?.sku_code}</div>
                        </td>
                        <td className="px-4 py-4 text-right font-bold text-slate-600">
                          {item.expected_qty} <span className="text-xs font-normal text-slate-400">{item.product?.unit}</span>
                        </td>
                        {isChecking || isPutaway || isCompleted ? (
                          <>
                            <td className="px-4 py-4 text-right">
                              {isChecking ? (
                                <input type="number" min="0" value={item.actual_good_qty || ''} onChange={(e) => handleItemChange(item.id, 'actual_good_qty', e.target.value)} className="w-16 px-2 py-1 text-right border border-emerald-200 rounded focus:ring-1 focus:ring-emerald-500 outline-none text-emerald-700 font-bold bg-emerald-50" />
                              ) : (
                                <span className="font-bold text-emerald-600">{item.actual_good_qty}</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right">
                              {isChecking ? (
                                <input type="number" min="0" value={item.quarantine_qty || ''} onChange={(e) => handleItemChange(item.id, 'quarantine_qty', e.target.value)} className="w-16 px-2 py-1 text-right border border-amber-200 rounded focus:ring-1 focus:ring-amber-500 outline-none text-amber-700 font-bold bg-amber-50" />
                              ) : (
                                <span className="font-bold text-amber-600">{item.quarantine_qty}</span>
                              )}
                            </td>
                            <td className="px-4 py-4 text-right">
                              {isChecking ? (
                                <input type="number" min="0" value={item.rejected_qty || ''} onChange={(e) => handleItemChange(item.id, 'rejected_qty', e.target.value)} className="w-16 px-2 py-1 text-right border border-rose-200 rounded focus:ring-1 focus:ring-rose-500 outline-none text-rose-700 font-bold bg-rose-50" />
                              ) : (
                                <span className="font-bold text-rose-600">{item.rejected_qty}</span>
                              )}
                            </td>
                          </>
                        ) : null}
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500 italic">No items found in this receipt.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Extended Checking Forms for Damage Reasons */}
              {isChecking && items.some(i => Number(i.quarantine_qty) > 0 || Number(i.rejected_qty) > 0) && (
                <div className="p-4 bg-rose-50/50 border-t border-rose-100 space-y-4">
                  <h4 className="text-sm font-bold text-rose-800 flex items-center gap-2">
                    <AlertTriangle size={16} /> Laporan Kerusakan (Wajib Diisi)
                  </h4>
                  {items.filter(i => Number(i.quarantine_qty) > 0 || Number(i.rejected_qty) > 0).map((item) => (
                    <div key={item.id + '_damage'} className="p-3 bg-white border border-rose-100 rounded-lg space-y-3">
                      <div className="font-bold text-slate-800 text-sm border-b border-slate-100 pb-2">{item.product?.name}</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sumber Kerusakan</label>
                          <select value={item.damage_source || ''} onChange={(e) => handleItemChange(item.id, 'damage_source', e.target.value)} className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded">
                            <option value="">Pilih...</option>
                            <option value="TRANSPORTER">Dari Transporter</option>
                            <option value="WAREHOUSE_STAFF">Kelalaian Staf Gudang</option>
                            <option value="SUPPLIER">Cacat Pabrik / Supplier</option>
                            <option value="OTHER">Lainnya</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Kondisi Kerusakan</label>
                          <select value={item.damage_condition || ''} onChange={(e) => handleItemChange(item.id, 'damage_condition', e.target.value)} className="w-full text-xs px-2 py-1.5 border border-slate-200 rounded">
                            <option value="">Pilih...</option>
                            <option value="DAMAGED_PACKAGE_FULL_CONTENT">Kemasan Rusak, Isi Lengkap</option>
                            <option value="GOOD_PACKAGE_MISSING_CONTENT">Kemasan Bagus, Isi Berkurang</option>
                            <option value="TOTAL_DAMAGE">Rusak Total / Hancur</option>
                          </select>
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Catatan Detail</label>
                          <input type="text" value={item.damage_notes || ''} onChange={(e) => handleItemChange(item.id, 'damage_notes', e.target.value)} className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded placeholder:text-slate-300" placeholder="Jelaskan detail kerusakan untuk laporan pelanggan..." />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between mt-auto">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
            Tutup
          </button>
          
          <div className="flex gap-3">
            {isExpected && (
              <button 
                onClick={() => handleUpdateStatus('TRUCK_ARRIVED')}
                disabled={submitting}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                Truk Tiba (Arrived)
              </button>
            )}

            {isArrived && (
              <button 
                onClick={() => handleUpdateStatus('UNLOADING')}
                disabled={submitting}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Mulai Bongkar
              </button>
            )}

            {isUnloading && (
              <button 
                onClick={() => handleUpdateStatus('CHECKING')}
                disabled={submitting}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Selesai Bongkar (Lanjut Cek)
              </button>
            )}

            {isChecking && (
              <button 
                onClick={submitChecking}
                disabled={submitting}
                className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Konfirmasi Hasil Pengecekan
              </button>
            )}

            {isPutaway && (
              <button 
                onClick={finishPutaway}
                disabled={submitting}
                className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Selesai Putaway
              </button>
            )}
            
            {isCompleted && (
              <div className="px-6 py-2.5 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-xl border border-emerald-100 flex items-center gap-2">
                <CheckCircle2 size={18} /> Receipt Selesai
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Edit Master Product Modal */}
      {editProductModalId && (
        <ProductFormModal 
          editId={editProductModalId}
          onClose={() => setEditProductModalId(null)}
          onSuccess={() => {
            setEditProductModalId(null);
            toast.success("Produk Master berhasil diperbarui!");
            fetchData();
          }}
        />
      )}
    </div>
  );
}
