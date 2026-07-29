"use client";

import { GoogleMap, DirectionsRenderer } from "@react-google-maps/api";
import { Navigation as NavIcon, Loader2, History, Clock, Activity } from "lucide-react";

interface CockpitTelemetryFeedProps {
    jo: any;
    isLoaded: boolean;
    mapOptions: any;
    directions: google.maps.DirectionsResult | null;
}

export default function CockpitTelemetryFeed({
    jo, isLoaded, mapOptions, directions
}: CockpitTelemetryFeedProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Map Widget - Bigger Aspect */}
            <div className="aspect-square md:aspect-video lg:h-[600px] relative rounded-none overflow-hidden border-2 border-slate-50 shadow-xl bg-slate-50 group">
                <div className="absolute top-8 left-8 z-10 bg-white shadow-xl px-6 py-3 rounded-none border border-slate-100">
                    <p className="text-[11px] font-black text-[#1E293B] uppercase tracking-widest flex items-center gap-3 italic">
                        <NavIcon className="w-4 h-4 text-emerald-600" /> Ground Telemetry Support
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
                            
                            if (latest?.latitude !== undefined && latest?.longitude !== undefined && latest?.latitude !== null) {
                                return { lat: Number(latest.latitude), lng: Number(latest.longitude) };
                            }
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
            <div className="bg-slate-50/50 rounded-none border border-slate-100 flex flex-col overflow-hidden max-h-[600px] shadow-inner">
                <div className="p-8 border-b border-slate-200/60 bg-white flex items-center justify-between">
                    <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest italic flex items-center gap-3">
                       <History className="w-4 h-4 text-emerald-500" /> Global Mission Feed
                    </p>
                    <div className="px-5 py-2 bg-slate-100 rounded-none text-[10px] font-black text-slate-600 uppercase italic">
                        {jo.tracking_updates?.length || 0} Events
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {jo.tracking_updates?.length > 0 ? (
                        <div className="p-8 space-y-10">
                            {[...jo.tracking_updates].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).map((t: any, idx: number) => (
                                <div key={t.id} className="relative flex items-start gap-8">
                                    <div className="flex flex-col items-center h-full absolute -left-[4px] top-0 bottom-0 py-3">
                                        <div className={`w-4 h-4 rounded-none border-4 bg-white ${idx === 0 ? 'border-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'border-slate-200'}`} />
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
    );
}
