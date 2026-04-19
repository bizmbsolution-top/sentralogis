"use client";

import { 
    XCircle, Truck, Activity, Loader2, MapPin, 
    Clock, ImageIcon, ExternalLink, Banknote, 
    CheckCircle2, FileText, Send, Save, PlusCircle, X, ArrowRight, Receipt,
    ShieldCheck, ScanLine, User, Phone, Map, List, Navigation, History
} from "lucide-react";
import { GoogleMap, MarkerF, DirectionsRenderer, Polyline } from "@react-google-maps/api";
import { formatThousand, getOperationalStatus } from "../utils";
import { useState, useEffect } from "react";

interface JODetailDrawerProps {
    show: boolean;
    onClose: () => void;
    jo: any;
    isLoaded: boolean;
    mapOptions: any;
    getJOStatusBadge: (status: string) => string;
    onAddCost: (joId: string) => void;
    onAddAdvance: (joId: string) => void;
    onCollectDocs: (jo: any) => void;
    onSubmitVendorInvoice: (jo: any) => void;
    onVerifyPhysicalDoc?: (jo: any) => void;
    onSendLink?: (id: string) => void;
    onEdit?: (item: any, joId?: string) => void;
    onApprove?: (jo: any) => void;
    onReject?: (jo: any) => void;
}

/**
 * JO DETAIL DRAWER: ATLAS OPERATIONAL COCKPIT (UPGRADED FONT)
 * Fokus: Kejelasan Data Ekstrim, Atlas Bold Italic, High Readability.
 */
