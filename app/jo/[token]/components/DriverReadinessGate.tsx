"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  Wifi,
  WifiOff,
  Satellite,
  MapPin,
  CheckCircle2,
  Circle,
  Loader2,
  AlertCircle,
  Navigation,
  Send,
  Clock,
} from "lucide-react";

interface GpsSample {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  recorded_at: string;
  valid: boolean;
}

interface DriverReadinessGateProps {
  token: string;
  isNative: boolean | null;
  onReady: () => void;
}

const REQUIRED_SAMPLES = 4;

function isValidSample(sample: {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  recorded_at: string;
}): boolean {
  // Latitude must be valid and not zero
  if (
    sample.latitude === 0 ||
    !isFinite(sample.latitude) ||
    sample.latitude < -90 ||
    sample.latitude > 90
  )
    return false;
  // Longitude must be valid and not zero
  if (
    sample.longitude === 0 ||
    !isFinite(sample.longitude) ||
    sample.longitude < -180 ||
    sample.longitude > 180
  )
    return false;
  // Accuracy is expected to be positive, but some devices report 0 initially.
  // We accept >= 0, and the UI will show '—' if it's 0.
  if (sample.accuracy < 0 || !isFinite(sample.accuracy)) return false;
  // Speed = 0 is valid (driver stationary), but must be non-negative
  if (sample.speed < 0 || !isFinite(sample.speed)) return false;
  // Timestamp must be valid
  if (!sample.recorded_at || isNaN(new Date(sample.recorded_at).getTime()))
    return false;
  return true;
}

type SendDataStatus = "IDLE" | "SENDING" | "SENT" | "QUEUED" | "FAILED";

