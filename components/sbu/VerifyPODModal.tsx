'use client';

import React, { useState } from 'react';
import { 
  X, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  Image as ImageIcon,
  Calendar,
  User,
  Truck,
  Download,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
  FileText
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

interface VerifyPODModalProps {
  job: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function VerifyPODModal({ job, onClose, onSuccess }: VerifyPODModalProps) {
  const [loading, setLoading] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const handleVerify = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase
        .from('job_orders')
        .update({ 
          pod_status: 'verified',
          pod_received_at: new Date().toISOString(),
          pod_received_by: user?.id,
          status: 'ready_for_billing' // Transition to ready_for_billing
        })
        .eq('id', job.id);

      if (error) throw error;

      toast.success('POD Berhasil Diverifikasi & Siap Billing!');
      onSuccess();
    } catch (err: any) {
      toast.error('Gagal verifikasi: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason) return toast.error('Berikan alasan penolakan');
    try {
      setLoading(true);
      const { error } = await supabase
        .from('job_orders')
        .update({ 
          pod_status: 'rejected',
          rejection_note: rejectionReason
        })
        .eq('id', job.id);

      if (error) throw error;

      toast.success('POD Ditolak. Driver akan menerima notifikasi.');
      onSuccess();
    } catch (err: any) {
      toast.error('Gagal menolak: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (url: string, filename: string) => {
    try {
      toast.loading('Menyiapkan download...', { id: 'downloading' });
      const response = await fetch(url);
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename || 'POD-Document';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
      toast.success('Download dimulai', { id: 'downloading' });
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Gagal mendownload file. Membuka di tab baru...', { id: 'downloading' });
      window.open(url, '_blank');
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-slate-900 px-8 py-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-emerald-500 p-2.5 rounded-xl text-white shadow-lg shadow-emerald-500/20">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h3 className="text-white font-black text-xl italic uppercase tracking-tight">POD Verification Console</h3>
              <p className="text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em] mt-0.5 italic">{job.jo_number} / Settlement Audit</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={28} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 flex flex-col lg:flex-row gap-8">
          {/* Left: Image Viewer */}
          <div className="lg:w-3/5 space-y-4">
            <div className="relative aspect-[4/3] bg-slate-100 rounded-[2rem] border-4 border-slate-50 overflow-hidden group shadow-inner flex items-center justify-center">
              {job.pod_photo_url ? (
                <>
                  {job.pod_photo_url.toLowerCase().endsWith('.pdf') ? (
                    <div className="flex flex-col items-center gap-4 text-rose-500">
                      <FileText size={64} strokeWidth={1} />
                      <p className="text-[10px] font-black uppercase tracking-widest italic text-slate-400">PDF Document Uploaded</p>
                    </div>
                  ) : (
                    <img 
                      src={job.pod_photo_url} 
                      alt="POD" 
                      className="w-full h-full object-contain"
                    />
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                    <button 
                      className="p-4 bg-white rounded-full text-slate-900 hover:scale-110 transition-transform shadow-xl flex items-center gap-2"
                      onClick={() => downloadFile(job.pod_photo_url, `POD_${job.jo_number}`)}
                    >
                      <Download size={24} />
                      <span className="text-[10px] font-black uppercase pr-2">Download File</span>
                    </button>
                    <a 
                      href={job.pod_photo_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="p-4 bg-white rounded-full text-slate-900 hover:scale-110 transition-transform shadow-xl"
                    >
                      <ExternalLink size={24} />
                    </a>
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-4 text-slate-300">
                  <ImageIcon size={64} strokeWidth={1} />
                  <p className="text-xs font-black uppercase tracking-widest italic">No Digital POD Uploaded</p>
                </div>
              )}
            </div>
            
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 flex items-start gap-4">
              <div className="bg-white p-2 rounded-xl text-blue-600 shadow-sm shrink-0">
                <AlertCircle size={20} />
              </div>
              <div>
                <p className="text-[10px] font-black text-blue-700 uppercase tracking-widest mb-1 italic">Audit Instruction</p>
                <p className="text-[11px] font-bold text-blue-900 leading-relaxed uppercase italic">
                  Compare the digital photo with physical documents. Check for legible signature, clear stamp, and accurate date of delivery.
                </p>
              </div>
            </div>
          </div>

          {/* Right: Metadata & Actions */}
          <div className="lg:w-2/5 space-y-6">
            <div className="space-y-4">
               <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Job Metadata</p>
                  <div className="space-y-3">
                     <div className="flex items-center gap-3">
                        <Calendar size={14} className="text-slate-400" />
                        <p className="text-[11px] font-black text-slate-900 uppercase italic">Completed: {new Date(job.completed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                     </div>
                     <div className="flex items-center gap-3">
                        <Truck size={14} className="text-slate-400" />
                        <p className="text-[11px] font-black text-slate-900 uppercase italic">Fleet: {job.md_fleets?.plate_number || '-'}</p>
                     </div>
                     <div className="flex items-center gap-3">
                        <User size={14} className="text-slate-400" />
                        <p className="text-[11px] font-black text-slate-900 uppercase italic">Driver: {job.md_drivers?.name || '-'}</p>
                     </div>
                  </div>
               </div>

               {rejecting ? (
                 <div className="space-y-4 animate-in slide-in-from-right-4">
                   <label className="text-[10px] font-black text-rose-600 uppercase tracking-widest px-1">Rejection Reason</label>
                   <textarea 
                     className="w-full p-4 bg-rose-50 border-2 border-rose-100 rounded-2xl text-sm font-bold text-rose-900 focus:bg-white outline-none min-h-[120px]"
                     placeholder="Contoh: Foto blur, surat jalan tidak distempel, dll..."
                     value={rejectionReason}
                     onChange={(e) => setRejectionReason(e.target.value)}
                   />
                   <div className="flex gap-2">
                     <Button 
                       variant="ghost" 
                       onClick={() => setRejecting(false)}
                       className="flex-1 rounded-xl h-12 text-[10px] font-black uppercase tracking-widest"
                     >
                       Cancel
                     </Button>
                     <Button 
                       onClick={handleReject}
                       disabled={loading}
                       className="flex-1 bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-12 text-[10px] font-black uppercase tracking-widest shadow-lg shadow-rose-600/20"
                     >
                       Confirm Reject
                     </Button>
                   </div>
                 </div>
               ) : (
                 <div className="space-y-4">
                   <Button 
                     onClick={handleVerify}
                     disabled={loading || !job.pod_photo_url}
                     className="w-full h-16 bg-slate-900 hover:bg-black text-white rounded-[1.5rem] flex items-center justify-center gap-4 shadow-2xl shadow-slate-900/20 group active:scale-95 transition-all disabled:opacity-50"
                   >
                     {loading ? <Loader2 className="animate-spin" size={24} /> : (
                       <>
                         <CheckCircle2 size={24} className="text-emerald-400" />
                         <div className="text-left">
                            <p className="text-[10px] font-black uppercase tracking-widest leading-none">Approve & Release</p>
                            <p className="text-xs font-black italic opacity-60">Move to Ready for Billing</p>
                         </div>
                       </>
                     )}
                   </Button>

                   <Button 
                     onClick={() => setRejecting(true)}
                     disabled={loading || !job.pod_photo_url}
                     variant="ghost"
                     className="w-full h-16 border-2 border-slate-100 text-slate-400 hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 rounded-[1.5rem] flex items-center justify-center gap-4 transition-all disabled:opacity-50"
                   >
                      <XCircle size={24} />
                      <div className="text-left">
                        <p className="text-[10px] font-black uppercase tracking-widest leading-none">Reject POD</p>
                        <p className="text-xs font-black italic opacity-60">Notify driver to re-upload</p>
                      </div>
                   </Button>
                 </div>
               )}
            </div>

            <div className="pt-6 border-t border-slate-100">
               <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest leading-relaxed text-center italic">
                 Verification will lock the operational data and prepare this mission for automated invoicing via HQ Finance.
               </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
