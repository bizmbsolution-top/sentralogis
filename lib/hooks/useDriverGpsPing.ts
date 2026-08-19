import { useEffect, useRef, useCallback, useId } from "react";
import {
  enqueueGpsPing,
  syncGpsPingsFirst,
  getGpsPingQueueLength,
} from "@/lib/offline/offlineSyncEngine";
import { Capacitor } from "@capacitor/core";
import { NativeGpsManager, NativeGpsState } from "@/lib/services/NativeGpsManager";

const ACTIVE_STATUSES = [
  "IN_PROGRESS",
  "DALAM PERJALANAN",
  "ON ROAD",
  "ON JOURNEY",
  "ON_ROAD",
  "START JOURNEY",
  "STARTED",
  "LOADING",
  "UNLOADING",
  "DELIVERING",
  "MENUNGGU SELESAI",
  "MENUNGGU BERANGKAT",
  "PICKING_UP",
  "ORDER DITERIMA",
  "ACCEPTED",
  "ASSIGNED",
  "TIBA DI LOKASI MUAT",
  "TIBA DI LOKASI BONGKAR",
  "BERANGKAT DARI LOKASI MUAT",
  "SELESAI BONGKAR",
];

export const DONE_STATUSES = [
  "COMPLETED",
  "PEKERJAAN SELESAI",
  "SELESAI",
  "DONE",
  "INVOICED",
  "PAID",
  "VERIFIED",
  "READY_FOR_BILLING",
  "AWAITING_AUDIT",
];

const INACTIVE_STATUSES = ["REJECTED", "CANCELLED", "DRAFT", "PENDING"];

export function isActiveTransitStatus(
  status?: string,
  startedAt?: string | null,
): boolean {
  const s = (status || "").toUpperCase();
  // Jika status kosong atau sudah selesai, return false
  if (!s || DONE_STATUSES.includes(s)) return false;
  // Jika status explicitly ada di ACTIVE_STATUSES, return true
  if (ACTIVE_STATUSES.includes(s)) return true;
  // Jika status inactive (REJECTED, CANCELLED, DRAFT, PENDING) dan belum started, return false
  if (INACTIVE_STATUSES.includes(s) && !startedAt) return false;
  // Fallback: jika status tidak dikenal, anggap aktif jika sudah ada startedAt
  return !!startedAt;
}

// Fixed 1-minute interval (reduces DB write amplification)
const GPS_PING_INTERVAL_MS = 60_000;
const STILL_SPEED_THRESHOLD_KMH = 5; // < 5 km/h = considered stationary
const MAX_CONSECUTIVE_FAILURES = 10;

export interface GeofenceArrivalEvent {
  geofence_triggered: boolean;
  arrived_stop: string | null;
  distance_m: number | null;
}

export interface GpsPingState {
  status: "active" | "inactive" | "error" | "loading" | "recovering";
  accuracy: number | null;
  speed: number | null;
  battery: number | null;
  pingCount: number;
  consecutiveFailures: number;
  errorMessage?: string;
  offlineQueueLength: number;
}

