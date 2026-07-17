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
  
  const canvasSize = 84;
  const cx = 42;
  const cy = 42;
  let svgContent = '';

  // Determine color theme by status/SBU if not explicitly passed
  let primaryColor = statusColor;
  let cabinColor = '#1e293b'; // Dark slate cabin
  let accentColor = '#38bdf8'; // Glowing cyan window/headlights

  if (name.includes('trailer') || name.includes('container') || name.includes('40ft') || name.includes('20ft') || name.includes('gandeng')) {
    // 🚚 LONG TRAILER CONTAINER (Top-down tractor cabin + long ribbed container box)
    // Box dimensions: 26 width x 60 height centered at (42, 42) -> left=29, top=12
    svgContent = `
      <g transform="rotate(${bearing}, ${cx}, ${cy})">
        <!-- Shadow -->
        <rect x="29" y="14" width="26" height="60" rx="4" fill="rgba(0,0,0,0.38)" />
        
        <!-- Long Container Cargo Box (Rear) -->
        <rect x="29" y="27" width="26" height="45" rx="3" fill="${primaryColor}" stroke="#ffffff" stroke-width="1.8" />
        <!-- Ribbed Container Lines -->
        <line x1="31" y1="34" x2="53" y2="34" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" />
        <line x1="31" y1="42" x2="53" y2="42" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" />
        <line x1="31" y1="50" x2="53" y2="50" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" />
        <line x1="31" y1="58" x2="53" y2="58" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" />
        <line x1="31" y1="66" x2="53" y2="66" stroke="rgba(255,255,255,0.4)" stroke-width="1.2" />
        
        <!-- Kingpin Pivot Connector -->
        <rect x="39" y="23" width="6" height="5" fill="#64748b" />

        <!-- Front Tractor Cabin -->
        <rect x="30" y="11" width="24" height="14" rx="3.5" fill="${cabinColor}" stroke="#38bdf8" stroke-width="1.5" />
        <!-- Windshield Window -->
        <path d="M 33 14 L 51 14 L 48 18 L 36 18 Z" fill="${accentColor}" opacity="0.95" />
        <!-- Headlights -->
        <circle cx="33" cy="12" r="2" fill="#facc15" />
        <circle cx="51" cy="12" r="2" fill="#facc15" />
      </g>
    `;
  } else if (name.includes('wingbox') || name.includes('tronton') || name.includes('wbox') || name.includes('fuso')) {
    // 🚛 HEAVY WINGBOX / TRONTON (Wide body with wing opening split lines)
    // Box dimensions: 28 width x 52 height centered at (42, 42) -> left=28, top=16
    svgContent = `
      <g transform="rotate(${bearing}, ${cx}, ${cy})">
        <!-- Shadow -->
        <rect x="28" y="18" width="28" height="52" rx="4" fill="rgba(0,0,0,0.38)" />
        
        <!-- Wide Wingbox Cargo Body -->
        <rect x="28" y="29" width="28" height="39" rx="3" fill="${primaryColor}" stroke="#ffffff" stroke-width="1.8" />
        <!-- Center Roof Split Line for Wingbox -->
        <line x1="42" y1="30" x2="42" y2="67" stroke="rgba(255,255,255,0.65)" stroke-width="1.8" stroke-dasharray="4,3" />
        
        <!-- Front Heavy Cabin -->
        <rect x="30" y="15" width="24" height="15" rx="3.5" fill="${cabinColor}" stroke="#38bdf8" stroke-width="1.5" />
        <!-- Windshield -->
        <rect x="33" y="18" width="18" height="5" rx="1.5" fill="${accentColor}" opacity="0.95" />
        <!-- Headlights -->
        <circle cx="33" cy="16.5" r="2" fill="#facc15" />
        <circle cx="51" cy="16.5" r="2" fill="#facc15" />
      </g>
    `;
  } else if (name.includes('motor') || name.includes('kurir') || name.includes('express') || name.includes('bike')) {
    // 🏍️ MOTORCYCLE EXPRESS (Compact rider top-down + delivery box)
    // Box dimensions: 20 width x 32 height centered at (42, 42) -> left=32, top=26
    svgContent = `
      <g transform="rotate(${bearing}, ${cx}, ${cy})">
        <!-- Shadow -->
        <ellipse cx="42" cy="43" rx="9" ry="15" fill="rgba(0,0,0,0.38)" />
        
        <!-- Front Wheel / Handlebars -->
        <rect x="40" y="26" width="4" height="8" rx="2" fill="#0f172a" />
        <line x1="33" y1="32" x2="51" y2="32" stroke="#64748b" stroke-width="2.5" stroke-linecap="round" />
        <!-- Headlight -->
        <circle cx="42" cy="27" r="2" fill="#facc15" />

        <!-- Rider Helmet (Circle) -->
        <circle cx="42" cy="38" r="5.5" fill="${cabinColor}" stroke="#ffffff" stroke-width="1.8" />
        <path d="M 38 37 A 4 4 0 0 1 46 37" stroke="${accentColor}" stroke-width="1.8" fill="none" />

        <!-- Delivery Express Box (Rear) -->
        <rect x="36" y="46" width="12" height="12" rx="2" fill="#9333ea" stroke="#ffffff" stroke-width="1.5" />
      </g>
    `;
  } else if (name.includes('van') || name.includes('blind') || name.includes('pickup') || name.includes('granmax') || name.includes('l300')) {
    // 🚐 BLIND VAN / PICKUP (Aerodynamic rounded top-down body)
    // Box dimensions: 24 width x 44 height centered at (42, 42) -> left=30, top=20
    svgContent = `
      <g transform="rotate(${bearing}, ${cx}, ${cy})">
        <!-- Shadow -->
        <rect x="30" y="22" width="24" height="44" rx="6" fill="rgba(0,0,0,0.38)" />
        
        <!-- Van Body -->
        <rect x="30" y="20" width="24" height="44" rx="6" fill="${primaryColor}" stroke="#ffffff" stroke-width="1.8" />
        <!-- Curved Windshield -->
        <path d="M 33 27 Q 42 24 51 27 L 49 33 L 35 33 Z" fill="${cabinColor}" />
        <path d="M 34 28 Q 42 26 50 28 L 48 32 L 36 32 Z" fill="${accentColor}" opacity="0.95" />
        <!-- Headlights -->
        <circle cx="33.5" cy="22" r="2" fill="#facc15" />
        <circle cx="50.5" cy="22" r="2" fill="#facc15" />
      </g>
    `;
  } else {
    // 🚚 STANDARD CDD BOX / CDE (Standard medium box truck)
    // Box dimensions: 26 width x 48 height centered at (42, 42) -> left=29, top=18
    svgContent = `
      <g transform="rotate(${bearing}, ${cx}, ${cy})">
        <!-- Shadow -->
        <rect x="29" y="20" width="26" height="48" rx="4" fill="rgba(0,0,0,0.38)" />
        
        <!-- Cargo Box (Rear) -->
        <rect x="29" y="32" width="26" height="36" rx="3" fill="${primaryColor}" stroke="#ffffff" stroke-width="1.8" />
        <rect x="33" y="36" width="18" height="28" rx="1.5" fill="rgba(255,255,255,0.18)" stroke="rgba(255,255,255,0.35)" stroke-width="0.8" />
        
        <!-- Front Cabin -->
        <rect x="31" y="18" width="22" height="15" rx="3.5" fill="${cabinColor}" stroke="#38bdf8" stroke-width="1.5" />
        <!-- Windshield -->
        <path d="M 34 21 L 50 21 L 48 26 L 36 26 Z" fill="${accentColor}" opacity="0.95" />
        <!-- Headlights -->
        <circle cx="34" cy="19.5" r="2" fill="#facc15" />
        <circle cx="50" cy="19.5" r="2" fill="#facc15" />
      </g>
    `;
  }

  const fullSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${canvasSize} ${canvasSize}" width="${canvasSize}" height="${canvasSize}" style="overflow: visible;">${svgContent}</svg>`;
  const dataUri = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(fullSvg)}`;

  return {
    url: dataUri,
    scaledSize: typeof window !== 'undefined' && (window as any).google?.maps?.Size 
      ? new (window as any).google.maps.Size(canvasSize, canvasSize)
      : undefined,
    anchor: typeof window !== 'undefined' && (window as any).google?.maps?.Point
      ? new (window as any).google.maps.Point(cx, cy)
      : undefined,
  };
}
