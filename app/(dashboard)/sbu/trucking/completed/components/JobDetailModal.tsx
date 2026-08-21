'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, ShieldCheck, CheckCircle, FileText, Clock, Banknote, Receipt, TrendingUp, TrendingDown, Save, Eye, Loader2, CheckCircle2, Upload, Trash2, ImageIcon } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { Button } from '@/components/ui/Button';
import UnifiedFinancePanel from '@/components/shared/UnifiedFinancePanel';
import PaymentModal from '@/components/shared/PaymentModal';

interface CompletedJob {
  id: string; jo_number: string; status: string; completed_at: string;
  driver_phone: string | null; purchase_price: number; pod_photo_url: string | null;
  pod_status: string; wo_item_id: string; wo_items?: any; wo_item?: { wo_id: string } | any;
  md_fleets: { plate_number: string; md_entities?: { is_vendor?: boolean; name?: string; legal_name?: string }; md_fleet_types?: { type_name?: string } } | any;
  md_drivers: { name: string } | any;
  assignment_documents?: any[];
  has_draft_costs?: boolean; has_pending_audit?: boolean; advance_status?: string;
  is_doc_finished?: boolean; is_cost_finished?: boolean; advance_amount?: number;
  driver_payment_amount?: number; driver_payment_status?: string;
  base_price?: number; driver_share_percentage?: number;
  created_at: string; advance_receipt_url?: string;
}

interface Props {
  job: CompletedJob;
  viMap: Record<string, any>;
  onClose: () => void;
  onFinalizeGate: (joId: string, field: 'is_doc_finished' | 'is_cost_finished', value: boolean) => void;
  onAddCost: (job: any) => void;
  onOpenFinanceHub: (job: any) => void;
  onUpdate?: (job: any) => void;
}

const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

const statusLabel = (job: CompletedJob) => {
  const s = job.status?.toLowerCase() || '';
  if (['accepted', 'order diterima', 'diterima'].includes(s)) {
    return job.advance_status === 'paid' ? 'Accepted (Advance Paid)' : (job.md_fleets?.md_entities?.is_vendor ? 'Awaiting DP' : 'Awaiting Settlement');
  }
  if (['in_progress', 'dalam perjalanan', 'start journey', 'picking_up', 'delivering', 'menunggu berangkat'].includes(s)) return 'On Road';
  if (['completed', 'done', 'pekerjaan selesai'].includes(s) && !job.is_doc_finished) return 'POD Needed';
  if (['awaiting_audit'].includes(s)) return 'Awaiting Audit';
  if (job.is_doc_finished && !['ready_for_billing', 'verified', 'VERIFIED'].includes(s)) return 'Docs Ready';
  if (['ready_for_billing', 'verified', 'VERIFIED'].includes(s)) return 'Ready to Invoice';
  return job.status;
};

const statusColor = (job: CompletedJob) => {
  const s = job.status?.toLowerCase() || '';
  if (['accepted', 'order diterima', 'diterima'].includes(s)) return job.md_fleets?.md_entities?.is_vendor ? 'text-orange-700 bg-orange-50' : 'text-blue-700 bg-blue-50';
  if (['in_progress', 'dalam perjalanan', 'start journey', 'picking_up', 'delivering', 'menunggu berangkat'].includes(s)) return 'text-blue-700 bg-blue-50';
  if (['completed', 'done', 'pekerjaan selesai'].includes(s) && !job.is_doc_finished) return 'text-red-700 bg-red-50';
  if (['awaiting_audit'].includes(s)) return 'text-amber-700 bg-amber-50';
  if (job.is_doc_finished && !['ready_for_billing', 'verified', 'VERIFIED'].includes(s)) return 'text-indigo-700 bg-indigo-50';
  if (['ready_for_billing', 'verified', 'VERIFIED'].includes(s)) return 'text-emerald-700 bg-emerald-50';
  return 'text-gray-600 bg-gray-100';
};

