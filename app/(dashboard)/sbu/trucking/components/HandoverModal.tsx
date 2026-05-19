"use client";

import React, { useState, useEffect } from "react";
import { X, FileText, CheckCircle2, Upload, Trash2, Loader2, Image as ImageIcon } from "lucide-react";
import { toast } from "react-hot-toast";
import { createClient } from "@/lib/supabase/client";

interface HandoverModalProps {
  show: boolean;
  onClose: () => void;
  workOrder: any; 
  onSuccess: () => void;
}

const HandoverModal: React.FC<HandoverModalProps> = ({ show, onClose, workOrder, onSuccess }) => {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [files, setFiles] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  // Sync state when workOrder changes or modal opens
  useEffect(() => {
    if (show && workOrder) {
      setNotes(workOrder.work_orders?.physical_doc_notes || "");
      setFiles(workOrder.work_orders?.physical_doc_files || []);
    }
  }, [show, workOrder]);

  if (!show || !workOrder) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    setUploading(true);
    try {
      const newFiles = [...files];
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `handover/${workOrder.work_orders?.id || workOrder.work_order_id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);
        
        newFiles.push(publicUrl);
      }
      setFiles(newFiles);
      toast.success("File uploaded successfully");
    } catch (error: any) {
      toast.error("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirmReceipt = async () => {
    setLoading(true);
    try {
      const woId = workOrder.work_orders?.id || workOrder.work_order_id;
      const { error } = await supabase
        .from('work_orders')
        .update({
          physical_doc_received: true,
          physical_doc_files: files,
          physical_doc_notes: notes,
          physical_doc_collected_at: new Date().toISOString()
        })
        .eq('id', woId);

      if (error) throw error;

      toast.success("Dokumen Fisik Diverifikasi!");
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error("Failed to update: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 overflow-hidden">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-700 overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="p-8 border-b border-slate-800 flex justify-between items-center bg-slate-900">
            <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
                    <FileText className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                    <h3 className="text-lg font-black italic tracking-tighter text-white uppercase leading-tight">Hardcopy Verification</h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{workOrder.work_orders?.wo_number}</p>
                </div>
            </div>
            <button onClick={onClose} className="w-10 h-10 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-700 hover:text-white transition-all">
                <X className="w-5 h-5" />
            </button>
        </div>

        <div className="p-8 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div className="p-6 bg-slate-800 rounded-3xl border border-slate-700 space-y-3">
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Customer</span>
                    <span className="text-[11px] font-black italic text-white uppercase">{workOrder.work_orders?.customers?.company_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing Method</span>
                    <span className="px-3 py-1 bg-slate-900 border border-slate-700 rounded-full text-[9px] font-black uppercase text-emerald-400">{workOrder.work_orders?.customers?.billing_method || 'Standard'}</span>
                </div>
            </div>

            <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Upload Evidence (Photos/PDF)</label>
                <div className="grid grid-cols-3 gap-4">
                    {files.map((url, idx) => (
                        <div key={idx} className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-700 shadow-sm">
                            <img src={url} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                                <button 
                                    onClick={() => removeFile(idx)}
                                    className="w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-all"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                    {files.length < 6 && (
                        <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-700 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-800 hover:border-emerald-500/30 transition-all group">
                            {uploading ? <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" /> : <Upload className="w-6 h-6 text-slate-300 group-hover:text-emerald-500 transition-colors" />}
                            <span className="text-[10px] font-black text-slate-400 group-hover:text-emerald-500 uppercase transition-colors">Attach</span>
                            <input type="file" multiple accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                        </label>
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Admin SBU Collection Notes</label>
                <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter details about documents received (e.g., 'Surat jalan asli diterima dengan stempel basah')"
                    className="w-full bg-slate-800 border border-slate-700 text-white rounded-2xl p-4 text-sm font-medium focus:ring-4 focus:ring-emerald-500/5 focus:border-emerald-500/40 outline-none transition-all min-h-[120px] placeholder:text-slate-500"
                />
            </div>
        </div>

        <div className="p-8 bg-slate-900 border-t border-slate-800 flex gap-4">
            <button 
                onClick={onClose}
                className="flex-1 px-6 py-5 rounded-2xl bg-slate-800 border border-slate-700 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-700 hover:text-white transition-all active:scale-95"
            >
                Cancel
            </button>
            <button 
                onClick={handleConfirmReceipt}
                disabled={loading}
                className="flex-[2] px-6 py-5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-lg shadow-emerald-500/20 active:scale-[0.98] disabled:bg-slate-700 disabled:text-slate-500"
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                Confirm & Verify SBU Handover
            </button>
        </div>
      </div>
    </div>
  );
};

export default HandoverModal;