export function useDriverGpsPing(
  token: string | null | undefined,
  status: string | undefined,
  enabled: boolean,
  onGeofenceArrival?: (event: GeofenceArrivalEvent) => void,
  startedAt?: string | null,
  isNativeApp: boolean | null = null,
  onLocationUpdate?: (location: any) => void,
  onPingStateChange?: (state: Partial<GpsPingState>) => void,
) {
  const hookInstanceId = useId();
  const consumerId = `jo_hook_${hookInstanceId}_${token || "unknown"}`;

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const wakeLockRef = useRef<any>(null);
  const isPingingRef = useRef<boolean>(false);

  // [Phase 2.1] Retry state refs
  const consecutiveFailuresRef = useRef<number>(0);
  const isStoppedRef = useRef<boolean>(false);
  const pingCountRef = useRef<number>(0);
  const doneRef = useRef<boolean>(false);

  const heartbeatSentRef = useRef<boolean>(false);

  const onPingStateChangeRef = useRef(onPingStateChange);
  useEffect(() => {
    onPingStateChangeRef.current = onPingStateChange;
  }, [onPingStateChange]);

  const emitPingState = useCallback(
    (patch: Partial<GpsPingState>) => {
      if (onPingStateChangeRef.current) {
        onPingStateChangeRef.current(patch);
      }
    },
    [],
  );

  // Send native_heartbeat once per token when native app opens
  useEffect(() => {
    if (typeof window !== "undefined" && token) {
      if (isNativeApp === true && !heartbeatSentRef.current) {
        heartbeatSentRef.current = true;
        fetch(`/api/jo/${token}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
          body: JSON.stringify({ action: "native_heartbeat", source: "native_android" }),
        }).catch(err => console.warn("[Native Heartbeat] Error:", err));
      }
    }
  }, [token, isNativeApp]);

  const requestWakeLock = useCallback(async () => {
    try {
      if (typeof navigator !== "undefined" && "wakeLock" in navigator) {
        if (wakeLockRef.current) {
          try {
            await wakeLockRef.current.release();
          } catch {}
        }
        wakeLockRef.current = await (navigator as any).wakeLock.request(
          "screen",
        );
        console.log("[WakeLock] Screen wake lock acquired for active transit.");
      }
    } catch (err) {
      console.warn("[WakeLock] Could not acquire screen wake lock:", err);
    }
  }, []);

  const handleLocationPing = useCallback(
    async (
      lat: number,
      lng: number,
      source: string,
      battery?: number,
      speed?: number,
      accuracy?: number,
    ) => {
      if (!token) return;

      // 1. Queue-First: Always enqueue GPS ping to IndexedDB
      await enqueueGpsPing(token, lat, lng, source, battery, speed, accuracy);
      console.log(`[QUEUE-FIRST] Queued GPS ping for JO: ${token} from ${source}`);
      
      const qLen = await getGpsPingQueueLength();
      emitPingState({ offlineQueueLength: qLen, status: "active" });
    },
    [token, emitPingState],
  );

  const pingBrowser = useCallback(async () => {
    if (
      !enabled ||
      !token ||
      !isActiveTransitStatus(status, startedAt) ||
      isPingingRef.current ||
      isStoppedRef.current ||
      doneRef.current
    )
      return;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    isPingingRef.current = true;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 25_000,
          maximumAge: 30_000,
        });
      });
      await handleLocationPing(
        pos.coords.latitude,
        pos.coords.longitude,
        "pwa",
        undefined,
        pos.coords.speed ?? undefined,
        pos.coords.accuracy ?? undefined,
      );

      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("sentralogis:native_gps_update", {
            detail: {
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
              heading: pos.coords.heading ?? undefined,
              speed: pos.coords.speed ?? undefined,
              accuracy: pos.coords.accuracy ?? undefined,
              battery: undefined,
            },
          }),
        );
      }
    } catch (e) {
      console.warn("[GPS Browser Ping] failed:", e);
    } finally {
      isPingingRef.current = false;
    }
  }, [enabled, token, status, startedAt, handleLocationPing]);

  // [Phase 2.2] Online event listener — sync queued GPS pings when coming back online
  useEffect(() => {
    const handleOnline = async () => {
      console.log("[GPS Ping] Device is online. Syncing queued GPS pings...");
      try {
        const result = await syncGpsPingsFirst();
        console.log(
          `[GPS Ping] Sync complete: ${result.syncedGps} GPS, ${result.syncedMutations} mutations`,
        );
        emitPingState({ offlineQueueLength: 0 });
      } catch (e) {
        console.warn("[GPS Ping] Online sync failed:", e);
      }
    };

    const handleOffline = () => {
      console.log("[GPS Ping] Device went offline. GPS pings will be queued.");
    };

    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      }
    };
  }, [emitPingState]);

  useEffect(() => {
    console.log(`[ENTRY_FORENSIC] gps_hook_mounted=true`);

    // 1. detect native platform
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isCap = typeof window !== "undefined" && (window as any).Capacitor ? (window as any).Capacitor.isNativePlatform() : false;
    const isScheme = typeof window !== "undefined" && window.location.protocol === "sentralogis:";
    const isAppUA = ua.includes("SentraLogis_AndroidApp");
    const isWebView = /(Android.*WebView|wv)/i.test(ua);
    
    // Monotonic detection order: prop > capacitor > fallback checks
    const isNative = isNativeApp === true || isCap || isScheme || isAppUA || isWebView;
    
    // 2. log native detection
    console.log(`[ENTRY_FORENSIC] native_detection isNative=${isNative}`);

    // We enforce JO token and transit status for BOTH Native and PWA
    const shouldTrack = enabled && !!token && isActiveTransitStatus(status, startedAt);
    const isDone = !!status && DONE_STATUSES.includes(status.toUpperCase());

    // 3. handle !enabled or !shouldTrack
    if (!shouldTrack) {
      if (isNative) {
        if (isDone) {
          // JO completed — explicitly stop the native service
          NativeGpsManager.stopAllTracking();
        } else {
          // Not tracking for other reasons (no token, component unmount) — just unregister
          NativeGpsManager.unregisterConsumer(consumerId);
        }
      } else {
        if (workerRef.current) {
          workerRef.current.postMessage({ type: "STOP" });
          workerRef.current.terminate();
          workerRef.current = null;
        }
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        if (wakeLockRef.current) {
          try {
            wakeLockRef.current.release();
          } catch {}
          wakeLockRef.current = null;
        }
      }
      emitPingState({ status: "inactive" });
      return;
    }

    // Reset stopped state when conditions are met again
    isStoppedRef.current = false;
    doneRef.current = false;
    emitPingState({ status: "loading" });

    let nativeUnsubscribe: (() => void) | null = null;

    if (isNative) {
      // 4. if native:
      console.log(`[ENTRY_FORENSIC] native_gps_start_attempt`);
      
      nativeUnsubscribe = NativeGpsManager.subscribe((state: NativeGpsState) => {
        emitPingState({
          status: state.status,
          accuracy: state.accuracy,
          speed: state.speed,
          battery: state.battery,
          pingCount: state.pingCount,
          consecutiveFailures: state.consecutiveFailures,
          errorMessage: state.errorMessage,
        });

        if (state.status === "active") {
          console.log(`[ENTRY_FORENSIC] first_native_sample=true`);
        }
        console.log(`[ENTRY_FORENSIC] gps_permission=${state.permission || 'unknown'}`);
        console.log(`[ENTRY_FORENSIC] gps_status=${state.status}`);
      });

      console.log(`[ENTRY_FORENSIC] native_gps_started=true`);
      NativeGpsManager.registerConsumer(consumerId, token);
    } else {
      // 5. else: browser geolocation fallback
      requestWakeLock();
      
      if (typeof window !== "undefined" && "Worker" in window) {
        console.warn("[GPS Ping] Starting PWA Fallback via Web Worker");
        if (!workerRef.current) {
          workerRef.current = new Worker("/gps-worker.js");
          workerRef.current.onmessage = (e) => {
            const { type, payload } = e.data;
            if (type === "PING_SUCCESS") {
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("sentralogis:native_gps_update", {
                    detail: {
                      latitude: payload.lat,
                      longitude: payload.lng,
                      speed: payload.speed,
                      accuracy: payload.accuracy,
                    },
                  })
                );
              }
              if (navigator.onLine) {
                 syncGpsPingsFirst().then(async () => {
                     const qLen = await getGpsPingQueueLength();
                     emitPingState({ offlineQueueLength: qLen, status: "active", accuracy: payload.accuracy, speed: payload.speed });
                 }).catch(() => {});
              } else {
                 emitPingState({ status: "active", accuracy: payload.accuracy, speed: payload.speed });
              }
            } else if (type === "PING_FAILED" || type === "GEOLOCATION_ERROR") {
              emitPingState({ status: "active", errorMessage: payload.error || `HTTP ${payload.status}` });
            }
          };
        }
        
        workerRef.current.postMessage({
          type: "START",
          payload: { token, apiUrl: window.location.origin }
        });
      } else {
        console.warn("[GPS Ping] Starting PWA Fallback via interval pingBrowser()");
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        
        pingBrowser();
        intervalRef.current = setInterval(() => {
           pingBrowser();
           if (typeof navigator !== "undefined" && navigator.onLine) {
               syncGpsPingsFirst().then(async () => {
                   const qLen = await getGpsPingQueueLength();
                   emitPingState({ offlineQueueLength: qLen });
               }).catch(() => {});
           }
        }, GPS_PING_INTERVAL_MS);
      }
    }

    // 6. cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage({ type: "STOP" });
        workerRef.current.terminate();
        workerRef.current = null;
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (wakeLockRef.current) {
        try {
          wakeLockRef.current.release();
        } catch {}
        wakeLockRef.current = null;
      }
      if (isNative) {
        if (nativeUnsubscribe) {
          nativeUnsubscribe();
          nativeUnsubscribe = null;
        }
        NativeGpsManager.unregisterConsumer(consumerId);
      }
    };
  }, [
    token,
    status,
    enabled,
    startedAt,
    pingBrowser,
    requestWakeLock,
    handleLocationPing,
    emitPingState,
    isNativeApp,
  ]);
}
