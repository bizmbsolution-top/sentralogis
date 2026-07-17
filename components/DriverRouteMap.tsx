// components/DriverRouteMap.tsx
'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix marker icons
if (typeof window !== 'undefined') {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  });
}

interface MapProps {
  pickup: string;
  delivery: string;
}

export default function DriverRouteMap({ pickup, delivery }: MapProps) {
  const [route, setRoute] = useState<{
    pickup: [number, number];
    delivery: [number, number];
    path: [number, number][];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Default center (Jakarta)
  const defaultCenter: [number, number] = [-6.2, 106.816666];

  useEffect(() => {
    let isMounted = true;
    const fetchRoadRoute = async () => {
      try {
        setLoading(true);
        const pickupCoords: [number, number] = [-6.200000, 106.816666];
        const deliveryCoords: [number, number] = [-6.300000, 106.850000];

        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${pickupCoords[1]},${pickupCoords[0]};${deliveryCoords[1]},${deliveryCoords[0]}?overview=full&geometries=geojson`
        );
        const data = await response.json();

        let path: [number, number][] = [pickupCoords, deliveryCoords];
        if (data && data.routes && data.routes[0] && data.routes[0].geometry && data.routes[0].geometry.coordinates) {
          path = data.routes[0].geometry.coordinates.map((coord: [number, number]) => [coord[1], coord[0]]);
        }

        if (isMounted) {
          setRoute({
            pickup: pickupCoords,
            delivery: deliveryCoords,
            path
          });
          setLoading(false);
        }
      } catch (e) {
        if (isMounted) {
          setRoute({
            pickup: [-6.200000, 106.816666],
            delivery: [-6.300000, 106.850000],
            path: [[-6.200000, 106.816666], [-6.300000, 106.850000]]
          });
          setLoading(false);
        }
      }
    };

    fetchRoadRoute();
    return () => { isMounted = false; };
  }, [pickup, delivery]);

  if (loading) {
    return <div className="h-full flex items-center justify-center bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-widest">Memuat peta...</div>;
  }

  if (!route) return null;

  return (
    <MapContainer center={route.pickup || defaultCenter} zoom={12} className="h-full w-full z-0">
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <Marker position={route.pickup}>
        <Popup>📍 Pickup: {pickup}</Popup>
      </Marker>
      <Marker position={route.delivery}>
        <Popup>📍 Delivery: {delivery}</Popup>
      </Marker>
      <Polyline positions={route.path} color="#3B82F6" weight={4} />
    </MapContainer>
  );
}
