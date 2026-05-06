"use client";

import { ScanLine, ShieldCheck } from "lucide-react";

interface CockpitVerificationGateProps {
    jo: any;
    isLocked: boolean;
    onVerifyPhysicalDoc?: (jo: any) => void;
}

export default function CockpitVerificationGate({
    jo, isLocked, onVerifyPhysicalDoc
}: CockpitVerificationGateProps) {
    return (
        <div className="space-y-8 col-span-full">
            <h4 className="text-[15px] font-black text-[#1E293B] uppercase italic tracking-widest flex items-center gap-4 px-2 border-l-4 border-slate-900 ml-2">
                <ScanLine className="w-6 h-6 text-orange-500" /> Physical Document Compliance
            </h4>
            <div className={`p-10 rounded-none border bg-white shadow-sm flex flex-col md:flex-row items-center justify-between gap-10 transition-all ${jo.physical_doc_received ? 'border-emerald-500' : 'border-orange-500/40 border-dashed'}`}>
                <div className="flex items-center gap-8">
                    <div className={`w-20 h-20 rounded-none flex items-center justify-center shadow-xl ${jo.physical_doc_received ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white animate-pulse'}`}>
                        <ShieldCheck className="w-10 h-10" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Strategic Verification Gate</p>
                        <h5 className="text-2xl font-black italic text-slate-900 uppercase tracking-tighter truncate leading-none">
                            {jo.physical_doc_received ? 'Assets Verified' : 'Mission Hardcopy Required'}
                        </h5>
                        <p className="text-[12px] font-bold text-slate-400 mt-3 uppercase tracking-wide">
                            {jo.physical_doc_received 
                                ? `Captured: ${new Date(jo.physical_doc_collected_at).toLocaleDateString()} • Verified Hub` 
                                : 'Verify physical Surat Jalan before financial settlement.'}
                        </p>
                    </div>
                </div>
                <div className="flex gap-4">
                    {!jo.physical_doc_received ? (
                        <button 
                            onClick={() => !isLocked && onVerifyPhysicalDoc && onVerifyPhysicalDoc(jo)}
                            disabled={isLocked}
                            className={`px-10 py-5 rounded-none text-[13px] font-black uppercase tracking-[0.2em] transform active:scale-95 transition-all shadow-xl flex items-center gap-3 ${isLocked ? 'bg-white text-slate-300 cursor-not-allowed border-slate-200' : 'bg-slate-900 hover:bg-orange-600 text-white shadow-slate-900/10'}`}
                        >
                            <ScanLine className="w-6 h-6" /> {isLocked ? 'LOCKED' : 'Verify Physical Receipt'}
                        </button>
                    ) : (
                        <div className="px-6 py-4 bg-white border border-emerald-500 rounded-none flex items-center gap-3">
                            <div className="w-2 h-2 rounded-none bg-emerald-500" />
                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Validated</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
