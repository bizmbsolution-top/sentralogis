"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { GoogleMap, Marker, DirectionsService, DirectionsRenderer } from "@react-google-maps/api";
import { Truck, Navigation, Clock, Phone, Loader2, MapPin, Activity, Image as ImageIcon, X, Expand } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useGoogleMaps } from "@/lib/google-maps-context";
import Image from "next/image";

interface TrackingClientProps {
    initialJob: any;
    token: string;
}

const mapOptions = { 
    disableDefaultUI: false, 
    zoomControl: true,
    mapTypeControl: false,
    streetViewControl: false,
};

function ShipmentRoute({ currentPos, destination }: { currentPos: { lat: number, lng: number }, destination: { lat: number, lng: number } }) {
    const [response, setResponse] = useState<google.maps.DirectionsResult | null>(null);
    const directionsCallback = useCallback((res: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
        if (status === 'OK' && res) setResponse(res);
    }, []);
    if (destination.lat === 0) return null;
    return (
        <>
            <DirectionsService
                options={{ origin: currentPos, destination: destination, travelMode: google.maps.TravelMode.DRIVING }}
                callback={directionsCallback}
            />
            {response && (
                <DirectionsRenderer
                    options={{
                        directions: response,
                        suppressMarkers: true,
                        polylineOptions: { strokeColor: "#f97316", strokeWeight: 6, strokeOpacity: 0.8 }
                    }}
                />
            )}
        </>
    );
}

