'use client';

import React, { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { GoogleMap, Marker, InfoWindow, Polyline } from '@react-google-maps/api';
import { useGoogleMaps } from '@/lib/google-maps-context';
import { Loader2 } from 'lucide-react';

const containerStyle = {
  width: '100%',
  height: '100%',
};

interface IntelligenceMapProps {
  missions: any[];
  onSelectMission?: (mission: any) => void;
  selectedMissionId?: string | null;
  focusedLocation?: { lat: number, lng: number, title: string } | null;
}

const getValidLatLng = (lat: any, lng: any) => {
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (isNaN(numLat) || isNaN(numLng)) return null;
  if (numLat === 0 && numLng === 0) return null;
  return { lat: numLat, lng: numLng };
};

// Decode Google polyline string to array of lat/lng
function decodePolyline(encoded: string): google.maps.LatLngLiteral[] {
  const points: google.maps.LatLngLiteral[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  
  while (index < encoded.length) {
    let b;
    let shift = 0;
    let result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = (result & 1) ? ~(result >> 1) : (result >> 1);
    lat += dlat;
    
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = (result & 1) ? ~(result >> 1) : (result >> 1);
    lng += dlng;
    
    points.push({ lat: lat / 1e5, lng: lng / 1e5 });
  }
  
  return points;
}

// Filter routes to remove duplicate/consecutive coordinates that break Directions API
function getCleanRoutePoints(routes: any[]): any[] {
  if (!routes || routes.length === 0) return [];
  
  // 1. Filter valid coordinates
  const valid = routes
    .filter((r: any) => r.latitude && r.longitude)
    .sort((a: any, b: any) => (a.sequence || 0) - (b.sequence || 0));
    
  if (valid.length < 2) return [];

  // 2. Remove consecutive duplicates (points too close to each other)
  const distinct: any[] = [valid[0]];
  for (let i = 1; i < valid.length; i++) {
    const prev = distinct[distinct.length - 1];
    const curr = valid[i];
    
    // Calculate simple difference (approx 0.0001 deg is ~10 meters)
    const diffLat = Math.abs(Number(curr.latitude) - Number(prev.latitude));
    const diffLng = Math.abs(Number(curr.longitude) - Number(prev.longitude));
    
    // Only add if significantly different from previous point
    if (diffLat > 0.0005 || diffLng > 0.0005) {
      distinct.push(curr);
    }
  }
  
  return distinct;
}

export default function IntelligenceMap({ missions = [], onSelectMission, selectedMissionId, focusedLocation }: IntelligenceMapProps) {
  const { isLoaded } = useGoogleMaps();
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [activeInfoWindowId, setActiveInfoWindowId] = useState<string | null>(null);
  const [routePath, setRoutePath] = useState<google.maps.LatLngLiteral[]>([]);
  const directionsServiceRef = useRef<google.maps.DirectionsService | null>(null);

  // Calculate markers for all missions
  const markers = useMemo(() => {
    return missions.map(m => {
        // Get latest tracking for the truck position
        const latestTrack = m.tracking_history?.[0];
        const pos = latestTrack ? getValidLatLng(latestTrack.latitude, latestTrack.longitude) : null;
        
        // Fallback: use origin location from item_data if no tracking yet
        let fallbackPos = null;
        if (!pos && m.wo_item?.item_data) {
          const originLat = m.wo_item.item_data.origin_lat;
          const originLng = m.wo_item.item_data.origin_lng;
          if (originLat && originLng) {
            fallbackPos = getValidLatLng(originLat, originLng);
          }
        }
        
        return {
            ...m,
            position: pos || fallbackPos,
            latestUpdate: latestTrack?.status_update || m.status
        };
    }).filter(m => m.position !== null);
  }, [missions]);

  // Center map based on markers
  useEffect(() => {
    if (!map || markers.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    markers.forEach(m => {
        if (m.position) bounds.extend(m.position);
    });

    if (markers.length > 1) {
        map.fitBounds(bounds, 80);
    } else if (markers.length === 1 && markers[0].position) {
        map.setCenter(markers[0].position);
        map.setZoom(14);
    }
  }, [map, markers]);

  // If a mission is selected from the sidebar, center on it
  useEffect(() => {
      if (!map || !selectedMissionId) return;
      const selected = markers.find(m => m.id === selectedMissionId);
      if (selected?.position) {
          map.panTo(selected.position);
          map.setZoom(15);
      }
  }, [selectedMissionId, map, markers]);

  // Focus on a specific location (e.g., from route card click)
  useEffect(() => {
      if (!map || !focusedLocation) return;
      map.panTo({ lat: focusedLocation.lat, lng: focusedLocation.lng });
      map.setZoom(16);
  }, [focusedLocation, map]);

  // Fetch road-following route for selected mission
  useEffect(() => {
    if (!selectedMissionId || !isLoaded) {
      setRoutePath([]);
      return;
    }

    const selected = missions.find(m => m.id === selectedMissionId);
    if (!selected?.routes) {
      setRoutePath([]);
      return;
    }

    const validRoutes = getCleanRoutePoints(selected.routes);

    if (validRoutes.length < 2) {
      setRoutePath([]);
      return;
    }

    console.log(`[Directions] Starting route fetch for ${validRoutes.length} stops`);

    // Initialize DirectionsService
    if (!directionsServiceRef.current) {
      try {
        directionsServiceRef.current = new google.maps.DirectionsService();
        console.log('[Directions] DirectionsService initialized');
      } catch (err) {
        console.error('[Directions] Failed to initialize DirectionsService:', err);
        // Fallback to straight line
        const fallbackPath = validRoutes.map((r: any) => ({ lat: r.latitude, lng: r.longitude }));
        setRoutePath(fallbackPath);
        return;
      }
    }

    // Chain directions from stop to stop
    const fetchDirections = async () => {
      const allPaths: google.maps.LatLngLiteral[] = [];
      let hasError = false;
      
      for (let i = 0; i < validRoutes.length - 1; i++) {
        const origin = { lat: validRoutes[i].latitude, lng: validRoutes[i].longitude };
        const destination = { lat: validRoutes[i + 1].latitude, lng: validRoutes[i + 1].longitude };
        
        console.log(`[Directions] Fetching leg ${i + 1}/${validRoutes.length - 1}: ${origin.lat.toFixed(4)},${origin.lng.toFixed(4)} → ${destination.lat.toFixed(4)},${destination.lng.toFixed(4)}`);
        
        try {
          const result = await directionsServiceRef.current!.route({
            origin,
            destination,
            travelMode: google.maps.TravelMode.DRIVING,
            provideRouteAlternatives: false,
          });
          
          console.log(`[Directions] Leg ${i + 1} response status:`, result.status);
          
          if (result.status === google.maps.DirectionsStatus.OK && result.routes && result.routes.length > 0) {
            const route = result.routes[0];
            const polyline = route.overview_polyline;
            if (polyline && typeof polyline.encoded === 'string' && polyline.encoded.length > 0) {
              const decoded = decodePolyline(polyline.encoded);
              console.log(`[Directions] Leg ${i + 1} decoded ${decoded.length} points`);
              allPaths.push(...decoded);
            } else {
              console.warn(`[Directions] Leg ${i + 1} no polyline data, using fallback`);
              allPaths.push(origin, destination);
            }
          } else {
            console.error(`[Directions] Leg ${i + 1} failed with status:`, result.status);
            console.error('[Directions] Check if Directions API is enabled at: https://console.cloud.google.com/apis/library/directions-backend.googleapis.com');
            allPaths.push(origin, destination);
            hasError = true;
          }
        } catch (err: any) {
          console.error(`[Directions] Leg ${i + 1} error:`, err.message || err);
          console.error('[Directions] Possible causes: 1) Directions API not enabled, 2) API key restricted, 3) Billing not set up');
          allPaths.push(origin, destination);
          hasError = true;
        }
      }
      
      console.log(`[Directions] Total path points: ${allPaths.length}${hasError ? ' (some legs failed, using fallback)' : ''}`);
      setRoutePath(allPaths);
    };

    fetchDirections();
  }, [selectedMissionId, missions, isLoaded]);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  if (!isLoaded) {
    return (
      <div className="h-full w-full bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-slate-400 text-xs font-medium">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-white overflow-hidden">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={{ lat: -6.2088, lng: 106.8456 }}
        zoom={12}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          styles: [],
          disableDefaultUI: true,
          zoomControl: true,
          mapTypeControl: false,
          scaleControl: true,
          streetViewControl: false,
          rotateControl: true,
          fullscreenControl: false
        }}
      >
        {markers.map((m) => (
          <Marker
            key={m.id}
            position={m.position!}
            icon={{
              url: m.category === 'active' 
                ? (m.icon_url || 'https://cdn-icons-png.flaticon.com/512/7124/7124479.png')
                : 'https://cdn-icons-png.flaticon.com/512/2359/2359364.png',
              scaledSize: new google.maps.Size(m.category === 'active' ? 40 : 32, m.category === 'active' ? 40 : 32),
              anchor: new google.maps.Point(m.category === 'active' ? 20 : 16, m.category === 'active' ? 20 : 16)
            }}
            zIndex={m.id === selectedMissionId ? 1000 : 500}
            onClick={() => {
              setActiveInfoWindowId(m.id);
              onSelectMission?.(m);
            }}
          />
        ))}

        {/* Route line and stop markers for selected mission */}
        {selectedMissionId && (() => {
          const selected = missions.find(m => m.id === selectedMissionId);
          if (!selected?.routes) return null;
          
          const validRoutes = getCleanRoutePoints(selected.routes);
          
          return (
            <>
              {/* Road-following route line from Directions API */}
              {routePath.length > 1 && (
                <Polyline
                  key={`route-line-${selectedMissionId}`}
                  path={routePath}
                  options={{
                    strokeColor: '#2563EB',
                    strokeOpacity: 0.8,
                    strokeWeight: 5,
                  }}
                />
              )}
              
              {/* Route stop markers */}
              {validRoutes.map((r: any, idx: number) => (
                <Marker
                  key={`route-${r.id}`}
                  position={{ lat: r.latitude, lng: r.longitude }}
                  icon={{
                    url: r.status === 'completed' 
                      ? 'https://cdn-icons-png.flaticon.com/512/190/190411.png'
                      : 'https://cdn-icons-png.flaticon.com/512/684/684908.png',
                    scaledSize: new google.maps.Size(24, 24),
                    anchor: new google.maps.Point(12, 12)
                  }}
                  zIndex={400}
                />
              ))}
            </>
          );
        })()}

        {activeInfoWindowId && markers.find(m => m.id === activeInfoWindowId) && (
            <InfoWindow
                position={markers.find(m => m.id === activeInfoWindowId)?.position!}
                onCloseClick={() => setActiveInfoWindowId(null)}
            >
                <div className="p-3 min-w-[220px]">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                      {markers.find(m => m.id === activeInfoWindowId)?.category === 'active' ? 'Active Shipment' : 'Assigned Shipment'}
                    </p>
                    <p className="text-sm font-bold text-slate-900 mb-2">
                        {markers.find(m => m.id === activeInfoWindowId)?.fleets?.plate_number || '-'}
                    </p>
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">Status</span>
                          <span className="font-medium text-slate-900">{markers.find(m => m.id === activeInfoWindowId)?.status}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                          <span className="text-slate-500">Driver</span>
                          <span className="font-medium text-slate-900">{markers.find(m => m.id === activeInfoWindowId)?.drivers?.name || '-'}</span>
                      </div>
                    </div>
                </div>
            </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
