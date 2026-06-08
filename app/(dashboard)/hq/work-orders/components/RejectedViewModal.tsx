'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Card } from '@/components/ui/Card';
import { X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface RejectedViewModalProps {
  wo: any;
  onClose: () => void;
}

export default function RejectedViewModal({ wo, onClose }: RejectedViewModalProps) {
  const [loading, setLoading] = useState(true);
  const [allItemJOs, setAllItemJOs] = useState<any[]>([]);

  const allItems = wo.wo_items || [];

  useEffect(() => {
    const fetchJOs = async () => {
      setLoading(true);
      try {
        const itemIds = allItems.map((i: any) => i.id);
        if (itemIds.length === 0) { setLoading(false); return; }

        const { data: jos, error } = await supabase
          .from('job_orders')
          .select(`
            *,
            md_fleets:fleet_id(plate_number, md_fleet_types(type_name)),
            md_entities:transporter_id(name)
          `)
          .in('wo_item_id', itemIds);

        if (error) {
          console.error("[RejectedViewModal] Error:", error);
          toast.error("Failed to fetch job orders");
          setLoading(false);
          return;
        }

        if (jos && jos.length > 0) {
          const driverIds = jos.map(j => j.driver_id).filter(Boolean);
          if (driverIds.length > 0) {
            const { data: driverData } = await supabase
              .from('md_drivers')
              .select('id, name, phone')
              .in('id', driverIds);
            if (driverData) {
              const driverMap = Object.fromEntries(driverData.map(d => [d.id, d]));
              setAllItemJOs(jos.map(j => ({ ...j, md_drivers: driverMap[j.driver_id] })));
              setLoading(false);
              return;
            }
          }
        }
        setAllItemJOs(jos || []);
      } catch (err) {
        console.error("RejectedViewModal Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchJOs();
  }, [wo]);

  // [AI] Gather data from all items for the formal document
  const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }) : '-';
  const formatDateTime = (d: string) => d ? new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-';

  // Collect handover + rejection data from all items
  const itemDetails = allItems.map((item: any) => {
    const d = typeof item.item_data === 'string' ? JSON.parse(item.item_data) : (item.item_data || {});
    const stops = d.stops || [];
    const route = stops.map((s: any) => s.location_name || s.name || '-').join(' → ');
    const unitCount = Number(d.unit_count) || 1;
    const vehicleType = d.vehicle_type_name || d.vehicle_type || '-';
    const handoverNote = d.handover_note || '';
    const handoverBy = d.handover_requested_by || '-';
    const handoverAt = d.handover_requested_at || '';
    const rejectionNote = d.rejection_note || '';
    const milestones = d.milestones || {};
    const rejectedBy = milestones.rejected_by || '-';
    const rejectedAt = milestones.rejected || '';
    const itemJOs = allItemJOs.filter(jo => jo.wo_item_id === item.id && jo.status !== 'cancelled');
    const assignedJOs = itemJOs.filter(jo => jo.fleet_id && jo.driver_id);

    return {
      itemCode: item.item_code,
      vehicleType,
      route: route || '-',
      unitCount,
      assignedCount: assignedJOs.length,
      assignedJOs,
      handoverNote,
      handoverBy,
      handoverAt,
      rejectionNote,
      rejectedBy,
      rejectedAt,
      isRejected: item.status === 'handover_rejected',
    };
  });

  const customerName = wo.md_entities?.legal_name || wo.md_entities?.name || '-';
  const totalOrdered = itemDetails.reduce((a: number, b: any) => a + b.unitCount, 0);
  const totalAssigned = itemDetails.reduce((a: number, b: any) => a + b.assignedCount, 0);  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <div className="w-full max-w-3xl overflow-hidden bg-white rounded-[2.5rem] shadow-2xl border border-slate-100">

        {/* Top Bar */}
        <div className="flex items-center justify-between px-8 py-4 bg-white border-b border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Dokumen Penolakan Handover</p>
          <button onClick={onClose} className="p-2 hover:bg-slate-50 rounded-lg transition-colors">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto bg-slate-50/30">

          {/* Document Body */}
          <div className="px-12 py-10 bg-white border border-slate-100/80 rounded-[2rem] m-6 shadow-sm">

            {/* Document Header */}
            <div className="text-center mb-10 pb-8 border-b-2 border-slate-100">
              <h1 className="text-2xl font-black text-black uppercase tracking-[0.15em]">Laporan Penolakan Handover</h1>
              <p className="text-xs text-slate-400 mt-2 font-medium tracking-wider">SENTRALOGIS — UNIFIED OPERATIONAL MATRIX</p>
            </div>

            {loading ? (
              <div className="py-20 text-center">
                <Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-400 mb-3" />
                <p className="text-xs text-slate-500">Memuat data...</p>
              </div>
            ) : (
              <>
                {/* Section 1: Informasi Work Order */}
                <div className="mb-10">
                  <h2 className="text-[11px] font-black text-black uppercase tracking-[0.2em] mb-5 pb-2 border-b border-slate-100">
                    I. Informasi Work Order
                  </h2>
                  <table className="w-full text-sm">
                    <tbody>
                      <Row label="Nomor WO" value={wo.wo_number} />
                      <Row label="Pelanggan" value={customerName} bold />
                      <Row label="Tanggal Order" value={formatDate(wo.order_date)} />
                      <Row label="Tanggal Eksekusi" value={formatDate(wo.execution_date)} />
                      <Row label="SBU" value="Trucking" />
                    </tbody>
                  </table>
                </div>

                {/* Section 2: Detail Item */}
                {itemDetails.map((item: any, idx: number) => (
                  <div key={idx} className="mb-10">
                    <h2 className="text-[11px] font-black text-black uppercase tracking-[0.2em] mb-5 pb-2 border-b border-slate-100">
                      II. Detail Order — {item.itemCode}
                    </h2>
                    <table className="w-full text-sm">
                      <tbody>
                        <Row label="Tipe Kendaraan" value={item.vehicleType} />
                        <Row label="Rute" value={item.route} />
                        <Row label="Jumlah Order" value={`${item.unitCount} unit`} />
                        <Row label="SBU Assigned" value={`${item.assignedCount} dari ${item.unitCount} unit`} />
                      </tbody>
                    </table>

                    {/* Assigned Units Table */}
                    {item.assignedJOs.length > 0 && (
                      <div className="mt-5">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-3">Unit yang Di-assign</p>
                        <table className="w-full text-xs border border-slate-100 rounded-lg overflow-hidden">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                              <th className="text-left py-2.5 px-4 font-black text-slate-500 uppercase tracking-wider text-[10px]">No</th>
                              <th className="text-left py-2.5 px-4 font-black text-slate-500 uppercase tracking-wider text-[10px]">Transporter</th>
                              <th className="text-left py-2.5 px-4 font-black text-slate-500 uppercase tracking-wider text-[10px]">Armada</th>
                              <th className="text-left py-2.5 px-4 font-black text-slate-500 uppercase tracking-wider text-[10px]">Sopir</th>
                            </tr>
                          </thead>
                          <tbody>
                            {item.assignedJOs.map((jo: any, jIdx: number) => (
                              <tr key={jo.id} className="border-b border-slate-100 last:border-0 bg-white">
                                <td className="py-2.5 px-4 text-slate-400">{jIdx + 1}</td>
                                <td className="py-2.5 px-4 text-black font-bold">{jo.md_entities?.name || '-'}</td>
                                <td className="py-2.5 px-4 text-black">
                                  {jo.md_fleets?.md_fleet_types?.type_name || '-'} — {jo.md_fleets?.plate_number || '-'}
                                </td>
                                <td className="py-2.5 px-4 text-black">{jo.md_drivers?.name || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))}

                {/* Section 3: Handover dari SBU */}
                <div className="mb-10">
                  <h2 className="text-[11px] font-black text-black uppercase tracking-[0.2em] mb-5 pb-2 border-b border-slate-100">
                    III. Handover dari SBU
                  </h2>
                  {itemDetails.filter((it: any) => it.handoverNote || it.handoverAt).length > 0 ? (
                    itemDetails.filter((it: any) => it.handoverNote || it.handoverAt).map((item: any, idx: number) => (
                      <div key={idx} className="mb-5 last:mb-0">
                        {itemDetails.length > 1 && (
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{item.itemCode}</p>
                        )}
                        <table className="w-full text-sm">
                          <tbody>
                            <Row label="Diajukan oleh" value={item.handoverBy} />
                            <Row label="Tanggal & Waktu" value={item.handoverAt ? formatDateTime(item.handoverAt) : '-'} />
                          </tbody>
                        </table>
                        <div className="mt-3 bg-amber-50 border-l-4 border-amber-500 p-4 rounded-r-lg">
                          <p className="text-[10px] font-bold text-amber-600 uppercase tracking-wider mb-1">Alasan Handover</p>
                          <p className="text-sm text-black font-bold leading-relaxed italic">
                            &ldquo;{item.handoverNote || 'Tidak ada keterangan.'}&rdquo;
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400 italic">Tidak ada catatan handover dari SBU.</p>
                  )}
                </div>

                {/* Section 4: Respon CS / HQ */}
                <div className="mb-10">
                  <h2 className="text-[11px] font-black text-black uppercase tracking-[0.2em] mb-5 pb-2 border-b border-slate-100">
                    IV. Respon Customer Service
                  </h2>
                  {itemDetails.filter((it: any) => it.isRejected).length > 0 ? (
                    itemDetails.filter((it: any) => it.isRejected).map((item: any, idx: number) => (
                      <div key={idx} className="mb-5 last:mb-0">
                        {itemDetails.length > 1 && (
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{item.itemCode}</p>
                        )}
                        <table className="w-full text-sm">
                          <tbody>
                            <Row label="Respon" value="DITOLAK" valueClassName="text-rose-600 font-black" />
                            <Row label="Ditolak oleh" value={item.rejectedBy} />
                            <Row label="Tanggal & Waktu" value={item.rejectedAt ? formatDateTime(item.rejectedAt) : '-'} />
                          </tbody>
                        </table>
                        <div className="mt-3 bg-rose-50 border-l-4 border-rose-500 p-4 rounded-r-lg">
                          <p className="text-[10px] font-bold text-rose-600 uppercase tracking-wider mb-1">Alasan Penolakan</p>
                          <p className="text-sm text-black font-bold leading-relaxed italic">
                            &ldquo;{item.rejectionNote || 'Tidak ada alasan penolakan.'}&rdquo;
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400 italic">Tidak ada item yang ditolak.</p>
                  )}
                </div>

                {/* WO-level notes */}
                {wo.notes && (
                  <div className="mb-10">
                    <h2 className="text-[11px] font-black text-black uppercase tracking-[0.2em] mb-5 pb-2 border-b border-slate-100">
                      V. Catatan Tambahan
                    </h2>
                    <div className="bg-slate-50 border-l-4 border-slate-400 p-4 rounded-r-lg">
                      <p className="text-sm text-black font-bold leading-relaxed italic">{wo.notes}</p>
                    </div>
                  </div>
                )}

                {/* Document Footer */}
                <div className="mt-12 pt-6 border-t-2 border-slate-100 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">Dicetak secara otomatis oleh sistem</p>
                    <p className="text-[9px] text-slate-400 font-medium mt-0.5">{new Date().toLocaleString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">Sentralogis v2.5</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="px-8 py-4 border-t border-slate-100 flex items-center justify-end bg-white">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-slate-50 hover:bg-slate-100 text-black rounded-xl text-xs font-bold uppercase tracking-widest transition-all active:scale-95 border border-slate-200"
          >
            Tutup Dokumen
          </button>
        </div>
      </div>
    </div>
  );
}

// [AI] Reusable table row component for formal document layout
function Row({ label, value, bold, valueClassName }: { label: string; value: string; bold?: boolean; valueClassName?: string }) {
  return (
    <tr className="border-b border-slate-100/55">
      <td className="py-2.5 pr-6 text-slate-400 font-medium w-[180px] align-top">{label}</td>
      <td className="py-2.5 text-slate-400 w-[10px] align-top">:</td>
      <td className={`py-2.5 pl-3 align-top ${valueClassName || (bold ? 'text-black font-bold' : 'text-black font-medium')}`}>
        {value}
      </td>
    </tr>
  );
}
