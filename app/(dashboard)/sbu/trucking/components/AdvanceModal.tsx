"use client";

import { X, Wallet, Send } from "lucide-react";

interface AdvanceModalProps {
    show: boolean;
    onClose: () => void;
    form: {
        amount: string;
        description: string;
        paid_by: string;
        context?: any;
    };
    setForm: (form: any) => void;
    onSave: () => void;
    formatThousand: (val: string) => string;
    missionCredits?: number;
}

export default function AdvanceModal({
    show, onClose, form, setForm, onSave, formatThousand, missionCredits
}: AdvanceModalProps) {
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
                
                <div className="mb-8">
                    <h2 className="text-xl md:text-2xl font-black uppercase italic text-[#1E293B]">Kasbon Jalan</h2>
                    {form.context && (
                        <div className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-3xl space-y-3">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{form.context.is_internal ? 'Internal Mission' : 'Vendor Service'}</p>
                                    <p className="text-sm font-black text-[#1E293B] uppercase italic truncate">{form.context.route}</p>
                                </div>
                                <div className="flex flex-col items-end gap-2 text-right">
                                    <span className="text-[10px] font-black text-emerald-600 uppercase border border-emerald-100 bg-emerald-50 px-2 py-0.5 rounded-md">Draft Value Ready</span>
                                    <div className="flex items-center gap-2 bg-white border border-slate-100 px-3 py-1.5 rounded-xl shadow-sm">
                                        <Wallet className="w-3 h-3 text-amber-500" />
                                        <span className="text-[11px] font-black italic text-amber-600">{missionCredits || 0} Tokens</span>
                                    </div>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200">
                                <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Planned Advance</p>
                                    <p className="text-lg font-black text-[#1E293B] italic">Rp {form.context.planned_price.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Deal Revenue</p>
                                    <p className="text-lg font-black text-slate-400 italic">Rp {form.context.deal_price.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-2">Dibayarkan Oleh</label>
                        <select 
                            value={form.paid_by} 
                            onChange={e => setForm({...form, paid_by: e.target.value})} 
                            className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-sm font-bold text-[#1E293B] outline-none"
                        >
                            <option value="sbu_trucking">SBU Trucking (Operational)</option>
                            <option value="main_finance">Main Finance (Settlement)</option>
                        </select>
                    </div>
                    <input 
                        type="text" 
                        placeholder="Rp 0" 
                        value={form.amount} 
                        onChange={e => setForm({...form, amount: formatThousand(e.target.value)})} 
                        className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl font-black text-lg outline-none focus:ring-2 focus:ring-emerald-500/20" 
                    />
                    <textarea 
                        placeholder="Rincian kasbon..." 
                        value={form.description} 
                        onChange={e => setForm({...form, description: e.target.value})} 
                        className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl h-24 text-sm font-bold resize-none outline-none focus:ring-2 focus:ring-emerald-500/20" 
                    />
                    <button 
                        onClick={onSave} 
                        className="w-full bg-[#1E293B] hover:bg-emerald-600 text-white transition-all py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-lg mt-2 group flex justify-center gap-2 items-center"
                    >
                        Kirim Pengajuan <Send className="w-4 h-4 group-hover:-translate-y-1 group-hover:translate-x-1 transition-transform"/>
                    </button>
                </div>
            </div>
        </div>
    );
}
