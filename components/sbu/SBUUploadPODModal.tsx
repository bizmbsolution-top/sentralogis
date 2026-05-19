'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Upload, 
  Loader2, 
  FileText, 
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  Plus,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'react-hot-toast';

interface SBUUploadPODModalProps {
  job: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SBUUploadPODModal({ job, onClose, onSuccess }: SBUUploadPODModalProps) {
  const [uploading, setUploading] = useState(false);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [existingUrls, setExistingUrls] = useState<string[]>([]);

  useEffect(() => {
    if (job.pod_photo_url) {
      try {
        // Try to parse as JSON array, fallback to comma separated
        const parsed = JSON.parse(job.pod_photo_url);
        if (Array.isArray(parsed)) setExistingUrls(parsed);
        else setExistingUrls([job.pod_photo_url]);
      } catch {
        setExistingUrls(job.pod_photo_url.split(',').filter(Boolean));
      }
    }
  }, [job.pod_photo_url]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const selectedFiles = Array.from(e.target.files);
      setNewFiles(prev => [...prev, ...selectedFiles]);
    }
  };

  const removeNewFile = (index: number) => {
    setNewFiles(prev => prev.filter((_, i) => i !== index));
  };

  const removeExistingUrl = (url: string) => {
    setExistingUrls(prev => prev.filter(u => u !== url));
  };

  const handleUpload = async (status: 'draft' | 'received_sbu') => {
    if (newFiles.length === 0 && existingUrls.length === 0) {
      return toast.error('Harap upload setidaknya satu dokumen');
    }
    
    try {
      setUploading(true);
      const uploadedUrls: string[] = [...existingUrls];

      for (const file of newFiles) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${job.jo_number}_SBU_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `pod/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('pod_documents')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('pod_documents')
          .getPublicUrl(filePath);
        
        uploadedUrls.push(publicUrl);
      }

      // Store as JSON string
      const finalValue = JSON.stringify(uploadedUrls);

      const { error: updateError } = await supabase
        .from('job_orders')
        .update({ 
          pod_photo_url: finalValue,
          pod_status: status,
          is_doc_finished: status === 'received_sbu',
          updated_at: new Date().toISOString()
        })
        .eq('id', job.id);

      if (updateError) throw updateError;

      toast.success(status === 'draft' ? 'Dokumen disimpan sebagai draft' : 'Semua dokumen berhasil diupload');
      onSuccess();
    } catch (err: any) {
      console.error('Upload Error:', err);
      toast.error('Gagal upload: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white rounded-[3rem] w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="bg-slate-900 px-8 py-6 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-600/20">
              <Upload size={24} />
            </div>
            <div>
              <h3 className="text-white font-black text-xl italic uppercase tracking-tight">Job POD Documents</h3>
              <p className="text-blue-400 text-[10px] font-black uppercase tracking-[0.3em] mt-0.5 italic">{job.jo_number} Portal</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 overflow-y-auto custom-scrollbar space-y-8">
          {/* File Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Existing Files */}
            {existingUrls.map((url, idx) => (
              <div key={idx} className="relative aspect-square bg-slate-50 rounded-2xl border border-slate-100 overflow-hidden group">
                {url.toLowerCase().endsWith('.pdf') ? (
                  <div className="w-full h-full flex flex-col items-center justify-center text-rose-500">
                    <FileText size={32} />
                    <span className="text-[8px] font-black uppercase mt-1">PDF DOC</span>
                  </div>
                ) : (
                  <img src={url} alt="POD" className="w-full h-full object-cover" />
                )}
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <button 
                    onClick={() => removeExistingUrl(url)}
                    className="p-2 bg-white/20 hover:bg-rose-500 text-white rounded-xl transition-colors"
                   >
                     <Trash2 size={16} />
                   </button>
                </div>
              </div>
            ))}

            {/* New Files */}
            {newFiles.map((file, idx) => (
              <div key={idx} className="relative aspect-square bg-blue-50 rounded-2xl border-2 border-blue-100 overflow-hidden group">
                <div className="w-full h-full flex flex-col items-center justify-center text-blue-500">
                  <FileText size={32} />
                  <span className="text-[8px] font-black uppercase mt-1 truncate px-2 w-full text-center">{file.name}</span>
                </div>
                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                   <button 
                    onClick={() => removeNewFile(idx)}
                    className="p-2 bg-white/20 hover:bg-rose-500 text-white rounded-xl transition-colors"
                   >
                     <Trash2 size={16} />
                   </button>
                </div>
              </div>
            ))}

            {/* Upload Placeholder */}
            <button 
              onClick={() => document.getElementById('pod-upload-multi')?.click()}
              className="aspect-square border-4 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-300 hover:border-blue-400 hover:bg-blue-50 hover:text-blue-500 transition-all gap-2"
            >
              <Plus size={32} />
              <span className="text-[10px] font-black uppercase tracking-widest">Add Files</span>
            </button>
            <input 
              id="pod-upload-multi"
              type="file" 
              className="hidden" 
              multiple
              accept="image/*,application/pdf"
              onChange={handleFileChange}
            />
          </div>

          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 flex items-start gap-4">
             <AlertCircle size={20} className="text-amber-500 shrink-0" />
             <div className="space-y-1">
                <p className="text-[10px] font-black text-amber-700 uppercase italic">Multi-Document Upload</p>
                <p className="text-[9px] font-bold text-amber-600/80 leading-relaxed uppercase">
                   Anda dapat mengunggah lebih dari satu dokumen (Surat Jalan, Invoice, dll). Gunakan "Save as Draft" jika koleksi dokumen belum lengkap.
                </p>
             </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4 shrink-0">
          <Button 
            onClick={() => handleUpload('draft')}
            loading={uploading}
            variant="secondary"
            className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-sm"
          >
            Save as Draft
          </Button>
          <Button 
            onClick={() => handleUpload('received_sbu')}
            loading={uploading}
            disabled={newFiles.length === 0 && existingUrls.length === 0}
            variant="success"
            className="flex-1 h-14 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-emerald-500/20"
          >
            <CheckCircle size={20} className="mr-2" /> Save & Complete
          </Button>
        </div>
      </div>
    </div>
  );
}
