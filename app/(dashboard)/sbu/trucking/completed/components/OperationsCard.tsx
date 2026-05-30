'use client';

import { ShieldCheck, CheckCircle, FileText, Clock } from 'lucide-react';

interface CompletedJob {
  id: string; jo_number: string; status: string; completed_at: string;
  driver_phone: string | null; purchase_price: number; pod_photo_url: string | null;
  pod_status: string; wo_item_id: string; wo_items?: any; wo_item?: { wo_id: string } | any;
  md_fleets: { plate_number: string } | any; md_drivers: { name: string } | any;
  has_draft_costs?: boolean; has_pending_audit?: boolean; advance_status?: string;
  is_doc_finished?: boolean; is_cost_finished?: boolean; advance_amount?: number;
  driver_payment_amount?: number; driver_payment_status?: string;
  base_price?: number; driver_share_percentage?: number;
  created_at: string; advance_receipt_url?: string;
}

interface Props {
  job: CompletedJob;
  onFinalizeGate: (joId: string, field: 'is_doc_finished' | 'is_cost_finished', value: boolean) => void;
  onAddCost: (job: any) => void;
}

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

const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

export default function OperationsCard({ job, onFinalizeGate, onAddCost }: Props) {
  const isReadyForBilling = ['ready_for_billing', 'verified', 'VERIFIED'].includes(job.status);
  const isCompletedPhase = ['completed', 'done', 'pekerjaan selesai', 'awaiting_audit', 'ready_for_billing', 'verified', 'VERIFIED'].includes(job.status);

  return (
    <div className="border border-gray-200 bg-white">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-bold">{job.jo_number}</span>
              <span className="text-xs font-medium text-gray-700 truncate max-w-[160px]">
                {job.wo_items?.work_orders?.md_entities?.legal_name || job.wo_items?.work_orders?.md_entities?.name || 'Customer'}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${statusColor(job)}`}>
              {statusLabel(job)}
            </span>
            {job.has_pending_audit && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase text-amber-700 bg-amber-50">CS Audit Pending</span>
            )}
          </div>
        </div>

        {/* Driver & Fleet in 2-col grid */}
        <div className="grid grid-cols-2 gap-4 mb-5">
          <div className="border border-gray-200 p-3">
            <p className="text-[10px] font-bold text-gray-700 uppercase mb-1">Driver</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{job.md_drivers?.name || 'Assigned Driver'}</p>
            {job.driver_phone && <p className="text-xs text-gray-600 mt-0.5">{job.driver_phone}</p>}
          </div>
          <div className="border border-gray-200 p-3">
            <p className="text-[10px] font-bold text-gray-700 uppercase mb-1">Fleet</p>
            <p className="text-sm font-semibold text-gray-900 truncate">{job.md_fleets?.plate_number || 'N/A'}</p>
            <p className="text-xs text-gray-600 mt-0.5">{job.md_fleets?.md_fleet_types?.type_name || ''}</p>
          </div>
        </div>

        {/* Route */}
        <div className="border border-gray-200 p-3 mb-5">
          <p className="text-[10px] font-bold text-gray-700 uppercase mb-1">Route</p>
          <p className="text-sm font-semibold text-gray-900 truncate">
            {job.wo_items?.item_data?.origin_name || job.wo_items?.item_data?.shipper_name || job.wo_items?.item_data?.shipper_city || 'Origin'} → {job.wo_items?.item_data?.destination_name || job.wo_items?.item_data?.recipient_name || job.wo_items?.item_data?.recipient_city || 'Dest'}
          </p>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2 mb-5 text-gray-700">
          <Clock size={14} />
          <p className="text-xs font-medium">
            {job.completed_at ? 'Closed' : 'Started'} {new Date(job.completed_at || job.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
          </p>
        </div>

        {/* Document Status */}
        <div className="border border-gray-200 p-4 mb-5">
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

        {/* Gates */}
        <div className="space-y-3">
          {isCompletedPhase && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onFinalizeGate(job.id, 'is_doc_finished', !job.is_doc_finished)}
                  disabled={isReadyForBilling}
                  className={`h-12 border flex items-center justify-center gap-2 text-xs font-bold uppercase transition-colors ${
                    job.is_doc_finished ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                  } ${isReadyForBilling ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {job.is_doc_finished ? <CheckCircle size={15} /> : <div className="w-3.5 h-3.5 border-2 border-gray-300" />}
                  Docs Finished
                </button>
                <button
                  onClick={() => onFinalizeGate(job.id, 'is_cost_finished', !job.is_cost_finished)}
                  disabled={isReadyForBilling}
                  className={`h-12 border flex items-center justify-center gap-2 text-xs font-bold uppercase transition-colors ${
                    job.is_cost_finished ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200 text-gray-500 hover:border-gray-400'
                  } ${isReadyForBilling ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {job.is_cost_finished ? <CheckCircle size={15} /> : <div className="w-3.5 h-3.5 border-2 border-gray-300" />}
                  Cost Finished
                </button>
              </div>

              {job.has_draft_costs && !job.is_cost_finished && (
                <button
                  onClick={() => onAddCost(job)}
                  className="w-full h-11 border border-dashed border-amber-300 bg-amber-50 flex items-center justify-center gap-2 text-xs font-bold uppercase text-amber-700 hover:bg-amber-100 transition-colors"
                >
                  <FileText size={14} /> Add Extra Cost
                </button>
              )}

              {job.is_doc_finished && job.is_cost_finished && !isReadyForBilling && (
                <button
                  onClick={() => onFinalizeGate(job.id, 'is_doc_finished', false)}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors"
                >
                  <CheckCircle size={16} /> Close & Bill
                </button>
              )}
            </>
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
    </div>
  );
}
