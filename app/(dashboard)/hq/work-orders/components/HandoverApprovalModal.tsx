'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { 
  X, CheckCircle2, XCircle, Loader2, Truck, User, Info, MapPin, 
  ChevronRight, Calendar, Clock, Package, Layers, MessageSquare,
  Building2, FileText, ArrowRight, AlertTriangle, Shield, Lock
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import { sendNotification } from '@/lib/supabase/notifications';

interface HandoverApprovalModalProps {
  wo: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function HandoverApprovalModal({ wo, onClose, onSuccess }: HandoverApprovalModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [pendingJOs, setPendingJOs] = useState<any[]>([]);
  const [allItemJOs, setAllItemJOs] = useState<any[]>([]);
  const [rejectionNote, setRejectionNote] = useState('');

  // [AI] Extract handover items - items with handover_pending status
  const handoverItems = (wo.wo_items || []).filter((i: any) => i.status === 'handover_pending');
  const allItems = wo.wo_items || [];

  useEffect(() => {
    const fetchHandoverData = async () => {
      setLoading(true);
      try {
        // [AI] Fetch ALL job orders for this WO's items (not just handover_pending)
        // so we can show both assigned and pending ones for context
        const itemIds = allItems.map((i: any) => i.id);
        
        if (itemIds.length === 0) {
          setLoading(false);
          return;
        }

        const { data: jos, error } = await supabase
          .from('job_orders')
          .select(`
            *,
            md_fleets:fleet_id(plate_number, md_fleet_types(type_name)),
            md_entities:transporter_id(name)
          `)
          .in('wo_item_id', itemIds);

        if (error) {
          console.error("[HandoverModal] Error fetching JOs:", { code: error.code, message: error.message, details: error.details, hint: error.hint });
          toast.error("Failed to fetch job orders");
          setLoading(false);
          return;
        }

        // Fetch driver names separately (due to RLS complexity)
        if (jos && jos.length > 0) {
          const driverIds = jos.map(j => j.driver_id).filter(Boolean);
          if (driverIds.length > 0) {
            const { data: driverData, error: dError } = await supabase
              .from('md_drivers')
              .select('id, name, phone')
              .in('id', driverIds);
            
            if (dError) {
              console.error("Error fetching drivers:", { code: dError.code, message: dError.message });
            } else {
              const driverMap = Object.fromEntries((driverData || []).map(d => [d.id, d]));
              const enrichedJOs = jos.map(j => ({
                ...j,
                md_drivers: driverMap[j.driver_id]
              }));
              
              const handoverItemIds = handoverItems.map((i: any) => i.id);
              const pending = enrichedJOs.filter(j => handoverItemIds.includes(j.wo_item_id) && j.fleet_id && j.driver_id);
              
              setAllItemJOs(enrichedJOs);
              setPendingJOs(pending);
              setLoading(false);
              return;
            }
          }
        }
        
        const handoverItemIds = handoverItems.map((i: any) => i.id);
        const pending = (jos || []).filter(j => handoverItemIds.includes(j.wo_item_id) && j.fleet_id && j.driver_id);
        setAllItemJOs(jos || []);
        setPendingJOs(pending);
      } catch (err: any) {
        console.error("Handover Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchHandoverData();
  }, [wo]);

  const handleAction = async (isApprove: boolean) => {
    setProcessing(true);
    const now = new Date().toISOString();
    const actor = profile?.full_name || 'Unknown User';

    try {
      if (isApprove) {
        // 1. Update Job Orders
        const { error: joError } = await supabase
          .from('job_orders')
          .update({ status: 'assigned' })
          .in('id', pendingJOs.map(jo => jo.id));
        if (joError) throw joError;

        // 2. Update Fleet/Driver Status
        const fleetIds = pendingJOs.map(jo => jo.fleet_id).filter(Boolean);
        const driverIds = pendingJOs.map(jo => jo.driver_id).filter(Boolean);
        
        if (fleetIds.length > 0) {
          const { error: fError } = await supabase.from('md_fleets').update({ status: 'on_road' }).in('id', fleetIds);
          if (fError) throw fError;
        }
        if (driverIds.length > 0) {
          await Promise.all(driverIds.map(async (id) => {
            const res = await fetch(`/api/tenant/master/drivers/${id}/status`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'on_duty' })
            });
            if (!res.ok) {
              const err = await res.json();
              throw new Error(err.error || 'Failed to update driver status');
            }
          }));
        }

        // 3. Update WO Items status
        const woItemIds = Array.from(new Set(pendingJOs.map(jo => jo.wo_item_id)));
        for (const itemId of woItemIds) {
          const item = allItems.find((i: any) => i.id === itemId);
          const currentItemData = typeof item?.item_data === 'string' 
            ? JSON.parse(item.item_data) 
            : (item?.item_data || {});
          
          const itemJOsForThisItem = allItemJOs.filter(jo => jo.wo_item_id === itemId);
          const assignedCountForItem = itemJOsForThisItem.filter(jo => jo.fleet_id && jo.driver_id).length;
          
          // [AI] Set max_jo_count to lock the number of JOs — prevents SBU from creating more
          const { error: itemError } = await supabase.from('wo_items').update({ 
            status: 'assigned',
            item_data: {
              ...currentItemData,
              handover_note: null,
              handover_approved: true,
              handover_approved_at: now,
              handover_approved_by: actor,
              max_jo_count: assignedCountForItem,
              milestones: {
                ...(currentItemData.milestones || {}),
                approved: now,
                approved_by: actor
              }
            }
          }).eq('id', itemId);
          if (itemError) throw itemError;
        }

        // 4. Update Work Order header status
        const { error: woError } = await supabase.from('work_orders').update({ 
          status: 'in_progress',
          updated_at: now
        }).eq('id', wo.id);
        if (woError) throw woError;

        toast.success("Handover Approved! Job Orders are now active.");
        
        // Notify SBU Ops
        await sendNotification(profile?.tenant_id || '', {
          title: 'Handover Approved',
          message: `HQ has approved handover for ${wo.wo_number}`,
          link: `/sbu/trucking/assignments`,
          role: 'SBU_OPS'
        });
      } else {
        // REJECT
        if (!rejectionNote.trim()) {
          toast.error("Please provide a reason for rejection");
          setProcessing(false);
          return;
        }

        // [AI] Collect ALL JOs belonging to the rejected WO items, not just handover_pending ones.
        // JOs keep their original status (pending/assigned) when the wo_item goes to handover_pending,
        // so filtering by jo.status === 'handover_pending' would return nothing.
        const rejectedItemIds = handoverItems.map((i: any) => i.id);
        const josToReject = allItemJOs.filter(jo => rejectedItemIds.includes(jo.wo_item_id) && jo.status !== 'cancelled');

        // 1. Release Fleet/Driver back to available
        const fleetIds = josToReject.map(jo => jo.fleet_id).filter(Boolean);
        const driverIds = josToReject.map(jo => jo.driver_id).filter(Boolean);
        
        if (fleetIds.length > 0) {
          await supabase.from('md_fleets').update({ status: 'available' }).in('id', fleetIds);
        }
        if (driverIds.length > 0) {
          await Promise.all(driverIds.map(async (id) => {
            await fetch(`/api/tenant/master/drivers/${id}/status`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'available' })
            });
          }));
        }
 
        // 2. Flag JOs as rejected (NOT delete — preserve audit trail)
        if (josToReject.length > 0) {
          const { error: joRejectError } = await supabase
            .from('job_orders')
            .update({ status: 'rejected' })
            .in('id', josToReject.map(jo => jo.id));
          if (joRejectError) throw joRejectError;
        }

        // 3. Revert ALL pending WO items back to handover_rejected
        for (const item of handoverItems) {
          const currentItemData = typeof item.item_data === 'string' 
            ? JSON.parse(item.item_data) 
            : (item.item_data || {});
          
          // [AI] Only update status and item_data - handover_requested/handover_status columns don't exist
          const { error: itemError } = await supabase.from('wo_items').update({ 
            status: 'handover_rejected',
            item_data: {
              ...currentItemData,
              rejection_note: rejectionNote,
              milestones: {
                ...(currentItemData.milestones || {}),
                rejected: now,
                rejected_by: actor
              }
            }
          }).eq('id', item.id);
          if (itemError) throw itemError;
        }

        // 4. Update Work Order header to handover_rejected
        const { error: woUpdateError } = await supabase.from('work_orders').update({ 
          status: 'handover_rejected',
          notes: `Rejected by ${actor}: ${rejectionNote}` 
        }).eq('id', wo.id);

        if (woUpdateError) throw woUpdateError;

        toast.success("Handover Rejected. SBU notified.");

        // Notify SBU Ops
        await sendNotification(profile?.tenant_id || '', {
          title: 'Handover Rejected',
          message: `HQ rejected handover for ${wo.wo_number}: ${rejectionNote}`,
          link: `/sbu/trucking/work-orders?status=handover_rejected`,
          role: 'SBU_OPS'
        });
      }
      onSuccess();
    } catch (err: any) {
      toast.error("Operation failed: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  const formatRupiah = (val: number) => {
    if (!val) return '-';
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val);
  };  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md animate-in fade-in duration-300">
      <Card className="w-full max-w-4xl overflow-hidden shadow-2xl border border-slate-100 bg-white !rounded-[2.5rem] p-0">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-orange-50 text-orange-600 border border-orange-100 rounded-[1.5rem] flex items-center justify-center shadow-sm">
              <Shield size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-black italic uppercase tracking-tight">Review Handover</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{wo.wo_number}</span>
                <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{handoverItems.length} Item(s) Pending</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 hover:text-black rounded-2xl transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="max-h-[65vh] overflow-y-auto bg-slate-50/30">
          <div className="p-8 space-y-6">
            
            {/* ── Section 1: Work Order Summary ── */}
            <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-2 h-6 bg-blue-500 rounded-full"></div>
                <h3 className="text-[10px] font-black text-black uppercase tracking-[0.3em]">Work Order Details</h3>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">WO Number</p>
                  <p className="text-sm font-black text-black italic">{wo.wo_number}</p>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Customer</p>
                  <div className="flex items-center gap-2">
                     <Building2 size={12} className="text-blue-500" />
                     <p className="text-sm font-black text-black italic truncate">{wo.md_entities?.name}</p>
                  </div>
                  {wo.md_entities?.legal_name && (
                    <p className="text-[9px] text-slate-500 font-bold mt-0.5 italic">({wo.md_entities.legal_name})</p>
                  )}
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Execution Date</p>
                  <div className="flex items-center gap-2">
                    <Calendar size={12} className="text-blue-500" />
                    <p className="text-sm font-black text-black italic">
                      {wo.execution_date 
                        ? new Date(wo.execution_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) 
                        : '-'}
                    </p>
                  </div>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl">
                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Items</p>
                  <div className="flex items-center gap-2">
                    <Layers size={12} className="text-blue-500" />
                    <p className="text-sm font-black text-black italic">{allItems.length} Item(s)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Section 2: WO Items with Handover Status ── */}
            {handoverItems.map((item: any, itemIdx: number) => {
              const itemData = typeof item.item_data === 'string' ? JSON.parse(item.item_data) : (item.item_data || {});
              const handoverNote = itemData.handover_note || '';
              const handoverRequestedAt = itemData.handover_requested_at;
              const handoverRequestedBy = itemData.handover_requested_by || 'SBU Ops';
              const stops = itemData.stops || [];
              const unitCount = Number(itemData.unit_count) || 1;
              const dealPrice = Number(itemData.deal_price) || 0;
              const vehicleType = itemData.vehicle_type_name || itemData.vehicle_type || '-';
              
              // JOs for this specific item
              const itemJOs = allItemJOs.filter(jo => jo.wo_item_id === item.id && jo.status !== 'cancelled');
              const assignedJOs = itemJOs.filter(jo => jo.driver_id && jo.fleet_id);
              
              return (
                <div key={item.id} className="space-y-4">
                  {/* Item Header */}
                  <div className="bg-white border border-slate-100 rounded-[2rem] p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-2 h-6 bg-orange-500 rounded-full"></div>
                      <h3 className="text-[10px] font-black text-black uppercase tracking-[0.3em]">
                        Item {itemIdx + 1}: {item.item_code}
                      </h3>
                      <span className="ml-auto px-3 py-1 bg-orange-50 text-orange-600 rounded-lg text-[9px] font-black uppercase tracking-widest border border-orange-100">
                        Handover Pending
                      </span>
                    </div>

                    {/* Item Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                      <div className="bg-blue-50 p-3 rounded-xl border border-blue-100">
                        <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-1">Vehicle Type</p>
                        <p className="text-xs font-black text-blue-700 italic">{vehicleType}</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Units Required</p>
                        <p className="text-xs font-black text-black italic">{unitCount} Fleet(s)</p>
                      </div>
                      <div className="bg-slate-50 p-3 rounded-xl">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Deal Price</p>
                        <p className="text-xs font-black text-black italic">{formatRupiah(dealPrice)}</p>
                      </div>
                      <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                        <p className="text-[8px] font-black text-emerald-500 uppercase tracking-widest mb-1">JO Assigned</p>
                        <p className="text-xs font-black text-emerald-700 italic">{assignedJOs.length} / {unitCount}</p>
                      </div>
                    </div>

                    {/* Unit Capacity Summary */}
                    <div className="bg-slate-50 p-4 rounded-2xl mb-5 border border-slate-100">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3">Unit Capacity Overview</p>
                      <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                          <span className="text-xs font-black text-black">{assignedJOs.length} Assigned</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                          <span className="text-xs font-black text-black">{itemJOs.length - assignedJOs.length} Created (Unassigned)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                          <span className="text-xs font-black text-black">{unitCount - itemJOs.length} Empty Slots</span>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-1">
                        {Array.from({ length: unitCount }).map((_, slotIdx) => {
                          const joForSlot = itemJOs[slotIdx];
                          const isAssigned = joForSlot?.fleet_id && joForSlot?.driver_id;
                          const isCreated = !!joForSlot;
                          return (
                            <div
                              key={slotIdx}
                              className={`flex-1 h-2 rounded-full transition-all ${
                                isAssigned ? 'bg-emerald-500' : isCreated ? 'bg-amber-400' : 'bg-rose-200'
                              }`}
                              title={isAssigned ? `Slot ${slotIdx + 1}: Assigned` : isCreated ? `Slot ${slotIdx + 1}: Created but unassigned` : `Slot ${slotIdx + 1}: Empty (will be blocked)`}
                            />
                          );
                        })}
                      </div>
                      {unitCount - itemJOs.length > 0 && (
                        <p className="text-[9px] font-bold text-rose-500 mt-2 italic">
                          ⚠ {unitCount - itemJOs.length} slot(s) kosong akan di-block setelah approval — SBU tidak bisa buat JO baru untuk item ini
                        </p>
                      )}
                    </div>

                    {/* Route Info */}
                    {stops.length > 0 && (
                      <div className="bg-slate-50 p-4 rounded-2xl mb-5">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2">Route</p>
                        <div className="flex flex-wrap items-center gap-2">
                          <MapPin size={14} className="text-rose-500" />
                          {stops.map((stop: any, sIdx: number) => (
                            <span key={sIdx} className="flex items-center text-xs font-black text-black italic">
                              {stop.location_name || stop.name || '-'}
                              {sIdx < stops.length - 1 && (
                                <ArrowRight size={12} className="mx-2 text-slate-400" />
                              )}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* SBU Remarks */}
                    {handoverNote && (
                      <div className="bg-amber-50/50 border border-amber-100 p-5 rounded-2xl">
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 border border-amber-200/50">
                            <MessageSquare size={16} className="text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Remarks from SBU</h4>
                              {handoverRequestedAt && (
                                <span className="text-[9px] font-bold text-amber-500 italic">
                                  {new Date(handoverRequestedAt).toLocaleString('id-ID', { 
                                    day: '2-digit', month: 'short', year: 'numeric',
                                    hour: '2-digit', minute: '2-digit'
                                  })}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-black font-bold leading-relaxed italic">
                              &quot;{handoverNote}&quot;
                            </p>
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-2">
                              — {handoverRequestedBy}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {!handoverNote && (
                      <div className="bg-amber-50/50 border border-amber-100 p-5 rounded-2xl">
                        <div className="flex items-center gap-3">
                          <AlertTriangle size={16} className="text-amber-600 animate-pulse" />
                          <p className="text-sm text-amber-600 font-bold italic">
                            SBU tidak memberikan catatan handover.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Assigned JOs for this item */}
                  <div className="space-y-3 pl-4">
                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] px-2">
                      Job Orders ({itemJOs.length} created / {unitCount} required)
                    </h4>
                    {itemJOs.map((jo, joIdx) => {
                      const joStatusUpper = (jo.status || '').toUpperCase();
                      const isWaitingApproval = !!(jo.fleet_id && jo.driver_id);
                      const hasFleetDriver = jo.fleet_id && jo.driver_id;
                      
                      let statusColor = 'bg-slate-100 text-slate-600 border border-slate-200/50';
                      let statusLabel = jo.status || 'Unknown';
                      if (isWaitingApproval) {
                        statusColor = 'bg-orange-50 text-orange-600 border border-orange-100';
                        statusLabel = 'Waiting Approval';
                      } else if (['ASSIGNED', 'ACTIVE'].includes(joStatusUpper)) {
                        statusColor = 'bg-blue-50 text-blue-600 border border-blue-100';
                        statusLabel = 'Assigned';
                      } else if (joStatusUpper === 'PENDING') {
                        statusColor = 'bg-slate-50 text-slate-500 border border-slate-100';
                        statusLabel = 'Draft';
                      }

                      return (
                        <div 
                          key={jo.id} 
                          className={`bg-white border rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-start md:items-center shadow-sm transition-all ${
                            isWaitingApproval ? 'border-orange-200 bg-orange-50/10' : 'border-slate-100'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] ${
                            isWaitingApproval ? 'bg-orange-500 text-white shadow-sm shadow-orange-500/10' : 'bg-slate-100 text-slate-500'
                          }`}>
                            {joIdx + 1}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1.5">
                              {jo.jo_number && (
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                  {jo.jo_number}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap items-center gap-4 text-xs">
                              {/* Transporter */}
                              <span className="flex items-center gap-1.5 font-bold text-black">
                                <Building2 size={13} className="text-blue-500" />
                                {jo.md_entities?.name || '-'}
                              </span>
                              {/* Fleet */}
                              <span className="flex items-center gap-1.5 font-bold text-black">
                                <Truck size={13} className="text-emerald-500" />
                                {jo.md_fleets?.md_fleet_types?.type_name || '-'} — {jo.md_fleets?.plate_number || 'No Plate'}
                              </span>
                              {/* Driver */}
                              <span className="flex items-center gap-1.5 font-bold text-black">
                                <User size={13} className="text-violet-500" />
                                {jo.md_drivers?.name || '-'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 flex-shrink-0">
                            {!hasFleetDriver && (
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded-lg text-[8px] font-black uppercase tracking-widest border border-rose-100">
                                Unassigned
                              </span>
                            )}
                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${statusColor}`}>
                              {statusLabel}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Empty slots that will be blocked after approval */}
                    {Array.from({ length: unitCount - itemJOs.length }).map((_, emptyIdx) => {
                      const slotNum = itemJOs.length + emptyIdx + 1;
                      return (
                        <div
                          key={`empty-${emptyIdx}`}
                          className="bg-rose-50/50 border border-rose-100 rounded-2xl p-5 flex flex-col md:flex-row gap-4 items-start md:items-center"
                        >
                          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-[10px] bg-rose-100 text-rose-500">
                            <Lock size={14} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black text-rose-600 italic">Slot {slotNum} — Empty (No JO Created)</p>
                            <p className="text-[9px] text-rose-400 font-bold mt-0.5">Will be permanently blocked after approval</p>
                          </div>
                          <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-rose-100 text-rose-600 border border-rose-200">
                            BLOCKED
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Rejection Input */}
          <div className="p-8 bg-white border-t border-slate-100 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">
              Rejection Remarks (Mandatory for Reject)
            </label>
            <textarea 
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="Explain why this handover is being rejected..."
              className="w-full p-6 bg-slate-50 border border-slate-200 text-black rounded-[2rem] text-sm font-bold focus:outline-none focus:ring-4 focus:ring-rose-500/20 transition-all min-h-[100px] resize-none placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-slate-100 flex items-center justify-between bg-white">
          <button
            onClick={() => handleAction(false)}
            disabled={processing}
            className="flex items-center gap-3 px-8 py-4 text-rose-600 hover:bg-rose-50 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 border border-rose-200 disabled:opacity-50"
          >
            <XCircle size={18} /> Reject Handover
          </button>

          <button
            onClick={() => handleAction(true)}
            disabled={processing || pendingJOs.length === 0}
            className="flex items-center gap-3 px-10 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-500/20 font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 group disabled:opacity-50"
          >
            {processing ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />}
            Approve Handover ({pendingJOs.length} JO)
          </button>
        </div>
      </Card>
    </div>
  );
}
