import { useEffect, useRef, useCallback } from "react";
import {
  enqueueGpsPing,
  syncGpsPingsFirst,
  getGpsPingQueueLength,
} from "@/lib/offline/offlineSyncEngine";
import { Capacitor, registerPlugin } from "@capacitor/core";

// Define the plugin interface
interface NativeGpsPlugin {
  startTracking(options: { jobId: string; apiUrl: string }): Promise<void>;
  stopTracking(): Promise<void>;
  openBatterySettings(): Promise<void>;
  getDeviceInfo(): Promise<{
    manufacturer: string;
    brand: string;
    model: string;
    batteryOptimizationIgnored: boolean;
  }>;
  addListener(
    eventName: "onLocationUpdate",
    listenerFunc: (data: any) => void,
  ): Promise<any>;
}

const NativeGps = registerPlugin<NativeGpsPlugin>("NativeGps");

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
  offlineQueueLength: number;
}

export function useDriverGpsPing(
  token: string | null | undefined,
  status: string | undefined,
  enabled = true,
  onGeofenceArrival?: (event: GeofenceArrivalEvent) => void,
  startedAt?: string | null,
  onPingStateChange?: (state: Partial<GpsPingState>) => void,
  isNativeApp?: boolean,
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<any>(null);
  const isPingingRef = useRef<boolean>(false);
  const listenerRef = useRef<any>(null);
  const workerRef = useRef<Worker | null>(null);

  // [Phase 2.1] Retry state refs
  const consecutiveFailuresRef = useRef<number>(0);
  const isStoppedRef = useRef<boolean>(false);
  const pingCountRef = useRef<number>(0);
  const doneRef = useRef<boolean>(false);

  const heartbeatSentRef = useRef<boolean>(false);

  const emitPingState = useCallback(
    (patch: Partial<GpsPingState>) => {
      if (onPingStateChange) {
        onPingStateChange(patch);
      }
    },
    [onPingStateChange],
  );

  // Send native_heartbeat once per token when native app opens
  useEffect(() => {
    if (typeof window !== "undefined" && token) {
      if (isNativeApp && !heartbeatSentRef.current) {
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

      // If offline, queue GPS ping to IndexedDB instead of sending to API
      if (typeof navigator !== "undefined" && !navigator.onLine) {
        await enqueueGpsPing(token, lat, lng, source, battery, speed, accuracy);
        console.log(
          `[GPS Ping] Queued offline GPS ping for JO: ${token} from ${source}`,
        );
        // Get updated queue length for UI
        const qLen = await getGpsPingQueueLength();
        emitPingState({ offlineQueueLength: qLen });
        return;
      }

      try {
        const response = await fetch(`/api/jo/${token}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify({
            action: "gps_ping",
            lat,
            lng,
            recorded_at: new Date().toISOString(),
            source,
            battery,
            speed,
            accuracy,
          }),
        });

        if (response.ok) {
          // [Phase 2.1] Reset consecutive failures on success
          consecutiveFailuresRef.current = 0;
          pingCountRef.current += 1;
          emitPingState({
            status: "active",
            consecutiveFailures: 0,
            pingCount: pingCountRef.current,
            accuracy: accuracy ?? null,
            speed: speed ?? null,
            battery: battery ?? null,
          });

          const result = await response.json();

          // Stop GPS if JO is done on server
          if (result && result.jo_status && DONE_STATUSES.includes(result.jo_status)) {
            doneRef.current = true;
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
              intervalRef.current = null;
            }
            try { NativeGps.stopTracking(); } catch {}
            emitPingState({ status: "inactive" });
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("sentralogis:jo_completed", {
                  detail: { status: result.jo_status },
                }),
              );
            }
            return;
          }

          if (result && result.geofence_triggered) {
            console.log("📍 [Geofence Triggered]", result);
            if (typeof navigator !== "undefined" && navigator.vibrate) {
              navigator.vibrate([400, 150, 400, 150, 600]);
            }
            if (typeof window !== "undefined" && "speechSynthesis" in window) {
              try {
                const msg = `Sentra Logis memberi tahu: Anda telah terdeteksi tiba di ${result.arrived_stop || "titik rute pengiriman"}. Status rute otomatis diperbarui.`;
                const utterance = new SpeechSynthesisUtterance(msg);
                utterance.lang = "id-ID";
                window.speechSynthesis.speak(utterance);
              } catch {}
            }
            if (onGeofenceArrival) onGeofenceArrival(result);
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("sentralogis:geofence_arrival", {
                  detail: result,
                }),
              );
            }
          }
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (e) {
        console.warn("[GPS Ping] failed:", e);
        // [Phase 2.1] Track consecutive failures
        consecutiveFailuresRef.current += 1;
        emitPingState({
          status: consecutiveFailuresRef.current >= 3 ? "error" : "active",
          consecutiveFailures: consecutiveFailuresRef.current,
        });

        // [Phase 2.1] Max retry: 10 gagal berturut-turut → stop ping, recover after 60s
        if (consecutiveFailuresRef.current >= MAX_CONSECUTIVE_FAILURES) {
          console.error(
            `[GPS Ping] Stopped after ${MAX_CONSECUTIVE_FAILURES} consecutive failures. Will retry in 60s.`,
          );
          isStoppedRef.current = true;
          emitPingState({ status: "error" });
          setTimeout(() => {
            consecutiveFailuresRef.current = 0;
            isStoppedRef.current = false;
            emitPingState({ status: "recovering" });
            console.log("[GPS Ping] Recovery timer fired — resuming pings.");
          }, 60_000);
        }
      }
    },
    [token, onGeofenceArrival, emitPingState],
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
    const isNative = isNativeApp ?? false;

    if (!enabled || !token || !isActiveTransitStatus(status, startedAt)) {
      if (isNative) {
        NativeGps.stopTracking().catch(console.error);
        if (listenerRef.current) {
          listenerRef.current.remove();
          listenerRef.current = null;
        }
      } else {
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

    if (isNative) {
      console.log("[GPS Native] isNativePlatform = true");
      const startNativeGps = async () => {
        try {
          const { Geolocation } = await import("@capacitor/geolocation");
          const perm = await Geolocation.checkPermissions();
          console.log(`[GPS Native] Permission before request = ${perm.location}`);
          
          if (perm.location !== "granted") {
            const req = await Geolocation.requestPermissions();
            console.log(`[GPS Native] Permission request result = ${req.location}`);
            if (req.location !== "granted") {
              console.warn("[GPS Native] Location permission denied");
              return;
            }
          }
          console.log("[GPS Native] Location permission granted");
          console.log("[GPS Native] Starting Foreground Service");
          await NativeGps.startTracking({
            jobId: token,
            apiUrl: window.location.origin,
          });

          if (!listenerRef.current) {
            listenerRef.current = await NativeGps.addListener("onLocationUpdate", (data: any) => {
              console.log(`[GPS Native] Location received = ${data.latitude}, ${data.longitude}`);
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("sentralogis:native_gps_update", {
                    detail: data,
                  }),
                );
              }
            });
          }
        } catch (e) {
          console.error("[GPS Native] Error starting tracking:", e);
        }
      };
      startNativeGps();
    } else {
      // PWA: Use Web Worker for background GPS (survives tab visibility changes)
      requestWakeLock();

      // Stop existing worker if any
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }

      // Start Web Worker
      if (typeof Worker !== "undefined") {
        const worker = new Worker("/gps-worker.js");
        workerRef.current = worker;

        worker.onmessage = (e) => {
          const { type, payload } = e.data;
          if (type === "PING_SUCCESS") {
            consecutiveFailuresRef.current = 0;
            pingCountRef.current += 1;
            emitPingState({
              status: "active",
              consecutiveFailures: 0,
              pingCount: pingCountRef.current,
              accuracy: payload.accuracy ?? null,
              speed: payload.speed ?? null,
            });

            // Handle geofence event
            if (payload.geofence_triggered && onGeofenceArrival) {
              onGeofenceArrival({
                geofence_triggered: true,
                arrived_stop: payload.arrived_stop,
                distance_m: null,
              });
            }

            // Dispatch UI event
            if (typeof window !== "undefined") {
              window.dispatchEvent(
                new CustomEvent("sentralogis:native_gps_update", {
                  detail: {
                    latitude: payload.lat,
                    longitude: payload.lng,
                    accuracy: payload.accuracy,
                    speed: payload.speed,
                  },
                }),
              );
            }
          } else if (type === "PING_FAILED" || type === "GEOLOCATION_ERROR") {
            consecutiveFailuresRef.current += 1;
            emitPingState({
              status: consecutiveFailuresRef.current >= 3 ? "error" : "active",
              consecutiveFailures: consecutiveFailuresRef.current,
            });
          }
        };

        worker.postMessage({
          type: "START",
          payload: { token, apiUrl: window.location.origin },
        });

        console.log("[GPS Ping] Web Worker started for PWA");
      } else {
        // Fallback: no Worker support, use interval
        console.warn("[GPS Ping] Web Worker not supported, falling back to interval");
        pingBrowser();
        intervalRef.current = setInterval(pingBrowser, GPS_PING_INTERVAL_MS);
      }

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
      };
    }

    return () => {
      if (isNative) {
        NativeGps.stopTracking().catch(console.error);
        if (listenerRef.current) {
          listenerRef.current.remove();
          listenerRef.current = null;
        }
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
