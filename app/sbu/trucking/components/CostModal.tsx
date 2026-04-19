"use client";

import { X, CheckCircle2 } from "lucide-react";

interface CostModalProps {
    show: boolean;
    onClose: () => void;
    costForm: {
        paid_to: string;
        cost_type: string;
        amount: string;
        description: string;
    };
    setCostForm: (form: any) => void;
    onSave: () => void;
    formatThousand: (val: string) => string;
}

export default function CostModal({ 
    show, onClose, costForm, setCostForm, onSave, formatThousand 
}: CostModalProps) {
    if (!show) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[700] p-4">
            <div className="bg-white p-8 md:p-10 rounded-[2.5rem] w-full max-w-lg shadow-[0_30px_100px_rgba(0,0,0,0.15)] relative border border-slate-100 flex flex-col">
                <button 
                    onClick={onClose} 
                    className="absolute top-6 right-6 w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 hover:bg-slate-100"
                >
                    <X className="w-5 h-5"/>
                </button>
                <h2 className="text-xl md:text-2xl font-black uppercase italic text-[#1E293B] mb-6">Penambahan Biaya</h2>
                <div className="space-y-4">
                    <div className="flex gap-4">
                        <select 
                            value={costForm.paid_to} 
                            onChange={e => setCostForm({...costForm, paid_to: e.target.value})} 
                            className="flex-1 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-bold text-[#1E293B] outline-none"
                        >
                            <option value="vendor">Paid to Vendor</option>
                            <option value="sbu_trucking">Paid by SBU (Cash)</option>
                        </select>
                        <select 
                            value={costForm.cost_type} 
                            onChange={e => setCostForm({...costForm, cost_type: e.target.value})} 
                            className="flex-1 bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-bold text-[#1E293B] outline-none"
                        >
                            {['Operational', 'Overtime', 'Toll/Parkir', 'Lain-lain'].map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                    <input 
                        type="text" 
                        placeholder="Rp 0" 
                        value={costForm.amount} 
                        onChange={e => setCostForm({...costForm, amount: formatThousand(e.target.value)})} 
                        className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-black text-lg outline-none focus:ring-2 focus:ring-emerald-500/20" 
                    />
                    <textarea 
                        placeholder="Keterangan tambahan (Bukti struk dll)..." 
                        value={costForm.description} 
                        onChange={e => setCostForm({...costForm, description: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl h-24 text-sm font-bold resize-none outline-none focus:ring-2 focus:ring-emerald-500/20" 
                    />
                    <button 
                        onClick={onSave} 
                        className="w-full bg-[#1E293B] hover:bg-emerald-600 text-white transition-all py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg mt-2 group flex justify-center gap-2 items-center"
                    >
                        Submit Biaya <CheckCircle2 className="w-4 h-4 group-hover:scale-110"/>
                    </button>
                </div>
            </div>
        </div>
    );
}
