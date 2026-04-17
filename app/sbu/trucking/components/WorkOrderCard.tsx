"use client";

import { 
    Truck, MapPin, Navigation, Calendar, 
    ChevronRight, CheckCircle2, XCircle, Activity, 
    Globe, Printer, Banknote, ShieldCheck, Clock, Inbox,
    PlusCircle, Send
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
    formatThousand: (val: number | string) => string;
}

export default function WorkOrderCard({ 
    item, 
    onManageAssignments, 
    onHandover, 
    onSendLinks, 
    onViewMap,
    onOpenDetails,
    formatThousand
}: WorkOrderCardProps) {
    const sc = getStatusConfig(getOperationalStatus(item));
    const woStatus = item.work_orders?.status;
    const assignedCount = item.assignments?.length || 0;
    
    const isDone = item.assignments?.every(a => a.status === 'delivered') && assignedCount > 0;
    const isJourney = item.assignments?.some(a => a.is_link_sent);

    return (
        <div className="bg-[#151f32] border border-white/10 rounded-[2rem] overflow-hidden shadow-xl active:scale-[0.98] transition-all group flex flex-col h-full">
            {/* Visual Indicator Line */}
            <div className={`h-1.5 w-full ${sc.bg.replace('/10', '')}`} />
            
            <div className="p-5 flex-1 flex flex-col space-y-4">
                {/* Card Header */}
                <div className="flex justify-between items-start">
                    <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-slate-500 tracking-[0.2em] mb-1">#{item.work_orders?.wo_number || 'PENDING'}</p>
                        <h3 className="text-lg font-black text-white leading-tight line-clamp-1 group-hover:text-emerald-400 transition-colors">
                            {item.work_orders?.customers?.company_name || 'Generic Customer'}
                        </h3>
                    </div>
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-black border flex-shrink-0 ${sc.bg} ${sc.color} ${sc.border}`}>
                        {sc.label}
                    </span>
                </div>

                {/* Route Section */}
                <div className="space-y-1 relative">
                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
                            <MapPin className="w-4 h-4 text-emerald-500" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Origin</p>
                            <p className="text-sm font-bold text-slate-200 truncate">{item.origin_location?.name || 'Unknown'}</p>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                        <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                            <Navigation className="w-4 h-4 text-blue-500" />
                        </div>
                        <div className="min-w-0">
                            <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Destination</p>
                            <p className="text-sm font-bold text-slate-200 truncate">{item.destination_location?.name || 'Unknown'}</p>
                        </div>
                    </div>
                </div>

                {/* Assignment Progress or Details */}
                <div className="flex-1">
                    {assignedCount > 0 ? (
                        <div className="space-y-2">
                            <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest px-1 flex justify-between">
                                <span>Assignments ({assignedCount}/{item.quantity})</span>
                                {isDone && <span className="text-emerald-500 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> COMPLETED</span>}
                            </p>
                            <div className="grid grid-cols-1 gap-2">
                                {item.assignments.slice(0, 3).map(a => (
                                    <div 
                                        key={a.id} 
                                        className="flex items-center justify-between bg-white/[0.03] hover:bg-white/[0.08] p-3 rounded-2xl border border-white/5 transition-all group/jo"
                                    >
                                        <div 
                                            onClick={() => onOpenDetails(a)}
                                            className="flex items-center gap-3 flex-1 cursor-pointer min-w-0"
                                        >
                                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${a.status === 'delivered' ? 'bg-emerald-500/20 text-emerald-500' : 'bg-blue-500/20 text-blue-500'}`}>
                                                <Truck className="w-4 h-4" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-xs font-black text-white truncate">{a.fleet_number}</p>
                                                <div className="flex items-center gap-1.5 overflow-hidden">
                                                    <p className="text-[9px] font-black text-slate-500 uppercase truncate max-w-[60px]">{a.driver_name}</p>
                                                    <span className="text-slate-700">•</span>
                                                    <p className="text-[9px] font-black italic text-blue-400 uppercase truncate">
                                                        {a.last_tracking?.status_update || 'Ready'}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <ChevronRight onClick={() => onOpenDetails(a)} className="w-4 h-4 text-slate-700 group-hover/jo:translate-x-1 group-hover/jo:text-white transition-all cursor-pointer" />
                                        </div>
                                    </div>
                                ))}
                                {assignedCount > 3 && (
                                    <p className="text-[10px] text-center font-bold text-slate-600 py-1">+{assignedCount - 3} armada lainnya</p>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center py-6 text-center opacity-40">
                            <Inbox className="w-8 h-8 text-slate-500 mb-2" />
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Belum ada armada</p>
                        </div>
                    )}
                </div>

                {/* Footer Info */}
                <div className="flex justify-between items-center pt-4 border-t border-white/5">
                    <div className="flex items-center gap-2 text-slate-400">
                        <Truck className="w-4 h-4" />
                        <span className="text-sm font-black text-white">{item.quantity} <span className="text-[10px] font-normal text-slate-500">Unit</span></span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-400">
                        <Calendar className="w-4 h-4" />
                        <span className="text-xs font-bold">{item.work_orders?.execution_date || 'TBA'}</span>
                    </div>
                </div>

                {/* Actions */}
                <div className="pt-2 space-y-2">
                    {/* Primary Button based on state */}
                    {(woStatus === 'draft' || woStatus === 'pending_sbu') ? (
                        <button 
                            onClick={() => onManageAssignments(item)}
                            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-900/20 flex items-center justify-center gap-2 active:scale-95"
                        >
                            <PlusCircle className="w-4 h-4" /> Kelola Penugasan
                        </button>
                    ) : (woStatus === 'approved' && assignedCount < item.quantity) ? (
                        <button 
                            onClick={() => onManageAssignments(item)}
                            className="w-full bg-slate-800 text-slate-500 py-4 rounded-2xl font-black text-xs uppercase tracking-widest border border-white/5 cursor-not-allowed opacity-50"
                        >
                            <CheckCircle2 className="w-4 h-4" /> Assignments Locked
                        </button>
                    ) : isJourney ? (
                        <div className="flex flex-col gap-2 opacity-30 pointer-events-none grayscale">
                             <button className="w-full bg-slate-800 text-slate-500 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] border border-white/5">
                                On Journey
                            </button>
                        </div>
                    ) : isDone ? (
                        <div className="flex flex-col gap-2">
                            <button 
                                onClick={() => window.open(`/sbu/trucking/report/${item.work_order_id}`, '_blank')}
                                className="w-full bg-slate-700 hover:bg-slate-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 active:scale-95"
                            >
                                <Printer className="w-4 h-4" /> Download Report
                            </button>
                            {woStatus !== 'pending_armada_check' && (
                                <button 
                                    onClick={() => onHandover(item)}
                                    className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] border border-amber-500/20 transition-all active:scale-95"
                                >
                                    Handover ke Admin
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            {assignedCount >= item.quantity && woStatus !== 'pending_armada_check' && (
                                <button 
                                    onClick={() => onHandover(item)}
                                    className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 py-3 rounded-xl font-black text-[10px] uppercase tracking-[0.2em] border border-amber-500/20 transition-all active:scale-95"
                                >
                                    Handover ke Admin
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
