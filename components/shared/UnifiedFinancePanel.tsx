'use client';

import { TrendingUp, TrendingDown, Banknote, Upload, CheckCircle, CheckSquare, Eye, Loader2, Save } from 'lucide-react';
import EntityBadge from './EntityBadge';

const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(v);

interface UnifiedFinancePanelProps {
  jo: any;
  payments: any[];
  mode: 'sbu' | 'hq';
  onRefresh?: () => void;

  /* Payment actions */
  onPay?: (type: string, label: string, maxAmount: number) => void;
  onUploadProof?: (paymentId: string) => void;
  onVerify?: (paymentId: string) => void;
  uploading?: string | null;

  /* Editing (SBU mode) */
  editingFields?: Record<string, boolean>;
  editValues?: Record<string, number>;
  onToggleEdit?: (field: string) => void;
  onChangeEdit?: (field: string, value: number) => void;
  onSaveEdit?: (field: string) => Promise<void>;
  saving?: boolean;
}

export default function UnifiedFinancePanel({
  jo,
  payments,
  mode,
  onPay,
  onUploadProof,
  onVerify,
  uploading,
  editingFields,
  editValues,
  onToggleEdit,
  onChangeEdit,
  onSaveEdit,
  saving,
}: UnifiedFinancePanelProps) {
  const isVendor = jo?.md_fleets?.md_entities?.is_vendor;
  const revenue = Number(editValues?.revenue ?? jo?.wo_items?.total_revenue ?? jo?.wo_items?.unit_price ?? jo?.base_price ?? 0);
  const purchasePrice = Number(editValues?.purchasePrice ?? jo?.purchase_price ?? 0);
  const driverSharePct = Number(editValues?.driverSharePct ?? jo?.driver_share_percentage ?? 0);
  const advanceAmount = Number(editValues?.advance ?? jo?.advance_amount ?? 0);

  const directCost = isVendor
    ? purchasePrice
    : ((jo?.base_price || 0) * driverSharePct / 100);

  const pelunasanAmount = Number(
    editValues?.pelunasan ??
    (jo?.driver_payment_amount && Number(jo.driver_payment_amount) > 0
      ? jo.driver_payment_amount
      : (directCost - advanceAmount))
  );
  const grossProfit = revenue - directCost;
  const margin = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

  /* Payment calculations from job_order_payments */
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0);
  const sisa = Math.max(0, directCost - totalPaid);
  const isLunas = directCost > 0 && totalPaid >= directCost;
  const isPartial = totalPaid > 0 && !isLunas;

  const renderEditableField = (
    field: string,
    label: string,
    displayValue: string,
    showEditBtn: boolean,
  ) => {
    const isEditing = editingFields?.[field];
    return (
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-700">{label}</span>
        <div className="flex items-center gap-1.5">
          {isEditing ? (
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={editValues?.[field] ?? 0}
                onChange={(e) => onChangeEdit?.(field, Number(e.target.value))}
                className="w-28 h-7 px-2 border border-gray-200 text-xs font-semibold text-gray-900 outline-none focus:border-gray-400 text-right"
              />
              <button
                onClick={() => onSaveEdit?.(field)}
                disabled={saving}
                className="h-7 px-2 bg-gray-900 text-white text-[10px] font-bold uppercase flex items-center gap-1"
              >
                {saving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />}
              </button>
            </div>
          ) : (
            <>
              <span className="text-xs font-semibold text-gray-900">{displayValue}</span>
              {showEditBtn && mode === 'sbu' && (
                <button
                  onClick={() => onToggleEdit?.(field)}
                  className="text-[10px] font-bold text-gray-500 uppercase hover:text-gray-900"
                >
                  Edit
                </button>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  const renderPaymentRow = (type: string, label: string, target: number) => {
    const typePayments = payments.filter(p => p.payment_type === type);
    const typePaid = typePayments.reduce((s, p) => s + Number(p.amount), 0);
    const typeSisa = Math.max(0, target - typePaid);
    if (target === 0 && typePaid === 0) return null;

    return (
      <div className="border border-gray-200 bg-white p-3">
        <div className="flex items-center justify-between mb-1.5">
          <p className="text-[10px] font-bold text-gray-600 uppercase">{label}</p>
          {mode === 'sbu' && type !== 'extra_cost' && (
            <div className="flex items-center gap-1">
              {type === 'advance_driver' || type === 'advance_vendor'
                ? renderEditableField('advance', '', fmt(advanceAmount), true)
                : null}
            </div>
          )}
          <span className={`text-[10px] font-bold uppercase ${typeSisa <= 0 && typePaid > 0 ? 'text-emerald-700' : typePaid > 0 ? 'text-amber-700' : 'text-gray-400'}`}>
            {typeSisa <= 0 && typePaid > 0 ? '✓ Lunas' : typePaid > 0 ? 'Partial' : ''}
          </span>
        </div>
        {typePaid > 0 && (
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-500">Dibayar</span>
            <span className="font-semibold text-emerald-600">{fmt(typePaid)}</span>
          </div>
        )}
        {typeSisa > 0 && (
          <div className="flex items-center justify-between text-[10px]">
            <span className="text-gray-500">Sisa</span>
            <span className="font-semibold text-red-600">{fmt(typeSisa)}</span>
          </div>
        )}

        {/* Payment timeline for this type */}
        {typePayments.map(p => (
          <div key={p.id} className="mt-1.5 pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10px]">
            <div className="flex items-center gap-1 text-gray-500">
              <span>{p.paid_by === 'hq' ? 'HQ' : 'SBU'}</span>
              <span>•</span>
              <span>{new Date(p.paid_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
              {p.status === 'verified' && <CheckCircle size={10} className="text-emerald-500" />}
            </div>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-gray-900">{fmt(p.amount)}</span>
              {p.transfer_proof_url ? (
                <a href={p.transfer_proof_url} target="_blank" className="p-1 text-gray-400 hover:text-gray-900" title="Lihat Bukti">
                  <Eye size={11} />
                </a>
              ) : mode === 'hq' ? (
                <button onClick={() => onUploadProof?.(p.id)} disabled={uploading === p.id}
                  className="p-1 text-gray-400 hover:text-gray-900" title="Upload Bukti">
                  {uploading === p.id ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
                </button>
              ) : null}
              {mode === 'hq' && p.status !== 'verified' && p.transfer_proof_url && (
                <button onClick={() => onVerify?.(p.id)} className="p-1 text-gray-400 hover:text-emerald-600" title="Verifikasi">
                  <CheckSquare size={11} />
                </button>
              )}
            </div>
          </div>
        ))}

        {/* Pay button (HQ mode or SBU mode) */}
        {typeSisa > 0 && onPay && (
          <button
            onClick={() => onPay(type, label, typeSisa)}
            className="mt-2 w-full h-7 border border-dashed border-slate-300 bg-white hover:bg-slate-50 text-xs font-bold text-slate-600 uppercase flex items-center justify-center gap-1 transition-colors"
          >
            <Banknote size={12} /> Bayar {fmt(typeSisa)}
          </button>
        )}
      </div>
    );
  };

  /* Determine payment types to show based on entity */
  const showAdvance = isVendor ? 'advance_vendor' : 'advance_driver';
  const showPelunasan = isVendor ? 'pelunasan_vendor' : 'pelunasan_driver';

  return (
    <div className="grid grid-cols-1 gap-5">
      {/* COL 1: Revenue & Cost */}
      <div className="space-y-5">
        {/* Revenue */}
        <div className="border border-gray-200 p-4">
          <p className="text-[10px] font-bold text-gray-700 uppercase mb-1">Revenue</p>
          {renderEditableField('revenue', '', fmt(revenue), true)}
        </div>

        {/* Costs */}
        <div className="border border-gray-200 p-4">
          <p className="text-[10px] font-bold text-gray-700 uppercase mb-2">Costs</p>
          <div className="space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <EntityBadge jo={jo} />
            </div>
            {isVendor
              ? renderEditableField('purchasePrice', 'Purchase Price', fmt(purchasePrice), true)
              : renderEditableField('driverSharePct', 'Driver Share (%)', `${driverSharePct}%`, true)
            }
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-700">Extra Costs</span>
              <span className="text-xs text-gray-600">—</span>
            </div>
            <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
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
              <p className={`text-base font-bold mt-0.5 ${grossProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmt(grossProfit)}</p>
            </div>
            <div className="flex items-center gap-1">
              {grossProfit >= 0 ? <TrendingUp size={18} className="text-emerald-500" /> : <TrendingDown size={18} className="text-red-500" />}
              <span className={`text-sm font-bold ${grossProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{margin.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* COL 2: Payment & Actions */}
      <div className="space-y-5">
        {/* Advance */}
        {renderEditableField('advance', `Advance (${isVendor ? 'Vendor DP' : 'Driver'})`, fmt(advanceAmount), true)}

        {/* Payment rows from job_order_payments */}
        {renderPaymentRow(showAdvance, isVendor ? 'Vendor DP' : 'Driver Advance', advanceAmount)}

        {renderPaymentRow(showPelunasan, isVendor ? 'Vendor Pelunasan' : 'Driver Pelunasan', pelunasanAmount)}

        {/* Summary */}
        <div className="border border-gray-200 p-4">
          <p className="text-[10px] font-bold text-gray-700 uppercase mb-2">Payment Summary</p>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-gray-600">Target</span>
              <span className="font-semibold text-gray-900">{fmt(directCost)}</span>
            </div>
            <div className="flex justify-between items-center text-[11px]">
              <span className="text-gray-600">Total Dibayar</span>
              <span className="font-semibold text-emerald-600">{fmt(totalPaid)}</span>
            </div>
            {!isLunas && (
              <div className="flex justify-between items-center text-[11px]">
                <span className="text-gray-600">Sisa</span>
                <span className="font-semibold text-red-600">{fmt(sisa)}</span>
              </div>
            )}
            <div className={`pt-1.5 border-t border-gray-200 flex items-center justify-between text-[10px] font-bold uppercase ${isLunas ? 'text-emerald-700' : isPartial ? 'text-amber-700' : 'text-gray-400'}`}>
              <span>Status</span>
              <span>{isLunas ? '✓ Lunas' : isPartial ? 'Partial' : 'Belum'}</span>
            </div>
          </div>
        </div>

        {/* Payment History */}
        {payments.length > 0 && (
          <div className="border border-gray-200 p-4">
            <p className="text-[10px] font-bold text-gray-700 uppercase mb-2">Payment History</p>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {payments.map(p => (
                <div key={p.id} className="flex items-center justify-between border-b border-gray-100 pb-1.5 last:border-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full ${p.status === 'verified' ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                    <div>
                      <p className="text-[10px] font-semibold text-gray-900 uppercase">{p.payment_type.replace(/_/g, ' ')}</p>
                      <p className="text-[9px] text-gray-500">{p.paid_by === 'hq' ? 'HQ' : 'SBU'} • {new Date(p.paid_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900">{fmt(p.amount)}</span>
                    {p.transfer_proof_url && (
                      <a href={p.transfer_proof_url} target="_blank" className="text-gray-400 hover:text-gray-900" title="Lihat Bukti">
                        <Eye size={12} />
                      </a>
                    )}
                    {mode === 'hq' && !p.transfer_proof_url && (
                      <button onClick={() => onUploadProof?.(p.id)} disabled={uploading === p.id} className="text-gray-400 hover:text-gray-900" title="Upload Bukti">
                        {uploading === p.id ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                      </button>
                    )}
                    {mode === 'hq' && p.status !== 'verified' && p.transfer_proof_url && (
                      <button onClick={() => onVerify?.(p.id)} className="text-gray-400 hover:text-emerald-600" title="Verifikasi">
                        <CheckSquare size={12} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Cost Account */}
        <div className="border border-gray-200 p-4">
          <p className="text-[10px] font-bold text-gray-700 uppercase mb-1">Cost Account</p>
          <p className="text-sm font-semibold text-gray-900">
            {isVendor ? '5-50020 HPP Jasa Vendor' : '5-50010 Beban Bagi Hasil Driver'}
          </p>
        </div>
      </div>
    </div>
  );
}