export default function JobDetailModal({ job, viMap, onClose, onFinalizeGate, onAddCost, onOpenFinanceHub, onUpdate }: Props) {
  const [tab, setTab] = useState<'operations' | 'finances'>('operations');
  const [editing, setEditing] = useState({ revenue: false, purchasePrice: false, driverSharePct: false, advanceAmount: false, pelunasanAmount: false });
  const [revenue, setRevenue] = useState(job.wo_items?.total_revenue || job.wo_items?.unit_price || job.base_price || 0);
  const [purchasePrice, setPurchasePrice] = useState(job.purchase_price || 0);
  const [driverSharePct, setDriverSharePct] = useState(job.driver_share_percentage || 0);
  const [advanceAmount, setAdvanceAmount] = useState(job.advance_amount || 0);
  const [pelunasanAmount, setPelunasanAmount] = useState(job.driver_payment_amount || 0);
  const [saving, setSaving] = useState(false);
  const [payments, setPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(true);
  const [paymentModal, setPaymentModal] = useState<{
    type: string; label: string; maxAmount: number;
  } | null>(null);
  const [assignDocs, setAssignDocs] = useState<any[]>(job.assignment_documents || []);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
  }, [job.id]);

  const fetchPayments = useCallback(async () => {
    setPaymentsLoading(true);
    const { data } = await supabase
      .from('job_order_payments')
      .select('*')
      .eq('job_order_id', job.id)
      .order('paid_at', { ascending: false });
    setPayments(data || []);
    setPaymentsLoading(false);
  }, [job.id]);

  const isVendor = job.md_fleets?.md_entities?.is_vendor;
  const directCost = isVendor ? purchasePrice : ((job.base_price || 0) * driverSharePct / 100);
  const totalPaid = advanceAmount + pelunasanAmount;
  const remainingBalance = Math.max(0, directCost - totalPaid);
  const grossProfit = Number(revenue) - directCost;
  const margin = Number(revenue) > 0 ? (grossProfit / Number(revenue)) * 100 : 0;

  const isReadyForBilling = ['ready_for_billing', 'verified', 'VERIFIED'].includes(job.status);
  const s = job.status?.toLowerCase() || '';
  const isAdvanceStage = ['accepted', 'order diterima', 'diterima'].includes(s);
  const isCompletionStage = ['completed', 'done', 'pekerjaan selesai', 'awaiting_audit'].includes(s);
  const needsAdvance = isAdvanceStage && job.advance_status !== 'paid';
  const needsFinal = isCompletionStage && job.advance_status === 'paid' && remainingBalance > 0;
  const showPayButton = needsAdvance || needsFinal;

  const vi = viMap[job.id];

  const handleSaveRevenue = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('wo_items')
      .update({ total_revenue: revenue, unit_price: revenue })
      .eq('id', job.wo_item_id);
    if (error) toast.error('Gagal simpan revenue: ' + error.message);
    else { toast.success('Revenue tersimpan'); setEditing(prev => ({ ...prev, revenue: false })); }
    setSaving(false);
  };

  const handleSavePurchasePrice = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('job_orders')
      .update({ purchase_price: purchasePrice })
      .eq('id', job.id);
    if (error) toast.error('Gagal simpan: ' + error.message);
    else { toast.success('Tersimpan'); setEditing(prev => ({ ...prev, purchasePrice: false })); }
    setSaving(false);
  };

  const handleSaveDriverShare = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('job_orders')
      .update({ driver_share_percentage: driverSharePct })
      .eq('id', job.id);
    if (error) toast.error('Gagal simpan: ' + error.message);
    else { toast.success('Tersimpan'); setEditing(prev => ({ ...prev, driverSharePct: false })); }
    setSaving(false);
  };

  const handleSaveAdvance = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('job_orders')
      .update({ advance_amount: advanceAmount })
      .eq('id', job.id);
    if (error) toast.error('Gagal simpan: ' + error.message);
    else { toast.success('Tersimpan'); setEditing(prev => ({ ...prev, advanceAmount: false })); }
    setSaving(false);
  };

  const handleSavePelunasan = async () => {
    setSaving(true);
    const { error } = await supabase
      .from('job_orders')
      .update({ driver_payment_amount: pelunasanAmount })
      .eq('id', job.id);
    if (error) toast.error('Gagal simpan: ' + error.message);
    else { toast.success('Tersimpan'); setEditing(prev => ({ ...prev, pelunasanAmount: false })); }
    setSaving(false);
  };

  const handleUploadDoc = async (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0 || !job?.id) return;
    setUploadingDoc(true);
    try {
      const currentDocs = [...assignDocs];
      for (let i = 0; i < filesList.length; i++) {
        const file = filesList[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `assignment-docs/${job.id}/${fileName}`;
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);
        if (uploadError) {
          toast.error(`Upload gagal (${file.name}): ` + uploadError.message);
          continue;
        }
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);
        currentDocs.push({
          id: `doc_${Math.random().toString(36).substring(2, 9)}`,
          name: file.name,
          type: 'SURAT_JALAN',
          file_url: publicUrl,
          file_type: file.type || 'application/octet-stream',
          file_size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
          uploaded_at: new Date().toISOString(),
        });
      }
      const { error: dbError } = await supabase
        .from('job_orders')
        .update({ assignment_documents: currentDocs })
        .eq('id', job.id);
      if (dbError) throw dbError;
      setAssignDocs(currentDocs);
      onUpdate?.({ ...job, assignment_documents: currentDocs });
      toast.success('Dokumen berhasil diunggah!');
    } catch (err: any) {
      toast.error('Gagal mengunggah dokumen: ' + err.message);
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleRemoveDoc = async (index: number) => {
    if (!job?.id) return;
    const currentDocs = [...assignDocs];
    currentDocs.splice(index, 1);
    try {
      const { error: dbError } = await supabase
        .from('job_orders')
        .update({ assignment_documents: currentDocs })
        .eq('id', job.id);
      if (dbError) throw dbError;
      setAssignDocs(currentDocs);
      onUpdate?.({ ...job, assignment_documents: currentDocs });
      toast.success('Dokumen dihapus');
    } catch (err: any) {
      toast.error('Gagal menghapus dokumen: ' + err.message);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-4xl max-h-[90vh] flex flex-col border border-gray-300 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-gray-900">{job.jo_number}</h2>
              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${statusColor(job)}`}>
                {statusLabel(job)}
              </span>
            </div>
            <p className="text-sm text-gray-700 mt-1">
              {job.wo_items?.work_orders?.md_entities?.legal_name || job.wo_items?.work_orders?.md_entities?.name || 'Customer'}
              {job.wo_items?.work_orders?.wo_number && ` â€” WO: ${job.wo_items.work_orders.wo_number}`}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-900 transition-colors">
            <X size={22} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center border-b border-gray-200 px-6">
          {(['operations', 'finances'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-xs font-bold uppercase tracking-wider transition-colors border-b-2 ${
                tab === t ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              {t === 'operations' ? 'Operations' : 'Finances'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'operations' ? (
            <div className="space-y-6">
              {/* Driver & Fleet */}
              <div className="grid grid-cols-2 gap-5">
                <div className="border border-gray-200 p-4">
                  <p className="text-[10px] font-bold text-gray-700 uppercase mb-1">Driver</p>
                  <p className="text-sm font-semibold text-gray-900 truncate">{job.md_drivers?.name || 'Assigned Driver'}</p>
                  {job.driver_phone && <p className="text-xs text-gray-600 mt-0.5">{job.driver_phone}</p>}
                </div>
                <div className="border border-gray-200 p-4">
                  <p className="text-[10px] font-bold text-gray-700 uppercase mb-1">Fleet</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{job.md_fleets?.plate_number || 'N/A'}</p>
                    {job.md_fleets?.md_entities?.is_vendor ? (
                      <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase text-orange-700 bg-orange-50">Vendor</span>
                    ) : (
                      <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase text-blue-700 bg-blue-50">Internal</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {job.md_fleets?.md_entities?.is_vendor
                      ? (job.md_fleets?.md_entities?.name || 'Vendor Entity')
                      : (job.md_fleets?.md_fleet_types?.type_name || '')}
                  </p>
                </div>
              </div>

              {/* Route */}
              <div className="border border-gray-200 p-4">
                <p className="text-[10px] font-bold text-gray-700 uppercase mb-1">Route</p>
                <p className="text-sm font-semibold text-gray-900 truncate">
                  {job.wo_items?.item_data?.origin_name || job.wo_items?.item_data?.shipper_name || job.wo_items?.item_data?.shipper_city || 'Origin'} â†’ {job.wo_items?.item_data?.destination_name || job.wo_items?.item_data?.recipient_name || job.wo_items?.item_data?.recipient_city || 'Dest'}
                </p>
              </div>

              {/* Date */}
              <div className="flex items-center gap-2 text-gray-700">
                <Clock size={14} />
                <p className="text-xs font-medium">
                  {job.completed_at ? 'Closed' : 'Started'} {new Date(job.completed_at || job.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>

              {/* Document Status */}
              <div className="border border-gray-200 p-4">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-[10px] font-bold text-gray-700 uppercase">Documents</p>
                  <p className={`text-xs font-bold ${job.is_doc_finished ? 'text-emerald-700' : 'text-gray-600'}`}>
                    {job.is_doc_finished ? 'Verified' : (job.pod_status || 'Waiting')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={14} className={job.is_doc_finished ? 'text-emerald-600' : 'text-gray-400'} />
                  <div className="h-1.5 flex-1 bg-gray-200">
                    <div className={`h-full transition-all ${job.is_doc_finished ? 'w-full bg-emerald-500' : (['completed', 'done', 'pekerjaan selesai'].includes(job.status) ? 'w-1/2 bg-amber-400' : 'w-0')}`} />
                  </div>
                </div>
              </div>

              {/* Upload Documents */}
              <div className="border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[10px] font-bold text-gray-700 uppercase">Job Documents</p>
                  <label className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-colors">
                    {uploadingDoc ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
                    {uploadingDoc ? 'Uploading' : 'Add Document'}
                    <input
                      type="file"
                      multiple
                      accept=".pdf,image/*"
                      className="hidden"
                      onChange={(e) => handleUploadDoc(e.target.files)}
                      disabled={uploadingDoc}
                    />
                  </label>
                </div>
                {assignDocs.length > 0 ? (
                  <div className="space-y-2">
                    {assignDocs.map((doc: any, idx: number) => (
                      <div key={doc.id || idx} className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-100 rounded-lg p-2">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center shrink-0">
                            {doc.name?.endsWith('.pdf') || (doc.file_type || '').includes('pdf') ? (
                              <FileText size={15} className="text-red-500" />
                            ) : (
                              <ImageIcon size={15} className="text-blue-500" />
                            )}
                          </div>
                          <a
                            href={doc.file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs font-semibold text-gray-800 hover:text-gray-900 truncate"
                            title={doc.name}
                          >
                            {doc.name}
                          </a>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => setPreviewDocUrl(doc.file_url)}
                            className="w-7 h-7 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 flex items-center justify-center transition-colors"
                            title="Preview"
                          >
                            <Eye size={13} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveDoc(idx)}
                            className="w-7 h-7 rounded bg-red-50 text-red-500 hover:bg-red-100 flex items-center justify-center transition-colors"
                            title="Hapus"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">Belum ada dokumen diunggah.</p>
                )}
              </div>

              {/* Gate: Docs Finished (Operations tab) */}
              <div className="space-y-3">
                {!isReadyForBilling && (
                  <button
                    onClick={() => onFinalizeGate(job.id, 'is_doc_finished', !job.is_doc_finished)}
                    disabled={isReadyForBilling}
                    className={`w-full h-12 border flex items-center justify-center gap-2 text-xs font-bold uppercase transition-colors ${
                      job.is_doc_finished ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                    } ${isReadyForBilling ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {job.is_doc_finished ? <CheckCircle size={15} /> : <div className="w-3.5 h-3.5 border-2 border-gray-300" />}
                    Docs Finished
                  </button>
                )}

                {['accepted', 'order diterima', 'diterima'].includes(job.status?.toLowerCase() || '') && job.advance_status !== 'paid' && (
                  <div className={`border p-4 flex items-center justify-between ${job.md_fleets?.md_entities?.is_vendor ? 'bg-orange-50 border-orange-200' : 'bg-blue-50 border-blue-200'}`}>
                    <div>
                      <p className={`text-[10px] font-bold uppercase ${job.md_fleets?.md_entities?.is_vendor ? 'text-orange-700' : 'text-blue-700'}`}>
                        {job.md_fleets?.md_entities?.is_vendor ? 'Vendor DP' : 'Driver Advance'}
                      </p>
                      <p className="text-base font-bold text-gray-900 mt-0.5">{fmt(job.advance_amount || 0)}</p>
                    </div>
                    <Clock size={22} className={job.md_fleets?.md_entities?.is_vendor ? 'text-orange-500' : 'text-blue-500'} />
                  </div>
                )}
              </div>
            </div>
          ) : (
            <>
              <UnifiedFinancePanel
                jo={job}
                payments={payments}
                mode="sbu"
                onRefresh={fetchPayments}
                editingFields={{
                  revenue: editing.revenue,
                  purchasePrice: editing.purchasePrice,
                  driverSharePct: editing.driverSharePct,
                  advance: editing.advanceAmount,
                  pelunasan: editing.pelunasanAmount,
                }}
                editValues={{
                  revenue,
                  purchasePrice,
                  driverSharePct,
                  advance: advanceAmount,
                  pelunasan: pelunasanAmount,
                }}
                onToggleEdit={(field: string) => {
                  const map: Record<string, string> = { revenue: 'revenue', purchasePrice: 'purchasePrice', driverSharePct: 'driverSharePct', advance: 'advanceAmount', pelunasan: 'pelunasanAmount' };
                  const f = map[field];
                  if (f) setEditing(prev => ({ ...prev, [f]: !(prev as any)[f] }));
                }}
                onChangeEdit={(field: string, value: number) => {
                  const setters: Record<string, (v: number) => void> = {
                    revenue: setRevenue,
                    purchasePrice: setPurchasePrice,
                    driverSharePct: setDriverSharePct,
                    advance: setAdvanceAmount,
                    pelunasan: setPelunasanAmount,
                  };
                  setters[field]?.(value);
                }}
                onSaveEdit={async (field: string) => {
                  const m: Record<string, () => Promise<void>> = {
                    revenue: handleSaveRevenue,
                    purchasePrice: handleSavePurchasePrice,
                    driverSharePct: handleSaveDriverShare,
                    advance: handleSaveAdvance,
                    pelunasan: handleSavePelunasan,
                  };
                  await m[field]?.();
                }}
                onPay={(type, label, maxAmount) => setPaymentModal({ type, label, maxAmount })}
              />

              {/* Vendor Invoice Info */}
              {vi && (
                <div className="border border-gray-200 p-4 mt-5">
                  <p className="text-[10px] font-bold text-gray-700 uppercase mb-1">Vendor Invoice</p>
                  <p className="text-sm font-semibold text-gray-900">{vi.invoice_number}</p>
                  <p className="text-xs text-gray-600 mt-0.5">Amount: {fmt(vi.invoice_amount || 0)}</p>
                  <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold uppercase ${
                    vi.status === 'paid' ? 'text-emerald-700 bg-emerald-50' :
                    vi.status === 'approved' ? 'text-blue-700 bg-blue-50' :
                    vi.status === 'verified' ? 'text-indigo-700 bg-indigo-50' :
                    vi.status === 'submitted' ? 'text-amber-700 bg-amber-50' :
                    'text-gray-600 bg-gray-100'
                  }`}>{vi.status}</span>
                </div>
              )}

              {/* Gate: Cost Finished + Close & Bill (Finances tab) */}
              {!isReadyForBilling && (
                <div className="mt-5 space-y-3">
                  <button
                    onClick={() => onFinalizeGate(job.id, 'is_cost_finished', !job.is_cost_finished)}
                    className={`w-full h-12 border flex items-center justify-center gap-2 text-xs font-bold uppercase transition-colors ${
                      job.is_cost_finished ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {job.is_cost_finished ? <CheckCircle size={15} /> : <div className="w-3.5 h-3.5 border-2 border-gray-300" />}
                    Cost Finished
                  </button>

                  {!job.is_cost_finished && (
                    <button
                      onClick={() => onAddCost(job)}
                      className="w-full h-11 border border-dashed border-amber-300 bg-amber-50 flex items-center justify-center gap-2 text-xs font-bold uppercase text-amber-700 hover:bg-amber-100 transition-colors"
                    >
                      <FileText size={14} /> Add Extra Cost
                    </button>
                  )}

                  {job.is_doc_finished && job.is_cost_finished && (
                    <button
                      onClick={() => onFinalizeGate(job.id, 'is_doc_finished', false)}
                      className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors"
                    >
                      <CheckCircle size={16} /> Close & Bill
                    </button>
                  )}
                </div>
              )}

              {paymentModal && (
                <PaymentModal
                  jo={job}
                  paymentType={paymentModal.type as any}
                  label={paymentModal.label}
                  maxAmount={paymentModal.maxAmount}
                  defaultPaidBy="sbu"
                  onClose={() => setPaymentModal(null)}
                  onSuccess={() => { setPaymentModal(null); fetchPayments(); }}
                />
              )}
            </>
          )}
        </div>
      </div>

      {previewDocUrl && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewDocUrl(null)}
        >
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-lg overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-gray-200">
              <span className="text-xs font-bold text-gray-700 uppercase">Document Preview</span>
              <button onClick={() => setPreviewDocUrl(null)} className="p-1 text-gray-500 hover:text-gray-900">
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-2">
              {previewDocUrl.match(/\.(png|jpe?g|gif|webp)$/i) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={previewDocUrl} alt="preview" className="max-w-full max-h-[80vh] object-contain" />
              ) : (
                <iframe src={previewDocUrl} title="preview" className="w-full h-[80vh] border-0" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