export default function JODetailDrawer({
    show, onClose, jo, isLoaded, mapOptions, 
    getJOStatusBadge, onAddCost, onAddAdvance, onCollectDocs,
    onSubmitVendorInvoice, onSendLink, onEdit, onApprove, onReject
}: JODetailDrawerProps) {
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

    useEffect(() => {
        if (show && jo && isLoaded) {
            const oLat = parseFloat(jo.latitude);
            const oLng = parseFloat(jo.longitude);
            const dLat = parseFloat(jo.dest_lat);
            const dLng = parseFloat(jo.dest_lng);

            const originVal = (!isNaN(oLat) && !isNaN(oLng)) ? { lat: oLat, lng: oLng } : null;
            const destVal = (!isNaN(dLat) && !isNaN(dLng)) ? { lat: dLat, lng: dLng } : null;

            if (originVal && destVal) {
                const directionsService = new window.google.maps.DirectionsService();
                directionsService.route(
                    { origin: originVal, destination: destVal, travelMode: window.google.maps.TravelMode.DRIVING },
                    (result, status) => {
                        if (status === window.google.maps.DirectionsStatus.OK) {
                            setDirections(result);
                        } else {
                            setDirections(null);
                        }
                    }
                );
            }
        } else {
            setDirections(null);
        }
    }, [show, jo, isLoaded]);

    if (!show || !jo) return null;

    const isSettled = jo.billing_status === 'invoiced' || jo.billing_status === 'paid';
    const woStatus = jo.parentWO?.work_orders?.status || jo.work_orders?.status;
    const isLocked = woStatus === 'pending_armada_check';
    const isActionDisabled = isSettled || isLocked;

    return (
        <div className="fixed inset-0 z-[600] flex items-end md:items-center justify-center p-0 md:p-6 lg:p-12">
            {/* Backdrop Atlas Style */}
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md transition-opacity" onClick={onClose} />
            
            {/* Main Panel Atlas Style */}
            <div className="relative w-full max-w-6xl bg-white rounded-t-[4rem] md:rounded-[4rem] shadow-[0_30px_120px_rgba(0,0,0,0.25)] flex flex-col max-h-[96vh] overflow-hidden border border-slate-100 animate-in slide-in-from-bottom duration-500 font-sans">
                
                {/* 🔴 DRAWER HEADER - BIG FONT */}
                <div className="p-10 md:p-12 border-b border-slate-100 bg-white flex items-center justify-between sticky top-0 z-20">
                    <div className="flex items-center gap-8">
                        <div className="w-20 h-20 rounded-[2.2rem] bg-slate-50 border border-slate-200 flex items-center justify-center text-[#1E293B] shadow-sm transform -rotate-3 transition-transform hover:rotate-0">
                            <Truck className="w-10 h-10" />
                        </div>
                        <div className="min-w-0">
                            <div className="flex items-center gap-4 mb-2">
                                <span className="text-[12px] font-black text-slate-400 uppercase tracking-widest italic">Operations Cockpit</span>
                                <div className="h-0.5 w-6 bg-emerald-500 rounded-full" />
                                <span className="text-[12px] font-black text-emerald-500 uppercase tracking-widest italic hover:scale-105 transition-transform">JOB: {jo.jo_number?.split('-').pop()}</span>
                            </div>
                            <div className="flex items-end gap-8">
                                <h2 className="text-4xl md:text-5xl font-black italic tracking-tighter text-[#1E293B] uppercase leading-none">
                                    {jo.fleet_number}
                                </h2>
                                {isLocked && (
                                    <div className="bg-amber-50 md:bg-amber-100 border border-amber-200 px-4 py-2 rounded-2xl flex items-center gap-2 animate-pulse">
                                        <AlertCircle className="w-4 h-4 text-amber-600" />
                                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest leading-none">Operation Locked (Pending Approval)</span>
                                    </div>
                                )}
                                <div className="hidden md:flex flex-col items-start pb-1">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 leading-none">Planned Advance</p>
                                    <p className="text-2xl font-black italic text-emerald-500 leading-none">Rp {(jo.vendor_price || 0).toLocaleString('id-ID')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {jo.status === 'assigned' && !isActionDisabled && (
                            <div className="hidden lg:flex items-center gap-3">
                                <button 
                                    onClick={() => onReject && onReject(jo)}
                                    className="px-6 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 transition-all active:scale-95 flex items-center gap-2"
                                >
                                    <XCircle className="w-4 h-4" /> Reject Assignment
                                </button>
                                <button 
                                    onClick={() => onApprove && onApprove(jo)}
                                    className="px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-500/20 active:scale-95 flex items-center gap-3"
                                >
                                    <ShieldCheck className="w-5 h-5" /> Approve Deployment
                                </button>
                            </div>
                        )}
                        {jo.status === 'approved' && jo.driver_phone && (
                            <div className="hidden lg:flex flex-col items-end">
                                <button 
                                    onClick={() => onSendLink && onSendLink(jo.id)}
                                    disabled={isLocked || jo.cash_advances?.some((ca:any) => ca.status === 'pending')}
                                    className={`px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 flex items-center gap-3 group ${isLocked || jo.cash_advances?.some((ca:any) => ca.status === 'pending') ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'}`}
                                >
                                    <Send className={`w-4 h-4 ${(!isLocked && !jo.cash_advances?.some((ca:any) => ca.status === 'pending')) && 'group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform'}`} /> 
                                    {isLocked ? 'LOCKED' : (jo.is_link_sent ? 'RESEND SIGNAL' : 'SEND TRACK LINK')}
                                </button>
                                {jo.cash_advances?.some((ca:any) => ca.status === 'pending') && !isLocked && (
                                    <span className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-2 animate-pulse pr-2">Awaiting Fiscal Settlement</span>
                                )}
                            </div>
                        )}
                        <button onClick={onClose} className="w-14 h-14 bg-slate-50 rounded-3xl flex items-center justify-center text-slate-400 hover:bg-rose-50 hover:text-rose-500 transition-all shadow-inner">
                            <X className="w-8 h-8" />
                        </button>
                    </div>
                </div>

                {/* 🟢 DRAWER BODY */}
                <div className="flex-1 overflow-y-auto p-10 md:p-14 space-y-14 pb-40 custom-scrollbar">
                    
                    {/* 🚀 DEPLOYMENT INFO CARD - ATLAS STYLE */}
                    <div className="bg-[#1E293B] rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden group">
                        {/* Decorative Background Elements */}
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl group-hover:bg-emerald-500/20 transition-all duration-700" />
                        <div className="absolute -left-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl group-hover:bg-blue-500/20 transition-all duration-700" />

                        <div className="relative z-10 space-y-8">
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 px-3 py-1 bg-white/5 rounded-lg w-fit border border-white/10">Mission Strategy</p>
                                    <h4 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-tight">
                                        {jo.fleets?.plate_number} <span className="text-emerald-400">/</span> {jo.drivers?.name || 'No Pilot'}
                                    </h4>
                                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                                        {!jo.fleets?.company_id ? 'SBU Internal Fleet' : `Outsourced: ${jo.fleets?.companies?.name || 'Vendor'}`}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Contract Revenue</p>
                                    <p className="text-xl font-black italic text-emerald-400 leading-none">Rp {(jo.parentWO?.deal_price || 0).toLocaleString('id-ID')}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/5">
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <MapPin className="w-4 h-4 text-emerald-400" />
                                        <div className="min-w-0">
                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Origin</p>
                                            <p className="text-sm font-black uppercase italic tracking-tight truncate">{jo.parentWO?.origin_location?.name || 'Warehouse'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Navigation className="w-4 h-4 text-blue-400" />
                                        <div className="min-w-0">
                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Destination</p>
                                            <p className="text-sm font-black uppercase italic tracking-tight truncate">{jo.parentWO?.destination_location?.name || 'Site'}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white/5 rounded-3xl p-6 border border-white/10 flex flex-col justify-center items-center text-center">
                                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-2 leading-none">Planned Advance / Rate</p>
                                    <p className="text-2xl font-black italic text-white leading-none">Rp {(jo.vendor_price || 0).toLocaleString('id-ID')}</p>
                                    <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mt-2">{!jo.fleets?.company_id ? 'Uang Jalan Assignment' : 'Vendor Service Contract'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* TOP ACTION BAR - BOLD INFO */}
                    <div className="flex flex-col md:flex-row gap-8 items-center justify-between bg-white p-8 rounded-[3rem] border-2 border-slate-50 shadow-sm relative overflow-hidden group">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-16 -mt-16 group-hover:bg-emerald-500/10 transition-colors" />
                         <div className="flex items-center gap-8 relative z-10 font-sans">
                            <div className="w-18 h-18 rounded-[1.8rem] bg-[#1E293B] flex items-center justify-center shadow-xl">
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
                                        className="flex-1 px-4 py-5 bg-rose-50 text-rose-600 rounded-[2rem] text-[10px] font-black uppercase tracking-widest border border-rose-100 shadow-sm"
                                    >
                                        Reject
                                    </button>
                                    <button 
                                        onClick={() => onApprove && onApprove(jo)}
                                        className="flex-[2] px-4 py-5 bg-emerald-600 text-white rounded-[2rem] text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 active:scale-95"
                                    >
                                        Approve
                                    </button>
                                </div>
                            )}
                            {jo.status === 'approved' && jo.driver_phone && (
                                <div className="lg:hidden flex-1">
                                    <button 
                                        onClick={() => onSendLink && onSendLink(jo.id)}
                                        disabled={jo.cash_advances?.some((ca:any) => ca.status === 'pending')}
                                        className={`w-full px-8 py-5 rounded-[2rem] text-[12px] font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 flex items-center justify-center gap-4 group ${jo.cash_advances?.some((ca:any) => ca.status === 'pending') ? 'bg-slate-200 text-slate-300 cursor-not-allowed border border-slate-300' : 'bg-[#1E293B] hover:bg-emerald-600 text-white shadow-slate-900/10'}`}
                                    >
                                        <Send className="w-5 h-5" /> 
                                        {jo.is_link_sent ? 'RESEND' : 'SEND LINK'}
                                    </button>
                                </div>
                            )}
                            {isActionDisabled ? (
                                <div className="flex-1 md:flex-none px-8 py-5 bg-slate-100 border-2 border-slate-200 text-slate-400 rounded-[2rem] text-[12px] font-black uppercase tracking-widest flex items-center justify-center cursor-not-allowed shadow-inner">
                                    {isLocked ? 'LOCKED (PENDING APPROVAL)' : 'LOCKED (SETTLED)'}
                                </div>
                            ) : (
                                <button 
                                    onClick={() => onEdit && onEdit(jo.parentWO, jo.id)}
                                    className="flex-1 md:flex-none px-8 py-5 bg-white border-2 border-slate-100 text-[#1E293B] rounded-[2rem] text-[12px] font-black uppercase tracking-widest hover:bg-slate-50 transition-all shadow-sm"
                                >
                                    Edit Context
                                </button>
                            )}
                         </div>
                    </div>

                    {/* TWO COLUMN CONTENT: MAP & TIMELINE */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                        {/* Map Widget - Bigger Aspect */}
                        <div className="aspect-square md:aspect-video lg:h-[600px] relative rounded-[3.5rem] overflow-hidden border-2 border-slate-50 shadow-xl bg-slate-50 group">
                            <div className="absolute top-8 left-8 z-10 bg-white shadow-xl px-6 py-3 rounded-2xl border border-slate-100">
                                <p className="text-[11px] font-black text-[#1E293B] uppercase tracking-widest flex items-center gap-3 italic">
                                    <Navigation className="w-4 h-4 text-emerald-600" /> Ground Telemetry Support
                                </p>
                            </div>
                            {!isLoaded ? (
                                <div className="w-full h-full flex flex-col items-center justify-center gap-4">
                                    <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                                    <p className="text-[11px] font-black uppercase text-slate-300 italic">Syncing Grid Coordinates...</p>
                                </div>
                            ) : (
                                <GoogleMap
                                    mapContainerStyle={{ width: '100%', height: '100%' }}
                                    options={{ ...mapOptions, styles: [{ featureType: "all", elementType: "geometry", stylers: [{ lightness: -5 }] }] }}
                                    center={(() => {
                                        // Default Jakarta center
                                        const fallback = { lat: -6.2088, lng: 106.8456 };
                                        
                                        const latest = jo.tracking_updates?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                                        
                                        if (latest?.location) {
                                            const coords = latest.location.split(',').map((c: any) => parseFloat(c.trim()));
                                            if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                                                return { lat: coords[0], lng: coords[1] };
                                            }
                                        }
                                        
                                        // Fallback to JO origin or default
                                        const joLat = parseFloat(jo.latitude);
                                        const joLng = parseFloat(jo.longitude);
                                        
                                        if (!isNaN(joLat) && !isNaN(joLng)) {
                                            return { lat: joLat, lng: joLng };
                                        }
                                        
                                        return fallback;
                                    })()}
                                    zoom={12}
                                >
                                    {directions && <DirectionsRenderer directions={directions} options={{ polylineOptions: { strokeColor: "#10B981", strokeWeight: 5 } }} />}
                                </GoogleMap>
                            )}
                        </div>

                        {/* Journey History - COMFORTABLE FONT */}
                        <div className="bg-slate-50/50 rounded-[3.5rem] border border-slate-100 flex flex-col overflow-hidden max-h-[600px] shadow-inner">
                            <div className="p-8 border-b border-slate-200/60 bg-white flex items-center justify-between">
                                <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-3">
                                   <History className="w-4 h-4 text-emerald-500" /> Global Mission Feed
                                </p>
                                <div className="px-5 py-2 bg-slate-100 rounded-xl text-[10px] font-black text-slate-600 uppercase italic">
                                    {jo.tracking_updates?.length || 0} Events
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar">
                                {jo.tracking_updates?.length > 0 ? (
                                    <div className="p-8 space-y-10">
                                        {[...jo.tracking_updates].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((t: any, idx: number) => (
                                            <div key={t.id} className="relative flex items-start gap-8">
                                                <div className="flex flex-col items-center h-full absolute -left-[4px] top-0 bottom-0 py-3">
                                                    <div className={`w-4 h-4 rounded-full border-4 bg-white ${idx === 0 ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'border-slate-200'}`} />
                                                    <div className="w-0.5 flex-1 bg-slate-200 my-2" />
                                                </div>
                                                <div className="flex-1 min-w-0 pl-6">
                                                    <p className={`text-[17px] font-black uppercase italic tracking-tight leading-none ${idx === 0 ? 'text-[#1E293B]' : 'text-slate-400'}`}>
                                                        {t.status_update}
                                                    </p>
                                                    <div className="flex items-center gap-4 mt-2">
                                                        <div className="flex items-center gap-2">
                                                            <Clock className="w-4 h-4 text-slate-300" />
                                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                                                                {new Date(t.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} • {new Date(t.created_at).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center opacity-30 text-slate-400 text-center gap-6 py-20 font-sans">
                                        <Activity className="w-16 h-16 animate-pulse" />
                                        <p className="text-[12px] font-black uppercase tracking-[0.3em] italic">Scanning Operations Area...</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 🎫 EVIDENCE & FINANCIALS SECTION - BIGGER TEXT */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12 pt-6">
                        
                        {/* Physical Doc Verification Widget */}
                        <div className="space-y-8 col-span-full">
                            <h4 className="text-[15px] font-black text-[#1E293B] uppercase italic tracking-widest flex items-center gap-4 px-2">
                                <ScanLine className="w-6 h-6 text-orange-500" /> Physical Document Compliance
                            </h4>
                            <div className={`p-8 rounded-[3rem] border-2 ${jo.physical_doc_received ? 'bg-emerald-50 border-emerald-100' : 'bg-orange-50/50 border-orange-100'} flex flex-col md:flex-row items-center justify-between gap-8 transition-all`}>
                                <div className="flex items-center gap-6">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm ${jo.physical_doc_received ? 'bg-emerald-600 text-white' : 'bg-orange-500 text-white animate-pulse'}`}>
                                        <ShieldCheck className="w-8 h-8" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">SBU Operational Gate</p>
                                        <h5 className="text-xl font-black italic text-[#1E293B] uppercase tracking-tight truncate leading-none">
                                            {jo.physical_doc_received ? 'Documents Verified & Received' : 'Awaiting Hardcopy Handover'}
                                        </h5>
                                        <p className="text-[11px] font-bold text-slate-500 mt-2 uppercase tracking-wide">
                                            {jo.physical_doc_received 
                                                ? `Received on ${new Date(jo.physical_doc_collected_at).toLocaleDateString()} • Verified by SBU Team` 
                                                : 'Verify physical Surat Jalan & POD before settlement.'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    {!jo.physical_doc_received ? (
                                        <button 
                                            onClick={() => !isLocked && onVerifyPhysicalDoc && onVerifyPhysicalDoc(jo)}
                                            disabled={isLocked}
                                            className={`px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] transform active:scale-95 transition-all shadow-xl flex items-center gap-3 ${isLocked ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-slate-200' : 'bg-[#1E293B] hover:bg-orange-600 text-white shadow-orange-500/10'}`}
                                        >
                                            <ScanLine className="w-5 h-5" /> {isLocked ? 'LOCKED' : 'Verify Receipt'}
                                        </button>
                                    ) : (
                                        <div className="px-6 py-4 bg-white border border-emerald-200 rounded-2xl flex items-center gap-3 shadow-sm">
                                            <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Validated</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Financial Ledger Widget */}
                        <div className="space-y-8">
                            <h4 className="text-[15px] font-black text-[#1E293B] uppercase italic tracking-widest flex items-center gap-4 px-2">
                                <Banknote className="w-6 h-6 text-emerald-500" /> Financial Settlement
                            </h4>
                            
                            <div className="bg-white rounded-[3rem] border border-slate-100 overflow-hidden shadow-sm">
                                <div className="p-10 space-y-6">
                                    <div className="p-8 bg-slate-50/50 rounded-[2.2rem] border border-slate-100 shadow-inner">
                                        <div className="flex justify-between items-center mb-6">
                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic">Cash Advance Allocation</p>
                                            {!isActionDisabled && (
                                                <button onClick={() => onAddAdvance(jo.id)} className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 uppercase tracking-widest flex items-center gap-1 transition-colors"><PlusCircle className="w-3 h-3"/> Add</button>
                                            )}
                                        </div>
                                        <div className="space-y-5">
                                            {jo.cash_advances?.length > 0 ? (
                                                jo.cash_advances.map((ca: any) => (
                                                    <div key={ca.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                                                        <div className="flex justify-between items-center">
                                                            <span className="text-[20px] font-black italic text-[#1E293B]">Rp {formatThousand(ca.amount)}</span>
                                                            <span className={`text-[10px] font-black px-4 py-1.5 rounded-xl uppercase tracking-widest shadow-sm border ${ca.status === 'approved' ? 'bg-emerald-600 text-white border-emerald-500' : 'bg-amber-100 text-amber-600 border-amber-200'}`}>
                                                                {ca.status === 'approved' ? 'Telah Dibayar (Paid)' : 'Menunggu Transfer'}
                                                            </span>
                                                        </div>
                                                        {ca.transfer_proof_url && (
                                                            <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-2">
                                                                    <ShieldCheck className="w-3 h-3 text-emerald-500" /> Reference Proof:
                                                                </p>
                                                                <a 
                                                                    href={ca.transfer_proof_url.startsWith('http') ? ca.transfer_proof_url : '#'} 
                                                                    target="_blank" 
                                                                    rel="noreferrer"
                                                                    className="text-[10px] font-black text-emerald-600 hover:text-emerald-700 underline truncate max-w-[200px]"
                                                                >
                                                                    {ca.transfer_proof_url.includes('/') ? 'View Transaksi Link' : ca.transfer_proof_url}
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            ) : <p className="text-[12px] text-slate-300 italic font-bold text-center py-6">No registered cash-out records</p>}
                                        </div>
                                    </div>
                                    <div className="p-8 bg-slate-50/10 rounded-[2.2rem] border-2 border-dashed border-slate-100">
                                        <div className="flex justify-between items-center mb-6">
                                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest italic tracking-tight">Incidental Operational Costs</p>
                                            {!isActionDisabled && (
                                                <button onClick={() => onAddCost(jo.id)} className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg hover:bg-emerald-100 uppercase tracking-widest flex items-center gap-1 transition-colors"><PlusCircle className="w-3 h-3"/> Add</button>
                                            )}
                                        </div>
                                        <div className="space-y-6">
                                            {jo.extra_costs?.length > 0 ? (
                                                jo.extra_costs.map((c: any) => (
                                                    <div key={c.id} className="flex justify-between items-start gap-4">
                                                        <div className="min-w-0">
                                                            <p className="text-[15px] font-black text-[#1E293B] uppercase italic tracking-tight truncate">{c.cost_type}</p>
                                                            <p className="text-[11px] font-bold text-slate-400 truncate max-w-[200px] mt-1">{c.description}</p>
                                                        </div>
                                                        <span className="text-[18px] font-black italic text-emerald-600 bg-emerald-50 px-4 py-1.5 rounded-xl border border-emerald-100">Rp {formatThousand(c.amount)}</span>
                                                    </div>
                                                ))
                                            ) : <p className="text-[12px] text-slate-300 italic font-bold text-center py-4">Secure: No extra costs logged</p>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Evidence Gallery Widget */}
                        <div className="space-y-8">
                            <h4 className="text-[15px] font-black text-[#1E293B] uppercase italic tracking-widest flex items-center gap-4 px-2">
                                <ImageIcon className="w-6 h-6 text-emerald-500" /> Mission Evidence Capture
                            </h4>
                            
                            <div className="grid grid-cols-2 gap-6 bg-slate-50/30 p-4 rounded-[3.5rem] border border-slate-100 shadow-inner min-h-[400px]">
                                {jo.documents?.length > 0 ? (
                                    jo.documents.map((doc: any) => (
                                        <a key={doc.id} href={doc.file_url} target="_blank" className="aspect-[4/5] bg-white rounded-[2.5rem] overflow-hidden group relative border border-slate-200 shadow-sm active:scale-95 transition-all">
                                            <img src={doc.file_url} className="w-full h-full object-cover group-hover:scale-110 transition-all duration-700" />
                                            <div className="absolute inset-0 bg-[#1E293B]/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-all">
                                                <ExternalLink className="w-8 h-8 text-white mb-2" />
                                                <span className="text-[9px] font-black text-white uppercase tracking-widest italic">View Asset</span>
                                            </div>
                                        </a>
                                    ))
                                ) : (
                                    <div className="col-span-full h-full flex flex-col items-center justify-center text-slate-300 gap-6 opacity-40">
                                         <PlusCircle className="w-16 h-16" />
                                         <p className="text-[13px] font-black uppercase tracking-widest italic tracking-tight">Ready for Field Upload</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* 📄 FINANCE SUBMISSION */}
                    <div className="pt-6 pb-20 flex justify-end gap-6">
                        {jo.fleets?.company_id && !isSettled && (
                            <button 
                                onClick={() => onSubmitVendorInvoice(jo)}
                                className="px-8 py-3 md:py-4 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all active:scale-95 flex items-center gap-3 group"
                            >
                                <Receipt className="w-4 h-4" /> Submit Vendor Invoice
                            </button>
                        )}

                        {isActionDisabled ? (
                            <div className="px-8 py-3 bg-slate-100 text-slate-400 rounded-2xl text-[12px] font-black uppercase tracking-widest flex items-center gap-2 cursor-not-allowed border border-slate-200">
                                <ShieldCheck className="w-4 h-4" /> {isLocked ? 'LOCKED (PENDING APPROVAL)' : 'SUBMITTED TO FINANCE'}
                            </div>
                        ) : (
                            <button 
                                onClick={() => onCollectDocs(jo)}
                                className="px-8 py-3 md:py-4 bg-[#1E293B] hover:bg-emerald-600 text-white rounded-2xl text-[12px] font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-900/10 active:scale-95 flex items-center gap-3 group"
                            >
                                Submit to Finance <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
