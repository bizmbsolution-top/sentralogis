import { X, ShieldCheck, Upload, FileText, Calendar, User, Loader2, Trash2 } from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "react-hot-toast";

interface PhysicalDocModalProps {
    show: boolean;
    onClose: () => void;
    jo: any;
    onVerify: (data: { files: string[], notes: string }) => void;
}

export default function PhysicalDocModal({
    show, onClose, jo, onVerify
}: PhysicalDocModalProps) {
    const supabase = createClient();
    const [files, setFiles] = useState<string[]>(jo?.physical_doc_files || []);
    const [notes, setNotes] = useState(jo?.physical_doc_notes || "");
    const [uploading, setUploading] = useState(false);

    if (!show || !jo) return null;

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
                const filePath = `jo-verification/${jo.id}/${fileName}`;

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
            toast.success("Evidence uploaded");
        } catch (error: any) {
            toast.error("Upload failed: " + error.message);
        } finally {
            setUploading(false);
        }
    };

    const handleRemoveFile = (index: number) => {
        setFiles(files.filter((_, i) => i !== index));
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[750] p-4">
            <div className="bg-white p-8 md:p-10 rounded-[3rem] w-full max-w-2xl shadow-2xl relative border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden">
                <button 
                    onClick={onClose} 
                    className="absolute top-8 right-8 w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100"
                >
                    <X className="w-5 h-5"/>
                </button>

                <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse">
                        <ShieldCheck className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black uppercase italic text-[#1E293B]">Physical Doc Verification</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Job Order: {jo.jo_number}</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-6 custom-scrollbar">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Driver / Pilot</p>
                             <div className="flex items-center gap-2">
                                <User className="w-3 h-3 text-slate-400" />
                                <p className="text-sm font-black text-[#1E293B]">{jo.driver_name || jo.external_driver_name}</p>
                             </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Fleet Identity</p>
                             <div className="flex items-center gap-2">
                                <FileText className="w-3 h-3 text-slate-400" />
                                <p className="text-sm font-black text-[#1E293B]">{jo.fleet_number}</p>
                             </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[11px] font-black uppercase tracking-widest text-[#1E293B] ml-1">Document Evidence (Photos/Scans)</label>
                        <div className="grid grid-cols-3 gap-3">
                            {files.map((f, i) => (
                                <div key={i} className="relative aspect-square bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 group">
                                    <img src={f} className="w-full h-full object-cover" />
                                    <button 
                                        onClick={() => handleRemoveFile(i)}
                                        className="absolute top-2 right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            {files.length < 6 && (
                                <label className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-slate-50 hover:border-emerald-500/30 transition-all group">
                                    {uploading ? (
                                        <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                                    ) : (
                                        <>
                                            <Upload className="w-6 h-6 text-slate-300 group-hover:text-emerald-500 transition-colors" />
                                            <span className="text-[9px] font-black text-slate-400 group-hover:text-emerald-500 uppercase">Attach</span>
                                        </>
                                    )}
                                    <input type="file" multiple accept="image/*,application/pdf" onChange={handleFileUpload} className="hidden" disabled={uploading} />
                                </label>
                            )}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <label className="text-[11px] font-black uppercase tracking-widest text-[#1E293B] ml-1">Operational Notes (Missing docs, damage, etc.)</label>
                        <textarea 
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Tulis catatan verifikasi dokumen di sini..." 
                            className="w-full bg-slate-50 border border-slate-200 p-5 rounded-[2rem] h-32 text-sm font-bold resize-none outline-none focus:ring-2 focus:ring-emerald-500/20" 
                        />
                    </div>
                </div>

                <div className="pt-8 border-t border-slate-100 flex gap-4">
                    <button 
                        onClick={onClose}
                        className="flex-1 py-5 bg-slate-50 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[11px] hover:bg-slate-100"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={() => onVerify({ files, notes })}
                        className="flex-[2] py-5 bg-[#1E293B] hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-[0.2em] text-[11px] shadow-xl flex justify-center items-center gap-3 group"
                    >
                        Confirm Receipt <ShieldCheck className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
}
