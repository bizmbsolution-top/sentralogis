'use client';

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { GoogleMap, Marker, InfoWindow, DirectionsRenderer } from '@react-google-maps/api';
import { useGoogleMaps } from '@/lib/google-maps-context';
import { Loader2, Truck, MapPin, Clock, Activity } from 'lucide-react';
// [AI] Import format to format timestamps correctly in the InfoWindow popups
import { format } from 'date-fns';

const containerStyle = {
  width: '100%',
  height: '100%',
  borderRadius: '0.75rem'
};

interface MissionMapProps {
  stops: any[];
  tracking: any[];
  fleetIcon?: string | any;
  focusedLocation?: {lat: number, lng: number, title: string} | null;
}

const getValidLatLng = (lat: any, lng: any) => {
  const numLat = Number(lat);
  const numLng = Number(lng);
  if (isNaN(numLat) || isNaN(numLng)) return null;
  if (numLat === 0 && numLng === 0) return null;
  return { lat: numLat, lng: numLng };
};

export default function MissionMap({ stops = [], tracking = [], fleetIcon, focusedLocation }: MissionMapProps) {
  const { isLoaded } = useGoogleMaps();

  const [selectedMarker, setSelectedMarker] = useState<any>(null);
  const [directionsResponse, setDirectionsResponse] = useState<google.maps.DirectionsResult | null>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  // DEBUG: Log data masuk
  console.log('📦 MissionMap Props:', {
    stopsCount: stops?.length || 0,
    trackingCount: tracking?.length || 0,
    trackingData: tracking
  });

  // Validasi tracking points
  const validTracking = useMemo(() => {
    if (!Array.isArray(tracking)) return [];
    const valid = tracking.filter(t => {
      const pos = getValidLatLng(t.latitude, t.longitude);
      return pos !== null;
    });
    console.log('✅ Valid tracking points:', valid.length);
    return valid;
  }, [tracking]);

  const sortedTracking = useMemo(() => {
    return [...validTracking].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    );
  }, [validTracking]);

  // Handle panning to focused location
  useEffect(() => {
    if (!map || !focusedLocation) return;
    
    map.setCenter({ lat: focusedLocation.lat, lng: focusedLocation.lng });
    map.setZoom(16);
    
    // Highlight marker (opsional: set selected marker)
    setSelectedMarker({
      latitude: focusedLocation.lat,
      longitude: focusedLocation.lng,
      status_update: focusedLocation.title,
      isTracking: true
    });
    
    // Reset focused location after 100ms
    setTimeout(() => {
      // Note: we can't easily call setFocusedLocation here as it's a prop
      // but we can at least stop the effect from re-running if nothing changes
    }, 100);
  }, [focusedLocation, map]);

  const latestTracking = useMemo(() => {
    if (sortedTracking.length === 0) return null;
    return sortedTracking[sortedTracking.length - 1];
  }, [sortedTracking]);

  console.log('🚚 Latest tracking:', latestTracking);
  console.log('📍 All tracking points:', sortedTracking.map(t => ({
    status: t.status_update,
    lat: t.latitude,
    lng: t.longitude,
    time: t.created_at
  })));

  const validStops = useMemo(() => {
    if (!Array.isArray(stops)) return [];
    return stops
      .filter(s => s.latitude && s.longitude)
      .map(s => ({ ...s, lat: Number(s.latitude), lng: Number(s.longitude) }))
      .filter(s => !isNaN(s.lat) && !isNaN(s.lng));
  }, [stops]);

  const center = useMemo(() => {
    if (latestTracking?.latitude) {
      const pos = getValidLatLng(latestTracking.latitude, latestTracking.longitude);
      if (pos) return pos;
    }
    if (validStops.length > 0) {
      return { lat: validStops[0].lat, lng: validStops[0].lng };
    }
    return { lat: -6.2088, lng: 106.8456 };
  }, [latestTracking, validStops]);

  // Directions API
  useEffect(() => {
    if (!isLoaded || validStops.length < 2) return;

    const directionsService = new google.maps.DirectionsService();
    const origin = { lat: validStops[0].lat, lng: validStops[0].lng };
    const destination = { lat: validStops[validStops.length - 1].lat, lng: validStops[validStops.length - 1].lng };
    const waypoints = validStops.slice(1, -1).map(s => ({
      location: { lat: s.lat, lng: s.lng },
      stopover: true
    }));

    directionsService.route(
      {
        origin,
        destination,
        waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK) {
          setDirectionsResponse(result);
        } else {
          console.error(`Directions request failed due to ${status}`);
        }
      }
    );
  }, [isLoaded, validStops]);

  // Auto-fit bounds
  useEffect(() => {
    if (!map) return;

    const bounds = new google.maps.LatLngBounds();
    let hasValidPoints = false;

    validStops.forEach(s => {
      bounds.extend({ lat: s.lat, lng: s.lng });
      hasValidPoints = true;
    });

    sortedTracking.forEach(t => {
      const pos = getValidLatLng(t.latitude, t.longitude);
      if (pos) {
        bounds.extend(pos);
        hasValidPoints = true;
      }
    });

    if (hasValidPoints) {
      map.fitBounds(bounds, 50);
    } else {
      map.setCenter(center);
      map.setZoom(12);
    }
  }, [map, validStops, sortedTracking, center]);

  const onLoad = useCallback((mapInstance: google.maps.Map) => {
    setMap(mapInstance);
  }, []);

  const onUnmount = useCallback(() => {
    setMap(null);
  }, []);

  if (!isLoaded) {
    return (
      <div className="h-full w-full rounded-xl bg-slate-50 flex flex-col items-center justify-center border border-slate-200">
        <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-2" />
        <p className="text-slate-400 text-xs">Loading map...</p>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full rounded-xl overflow-hidden shadow-sm border border-slate-200">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        onLoad={onLoad}
        onUnmount={onUnmount}
        options={{
          styles: [
            {
              featureType: 'all',
              elementType: 'labels.text.fill',
              stylers: [{ color: '#746855' }]
            }
          ],
          disableDefaultUI: false,
          zoomControl: true,
          mapTypeControl: true,
          scaleControl: true,
          streetViewControl: false,
          rotateControl: true,
          fullscreenControl: true
        }}
      >
        {/* Rute Jalan Real - DIAKTIFKAN KEMBALI DENGAN WARNA DINAMIS */}
        {directionsResponse && (
          <DirectionsRenderer
            directions={directionsResponse}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#ef4444', // Default merah untuk sisa rute
                strokeOpacity: 0.9,
                strokeWeight: 6,
              }
            }}
          />
        )}

        {/* Stop Markers (Work Order Items - ORIGINAL Locations) */}
        {validStops.map((stop, idx) => (
          <Marker
            key={stop.id || idx}
            position={{ lat: stop.lat, lng: stop.lng }}
            label={{
              text: (idx + 1).toString(),
              color: 'white',
              fontWeight: 'bold',
              fontSize: '12px'
            }}
            title={stop.location_name}
            icon={{
              url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
              scaledSize: new google.maps.Size(32, 32)
            }}
            onClick={() => setSelectedMarker({ ...stop, isStop: true, sequence: idx + 1 })}
          />
        ))}

        {/* DRIVER UPDATE FLAGS (Independent Indicators - Where the driver actually updated) */}
        {validStops.map((stop, idx) => {
          if (!stop.actual_update_lat || !stop.actual_update_lng) return null;
          const lat = Number(stop.actual_update_lat);
          const lng = Number(stop.actual_update_lng);
          if (isNaN(lat) || isNaN(lng)) return null;

          return (
            <Marker
              key={`driver-update-${stop.id || idx}`}
              position={{ lat, lng }}
              title={`Driver Update Location for Stop ${idx + 1}`}
              icon={{
                url: 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png', // Blue marker for actual update coordinates
                scaledSize: new google.maps.Size(28, 28)
              }}
              zIndex={500}
              onClick={() => setSelectedMarker({
                ...stop,
                lat,
                lng,
                isDriverUpdate: true,
                sequence: idx + 1
              })}
            />
          );
        })}

        {/* BREADCRUMB TRAIL - Titik-titik riwayat perjalanan */}
        {sortedTracking.slice(0, -1).map((track, idx) => {
          const pos = getValidLatLng(track.latitude, track.longitude);
          if (!pos) return null;

          return (
            <Marker
              key={`breadcrumb-${track.id || idx}`}
              position={pos}
              options={{
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 4,
                  fillColor: '#3b82f6',
                  fillOpacity: 0.6,
                  strokeWeight: 1,
                  strokeColor: '#ffffff'
                }
              }}
              zIndex={400}
            />
          );
        })}

        {/* LATEST GPS POSITION - ICON TRUK INDEPENDENT */}
        {latestTracking && (
          <Marker
            position={getValidLatLng(latestTracking.latitude, latestTracking.longitude)!}
            icon={typeof fleetIcon === 'object' && fleetIcon !== null ? fleetIcon : {
              url: fleetIcon || 'https://cdn-icons-png.flaticon.com/512/1048/1048312.png',
              scaledSize: new google.maps.Size(56, 56),
              origin: new google.maps.Point(0, 0),
              anchor: new google.maps.Point(28, 28)
            }}
            zIndex={2000}
            title={`LIVE: ${latestTracking.status_update || 'Active'}`}
            onClick={() => setSelectedMarker({ ...latestTracking, isTracking: true })}
          />
        )}

        {/* [AI] Interactive Details Popup for Markers */}
        {selectedMarker && (
          <InfoWindow
            position={
              selectedMarker.isStop 
                ? { lat: selectedMarker.lat, lng: selectedMarker.lng }
                : selectedMarker.isDriverUpdate
                ? { lat: selectedMarker.lat, lng: selectedMarker.lng }
                : selectedMarker.isTracking
                ? getValidLatLng(selectedMarker.latitude, selectedMarker.longitude)!
                : { lat: Number(selectedMarker.latitude), lng: Number(selectedMarker.longitude) }
            }
            onCloseClick={() => setSelectedMarker(null)}
          >
            <div className="p-2 text-slate-800 max-w-[240px]">
              {selectedMarker.isStop ? (
                <>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="bg-red-100 text-red-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                      Target Lokasi {selectedMarker.sequence}
                    </span>
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                      {selectedMarker.stop_type}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-indigo-950 leading-tight mb-1">{selectedMarker.location_name}</h4>
                  <p className="text-[10px] text-slate-500 leading-normal mb-1">{selectedMarker.address || '-'}</p>
                  <p className="text-[9px] font-bold text-sky-600 uppercase">
                    Status: {selectedMarker.status || 'Pending'}
                  </p>
                </>
              ) : selectedMarker.isDriverUpdate ? (
                <>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="bg-blue-100 text-blue-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                      Driver Update Flag
                    </span>
                    <span className="text-[10px] font-black text-indigo-500 uppercase">
                      Stop {selectedMarker.sequence}
                    </span>
                  </div>
                  <h4 className="text-xs font-black text-indigo-950 leading-tight mb-1">{selectedMarker.location_name}</h4>
                  <p className="text-[10px] text-slate-500 leading-normal mb-1">
                    Koordinat GPS asli saat Driver menekan tombol konfirmasi untuk lokasi ini.
                  </p>
                  {selectedMarker.actual_arrival && (
                    <p className="text-[9px] font-bold text-slate-700">
                      Tiba: {format(new Date(selectedMarker.actual_arrival), 'HH:mm:ss')}
                    </p>
                  )}
                  {selectedMarker.actual_departure && (
                    <p className="text-[9px] font-bold text-slate-700">
                      Selesai: {format(new Date(selectedMarker.actual_departure), 'HH:mm:ss')}
                    </p>
                  )}
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                      Live Position
                    </span>
                  </div>
                  <p className="text-xs font-black text-indigo-950 leading-tight mb-1">
                    Status: {selectedMarker.status_update || 'Active'}
                  </p>
                  {selectedMarker.created_at && (
                    <p className="text-[9px] font-bold text-slate-700">
                      Terakhir Ping: {format(new Date(selectedMarker.created_at), 'HH:mm:ss')}
                    </p>
                  )}
                </>
              )}
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

    </div>
  );
}
