'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { GoogleMap, Marker, InfoWindow, DirectionsRenderer, Polyline } from '@react-google-maps/api';
import { useGoogleMaps } from '@/lib/google-maps-context';
import { Loader2, Truck, User, MapPin, Phone, MessageSquare, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { calculateBearingFromHistory, getVehicleTopDownMarkerIcon } from './VehicleMarkerUtils';
import type { GeofenceMovementStatus } from './FleetTrackingConsole';

const ISLANDS = [
  { id: 'sumatera', name: 'Sumatera', bounds: { north: 6.0, south: -6.0, west: 95.0, east: 106.0 } },
  { id: 'jawa', name: 'Jawa & Bali', bounds: { north: -5.5, south: -9.0, west: 105.0, east: 115.5 } },
  { id: 'kalimantan', name: 'Kalimantan', bounds: { north: 4.5, south: -4.5, west: 108.5, east: 119.0 } },
  { id: 'sulawesi', name: 'Sulawesi & Maluku', bounds: { north: 2.0, south: -9.0, west: 118.5, east: 135.0 } },
  { id: 'papua', name: 'Papua', bounds: { north: 0.0, south: -9.0, west: 135.0, east: 141.0 } },
];

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '1rem'
};

interface UnifiedMissionRadarMapProps {
  jobOrders: any[];
  selectedJoId?: string | null;
  selectedWoGroup?: string | null;
  onSelectJo?: (jo: any) => void;
  focusedLocation?: {lat: number, lng: number, title: string} | null;
  isVideowallMode?: boolean;
  geofenceStatusMap?: Record<string, GeofenceMovementStatus>;
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

const getValidLatLng = (lat: any, lng: any) => {
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (isNaN(numLat) || isNaN(numLng)) return null;
  if (numLat === 0 && numLng === 0) return null;
  return { lat: numLat, lng: numLng };
};

export default function UnifiedMissionRadarMap({
  jobOrders = [],
  selectedJoId,
  selectedWoGroup = 'ALL',
  onSelectJo,
  focusedLocation,
  isVideowallMode = false,
  geofenceStatusMap = {}
}: UnifiedMissionRadarMapProps) {
  const { isLoaded } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [activeMarker, setActiveMarker] = useState<any | null>(null);
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [directionsMap, setDirectionsMap] = useState<{ [joId: string]: google.maps.DirectionsResult }>({});
  const [selectedRouteStops, setSelectedRouteStops] = useState<any[]>([]);
  const [passiveRouteStops, setPassiveRouteStops] = useState<{ signature: string, stops: any[] }[]>([]);

  const videowallBoundsInitialized = useRef(false);

  // Find the currently selected single JO (if any)
  const selectedJo = useMemo(() => {
    if (!selectedJoId) return null;
    return jobOrders.find(jo => jo.id === selectedJoId) || null;
  }, [jobOrders, selectedJoId]);

  // Filter trucks visible on radar: if a specific WO group is selected, only show those trucks (or all if 'ALL')
  const visibleJobOrders = useMemo(() => {
    if (selectedWoGroup === 'ALL' || !selectedWoGroup) return jobOrders;
    return jobOrders.filter(jo => jo.wo_number === selectedWoGroup);
  }, [jobOrders, selectedWoGroup]);

  // Extract valid latest coordinates for visible trucks
  const fleetMarkers = useMemo(() => {
    return visibleJobOrders
      .map((jo, idx) => {
        const tracking = jo.tracking_history || [];
        const validTracking = [...tracking]
          .filter((t: any) => t.latitude && t.longitude && Number(t.latitude) !== 0)
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const hasLiveGps = validTracking.length > 0;

        let lat = hasLiveGps ? Number(validTracking[0].latitude) : null;
        let lng = hasLiveGps ? Number(validTracking[0].longitude) : null;
        const lastTimeStr = hasLiveGps ? format(new Date(validTracking[0].created_at), 'HH:mm:ss') : null;

        if (lat === null || lng === null) {
          const routes = jo.routes || [];
          const arrivedRoute = routes.find((r: any) => r.latitude && r.longitude && Number(r.latitude) !== 0 && (r.status === 'arrived' || r.status === 'completed'));
          const pickupRoute = routes.find((r: any) => r.latitude && r.longitude && Number(r.latitude) !== 0);
          const fallbackRoute = arrivedRoute || pickupRoute;
          if (fallbackRoute) {
            lat = Number(fallbackRoute.latitude);
            lng = Number(fallbackRoute.longitude);
          } else {
            const stops = jo.wo_item?.item_data?.stops || [];
            if (stops.length > 0 && stops[0].latitude && stops[0].longitude && Number(stops[0].latitude) !== 0) {
              lat = Number(stops[0].latitude);
              lng = Number(stops[0].longitude);
            }
          }
        }

        if (lat === null || lng === null || isNaN(lat) || isNaN(lng)) return null;

        const status = jo.status?.toUpperCase() || '';
        const isDone = ['COMPLETED', 'PEKERJAAN SELESAI', 'DONE', 'INVOICED', 'PAID', 'VERIFIED'].includes(status);
        const isActive = ['IN_PROGRESS', 'DALAM PERJALANAN', 'ON ROAD', 'STARTED', 'LOADING', 'UNLOADING', 'ORDER DITERIMA', 'ACCEPTED'].includes(status) || status.startsWith('MENUJU') || status.startsWith('TIBA DI');

        let color = TRUCK_COLORS[idx % TRUCK_COLORS.length];
        const logNote = (jo.latest_log?.notes || jo.latest_log?.status_update || '').toUpperCase();
        const isSos = logNote.includes('SOS') || logNote.includes('DARURAT');
        const diffMins = hasLiveGps ? (new Date().getTime() - new Date(validTracking[0].created_at + (validTracking[0].created_at.includes('+') || validTracking[0].created_at.endsWith('Z') ? '' : 'Z')).getTime()) / 60000 : 0;
        
        if (isVideowallMode) {
           const gfStatus = geofenceStatusMap[jo.id];
           if (isSos || gfStatus === 'sos') color = '#ef4444'; // Red
           else if (gfStatus === 'idle') color = '#f59e0b'; // Amber
           else color = '#3b82f6'; // Blue active/moving
        }
        const isSelectedTruck = selectedJoId === jo.id;

        let path = validTracking
          .map((t: any) => ({ lat: Number(t.latitude), lng: Number(t.longitude) }))
          .reverse();

        if (path.length < 2 && jo.routes) {
          const routePoints = jo.routes
            .filter((r: any) => getValidLatLng(r.latitude, r.longitude) !== null)
            .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0))
            .map((r: any) => getValidLatLng(r.latitude, r.longitude)!);
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
          status,
          isDone,
          isActive,
          color,
          path,
          isSelectedTruck,
          hasLiveGps,
          bearing,
          topDownMarker,
          isSos
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);
  }, [visibleJobOrders, selectedJoId, geofenceStatusMap]);

  // Compute unique PLANNED routes (Passive Routes) for all active JOs to group trucks by their route
  useEffect(() => {
    if (typeof window === 'undefined' || !window.google || fleetMarkers.length === 0) return;
    const directionsService = new window.google.maps.DirectionsService();

    // 1. Group by unique route signatures
    const uniqueRoutes = new Map<string, any[]>();
    
    fleetMarkers.forEach(item => {
      const routes = item.jo.routes || [];
      const validStops = routes.filter((s: any) => getValidLatLng(s.latitude, s.longitude) !== null);
      if (validStops.length >= 2) {
        const sorted = [...validStops].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
        // Create a signature based on ALL coordinates to accurately group identical routes
        const coordsStr = sorted.map(s => `${s.latitude},${s.longitude}`).join('|');
        const signature = coordsStr;
        
        if (!uniqueRoutes.has(signature)) {
          uniqueRoutes.set(signature, sorted);
        }
      } else {
        console.warn("Not enough valid stops for JO", item.jo.jo_number, routes);
      }
    });

    setPassiveRouteStops(Array.from(uniqueRoutes.entries()).map(([signature, stops]) => ({ signature, stops })));
    console.log("Found uniqueRoutes:", uniqueRoutes.size);

    let isSubscribed = true;

    const fetchUniqueRoutes = async () => {
      for (const [signature, sortedStops] of Array.from(uniqueRoutes.entries())) {
        if (!isSubscribed) break;
        
        if (directionsMap[signature]) continue; // Already fetched

        const origin = getValidLatLng(sortedStops[0].latitude, sortedStops[0].longitude)!;
        const destination = getValidLatLng(sortedStops[sortedStops.length - 1].latitude, sortedStops[sortedStops.length - 1].longitude)!;
        
        const waypoints = sortedStops.slice(1, -1).map(stop => {
          const coords = getValidLatLng(stop.latitude, stop.longitude)!;
          return {
            location: new window.google.maps.LatLng(coords.lat, coords.lng),
            stopover: true
          };
        });

        try {
          await new Promise(resolve => setTimeout(resolve, 300));
          if (!isSubscribed) break;

          directionsService.route(
            {
              origin: new window.google.maps.LatLng(origin.lat, origin.lng),
              destination: new window.google.maps.LatLng(destination.lat, destination.lng),
              waypoints,
              travelMode: window.google.maps.TravelMode.DRIVING,
            },
            (result, status) => {
              console.log("Directions result for", signature, ":", status);
              if (status === window.google.maps.DirectionsStatus.OK && result) {
                if (isSubscribed) {
                  setDirectionsMap(prev => ({ ...prev, [signature]: result }));
                }
              } else {
                console.warn("Failed directions status:", status);
              }
            }
          );
        } catch (e) {
          console.error("Unique Route fetch failed");
        }
      }
    };

    fetchUniqueRoutes();

    return () => {
      isSubscribed = false;
    };
  }, [fleetMarkers]);

  // Extract route waypoints for selected JO (for Origin/Destination markers & Directions)
  useEffect(() => {
    if (!selectedJo || !Array.isArray(selectedJo.routes)) {
      setDirectionsResponse(null);
      setSelectedRouteStops([]);
      return;
    }

    const validStops = selectedJo.routes.filter((s: any) => getValidLatLng(s.latitude, s.longitude) !== null);
    const sorted = [...validStops].sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    setSelectedRouteStops(sorted);

    if (sorted.length >= 2 && typeof window !== 'undefined' && window.google) {
      const origin = getValidLatLng(sorted[0].latitude, sorted[0].longitude)!;
      const destination = getValidLatLng(sorted[sorted.length - 1].latitude, sorted[sorted.length - 1].longitude)!;
      
      const waypoints = sorted.slice(1, -1).map(stop => {
        const coords = getValidLatLng(stop.latitude, stop.longitude)!;
        return {
          location: new window.google.maps.LatLng(coords.lat, coords.lng),
          stopover: true
        };
      });

      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin: new window.google.maps.LatLng(origin.lat, origin.lng),
          destination: new window.google.maps.LatLng(destination.lat, destination.lng),
          waypoints: waypoints,
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK && result) {
            setDirectionsResponse(result);
          } else {
            console.warn('⚠️ Directions request failed:', status);
            setDirectionsResponse(null);
          }
        }
      );
    } else {
      setDirectionsResponse(null);
    }
  }, [selectedJo]);

  // Camera management: Pan/Zoom smoothly depending on selection state or focused location
  useEffect(() => {
    if (!map) return;

    if (focusedLocation) {
      map.setCenter({ lat: focusedLocation.lat, lng: focusedLocation.lng });
      map.setZoom(16);
      return;
    }

    if (selectedJoId) {
      const selectedTruckMarker = fleetMarkers.find(m => m.jo.id === selectedJoId);
      if (selectedTruckMarker && typeof window !== 'undefined' && window.google) {
        map.panTo({ lat: selectedTruckMarker.lat, lng: selectedTruckMarker.lng });
        map.setZoom(16);
      }
      return;
    }

    // Videowall Static Mode (Do not pan automatically on updates)
    // Only fitBounds ONCE when the map loads or when fleetMarkers first populates
    if (isVideowallMode && fleetMarkers.length > 0 && typeof window !== 'undefined' && window.google) {
      if (!videowallBoundsInitialized.current) {
        const bounds = new window.google.maps.LatLngBounds();
        fleetMarkers.forEach(m => bounds.extend({ lat: m.lat, lng: m.lng }));
        map.fitBounds(bounds, 60);
        videowallBoundsInitialized.current = true;
      }
      return;
    }

    // Default bounds (non-videowall, no selection)
    if (!isVideowallMode && fleetMarkers.length > 0 && typeof window !== 'undefined' && window.google) {
      if (fleetMarkers.length === 1) {
        map.panTo({ lat: fleetMarkers[0].lat, lng: fleetMarkers[0].lng });
        map.setZoom(13);
      } else {
        const bounds = new window.google.maps.LatLngBounds();
        fleetMarkers.forEach(m => bounds.extend({ lat: m.lat, lng: m.lng }));
        map.fitBounds(bounds, 60);
      }
    }
  }, [map, selectedJoId, focusedLocation, isVideowallMode]);

  if (!isLoaded) {
    return (
      <div className="w-full h-full bg-slate-900 rounded-2xl flex flex-col items-center justify-center border border-slate-800">
        <Loader2 className="animate-spin text-blue-500 mb-3" size={32} />
        <span className="text-sm font-bold text-slate-300">Memuat Radar Satelit Konsolidasi...</span>
      </div>
    );
  }

  // Default fallback center (Jakarta/Indonesia)
  const defaultCenter = fleetMarkers.length > 0
    ? { lat: fleetMarkers[0].lat, lng: fleetMarkers[0].lng }
    : { lat: -6.2088, lng: 106.8456 };

  return (
    <div className="w-full h-full relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-slate-900">
      
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={defaultCenter}
        zoom={11}
        onLoad={setMap}
        onClick={() => setActiveMarker(null)}
        options={{
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: true,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
            { elementType: 'labels.text.stroke', stylers: [{ color: '#0f172a' }] },
            { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
            { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] },
            { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#1e293b' }] },
            { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
            { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
          ]
        }}
      >
        {/* 1. DIRECTIONS RENDERER (If Single JO is selected & route ready) */}
        {directionsResponse && selectedJoId && (
          <DirectionsRenderer
            directions={directionsResponse}
            options={{
              preserveViewport: true,
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#3b82f6',
                strokeWeight: 6,
                strokeOpacity: 0.85,
              }
            }}
          />
        )}

        {/* 2. STOP MARKERS (Origin & Destination pins when single JO selected) */}
        {selectedJoId && selectedRouteStops.map((stop, idx) => {
          const coords = getValidLatLng(stop.latitude, stop.longitude);
          if (!coords) return null;
          const isOrigin = idx === 0;
          const isDest = idx === selectedRouteStops.length - 1;

          return (
            <Marker
              key={`stop-${stop.id || idx}`}
              position={coords}
              label={{
                text: isOrigin ? 'A' : isDest ? 'B' : `${idx}`,
                color: 'white',
                fontWeight: 'bold',
                fontSize: '11px'
              }}
              icon={{
                url: isOrigin 
                  ? 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' 
                  : isDest 
                  ? 'https://maps.google.com/mapfiles/ms/icons/red-dot.png' 
                  : 'https://maps.google.com/mapfiles/ms/icons/yellow-dot.png',
                scaledSize: typeof window !== 'undefined' && window.google ? new window.google.maps.Size(36, 36) : undefined
              }}
              title={stop.location_name || stop.address || `Stop ${idx + 1}`}
            />
          );
        })}

        {/* PASSIVE PLANNED ROUTES (Grouped by WO items) */}
        {Object.entries(directionsMap).map(([signature, dirResult]) => (
          <DirectionsRenderer
            key={`route-${signature}`}
            directions={dirResult}
            options={{
              preserveViewport: true,
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#0ea5e9',
                strokeOpacity: isVideowallMode ? 0.6 : 0.8,
                strokeWeight: 6,
                zIndex: 10
              }
            }}
          />
        ))}

        {/* PASSIVE ROUTE START/FINISH FLAGS */}
        {passiveRouteStops.map((routeGroup, grpIdx) => {
          const originStop = routeGroup.stops[0];
          const destStop = routeGroup.stops[routeGroup.stops.length - 1];
          const originCoords = getValidLatLng(originStop.latitude, originStop.longitude);
          const destCoords = getValidLatLng(destStop.latitude, destStop.longitude);

          return (
            <React.Fragment key={`flags-${routeGroup.signature}-${grpIdx}`}>
              {originCoords && (
                <Marker
                  position={originCoords}
                  icon={{
                    url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png',
                    scaledSize: typeof window !== 'undefined' && window.google ? new window.google.maps.Size(32, 32) : undefined
                  }}
                  zIndex={20}
                  title={`Start: ${originStop.location_name || originStop.address || 'Origin'}`}
                />
              )}
              {destCoords && (
                <Marker
                  position={destCoords}
                  icon={{
                    url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                    scaledSize: typeof window !== 'undefined' && window.google ? new window.google.maps.Size(32, 32) : undefined
                  }}
                  zIndex={20}
                  title={`Finish: ${destStop.location_name || destStop.address || 'Destination'}`}
                />
              )}
            </React.Fragment>
          );
        })}

        {/* 3. FLEET TRUCK MARKERS */}
        {fleetMarkers.map((item) => {
          const isSelected = item.isSelectedTruck;

          // CRITICAL: When a single JO is clicked, hide all other unrelated truck markers so only 1 single live truck icon appears on the map!
          if (selectedJoId && !isSelected) return null;

          const badgeLabelText = item.hasLiveGps
            ? `🚚 LIVE GPS SUPIR: ${item.jo.plate_number || 'TRUK'} (${item.jo.driver_name || 'Supir'}) - ${item.lastTimeStr}`
            : `🚚 SIAP BERANGKAT (TERIMA JOB): ${item.jo.plate_number || 'TRUK'} (${item.jo.driver_name || 'Supir'})`;

          return (
            <React.Fragment key={item.jo.id}>
              {/* Planned Route Highlight (Only for Selected JO) */}
              {directionsResponse && isSelected && (
                <DirectionsRenderer
                  directions={directionsResponse}
                  options={{
                    preserveViewport: true,
                    suppressMarkers: true,
                    polylineOptions: {
                      strokeColor: '#0ea5e9',
                      strokeOpacity: isVideowallMode ? 0.6 : 0.8,
                      strokeWeight: 5,
                      zIndex: 10
                    }
                  }}
                />
              )}

              {/* Breadcrumb Ping Points when selected */}
              {isSelected && item.path.map((pt, pIdx) => (
                <Marker
                  key={`pt-${item.jo.id}-${pIdx}`}
                  position={pt}
                  icon={{
                    path: typeof window !== 'undefined' && window.google ? window.google.maps.SymbolPath.CIRCLE : 0,
                    fillColor: '#38bdf8',
                    fillOpacity: 0.8,
                    strokeColor: '#ffffff',
                    strokeWeight: 1,
                    scale: 5
                  }}
                  zIndex={40}
                  title={`Ping #${pIdx + 1}`}
                />
              ))}

              {/* SINGLE LIVE TRUCK MARKER */}
              <Marker
                position={{ lat: item.lat, lng: item.lng }}
                onClick={() => {
                  setActiveMarker(item);
                  if (onSelectJo) onSelectJo(item.jo);
                }}
                label={isSelected ? {
                  text: badgeLabelText,
                  color: '#ffffff',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  className: 'bg-blue-600 px-2.5 py-1 rounded-lg border border-white shadow-xl -mt-16 whitespace-nowrap'
                } : {
                  text: isVideowallMode ? (item.jo.plate_number || 'TRUK') : (item.jo.plate_number ? item.jo.plate_number.replace(/\s+/g, '').substring(0, 8) : `#${item.unitIndex}`),
                  color: '#ffffff',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  className: isVideowallMode 
                    ? `px-2 py-0.5 rounded border border-white/20 -mt-12 shadow-md ${item.isSos ? 'bg-rose-600 animate-pulse' : 'bg-slate-900/90'}`
                    : 'bg-slate-900/90 px-1.5 py-0.5 rounded border border-slate-700 -mt-12 shadow-md'
                }}
                icon={item.topDownMarker}
                zIndex={isSelected ? 9999 : item.unitIndex + 100}
              />
            </React.Fragment>
          );
        })}

        {/* 4. INFO WINDOW popup for clicked marker */}
        {activeMarker && (
          <InfoWindow
            position={{ lat: activeMarker.lat, lng: activeMarker.lng }}
            options={{ pixelOffset: typeof window !== 'undefined' && window.google ? new window.google.maps.Size(0, -44) : undefined }}
            onCloseClick={() => setActiveMarker(null)}
          >
            <div className="p-2.5 max-w-xs text-slate-900 bg-white rounded-lg shadow-sm">
              <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-2">
                <div>
                  <span className="text-[10px] font-extrabold text-blue-600 block leading-tight">{activeMarker.jo.jo_number}</span>
                  <h4 className="text-xs font-black text-slate-900 leading-tight">{activeMarker.jo.plate_number || 'No Plate'}</h4>
                </div>
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                  activeMarker.isDone 
                    ? 'bg-slate-100 text-slate-600 border-slate-200' 
                    : activeMarker.isActive 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {activeMarker.status}
                </span>
              </div>

              <div className="space-y-1.5 text-[11px] text-slate-600">
                <div className="flex items-center gap-1.5 font-medium">
                  <User size={13} className="text-slate-400 shrink-0" />
                  <span className="truncate">{activeMarker.jo.driver_name || 'Supir Tidak Diketahui'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock size={13} className="text-slate-400 shrink-0" />
                  <span className="text-slate-500">Ping Terakhir: <strong className="text-slate-800">{activeMarker.lastTimeStr}</strong></span>
                </div>
              </div>

              {activeMarker.jo.driver_phone && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center gap-2">
                  <a
                    href={`https://wa.me/${formatWA(activeMarker.jo.driver_phone)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold py-1.5 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-sm"
                  >
                    <MessageSquare size={13} /> WhatsApp
                  </a>
                  <a
                    href={`tel:${activeMarker.jo.driver_phone}`}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold p-1.5 rounded-lg flex items-center justify-center transition-all border border-slate-200"
                  >
                    <Phone size={13} />
                  </a>
                </div>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
