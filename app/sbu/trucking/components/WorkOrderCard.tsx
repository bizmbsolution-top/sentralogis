"use client";

import { 
    Truck, MapPin, Navigation, Calendar, 
    ChevronRight, CheckCircle2, XCircle, Activity, 
    Globe, Printer, Banknote, ShieldCheck, Clock, Inbox,
    PlusCircle, Send, MoreVertical, Map, FolderOpen, AlertTriangle
} from "lucide-react";
import { WorkOrderItem } from "../page";
import { getStatusConfig, getOperationalStatus } from "../utils";

interface WorkOrderCardProps {
    item: WorkOrderItem;
    onManageAssignments: (item: WorkOrderItem) => void;
    onHandover: (item: WorkOrderItem) => void;
    onSendLinks: (item: WorkOrderItem, specificJoId?: string) => void;
    onViewMap: (item: WorkOrderItem) => void;
    onOpenDetails: (assignment: any) => void;
    onHandoverSbuToAdmin?: (item: WorkOrderItem) => void;
    onAddAdvance?: (joId: string) => void;
    formatThousand: (val: number | string) => string;
}

/**
 * WORK ORDER CARD: ATLAS ERA (HARMONIC REFINEMENT)
 * Fokus: Keharmonisan Skala, Tipografi Profesional, Compact High-Contrast.
 */
