"use client";

import { X, Truck, AlertCircle, ShieldCheck, Send, XCircle, MapPin, User, Phone, MessageSquare, MessageCircle } from "lucide-react";

interface CockpitHeaderProps {
    jo: any;
    isLocked: boolean;
    isActionDisabled: boolean;
    onClose: () => void;
    onReject?: (jo: any) => void;
    onApprove?: (jo: any) => void;
    onSendLink?: (id: string) => void;
}

export default function CockpitHeader({
    jo, isLocked, isActionDisabled, onClose, onReject, onApprove, onSendLink
}: CockpitHeaderProps) {
    return (
        <div className="p-6 md:p-8 border-b border-slate-200 bg-white text-slate-900 sticky top-0 z-50 shadow-sm font-sans">
            <div className="flex flex-col gap-6">
                
                {/* 🟢 ROW 1: MISSION CONFIG (ID, STATUS, ROUTE) */}
                <div className="flex flex-wrap items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">JO ID:</span>
                            <h2 className="text-xl font-black italic tracking-tighter text-slate-900 uppercase">{jo.jo_number}</h2>
                        </div>
                        <div className="h-6 w-px bg-slate-200" />
                        <div className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest border ${
                            jo.status === 'done' ? 'bg-emerald-500 text-white border-emerald-600' : 
                            'bg-blue-600 text-white border-blue-700'
                        }`}>
                            {jo.status === 'done' ? 'DELIVERED' : jo.status}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 bg-white px-4 py-2 border border-slate-200 shadow-sm text-[11px] font-black uppercase italic tracking-tight">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span className="text-slate-900">{jo.parentWO?.origin_location?.name || 'Base'}</span>
                        <span className="text-emerald-500 px-2">➔</span>
                        <span className="text-slate-900">{jo.parentWO?.destination_location?.name || 'Target'}</span>
                    </div>

                    <button onClick={onClose} className="w-10 h-10 bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-rose-600 hover:text-white transition-all shadow-sm">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* 🔵 ROW 2: ASSET CONFIG (FLEET, DRIVER + PHONE) + ACTIONS */}
                <div className="flex flex-wrap items-center justify-between gap-6 pt-6 border-t border-slate-100">
                    <div className="flex flex-wrap items-center gap-8">
                        <div className="flex items-center gap-3">
                            <Truck className="w-4 h-4 text-slate-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mr-1">FLEET:</span>
                            <span className="text-base font-black italic uppercase text-slate-900">{jo.fleet_number}</span>
                        </div>

                        <div className="h-6 w-px bg-slate-200" />

                        <div className="flex items-center gap-3">
                            <User className="w-4 h-4 text-slate-400" />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mr-1">PILOT:</span>
                            <span className="text-base font-black uppercase italic text-slate-900">{jo.driver_name || 'UNASSIGNED'}</span>
                            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-1 border border-emerald-100">
                                <Phone className="w-3 h-3" />
                                {jo.driver_phone || 'SIGNAL LOST'}
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {jo.status === 'assigned' && !isActionDisabled && (
                            <>
                                <button 
                                    onClick={() => onReject && onReject(jo)}
                                    className="px-4 py-2.5 text-[9px] font-black uppercase tracking-widest bg-white text-rose-500 border border-rose-200 hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95"
                                >
                                    REJECT
                                </button>
                                <button 
                                    onClick={() => onApprove && onApprove(jo)}
                                    className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg active:scale-95 flex items-center gap-2 transition-all"
                                >
                                    <ShieldCheck className="w-4 h-4" /> APPROVE
                                </button>
                            </>
                        )}
                        
                        {(jo.status === 'approved' || jo.status === 'on_journey' || jo.status === 'done' || jo.status === 'draft') && jo.driver_phone && (
                            <button 
                                onClick={() => onSendLink && onSendLink(jo.id)}
                                disabled={isLocked || jo.cash_advances?.some((ca:any) => ca.status === 'pending')}
                                className={`px-6 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all shadow-md active:scale-95 flex items-center gap-3 ${isLocked || jo.cash_advances?.some((ca:any) => ca.status === 'pending') ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none' : 'bg-slate-900 hover:bg-emerald-600 text-white'}`}
                            >
                                <MessageCircle className="w-4 h-4" /> 
                                {isLocked ? 'MISSION LOCKED' : (jo.is_link_sent ? 'RESEND LINK' : 'SEND LINK')}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
