// VehicleMarkerUtils.ts
// [AI] Mathematical Utilities for Bearing Angle Calculation & Top-Down Vehicle SVG Generation
// Supports GoCar-like dynamic rotation & scaled shapes for Trailers, Wingbox, CDD Box, Vans, and Motorcycles.

export interface LatLngPoint {
  lat: number;
  lng: number;
}

/**
 * Calculates the initial bearing (forward azimuth) from point 1 to point 2 in degrees (0 to 360).
 * 0/360 = North, 90 = East, 180 = South, 270 = West.
 */
export function calculateBearing(lat1: number, lng1: number, lat2: number, lng2: number): number {
  if (lat1 === lat2 && lng1 === lng2) return 0;

  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const toDeg = (rad: number) => (rad * 180) / Math.PI;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lng2 - lng1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x = Math.cos(phi1) * Math.sin(phi2) - Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);
  let theta = Math.atan2(y, x);
  let bearing = (toDeg(theta) + 360) % 360;

  return Math.round(bearing);
}

/**
 * Given a chronological or reverse-chronological array of tracking history points,
 * calculates the current travel bearing angle of the vehicle.
 */
export function calculateBearingFromHistory(trackingList: any[], defaultLat?: number, defaultLng?: number): number {
  if (!trackingList || trackingList.length < 2) return 0;

  // Filter only points with valid coordinates
  const valid = trackingList.filter(
    (t: any) => t.latitude && t.longitude && Number(t.latitude) !== 0 && !isNaN(Number(t.latitude))
  );

  if (valid.length < 2) return 0;

  // Ensure chronological order (oldest -> newest) to compute heading from (last - 1) to (last)
  const sorted = [...valid].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const pPrev = sorted[sorted.length - 2];
  const pLast = sorted[sorted.length - 1];

  const lat1 = Number(pPrev.latitude);
  const lng1 = Number(pPrev.longitude);
  const lat2 = Number(pLast.latitude);
  const lng2 = Number(pLast.longitude);

  return calculateBearing(lat1, lng1, lat2, lng2);
}

/**
 * Generates a rotated, top-down SVG vehicle silhouette Data URI and Google Maps dimensions
 * tailored specifically to the fleet type (Trailer vs Wingbox vs CDD vs Motor vs Van).
 */