export default function WorkOrderCard(props: WorkOrderCardProps) {
    const { 
        item, 
        onManageAssignments, 
        onHandover, 
        onHandoverSbuToAdmin,
        onSendLinks, 
        onViewMap,
        onOpenDetails,
        onAddAdvance,
        formatThousand
    } = props;
    const statusKey = getOperationalStatus(item);
    const sc = getStatusConfig(statusKey);
    const woStatus = item.work_orders?.status;
    const assignedCount = item.assignments?.length || 0;
    
    const isDone = item.assignments?.every(a => a.status === 'delivered') && assignedCount > 0;
    const isJourney = item.assignments?.some(a => a.is_link_sent);

    const statusStyles = {
        draft: { bg: 'bg-slate-100', text: 'text-slate-600', bar: 'bg-slate-300' },
        pending: { bg: 'bg-amber-100', text: 'text-amber-700', bar: 'bg-amber-400' },
        on_journey: { bg: 'bg-blue-100', text: 'text-blue-700', bar: 'bg-blue-500' },
        finished: { bg: 'bg-emerald-100', text: 'text-emerald-700', bar: 'bg-emerald-500' },
        rejected: { bg: 'bg-red-100', text: 'text-red-700', bar: 'bg-red-500' },
        billing_revision: { bg: 'bg-rose-100', text: 'text-rose-700', bar: 'bg-rose-600' },
    };

    const style = statusStyles[statusKey as keyof typeof statusStyles] || statusStyles.draft;

    return (
        <div className="bg-white border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.02)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-all group flex flex-col h-full active:scale-[0.98]">
            
            {/* Status Bar Atlas Style */}
            <div className={`h-1.5 w-full ${style.bar}`} />
            
            <div className="p-7 flex-1 flex flex-col space-y-6">
                
                {/* ID & Customer Section - HARMONIC SCALE */}
                <div className="flex justify-between items-start gap-4">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-1.5">
                            <span className="text-[10px] font-black text-slate-400 tracking-[0.2em] uppercase px-2.5 py-0.5 bg-slate-50 rounded-md border border-slate-100">
                               #{item.work_orders?.wo_number || 'TBA'}
                            </span>
                            {isJourney && <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />}
                        </div>
                        <h3 className="text-[20px] md:text-[22px] font-black text-[#1E293B] italic leading-tight tracking-tighter uppercase group-hover:text-emerald-600 transition-colors line-clamp-2">
                            {item.work_orders?.customers?.company_name || 'Generic Customer'}
                        </h3>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <div className={`${style.bg} ${style.text} px-3.5 py-1 rounded-full text-[9px] font-black tracking-widest uppercase border border-current shadow-sm`}>
                        {sc.label}
                    </div>
                </div>

                {/* Finance Rejection Note Alert */}
                {statusKey === 'billing_revision' && (
                    <div className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex gap-3 animate-in slide-in-from-top-2">
                        <AlertTriangle className="w-5 h-5 text-rose-500 flex-shrink-0" />
                        <div>
                            <p className="text-[9px] font-black text-rose-800 uppercase tracking-widest leading-none mb-1">Finance Note</p>
                            <p className="text-[12px] font-bold text-rose-600 italic line-clamp-2">
                                {item.assignments?.find(a => a.billing_status === 'rejected')?.rejection_note || "Revision needed for billing selection."}
                            </p>
                        </div>
                    </div>
                )}

                {/* Atlas Route Visualizer - HARMONIC REFINEMENT */}
                <div className="relative pl-7 space-y-6">
                    <div className="absolute left-[7px] top-2 bottom-2 w-0.5 border-l-2 border-dashed border-slate-200" />
                    
                    <div className="relative">
                        <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 border-emerald-500 bg-white" />
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 italic opacity-60">Origin</p>
                        <p className="text-[15px] md:text-[16px] font-black text-[#1E293B] italic leading-tight uppercase tracking-tight">{item.origin_location?.name || 'Loading Area'}</p>
                        <p className="text-[11px] text-slate-400 font-bold uppercase truncate">{item.origin_location?.city}</p>
                    </div>

                    <div className="relative">
                        <div className="absolute -left-[27px] top-1 w-3.5 h-3.5 rounded-full border-2 border-blue-500 bg-white" />
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 italic opacity-60">Destination</p>
                        <p className="text-[15px] md:text-[16px] font-black text-[#1E293B] italic leading-tight uppercase tracking-tight">{item.destination_location?.name || 'Unloading Point'}</p>
                        <p className="text-[11px] text-slate-400 font-bold uppercase truncate">{item.destination_location?.city}</p>
                    </div>
                </div>

                {/* SBU Mission Progress - Better Scaling */}
                <div className="flex-1 space-y-4">
                    <div className="bg-slate-50/50 border border-slate-100 rounded-[2rem] p-5">
                        {assignedCount > 0 ? (
                            <div className="space-y-3">
                                <div className="flex justify-between items-center px-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Deployments ({assignedCount}/{item.quantity})</p>
                                    {isDone && <span className="text-emerald-600 text-[8px] font-black flex items-center gap-1 uppercase tracking-widest bg-emerald-50 px-2 py-0.5 rounded-md">VERIFIED</span>}
                                </div>
                                <div className="space-y-2">
                                    {item.assignments.slice(0, 5).map((a, idx) => (
                                            <div 
                                                key={a.id} 
                                                className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200/60 transition-all hover:border-emerald-500/30 group/jo relative"
                                            >
                                                <div 
                                                    className={`flex items-center gap-3 min-w-0 flex-1 ${woStatus === 'pending_armada_check' ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`} 
                                                    onClick={() => woStatus !== 'pending_armada_check' && onOpenDetails(a)}
                                                >
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors border ${a.is_link_sent ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'} ${woStatus !== 'pending_armada_check' && 'group-hover/jo:scale-105'}`}>
                                                        <Truck className="w-4 h-4" />
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-1.5">
                                                            <p className="text-[12px] font-black text-[#1E293B] uppercase tracking-tighter italic">{a.fleet_number}</p>
                                                            {a.physical_doc_received && <ShieldCheck className="w-3 h-3 text-emerald-500" />}
                                                        </div>
                                                        <p className="text-[9px] font-bold text-slate-400 uppercase truncate">{a.driver_name}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {woStatus === 'approved' && onAddAdvance && (
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); onAddAdvance(a.id); }}
                                                            className="p-2 hover:bg-emerald-50 text-emerald-600 rounded-lg transition-colors border border-transparent hover:border-emerald-100 group/adv"
                                                            title="Request Advance"
                                                        >
                                                            <Banknote className="w-4 h-4 group-hover/adv:scale-110" />
                                                        </button>
                                                    )}
                                                    <ChevronRight 
                                                        onClick={() => woStatus !== 'pending_armada_check' && onOpenDetails(a)} 
                                                        className={`w-4 h-4 transition-transform ${woStatus === 'pending_armada_check' ? 'text-slate-200 cursor-not-allowed' : 'text-slate-300 group-hover/jo:text-emerald-600 group-hover/jo:translate-x-1 cursor-pointer'}`} 
                                                    />
                                                </div>
                                            </div>
                                    ))}
                                    {item.assignments.length > 5 && (
                                        <p className="text-[9px] font-black text-slate-400 uppercase text-center pt-1">+{item.assignments.length - 5} more units...</p>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center py-5 text-center opacity-40">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center mb-2 shadow-sm border border-slate-100 font-black italic text-slate-300">!</div>
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fleet Not Assigned</p>
                            </div>
                        )}
                    </div>

                    {(() => {
                        const hasUnpaidAdvances = item.assignments?.some(a => 
                            a.finance_status !== 'paid' && 
                            a.cash_advances?.some((ca: any) => ca.status === 'pending')
                        );

                        const hasPaidAdvances = item.assignments?.some(a => 
                            a.finance_status === 'paid' || 
                            a.cash_advances?.some((ca: any) => ca.status === 'approved')
                        );

                        if (!hasUnpaidAdvances && !hasPaidAdvances) return null;

                        if (hasUnpaidAdvances) {
                            return (
                                <div className="mx-1 bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-4 animate-pulse">
                                    <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-sm shadow-amber-500/20">
                                        <Banknote className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest mb-0.5 leading-none">Fiscal Bottleneck</p>
                                        <p className="text-[11px] font-black text-[#1E293B] uppercase italic leading-tight">
                                            Menunggu Transfer Kasbon
                                        </p>
                                    </div>
                                </div>
                            );
                        }

                        if (hasPaidAdvances) {
                            return (
                                <div className="mx-1 bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white flex-shrink-0 shadow-sm shadow-emerald-500/20">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest mb-0.5 leading-none">Liquidity Released</p>
                                        <p className="text-[11px] font-black text-[#1E293B] uppercase italic leading-tight">
                                            Uang Jalan Telah Dibayar
                                        </p>
                                    </div>
                                </div>
                            );
                        }

                        return null;
                    })()}
                </div>

                {/* Card Specs - HARMONIC RESTRUCTURED */}
                <div className="pt-5 border-t border-slate-100 space-y-3">
                    <div className="bg-slate-50/80 p-4 rounded-xl border border-slate-100 space-y-3">
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2.5">
                                <Truck className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-[11px] font-black text-slate-600 uppercase italic tracking-tight">{item.truck_type}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="text-[18px] font-black text-[#1E293B] italic leading-none">{item.quantity}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Units</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center border-t border-slate-200/60 pt-3">
                            <div className="flex items-center gap-2">
                                <Banknote className="w-3.5 h-3.5 text-emerald-500" />
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Contract Value</span>
                            </div>
                            <div className="text-right">
                                <span className="text-[13px] font-black text-emerald-600 italic tracking-tight">Rp {formatThousand(item.deal_price || 0)}</span>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">/ Unit</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-between items-center px-1">
                        <div className="space-y-0.5">
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest italic">Order</p>
                            <div className="flex items-center gap-1.5">
                                <Clock className="w-3 h-3 text-slate-300" />
                                <span className="text-[11px] font-black text-slate-400 italic">
                                   {item.work_orders?.created_at ? new Date(item.work_orders.created_at).toLocaleDateString() : 'N/A'}
                                </span>
                            </div>
                        </div>
                        <div className="text-right space-y-0.5">
                            <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest italic">Execution</p>
                            <div className="flex items-center gap-1.5 justify-end">
                                <Calendar className="w-3 h-3 text-emerald-500" />
                                <span className="text-[12px] font-black text-[#1E293B] italic uppercase">
                                   {item.work_orders?.execution_date || 'TBA'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ATLAS ACTIONS - HARMONIC BUTTONS */}
                <div className="pt-4">
                    {(woStatus === 'draft' || woStatus === 'pending_sbu') ? (
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => onManageAssignments(item)}
                                className="w-full bg-[#1E293B] hover:bg-emerald-600 text-white flex-1 py-4 rounded-[1.5rem] font-black text-[10px] md:text-[11px] uppercase tracking-[0.1em] transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2 group"
                            >
                                <PlusCircle className="w-4 h-4 group-hover:rotate-90 transition-transform" /> Assign
                            </button>
                            <button 
                                onClick={() => onHandoverSbuToAdmin && onHandoverSbuToAdmin(item)}
                                className="w-full bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 hover:text-rose-600 flex-1 py-4 rounded-[1.5rem] font-black text-[10px] md:text-[11px] uppercase tracking-widest transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
                            >
                                <AlertTriangle className="w-4 h-4" /> Handovers
                            </button>
                        </div>
                    ) : woStatus === 'approved' ? (
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => onViewMap(item)}
                                className="bg-white border border-slate-200 hover:bg-slate-50 text-[#1E293B] py-3.5 rounded-[1.2rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-sm"
                            >
                                <Map className="w-3.5 h-3.5 text-blue-500" /> Live Map
                            </button>
                            <button 
                                onClick={() => onManageAssignments(item)}
                                className="bg-[#1E293B] hover:bg-emerald-600 text-white py-3.5 rounded-[1.2rem] font-black text-[10px] uppercase tracking-widest transition-all shadow-md active:scale-95"
                            >
                                Manage Units
                            </button>
                        </div>
                    ) : isDone ? (
                        <div className="flex flex-col gap-2.5">
                            <button 
                                onClick={() => {
                                    if (woStatus === 'pending_armada_check') return;
                                    if (item.assignments && item.assignments.length > 0) {
                                        onOpenDetails(item.assignments[0]);
                                    }
                                }}
                                disabled={woStatus === 'pending_armada_check'}
                                className={`w-full py-4.5 rounded-[1.5rem] font-black text-[11px] uppercase tracking-widest transition-all shadow-lg active:scale-95 flex items-center justify-center gap-3 group ${
                                    woStatus === 'pending_armada_check'
                                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed grayscale'
                                    : 'bg-[#1E293B] hover:bg-emerald-600 text-white'
                                }`}
                            >
                                <Banknote className={`w-4.5 h-4.5 ${woStatus === 'pending_armada_check' ? 'text-slate-300' : 'text-emerald-400 group-hover:scale-110'} transition-transform`} /> 
                                {woStatus === 'pending_armada_check' ? 'Locked (Pending Approval)' : 'Cost Settlement & Logs'}
                            </button>
                            <div className="grid grid-cols-2 gap-3">
                                <button 
                                    onClick={() => window.open(`/sbu/trucking/report/${item.work_order_id}`, '_blank')}
                                    className="bg-white border border-slate-200 hover:bg-slate-50 text-[#1E293B] py-3.5 rounded-[1.2rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                >
                                    <Printer className="w-3.5 h-3.5 text-emerald-500" /> Print
                                </button>
                                {woStatus !== 'pending_armada_check' && (
                                    <button 
                                        onClick={() => onHandover(item)}
                                        className="bg-white border border-slate-200 text-[#1E293B] py-3.5 rounded-[1.2rem] font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                                    >
                                        <FolderOpen className="w-3.5 h-3.5 text-blue-500" /> Documents
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 gap-3">
                             <button 
                                onClick={() => onViewMap(item)}
                                className="bg-slate-100 hover:bg-emerald-100 hover:text-emerald-600 text-slate-600 py-3.5 rounded-[1.2rem] font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2.5 shadow-inner"
                             >
                                <Map className="w-3.5 h-3.5" /> Live
                             </button>
                             <button 
                                onClick={() => woStatus !== 'pending_armada_check' && onManageAssignments(item)}
                                disabled={woStatus === 'pending_armada_check'}
                                className={`py-3.5 rounded-[1.2rem] font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 ${
                                    woStatus === 'pending_armada_check'
                                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed grayscale'
                                    : 'bg-[#1E293B] hover:bg-emerald-600 text-white shadow-lg shadow-slate-900/10'
                                }`}
                             >
                                {woStatus === 'pending_armada_check' ? 'Locked (Pending)' : 'Assign & Manage'}
                             </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
