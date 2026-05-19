"use client";

import { MapPin, Navigation as NavIcon, User, Phone, Send, Info, MessageCircle } from "lucide-react";

interface CockpitMissionOverviewProps {
    jo: any;
    isSettled: boolean;
    isActionDisabled: boolean;
    isLocked: boolean;
    onReject?: (jo: any) => void;
    onApprove?: (jo: any) => void;
    onSendLink?: (id: string) => void;
    onEdit?: (item: any, joId?: string) => void;
}

export default function CockpitMissionOverview({
    jo, isSettled, isActionDisabled, isLocked, onReject, onApprove, onSendLink, onEdit
}: CockpitMissionOverviewProps) {
    return (
        <div className="space-y-10">

            {/* 🚀 DEPLOYMENT INFO CARD - LIGHT ATLAS STYLE */}
            <div className="bg-white rounded-none p-10 border border-slate-200 shadow-xl relative overflow-hidden group">
                <div className="absolute right-0 top-0 w-40 h-40 bg-emerald-500/5 blur-3xl group-hover:bg-emerald-500/10 transition-all duration-700" />
                <div className="absolute left-0 bottom-0 w-40 h-40 bg-blue-500/5 blur-3xl group-hover:bg-blue-500/10 transition-all duration-700" />

                <div className="relative z-10 space-y-10">
                    <div className="flex flex-col md:flex-row justify-between items-start gap-6">
                        <div className="border-l-4 border-emerald-500 pl-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-3 py-1 bg-white rounded-none w-fit border border-slate-200 italic">Mission Strategy Matrix</p>
                            <h4 className="text-3xl md:text-4xl font-black italic uppercase tracking-tighter leading-tight text-slate-900">
                                {jo.fleets?.plate_number} <span className="text-emerald-500 mx-2">/</span> {jo.drivers?.name || 'Unassigned Pilot'}
                            </h4>
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mt-2 flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-none ${!jo.fleets?.company_id ? 'bg-blue-500' : 'bg-orange-500'}`} />
                                {!jo.fleets?.company_id ? 'Internal Strategic Asset' : `Operational Outsourcing: ${jo.fleets?.companies?.name || 'Vendor'}`}
                            </p>
                        </div>
                        <div className="text-left md:text-right bg-white p-6 rounded-none border border-slate-200 min-w-[200px]">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">Contract Revenue</p>
                            <p className="text-3xl font-black italic text-[#1E293B] leading-none">Rp {(jo.parentWO?.deal_price || 0).toLocaleString('id-ID')}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 pt-10 border-t border-slate-100">
                        <div className="space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-none bg-emerald-100 flex items-center justify-center">
                                   <MapPin className="w-5 h-5 text-emerald-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Base Origin</p>
                                    <p className="text-base font-black uppercase italic tracking-tight text-slate-900 truncate">{jo.parentWO?.origin_location?.name || 'Base Command'}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-none bg-blue-100 flex items-center justify-center">
                                   <NavIcon className="w-5 h-5 text-blue-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Destination</p>
                                    <p className="text-base font-black uppercase italic tracking-tight text-slate-900 truncate">{jo.parentWO?.destination_location?.name || 'Deployment Site'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-none p-8 flex flex-col justify-center items-center text-center relative group/inner shadow-sm">
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 leading-none relative z-10 italic">Pilot Deployment Rate</p>
                            <p className="text-4xl font-black italic text-slate-900 leading-none relative z-10 tracking-tighter">Rp {(jo.vendor_price || 0).toLocaleString('id-ID')}</p>
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mt-6 relative z-10 bg-white px-3 py-1 border border-slate-200 italic">{!jo.fleets?.company_id ? 'Internal Allocation' : 'Vendor Service Bond'}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* TOP ACTION BAR - BOLD INFO */}
            <div className="flex flex-col md:flex-row gap-8 items-center justify-between bg-white p-8 rounded-none border border-slate-200 shadow-sm relative overflow-hidden group">
                 <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-none blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />
                 <div className="flex items-center gap-8 relative z-10 font-sans">
                    <div className="w-18 h-18 rounded-none bg-[#1E293B] flex items-center justify-center shadow-xl">
                        <User className="w-8 h-8 text-white" />
                    </div>
                    <div>
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2 italic">Active Personnel</p>
                        <p className="text-3xl font-black italic text-[#1E293B] uppercase tracking-tighter leading-none">{jo.driver_name}</p>
                        <div className="flex items-center gap-3 mt-3">
                           <Phone className="w-4 h-4 text-emerald-500" />
                           <p className="text-base font-black text-emerald-500 uppercase tracking-widest">{jo.driver_phone || 'NO CONTACT'}</p>
                        </div>
                    </div>
                 </div>
                 <div className="flex gap-4 w-full md:w-auto relative z-10 font-sans">
                    {jo.status === 'assigned' && !isSettled && (
                        <div className="flex gap-3 w-full lg:hidden">
                             <button 
                                onClick={() => onReject && onReject(jo)}
                                className="flex-1 px-4 py-5 bg-white text-rose-600 rounded-none text-[10px] font-black uppercase tracking-widest border border-rose-200 shadow-sm"
                            >
                                Reject
                            </button>
                            <button 
                                onClick={() => onApprove && onApprove(jo)}
                                className="flex-[2] px-4 py-5 bg-emerald-600 text-white rounded-none text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95"
                            >
                                Approve
                            </button>
                        </div>
                    )}
                    {jo.status === 'approved' && jo.driver_phone && (
                        <div className="flex-1">
                            <button 
                                onClick={() => onSendLink && onSendLink(jo.id)}
                                disabled={jo.cash_advances?.some((ca:any) => ca.status === 'pending')}
                                className={`w-full px-8 py-5 rounded-none text-[13px] font-black uppercase tracking-[0.15em] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-4 group ${jo.cash_advances?.some((ca:any) => ca.status === 'pending') ? 'bg-slate-50 text-slate-300 cursor-not-allowed border border-slate-200 shadow-none' : 'bg-slate-900 hover:bg-emerald-600 text-white'}`}
                            >
                                <MessageCircle className="w-5 h-5" /> 
                                {jo.is_link_sent ? 'RESEND LINK' : 'SEND TRACK LINK'}
                            </button>
                        </div>
                    )}
                    {isActionDisabled ? (
                        <div className="flex-1 md:flex-none px-8 py-5 bg-white border border-slate-200 text-slate-400 rounded-none text-[10px] font-black uppercase tracking-widest flex items-center justify-center cursor-not-allowed">
                            {isLocked ? 'LOCKED: PENDING APPROVAL' : 'LOCKED: SETTLED'}
                        </div>
                    ) : (
                        <button 
                            onClick={() => onEdit && onEdit(jo.parentWO, jo.id)}
                            className="flex-1 md:flex-none px-8 py-5 bg-white border border-slate-900 text-[#1E293B] rounded-none text-[10px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all shadow-md"
                        >
                            Edit Context
                        </button>
                    )}
                 </div>
            </div>
        </div>
    );
}
