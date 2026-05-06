"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { GoogleMap, Marker, InfoWindow, DirectionsService, DirectionsRenderer } from "@react-google-maps/api";
import { X, Truck, Navigation, User, Phone, Package, Activity, Clock, Map as MapIcon, ChevronRight, ImageIcon, ExternalLink, Loader2, MapPin, Expand, Maximize } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

interface LiveTrackingMapProps {
    show: boolean;
    onClose: () => void;
    activeAssignments: any[];
}

const mapContainerStyle = {
    width: "100%",
    height: "100%",
};

const defaultCenter = {
    lat: -6.1754, // Jakarta
    lng: 106.8272,
};

const mapOptions = {
    disableDefaultUI: false,
    zoomControl: true,
    styles: [
        { featureType: "all", elementType: "labels.text.fill", color: "#6b7280" }
    ]
};

// --- SUB-COMPONENT FOR ROUTE RENDERING ---
function ShipmentRoute({ assignment, currentPos }: { assignment: any, currentPos: { lat: number, lng: number } }) {
    const [response, setResponse] = useState<google.maps.DirectionsResult | null>(null);
    const destination = assignment.dest_lat && assignment.dest_lng 
        ? { lat: Number(assignment.dest_lat), lng: Number(assignment.dest_lng) } 
        : null;

    const directionsCallback = useCallback((res: google.maps.DirectionsResult | null, status: google.maps.DirectionsStatus) => {
        if (status === 'OK' && res) setResponse(res);
    }, []);

    if (!destination || destination.lat === 0) return null;

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

export default function LiveTrackingMap({ show, onClose, activeAssignments }: LiveTrackingMapProps) {
    const supabase = createClient();
    const [selectedFleet, setSelectedFleet] = useState<any>(null);
    const [positions, setPositions] = useState<Record<string, { lat: number, lng: number, timestamp: string }>>({});
    const [map, setMap] = useState<google.maps.Map | null>(null);
    const [docs, setDocs] = useState<any[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
    const [hasMounted, setHasMounted] = useState(false);

    useEffect(() => {
        setHasMounted(true);
    }, []);

    // Initial Positions with NULL filtering
    useEffect(() => {
        const initialPositions: Record<string, { lat: number, lng: number, timestamp: string }> = {};
        activeAssignments.forEach(a => {
            const lat = Number(a.latitude);
            const lng = Number(a.longitude);
            if (!isNaN(lat) && !isNaN(lng) && lat !== 0) {
                initialPositions[a.id] = { 
                    lat, 
                    lng,
                    timestamp: a.last_tracking?.created_at || new Date().toISOString()
                };
            }
        });
        setPositions(prev => ({ ...prev, ...initialPositions }));
    }, [activeAssignments]);

    // Real-time listener
    useEffect(() => {
        if (!show) return;
        const channel = supabase
            .channel('live-fleet-tracking-pro')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tracking_updates' },
                (payload) => {
                    const { job_order_id, latitude, longitude, created_at } = payload.new;
                    const lat = Number(latitude);
                    const lng = Number(longitude);
                    if (!isNaN(lat) && !isNaN(lng) && lat !== 0) {
                        setPositions(prev => ({
                            ...prev,
                            [job_order_id]: { lat, lng, timestamp: created_at }
                        }));
                    }
                }
            ).subscribe();
        return () => { supabase.removeChannel(channel); };
    }, [show, supabase]);

    // Fetch documents when fleet selected
    useEffect(() => {
        if (selectedFleet) {
            fetchDocs(selectedFleet.id);
        } else {
            setDocs([]);
        }
    }, [selectedFleet]);

    const fetchDocs = async (joId: string) => {
        setLoadingDocs(true);
        const { data } = await supabase
            .from('documents')
            .select('*')
            .eq('job_order_id', joId)
            .order('created_at', { ascending: false });
        setDocs(data || []);
        setLoadingDocs(false);
    };

    if (!show) return null;

    return (
        <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-xl flex items-center justify-center p-0 md:p-6 animate-in fade-in duration-300">
            <div className="bg-white w-full h-full md:rounded-[3rem] overflow-hidden shadow-[0_20px_80px_rgba(0,0,0,0.5)] border border-white/20 flex flex-col md:flex-row relative">
                
                {/* SIDEBAR */}
                <div className="w-full md:w-[400px] h-[350px] md:h-full bg-slate-50 border-r border-slate-200 flex flex-col overflow-hidden">
                    <div className="p-6 border-b border-slate-200 bg-white">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-2xl font-black italic tracking-tighter text-slate-900 uppercase">Fleet Core</h3>
                                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Tactical Logistics Hub</p>
                            </div>
                            <div className="p-2.5 bg-emerald-500 rounded-2xl text-white shadow-lg shadow-emerald-500/20 animate-pulse">
                                <Activity className="w-6 h-6" />
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <div className="flex-1 p-4 bg-slate-100 rounded-2xl flex flex-col items-center">
                                <span className="text-2xl font-black text-slate-900 italic leading-none">{activeAssignments.length}</span>
                                <span className="text-[9px] font-black uppercase text-slate-400 mt-2">Missions</span>
                            </div>
                            <div className="flex-1 p-4 bg-emerald-500 rounded-2xl flex flex-col items-center shadow-lg shadow-emerald-500/20">
                                <span className="text-2xl font-black text-white italic leading-none">{Object.keys(positions).length}</span>
                                <span className="text-[9px] font-black uppercase text-white/70 mt-2">Linked</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 space-y-3 custom-scrollbar">
                        {activeAssignments.map((a) => {
                            const pos = positions[a.id];
                            const isSelected = selectedFleet?.id === a.id;
                            return (
                                <button 
                                    key={a.id} 
                                    onClick={() => {
                                        setSelectedFleet(a);
                                        if (pos) { map?.panTo(pos); map?.setZoom(15); }
                                    }}
                                    className={`w-full p-5 rounded-[2rem] border-2 transition-all flex items-center gap-4 text-left group ${isSelected ? 'bg-white border-emerald-500 shadow-2xl scale-[1.02]' : 'bg-white border-transparent hover:border-slate-200 shadow-sm'}`}
                                >
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${pos ? 'bg-slate-900 text-white shadow-xl' : 'bg-slate-100 text-slate-300'}`}>
                                        <Truck className={`w-7 h-7 ${pos ? 'text-emerald-400' : ''}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-sm font-black text-slate-900 tracking-tight uppercase italic">{a.fleet_number}</span>
                                            {pos && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />}
                                        </div>
                                        <div className="text-[10px] font-bold text-slate-400 uppercase truncate tracking-widest">{a.driver_name}</div>
                                        <div className="mt-3 flex items-center gap-2">
                                            <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md ${a.status === 'delivering' ? 'bg-orange-500 text-white' : 'bg-emerald-500 text-white'}`}>{a.status}</span>
                                            {pos && <span className="text-[8px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1"><MapPin className="w-3 h-3" /> GPS ON</span>}
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* MAP AREA */}
                <div className="flex-1 relative">
                    <GoogleMap
                        mapContainerStyle={mapContainerStyle}
                        center={defaultCenter}
                        zoom={11}
                        onLoad={setMap}
                        options={mapOptions}
                    >
                        {activeAssignments.map((a) => {
                            const pos = positions[a.id];
                            if (!pos) return null;
                            return (
                                <div key={a.id}>
                                    <Marker 
                                        position={pos}
                                        onClick={() => setSelectedFleet(a)}
                                        icon={{
                                            url: "/truck_icon.svg",
                                            scaledSize: new window.google.maps.Size(40, 40),
                                            anchor: new window.google.maps.Point(20, 20)
                                        }}
                                    />
                                    {a.dest_lat && a.dest_lng && (
                                        <Marker 
                                            position={{ lat: Number(a.dest_lat), lng: Number(a.dest_lng) }}
                                            icon={{ url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png", scaledSize: new window.google.maps.Size(32, 32) }}
                                        />
                                    )}
                                    <ShipmentRoute assignment={a} currentPos={pos} />
                                </div>
                            );
                        })}

                        {selectedFleet && positions[selectedFleet.id] && (
                            <InfoWindow 
                                position={positions[selectedFleet.id]} 
                                onCloseClick={() => setSelectedFleet(null)}
                            >
                                <div className="p-4 min-w-[280px] font-sans">
                                    <div className="flex items-center gap-4 mb-4 pb-4 border-b border-slate-100">
                                        <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-white shadow-xl">
                                            <Truck className="w-6 h-6 text-emerald-400" />
                                        </div>
                                        <div>
                                            <div className="text-base font-black text-slate-900 italic uppercase">{selectedFleet.fleet_number}</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">{selectedFleet.driver_name}</div>
                                        </div>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="flex items-start gap-3">
                                            <Navigation className="w-4 h-4 text-orange-500 mt-1" />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Destination</div>
                                                <div className="text-xs font-bold text-slate-800 leading-tight">{selectedFleet.destination || 'Strategic Target'}</div>
                                            </div>
                                        </div>

                                        {/* 🖼️ DIGITAL EVIDENCE IN INFOWINDOW */}
                                        <div className="pt-2 border-t border-slate-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1">
                                                    <ImageIcon className="w-3 h-3" /> Evidence ({docs.length})
                                                </span>
                                            </div>
                                            
                                            {loadingDocs ? (
                                                <div className="flex items-center justify-center py-4"><Loader2 className="w-5 h-5 text-emerald-500 animate-spin" /></div>
                                            ) : docs.length > 0 ? (
                                                <div className="grid grid-cols-3 gap-1.5 max-h-[80px] overflow-y-auto pr-1">
                                                    {docs.map((d: any) => (
                                                        <div 
                                                            key={d.id} 
                                                            className="relative aspect-square rounded-lg overflow-hidden group cursor-pointer border border-slate-100"
                                                            onClick={() => setSelectedPhoto(d.file_url)}
                                                        >
                                                            <Image src={d.file_url} alt="POD" fill className="object-cover" />
                                                            <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                                <Expand className="w-3 h-3 text-white" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-[8px] font-bold text-slate-400 italic py-2">No documents uploaded yet</div>
                                            )}
                                        </div>

                                        <div className="flex items-center gap-2 pt-2 text-slate-400">
                                            <Clock className="w-3.5 h-3.5" />
                                            <span className="text-[9px] font-bold">Sync: {hasMounted && positions[selectedFleet.id] ? new Date(positions[selectedFleet.id].timestamp).toLocaleTimeString() : '--:--'}</span>
                                        </div>
                                        
                                        <button 
                                            onClick={() => window.open(`https://wa.me/${selectedFleet.driver_phone?.replace(/\D/g, '')}`, '_blank')}
                                            className="w-full py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 shadow-xl hover:bg-slate-800 transition-all active:scale-95"
                                        >
                                            <Phone className="w-3.5 h-3.5 fill-white/20" /> WhatsApp Driver
                                        </button>
                                    </div>
                                </div>
                            </InfoWindow>
                        )}
                    </GoogleMap>
                    
                    {/* LEGEND */}
                    <div className="absolute bottom-6 left-6 right-6 md:left-auto bg-slate-950/95 backdrop-blur-xl p-6 rounded-[2.5rem] border border-white/10 flex flex-wrap items-center gap-10 shadow-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-orange-500 shadow-[0_0_15px_#f97316]" />
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">In Transit</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_15px_#10b981]" />
                            <span className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Live Feed Active</span>
                        </div>
                    </div>
                </div>

                <button 
                    onClick={onClose}
                    className="absolute top-8 right-8 w-14 h-14 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center text-white hover:bg-rose-600 hover:scale-110 shadow-2xl transition-all z-[1001] active:scale-95"
                >
                    <X className="w-7 h-7" />
                </button>
            </div>

            {/* 🖼️ PHOTO OVERLAY MODAL */}
            {selectedPhoto && (
                <div className="fixed inset-0 z-[2000] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-8" onClick={() => setSelectedPhoto(null)}>
                    <div className="relative max-w-5xl w-full h-full max-h-[85vh] flex items-center justify-center group">
                         <button className="absolute -top-14 right-0 text-white hover:text-rose-400 flex items-center gap-3 font-black uppercase text-sm tracking-[0.3em] transition-all">
                            EXIT <X className="w-8 h-8" />
                         </button>
                         <div className="relative w-full h-full bg-white rounded-[3rem] overflow-hidden shadow-[0_30px_100px_rgba(255,255,255,0.1)] border-8 border-white/10">
                            <Image src={selectedPhoto} alt="Evidence Full" fill className="object-contain" />
                         </div>
                    </div>
                </div>
            )}
        </div>
    );
}
