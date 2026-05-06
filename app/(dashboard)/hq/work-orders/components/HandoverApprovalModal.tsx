'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { X, CheckCircle2, XCircle, Loader2, Truck, User, Info, MapPin, ChevronRight } from 'lucide-react';
import { toast } from 'react-hot-toast';

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
  const [rejectionNote, setRejectionNote] = useState('');

  useEffect(() => {
    const fetchPendingJOs = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('job_orders')
        .select(`
          *,
          md_fleets:fleet_id(plate_number, md_fleet_types(type_name)),
          md_drivers:driver_id(name),
          md_entities:transporter_id(name)
        `)
        .eq('status', 'pending_handover')
        .in('wo_item_id', wo.wo_items.map((i: any) => i.id));

      if (error) {
        toast.error("Failed to fetch pending JOs");
      } else {
        setPendingJOs(data || []);
      }
      setLoading(false);
    };

    fetchPendingJOs();
  }, [wo]);

  const handleAction = async (isApprove: boolean) => {
    setProcessing(true);
    const now = new Date().toISOString();
    const actor = profile?.name || 'Unknown User';

    try {
      if (isApprove) {
        // 1. Update Job Orders
        const { error: joError } = await supabase
          .from('job_orders')
          .update({ status: 'assigned' })
          .in('id', pendingJOs.map(jo => jo.id));
        if (joError) throw joError;

        // 2. Update Fleet/Driver Status
        const fleetIds = pendingJOs.map(jo => jo.fleet_id);
        const driverIds = pendingJOs.map(jo => jo.driver_id);
        
        const { error: fError } = await supabase.from('md_fleets').update({ status: 'on_road' }).in('id', fleetIds);
        if (fError) throw fError;
        const { error: dError } = await supabase.from('md_drivers').update({ status: 'on_duty' }).in('id', driverIds);
        if (dError) throw dError;

        // 3. Update WO Items status
        const woItemIds = Array.from(new Set(pendingJOs.map(jo => jo.wo_item_id)));
        const { error: itemsError } = await supabase.from('wo_items').update({ 
          status: 'assigned',
          handover_requested: false,
          handover_status: 'approved',
          item_data: {
            ...wo.wo_items[0]?.item_data,
            milestones: {
              ...(wo.wo_items[0]?.item_data?.milestones || {}),
              approved: now,
              approved_by: actor
            }
          }
        }).in('id', woItemIds);
        if (itemsError) throw itemsError;

        // 4. Update Work Order header status
        const { error: woError } = await supabase.from('work_orders').update({ 
          status: 'in_progress',
          updated_at: now
        }).eq('id', wo.id);
        if (woError) throw woError;

        toast.success("Handover Approved! Job Orders are now active.");
      } else {
        // REJECT
        if (!rejectionNote.trim()) {
          toast.error("Please provide a reason for rejection");
          setProcessing(false);
          return;
        }

        // 1. Update Fleet/Driver back to available
        const fleetIds = pendingJOs.map(jo => jo.fleet_id);
        const driverIds = pendingJOs.map(jo => jo.driver_id);
        
        await supabase.from('md_fleets').update({ status: 'available' }).in('id', fleetIds);
        await supabase.from('md_drivers').update({ status: 'available' }).in('id', driverIds);

        // 2. Delete pending JOs
        if (pendingJOs.length > 0) {
          await supabase.from('job_orders').delete().in('id', pendingJOs.map(jo => jo.id));
        }

        // 3. Revert ALL pending WO items back to handover_rejected
        const { error: itemsError } = await supabase.from('wo_items').update({ 
          status: 'handover_rejected',
          handover_requested: false,
          handover_status: 'rejected',
          item_data: {
            ...wo.wo_items[0]?.item_data,
            rejection_note: rejectionNote,
            milestones: {
              ...(wo.wo_items[0]?.item_data?.milestones || {}),
              rejected: now,
              rejected_by: actor
            }
          }
        }).eq('wo_id', wo.id).eq('status', 'handover_pending');

        if (itemsError) throw itemsError;

        // 4. Update Work Order header to handover_rejected
        const { error: woUpdateError } = await supabase.from('work_orders').update({ 
          status: 'handover_rejected',
          notes: `Rejected by ${actor}: ${rejectionNote}` 
        }).eq('id', wo.id);

        if (woUpdateError) throw woUpdateError;

        toast.success("Handover Rejected. SBU notified.");
      }
      onSuccess();
    } catch (err: any) {
      toast.error("Operation failed: " + err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <Card className="w-full max-w-3xl overflow-hidden shadow-2xl border-none !rounded-[2.5rem] p-0">
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-orange-500 text-white rounded-[1.25rem] flex items-center justify-center shadow-lg shadow-orange-500/20 animate-pulse">
              <Info size={24} />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 italic uppercase tracking-tight">Review Handover Request</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{wo.wo_number}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-full transition-colors">
            <X size={20} className="text-slate-400" />
          </button>
        </div>

        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto bg-slate-50/50">
          <div className="bg-amber-50 border border-amber-200 p-6 rounded-[2rem] space-y-2">
            <h3 className="text-sm font-black text-amber-900 uppercase tracking-widest flex items-center gap-2">
               <Info size={16} /> SBU Notification
            </h3>
            <p className="text-sm text-amber-800 font-medium leading-relaxed italic">
              "SBU trucking can only fulfill {pendingJOs.length} units at this time. They are requesting handover for the remaining units back to CS."
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-4">Assigned Units for Approval</h4>
            {loading ? (
              <div className="py-12 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto text-slate-300" /></div>
            ) : (
              pendingJOs.map((jo, idx) => (
                <div key={jo.id} className="bg-white border border-slate-100 p-6 rounded-[2rem] flex flex-col md:flex-row gap-6 items-center shadow-sm">
                   <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-black text-slate-400 text-xs">#{idx + 1}</div>
                   <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded uppercase tracking-widest">{jo.md_entities?.name}</span>
                        <span className="text-sm font-black text-slate-900">{jo.md_fleets?.plate_number}</span>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-bold text-slate-400 uppercase tracking-widest">
                         <span className="flex items-center gap-1.5"><Truck size={14} /> {jo.md_fleets?.md_fleet_types?.type_name}</span>
                         <span className="flex items-center gap-1.5"><User size={14} /> {jo.md_drivers?.name}</span>
                      </div>
                   </div>
                   <div className="md:text-right">
                      <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest block">Status</span>
                      <span className="text-xs font-black italic">Waiting Approval</span>
                   </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="p-8 bg-white border-t border-slate-100 space-y-4">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Rejection Remarks (Mandatory for Reject)</label>
            <textarea 
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="Explain why this handover is being rejected..."
              className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-sm font-bold focus:outline-none focus:ring-4 focus:ring-rose-500/5 transition-all min-h-[120px] resize-none"
            />
          </div>
        </div>

        <div className="p-8 border-t border-slate-100 flex items-center justify-between bg-white">
          <button
            onClick={() => handleAction(false)}
            disabled={processing}
            className="flex items-center gap-3 px-8 py-4 text-rose-600 hover:bg-rose-50 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 border border-rose-100"
          >
            <XCircle size={18} /> Reject Handover
          </button>

          <button
            onClick={() => handleAction(true)}
            disabled={processing}
            className="flex items-center gap-3 px-10 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl shadow-xl shadow-emerald-500/20 font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-95 group"
          >
            {processing ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} className="group-hover:scale-110 transition-transform" />}
            Approve Handover
          </button>
        </div>
      </Card>
    </div>
  );
}
