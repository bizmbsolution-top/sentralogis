"use client";

import { Banknote, PlusCircle, ShieldCheck, Printer } from "lucide-react";
import { formatThousand, printCashAdvanceSlip } from "../../utils";

interface CockpitFinancialLedgerProps {
    jo: any;
    isActionDisabled: boolean;
    onAddAdvance: (joId: string) => void;
    onAddCost: (joId: string) => void;
    onSubmitCosts?: (joId: string) => void;
}

export default function CockpitFinancialLedger({
    jo, isActionDisabled, onAddAdvance, onAddCost, onSubmitCosts
}: CockpitFinancialLedgerProps) {
    const hasDraftCosts = jo.extra_costs?.some((c: any) => c.status === 'draft');

    return (
        <div className="space-y-8">
            <h4 className="text-[15px] font-black text-[#1E293B] uppercase italic tracking-widest flex items-center gap-4 px-2 border-l-4 border-slate-900 ml-2">
                <Banknote className="w-6 h-6 text-emerald-500" /> Financial Settlement
            </h4>
            
            <div className="">
                <div className="space-y-10">
                    <div className="p-10 bg-white rounded-none border border-slate-200 shadow-sm relative overflow-hidden group/advance">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-none blur-3xl -mr-16 -mt-16 group-hover/advance:bg-emerald-100 transition-colors" />
                        <div className="flex justify-between items-center mb-10 relative z-10">
                            <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic leading-none mb-2">Cash Advance Allocation</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Dana operasional pilot mission</p>
                            </div>
                            {!isActionDisabled && (
                                <button 
                                    onClick={() => onAddAdvance(jo.id)} 
                                    className="text-[11px] font-black text-white bg-slate-900 px-8 py-4 rounded-none hover:bg-emerald-600 uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 shadow-xl"
                                >
                                    <PlusCircle className="w-5 h-5"/> Add Advance
                                </button>
                            )}
                        </div>
                        <div className="space-y-4 relative z-10">
                            {jo.cash_advances?.length > 0 ? (
                                jo.cash_advances.map((ca: any) => (
                                    <div key={ca.id} className="bg-white p-8 rounded-none border border-slate-200 shadow-sm space-y-4 group/ca hover:border-emerald-500 transition-all">
                                        <div className="flex justify-between items-center">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Disbursed</span>
                                                <span className="text-[24px] font-black italic text-[#1E293B] tracking-tighter leading-none">Rp {formatThousand(ca.amount)}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <button
                                                    onClick={() => printCashAdvanceSlip(jo, ca)}
                                                    className="p-3 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 border-2 border-slate-200 transition-all flex items-center justify-center hover:border-emerald-500"
                                                    title="Cetak Slip Kasbon"
                                                >
                                                    <Printer className="w-4 h-4" />
                                                </button>
                                                <span className={`text-[10px] font-black px-6 py-2.5 rounded-none uppercase tracking-widest shadow-lg border-2 ${ca.status === 'approved' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-white text-amber-500 border-amber-500'}`}>
                                                    {ca.status === 'approved' ? 'PAID / DISBURSED' : 'AWAITING TRANSFER'}
                                                </span>
                                            </div>
                                        </div>
                                        {ca.transfer_proof_url && (
                                            <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                                                    <ShieldCheck className="w-4 h-4 text-emerald-500" /> Reference Proof Detected
                                                </p>
                                                <a 
                                                    href={ca.transfer_proof_url.startsWith('http') ? ca.transfer_proof_url : '#'} 
                                                    target="_blank" 
                                                    rel="noreferrer"
                                                    className="text-[11px] font-black text-emerald-600 hover:text-emerald-700 underline tracking-widest"
                                                >
                                                    EXPLORE TRANSACTION
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                ))
                            ) : <p className="text-[12px] text-slate-300 italic font-bold text-center py-6 border-2 border-dashed border-slate-100 uppercase tracking-widest">No registered cash-out records</p>}
                        </div>
                    </div>

                    <div className="p-10 bg-white rounded-none border border-slate-200 shadow-sm relative overflow-hidden group/extra">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-none blur-3xl -mr-16 -mt-16 group-hover/extra:bg-orange-100 transition-colors" />
                        <div className="flex justify-between items-center mb-10 relative z-10">
                            <div>
                                <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic leading-none mb-2">Incidental Operational Costs</p>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">Biaya tak terduga (Ban bocor, parkir, dll)</p>
                            </div>
                            <div className="flex gap-4">
                                {!isActionDisabled && (
                                    <button 
                                        onClick={() => onAddCost(jo.id)} 
                                        className="text-[11px] font-black text-[#1E293B] bg-white border-2 border-slate-900 px-8 py-4 rounded-none hover:bg-slate-900 hover:text-white uppercase tracking-widest flex items-center gap-3 transition-all active:scale-95 shadow-md"
                                    >
                                        <PlusCircle className="w-5 h-5"/> Add Incidental
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="space-y-4 relative z-10">
                            {jo.extra_costs?.length > 0 ? (
                                <>
                                    {jo.extra_costs.map((c: any) => (
                                        <div key={c.id} className="flex justify-between items-center gap-6 p-8 bg-white border border-slate-200 group/item hover:border-orange-500 transition-all">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-4 mb-2">
                                                    <p className="text-[18px] font-black text-[#1E293B] uppercase italic tracking-tighter leading-none">{c.cost_type}</p>
                                                    <span className={`text-[9px] font-black px-3 py-1 border-2 ${
                                                        c.status === 'draft' ? 'bg-white text-slate-400 border-slate-200' : 
                                                        c.status === 'pending_approval' ? 'bg-amber-500 text-white border-amber-500 animate-pulse' :
                                                        c.status === 'approved' ? 'bg-emerald-600 text-white border-emerald-600' :
                                                        'bg-rose-600 text-white border-rose-600'
                                                    }`}>
                                                        {c.status?.toUpperCase() || 'UNTRACKED'}
                                                    </span>
                                                </div>
                                                <p className="text-[12px] font-bold text-slate-400 truncate tracking-tight">{c.description}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-[22px] font-black italic text-slate-900 tabular-nums">Rp {formatThousand(c.amount)}</span>
                                            </div>
                                        </div>
                                    ))}

                                    {hasDraftCosts && !isActionDisabled && (
                                        <div className="pt-2">
                                            <button 
                                                onClick={() => onSubmitCosts && onSubmitCosts(jo.id)}
                                                className="w-full text-[9px] font-black text-white bg-slate-900 py-3 rounded-none hover:bg-blue-600 uppercase tracking-[0.3em] transition-all active:scale-95 shadow-md flex items-center justify-center gap-2 border-b-2 border-blue-400"
                                            >
                                                <ShieldCheck className="w-3.5 h-3.5" /> 
                                                Execute Protocol: Submit to Admin WO
                                            </button>
                                        </div>
                                    )}
                                </>
                            ) : <p className="text-[12px] text-slate-300 italic font-bold text-center py-6 border-2 border-dashed border-slate-100 uppercase tracking-widest">Secure: No extra costs logged</p>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
