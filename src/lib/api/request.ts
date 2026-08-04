// src/lib/api/request.ts
import { NextRequest } from "next/server";

function fallbackUuid(): string {
  // Simple UUID v4 polyfill – not cryptographically strong but sufficient as fallback
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function getRequestId(req: NextRequest): string {
  const header = req.headers.get("x-request-id");
  if (header) return header;
  // Use Web Crypto API if available, otherwise fallback to polyfill
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return fallbackUuid();
}
