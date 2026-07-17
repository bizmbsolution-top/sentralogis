'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { X, Send, Truck, MapPin, Hash, Building2, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { buildVendorInquiryMessage, buildWaLink } from '@/lib/domain/phone';

interface VendorSendItem {
  id: string;
  item_code: string;
  item_data: {
    vehicle_type_name?: string;
    unit_count?: number;
    shipper_name?: string;
    recipient_name?: string;
    [key: string]: unknown;
  };
  job_orders?: { id: string }[];
}

interface VendorSendBoxProps {
  open: boolean;
  onClose: () => void;
  woNumber: string;
  tenantName: string;
  items: VendorSendItem[];
}

export default function VendorSendBox({
  open,
  onClose,
  woNumber,
  tenantName,
  items,
}: VendorSendBoxProps) {
  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [budget, setBudget] = useState<string>('');

  const countAssigned = (jobOrders?: { transporter_id?: string | null; transporter?: unknown }[]): number => {
    return (jobOrders || []).filter(
      (jo) => Boolean(jo.transporter_id) || Boolean(jo.transporter)
    ).length;
  };

  const activeItems = (items || []).filter((it) => {
    const unitCount = Number(it.item_data?.unit_count) || 1;
    const assigned = countAssigned(it.job_orders as any);
    return assigned < unitCount;
  });

  useEffect(() => {
    if (!open) return;
    if (activeItems.length > 0) {
      setSelectedItemId((prev) => activeItems.some((i) => i.id === prev) ? prev : activeItems[0].id);
    } else {
      setSelectedItemId('');
    }
    setBudget('');
  }, [open, activeItems]);

  if (!open) return null;

  const selectedItem = activeItems.find((i) => i.id === selectedItemId) || activeItems[0];

  if (!selectedItem) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <Card className="w-full max-w-md p-6 text-center">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={24} />
          </div>
          <p className="text-sm font-semibold text-slate-900">All JO Assigned</p>
          <p className="text-xs text-slate-500 mt-1">
            Seluruh JO pada WO {woNumber} sudah di-assign ke vendor. Tidak ada unit tersisa untuk di-broadcast.
          </p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg text-xs font-bold"
          >
            Tutup
          </button>
        </Card>
      </div>
    );
  }

  const itemData = selectedItem.item_data || {};
  const unitCount = Number(itemData.unit_count) || 1;
  const assigned = countAssigned(selectedItem.job_orders as any);
  const remaining = Math.max(0, unitCount - assigned);
  const vehicleType = itemData.vehicle_type_name || '-';
  const origin = (itemData.shipper_name as string) || '-';
  const destination = (itemData.recipient_name as string) || '-';

  const budgetNum = Number(budget.replace(/\D/g, '')) || 0;

  const handleSend = () => {
    const message = buildVendorInquiryMessage({
      woNumber,
      tenantName,
      vehicleType,
      qty: remaining,
      origin,
      destination,
      budgetPerUnit: budgetNum,
    });
    // Open WA Web with empty number so admin picks/searches the vendor manually
    window.open(buildWaLink('', message), '_blank');
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <Card className="w-full max-w-lg shadow-2xl border-none overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
              <Send size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Send to Vendor (WhatsApp)</h3>
              <p className="text-xs text-slate-400">Broadcast order ke vendor trucking</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {activeItems.length > 1 && (
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                Pilih Item WO
              </label>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
              >
                {activeItems.map((it) => {
                  const uc = Number(it.item_data?.unit_count) || 1;
                  const rem = Math.max(0, uc - (it.job_orders || []).length);
                  return (
                    <option key={it.id} value={it.id}>
                      {it.item_code} — {(it.item_data?.vehicle_type_name as string) || 'Truck'} (sisa {rem})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <ReadOnlyField icon={<Hash size={12} />} label="WO ID" value={woNumber} />
            <ReadOnlyField icon={<Building2 size={12} />} label="Tenant" value={tenantName} />
            <ReadOnlyField icon={<Truck size={12} />} label="Type Truck" value={vehicleType} />
            <ReadOnlyField icon={<Hash size={12} />} label="Jumlah (sisa)" value={`${remaining} unit`} />
          </div>

          <ReadOnlyField
            icon={<MapPin size={12} />}
            label="Route"
            value={`${origin} → ${destination}`}
          />

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              Budget Harga Vendor (per unit)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rp</span>
              <input
                type="text"
                inputMode="numeric"
                value={budget}
                onChange={(e) => setBudget(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="1.500.000"
                className="w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/10"
              />
            </div>
            {budgetNum > 0 && (
              <p className="text-[10px] text-slate-400 mt-1">
                Rp {budgetNum.toLocaleString('id-ID')} / unit
              </p>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-xs font-bold"
          >
            Batal
          </button>
          <button
            onClick={handleSend}
            className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-2"
          >
            <Send size={14} /> Send (buka WA Web)
          </button>
        </div>
      </Card>
    </div>
  );
}

function ReadOnlyField({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 flex items-center gap-1">
        {icon} {label}
      </p>
      <p className="text-[11px] font-black text-slate-900 uppercase truncate">{value}</p>
    </div>
  );
}
