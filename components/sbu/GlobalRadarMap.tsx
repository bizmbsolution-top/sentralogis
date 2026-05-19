'use client';

import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { GoogleMap, Marker, InfoWindow } from '@react-google-maps/api';
import { useGoogleMaps } from '@/lib/google-maps-context';
import { Loader2, Truck, User, MapPin, Navigation, Clock, Activity, ExternalLink, Phone } from 'lucide-react';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/Badge';

const containerStyle = {
  width: '100%',
  height: '100%'
};

const mapOptions = {
  styles: [
    { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
    { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
    {
      featureType: 'administrative.locality',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#d59563' }]
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#d59563' }]
    },
    {
      featureType: 'poi.park',
      elementType: 'geometry',
      stylers: [{ color: '#263c3f' }]
    },
    {
      featureType: 'poi.park',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#6b9a76' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#38414e' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#212a37' }]
    },
    {
      featureType: 'road',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#9ca5b3' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry',
      stylers: [{ color: '#746855' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'geometry.stroke',
      stylers: [{ color: '#1f2835' }]
    },
    {
      featureType: 'road.highway',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#f3d19c' }]
    },
    {
      featureType: 'transit',
      elementType: 'geometry',
      stylers: [{ color: '#2f3948' }]
    },
    {
      featureType: 'transit.station',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#d59563' }]
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#17263c' }]
    },
    {
      featureType: 'water',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#515c6d' }]
    },
    {
      featureType: 'water',
      elementType: 'labels.text.stroke',
      stylers: [{ color: '#17263c' }]
    }
  ],
  disableDefaultUI: false,
  zoomControl: true,
  mapTypeControl: false,
  scaleControl: true,
  streetViewControl: false,
  rotateControl: true,
  fullscreenControl: true
};

interface GlobalRadarMapProps {
  missions: any[];
}

export default function GlobalRadarMap({ missions }: GlobalRadarMapProps) {
  const { isLoaded } = useGoogleMaps();
  const [selectedMission, setSelectedMission] = useState<any>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);

  const center = useMemo(() => {
    if (missions.length > 0 && missions[0].latitude) {
      return { lat: missions[0].latitude, lng: missions[0].longitude };
    }
    return { lat: -6.2088, lng: 106.8456 }; // Jakarta
  }, [missions]);

  // Auto-fit bounds when missions change
  useEffect(() => {
    if (!map || missions.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    let hasValidPoints = false;

    missions.forEach(m => {
      if (m.latitude && m.longitude) {
        bounds.extend({ lat: Number(m.latitude), lng: Number(m.longitude) });
        hasValidPoints = true;
      }
    });

    if (hasValidPoints) {
      map.fitBounds(bounds, 100);
      // Don't zoom in too much if only one mission
      if (missions.length === 1) {
        map.setZoom(14);
      }
    }
  }, [map, missions]);

  if (!isLoaded) {
    return (
      <div className="h-full w-full bg-[#0a2d3d] flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-500 font-black text-[10px] uppercase tracking-widest">Loading Satellite Matrix...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full relative">
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center}
        zoom={12}
        onLoad={setMap}
        options={mapOptions}
      >
        {missions.map((mission) => {
          if (!mission.latitude || !mission.longitude) return null;
          
          return (
            <Marker
              key={mission.id}
              position={{ lat: Number(mission.latitude), lng: Number(mission.longitude) }}
              icon={{
                url: mission.fleet_icon || 'https://cdn-icons-png.flaticon.com/512/1048/1048312.png',
                scaledSize: new google.maps.Size(48, 48),
                anchor: new google.maps.Point(24, 24)
              }}
              onClick={() => setSelectedMission(mission)}
              title={mission.jo_number}
            />
          );
        })}

        {selectedMission && (
          <InfoWindow
            position={{ lat: Number(selectedMission.latitude), lng: Number(selectedMission.longitude) }}
            onCloseClick={() => setSelectedMission(null)}
          >
            <div className="p-2 min-w-[240px] text-slate-900">
               <div className="flex items-center justify-between mb-3 border-b pb-2">
                  <Badge className="bg-blue-100 text-blue-600 border-none text-[8px] font-black tracking-widest">{selectedMission.status}</Badge>
                  <span className="text-[9px] font-bold text-slate-400">{format(new Date(selectedMission.updated_at || new Date()), 'HH:mm')}</span>
               </div>
               
               <h3 className="font-black text-xs uppercase tracking-tight mb-1">{selectedMission.plate_number}</h3>
               <p className="text-[10px] font-bold text-slate-500 mb-3">{selectedMission.jo_number}</p>
               
               <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2">
                     <User size={12} className="text-slate-400" />
                     <span className="text-[10px] font-bold">{selectedMission.driver_name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                     <MapPin size={12} className="text-slate-400" />
                     <span className="text-[10px] font-bold truncate">{selectedMission.customer_name}</span>
                  </div>
               </div>

               <div className="flex gap-2">
                  <button 
                    onClick={() => window.open(`/sbu/trucking/tracking?q=${selectedMission.jo_number}`, '_blank')}
                    className="flex-1 bg-slate-900 text-white py-2 rounded-lg text-[8px] font-black uppercase tracking-widest flex items-center justify-center gap-2"
                  >
                    <Activity size={10} /> Full Radar
                  </button>
                  <button 
                    onClick={() => {
                      const phone = selectedMission.driver_phone?.replace(/\D/g, '');
                      if (phone) window.open(`https://wa.me/${phone.startsWith('0') ? '62'+phone.substring(1) : phone}`, '_blank');
                    }}
                    className="w-10 h-10 bg-emerald-500 text-white rounded-lg flex items-center justify-center"
                  >
                    <Phone size={14} />
                  </button>
               </div>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Floating Legend/Summary Overlay */}
      <div className="absolute bottom-10 left-10 z-10 bg-[#0a2d3d]/80 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 shadow-2xl min-w-[280px]">
         <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center">
               <Navigation size={24} className="text-blue-500 animate-pulse" />
            </div>
            <div>
               <h2 className="text-xs font-black text-white uppercase tracking-[0.2em]">Live Radar</h2>
               <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Fleet Operations Network</p>
            </div>
         </div>

         <div className="space-y-4">
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
               <span className="text-[9px] font-bold text-slate-400 uppercase">Active Missions</span>
               <span className="text-sm font-black text-blue-500">{missions.length}</span>
            </div>
            <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl">
               <span className="text-[9px] font-bold text-slate-400 uppercase">On Journey</span>
               <span className="text-sm font-black text-emerald-500">{missions.filter(m => m.status === 'DALAM PERJALANAN' || m.status === 'ON_ROAD' || m.status === 'ORDER DITERIMA').length}</span>
            </div>
         </div>
      </div>
    </div>
  );
}
