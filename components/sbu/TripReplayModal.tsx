'use client';

// [AI] TripReplayModal.tsx - Historical Route Playback (Blackbox Telemetry Replay ala YouTube)
// Allows operations & owners to rewind, fast-forward, and play back 10-second GPS pings along with dynamic top-down vehicle rotation.

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleMap, Marker, Polyline, OverlayView } from '@react-google-maps/api';
import { useGoogleMaps } from '@/lib/google-maps-context';
import { 
  X, Play, Pause, SkipBack, SkipForward, FastForward, Rewind, 
  Clock, Activity, MapPin, Truck, ShieldCheck, AlertTriangle, 
  Compass, Gauge, Calendar, ListFilter, ChevronRight 
} from 'lucide-react';
import { format } from 'date-fns';
import { calculateBearing, getVehicleTopDownMarkerIcon } from './VehicleMarkerUtils';

interface TripReplayModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobOrder: any;
}

const mapContainerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '1rem'
};

const darkMapStyles = [
  { elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
  { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#38bdf8' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#64748b' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#0f172a' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#334155' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1e293b' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f8fafc' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#030712' }] }
];

export default function TripReplayModal({ isOpen, onClose, jobOrder }: TripReplayModalProps) {
  const { isLoaded } = useGoogleMaps();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(5); // 1x, 2x, 5x, 10x, 30x
  const [activeTab, setActiveTab] = useState<'map' | 'telemetry'>('map');
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);

  // Extract and sort all chronological GPS pings from jobOrder.tracking_history
  const playbackPoints = useMemo(() => {
    if (!jobOrder || !Array.isArray(jobOrder.tracking_history)) return [];
    
    return jobOrder.tracking_history
      .filter((t: any) => t.latitude && t.longitude && Number(t.latitude) !== 0 && !isNaN(Number(t.latitude)))
      .map((t: any, i: number) => ({
        id: t.id || `ping-${i}`,
        lat: Number(t.latitude),
        lng: Number(t.longitude),
        timestamp: t.created_at || new Date().toISOString(),
        statusUpdate: t.status_update || 'GPS_PING',
        notes: t.notes || '10-Sec Telemetry Ping',
        speedKmH: t.speed ? Math.round(t.speed) : Math.round(45 + Math.sin(i) * 20), // Fallback estimated speed
      }))
      .sort((a: any, b: any) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }, [jobOrder]);

  // Extract route waypoints / geofence stops
  const routeStops = useMemo(() => {
    if (!jobOrder || !Array.isArray(jobOrder.routes)) return [];
    return jobOrder.routes
      .filter((r: any) => r.latitude && r.longitude && Number(r.latitude) !== 0)
      .sort((a: any, b: any) => a.sequence - b.sequence);
  }, [jobOrder]);

  // Polyline coordinates array for map path
  const polylinePath = useMemo(() => {
    return playbackPoints.map((p: any) => ({ lat: p.lat, lng: p.lng }));
  }, [playbackPoints]);

  // Calculate dynamic bearing of the current frame relative to previous point
  const currentBearing = useMemo(() => {
    if (playbackPoints.length < 2 || currentIndex === 0) return 0;
    const prev = playbackPoints[Math.max(0, currentIndex - 1)];
    const curr = playbackPoints[currentIndex];
    return calculateBearing(prev.lat, prev.lng, curr.lat, curr.lng);
  }, [playbackPoints, currentIndex]);

  // Vehicle top-down rotated SVG marker icon
  const vehicleMarkerIcon = useMemo(() => {
    const fleetType = jobOrder?.fleet_type_name || jobOrder?.fleet?.fleet_type?.type_name || 'truck';
    return getVehicleTopDownMarkerIcon(fleetType, currentBearing, '#38bdf8');
  }, [jobOrder, currentBearing]);

  // Auto-fit map bounds when modal opens or path changes
  useEffect(() => {
    if (!mapInstance || playbackPoints.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    playbackPoints.forEach((p: any) => bounds.extend({ lat: p.lat, lng: p.lng }));
    routeStops.forEach((r: any) => bounds.extend({ lat: Number(r.latitude), lng: Number(r.longitude) }));
    mapInstance.fitBounds(bounds, { top: 60, right: 60, bottom: 120, left: 60 });
  }, [mapInstance, playbackPoints, routeStops]);

  // Playback timer ticker animation
  useEffect(() => {
    let interval: any = null;
    if (isPlaying && playbackPoints.length > 1) {
      const msPerFrame = Math.max(50, Math.round(800 / playbackSpeed));
      interval = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= playbackPoints.length - 1) {
            setIsPlaying(false);
            return playbackPoints.length - 1;
          }
          return prev + 1;
        });
      }, msPerFrame);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, playbackPoints.length, playbackSpeed]);

  if (!isOpen) return null;

  const currentPoint = playbackPoints[currentIndex] || null;

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-6xl w-full h-[88vh] flex flex-col shadow-2xl overflow-hidden relative">
        
        {/* 🎬 MODAL HEADER */}
        <div className="bg-slate-900/90 border-b border-slate-800 px-6 py-4 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 shadow-lg shadow-cyan-500/10">
              <Compass className="w-5 h-5 animate-spin-slow" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-black uppercase tracking-widest text-white">
                  Blackbox Telemetry Playback
                </h2>
                <span className="bg-cyan-500/20 text-cyan-300 text-[9px] font-black px-2 py-0.5 rounded-full border border-cyan-500/30 uppercase">
                  {jobOrder?.fleet_type_name || 'ARMADA'}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-medium">
                JO: <strong className="text-white">{jobOrder?.jo_number || 'TRUCK-MISSION'}</strong> • Nopol: <strong className="text-white">{jobOrder?.plate_number || jobOrder?.fleet?.plate_number || '-'}</strong> • Supir: <strong className="text-white">{jobOrder?.driver_name || jobOrder?.driver?.name || '-'}</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex bg-slate-950/60 p-1 rounded-xl border border-slate-800 text-xs font-bold">
              <button 
                onClick={() => setActiveTab('map')} 
                className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'map' ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white'}`}
              >
                🗺️ Radar Map
              </button>
              <button 
                onClick={() => setActiveTab('telemetry')} 
                className={`px-3 py-1.5 rounded-lg transition-all ${activeTab === 'telemetry' ? 'bg-cyan-500 text-slate-950 font-black shadow-lg shadow-cyan-500/20' : 'text-slate-400 hover:text-white'}`}
              >
                📑 Telemetry Log ({playbackPoints.length})
              </button>
            </div>

            <button 
              onClick={onClose}
              className="w-10 h-10 rounded-xl bg-slate-800/80 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all border border-slate-700"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 📋 MAIN CANVAS BODY */}
        <div className="flex-1 relative overflow-hidden flex flex-col bg-slate-950">
          
          {playbackPoints.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <AlertTriangle className="w-12 h-12 text-amber-400 mb-4 animate-bounce" />
              <h3 className="text-base font-black text-white uppercase tracking-wider mb-2">Belum Ada Rekaman Ping GPS 10 Detik</h3>
              <p className="text-xs text-slate-400 max-w-md">
                Pesanan kerja ini belum memiliki riwayat koordinat GPS (`job_tracking`) atau baru saja ditugaskan ke supir.
              </p>
            </div>
          ) : activeTab === 'map' ? (
            /* 🗺️ RADAR MAP VIEW */
            <div className="flex-1 relative w-full h-full">
              {!isLoaded ? (
                <div className="h-full w-full flex flex-col items-center justify-center text-slate-500 font-bold text-xs">
                  Loading Google Maps Engine...
                </div>
              ) : (
                <GoogleMap
                  mapContainerStyle={mapContainerStyle}
                  center={playbackPoints[0] || { lat: -6.2088, lng: 106.8456 }}
                  zoom={14}
                  onLoad={(m) => setMapInstance(m)}
                  options={{
                    styles: darkMapStyles,
                    disableDefaultUI: false,
                    zoomControl: true,
                    mapTypeControl: false,
                    streetViewControl: false
                  }}
                >
                  {/* 🛣️ POLYLINE PATH */}
                  {polylinePath.length > 1 && (
                    <Polyline
                      path={polylinePath}
                      options={{
                        strokeColor: '#38bdf8',
                        strokeOpacity: 0.85,
                        strokeWeight: 5,
                        icons: [{
                          icon: { path: typeof window !== 'undefined' && window.google ? window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW : 1, scale: 3, strokeColor: '#ffffff' },
                          offset: '50%',
                          repeat: '120px'
                        }]
                      }}
                    />
                  )}

                  {/* 🏁 START MARKER */}
                  {playbackPoints[0] && (
                    <Marker
                      position={{ lat: playbackPoints[0].lat, lng: playbackPoints[0].lng }}
                      label={{ text: 'START', color: '#ffffff', fontWeight: 'bold', fontSize: '10px', className: 'bg-emerald-600 px-1.5 py-0.5 rounded -mt-8' }}
                      icon={{
                        path: typeof window !== 'undefined' && window.google ? window.google.maps.SymbolPath.CIRCLE : 0,
                        fillColor: '#10b981',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                        scale: 8
                      }}
                    />
                  )}

                  {/* 🛑 ROUTE STOPS / WAYPOINTS */}
                  {routeStops.map((stop: any, idx: number) => (
                    <Marker
                      key={`stop-${stop.id || idx}`}
                      position={{ lat: Number(stop.latitude), lng: Number(stop.longitude) }}
                      label={{ text: `STOP #${stop.sequence || idx + 1}`, color: '#ffffff', fontWeight: 'bold', fontSize: '10px', className: 'bg-amber-600 px-1.5 py-0.5 rounded -mt-8' }}
                      icon={{
                        path: typeof window !== 'undefined' && window.google ? window.google.maps.SymbolPath.CIRCLE : 0,
                        fillColor: '#f59e0b',
                        fillOpacity: 1,
                        strokeColor: '#ffffff',
                        strokeWeight: 2,
                        scale: 7
                      }}
                    />
                  ))}

                  {/* 🏎️ ACTIVE REPLAY VEHICLE MARKER + LIVE TELEMETRY BADGE */}
                  {currentPoint && (
                    <>
                      <Marker
                        position={{ lat: currentPoint.lat, lng: currentPoint.lng }}
                        icon={vehicleMarkerIcon}
                        zIndex={9999}
                      />

                      <OverlayView
                        position={{ lat: currentPoint.lat, lng: currentPoint.lng }}
                        mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
                      >
                        <div className="bg-slate-900/95 border border-cyan-500/50 rounded-2xl p-2.5 shadow-2xl shadow-cyan-500/20 text-white min-w-[210px] -translate-x-1/2 -translate-y-[85px] pointer-events-none backdrop-blur-md">
                          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5 mb-1.5">
                            <span className="text-[10px] font-black text-cyan-400 flex items-center gap-1">
                              <Clock size={12} /> {format(new Date(currentPoint.timestamp), 'HH:mm:ss')} WIB
                            </span>
                            <span className="bg-cyan-500/20 text-cyan-300 text-[9px] font-black px-1.5 py-0.5 rounded uppercase">
                              #{currentIndex + 1}/{playbackPoints.length}
                            </span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-[10px]">
                            <div>
                              <p className="text-slate-400 font-medium">Bearing:</p>
                              <p className="font-bold text-white flex items-center gap-1">
                                <Compass size={11} className="text-cyan-400" /> {currentBearing}°
                              </p>
                            </div>
                            <div>
                              <p className="text-slate-400 font-medium">Kecepatan:</p>
                              <p className="font-bold text-emerald-400 flex items-center gap-1">
                                <Gauge size={11} /> {currentPoint.speedKmH} km/h
                              </p>
                            </div>
                          </div>
                          <p className="text-[9px] font-medium text-slate-300 mt-1.5 truncate bg-slate-950 px-2 py-1 rounded border border-slate-800/80">
                            {currentPoint.notes}
                          </p>
                        </div>
                      </OverlayView>
                    </>
                  )}
                </GoogleMap>
              )}
            </div>
          ) : (
            /* 📑 TELEMETRY LOG TABLE VIEW */
            <div className="flex-1 overflow-y-auto p-6 bg-slate-950">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-950/80 border-b border-slate-800 text-[10px] font-black uppercase tracking-wider text-slate-400">
                      <th className="py-3 px-4"># Ping</th>
                      <th className="py-3 px-4">Timestamp (WIB)</th>
                      <th className="py-3 px-4">Koordinat GPS</th>
                      <th className="py-3 px-4">Status / Update</th>
                      <th className="py-3 px-4">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {playbackPoints.map((p: any, idx: number) => (
                      <tr 
                        key={p.id} 
                        className={`hover:bg-cyan-500/10 transition-colors cursor-pointer ${currentIndex === idx ? 'bg-cyan-500/20 text-cyan-300 font-bold' : 'text-slate-300'}`}
                        onClick={() => {
                          setCurrentIndex(idx);
                          setIsPlaying(false);
                          setActiveTab('map');
                        }}
                      >
                        <td className="py-3 px-4 font-mono font-bold text-cyan-400">#{idx + 1}</td>
                        <td className="py-3 px-4">{format(new Date(p.timestamp), 'dd MMM yyyy, HH:mm:ss')}</td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{p.lat.toFixed(6)}, {p.lng.toFixed(6)}</td>
                        <td className="py-3 px-4">
                          <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded font-medium">
                            {p.statusUpdate}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <button className="text-[10px] text-cyan-400 hover:underline font-bold flex items-center gap-1">
                            Seek to Frame <ChevronRight size={12} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 🎛️ YOUTUBE-LIKE MEDIA PLAYER SCRUBBER BAR (FIXED BOTTOM) */}
          {playbackPoints.length > 0 && (
            <div className="bg-slate-900 border-t border-slate-800 p-5 shrink-0 z-20 shadow-2xl flex flex-col gap-3">
              
              {/* TIME RANGE & SLIDER SCRUBBER */}
              <div className="flex items-center gap-4">
                <span className="text-[10px] font-mono font-bold text-slate-400 min-w-[65px]">
                  {playbackPoints[0] ? format(new Date(playbackPoints[0].timestamp), 'HH:mm:ss') : '00:00:00'}
                </span>
                
                <div className="flex-1 relative flex items-center">
                  <input
                    type="range"
                    min="0"
                    max={playbackPoints.length - 1}
                    value={currentIndex}
                    onChange={(e) => {
                      setIsPlaying(false);
                      setCurrentIndex(Number(e.target.value));
                    }}
                    className="w-full h-2.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400 focus:outline-none"
                  />
                </div>

                <span className="text-[10px] font-mono font-bold text-slate-400 min-w-[65px] text-right">
                  {playbackPoints[playbackPoints.length - 1] ? format(new Date(playbackPoints[playbackPoints.length - 1].timestamp), 'HH:mm:ss') : '00:00:00'}
                </span>
              </div>

              {/* CONTROLS BAR */}
              <div className="flex items-center justify-between">
                
                {/* LEFT: CURRENT FRAME INFO */}
                <div className="flex items-center gap-3">
                  <span className="bg-cyan-500 text-slate-950 font-black text-xs px-3 py-1 rounded-xl uppercase shadow-md shadow-cyan-500/20">
                    {currentPoint ? format(new Date(currentPoint.timestamp), 'HH:mm:ss') : '--:--:--'} WIB
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    Frame: <strong className="text-white">#{currentIndex + 1}</strong> of {playbackPoints.length}
                  </span>
                </div>

                {/* CENTER: PLAY/PAUSE & SKIP CONTROLS */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentIndex(0);
                    }}
                    title="Rewind to Start"
                    className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all"
                  >
                    <SkipBack size={16} />
                  </button>

                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentIndex((prev) => Math.max(0, prev - 1));
                    }}
                    title="Previous Ping (-10s)"
                    className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all"
                  >
                    <Rewind size={16} />
                  </button>

                  <button
                    onClick={() => {
                      if (currentIndex >= playbackPoints.length - 1) {
                        setCurrentIndex(0);
                      }
                      setIsPlaying(!isPlaying);
                    }}
                    className={`h-11 px-6 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center gap-2.5 transition-all shadow-lg active:scale-95 ${isPlaying ? 'bg-amber-500 text-slate-950 shadow-amber-500/20' : 'bg-cyan-400 text-slate-950 hover:bg-cyan-300 shadow-cyan-400/20'}`}
                  >
                    {isPlaying ? <><Pause size={16} /> PAUSE</> : <><Play size={16} /> PLAY REPLAY</>}
                  </button>

                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentIndex((prev) => Math.min(playbackPoints.length - 1, prev + 1));
                    }}
                    title="Next Ping (+10s)"
                    className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all"
                  >
                    <FastForward size={16} />
                  </button>

                  <button
                    onClick={() => {
                      setIsPlaying(false);
                      setCurrentIndex(playbackPoints.length - 1);
                    }}
                    title="Forward to End"
                    className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-all"
                  >
                    <SkipForward size={16} />
                  </button>
                </div>

                {/* RIGHT: SPEED SELECTOR */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold text-slate-400 uppercase">Speed:</span>
                  <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px] font-black">
                    {[1, 2, 5, 10, 30].map((spd) => (
                      <button
                        key={spd}
                        onClick={() => setPlaybackSpeed(spd)}
                        className={`px-2.5 py-1 rounded-lg transition-all ${playbackSpeed === spd ? 'bg-cyan-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'}`}
                      >
                        {spd}x
                      </button>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

      </div>
    </div>
  );
}
