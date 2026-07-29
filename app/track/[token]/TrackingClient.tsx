"use client";

import { useEffect, useState } from "react";
import { Truck, Navigation as NavIcon, Clock, Phone, MapPin, Activity, Image as ImageIcon, X, Map } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

interface TrackingClientProps {
    initialJob: any;
    token: string;
}

export default function PublicTrackingClient({ initialJob, token }: TrackingClientProps) {
    const supabase = createClient();
    const [job, setJob] = useState(initialJob);
    const [position, setPosition] = useState<{ lat: number, lng: number, timestamp: string } | null>(null);
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    useEffect(() => {
        if (job.tracking_updates && job.tracking_updates.length > 0) {
            const validTracks = job.tracking_updates
                .filter((t: any) => t.latitude !== null && t.longitude !== null)
                .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
            
            const lastTrack = validTracks[0];
            if (lastTrack) {
                setPosition({ lat: Number(lastTrack.latitude), lng: Number(lastTrack.longitude), timestamp: lastTrack.created_at });
            }
        }
    }, [job]);

    useEffect(() => {
        const channel = supabase
            .channel(`public-track-${job.id}`)
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tracking_updates', filter: `job_order_id=eq.${job.id}` },
                (payload) => {
                    const { latitude, longitude, created_at } = payload.new;
                    if (latitude && longitude) setPosition({ lat: Number(latitude), lng: Number(longitude), timestamp: created_at });
                }
            )
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'job_orders', filter: `id=eq.${job.id}` },
                (payload) => {
                    setJob((prev: any) => ({ ...prev, status: payload.new.status }));
                }
            )
            .subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [job.id, supabase]);

    const destLoc = job.destination;
    const stops = job.stops && job.stops.length > 0 ? job.stops : [
        { location_name: 'Origin', stop_type: 'start' },
        { location_name: destLoc?.name || 'Destination', stop_type: 'destination' }
    ];

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans overflow-hidden">
            
            {/* 🛰️ COMPACT MISSION HEADER */}
            <header className="sticky top-0 z-[100] p-4 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 shadow-2xl">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
                    
                    {/* LEFT: PT INFO */}
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="w-14 h-14 relative bg-white rounded-2xl overflow-hidden p-2 shadow-xl shrink-0 border-2 border-white/20">
                            {job.work_orders?.md_entities?.logo_url ? (
                                <Image src={job.work_orders.md_entities.logo_url} alt="Logo" fill className="object-contain p-1" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-100"><Truck className="text-slate-900 w-7 h-7" /></div>
                            )}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-white text-lg md:text-xl font-black uppercase tracking-tight italic leading-tight truncate">{job.work_orders?.md_entities?.name || 'SentraLogis'}</h2>
                            <div className="flex items-center gap-3 mt-1.5">
                                <span className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
                                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" /> LIVE TRACKING
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT: DRIVER & PLATE */}
                    <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t border-white/5 md:border-0 pt-4 md:pt-0">
                        <div className="text-right hidden md:block">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block leading-none mb-1.5 text-right">Vehicle Plate</span>
                            <p className="text-3xl font-black text-white italic leading-none tracking-tighter uppercase">{job.md_fleets?.plate_number}</p>
                        </div>
                        <div className="flex flex-col md:items-end">
                            <p className="text-xl font-black text-white uppercase md:hidden italic tracking-tighter">{job.md_fleets?.plate_number}</p>
                            <span className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2 mt-1 md:justify-end">
                                <Clock className="w-4 h-4 text-emerald-500" /> {hasMounted && position ? new Date(position.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </span>
                        </div>
                         <button 
                            className="bg-emerald-500 hover:bg-emerald-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-xl shadow-emerald-500/30 border-2 border-white/10"
                            onClick={() => window.open(`tel:${job.work_orders?.md_entities?.phone || ''}`)}
                        >
                            <Phone className="w-6 h-6 fill-white/20" />
                        </button>
                    </div>

                </div>
            </header>

            {/* 📍 TIMELINE & LIVE PING AREA (Replaces Map) */}
            <main className="flex-1 relative bg-slate-950 p-4 md:p-8 overflow-y-auto">
                <div className="max-w-3xl mx-auto space-y-6">
                    
                    {/* Live GPS Ping Status */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10">
                            <Map className="w-24 h-24 text-white" />
                        </div>
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center shrink-0 border border-blue-500/30">
                                <Activity className="w-6 h-6 text-blue-400 animate-pulse" />
                            </div>
                            <div>
                                <h3 className="text-white font-bold text-lg">Real-time GPS Monitor</h3>
                                {position ? (
                                    <p className="text-slate-400 text-sm font-mono mt-1">
                                        Lat: {position.lat.toFixed(6)}, Lng: {position.lng.toFixed(6)}
                                    </p>
                                ) : (
                                    <p className="text-slate-400 text-sm mt-1">Menunggu sinyal GPS dari pengemudi...</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Timeline Container */}
                    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                            <NavIcon className="w-4 h-4 text-slate-400" /> Route & Milestones
                        </h3>
                        
                        <div className="relative pl-6 space-y-8">
                            {/* Vertical Line */}
                            <div className="absolute left-[11px] top-4 bottom-4 w-[2px] bg-slate-800 rounded-full" />
                            
                            {stops.map((stop: any, index: number) => {
                                const isFirst = index === 0;
                                const isLast = index === stops.length - 1;
                                // Simple active logic: just highlight current step if needed, or keep all neutral
                                const isActive = true;

                                return (
                                    <div key={index} className="relative flex items-start gap-6">
                                        <div className="absolute -left-6 bg-slate-900 py-1">
                                            <div className={`w-6 h-6 rounded-full border-4 border-slate-900 flex items-center justify-center shrink-0 ${isFirst ? 'bg-orange-500' : isLast ? 'bg-emerald-500' : 'bg-blue-500'}`}>
                                                <div className="w-1.5 h-1.5 bg-white rounded-full" />
                                            </div>
                                        </div>
                                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-4 flex-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest block mb-1 text-slate-400">
                                                {isFirst ? 'START' : isLast ? 'DESTINATION' : stop.stop_type || `STOP ${index}`}
                                            </span>
                                            <h4 className="text-white font-bold text-base md:text-lg">
                                                {stop.location_name || stop.name || 'Titik Lokasi'}
                                            </h4>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* 📸 DIGITAL EVIDENCE (POD) PANEL */}
                    {job.documents && job.documents.length > 0 && (
                        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                <ImageIcon className="w-4 h-4 text-slate-400" /> Digital Evidence / POD
                            </h4>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {job.documents.map((doc: any) => (
                                    <div 
                                        key={doc.id} 
                                        className="relative aspect-square bg-slate-800 rounded-2xl overflow-hidden group cursor-pointer border border-slate-700"
                                        onClick={() => setSelectedPhoto(doc.file_url)}
                                    >
                                        <Image src={doc.file_url} alt="POD" fill className="object-cover group-hover:scale-110 transition-all" />
                                        <div className="absolute inset-x-0 bottom-0 bg-slate-900/90 p-2 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                                            <span className="text-[9px] font-black text-white uppercase block truncate">{doc.doc_type || 'Evidence'}</span>
                                            <span className="text-[8px] font-bold text-slate-400 block">{hasMounted ? new Date(doc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            {/* 🖼️ PHOTO OVERLAY MODAL */}
            {selectedPhoto && (
                <div className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
                    <div className="relative max-w-4xl w-full h-full max-h-[80vh] flex items-center justify-center">
                         <button className="absolute -top-12 right-0 text-white hover:text-slate-300 flex items-center gap-2 font-black uppercase text-xs tracking-widest bg-slate-900/50 px-4 py-2 rounded-full">
                            Tutup <X className="w-4 h-4" />
                         </button>
                         <div className="relative w-full h-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-800">
                            <Image src={selectedPhoto} alt="Evidence Full" fill className="object-contain" />
                         </div>
                    </div>
                </div>
            )}

            <footer className="p-3 bg-slate-900 text-center shrink-0 border-t border-slate-800">
                 <p className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.4em]">Sentinel Real-Time Intelligence • {job.jo_number}</p>
            </footer>
        </div>
    );
}