export default function PublicTrackingClient({ initialJob, token }: TrackingClientProps) {
    const supabase = createClient();
    const { isLoaded } = useGoogleMaps();
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
            ).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [job.id, supabase]);

    const woItem = Array.isArray(job.work_order_items) ? job.work_order_items[0] : job.work_order_items;
    const destLoc = woItem?.destination_location;
    const destination = useMemo(() => ({ lat: Number(destLoc?.latitude || 0), lng: Number(destLoc?.longitude || 0) }), [destLoc]);

    return (
        <div className="min-h-screen bg-slate-950 flex flex-col font-sans overflow-hidden">
            
            {/* 🛰️ COMPACT MISSION HEADER */}
            <header className="fixed top-0 left-0 right-0 z-[100] p-4 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 shadow-2xl">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-4 items-center justify-between">
                    
                    {/* LEFT: PT INFO */}
                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="w-14 h-14 relative bg-white rounded-2xl overflow-hidden p-2 shadow-xl shrink-0 border-2 border-white/20">
                            {job.work_orders?.organizations?.logo_url ? (
                                <Image src={job.work_orders.organizations.logo_url} alt="Logo" fill className="object-contain p-1" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-slate-100"><Truck className="text-slate-900 w-7 h-7" /></div>
                            )}
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-white text-lg md:text-xl font-black uppercase tracking-tight italic leading-tight truncate">{job.work_orders?.organizations?.name || 'SentraLogis'}</h2>
                            <div className="flex items-center gap-3 mt-1.5">
                                <span className="bg-emerald-500 text-white text-[10px] font-black uppercase tracking-[0.2em] px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-lg shadow-emerald-500/20">
                                    <div className="w-2 h-2 bg-white rounded-full animate-pulse" /> LIVE TRACKING
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* CENTER: ROUTE INFO */}
                    <div className="flex items-center gap-4 bg-white/5 border border-white/10 rounded-3xl px-6 py-3 w-full md:w-auto overflow-hidden shadow-inner">
                         <div className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-orange-500/20">
                            <Navigation className="w-5 h-5" />
                         </div>
                         <div className="min-w-0">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block leading-none mb-1.5 text-orange-400">Destination</span>
                            <p className="text-lg md:text-xl font-black text-white italic truncate tracking-tight uppercase">{destLoc?.name || 'Target Location'}</p>
                         </div>
                    </div>

                    {/* RIGHT: DRIVER & PLATE */}
                    <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end border-t border-white/5 md:border-0 pt-4 md:pt-0">
                        <div className="text-right hidden md:block">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block leading-none mb-1.5 text-right">Vehicle Plate</span>
                            <p className="text-3xl font-black text-white italic leading-none tracking-tighter uppercase">{job.fleets?.plate_number}</p>
                        </div>
                        <div className="flex flex-col md:items-end">
                            <p className="text-xl font-black text-white uppercase md:hidden italic tracking-tighter">{job.fleets?.plate_number}</p>
                            <span className="text-xs font-black text-slate-300 uppercase tracking-widest flex items-center gap-2 mt-1 md:justify-end">
                                <Clock className="w-4 h-4 text-emerald-500" /> {hasMounted && position ? new Date(position.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                            </span>
                        </div>
                         <button 
                            className="bg-emerald-500 hover:bg-emerald-600 text-white w-14 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-95 shadow-xl shadow-emerald-500/30 border-2 border-white/10"
                            onClick={() => window.open(`tel:${job.work_orders?.organizations?.phone || ''}`)}
                        >
                            <Phone className="w-6 h-6 fill-white/20" />
                        </button>
                    </div>

                </div>
            </header>

            {/* 📍 MAP FULL AREA */}
            <main className="flex-1 relative bg-slate-100 mt-[160px] md:mt-[90px]">
                {!isLoaded ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 z-50">
                        <Loader2 className="w-10 h-10 text-emerald-500 animate-spin mb-4" />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Initalizing Strategic Grid...</span>
                    </div>
                ) : (
                    <div className="w-full h-full absolute inset-0">
                        <GoogleMap
                            mapContainerStyle={{ width: '100%', height: '100%' }}
                            center={position || defaultCenter}
                            zoom={14}
                            options={mapOptions}
                        >
                            {position && (
                                <>
                                    <Marker 
                                        position={position} 
                                        icon={{
                                            url: "/truck_icon.svg",
                                            scaledSize: new window.google.maps.Size(40, 40),
                                            anchor: new window.google.maps.Point(20, 20)
                                        }}
                                    />
                                    {destination.lat !== 0 && (
                                        <>
                                            <Marker 
                                                position={destination} 
                                                icon={{
                                                    url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
                                                    scaledSize: new window.google.maps.Size(28, 28)
                                                }}
                                            />
                                            <ShipmentRoute currentPos={position} destination={destination} />
                                        </>
                                    )}
                                </>
                            )}
                        </GoogleMap>
                    </div>
                )}

                {/* 📸 DIGITAL EVIDENCE (POD) PANEL */}
                {job.documents && job.documents.length > 0 && (
                    <div className="absolute bottom-10 left-5 z-[50] max-w-[280px]">
                         <div className="bg-white/90 backdrop-blur-xl rounded-3xl p-4 shadow-2xl border border-slate-200">
                             <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                <ImageIcon className="w-3.5 h-3.5 text-slate-400" /> Digital Evidence / POD
                             </h4>
                             <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                                {job.documents.map((doc: any) => (
                                    <div 
                                        key={doc.id} 
                                        className="relative aspect-square bg-slate-100 rounded-xl overflow-hidden group cursor-pointer border border-slate-100"
                                        onClick={() => setSelectedPhoto(doc.file_url)}
                                    >
                                        <Image src={doc.file_url} alt="POD" fill className="object-cover group-hover:scale-110 transition-all" />
                                        <div className="absolute inset-x-0 bottom-0 bg-slate-900/80 p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[7px] font-black text-white uppercase block truncate">{doc.doc_type || 'Evidence'}</span>
                                            <span className="text-[6px] font-bold text-slate-300 block">{hasMounted ? new Date(doc.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</span>
                                        </div>
                                    </div>
                                ))}
                             </div>
                         </div>
                    </div>
                )}
            </main>

            {/* 🖼️ PHOTO OVERLAY MODAL */}
            {selectedPhoto && (
                <div className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4" onClick={() => setSelectedPhoto(null)}>
                    <div className="relative max-w-4xl w-full h-full max-h-[80vh] flex items-center justify-center">
                         <button className="absolute -top-12 right-0 text-white hover:text-slate-300 flex items-center gap-2 font-black uppercase text-xs tracking-widest">
                            Close <X className="w-6 h-6" />
                         </button>
                         <div className="relative w-full h-full bg-white rounded-3xl overflow-hidden shadow-2xl">
                            <Image src={selectedPhoto} alt="Evidence Full" fill className="object-contain" />
                         </div>
                    </div>
                </div>
            )}

            <footer className="p-2 bg-slate-900 text-center shrink-0 border-t border-white/5">
                 <p className="text-[7px] font-bold text-slate-600 uppercase tracking-[0.4em]">Sentinel Real-Time Intelligence • {job.jo_number}</p>
            </footer>
        </div>
    );
}

const defaultCenter = { lat: -6.1754, lng: 106.8272 };