export function getVehicleTopDownMarkerIcon(
  fleetTypeName: string = 'STANDARD',
  bearing: number = 0,
  statusColor: string = '#2563eb' // Default blue
): { url: string; scaledSize: any; anchor: any } {
  const name = (fleetTypeName || '').toLowerCase();
  
  let svgContent = '';
  let width = 24;
  let height = 44;

  // Determine color theme by status/SBU if not explicitly passed
  let primaryColor = statusColor;
  let cabinColor = '#1e293b'; // Dark slate cabin
  let accentColor = '#38bdf8'; // Glowing cyan window/headlights

  if (name.includes('trailer') || name.includes('container') || name.includes('40ft') || name.includes('20ft') || name.includes('gandeng')) {
    // 🚚 LONG TRAILER CONTAINER (Top-down tractor cabin + long ribbed container box)
    width = 26;
    height = 64;
    svgContent = `
      <g transform="rotate(${bearing}, ${width / 2}, ${height / 2})">
        <!-- Shadow -->
        <rect x="3" y="2" width="20" height="60" rx="3" fill="rgba(0,0,0,0.35)" />
        
        <!-- Long Container Cargo Box (Rear) -->
        <rect x="3" y="18" width="20" height="44" rx="2" fill="${primaryColor}" stroke="#ffffff" stroke-width="1.5" />
        <!-- Ribbed Container Lines -->
        <line x1="5" y1="24" x2="21" y2="24" stroke="rgba(255,255,255,0.35)" stroke-width="1" />
        <line x1="5" y1="32" x2="21" y2="32" stroke="rgba(255,255,255,0.35)" stroke-width="1" />
        <line x1="5" y1="40" x2="21" y2="40" stroke="rgba(255,255,255,0.35)" stroke-width="1" />
        <line x1="5" y1="48" x2="21" y2="48" stroke="rgba(255,255,255,0.35)" stroke-width="1" />
        <line x1="5" y1="56" x2="21" y2="56" stroke="rgba(255,255,255,0.35)" stroke-width="1" />
        
        <!-- Kingpin Pivot Connector -->
        <rect x="10" y="15" width="6" height="4" fill="#64748b" />

        <!-- Front Tractor Cabin -->
        <rect x="4" y="2" width="18" height="14" rx="3" fill="${cabinColor}" stroke="#38bdf8" stroke-width="1" />
        <!-- Windshield Window -->
        <path d="M 6 5 L 20 5 L 18 9 L 8 9 Z" fill="${accentColor}" opacity="0.9" />
        <!-- Headlights -->
        <circle cx="6" cy="3" r="1.5" fill="#facc15" />
        <circle cx="20" cy="3" r="1.5" fill="#facc15" />
      </g>
    `;
  } else if (name.includes('wingbox') || name.includes('tronton') || name.includes('wbox') || name.includes('fuso')) {
    // 🚛 HEAVY WINGBOX / TRONTON (Wide body with wing opening split lines)
    width = 26;
    height = 54;
    svgContent = `
      <g transform="rotate(${bearing}, ${width / 2}, ${height / 2})">
        <!-- Shadow -->
        <rect x="3" y="2" width="20" height="50" rx="3" fill="rgba(0,0,0,0.35)" />
        
        <!-- Wide Wingbox Cargo Body -->
        <rect x="3" y="15" width="20" height="37" rx="2" fill="${primaryColor}" stroke="#ffffff" stroke-width="1.5" />
        <!-- Center Roof Split Line for Wingbox -->
        <line x1="13" y1="16" x2="13" y2="51" stroke="rgba(255,255,255,0.6)" stroke-width="1.5" stroke-dasharray="3,2" />
        
        <!-- Front Heavy Cabin -->
        <rect x="4" y="2" width="18" height="13" rx="3" fill="${cabinColor}" stroke="#38bdf8" stroke-width="1" />
        <!-- Windshield -->
        <rect x="6" y="4" width="14" height="4" rx="1" fill="${accentColor}" opacity="0.9" />
        <!-- Headlights -->
        <circle cx="6" cy="3" r="1.5" fill="#facc15" />
        <circle cx="20" cy="3" r="1.5" fill="#facc15" />
      </g>
    `;
  } else if (name.includes('motor') || name.includes('kurir') || name.includes('express') || name.includes('bike')) {
    // 🏍️ MOTORCYCLE EXPRESS (Compact rider top-down + delivery box)
    width = 20;
    height = 30;
    svgContent = `
      <g transform="rotate(${bearing}, ${width / 2}, ${height / 2})">
        <!-- Shadow -->
        <ellipse cx="10" cy="15" rx="7" ry="12" fill="rgba(0,0,0,0.35)" />
        
        <!-- Front Wheel / Handlebars -->
        <rect x="8" y="2" width="4" height="6" rx="2" fill="#0f172a" />
        <line x1="4" y1="7" x2="16" y2="7" stroke="#64748b" stroke-width="2" stroke-linecap="round" />
        <!-- Headlight -->
        <circle cx="10" cy="3" r="1.5" fill="#facc15" />

        <!-- Rider Helmet (Circle) -->
        <circle cx="10" cy="12" r="4.5" fill="${cabinColor}" stroke="#ffffff" stroke-width="1.5" />
        <path d="M 7 11 A 3 3 0 0 1 13 11" stroke="${accentColor}" stroke-width="1.5" fill="none" />

        <!-- Delivery Express Box (Rear) -->
        <rect x="6" y="18" width="8" height="9" rx="1.5" fill="#9333ea" stroke="#ffffff" stroke-width="1" />
      </g>
    `;
  } else if (name.includes('van') || name.includes('blind') || name.includes('pickup') || name.includes('granmax') || name.includes('l300')) {
    // 🚐 BLIND VAN / PICKUP (Aerodynamic rounded top-down body)
    width = 22;
    height = 40;
    svgContent = `
      <g transform="rotate(${bearing}, ${width / 2}, ${height / 2})">
        <!-- Shadow -->
        <rect x="3" y="2" width="16" height="36" rx="5" fill="rgba(0,0,0,0.35)" />
        
        <!-- Van Body -->
        <rect x="3" y="2" width="16" height="36" rx="5" fill="${primaryColor}" stroke="#ffffff" stroke-width="1.5" />
        <!-- Curved Windshield -->
        <path d="M 5 8 Q 11 6 17 8 L 16 13 L 6 13 Z" fill="${cabinColor}" />
        <path d="M 6 9 Q 11 7.5 16 9 L 15 12 L 7 12 Z" fill="${accentColor}" opacity="0.9" />
        <!-- Headlights -->
        <circle cx="5.5" cy="4" r="1.5" fill="#facc15" />
        <circle cx="16.5" cy="4" r="1.5" fill="#facc15" />
      </g>
    `;
  } else {
    // 🚚 STANDARD CDD BOX / CDE (Standard medium box truck)
    width = 24;
    height = 46;
    svgContent = `
      <g transform="rotate(${bearing}, ${width / 2}, ${height / 2})">
        <!-- Shadow -->
        <rect x="3" y="2" width="18" height="42" rx="3" fill="rgba(0,0,0,0.35)" />
        
        <!-- Cargo Box (Rear) -->
        <rect x="3" y="14" width="18" height="30" rx="2" fill="${primaryColor}" stroke="#ffffff" stroke-width="1.5" />
        <rect x="6" y="17" width="12" height="24" rx="1" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" stroke-width="0.5" />
        
        <!-- Front Cabin -->
        <rect x="4" y="2" width="16" height="12" rx="3" fill="${cabinColor}" stroke="#38bdf8" stroke-width="1" />
        <!-- Windshield -->
        <path d="M 6 4 L 18 4 L 17 8 L 7 8 Z" fill="${accentColor}" opacity="0.9" />
        <!-- Headlights -->
        <circle cx="6" cy="3" r="1.5" fill="#facc15" />
        <circle cx="18" cy="3" r="1.5" fill="#facc15" />
      </g>
    `;
  }

  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">${svgContent}</svg>`;
  const dataUri = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(fullSvg)}`;

  return {
    url: dataUri,
    scaledSize: typeof window !== 'undefined' && (window as any).google?.maps?.Size 
      ? new (window as any).google.maps.Size(width * 1.3, height * 1.3)
      : undefined,
    anchor: typeof window !== 'undefined' && (window as any).google?.maps?.Point
      ? new (window as any).google.maps.Point((width * 1.3) / 2, (height * 1.3) / 2)
      : undefined,
  };
}
