'use client';

import React, { useMemo, useState, useEffect } from 'react';
import { GoogleMap, Marker, InfoWindow, Polyline, DirectionsRenderer } from '@react-google-maps/api';
import { useGoogleMaps } from '@/lib/google-maps-context';
import { Loader2, Truck, User, MapPin, Phone, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { calculateBearingFromHistory, getVehicleTopDownMarkerIcon } from './VehicleMarkerUtils';

interface MultiFleetRadarMapProps {
  jobOrders: any[];
  onSelectJo?: (jo: any) => void;
  selectedJoId?: string | null;
}

const formatWA = (phone?: string) => {
  if (!phone) return '';
  let cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('0')) cleaned = '62' + cleaned.slice(1);
  return cleaned;
};

const TRUCK_COLORS = [
  '#3b82f6', // blue-500
  '#10b981', // emerald-500
  '#f59e0b', // amber-500
  '#8b5cf6', // violet-500
  '#ec4899', // pink-500
  '#06b6d4', // cyan-500
  '#f97316', // orange-500
  '#14b8a6', // teal-500
  '#6366f1', // indigo-500
  '#eab308', // yellow-500
];

export default function MultiFleetRadarMap({ jobOrders = [], onSelectJo, selectedJoId }: MultiFleetRadarMapProps) {
  const { isLoaded } = useGoogleMaps();
  const [activeMarker, setActiveMarker] = useState<any | null>(null);
  const [directionsMap, setDirectionsMap] = useState<{ [joId: string]: google.maps.DirectionsResult }>({});

  // Extract valid latest coordinates for all job orders
  const fleetMarkers = useMemo(() => {
    return jobOrders
      .map((jo, idx) => {
        // Find latest coordinates: try tracking_history[0] or first arrived/in-progress stop or pickup stop
        const tracking = jo.tracking_history || [];
        const validTracking = [...tracking]
          .filter((t: any) => t.latitude && t.longitude && Number(t.latitude) !== 0)
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        let lat = validTracking.length > 0 ? Number(validTracking[0].latitude) : null;
        let lng = validTracking.length > 0 ? Number(validTracking[0].longitude) : null;
        const lastTimeStr = validTracking.length > 0 ? format(new Date(validTracking[0].created_at), 'HH:mm') : null;

        // Fallback to route stops if no tracking point
        if (lat === null || lng === null) {
          const routes = jo.routes || [];
          const arrivedRoute = routes.find((r: any) => r.latitude && r.longitude && (r.status === 'arrived' || r.status === 'completed'));
          const pickupRoute = routes.find((r: any) => r.latitude && r.longitude);
          const fallbackRoute = arrivedRoute || pickupRoute;
          if (fallbackRoute) {
            lat = Number(fallbackRoute.latitude);
            lng = Number(fallbackRoute.longitude);
          }
        }

        if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) return null;

        const status = jo.status?.toUpperCase() || '';
        const isDone = ['COMPLETED', 'PEKERJAAN SELESAI', 'DONE', 'INVOICED', 'PAID', 'VERIFIED'].includes(status);
        const isActive = ['IN_PROGRESS', 'DALAM PERJALANAN', 'ON ROAD', 'STARTED', 'LOADING', 'UNLOADING'].includes(status) || status.startsWith('MENUJU') || status.startsWith('TIBA DI');

        const color = TRUCK_COLORS[idx % TRUCK_COLORS.length];

        // Build breadcrumb trail path for this truck
        let path = validTracking
          .map((t: any) => ({ lat: Number(t.latitude), lng: Number(t.longitude) }))
          .reverse();

        if (path.length < 2 && jo.routes) {
          const routePoints = jo.routes
            .filter((r: any) => r.latitude && r.longitude && Number(r.latitude) !== 0)
            .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
            .map((r: any) => ({ lat: Number(r.latitude), lng: Number(r.longitude) }));
          if (routePoints.length >= 2) {
            path = routePoints;
          }
        }

        const bearing = calculateBearingFromHistory(validTracking);
        const fleetTypeName = jo.fleet_type_name || jo.fleet_type || jo.fleet?.fleet_type?.type_name || jo.fleet_type_id || 'truck';
        const topDownMarker = getVehicleTopDownMarkerIcon(fleetTypeName, bearing, color);

        return {
          jo,
          unitIndex: idx + 1,
          lat,
          lng,
          lastTimeStr: lastTimeStr || 'Baru Saja',
          color,
          isDone,
          isActive,
          plateNumber: jo.fleet?.plate_number || `Unit #${idx + 1}`,
          driverName: jo.driver?.name || 'Belum Ditugaskan',
          driverPhone: jo.driver?.phone || null,
          statusLabel: isDone ? 'SELESAI' : isActive ? 'BERTUGAS' : 'MENUNGGU',
          path,
          bearing,
          topDownMarker,
        };
      })
      .filter(Boolean);
  }, [jobOrders]);

  // Compute road-snapped directions for all fleet trucks
  useEffect(() => {
    if (typeof window === 'undefined' || !window.google || fleetMarkers.length === 0) return;
    const directionsService = new window.google.maps.DirectionsService();

    fleetMarkers.forEach((m: any) => {
      if (m && m.path && m.path.length >= 2 && !directionsMap[m.jo.id]) {
        const origin = m.path[0];
        const destination = m.path[m.path.length - 1];
        const waypoints = m.path.slice(1, -1).slice(0, 23).map((pt: any) => ({
          location: new window.google.maps.LatLng(pt.lat, pt.lng),
          stopover: true
        }));

        directionsService.route(
          {
            origin: new window.google.maps.LatLng(origin.lat, origin.lng),
            destination: new window.google.maps.LatLng(destination.lat, destination.lng),
            waypoints,
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === window.google.maps.DirectionsStatus.OK && result) {
              setDirectionsMap(prev => ({ ...prev, [m.jo.id]: result }));
            }
          }
        );
      }
    });
  }, [fleetMarkers]);

  const mapCenter = useMemo(() => {
    if (fleetMarkers.length === 0) return { lat: -6.2088, lng: 106.8456 }; // Jakarta default
    const avgLat = fleetMarkers.reduce((sum, m) => sum + (m?.lat || 0), 0) / fleetMarkers.length;
    const avgLng = fleetMarkers.reduce((sum, m) => sum + (m?.lng || 0), 0) / fleetMarkers.length;
    return { lat: avgLat, lng: avgLng };
  }, [fleetMarkers]);

  if (!isLoaded) {
    return (
      <div className="w-full h-full min-h-[350px] bg-[#0e1628] rounded-3xl flex flex-col items-center justify-center text-slate-400 gap-3 border border-slate-800">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-xs font-bold uppercase tracking-wider">Memuat Live Radar Satelit 10 Armada...</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative rounded-3xl overflow-hidden border border-slate-800 bg-[#0e1628] shadow-2xl">
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%', minHeight: '380px' }}
        center={mapCenter}
        zoom={fleetMarkers.length === 1 ? 14 : 10}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: false,
          streetViewControl: false,
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#1a364a' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
          ],
        }}
      >
        {/* Render road-snapped directions / trails for active/completed trucks */}
        {fleetMarkers.map((m: any) => (
          directionsMap[m.jo.id] ? (
            <DirectionsRenderer
              key={`dir-${m.jo.id}`}
              directions={directionsMap[m.jo.id]}
              options={{
                preserveViewport: true,
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor: m.color,
                  strokeOpacity: selectedJoId === m.jo.id ? 1.0 : 0.65,
                  strokeWeight: selectedJoId === m.jo.id ? 5 : 3,
                }
              }}
            />
          ) : (
            m.path.length > 1 && (
              <Polyline
                key={`trail-${m.jo.id}`}
                path={m.path}
                options={{
                  strokeColor: m.color,
                  strokeOpacity: selectedJoId === m.jo.id ? 1.0 : 0.6,
                  strokeWeight: selectedJoId === m.jo.id ? 5 : 3,
                }}
              />
            )
          )
        ))}

        {/* Render markers for all trucks */}
        {fleetMarkers.map((m: any) => {
          const isSelected = selectedJoId === m.jo.id || activeMarker?.jo.id === m.jo.id;
          return (
            <Marker
              key={m.jo.id}
              position={{ lat: m.lat, lng: m.lng }}
              label={{
                text: `#${m.unitIndex}`,
                color: '#ffffff',
                fontWeight: 'bold',
                fontSize: '11px',
              }}
              icon={m.topDownMarker}
              onClick={() => {
                setActiveMarker(m);
                if (onSelectJo) onSelectJo(m.jo);
              }}
            />
          );
        })}

        {/* InfoWindow popup on click */}
        {activeMarker && (
          <InfoWindow
            position={{ lat: activeMarker.lat, lng: activeMarker.lng }}
            options={{ pixelOffset: typeof window !== 'undefined' && window.google ? new window.google.maps.Size(0, -44) : undefined }}
            onCloseClick={() => setActiveMarker(null)}
          >
            <div className="p-3 max-w-xs bg-slate-900 text-white rounded-2xl shadow-xl border border-slate-800">
              <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-2 mb-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full shrink-0 shadow-sm" 
                    style={{ backgroundColor: activeMarker.color }} 
                  />
                  <span className="text-xs font-black uppercase tracking-wider text-white">
                    {activeMarker.plateNumber}
                  </span>
                </div>
                <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
                  {activeMarker.statusLabel}
                </span>
              </div>

              <div className="space-y-1.5 text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <User size={13} className="text-blue-400 shrink-0" />
                  <span className="font-bold truncate">{activeMarker.driverName}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                  <MapPin size={13} className="text-emerald-400 shrink-0" />
                  <span>Update: <strong className="text-white">{activeMarker.lastTimeStr}</strong></span>
                </div>
              </div>

              {activeMarker.driverPhone && (
                <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800/80">
                  <a
                    href={`tel:${activeMarker.driverPhone}`}
                    className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg text-[11px] text-center transition-all flex items-center justify-center gap-1"
                    title="Telepon Driver"
                  >
                    <Phone size={12} /> Call
                  </a>
                  <a
                    href={`https://wa.me/${formatWA(activeMarker.driverPhone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg text-[11px] text-center transition-all flex items-center justify-center gap-1"
                    title="Chat WhatsApp"
                  >
                    <MessageSquare size={12} /> WA
                  </a>
                </div>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Floating Legend / Stats badge over map */}
      <div className="absolute top-4 left-4 bg-[#0e1628]/90 backdrop-blur-md border border-slate-800 px-3.5 py-2 rounded-2xl shadow-xl flex items-center gap-3 text-xs z-10">
        <div className="flex items-center gap-1.5 font-bold text-white">
          <Truck size={14} className="text-blue-400" />
          <span>{fleetMarkers.length} Armada Terpantau</span>
        </div>
      </div>
    </div>
  );
}