export default function DriverReadinessGate({
  token,
  isNative,
  onReady,
}: DriverReadinessGateProps) {
  // ─── STATE ──────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  // GPS state
  const [gpsEnabled, setGpsEnabled] = useState<boolean | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);
  const [gpsChecking, setGpsChecking] = useState(true);

  // GPS samples
  const [samples, setSamples] = useState<GpsSample[]>([]);
  const [currentAccuracy, setCurrentAccuracy] = useState<number | null>(null);
  const [currentSpeed, setCurrentSpeed] = useState<number | null>(null);
  const [collectingSamples, setCollectingSamples] = useState(false);

  // Send data
  const [sendStatus, setSendStatus] = useState<SendDataStatus>("IDLE");

  // Completion
  const [readyComplete, setReadyComplete] = useState(false);
  const onReadyCalledRef = useRef(false);

  // Refs for interval cleanup
  const gpsCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const sampleIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const nativeGpsListenerRef = useRef<any>(null);
  const permissionRequestInFlight = useRef(false);

  // ─── NETWORK MONITORING ─────────────────────────────────────
  useEffect(() => {
    const onOnline = () => {
      console.log("[DRIVER_READY] NETWORK=ON");
      setIsOnline(true);
    };
    const onOffline = () => {
      console.log("[DRIVER_READY] NETWORK=OFF");
      setIsOnline(false);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    // Initial log
    console.log(`[DRIVER_READY] NETWORK=${navigator.onLine ? "ON" : "OFF"}`);
    
    console.log("[JO_FLOW] readiness mount\n[GPS_READINESS_LIFECYCLE]\nMOUNT");
    return () => {
      console.log("[JO_FLOW] ...\n[GPS_FLOW] readiness UNMOUNT\n[GPS_READINESS_LIFECYCLE]\nUNMOUNT");
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // ─── GPS STATUS CHECK ───────────────────────────────────────
  useEffect(() => {
    console.log("[GPS_READINESS_LIFECYCLE]\nPERMISSION_EFFECT_START");
    let cancelled = false;

    const checkGps = async () => {
      try {
        if (isNative) {
          // Native: check permissions separately from LocationService
          const { NativeGpsManager } = await import("@/lib/services/NativeGpsManager");
          const { Geolocation } = await import("@capacitor/geolocation");
          
          let hasPerm = false;
          try {
            const perm = await Geolocation.checkPermissions();
            console.log(`[GPS_PERMISSION_FORENSIC]\ninitial checkPermissions = ${JSON.stringify(perm)}\nisNative = true`);
            hasPerm = perm.location === "granted" || perm.coarseLocation === "granted";
            if (!hasPerm && (perm.location === "prompt" || perm.coarseLocation === "prompt" || perm.location === "prompt-with-rationale")) {
               if (!permissionRequestInFlight.current) {
                 permissionRequestInFlight.current = true;
                 console.log("[GPS_PERMISSION_FORENSIC]\n=== BEFORE requestPermissions ===");
                 try {
                   const req = await Geolocation.requestPermissions();
                   console.log(`[GPS_PERMISSION_FORENSIC]\n=== AFTER requestPermissions ===\nresult = ${JSON.stringify(req)}`);
                   hasPerm = req.location === "granted" || req.coarseLocation === "granted";
                 } catch (reqErr) {
                   console.log(`[GPS_PERMISSION_FORENSIC]\n=== requestPermissions EXCEPTION ===\nerror = ${reqErr}`);
                 } finally {
                   permissionRequestInFlight.current = false;
                 }
               } else {
                 console.log("[GPS_PERMISSION_FORENSIC]\nSkipping auto-requestPermissions, already in-flight");
               }
            }
          } catch (e) {
            console.warn("[GPS_PERMISSION_FORENSIC] Geolocation permission check failed", e);
          }

          console.log("[GPS_PERMISSION_FORENSIC]\n=== BEFORE isGpsEnabled ===");
          const enabled = await NativeGpsManager.isGpsEnabled();
          console.log(`[GPS_PERMISSION_FORENSIC]\n=== AFTER isGpsEnabled ===\nenabled = ${enabled}`);

          if (!cancelled) {
            console.log(`[GPS_PERMISSION_FORENSIC]\nfinal permission = ${hasPerm}\ngpsEnabled = ${enabled}`);
            console.log(`[GPS_PERMISSION_FORENSIC]\nSetting permissionGranted = ${hasPerm}, gpsEnabled = ${enabled}`);
            setPermissionGranted(hasPerm);
            setGpsEnabled(enabled);
            setGpsChecking(false);
          }
        } else {
          // Browser: check geolocation permission
          try {
            const perm = await navigator.permissions.query({
              name: "geolocation" as PermissionName,
            });
            console.log("[GPS_PERMISSION_FORENSIC] Browser permissions.query =>", perm.state);
            if (!cancelled) {
              const hasPerm = perm.state !== "denied";
              console.log(`[DRIVER_READY] [GPS_PERMISSION_FORENSIC] PERMISSION=${hasPerm ? "GRANTED" : "DENIED"} GPS=${hasPerm ? "ON" : "OFF"}`);
              setPermissionGranted(hasPerm);
              setGpsEnabled(hasPerm); // Browser can't easily check if location service is on until we sample
              setGpsChecking(false);
            }
          } catch (e) {
            console.log("[GPS_PERMISSION_FORENSIC] Browser permissions.query failed", e);
            // Permissions API not supported, try getCurrentPosition
            if (!cancelled) {
              setPermissionGranted(true);
              setGpsEnabled(true); // Assume enabled, will fail during sampling if not
              setGpsChecking(false);
            }
          }
        }
      } catch (e) {
        console.warn("[ReadinessGate] GPS check error:", e);
        if (!cancelled) {
          setPermissionGranted(false);
          setGpsEnabled(false);
          setGpsChecking(false);
        }
      }
    };

    checkGps();
    // Poll GPS status every 2 seconds
    gpsCheckIntervalRef.current = setInterval(checkGps, 2000);

    return () => {
      console.log("[GPS_READINESS_LIFECYCLE]\nPERMISSION_EFFECT_END");
      cancelled = true;
      if (gpsCheckIntervalRef.current) {
        clearInterval(gpsCheckIntervalRef.current);
      }
    };
  }, [isNative]);

  // ─── GPS SAMPLE COLLECTION ──────────────────────────────────
  const collectBrowserSample = useCallback(async (): Promise<GpsSample | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const sample: GpsSample = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy ?? 0,
            speed: pos.coords.speed ?? 0,
            recorded_at: new Date().toISOString(),
            valid: false,
          };
          sample.valid = isValidSample(sample);
          resolve(sample);
        },
        (err) => {
          console.warn("[ReadinessGate] Geolocation error:", err);
          resolve(null);
        },
        {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0,
        },
      );
    });
  }, []);

  // Start collecting samples when GPS and Network are both ON and permission granted
  useEffect(() => {
    if (!isOnline || permissionGranted === false || gpsEnabled === false || gpsChecking) return;
    if (samples.filter((s) => s.valid).length >= REQUIRED_SAMPLES) return;

    setCollectingSamples(true);

    if (isNative) {
      // Native: Listen for GPS updates from native service
      const setupNativeListener = async () => {
        try {
          const { NativeGpsManager } = await import("@/lib/services/NativeGpsManager");

          // Start native GPS tracking for readiness
          await NativeGpsManager.registerConsumer("readiness_gate", token);

          // Listen for native GPS events dispatched globally by the manager
          const handleNativeGps = (e: CustomEvent) => {
            if (!e.detail) return;
            
            console.info(`[GPS_SYNC_FORENSIC] NATIVE_EVENT_RECEIVED event_name=sentralogis:native_gps_update latitude=${e.detail.latitude} longitude=${e.detail.longitude} recorded_at=${e.detail.recordedAt || e.detail.recorded_at} source=native_sqlite`);
            
            const sample: GpsSample = {
              latitude: e.detail.latitude,
              longitude: e.detail.longitude,
              accuracy: e.detail.accuracy ?? 0,
              speed: e.detail.speed ?? 0,
              recorded_at: e.detail.recorded_at ?? new Date().toISOString(),
              valid: false,
            };
            sample.valid = isValidSample(sample);
            if (sample.valid) {
              setCurrentAccuracy(sample.accuracy);
              setCurrentSpeed(sample.speed);
            }
            setSamples((prev) => {
              const validCount = prev.filter((s) => s.valid).length;
              if (validCount >= REQUIRED_SAMPLES) return prev;
              if (sample.valid) {
                console.log(`[GPS_SAMPLE] index=${validCount + 1} lat=${sample.latitude} lng=${sample.longitude} accuracy=${sample.accuracy} speed=${sample.speed} recorded_at=${sample.recorded_at}`);
                return [...prev, sample];
              }
              return prev;
            });
          };

          window.addEventListener(
            "sentralogis:native_gps_update",
            handleNativeGps as EventListener,
          );
          nativeGpsListenerRef.current = handleNativeGps;
        } catch (e) {
          console.error("[ReadinessGate] Native GPS setup error:", e);
        }
      };

      setupNativeListener();
    } else {
      // Browser: poll getCurrentPosition every 3 seconds
      const collectSample = async () => {
        const sample = await collectBrowserSample();
        if (sample) {
          if (sample.valid) {
            setCurrentAccuracy(sample.accuracy);
            setCurrentSpeed(sample.speed);
          }
          setSamples((prev) => {
            const validCount = prev.filter((s) => s.valid).length;
            if (validCount >= REQUIRED_SAMPLES) return prev;
            if (sample.valid) {
              console.log(`[GPS_SAMPLE] index=${validCount + 1} lat=${sample.latitude} lng=${sample.longitude} accuracy=${sample.accuracy} speed=${sample.speed} recorded_at=${sample.recorded_at}`);
              return [...prev, sample];
            }
            return prev;
          });
        }
      };

      collectSample(); // Immediate first attempt
      sampleIntervalRef.current = setInterval(collectSample, 3000);
    }

    return () => {
      if (sampleIntervalRef.current) {
        clearInterval(sampleIntervalRef.current);
        sampleIntervalRef.current = null;
      }
      if (nativeGpsListenerRef.current) {
        window.removeEventListener(
          "sentralogis:native_gps_update",
          nativeGpsListenerRef.current as EventListener,
        );
        nativeGpsListenerRef.current = null;
      }
      if (isNative) {
        import("@/lib/services/NativeGpsManager").then(({ NativeGpsManager }) => {
          NativeGpsManager.unregisterConsumer("readiness_gate");
        });
      }
    };
  }, [isOnline, gpsEnabled, gpsChecking, isNative, token, collectBrowserSample, samples]);

  // ─── SEND DATA VALIDATION ──────────────────────────────────
  const validSamples = samples.filter((s) => s.valid);

  useEffect(() => {
    if (validSamples.length < REQUIRED_SAMPLES) return;
    if (sendStatus !== "IDLE") return;

    const sendFirstPing = async () => {
      const lastSample = validSamples[validSamples.length - 1];
      if (!lastSample) return;

      if (!navigator.onLine) {
        // Queue offline
        try {
          const { enqueueGpsPing } = await import(
            "@/lib/offline/offlineSyncEngine"
          );
          await enqueueGpsPing(
            token,
            lastSample.latitude,
            lastSample.longitude,
            isNative ? "native_android" : "pwa",
            undefined,
            lastSample.speed,
            lastSample.accuracy,
          );
          console.log("[SEND_DATA] status=QUEUED");
          setSendStatus("QUEUED");
        } catch {
          console.log("[SEND_DATA] status=FAILED");
          setSendStatus("FAILED");
        }
        return;
      }

      setSendStatus("SENDING");
      try {
        const response = await fetch(`/api/jo/${token}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "ngrok-skip-browser-warning": "true",
          },
          body: JSON.stringify({
            action: "gps_ping",
            lat: lastSample.latitude,
            lng: lastSample.longitude,
            recorded_at: lastSample.recorded_at,
            source: isNative ? "native_android" : "pwa",
            speed: lastSample.speed,
            accuracy: lastSample.accuracy,
          }),
        });

        if (response.ok) {
          console.log("[SEND_DATA] status=SENT");
          setSendStatus("SENT");
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (e) {
        console.warn("[ReadinessGate] Send data failed:", e);
        console.log("[SEND_DATA] status=FAILED");
        setSendStatus("FAILED");
      }
    };

    sendFirstPing();
  }, [validSamples.length, sendStatus, token, isNative]);

  // ─── COMPLETION CHECK ──────────────────────────────────────
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    if (
      isOnline &&
      gpsEnabled &&
      validSamples.length >= REQUIRED_SAMPLES &&
      (sendStatus === "SENT" || sendStatus === "QUEUED") &&
      !onReadyCalledRef.current
    ) {
      setReadyComplete(true);
      onReadyCalledRef.current = true;
      const maskedToken = token.length > 6 ? `${token.substring(0,3)}...${token.substring(token.length-3)}` : "***";
      console.log(`[JO_READY] token=${maskedToken}`);
      // Brief delay for UX (show checkmark animation)
      timeoutId = setTimeout(() => {
        onReady();
      }, 1500);
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isOnline, gpsEnabled, validSamples.length, sendStatus, onReady, token]);

  // ─── FORENSIC LOGGING ──────────────────────────────────────
  useEffect(() => {
    // Check if we have valid samples
    const validCount = samples.filter(s => s.valid).length;
    const hasValid = validCount > 0;
    
    // Determine the UI message exactly as requested
    let displayMessage = "";
    if (gpsChecking) displayMessage = "MEMERIKSA...";
    else if (permissionGranted === false) displayMessage = "IZIN LOKASI BELUM DIBERIKAN";
    else if (gpsEnabled === false) displayMessage = "GPS / LOKASI PERANGKAT MATI";
    else if (validCount < REQUIRED_SAMPLES) displayMessage = hasValid ? "Mengumpulkan data GPS..." : "Menunggu lokasi GPS...";
    else displayMessage = "GPS READY";

    console.log(`[GPS_READINESS]
permission = ${permissionGranted}
gpsEnabled = ${gpsEnabled}
validSamples = ${validCount}
readyComplete = ${readyComplete}
final displayed message = ${displayMessage}
    `);
  }, [permissionGranted, gpsEnabled, gpsChecking, isNative, samples, sendStatus, readyComplete]);

  // ─── OPEN GPS SETTINGS ─────────────────────────────────────
  const [gpsSettingsError, setGpsSettingsError] = useState<string | null>(null);

  const handleOpenGpsSettings = async () => {
    console.log(`[GPS_PERMISSION_FORENSIC]
=== BUTTON CLICKED ===
isNative = ${isNative}
permissionGranted = ${permissionGranted}
gpsEnabled = ${gpsEnabled}
gpsChecking = ${gpsChecking}
current URL = ${typeof window !== "undefined" ? window.location.href : "unknown"}
    `);
    
    setGpsSettingsError(null);
    try {
      if (isNative) {
        if (permissionGranted === false) {
           if (permissionRequestInFlight.current) {
             console.log("[GPS_PERMISSION_FORENSIC]\nSkipping button requestPermissions, already in-flight");
             return;
           }
           permissionRequestInFlight.current = true;
           console.log("[GPS_PERMISSION_FORENSIC]\n=== BEFORE requestPermissions ===");
           const { Geolocation } = await import("@capacitor/geolocation");
           try {
             const req = await Geolocation.requestPermissions();
             console.log(`[GPS_PERMISSION_FORENSIC]\n=== AFTER requestPermissions ===\nresult = ${JSON.stringify(req)}`);
             const hasPerm = req.location === "granted" || req.coarseLocation === "granted";
             
             console.log(`[GPS_PERMISSION_FORENSIC]\nhasPerm = ${hasPerm}\nrequestResult = ${JSON.stringify(req)}\nSetting permissionGranted = ${hasPerm}`);
             setPermissionGranted(hasPerm);
             if (!hasPerm) {
               setGpsSettingsError("Izin lokasi ditolak secara permanen. Silakan buka Settings > Apps > SentraLogis dan izinkan Lokasi.");
             }
           } catch (reqErr) {
             console.log(`[GPS_PERMISSION_FORENSIC]\n=== requestPermissions EXCEPTION ===\nerror = ${reqErr}`);
           } finally {
             permissionRequestInFlight.current = false;
           }
         } else {
           const { NativeGpsManager } = await import("@/lib/services/NativeGpsManager");
           await NativeGpsManager.openLocationSettings();
         }
      } else {
        if (!navigator.geolocation) {
          setGpsSettingsError("Browser ini tidak mendukung Geolocation.");
          return;
        }
        try {
          await navigator.permissions.query({ name: "geolocation" as PermissionName });
          await navigator.geolocation.getCurrentPosition(
            () => setGpsEnabled(true),
            (err) => {
              if (err.code === 1) {
                setGpsSettingsError("Izin lokasi ditolak. Silakan aktifkan GPS & izin lokasi di pengaturan browser.");
              } else {
                setGpsSettingsError("Gagal mengakses GPS. Pastikan GPS aktif dan izin lokasi diberikan.");
              }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
          );
        } catch {
          await navigator.geolocation.getCurrentPosition(
            () => setGpsEnabled(true),
            (err) => {
              if (err.code === 1) {
                setGpsSettingsError("Izin lokasi ditolak. Silakan aktifkan GPS & izin lokasi di pengaturan browser.");
              } else {
                setGpsSettingsError("Gagal mengakses GPS. Pastikan GPS aktif dan izin lokasi diberikan.");
              }
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
          );
        }
      }
    } catch (e) {
      console.warn("[ReadinessGate] Could not open GPS settings:", e);
      setGpsSettingsError("Gagal membuka pengaturan GPS. Silakan aktifkan GPS secara manual di perangkat Anda.");
    }
  };

  // ─── RETRY SEND ─────────────────────────────────────────────
  const handleRetrySend = () => {
    setSendStatus("IDLE");
  };

  // ─── RENDER ──────────────────────────────────────────────────
  const validCount = validSamples.length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
            <Navigation className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            DRIVER READINESS
          </h1>
          <p className="text-slate-400 text-sm mt-2">
            Mempersiapkan perangkat untuk tracking...
          </p>
        </div>

        {/* Status Cards */}
        <div className="space-y-3">
          {/* Network Status */}
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {isOnline ? (
                  <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                    <Wifi className="w-5 h-5 text-emerald-400" />
                  </div>
                ) : (
                  <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                    <WifiOff className="w-5 h-5 text-red-400" />
                  </div>
                )}
                <div>
                  <p className="text-white font-bold text-sm">Network</p>
                  <p
                    className={`text-xs font-semibold ${isOnline ? "text-emerald-400" : "text-red-400"}`}
                  >
                    {isOnline ? "ONLINE" : "OFFLINE"}
                  </p>
                </div>
              </div>
              {isOnline ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-400" />
              )}
            </div>
            {!isOnline && (
              <p className="text-red-300 text-xs mt-3 bg-red-500/10 rounded-lg p-2">
                Internet tidak tersedia. Silakan aktifkan koneksi internet.
              </p>
            )}
          </div>

          {/* GPS Status */}
          <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    gpsChecking
                      ? "bg-amber-500/20"
                      : permissionGranted === false
                        ? "bg-red-500/20"
                        : gpsEnabled === false
                          ? "bg-amber-500/20"
                          : "bg-emerald-500/20"
                  }`}
                >
                  <Satellite
                    className={`w-5 h-5 ${
                      gpsChecking
                        ? "text-amber-400 animate-pulse"
                        : permissionGranted === false
                          ? "text-red-400"
                          : gpsEnabled === false
                            ? "text-amber-400"
                            : "text-emerald-400"
                    }`}
                  />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">GPS</p>
                  <p
                    className={`text-xs font-semibold ${
                      gpsChecking
                        ? "text-amber-400"
                        : permissionGranted === false
                          ? "text-red-400"
                          : gpsEnabled === false
                            ? "text-amber-400"
                            : "text-emerald-400"
                    }`}
                  >
                    {gpsChecking
                      ? "MEMERIKSA..."
                      : permissionGranted === false
                        ? "IZIN DITOLAK"
                        : gpsEnabled === false
                          ? "GPS MATI"
                          : "GPS ON"}
                  </p>
                </div>
              </div>
              {gpsChecking ? (
                <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
              ) : permissionGranted !== false && gpsEnabled !== false ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              ) : (
                <AlertCircle className="w-6 h-6 text-red-400" />
              )}
            </div>
            {!gpsChecking && (permissionGranted === false || gpsEnabled === false) && (
              <div className="mt-3 space-y-2">
                <p className="text-red-300 text-xs bg-red-500/10 rounded-lg p-2">
                  {permissionGranted === false 
                    ? "IZIN LOKASI BELUM DIBERIKAN. Silakan izinkan akses lokasi."
                    : "GPS / LOKASI PERANGKAT MATI. Silakan aktifkan Location."}
                </p>
                <button
                  onClick={handleOpenGpsSettings}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95"
                >
                  {permissionGranted === false ? "BERI IZIN" : "AKTIFKAN GPS"}
                </button>
                {gpsSettingsError && (
                  <p className="text-red-300 text-[10px] bg-red-500/10 rounded-lg p-2 leading-relaxed">
                    {gpsSettingsError}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* GPS Samples */}
          {isOnline && permissionGranted !== false && gpsEnabled !== false && !gpsChecking && (
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">Location</p>
                  <p className="text-indigo-400 text-xs font-semibold">
                    {validCount >= REQUIRED_SAMPLES
                      ? "GPS READY"
                      : validCount > 0 
                        ? "Mengumpulkan data GPS..." 
                        : "Menunggu lokasi GPS..."}
                  </p>
                </div>
              </div>

              {/* Sample Progress */}
              <div className="space-y-2 ml-1">
                {Array.from({ length: REQUIRED_SAMPLES }, (_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    {i < validCount ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    ) : i === validCount && collectingSamples ? (
                      <Loader2 className="w-5 h-5 text-blue-400 animate-spin shrink-0" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-600 shrink-0" />
                    )}
                    <span
                      className={`text-sm font-medium ${
                        i < validCount
                          ? "text-emerald-400"
                          : i === validCount && collectingSamples
                            ? "text-blue-400"
                            : "text-slate-600"
                      }`}
                    >
                      {i + 1}/{REQUIRED_SAMPLES}
                    </span>
                    {i < validCount && samples.filter(s => s.valid)[i] && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        {samples.filter(s => s.valid)[i].accuracy.toFixed(0)}m
                      </span>
                    )}
                  </div>
                ))}
              </div>

              {/* Accuracy & Speed */}
              <div className="mt-4 pt-3 border-t border-slate-700/50 grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                    Accuracy
                  </p>
                  <p className="text-white font-bold text-sm">
                    {currentAccuracy && currentAccuracy > 0
                      ? `${currentAccuracy.toFixed(0)} m`
                      : "\u2014"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                    Speed
                  </p>
                  <p className="text-white font-bold text-sm">
                    {currentSpeed !== null && currentSpeed >= 0
                      ? `${(currentSpeed * 3.6).toFixed(0)} km/h`
                      : "\u2014"}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Send Data */}
          {validCount >= REQUIRED_SAMPLES && (
            <div className="bg-slate-800/80 backdrop-blur-sm rounded-2xl p-4 border border-slate-700/50">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      sendStatus === "SENT"
                        ? "bg-emerald-500/20"
                        : sendStatus === "QUEUED"
                          ? "bg-amber-500/20"
                          : sendStatus === "FAILED"
                            ? "bg-red-500/20"
                            : "bg-blue-500/20"
                    }`}
                  >
                    <Send
                      className={`w-5 h-5 ${
                        sendStatus === "SENT"
                          ? "text-emerald-400"
                          : sendStatus === "QUEUED"
                            ? "text-amber-400"
                            : sendStatus === "FAILED"
                              ? "text-red-400"
                              : "text-blue-400"
                      }`}
                    />
                  </div>
                  <div>
                    <p className="text-white font-bold text-sm">Send Data</p>
                    <p
                      className={`text-xs font-semibold ${
                        sendStatus === "SENT"
                          ? "text-emerald-400"
                          : sendStatus === "QUEUED"
                            ? "text-amber-400"
                            : sendStatus === "FAILED"
                              ? "text-red-400"
                              : sendStatus === "SENDING"
                                ? "text-blue-400"
                                : "text-slate-400"
                      }`}
                    >
                      {sendStatus === "IDLE"
                        ? "MENUNGGU..."
                        : sendStatus === "SENDING"
                          ? "MENGIRIM..."
                          : sendStatus}
                    </p>
                  </div>
                </div>
                {sendStatus === "SENT" ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                ) : sendStatus === "QUEUED" ? (
                  <Clock className="w-6 h-6 text-amber-400" />
                ) : sendStatus === "FAILED" ? (
                  <AlertCircle className="w-6 h-6 text-red-400" />
                ) : (
                  <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                )}
              </div>
              {sendStatus === "QUEUED" && (
                <p className="text-amber-300 text-xs mt-3 bg-amber-500/10 rounded-lg p-2">
                  Data disimpan secara lokal. Akan dikirim saat koneksi tersedia.
                </p>
              )}
              {sendStatus === "FAILED" && (
                <div className="mt-3 space-y-2">
                  <p className="text-red-300 text-xs bg-red-500/10 rounded-lg p-2">
                    Gagal mengirim data. Periksa koneksi internet Anda.
                  </p>
                  <button
                    onClick={handleRetrySend}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-xl font-bold text-xs uppercase tracking-widest transition-all active:scale-95"
                  >
                    COBA LAGI
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Ready Animation */}
        {readyComplete && (
          <div className="text-center animate-in fade-in zoom-in duration-500 pt-4">
            <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/40 animate-pulse">
              <CheckCircle2 className="w-8 h-8 text-white" />
            </div>
            <p className="text-emerald-400 font-black text-lg tracking-tight">
              PERANGKAT SIAP
            </p>
            <p className="text-slate-400 text-xs mt-1">
              Membuka Job Order...
            </p>
          </div>
        )}

        {/* Progress Bar */}
        {!readyComplete && (
          <div className="pt-2">
            <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${Math.min(100, (([isOnline, permissionGranted !== false && gpsEnabled !== false, validCount >= REQUIRED_SAMPLES, sendStatus === "SENT" || sendStatus === "QUEUED"].filter(Boolean).length + (validCount / REQUIRED_SAMPLES) * 0.5) / 4.5) * 100)}%`,
                }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
