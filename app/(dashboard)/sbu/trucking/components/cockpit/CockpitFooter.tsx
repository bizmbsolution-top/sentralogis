"use client";

import { Receipt, ShieldCheck, ArrowRight } from "lucide-react";

interface CockpitFooterProps {
    jo: any;
    isSettled: boolean;
    isLocked: boolean;
    isActionDisabled: boolean;
    onSubmitVendorInvoice: (jo: any) => void;
    onCollectDocs: (jo: any) => void;
}

export default function CockpitFooter({
    jo, isSettled, isLocked, isActionDisabled, onSubmitVendorInvoice, onCollectDocs
}: CockpitFooterProps) {
    return (
        <div className="pt-10 pb-24 flex justify-end gap-6 border-t border-slate-100 mt-10">
            {jo.fleets?.company_id && !isSettled && (
                <button 
                    onClick={() => onSubmitVendorInvoice(jo)}
                    className="px-10 py-5 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-[2.5rem] text-[12px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-4 group shadow-sm"
                >
                    <Receipt className="w-5 h-5 group-hover:rotate-12 transition-transform" /> Submit Vendor Invoice Asset
                </button>
            )}

            {isActionDisabled ? (
                <div className="px-10 py-5 bg-slate-50 text-slate-400 rounded-[2.5rem] text-[12px] font-black uppercase tracking-widest flex items-center gap-3 cursor-not-allowed border border-slate-200 shadow-inner italic">
                    <ShieldCheck className="w-5 h-5" /> {isLocked ? 'MISSION LOCKED (PENDING APPROVAL)' : 'SETTLED & SUBMITTED TO FINANCE'}
                </div>
            ) : (
                <button 
                    onClick={() => onCollectDocs(jo)}
                    className="px-12 py-5 bg-slate-900 hover:bg-emerald-600 text-white rounded-[2.5rem] text-[13px] font-black uppercase tracking-[0.2em] transition-all shadow-2xl shadow-slate-900/20 active:scale-95 flex items-center gap-4 group"
                >
                    Submit Mission to Finance <ArrowRight className="w-5 h-5 group-hover:translate-x-2 transition-transform" />
                </button>
            )}
        </div>
    );
}
