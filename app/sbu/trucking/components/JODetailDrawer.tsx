"use client";

import { 
    XCircle, Truck, Activity, Loader2, MapPin, 
    Clock, ImageIcon, ExternalLink, Banknote, 
    CheckCircle2, FileText, Send, Save, PlusCircle, X, ArrowRight,
    ShieldCheck, ScanLine
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
    onSendLink?: (id: string) => void;
    onEdit?: (item: any, joId?: string) => void;
}

export default function JODetailDrawer({
    show, onClose, jo, isLoaded, mapOptions, 
    getJOStatusBadge, onAddCost, onAddAdvance, onCollectDocs,
    onSendLink, onEdit
}: JODetailDrawerProps) {
    const [directions, setDirections] = useState<google.maps.DirectionsResult | null>(null);

    useEffect(() => {
        if (show && jo && isLoaded) {
            const originVal = (jo.latitude && jo.longitude) 
                ? { lat: parseFloat(jo.latitude), lng: parseFloat(jo.longitude) } 
                : jo.origin;
            
            const destVal = (jo.dest_lat && jo.dest_lng) 
                ? { lat: parseFloat(jo.dest_lat), lng: parseFloat(jo.dest_lng) } 
                : jo.destination;

            if (originVal && destVal) {
                const directionsService = new window.google.maps.DirectionsService();
                directionsService.route(
                    {
                        origin: originVal,
                        destination: destVal,
                        travelMode: window.google.maps.TravelMode.DRIVING,
                    },
                    (result, status) => {
                        if (status === window.google.maps.DirectionsStatus.OK) {
                            setDirections(result);
                        } else {
                            if (status !== 'ZERO_RESULTS') {
                                console.error(`Route finding error: ${status}`);
                            }
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

    return (
        <div className="fixed inset-0 z-[300] flex items-end md:items-center justify-center p-0 md:p-10">
            {/* Backdrop */}
            <div 
                className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity" 
                onClick={onClose}
            />
            
            {/* Content */}
            <div className="relative w-full max-w-5xl bg-[#0d121f] border-t md:border border-white/10 rounded-t-[2.5rem] md:rounded-[3rem] shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-white/10 bg-[#151f32]/50 flex items-center justify-between">
                    <div className="flex items-center gap-4 md:gap-6">
                        <div className="w-12 h-12 md:w-16 md:h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-500">
                            <Truck className="w-6 h-6 md:w-8 md:h-8" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-xl md:text-3xl font-black tracking-tight text-white mb-1 uppercase italic truncate">
                                {jo.fleet_number}
                            </h2>
                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                                <p className="text-[10px] md:text-sm font-bold text-slate-500 uppercase tracking-widest truncate">
                                    JO #{jo.jo_number?.split('-').pop()} • {jo.driver_name}
                                </p>
                                {jo.driver_phone && (
                                    <a 
                                        href={`https://wa.me/${jo.driver_phone.replace(/\D/g, '')}`} 
                                        target="_blank" 
                                        className="text-[10px] md:text-sm font-black text-blue-400 hover:text-blue-300 flex items-center gap-1.5 transition-colors"
                                    >
                                        <Activity className="w-3 h-3" /> {jo.driver_phone}
                                    </a>
                                )}
                            </div>
                        </div>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 hover:bg-white/5 rounded-full text-slate-600 hover:text-white transition-all transform hover:rotate-90"
                    >
                        <XCircle className="w-8 h-8 md:w-10 md:h-10" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 md:space-y-12 pb-24 md:pb-10">
                    {/* Cockpit Section */}
                    <section>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8 p-6 bg-white/5 rounded-[2rem] border border-white/10">
                            <div className="flex flex-col md:flex-row items-center gap-6">
                                <div className="w-16 h-16 md:w-20 md:h-20 bg-blue-500/10 rounded-[1.5rem] border-2 border-blue-500/20 flex items-center justify-center text-blue-400">
                                    <Truck className="w-8 h-8 md:w-10 md:h-10" />
                                </div>
                                <div className="text-center md:text-left">
                                    <h4 className="text-xl md:text-2xl font-black text-white uppercase italic tracking-tighter">{jo.fleet_number}</h4>
                                    <div className="flex flex-col md:flex-row items-center gap-2 md:gap-4 mt-1">
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <Activity className="w-3 h-3" /> {jo.driver_name}
                                        </p>
                                        <div className="hidden md:block w-1.5 h-1.5 rounded-full bg-slate-700" />
                                        <p className="text-xs font-mono text-blue-400">{jo.driver_phone}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="flex flex-col md:flex-row items-center gap-4">
                                {(() => {
                                    const phone = jo.driver_phone?.replace(/\D/g, '');
                                    const opStatus = getOperationalStatus(jo.parentWO);
                                    // Lock if the mission is already underway or finished
                                    const isLocked = opStatus === 'on_journey' || opStatus === 'finished' || jo.status === 'on_journey' || jo.status === 'delivered';
                                    
                                    if (!phone) return (
                                        <div className="flex items-center gap-3">
                                            <div className="px-6 py-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                                <XCircle className="w-4 h-4" /> No Phone Number
                                            </div>
                                            {!isLocked && (
                                                <button 
                                                    onClick={() => onEdit && onEdit(jo.parentWO, jo.id)}
                                                    className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-blue-600/20 flex items-center justify-center gap-3 active:scale-95"
                                                >
                                                    <Activity className="w-5 h-5" /> Edit Info
                                                </button>
                                            )}
                                        </div>
                                    );
                                    const formattedPhone = phone.startsWith('0') ? '62' + phone.slice(1) : phone;
                                    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
                                    const msg = encodeURIComponent(`Halo ${jo.driver_name}, link tracking Anda: ${baseUrl}/jo/${jo.driver_link_token}`);
                                    return (
                                        <div className="flex items-center gap-3">
                                            {isLocked ? (
                                                <div className="px-8 py-3 bg-slate-800 text-slate-500 rounded-xl text-xs font-black uppercase tracking-[0.2em] border border-white/5 flex items-center gap-3 cursor-not-allowed opacity-50">
                                                    <ShieldCheck className="w-5 h-5" /> Mission Active / Locked
                                                </div>
                                            ) : (
                                                <>
                                                    <a 
                                                        href={`https://wa.me/${formattedPhone}?text=${msg}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={() => {
                                                            if (onSendLink) onSendLink(jo.id);
                                                        }}
                                                        className="px-8 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-3 group"
                                                    >
                                                        <Send className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                                        {jo.is_link_sent ? 'Resend Tracking Link' : 'Send Tracking Link'}
                                                    </a>
                                                    <button 
                                                        onClick={() => onEdit && onEdit(jo.parentWO, jo.id)}
                                                        className="px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-white/10 transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Activity className="w-4 h-4" /> Edit Driver
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                                               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-auto md:h-[500px]">
                            {/* Map (Mobile: Fixed Aspect, Desktop: Flexible) */}
                            <div className="aspect-video md:aspect-auto relative rounded-[2rem] md:rounded-[2.5rem] overflow-hidden border border-white/10 bg-black/40 shadow-xl">
                                {!isLoaded ? (
                                    <div className="w-full h-full flex flex-col items-center justify-center">
                                        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                                    </div>
                                ) : (
                                    <GoogleMap
                                        mapContainerStyle={{ width: '100%', height: '100%' }}
                                        options={mapOptions}
                                        center={(() => {
                                            const latest = jo.tracking_updates?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                                            if (latest?.location) {
                                                const [lat, lng] = latest.location.split(',').map((c: any) => parseFloat(c.trim()));
                                                if (!isNaN(lat) && !isNaN(lng)) return { lat, lng };
                                            }
                                            if (jo.latitude && jo.longitude) return { lat: jo.latitude, lng: jo.longitude };
                                            return { lat: -6.2088, lng: 106.8456 };
                                        })()}
                                        zoom={12}
                                    >
                                        {directions ? (
                                            <DirectionsRenderer 
                                                directions={directions} 
                                                options={{
                                                    polylineOptions: { strokeColor: "#3b82f6", strokeWeight: 5, strokeOpacity: 0.5 },
                                                    suppressMarkers: true
                                                }}
                                            />
                                        ) : (jo.latitude && jo.longitude && jo.dest_lat && jo.dest_lng) && (
                                            <Polyline 
                                                path={[
                                                    { lat: parseFloat(jo.latitude), lng: parseFloat(jo.longitude) },
                                                    { lat: parseFloat(jo.dest_lat), lng: parseFloat(jo.dest_lng) }
                                                ]}
                                                options={{ strokeColor: "#3b82f6", strokeWeight: 2, strokeOpacity: 0.3 }}
                                            />
                                        )}

                                        {/* Origin Pin (Custom) */}
                                        {jo.latitude && jo.longitude && (
                                            <MarkerF 
                                                position={{ lat: jo.latitude, lng: jo.longitude }} 
                                                icon={{ url: "https://maps.google.com/mapfiles/kml/pal2/icon10.png", scaledSize: new window.google.maps.Size(24, 24) }}
                                                label={{ text: "ORIGIN", color: "white", className: "bg-emerald-500/80 px-2 py-0.5 rounded-full text-[8px] font-black uppercase mb-10 border border-white/20" }}
                                            />
                                        )}

                                        {/* Destination Marker */}
                                        {jo.dest_lat && jo.dest_lng && (
                                            <MarkerF 
                                                position={{ lat: jo.dest_lat, lng: jo.dest_lng }} 
                                                icon={{ url: "https://maps.google.com/mapfiles/kml/pal2/icon13.png", scaledSize: new window.google.maps.Size(32, 32) }}
                                                label={{ text: "DESTINATION", color: "white", className: "bg-blue-500/80 px-2 py-0.5 rounded-full text-[8px] font-black uppercase mb-12 border border-white/20" }}
                                            />
                                        )}

                                        {/* Truck Current Position */}
                                        {(() => {
                                            const latest = jo.tracking_updates?.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
                                            if (!latest?.location || !latest.location.includes(',')) return null;
                                            const parts = latest.location.split(',').map((c: any) => parseFloat(c.trim()));
                                            const lat = parts[0];
                                            const lng = parts[1];
                                            if (isNaN(lat) || isNaN(lng)) return null;
                                            
                                            return (
                                                <MarkerF 
                                                    position={{ lat, lng }} 
                                                    icon={{ url: "https://maps.google.com/mapfiles/kml/pal2/icon15.png", scaledSize: new window.google.maps.Size(36, 36) }}
                                                    label={{
                                                        text: `${latest.status_update}\n${lat.toFixed(4)}, ${lng.toFixed(4)}`,
                                                        color: "white",
                                                        className: "bg-black/95 px-3 py-1.5 rounded-lg text-[9px] font-black border border-white/20 -mt-20 text-center whitespace-pre uppercase tracking-tighter"
                                                    }}
                                                />
                                            );
                                        })()}
                                    </GoogleMap>
                                )}
                            </div>


                            {/* Milestones */}
                            <div className="flex flex-col bg-white/5 border border-white/5 rounded-[2rem] md:rounded-[2.5rem] overflow-hidden h-full">
                                <div className="p-4 md:p-6 border-b border-white/5 bg-white/5 flex items-center justify-between">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Journey History</p>
                                    <span className="text-[10px] font-mono text-slate-600">{jo.tracking_updates?.length || 0} Events</span>
                                </div>
                                <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
                                    {jo.tracking_updates?.length > 0 ? (
                                        [...jo.tracking_updates].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((t: any, idx: number) => (
                                            <div key={t.id} className="relative flex items-start gap-4">
                                                <div className={`w-3 h-3 rounded-full mt-1.5 z-10 ${idx === 0 ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-700'}`} />
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-xs font-black uppercase tracking-tight ${idx === 0 ? 'text-white' : 'text-slate-500'}`}>{t.status_update}</p>
                                                    <p className="text-[9px] font-bold text-slate-600 flex items-center gap-1.5 mt-1">
                                                        <Clock className="w-3 h-3" /> {new Date(t.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                    {t.location && <p className="text-[8px] font-mono text-blue-500/50 truncate mt-1">{t.location}</p>}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center opacity-30 text-slate-600">
                                            <Activity className="w-10 h-10 mb-2" />
                                            <p className="text-[10px] font-black uppercase">No signal yet</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Photos Section */}
                        <div className="mt-8 pt-8 border-t border-white/5">
                            <h4 className="text-sm font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-emerald-500" /> Mission Proof Gallery
                            </h4>
                            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                                {jo.documents?.length > 0 ? (
                                    jo.documents.map((doc: any) => (
                                        <a key={doc.id} href={doc.file_url} target="_blank" className="aspect-square bg-slate-950 border border-white/5 rounded-xl overflow-hidden group relative">
                                            <img src={doc.file_url} alt="POD" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-all" />
                                            <div className="absolute inset-0 bg-blue-500/20 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                                <ExternalLink className="w-5 h-5 text-white" />
                                            </div>
                                        </a>
                                    ))
                                ) : (
                                    <div className="col-span-full py-10 bg-white/5 border-2 border-dashed border-white/5 rounded-[2rem] flex flex-col items-center justify-center text-slate-800">
                                        <p className="text-[10px] font-black uppercase tracking-widest opacity-30">No photos uploaded</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Financials Section */}
                    <section className="bg-amber-500/5 p-6 md:p-10 rounded-[2.5rem] md:rounded-[3rem] border border-amber-500/10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                                    <Banknote className="w-6 h-6 text-amber-500" /> Financial Settlement
                                </h3>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => onAddAdvance(jo.id)} className="flex-1 md:flex-none px-4 py-2.5 bg-emerald-600 text-white text-[10px] font-black uppercase rounded-xl shadow-lg">Request Advance</button>
                                <button onClick={() => onAddCost(jo.id)} className="flex-1 md:flex-none px-4 py-2.5 bg-white/10 text-white text-[10px] font-black uppercase rounded-xl border border-white/10">Add Cost</button>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Active Advances</p>
                                {jo.cash_advances?.length > 0 ? (
                                    jo.cash_advances.map((ca: any) => (
                                        <div key={ca.id} className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-black text-white">Rp {formatThousand(ca.amount)}</span>
                                            <span className="text-[8px] font-bold text-emerald-500 uppercase">{ca.status}</span>
                                        </div>
                                    ))
                                ) : <p className="text-[9px] text-slate-700 italic">No advances</p>}
                            </div>
                            <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Extra Costs</p>
                                {jo.extra_costs?.length > 0 ? (
                                    jo.extra_costs.map((c: any) => (
                                        <div key={c.id} className="flex justify-between items-center mb-2">
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-white truncate">{c.cost_type}</p>
                                                <p className="text-[8px] text-slate-600 truncate">{c.description}</p>
                                            </div>
                                            <span className="text-xs font-black text-amber-500 ml-2">Rp {formatThousand(c.amount)}</span>
                                        </div>
                                    ))
                                ) : <p className="text-[9px] text-slate-700 italic">No extra costs</p>}
                            </div>
                        </div>
                    </section>

                    {/* Hardcopy POD Section */}
                    {jo.parentWO?.customers?.billing_method !== 'epod' && (
                        <section>
                            <h3 className="text-lg md:text-xl font-black text-white uppercase tracking-tighter flex items-center gap-3 mb-6">
                                <FileText className="w-5 h-5 md:w-6 md:h-6 text-blue-400" /> Proof of Delivery — Hardcopy
                            </h3>
                            
                            <div className="bg-[#151f32] p-6 md:p-10 rounded-[2rem] md:rounded-[3rem] border border-white/5">
                                {(jo.billing_status === 'pending_verification' || jo.physical_doc_received) ? (
                                    <div className="flex flex-col items-center justify-center py-6 text-center">
                                        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-4 animate-pulse">
                                            <ShieldCheck className="w-8 h-8 md:w-10 md:h-10" />
                                        </div>
                                        <h4 className="text-lg md:text-xl font-black text-white uppercase italic tracking-tight">Documents Collection</h4>
                                        <p className="text-xs font-bold text-slate-500 mt-2 max-w-sm">
                                            Physical documents have been received and are pending Admin verification.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="flex flex-col md:flex-row items-center gap-8 md:gap-10">
                                        <div className="flex-1 space-y-2 md:space-y-4">
                                            <h4 className="text-base md:text-lg font-black text-white uppercase italic">Collect Physical Docs</h4>
                                            <p className="text-xs md:text-sm text-slate-500 font-bold leading-relaxed">
                                                Ensure the originals of Surat Jalan and other documents are complete with stamps and signatures before handing over.
                                            </p>
                                        </div>
                                        <button 
                                            onClick={() => onCollectDocs(jo)}
                                            className="w-full md:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-black text-xs uppercase italic tracking-widest rounded-xl transition-all flex items-center justify-center gap-3 active:scale-95 shadow-lg shadow-blue-500/20"
                                        >
                                            <ScanLine className="w-5 h-5" /> Start Collecting
                                        </button>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}
