'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { X, Send, Calendar, Clock, Hash, Truck, Users, UserCheck } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { buildGroundStaffNotificationMessage, buildWaLink } from '@/lib/domain/phone';
import { supabase } from '@/lib/supabase/client';

interface GroundStaffSendBoxProps {
  open: boolean;
  onClose: () => void;
  woNumber: string;
  tenantName: string;
  executionDate: string;
  executionTime: string;
  tenantId: string;
  jobOrderIds?: string[];
  origin?: string;
  destination?: string;
  truckCount?: number;
}

export default function GroundStaffSendBox({
  open,
  onClose,
  woNumber,
  tenantName,
  executionDate,
  executionTime,
  tenantId,
  jobOrderIds,
  origin,
  destination,
  truckCount,
}: GroundStaffSendBoxProps) {
  const [staff, setStaff] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStaffIds, setSelectedStaffIds] = useState<string[]>([]);
  const [pic1StaffId, setPic1StaffId] = useState<string>('');
  const [pic2StaffId, setPic2StaffId] = useState<string>('');
  const [assigning, setAssigning] = useState(false);

  useEffect(() => {
    if (!open || !tenantId) return;
    setLoading(true);
    supabase
      .from('ground_staff_profiles')
      .select('id, name, phone, is_active')
      .eq('tenant_id', tenantId)
      .eq('is_active', true)
      .order('name')
      .then(({ data }) => {
        setStaff(data || []);
        setSelectedStaffIds((data || []).map((s: any) => s.id));
        setLoading(false);
      });
  }, [open, tenantId]);

  if (!open) return null;

  const toggleStaff = (id: string) => {
    setSelectedStaffIds((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const handleAssignPIC = async () => {
    if (!jobOrderIds || jobOrderIds.length === 0) return;
    setAssigning(true);
    try {
      for (const joId of jobOrderIds) {
        await fetch('/api/ground/assign-pic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            job_order_id: joId,
            pic1_staff_id: pic1StaffId || null,
            pic2_staff_id: pic2StaffId || null,
          }),
        });
      }
    } catch (err) {
      console.error('[Ground SendBox] Assign PIC error:', err);
    }
    setAssigning(false);
  };

  const handleSend = async () => {
    if (jobOrderIds && jobOrderIds.length > 0) {
      await handleAssignPIC();
    }

    const message = buildGroundStaffNotificationMessage({
      woNumber,
      tenantName,
      executionDate: executionDate
        ? new Date(executionDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
        : '-',
      executionTime: executionTime || '-',
      siteName: '',
      origin: origin || '',
      destination: destination || '',
      truckCount: truckCount || 0,
      link: `${window.location.origin}/ground/dashboard?wo=${woNumber}`,
    });

    const staffWithPhone = staff.filter((s) => selectedStaffIds.includes(s.id) && s.phone);

    if (staffWithPhone.length === 0) {
      window.open(buildWaLink('', message), '_blank');
    } else {
      staffWithPhone.forEach((s) => {
        window.open(buildWaLink(s.phone, message), '_blank');
      });
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <Card className="w-full max-w-lg shadow-2xl border-none overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center">
              <Users size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Send to Ground Staff</h3>
              <p className="text-xs text-slate-400">Notifikasi WA + assign PIC ke ground staff</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-slate-100 rounded-lg">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <ReadOnlyField icon={<Hash size={12} />} label="WO" value={woNumber} />
            <ReadOnlyField icon={<Calendar size={12} />} label="Tanggal" value={
              executionDate
                ? new Date(executionDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                : '-'
            } />
            <ReadOnlyField icon={<Clock size={12} />} label="Jam" value={executionTime || '-'} />
            <ReadOnlyField icon={<Truck size={12} />} label="Tenant" value={tenantName} />
          </div>

          {jobOrderIds && jobOrderIds.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <UserCheck size={14} className="text-blue-600" />
                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Assign PIC</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">PIC1 — Gate In (Plat + SIM)</label>
                <select value={pic1StaffId} onChange={(e) => setPic1StaffId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
                  <option value="">Pilih Staff PIC1</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} {s.phone ? `(${s.phone})` : ''}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 mb-1">PIC2 — Gate Out (Dokumen + Plat)</label>
                <select value={pic2StaffId} onChange={(e) => setPic2StaffId(e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none bg-white">
                  <option value="">Pilih Staff PIC2</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} {s.phone ? `(${s.phone})` : ''}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              Ground Staff ({selectedStaffIds.length}/{staff.length})
            </label>
            {loading ? (
              <p className="text-xs text-slate-400 py-2">Memuat data staff...</p>
            ) : staff.length === 0 ? (
              <p className="text-xs text-slate-400 py-2">Belum ada ground staff aktif</p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {staff.map((s) => (
                  <label
                    key={s.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                      selectedStaffIds.includes(s.id)
                        ? 'bg-blue-50 border-blue-200'
                        : 'bg-white border-slate-100 hover:border-slate-200'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedStaffIds.includes(s.id)}
                      onChange={() => toggleStaff(s.id)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">{s.name}</p>
                      <p className="text-[10px] text-slate-400">{s.phone || 'Tanpa nomor HP'}</p>
                    </div>
                  </label>
                ))}
              </div>
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
            disabled={selectedStaffIds.length === 0 || assigning}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg text-xs font-bold flex items-center gap-2"
          >
            <Send size={14} /> {assigning ? 'Menyimpan...' : `Kirim (${selectedStaffIds.length})`}
          </button>
        </div>
      </Card>
    </div>
  );
}

function ReadOnlyField({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 flex items-center gap-1">
        {icon} {label}
      </p>
      <p className="text-[11px] font-black text-slate-900 uppercase truncate">{value}</p>
    </div>
  );
}
