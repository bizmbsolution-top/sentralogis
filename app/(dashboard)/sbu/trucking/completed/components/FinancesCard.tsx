'use client';

import { Banknote, Receipt, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/Button';

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
  viMap: Record<string, any>;
  onOpenFinanceHub: (job: any) => void;
}

const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

export default function FinancesCard({ job, viMap, onOpenFinanceHub }: Props) {
  const isVendor = job.md_fleets?.md_entities?.is_vendor;
  const revenue = job.wo_items?.total_revenue || job.wo_items?.unit_price || job.base_price || 0;
  const directCost = isVendor ? (job.purchase_price || 0) : ((job.base_price || 0) * (job.driver_share_percentage || 0) / 100);
  const totalPaid = (job.advance_amount || 0) + (job.driver_payment_amount || 0);
  const remainingBalance = Math.max(0, directCost - totalPaid);
  const grossProfit = Number(revenue) - directCost;
  const margin = Number(revenue) > 0 ? (grossProfit / Number(revenue)) * 100 : 0;

  const isReadyForBilling = ['ready_for_billing', 'verified', 'VERIFIED'].includes(job.status);
  const needsPayout = ['accepted', 'order diterima', 'diterima', 'in_progress', 'dalam perjalanan', 'start journey', 'completed', 'done', 'pekerjaan selesai', 'awaiting_audit', 'picking_up', 'delivering', 'menunggu berangkat'].includes(job.status);

  const vi = viMap[job.id];

  return (
    <div className="border border-gray-200 bg-white">
      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs font-bold">{job.jo_number}</span>
              <span className="text-xs font-medium text-gray-700 truncate max-w-[160px]">
                {job.wo_items?.work_orders?.md_entities?.legal_name || job.wo_items?.work_orders?.md_entities?.name || 'Customer'}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            {isReadyForBilling && (
              <span className="px-2 py-0.5 text-[10px] font-bold uppercase text-emerald-700 bg-emerald-50">Ready to Invoice</span>
            )}
            {vi && (
              <span className={`px-2 py-0.5 text-[10px] font-bold uppercase ${
                vi.status === 'paid' ? 'text-emerald-700 bg-emerald-50' :
                vi.status === 'approved' ? 'text-blue-700 bg-blue-50' :
                vi.status === 'verified' ? 'text-indigo-700 bg-indigo-50' :
                vi.status === 'submitted' ? 'text-amber-700 bg-amber-50' :
                'text-gray-600 bg-gray-100'
              }`}>
                AP: {vi.invoice_number} ({vi.status})
              </span>
            )}
          </div>
        </div>

        {/* Two-column layout: Part 1 (Revenue/Cost/Profit) + Part 2 (Payment/AP) */}
        <div className="grid grid-cols-2 gap-5">
          {/* ===== PART 1: Revenue & Cost ===== */}
          <div className="space-y-4">
            {/* Revenue */}
            <div className="border border-gray-200 p-4">
              <p className="text-[10px] font-bold text-gray-700 uppercase mb-1">Revenue</p>
              <p className="text-xl font-bold text-emerald-700">{fmt(Number(revenue) || 0)}</p>
            </div>

            {/* Cost Breakdown */}
            <div className="border border-gray-200 p-4">
              <p className="text-[10px] font-bold text-gray-700 uppercase mb-2">Costs</p>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-700">{isVendor ? 'Purchase Price' : 'Driver Share'}</span>
                  <span className="text-xs font-semibold text-gray-900">{fmt(directCost)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-600">Extra Costs</span>
                  <span className="text-xs text-gray-600">—</span>
                </div>
                <div className="border-t border-gray-200 pt-1.5 flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-800">Total Cost</span>
                  <span className="text-xs font-bold text-gray-900">{fmt(directCost)}</span>
                </div>
              </div>
            </div>

            {/* Gross Profit */}
            <div className={`border p-4 ${grossProfit >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-bold text-gray-700 uppercase">Gross Profit</p>
                  <p className={`text-base font-bold mt-0.5 ${grossProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {fmt(grossProfit)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {grossProfit >= 0 ? <TrendingUp size={18} className="text-emerald-500" /> : <TrendingDown size={18} className="text-red-500" />}
                  <span className={`text-sm font-bold ${grossProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {margin.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ===== PART 2: Payment & Actions ===== */}
          <div className="space-y-4">
            {/* Payment Status */}
            <div className="border border-gray-200 p-4">
              <p className="text-[10px] font-bold text-gray-700 uppercase mb-2">Payment to Driver</p>
              <div className="space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-700">
                    Advance {job.advance_receipt_url ? '✓' : ''}
                  </span>
                  <span className="text-xs font-semibold text-gray-900">{fmt(job.advance_amount || 0)}</span>
                </div>
                {((job.driver_payment_amount || 0) > 0) && (
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-blue-600 font-semibold">Pelunasan</span>
                    <span className="text-xs font-semibold text-blue-600">{fmt(job.driver_payment_amount || 0)}</span>
                  </div>
                )}
                <div className="border-t border-gray-200 pt-1.5 flex justify-between items-center">
                  <span className="text-xs font-bold text-red-600">Remaining</span>
                  <span className="text-xs font-bold text-red-600">{fmt(remainingBalance)}</span>
                </div>
              </div>
            </div>

            {/* COA Info */}
            <div className="border border-gray-200 p-4">
              <p className="text-[10px] font-bold text-gray-700 uppercase mb-1">Cost Account</p>
              <p className="text-xs text-gray-700">
                {isVendor ? '5-50020 HPP Jasa Vendor' : '5-50010 Beban Bagi Hasil Driver'}
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {needsPayout && (
                <Button
                  onClick={() => onOpenFinanceHub(job)}
                  disabled={isReadyForBilling}
                  className={`w-full h-12 text-xs font-bold uppercase flex items-center justify-center gap-2 border transition-colors ${
                    isReadyForBilling ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' :
                    job.advance_status === 'paid' ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-600' :
                    'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Banknote size={16} />
                  {job.advance_status === 'paid' ? 'Pay Final' : 'Pay Advance'}
                </Button>
              )}

              {isReadyForBilling && (
                <Button
                  variant="secondary"
                  onClick={() => onOpenFinanceHub(job)}
                  className="w-full h-12 text-xs font-bold uppercase flex items-center justify-center gap-2 bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200"
                >
                  <Receipt size={16} /> View Archived
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
