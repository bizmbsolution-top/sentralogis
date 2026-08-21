"use client";

import {
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  X,
  RefreshCw,
  Wifi,
  WifiOff,
  Server,
  Navigation,
  Database,
  Smartphone,
  Clock,
  Info as InfoIcon,
  ChevronRight,
} from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { useDriverAuth } from "@/lib/hooks/useDriverAuth";
import {
  getGpsPingQueueLength,
  getPendingGpsPings,
  syncGpsPingsFirst,
} from "@/lib/offline/offlineSyncEngine";
import { NativeGpsManager } from "@/lib/services/NativeGpsManager";
import { get } from "idb-keyval";

const APP_VERSION_RAW = process.env.NEXT_PUBLIC_APP_VERSION || "0.1.0";
const APP_VERSION = APP_VERSION_RAW.startsWith("V") || APP_VERSION_RAW.startsWith("v")
  ? APP_VERSION_RAW
  : "V" + APP_VERSION_RAW;

interface InfoPerangkatProps {
  open: boolean;
  onClose: () => void;
  driverId?: string;
  driverName?: string;
  driverWhatsapp?: string;
  tenantId?: string;
  tenantName?: string;
  gpsStatus?: string | null;
  gpsAccuracy?: number | null;
  gpsSpeed?: number | null;
  gpsBattery?: number | null;
  gpsPingCount?: number;
  gpsErrorMessage?: string;
  token?: string | null;
  isNative?: boolean | null;
  isDark?: boolean;
}

type Tone = "ok" | "warn" | "err" | "neutral";

