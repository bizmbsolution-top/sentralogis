"use client";

import React, { useState } from "react";
import { X, AlertTriangle, Loader2 } from "lucide-react";

interface HandoverSbuModalProps {
    show: boolean;
    onClose: () => void;
    workOrder: any;
    onSubmit: (reason: string) => void;
    isSubmitting: boolean;
}

export default function HandoverSbuModal({ show, onClose, workOrder, onSubmit, isSubmitting }: HandoverSbuModalProps) {
    const [reason, setReason] = useState("");

    if (!show || !workOrder) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={!isSubmitting ? onClose : undefined} />
            
            <div className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-rose-500" />
                        </div>
                        <div>
                            <h3 className="text-lg font-black italic tracking-tighter text-[#1E293B] uppercase leading-tight">Handover Negotiation</h3>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{workOrder?.wo_number || '-'}</p>
                        </div>
                    </div>
                    <button onClick={!isSubmitting ? onClose : undefined} className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 transition-all">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 space-y-6">
                    <div className="p-6 bg-rose-50/50 rounded-3xl border border-rose-100 space-y-3">
                        <p className="text-xs text-rose-600 font-bold leading-relaxed">
                            Apakah Anda yakin ingin mengembalikan instruksi misi ini ke Admin WO?
                        </p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Alasan Handover / Penolakan</label>
                        <textarea 
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Contoh: Harga terlalu murah, unit vendor / internal tidak ada yang tersedia..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-bold focus:ring-4 focus:ring-rose-500/10 focus:border-rose-500/40 outline-none transition-all min-h-[140px] placeholder:text-slate-300"
                        />
                    </div>
                </div>

                <div className="p-8 bg-white border-t border-slate-100 flex gap-4">
                    <button 
                        onClick={onClose}
                        disabled={isSubmitting}
                        className="flex-1 px-6 py-5 rounded-2xl bg-white border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all active:scale-95 disabled:opacity-50"
                    >
                        Batal
                    </button>
                    <button 
                        onClick={() => onSubmit(reason)}
                        disabled={isSubmitting || !reason.trim()}
                        className="flex-[2] px-6 py-5 rounded-2xl bg-rose-500 hover:bg-rose-600 text-white text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all shadow-xl shadow-rose-500/20 active:scale-[0.98] disabled:bg-slate-300 disabled:shadow-none"
                    >
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />}
                        Submit Handover
                    </button>
                </div>
            </div>
        </div>
    );
}
