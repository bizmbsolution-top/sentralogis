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
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[700] p-4">
            <div className="bg-slate-900 p-10 rounded-[3rem] w-full max-w-xl shadow-[0_0_50px_rgba(0,0,0,0.5)] relative border border-slate-700 flex flex-col">
                <button 
                    onClick={onClose} 
                    className="absolute top-8 right-8 w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition-all"
                >
                    <X className="w-5 h-5"/>
                </button>
                
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-14 h-14 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl flex items-center justify-center flex-shrink-0 animate-pulse">
                        <Receipt className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black uppercase italic text-white">Submit Vendor Invoice</h2>
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
                            className="w-full bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 p-4 rounded-2xl font-bold text-sm outline-none focus:ring-2 focus:ring-rose-500/50" 
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Billed Amount</label>
                        <input 
                            type="text" 
                            placeholder="Rp 0" 
                            value={form.amount} 
                            onChange={e => setForm({...form, amount: formatThousand(e.target.value)})} 
                            className="w-full bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 p-4 rounded-2xl font-black text-xl outline-none focus:ring-2 focus:ring-rose-500/50" 
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
                                className="flex-1 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 p-4 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-rose-500/50" 
                            />
                            <button className="px-4 bg-slate-700 text-slate-300 rounded-2xl hover:bg-slate-600 transition-colors">
                                <Upload className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <button 
                        onClick={onSave} 
                        className="w-full bg-rose-600 hover:bg-rose-500 text-white transition-all py-5 rounded-[1.5rem] font-black uppercase tracking-[0.2em] text-[11px] shadow-lg hover:shadow-rose-500/20 mt-4 flex justify-center gap-3 items-center group"
                    >
                        Submit to Finance AP <ShieldCheck className="w-5 h-5 group-hover:scale-110 px-0.5 transition-transform"/>
                    </button>
                </div>
            </div>
        </div>
    );
}