function StatusPill({ tone, children }: { tone: Tone; children: ReactNode }) {
  const tones: Record<Tone, string> = {
    ok: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
    warn: "bg-amber-500/15 text-amber-500 border-amber-500/30",
    err: "bg-rose-500/15 text-rose-500 border-rose-500/30",
    neutral: "bg-slate-500/15 text-slate-500 border-slate-500/30",
  };
  const dot: Record<Tone, string> = {
    ok: "bg-emerald-500",
    warn: "bg-amber-500",
    err: "bg-rose-500",
    neutral: "bg-slate-500",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${tones[tone]}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dot[tone]}`} />
      {children}
    </span>
  );
}

function Row({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
        {label}
      </span>
      <span className={`text-[11px] font-black text-slate-800 truncate ${valueClass}`}>
        {value}
      </span>
    </div>
  );
}

function formatTime(ts?: string | number | Date | null): string {
  if (!ts) return "-";
  const d = ts instanceof Date ? ts : new Date(ts);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleTimeString("id-ID", { hour12: false });
}

function detectNative(): boolean | null {
  if (typeof window === "undefined") return null;
  try {
    const ua = navigator.userAgent || "";
    const isCap = Capacitor.isNativePlatform();
    const isScheme = window.location.protocol === "sentralogis:";
    const isAppUA = ua.includes("SentraLogis_AndroidApp");
    const isWebView = /(Android.*WebView|wv)/i.test(ua);
    if (isCap || isAppUA || isScheme || isWebView) return true;
    return false;
  } catch {
    return null;
  }
}

export default function InfoPerangkat({
  open,
  onClose,
  gpsStatus,
  gpsAccuracy,
  gpsSpeed,
  gpsPingCount,
  gpsErrorMessage,
  tenantName,
  isNative,
}: InfoPerangkatProps) {
  const { session } = useDriverAuth();

  const [internet, setInternet] = useState<"checking" | "online" | "offline">(
    "checking",
  );
  const [server, setServer] = useState<
    "checking" | "connected" | "error" | "offline"
  >("checking");
  const [serverLatency, setServerLatency] = useState<number | null>(null);
  const [gpsPermission, setGpsPermission] = useState<
    "granted" | "denied" | "prompt" | "unsupported"
  >("unsupported");
  const [syncState, setSyncState] = useState<
    "checking" | "synced" | "pending" | "error" | "offline"
  >("checking");
  const [pendingCount, setPendingCount] = useState(0);
  const [storedCount, setStoredCount] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [lastGpsUpdate, setLastGpsUpdate] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [gpsTesting, setGpsTesting] = useState(false);
  const [gpsTestResult, setGpsTestResult] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [gpsTestError, setGpsTestError] = useState<string | null>(null);

  // Track the last moment real GPS data was received (from the page's GPS hook)
  useEffect(() => {
    if (
      gpsStatus &&
      gpsStatus !== "loading" &&
      gpsStatus !== "error" &&
      (gpsAccuracy !== null || gpsSpeed !== null || gpsStatus === "active")
    ) {
      setLastGpsUpdate(formatTime(new Date()));
    }
  }, [gpsStatus, gpsAccuracy, gpsSpeed]);

  const readSync = useCallback(async () => {
    try {
      const isNativeApp = isNative ?? detectNative();
      let nativePending = 0;
      let nativeTotal = 0;
      if (isNativeApp) {
        try {
          const status = await NativeGpsManager.getQueueStatus();
          nativePending = status.pendingCount || 0;
          nativeTotal = status.totalCount || 0;
        } catch {}
      }

      const total = await getGpsPingQueueLength();
      const pending = await getPendingGpsPings();
      const mutations: any[] = (await get("offline_mutation_outbox")) || [];
      const pendingMutations = mutations.filter(
        (m) => m.status !== "SYNCED",
      ).length;
      const pendingTotal = nativePending + pending.length + pendingMutations;
      const storedTotal = nativeTotal + total + mutations.length;
      const lastSyncTs = await get("offline_last_sync_ts");
      setPendingCount(pendingTotal);
      setStoredCount(storedTotal);
      setLastSync(lastSyncTs ? String(lastSyncTs) : null);
      return { pendingTotal, lastSyncTs };
    } catch {
      return { pendingTotal: 0, lastSyncTs: null };
    }
  }, [isNative]);

  const checkServer = useCallback(async () => {
    setServer("checking");
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      const res = await fetch("/api/driver/health", {
        cache: "no-store",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const data = await res.json();
      if (res.ok && data.ok) {
        setServer("connected");
        setServerLatency(data.latency ?? null);
      } else {
        setServer("error");
      }
    } catch {
      setServer("error");
    }
  }, []);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const online =
        typeof navigator !== "undefined" && navigator.onLine;
      setInternet(online ? "online" : "offline");

      if (online) {
        // Real server health check
        await checkServer();
        // Attempt to push pending offline data so the queue reflects server ACK
        const isNativeApp = isNative ?? detectNative();
        if (isNativeApp) {
          try {
            await NativeGpsManager.triggerSync();
          } catch {}
        }
        try {
          await syncGpsPingsFirst();
        } catch {}
      } else {
        setServer("offline");
      }

      const sync = await readSync();
      setSyncState(
        !online
          ? "offline"
          : sync.pendingTotal > 0
            ? "pending"
            : "synced",
      );
    } catch {
      setSyncState("error");
    } finally {
      setRefreshing(false);
    }
  }, [checkServer, readSync, isNative]);

  // Read GPS permission
  const readGpsPermission = useCallback(async () => {
    try {
      if (isNative) {
        try {
          const { Geolocation } = await import("@capacitor/geolocation");
          const perm = await Geolocation.checkPermissions();
          setGpsPermission(
            perm.location === "granted" || perm.coarseLocation === "granted"
              ? "granted"
              : perm.location === "denied" || perm.coarseLocation === "denied"
                ? "denied"
                : "prompt"
          );
          return;
        } catch {}
      }

      if (typeof navigator !== "undefined" && navigator.permissions && navigator.permissions.query) {
        try {
          const result = await navigator.permissions.query({ name: "geolocation" });
          setGpsPermission(
            result.state === "granted"
              ? "granted"
              : result.state === "denied"
                ? "denied"
                : "prompt",
          );
          return;
        } catch {}
      }

      if (gpsStatus === "active" || (gpsAccuracy !== null && gpsAccuracy !== undefined)) {
        setGpsPermission("granted");
      } else {
        setGpsPermission("prompt");
      }
    } catch {
      if (gpsStatus === "active" || (gpsAccuracy !== null && gpsAccuracy !== undefined)) {
        setGpsPermission("granted");
      } else {
        setGpsPermission("unsupported");
      }
    }
  }, [isNative, gpsStatus, gpsAccuracy]);

  useEffect(() => {
    if (!open) return;
    setRefreshing(true);
    readGpsPermission();
    (async () => {
      const online = typeof navigator !== "undefined" && navigator.onLine;
      setInternet(online ? "online" : "offline");
      if (online) {
        await checkServer();
        try {
          await syncGpsPingsFirst();
        } catch {}
      } else {
        setServer("offline");
      }
      const sync = await readSync();
      setSyncState(
        !online
          ? "offline"
          : sync.pendingTotal > 0
            ? "pending"
            : "synced",
      );
      setRefreshing(false);
    })();
  }, [open, checkServer, readGpsPermission, readSync]);

  // ── GPS Activation & Test (restored from legacy SetupWizard) ──
  const requestGpsPermission = useCallback(async () => {
    const isNativeApp = isNative ?? detectNative();
    try {
      if (isNativeApp) {
        const { Geolocation } = await import("@capacitor/geolocation");
        const perm = await Geolocation.requestPermissions();
        setGpsPermission(
          perm.location === "granted" || perm.coarseLocation === "granted"
            ? "granted"
            : perm.location === "denied" || perm.coarseLocation === "denied"
              ? "denied"
              : "prompt"
        );
        return;
      }
      // Web/PWA: a one-shot position request triggers the browser permission prompt
      if (typeof navigator !== "undefined" && navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          () => readGpsPermission(),
          () => readGpsPermission(),
          { timeout: 8000 }
        );
      }
    } catch {}
  }, [isNative, readGpsPermission]);

  const runGpsTest = useCallback(async () => {
    const isNativeApp = isNative ?? detectNative();
    setGpsTesting(true);
    setGpsTestError(null);
    setGpsTestResult(null);
    try {
      let lat: number, lng: number, acc: number;
      if (isNativeApp) {
        const { Geolocation } = await import("@capacitor/geolocation");
        const pos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
          timeout: 15000,
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        acc = Math.round(pos.coords.accuracy);
      } else {
        if (typeof navigator === "undefined" || !navigator.geolocation) {
          throw new Error("Geolocation tidak didukung perangkat ini");
        }
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
        acc = Math.round(pos.coords.accuracy);
      }
      setGpsTestResult({ lat, lng, acc });
      setLastGpsUpdate(formatTime(new Date()));
    } catch (e: any) {
      setGpsTestError(
        e?.message || "Gagal mendapatkan lokasi. Pastikan GPS aktif dan berada di area terbuka."
      );
    } finally {
      setGpsTesting(false);
    }
  }, [isNative]);

  if (!open) return null;

  // ── GPS status derivation (real values only) ──
  let gpsTone: Tone = "neutral";
  let gpsLabel = "Belum mendapatkan lokasi";
  if (gpsPermission === "denied") {
    gpsTone = "err";
    gpsLabel = "Permission belum diberikan";
  } else if (gpsStatus === "active") {
    gpsTone = "ok";
    gpsLabel = "Aktif";
  } else if (gpsStatus === "loading" || gpsStatus === undefined) {
    gpsTone = "neutral";
    gpsLabel = "Memeriksa...";
  } else if (gpsStatus === "error") {
    gpsTone = "err";
    gpsLabel = gpsErrorMessage ? `ERROR: ${gpsErrorMessage}` : "ERROR - Java Plugin Failed";
  } else if (gpsStatus === "recovering") {
    gpsTone = "warn";
    gpsLabel = "Memulihkan GPS...";
  } else if (gpsStatus === "inactive") {
    gpsTone = "neutral";
    gpsLabel = "Standby (Menunggu Penugasan JO)";
  } else {
    gpsTone = "warn";
    gpsLabel = "Belum mendapatkan lokasi";
  }

  // ── Sync status ──
  let syncTone: Tone;
  let syncLabel: string;
  if (syncState === "checking") {
    syncTone = "neutral";
    syncLabel = "Memeriksa...";
  } else if (syncState === "offline") {
    syncTone = "warn";
    syncLabel = "Offline";
  } else if (syncState === "pending") {
    syncTone = "warn";
    syncLabel = `${pendingCount} data menunggu sinkronisasi`;
  } else if (syncState === "error") {
    syncTone = "err";
    syncLabel = "Sinkronisasi gagal";
  } else {
    syncTone = "ok";
    syncLabel = "Semua data tersinkron";
  }

  // ── Session ──
  const sessionValid = !!session;

  // ── Native service ──
  const nativeKnown = isNative ?? detectNative();

  const t = {
    sheet: "bg-white border-slate-200 text-slate-900",
    card: "bg-slate-50 border-slate-200",
    title: "text-slate-800",
    label: "text-slate-500",
    value: "text-slate-900",
    sub: "text-slate-500",
    btn: "bg-slate-200 hover:bg-slate-300 text-slate-900 border-slate-300",
    chip: "bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200",
    chipActive: "bg-indigo-600 text-white border-indigo-500",
  };

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        className={`w-full sm:max-w-md max-h-[92dvh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border ${t.sheet} shadow-2xl`}
      >
        {/* Header */}
        <div className={`sticky top-0 z-10 p-4 border-b bg-white border-slate-200`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-600/15 border border-indigo-500/30 text-indigo-500 flex items-center justify-center">
                <InfoIcon size={16} />
              </div>
              <div>
                <h3 className={`text-sm font-black uppercase tracking-tight ${t.title}`}>
                  Info Perangkat
                </h3>
                <p className={`text-[9px] font-bold uppercase tracking-widest ${t.label}`}>
                  {APP_VERSION}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={refresh}
                disabled={refreshing}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${t.btn}`}
                title="Refresh"
              >
                <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              </button>
              <button
                onClick={onClose}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center transition-all ${t.btn}`}
                title="Tutup"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          {/* KONEKSI */}
          <section className={`rounded-2xl border p-4 space-y-2.5 ${t.card}`}>
            <h4 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${t.label}`}>
              <Wifi size={12} /> Koneksi
            </h4>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold ${t.sub}`}>Internet</span>
              {internet === "online" ? (
                <StatusPill tone="ok">Terhubung</StatusPill>
              ) : internet === "offline" ? (
                <StatusPill tone="err">Offline</StatusPill>
              ) : (
                <StatusPill tone="neutral">Memeriksa...</StatusPill>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold ${t.sub}`}>Server SentraLogis</span>
              {server === "connected" ? (
                <StatusPill tone="ok">
                  Terhubung{serverLatency !== null ? ` · ${serverLatency}ms` : ""}
                </StatusPill>
              ) : server === "error" ? (
                <StatusPill tone="err">Tidak dapat terhubung</StatusPill>
              ) : server === "offline" ? (
                <StatusPill tone="warn">Offline</StatusPill>
              ) : (
                <StatusPill tone="neutral">Memeriksa...</StatusPill>
              )}
            </div>
          </section>

          {/* GPS */}
          <section className={`rounded-2xl border p-4 space-y-2.5 ${t.card}`}>
            <h4 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${t.label}`}>
              <Navigation size={12} /> GPS
            </h4>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold ${t.sub}`}>Status</span>
              <StatusPill tone={gpsTone}>{gpsLabel}</StatusPill>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Row
                label="Permission"
                value={
                  gpsPermission === "granted"
                    ? "Diizinkan"
                    : gpsPermission === "denied"
                      ? "Ditolak"
                      : gpsPermission === "prompt"
                        ? "Belum dipilih"
                        : "Tidak didukung"
                }
              />
              <Row label="Last Update" value={lastGpsUpdate || "Belum tersedia"} />
              <Row
                label="Accuracy"
                value={gpsAccuracy != null ? `${Math.round(gpsAccuracy!)} m` : "-"}
              />
              <Row
                label="Speed"
                value={gpsSpeed != null ? `${Math.round(gpsSpeed!)} km/h` : "-"}
              />
            </div>

            {/* Activation & Test controls */}
            <div className="flex gap-2 pt-2">
              {gpsPermission !== "granted" && (
                <button
                  onClick={requestGpsPermission}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-sm"
                >
                  <Navigation size={13} /> Aktifkan Izin Lokasi
                </button>
              )}
              <button
                onClick={runGpsTest}
                disabled={gpsTesting}
                className={`py-2.5 px-3 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 disabled:opacity-60 ${
                  gpsPermission !== "granted"
                    ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200"
                    : "flex-1 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white border-emerald-500 shadow-sm"
                }`}
              >
                {gpsTesting ? (
                  <RefreshCw size={13} className="animate-spin" />
                ) : (
                  <Navigation size={13} />
                )}
                Test GPS Sekarang
              </button>
            </div>

            {gpsTesting && (
              <p className="text-[9px] font-bold text-slate-500 italic">
                Memeriksa lokasi... pastikan Anda berada di area terbuka.
              </p>
            )}
            {gpsTestResult && (
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3 space-y-1">
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600">
                  ✓ GPS Berhasil Terdeteksi
                </p>
                <Row label="Latitude" value={gpsTestResult.lat.toFixed(6)} />
                <Row label="Longitude" value={gpsTestResult.lng.toFixed(6)} />
                <Row label="Akurasi" value={`${gpsTestResult.acc} m`} />
              </div>
            )}
            {gpsTestError && (
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3">
                <p className="text-[9px] font-black uppercase tracking-widest text-rose-600">
                  ✕ Test Gagal
                </p>
                <p className="text-[10px] font-bold text-rose-500 mt-0.5">{gpsTestError}</p>
              </div>
            )}
          </section>

          {/* SINKRONISASI */}
          <section className={`rounded-2xl border p-4 space-y-2.5 ${t.card}`}>
            <h4 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${t.label}`}>
              <Database size={12} /> Sinkronisasi
            </h4>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-bold ${t.sub}`}>Status</span>
              <StatusPill tone={syncTone}>{syncLabel}</StatusPill>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Row
                label="Data Pending"
                value={syncState === "checking" ? "-" : String(pendingCount)}
              />
              <Row
                label="Tersimpan di HP"
                value={syncState === "checking" ? "-" : String(storedCount)}
              />
              <Row label="Sync Terakhir" value={formatTime(lastSync)} />
              <Row label="Server ACK" value={syncState === "checking" ? "-" : formatTime(lastSync)} />
            </div>
            <p className={`text-[9px] leading-relaxed ${t.label}`}>
              "Tersimpan di HP" berarti data ada di perangkat; "Server ACK" berarti
              server sudah menerima data.
            </p>
          </section>

          {/* SESSION */}
          <section className={`rounded-2xl border p-4 space-y-2.5 ${t.card}`}>
            <h4 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${t.label}`}>
              <Smartphone size={12} /> Session
            </h4>
            <Row label="Driver" value={session?.name || "-"} />
            <Row label="Perusahaan" value={tenantName || "-"} />
            <div className="flex items-center justify-between pt-1">
              <span className={`text-[11px] font-bold ${t.sub}`}>Status</span>
              {sessionValid ? (
                <StatusPill tone="ok">Session Valid</StatusPill>
              ) : (
                <StatusPill tone="err">Session Expired</StatusPill>
              )}
            </div>
          </section>

          {/* APLIKASI */}
          <section className={`rounded-2xl border p-4 space-y-2.5 ${t.card}`}>
            <h4 className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${t.label}`}>
              <Server size={12} /> Aplikasi
            </h4>
            <Row label="Versi" value={APP_VERSION} />
            <div className="flex items-center justify-between pt-1">
              <span className={`text-[11px] font-bold ${t.sub}`}>Native Service</span>
              {nativeKnown === true ? (
                <StatusPill tone="ok">Aktif</StatusPill>
              ) : nativeKnown === false ? (
                <StatusPill tone="neutral">Tidak Aktif (PWA)</StatusPill>
              ) : (
                <StatusPill tone="neutral">Tidak diketahui</StatusPill>
              )}
            </div>
          </section>

          {/* Close */}
          <button
            onClick={onClose}
            className={`w-full py-3.5 rounded-xl border font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${t.btn}`}
          >
            <ChevronRight size={14} /> Tutup
          </button>

          <p className="text-center text-[9px] font-bold uppercase tracking-widest text-slate-500 pb-2">
            {gpsPingCount !== undefined ? `${gpsPingCount} GPS pings · ` : ""}
            Data diagnostik tidak membocorkan token/sesi
          </p>
        </div>
      </div>
    </div>
  );
}
