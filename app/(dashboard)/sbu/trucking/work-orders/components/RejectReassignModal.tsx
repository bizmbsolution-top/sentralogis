'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'react-hot-toast';
import { X, AlertTriangle, Truck, User, ArrowRight } from 'lucide-react';

interface RejectReassignModalProps {
  show: boolean;
  jobOrder: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RejectReassignModal({ show, jobOrder, onClose, onSuccess }: RejectReassignModalProps) {
  const [transporters, setTransporters] = useState<any[]>([]);
  const [fleets, setFleets] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedTransporterId, setSelectedTransporterId] = useState('');
  const [selectedFleetId, setSelectedFleetId] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [rejectionNote, setRejectionNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!show || !jobOrder) return;
    fetchTransporters();
  }, [show, jobOrder]);

  useEffect(() => {
    if (selectedTransporterId) fetchFleetsDrivers(selectedTransporterId);
  }, [selectedTransporterId]);

  const fetchTransporters = async () => {
    const { data } = await supabase
      .from('md_entities')
      .select('id, name')
      .eq('entity_type', 'VENDOR')
      .eq('is_active', true)
      .order('name');
    setTransporters(data || []);
  };

  const fetchFleetsDrivers = async (transporterId: string) => {
    const { data: fleetData } = await supabase
      .from('md_fleets')
      .select('id, plate_number, brand, model')
      .eq('entity_id', transporterId)
      .eq('status', 'available')
      .eq('is_active', true)
      .order('plate_number');
    setFleets(fleetData || []);

    const { data: driverData } = await supabase
      .from('md_drivers')
      .select('id, name, phone')
      .eq('entity_id', transporterId)
      .eq('status', 'available')
      .eq('is_active', true)
      .order('name');
    setDrivers(driverData || []);
  };

  const handleSubmit = async () => {
    if (!rejectionReason) {
      toast.error('Pilih alasan reject');
      return;
    }
    if (!selectedTransporterId || !selectedFleetId || !selectedDriverId) {
      toast.error('Pilih transporter, fleet, dan driver baru');
      return;
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.rpc('ops_reject_reassign_jo', {
        p_jo_id: jobOrder.id,
        p_rejection_reason: rejectionReason,
        p_new_transporter_id: selectedTransporterId,
        p_new_fleet_id: selectedFleetId,
        p_new_driver_id: selectedDriverId,
        p_rejection_note: rejectionNote || null,
      });

      if (error) throw error;

      // Auto-push notifications for reassignment
      try {
        if (jobOrder.driver_id) {
          fetch('/api/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              driver_id: jobOrder.driver_id,
              title: '❌ Tugas Dibatalkan',
              body: `JO ${jobOrder.jo_number} telah dialihkan ke driver lain.`,
              tag: `jo-cancel-${jobOrder.id}`
            })
          });
        }

        fetch('/api/push/send', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            driver_id: selectedDriverId,
            title: '🚛 Tugas Baru',
            body: `JO ${jobOrder.jo_number} telah ditugaskan kepada Anda.`,
            tag: `jo-assign-${jobOrder.id}`
          })
        });
      } catch (err) {
        console.error('Failed to send push notifications:', err);
      }

      toast.success('Job berhasil di-reject & reassign ke driver baru');
      onSuccess();
    } catch (err: any) {
      console.error('[RejectReassign] Error:', err);
      toast.error('Gagal: ' + (err.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
    }
  };

  if (!show || !jobOrder) return null;

  const currentDriver = jobOrder.driver?.name || '-';
  const currentTransporter = jobOrder.transporter?.name || '-';
  const currentFleet = jobOrder.fleet?.plate_number || '-';

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <AlertTriangle size={20} className="text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">Reject & Change Assignment</h3>
              <p className="text-xs text-slate-500">JO: {jobOrder.jo_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Current Assignment (Readonly) */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <p className="text-xs font-bold text-slate-500 uppercase mb-2">Assignment Saat Ini</p>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <div>
                <span className="text-slate-400 text-xs">Transporter</span>
                <p className="font-semibold text-slate-800">{currentTransporter}</p>
              </div>
              <div>
                <span className="text-slate-400 text-xs">Fleet</span>
                <p className="font-semibold text-slate-800">{currentFleet}</p>
              </div>
              <div>
                <span className="text-slate-400 text-xs">Driver</span>
                <p className="font-semibold text-slate-800">{currentDriver}</p>
              </div>
            </div>
          </div>

          {/* Rejection Reason */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Alasan Reject *</label>
            <select
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="">Pilih alasan...</option>
              <option value="driver_unavailable">Driver Tidak Aktif</option>
              <option value="truck_unavailable">Armada Rusak/Tidak Available</option>
              <option value="vendor_cancelled">Transporter Membatalkan</option>
              <option value="driver_rejected">Driver Menolak</option>
              <option value="cost_too_high">Biaya Terlalu Tinggi</option>
              <option value="other">Lainnya</option>
            </select>
          </div>

          {/* Rejection Note */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Catatan (opsional)</label>
            <input
              type="text"
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              placeholder="Keterangan tambahan..."
            />
          </div>

          {/* New Assignment */}
          <div className="border-t border-slate-200 pt-4">
            <p className="text-xs font-bold text-slate-500 uppercase mb-3 flex items-center gap-2">
              <ArrowRight size={14} className="text-indigo-500" />
              Assignment Baru
            </p>

            {/* Transporter */}
            <div className="mb-3">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                <Truck size={12} className="inline mr-1" />
                Transporter Baru *
              </label>
              <select
                value={selectedTransporterId}
                onChange={(e) => { setSelectedTransporterId(e.target.value); setSelectedFleetId(''); setSelectedDriverId(''); }}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Pilih transporter...</option>
                {transporters.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>

            {/* Fleet */}
            <div className="mb-3">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                <Truck size={12} className="inline mr-1" />
                Armada Baru *
              </label>
              <select
                value={selectedFleetId}
                onChange={(e) => setSelectedFleetId(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                disabled={!selectedTransporterId}
              >
                <option value="">Pilih armada...</option>
                {fleets.map(f => (
                  <option key={f.id} value={f.id}>{f.plate_number} - {f.brand} {f.model}</option>
                ))}
              </select>
            </div>

            {/* Driver */}
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                <User size={12} className="inline mr-1" />
                Driver Baru *
              </label>
              <select
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full h-10 px-3 bg-white border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                disabled={!selectedTransporterId}
              >
                <option value="">Pilih driver...</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-slate-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            Batal
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !rejectionReason || !selectedTransporterId || !selectedFleetId || !selectedDriverId}
            className="px-5 py-2 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {submitting ? (
              <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
            ) : (
              <AlertTriangle size={14} />
            )}
            Reject & Reassign
          </button>
        </div>
      </div>
    </div>
  );
}
