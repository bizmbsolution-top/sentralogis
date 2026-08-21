import crypto from "crypto";

export interface DriverJwtPayload {
  sub: string;
  driver_id: string;
  role: string;
  tenant_id: string;
  profile_id: string | null;
  linked_tenant_ids: string[];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface VerifiedDriverSession {
  driver_id: string;
  tenant_id: string;
  profile_id: string | null;
  linked_tenant_ids: string[];
  exp: number;
  role?: string;
}

/**
 * Resolves the server-only cryptographic secret for driver JWTs.
 * Strictly checks server-only environment variables and FAILS CLOSED if unconfigured.
 */
export function getDriverJwtSecret(): string {
  const secret = process.env.SUPABASE_JWT_SECRET || process.env.GPS_SESSION_SECRET;
  if (!secret || typeof secret !== "string" || secret.trim() === "") {
    return "";
  }
  return secret.trim();
}

/**
 * Signs a canonical Driver JWT session token with HMAC-SHA256.
 * Throws if server secret is missing (fail closed).
 */
export function signDriverJwt(
  payload: Omit<DriverJwtPayload, "iat" | "iss" | "aud"> & {
    iat?: number;
    iss?: string;
    aud?: string;
  }
): string {
  const secret = getDriverJwtSecret();
  if (!secret) {
    throw new Error(
      "Driver JWT secret is not configured on server (SUPABASE_JWT_SECRET or GPS_SESSION_SECRET required)"
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const fullPayload: DriverJwtPayload = {
    ...payload,
    iat: payload.iat || now,
    iss: payload.iss || "sentralogis-driver",
    aud: payload.aud || "authenticated",
  };

  const headerB64 = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" })
  ).toString("base64url");
  const payloadB64 = Buffer.from(JSON.stringify(fullPayload)).toString(
    "base64url"
  );
  const signature = crypto
    .createHmac("sha256", secret)
    .update(`${headerB64}.${payloadB64}`)
    .digest("base64url");

  return `${headerB64}.${payloadB64}.${signature}`;
}

/**
 * Cryptographically verifies a Driver JWT session token with HMAC-SHA256.
 * Returns the verified payload or null if invalid, tampered, expired, or if secret is missing (fail-closed).
 */
export function verifyDriverJwt(token: string): VerifiedDriverSession | null {
  if (!token || typeof token !== "string") return null;

  const secret = getDriverJwtSecret();
  if (!secret) {
    console.error(
      "[DRIVER_JWT] Refusing verification: server secret is not configured (FAIL CLOSED)"
    );
    return null;
  }

  try {
    const cleanToken = token.replace(/^Bearer\s+/i, "").trim();
    const parts = cleanToken.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signature] = parts;

    // Verify header algorithm explicitly
    try {
      const header = JSON.parse(
        Buffer.from(headerB64, "base64url").toString("utf8")
      );
      if (header.alg !== "HS256") {
        return null;
      }
    } catch {
      return null;
    }

    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${headerB64}.${payloadB64}`)
      .digest("base64url");

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSignature);

    if (
      sigBuf.length !== expBuf.length ||
      !crypto.timingSafeEqual(sigBuf, expBuf)
    ) {
      return null;
    }

    const payloadJson = Buffer.from(payloadB64, "base64url").toString("utf8");
    const payload = JSON.parse(payloadJson);

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return null;
    }

    const driverId = payload.driver_id || payload.sub;
    if (!driverId) return null;

    return {
      driver_id: driverId,
      tenant_id: payload.tenant_id,
      profile_id: payload.profile_id || null,
      linked_tenant_ids: Array.isArray(payload.linked_tenant_ids)
        ? payload.linked_tenant_ids
        : [payload.tenant_id].filter(Boolean),
      exp: payload.exp,
      role: payload.role || "driver",
    };
  } catch (err) {
    return null;
  }
}
