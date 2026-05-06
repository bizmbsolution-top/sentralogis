"use client";

import { X, Receipt, Upload, ShieldCheck } from "lucide-react";

interface VendorInvoiceModalProps {
    show: boolean;
    onClose: () => void;
    form: {
        invoice_number: string;
        amount: string;
        file_url: string;
    };
    setForm: (form: any) => void;
    onSave: () => void;
    formatThousand: (val: string) => string;
}

export default function VendorInvoiceModal({
    show, onClose, form, setForm, onSave, formatThousand
}: VendorInvoiceModalProps) {
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[700] p-4">
            <div className="bg-white p-10 rounded-[3rem] w-full max-w-xl shadow-2xl relative border border-slate-100 flex flex-col">
                <button 
                    onClick={onClose} 
                    className="absolute top-8 right-8 w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all"
                >
                    <X className="w-5 h-5"/>
                </button>
                
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse">
                        <Receipt className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black uppercase italic text-[#1E293B]">Submit Vendor Invoice</h2>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mandatory for Outsource Settlement</p>
                    </div>
                </div>

                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Invoice Number</label>
                        <input 
                            type="text" 
                            placeholder="INV/VND/2026/001" 
                            value={form.invoice_number} 
                            onChange={e => setForm({...form, invoice_number: e.target.value})} 
                            className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-rose-500/20" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Billed Amount</label>
                        <input 
                            type="text" 
                            placeholder="Rp 0" 
                            value={form.amount} 
                            onChange={e => setForm({...form, amount: formatThousand(e.target.value)})} 
                            className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-black text-xl outline-none focus:ring-2 focus:ring-rose-500/20" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">PDF Document Link</label>
                        <div className="flex gap-2">
                            <input 
                                type="text" 
                                placeholder="https://..." 
                                value={form.file_url} 
                                onChange={e => setForm({...form, file_url: e.target.value})} 
                                className="flex-1 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs font-bold outline-none" 
                            />
                            <button className="px-4 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-colors">
                                <Upload className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <button 
                        onClick={onSave} 
                        className="w-full bg-[#1E293B] hover:bg-rose-600 text-white transition-all py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-xl mt-4 flex justify-center gap-3 items-center group"
                    >
                        Submit to Finance AP <ShieldCheck className="w-5 h-5 group-hover:scale-110 px-0.5 transition-transform"/>
                    </button>
                </div>
            </div>
        </div>
    );
}
