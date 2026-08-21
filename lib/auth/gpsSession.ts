import jwt from 'jsonwebtoken';

function getGpsSecret(): string {
  const secret = process.env.GPS_SESSION_SECRET || process.env.SUPABASE_JWT_SECRET;
  if (!secret || typeof secret !== 'string' || secret.trim() === '') {
    return '';
  }
  return secret.trim();
}

export interface GpsSessionPayload {
  driver_id: string;
  tenant_id: string;
  job_order_id: string;
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

/**
 * Create a signed JWT for a driver GPS session (Default TTL 24h / 86400s).
 */
export function signGpsSession(payload: { driver_id: string; tenant_id: string; job_order_id: string }, expiresInSeconds = 86400): string {
  const secret = getGpsSecret();
  if (!secret) {
    throw new Error('GPS_SESSION_SECRET is not configured');
  }
  const now = Math.floor(Date.now() / 1000);
  const tokenPayload: GpsSessionPayload = {
    driver_id: payload.driver_id,
    tenant_id: payload.tenant_id,
    job_order_id: payload.job_order_id,
    iat: now,
    exp: now + expiresInSeconds,
    iss: 'sentralogis-gps',
    aud: 'gps',
  };
  return jwt.sign(tokenPayload, secret, { algorithm: 'HS256' });
}

/**
 * Verify a GPS session JWT and return its payload.
 * Throws on verification failure.
 */
export function verifyGpsSession(token: string): GpsSessionPayload {
  const secret = getGpsSecret();
  if (!secret) {
    throw new Error('GPS_SESSION_SECRET is not configured');
  }
  const decoded = jwt.verify(token, secret, {
    algorithms: ['HS256'],
    issuer: 'sentralogis-gps',
    audience: 'gps',
  }) as GpsSessionPayload;
  return decoded;
}

// Alias exports to match requested names
export const createGpsSessionToken = signGpsSession;
export const verifyGpsSessionToken = verifyGpsSession;
