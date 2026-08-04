"use client";

import { useEffect, useState, use, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Truck,
  MapPin,
  Navigation as NavIcon,
  Phone,
  CheckCircle2,
  Clock,
  ChevronRight,
  AlertCircle,
  Loader2,
  Play,
  Check,
  X,
  Camera,
  Calendar,
  Activity,
  Expand,
  Image as ImageIcon,
  Lock,
  Box,
  FileText,
  Download,
  Eye,
  FolderGit2,
  MessageSquare,
  Satellite,
  WifiOff,
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { useGoogleMaps } from "@/lib/google-maps-context";
import {
  GoogleMap,
  MarkerF,
  PolylineF,
  DirectionsRenderer,
} from "@react-google-maps/api";
import { useDriverGpsPing } from "@/lib/hooks/useDriverGpsPing";
import { subscribeToPushNotifications } from "@/lib/push/client";
import { parseUTC } from "@/lib/utils/dateUtils";

interface RouteStop {
  id: string;
  sequence: number;
  stop_type: "PICKUP" | "DROPOFF";
  location_name: string;
  address: string;
  contact_name: string;
  contact_phone: string;
  status: "pending" | "arrived" | "completed";
  actual_arrival: string;
  actual_departure: string;
  pod_photo_url?: string;
  route_photos?: Array<{
    id: string;
    file_url: string;
    document_name?: string;
    created_at?: string;
  }>;
  latitude?: number;
  longitude?: number;
}

interface JobOrder {
  id: string;
  jo_number: string;
  status: string;
  container_number?: string;
  sbu_metadata?: {
    seal_number?: string;
    [key: string]: any;
  };
  customer?: {
    name: string;
    address: string;
  };
  tenant_name?: string;
  wo_details?: {
    wo_number: string;
    execution_date: string;
    execution_time?: string;
  };
  driver?: { id: string; name: string; phone: string };
  fleet?: { id: string; plate_number: string; type_name: string };
  driver_response?: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  assigned_at?: string;
  advance_amount?: number;
  advance_status?: string;
  assignment_documents?: any[];
  routes: RouteStop[];
}

export default function DriverTrackingPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const { isLoaded } = useGoogleMaps();

  console.log(
    "[JO Page] Render cycle start - token:",
    token,
    "timestamp:",
    Date.now(),
  );

  const [isNative, setIsNative] = useState(false);
  const [gpsStatus, setGpsStatus] = useState<
    "active" | "inactive" | "error" | "loading"
  >("loading");
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsBattery, setGpsBattery] = useState<number | null>(null);
  const [gpsSpeed, setGpsSpeed] = useState<number | null>(null);
  const [gpsPingCount, setGpsPingCount] = useState(0);
  const [showGpsDiagnostic, setShowGpsDiagnostic] = useState(false);

  const [jobOrder, setJobOrder] = useState<JobOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<
    string | null
  >(null);
  const [gpsDiagnostic, setGpsDiagnostic] = useState<any>(null);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  const [showBatteryOptIn, setShowBatteryOptIn] = useState(false);
  const [batteryOptChecked, setBatteryOptChecked] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState<{ manufacturer: string; model: string } | null>(null);

  const [containerNo, setContainerNo] = useState("");
  const [sealNo, setSealNo] = useState("");
  const [savingContainer, setSavingContainer] = useState(false);

  const [driverPosition, setDriverPosition] = useState<{
    lat: number;
    lng: number;
    heading?: number;
  } | null>(null);
  const [geofenceBanner, setGeofenceBanner] = useState<{
    arrived_stop: string | null;
    distance_m: number | null;
  } | null>(null);
  const [panicModalOpen, setPanicModalOpen] = useState(false);
  const [panicType, setPanicType] = useState<
    "swap_fleet" | "swap_driver" | "general"
  >("swap_fleet");
  const [panicReason, setPanicReason] = useState("");
  const [panicHasCargo, setPanicHasCargo] = useState<boolean>(true);
  const [panicSending, setPanicSending] = useState(false);

  const [now, setNow] = useState(Date.now());

  const [readyConfirmOpen, setReadyConfirmOpen] = useState(false);
  const [directionsResponse, setDirectionsResponse] =
    useState<google.maps.DirectionsResult | null>(null);

  // Tick every second for elapsed time counters
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  // [Phase 4.2] Online/offline state for offline banner
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  // Refs to avoid stale closures in intervals
  const jobOrderRef = useRef(jobOrder);
  jobOrderRef.current = jobOrder;
  const gpsStatusRef = useRef(gpsStatus);
  gpsStatusRef.current = gpsStatus;
  const gpsAccuracyRef = useRef(gpsAccuracy);
  gpsAccuracyRef.current = gpsAccuracy;

  // [AI] Enhanced native detection with multiple fallback methods
  useEffect(() => {
    // Method 1: Capacitor native platform check
    import("@capacitor/core")
      .then(({ Capacitor }) => {
        const isCapNative = Capacitor.isNativePlatform();
        setIsNative(isCapNative);
        console.log("[Native Detection] Capacitor:", isCapNative);
      })
      .catch(() => {
        console.log("[Native Detection] Capacitor not available");
        setIsNative(false);
      });

    // Method 2: Check for Android WebView / custom scheme
    const checkNativeFallback = () => {
      // Detect if opened via custom scheme (sentralogis://)
      const isCustomScheme = window.location.protocol === "sentralogis:";
      // Detect Android WebView
      const isWebView = /(Android.*WebView|wv)/i.test(navigator.userAgent);
      // Detect standalone PWA
      const isStandaloneMode =
        window.matchMedia("(display-mode: standalone)").matches ||
        (window.navigator as any).standalone;

      if (isCustomScheme || isWebView || isStandaloneMode) {
        console.log("[Native Detection] Fallback detected:", {
          isCustomScheme,
          isWebView,
          isStandaloneMode,
        });
        setIsNative(true);
      }
    };
    checkNativeFallback();

    if (!token) return;
    fetchJobOrder();

    const handleNativeGps = (e: any) => {
      setGpsDiagnostic(e.detail);
      // Update GPS diagnostic states
      if (e.detail) {
        setGpsStatus("active");
        setGpsAccuracy(e.detail.accuracy || null);
        setGpsBattery(e.detail.battery || null);
        setGpsSpeed(e.detail.speed || null);
        setGpsPingCount((prev) => prev + 1);
      }
    };
    window.addEventListener("sentralogis:native_gps_update", handleNativeGps);

    // [AI] Device Health Ping (Every 5 minutes)
    const healthInterval = setInterval(
      () => {
        const currentJo = jobOrderRef.current;
        if (!currentJo?.id) return;

        const startPingTime = Date.now();

        // Get Battery if possible
        let battery_level = 100;
        if (typeof navigator !== "undefined" && (navigator as any).getBattery) {
          (navigator as any)
            .getBattery()
            .then((batt: any) => {
              battery_level = batt.level * 100;
              sendHealthPing(battery_level);
            })
            .catch(() => sendHealthPing(battery_level));
        } else {
          sendHealthPing(battery_level);
        }

        function sendHealthPing(battery: number) {
          const internet_connected =
            typeof navigator !== "undefined" ? navigator.onLine : true;

          fetch("/api/jo/health", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              job_order_id: currentJo?.id,
              token: token,
              internet_connected,
              gps_active: gpsStatusRef.current === "active",
              background_running: isNative,
              battery_level: battery,
              accuracy: gpsAccuracyRef.current || 10,
              ping_latency_ms: Date.now() - startPingTime,
            }),
          }).catch(console.warn);
        }
      },
      5 * 60 * 1000,
    );

    return () => {
      window.removeEventListener(
        "sentralogis:native_gps_update",
        handleNativeGps,
      );
      clearInterval(healthInterval);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Battery optimization check for native Android
  useEffect(() => {
    let cancelled = false;
    async function checkBatteryOpt() {
      try {
        const { Capacitor, registerPlugin } = await import('@capacitor/core');
        if (!Capacitor.isNativePlatform()) return;
        const gpsPlugin = registerPlugin<any>('NativeGps');
        const info = await gpsPlugin.getDeviceInfo();
        if (cancelled) return;
        setDeviceInfo({ manufacturer: info.manufacturer, model: info.model });
        setBatteryOptChecked(true);
        if (!info.batteryOptimizationIgnored) {
          setShowBatteryOptIn(true);
        }
      } catch (e) {
        console.log('[BatteryOpt] Check skipped:', e);
        if (!cancelled) setBatteryOptChecked(true);
      }
    }
    checkBatteryOpt();
    return () => { cancelled = true; };
  }, []);

  const handleOpenBatterySettings = async () => {
    try {
      const { registerPlugin } = await import('@capacitor/core');
      const gpsPlugin = registerPlugin<any>('NativeGps');
      await gpsPlugin.openBatterySettings();
    } catch (e) {
      console.error('[BatteryOpt] Failed to open settings:', e);
    }
  };

  const handleDismissBatteryOpt = () => {
    setShowBatteryOptIn(false);
  };

  const oemGuide: Record<string, string> = {
    oppo: "Oppo: Buka Settings > Battery > Power Saving Mode > Pilih 'Don't Optimize' untuk SentraLogis",
    vivo: "Vivo: Buka Settings > Battery > Background App Management > Pilih SentraLogis > Allow Background Running",
    xiaomi: "Xiaomi: Buka Settings > Battery & Performance > App Battery Saver > Pilih SentraLogis > No Restrictions",
    realme: "Realme: Buka Settings > Battery > Power Saving Mode > App Quick Freeze > Nonaktifkan untuk SentraLogis",
    samsung: "Samsung: Buka Settings > Battery > Background Usage Limits > Never Sleeping Apps > Tambah SentraLogis",
    huawei: "Huawei: Buka Settings > Battery > Launch > Pilih SentraLogis > Manage Manually > Aktifkan semua",
  };

  const manufacturerKey = (deviceInfo?.manufacturer || '').toLowerCase();
  const oemTip = Object.entries(oemGuide).find(([key]) => manufacturerKey.includes(key));

  // [Phase 4.2] Online/offline event listeners for offline banner
  useEffect(() => {
    const handleOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnlineStatus);
    window.addEventListener("offline", handleOnlineStatus);
    return () => {
      window.removeEventListener("online", handleOnlineStatus);
      window.removeEventListener("offline", handleOnlineStatus);
    };
  }, []);

  useEffect(() => {
    if (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as any).standalone
    ) {
      setIsStandalone(true);
      if (jobOrder?.driver?.id) {
        subscribeToPushNotifications(jobOrder.driver.id);
      }
    }

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }

    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      if (!isStandalone) {
        setShowInstallBanner(true);
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    const handleJoCompleted = () => fetchJobOrder(true);
    window.addEventListener("sentralogis:jo_completed", handleJoCompleted);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("sentralogis:jo_completed", handleJoCompleted);
    };
  }, [jobOrder?.driver?.id, isStandalone]);

  useEffect(() => {
    if (!jobOrder?.assigned_at || jobOrder.started_at) return;

    const interval = setInterval(() => {
      const targetTime =
        new Date(jobOrder.assigned_at!).getTime() + 30 * 60 * 1000;
      const now = new Date().getTime();
      const diff = targetTime - now;

      if (diff <= 0) {
        setTimeLeft("00:00");
        clearInterval(interval);
      } else {
        const m = Math.floor(diff / (1000 * 60));
        const s = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(
          `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`,
        );
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [jobOrder?.assigned_at, jobOrder?.started_at]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast.success('Untuk iOS: Tap tombol Share lalu "Add to Home Screen"');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setShowInstallBanner(false);
      toast.success("Aplikasi berhasil dipasang!");

      const driverType = jobOrder?.driver?.driver_type;

      if (jobOrder?.driver?.id) {
        subscribeToPushNotifications(jobOrder.driver.id);
      }

      setTimeout(() => {
        if (driverType === "INTERNAL") {
          window.location.href = "/driver/portal";
        } else {
          try {
            window.close();
          } catch (e) {}
          toast(
            "Pemasangan selesai. Anda dapat menutup halaman ini karena GPS sudah aktif.",
            { icon: "✅", duration: 10000 },
          );
        }
      }, 1500);
    }
    setDeferredPrompt(null);
  };

  const onGeofenceRef = useRef<(evt: any) => void>(() => {});
  onGeofenceRef.current = (evt) => {
    if (evt.geofence_triggered) {
      setGeofenceBanner({
        arrived_stop: evt.arrived_stop,
        distance_m: evt.distance_m,
      });
      fetchJobOrder(true);
    }
  };

  useDriverGpsPing(
    token,
    jobOrder?.status,
    !!jobOrder,
    useCallback((evt) => onGeofenceRef.current(evt), []),
    jobOrder?.started_at,
  );

  const fetchJobOrder = async (background = false) => {
    try {
      if (!background) setLoading(true);
      const response = await fetch(`/api/jo/${token}`, {
        headers: { "ngrok-skip-browser-warning": "true" },
      });
      const result = await response.json();

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(
            "Link sudah kadaluarsa atau tidak valid. Silakan hubungi operator.",
          );
        }
        throw new Error(result.error || "Gagal mengambil data");
      }

      setJobOrder(result.data);
      setContainerNo(result.data?.container_number || "");
      setSealNo(result.data?.sbu_metadata?.seal_number || "");

      if (result.data?.driver?.driver_type) {
        localStorage.setItem(
          "sentralogis_driver_type",
          result.data.driver.driver_type,
        );
      }

      setError(null);

      // [Auto-Start] Jika ASSIGNED > 30 menit, auto-start langsung
      const assignedAtStr = result.data?.assigned_at || result.data?.created_at;
      if (
        (result.data?.status || "").toLowerCase() === "assigned" &&
        assignedAtStr
      ) {
        const assignedAt = new Date(assignedAtStr).getTime();
        const thirtyMinAgo = Date.now() - 30 * 60 * 1000;
        if (assignedAt <= thirtyMinAgo) {
          console.log("[JO Auto-Start] ASSIGNED > 30 min, auto-starting...");
          fetch(`/api/jo/${token}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "in_progress" }),
          })
            .then((r) => r.json())
            .then((res) => {
              if (res.success) {
                console.log("[JO Auto-Start] Success");
                fetchJobOrder(true);
              }
            })
            .catch((err) => console.error("[JO Auto-Start] Error:", err));
        }
      }
    } catch (err: any) {
      console.error("Error fetching job order:", err);
      setError(
        err.message.includes("Failed to fetch")
          ? "Terjadi kesalahan koneksi. Periksa koneksi internet Anda."
          : err.message,
      );
    } finally {
      if (!background) setLoading(false);
    }
  };

  const getLocation = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn("Geolocation not supported");
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          console.warn("Location error:", err);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 60000 },
      );
    });
  };

  const saveContainerInfo = async () => {
    try {
      setSavingContainer(true);
      const response = await fetch(`/api/jo/${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_container",
          container_number: containerNo,
          seal_number: sealNo,
        }),
      });
      const res = await response.json();
      if (!response.ok)
        throw new Error(res.error || "Gagal menyimpan data kontainer");
      toast.success("Nomor Kontainer & Seal berhasil disimpan!");
      await fetchJobOrder(true);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingContainer(false);
    }
  };

  const updateStatus = async (newStatus: string) => {
    setUpdating(newStatus);
    try {
      const location = await getLocation();
      const response = await fetch(`/api/jo/${token}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          status: newStatus,
          lat: location?.lat,
          lng: location?.lng,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Gagal memperbarui status");
      }

      toast.success(`Status diperbarui ke: ${newStatus.toUpperCase()}`);
      setLastError(null);
      await fetchJobOrder(true);
    } catch (err: any) {
      console.error("Update Status Error:", err);
      setLastError(err.message);
      toast.error("Error: " + err.message, { duration: 5000 });
    } finally {
      setUpdating(null);
    }
  };

  const updateRouteStatus = async (routeId: string, routeStatus: string) => {
    setUpdating(routeId);
    setLastError(null);
    try {
      const location = await getLocation();
      console.log("Updating Route:", routeId, routeStatus, location);
      const response = await fetch(`/api/jo/${token}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          route_id: routeId,
          route_status: routeStatus,
          lat: location?.lat,
          lng: location?.lng,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Gagal memperbarui rute");
      }

      toast.success(`Berhasil: ${routeStatus.toUpperCase()}`);
      await fetchJobOrder(true);
    } catch (err: any) {
      console.error("Update Route Error:", err);
      setLastError(err.message);
      toast.error("Gagal: " + err.message, { duration: 5000 });
    } finally {
      setUpdating(null);
    }
  };

  const compressImage = (file: File, maxW = 1200, quality = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;
        if (width > maxW) { height = (maxW / width) * height; width = maxW; }
        if (height > maxW) { width = (maxW / height) * width; height = maxW; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handlePhotoUpload = async (
    routeId: string,
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoLoading(routeId);
    try {
      const location = await getLocation();
      const base64 = await compressImage(file);

      const response = await fetch(`/api/jo/${token}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          route_id: routeId,
          pod_photo_base64: base64,
          pod_photo_name: file.name,
          lat: location?.lat,
          lng: location?.lng,
        }),
      });

      if (!response.ok) {
        const text = await response.text();
        let msg: string;
        try { msg = JSON.parse(text).error || "Gagal simpan foto ke database"; } catch { msg = text || "Gagal simpan foto ke database"; }
        throw new Error(msg);
      }

      toast.success("Foto berhasil diunggah");
      await fetchJobOrder(true);
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("Gagal upload: " + err.message);
    } finally {
      setPhotoLoading(null);
    }
  };

  const openInGoogleMaps = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`,
      "_blank",
    );
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return "-";
    const d = parseUTC(dateStr);
    return d ? d.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    }) : "-";
  };

  const formatDuration = (fromMs: number, toMs: number) => {
    const diff = Math.max(0, toMs - fromMs);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    if (h > 0) return `${h}j ${m}m`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const milestones = jobOrder
    ? [
        {
          id: "start",
          label: "MULAI",
          status: jobOrder.started_at ? "completed" : "pending",
        },
        ...jobOrder.routes.map((s) => ({
          id: s.id,
          label: s.location_name,
          status:
            s.status === "completed"
              ? "completed"
              : s.status === "arrived" ||
                  jobOrder.status.includes(s.location_name.toUpperCase())
                ? "current"
                : "pending",
        })),
        {
          id: "finish",
          label: "SELESAI",
          status:
            jobOrder.completed_at ||
            jobOrder.status === "PEKERJAAN SELESAI" ||
            jobOrder.status === "COMPLETED"
              ? "completed"
              : "pending",
        },
      ]
    : [];

  const progress = (() => {
    if (!milestones.length) return 0;
    const total = milestones.length;
    const reached = milestones.filter((m) => m.status === "completed").length;
    const current = milestones.findIndex((m) => m.status === "current");

    let base = (reached / total) * 100;
    if (current !== -1) {
      base = (current / total) * 100 + (1 / total) * 50;
    }
    return Math.min(base, 100);
  })();

  const totalStops = jobOrder?.routes?.length || 0;
  const completedStops =
    jobOrder?.routes?.filter((r: any) => {
      const s = (r.status || "").toLowerCase();
      return s === "completed" || s === "arrived" || !!r.actual_arrival;
    }).length || 0;

  const activeStop = jobOrder?.routes?.find(
    (r: any) => r.status === "arrived" || r.status === "pending",
  );
  const activeStopMarker = activeStop
    ? (() => {
        const lat = activeStop.latitude
          ? Number((activeStop as any).latitude)
          : null;
        const lng = activeStop.longitude
          ? Number((activeStop as any).longitude)
          : null;
        if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
          return { lat, lng, label: activeStop.location_name };
        }
        return null;
      })()
    : null;

  const mapMarkers = (jobOrder?.routes || [])
    .map((stop: any) => {
      const lat = stop.latitude ? Number(stop.latitude) : null;
      const lng = stop.longitude ? Number(stop.longitude) : null;
      if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
        return { lat, lng, sequence: stop.sequence, label: stop.location_name };
      }
      return null;
    })
    .filter(Boolean) as {
    lat: number;
    lng: number;
    sequence: number;
    label: string;
  }[];

  const polylinePath = mapMarkers.map((m) => ({ lat: m.lat, lng: m.lng }));
  const mapCenter = driverPosition
    ? { lat: driverPosition.lat, lng: driverPosition.lng }
    : activeStopMarker
      ? { lat: activeStopMarker.lat, lng: activeStopMarker.lng }
      : mapMarkers.length > 0
        ? { lat: mapMarkers[0].lat, lng: mapMarkers[0].lng }
        : { lat: -6.2, lng: 106.816666 };

  useEffect(() => {
    if (!isLoaded || mapMarkers.length < 2 || typeof google === "undefined")
      return;

    const directionsService = new google.maps.DirectionsService();
    const origin = { lat: mapMarkers[0].lat, lng: mapMarkers[0].lng };
    const destination = {
      lat: mapMarkers[mapMarkers.length - 1].lat,
      lng: mapMarkers[mapMarkers.length - 1].lng,
    };
    const waypoints = mapMarkers.slice(1, -1).map((s) => ({
      location: { lat: s.lat, lng: s.lng },
      stopover: true,
    }));

    directionsService.route(
      {
        origin,
        destination,
        waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirectionsResponse(result);
        }
      },
    );
  }, [isLoaded, JSON.stringify(polylinePath)]);

  // [FIX] ASSIGNED sekarang langsung tracking — hapus dialog konfirmasi driver
  const isWaitingConfirmation = false;
  const isPendingStart =
    !jobOrder?.started_at &&
    ["CONFIRMED_BY_DRIVER", "AUTO_CONFIRMED", "ORDER DITERIMA"].includes(
      jobOrder?.status || "",
    );
  const isActive =
    !isWaitingConfirmation &&
    !isPendingStart &&
    ![
      "completed",
      "PEKERJAAN SELESAI",
      "SELESAI",
      "PAID",
      "ready_for_billing",
      "verified",
      "REJECTED",
      "CANCELLED",
    ].includes(jobOrder?.status || "");
  const isCompleted = [
    "completed",
    "PEKERJAAN SELESAI",
    "SELESAI",
    "PAID",
    "ready_for_billing",
    "verified",
  ].includes(jobOrder?.status || "");
  const isMenungguSelesai = jobOrder?.status === "MENUNGGU SELESAI";

  const nextStopName =
    activeStop?.location_name?.toUpperCase() || "LOKASI TUJUAN";

  // Live driver GPS position — placed BEFORE early returns to keep hook count consistent
  useEffect(() => {
    if (!isLoaded) return;
    let watchId: number | null = null;
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setDriverPosition({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            heading: pos.coords.heading ?? undefined,
          });
        },
        (err) => console.warn("[Driver Position] watch error:", err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 },
      );
    }
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [isLoaded]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">
          Memuat data Job Order...
        </p>
      </div>
    );
  }

  if (error || !jobOrder) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-sm text-center shadow-xl border border-slate-100">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-6" />
          <h2 className="text-xl font-bold text-slate-800 mb-2 uppercase tracking-tight">
            LINK TIDAK VALID
          </h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            {error || "Job Order tidak ditemukan"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm transition-all active:scale-95"
          >
            MUAT ULANG
          </button>
        </div>
      </div>
    );
  }

  // [AI] Block web browser access, force use of Native Android app
  // If App Links fails (e.g. signature mismatch), WhatsApp opens Chrome.
  // We use Chrome's Intent URI to forcibly launch the native app.
  // Bypass: add ?browser=1 to URL to render full page in browser (for testing)
  const bypassNative =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("browser") === "1";
  const finalIsNative = bypassNative
    ? true
    : typeof window !== "undefined" && (window as any).__FORCE_NATIVE
      ? true
      : isNative;
  if (!finalIsNative) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white rounded-3xl p-8 max-w-sm shadow-xl border border-slate-100">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <Truck className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">
            Buka di Aplikasi
          </h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">
            Demi pelacakan GPS, Anda harus membuka tugas ini melalui Aplikasi
            Sentralogis Driver.
          </p>
          <button
 onClick={() => {
                console.log('[JO Page] Buka di Aplikasi clicked, token:', token);
                // Android Intent URL — paling reliable dari Chrome / WebView
                // Format: intent://{path}#Intent;scheme={scheme};package={pkg};S.browser_fallback_url={url};end
                const intentUrl =
                  `intent://jo/${token}` +
                  '#Intent;' +
                  'scheme=sentralogis;' +
                  'package=com.sentralogis.driver;' +
                  `S.browser_fallback_url=https://www.sentralogis.com/jo/${token}?browser=1;` +
                  'end';
                window.location.href = intentUrl;
              }}
            className="w-full block bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-2xl font-bold text-sm transition-all active:scale-95 shadow-lg shadow-emerald-200 uppercase tracking-widest mb-6"
          >
            Buka di Aplikasi
          </button>
          <div className="h-px w-full bg-slate-100 mb-6"></div>
          <p className="text-xs text-slate-400 mb-3">
            Belum memiliki aplikasi?
          </p>
          <button
            onClick={() => router.push("/driver/install")}
            className="w-full text-blue-600 font-bold text-sm transition-all hover:text-blue-700"
          >
            Download Aplikasi Sentralogis
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32">
      <Toaster position="top-center" />

      {/* PWA Install Banner */}
      {showInstallBanner && !isStandalone && (
        <div className="bg-blue-600 text-white p-4 shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white text-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <Truck size={24} />
            </div>
            <div>
              <p className="font-bold text-sm tracking-tight">
                Pasang aplikasi SentraLogis di HP Anda
              </p>
              <p className="text-[10px] text-blue-100 mt-0.5">
                Akses lebih cepat dan pantau notifikasi
              </p>
            </div>
          </div>
          <button
            onClick={handleInstallClick}
            className="w-full sm:w-auto bg-white text-blue-600 px-6 py-2 rounded-xl font-black text-xs uppercase tracking-widest active:scale-95 transition-all shadow-md"
          >
            Pasang Sekarang
          </button>
        </div>
      )}

      {/* Battery Optimization Warning */}
      {showBatteryOptIn && (
        <div className="bg-amber-500 text-white p-4 shadow-lg sticky top-0 z-50">
          <div className="flex items-start gap-3 max-w-4xl mx-auto">
            <div className="w-8 h-8 bg-white text-amber-600 rounded-full flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle size={18} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm tracking-tight">
                GPS Tidak Optimal
              </p>
              <p className="text-[11px] text-amber-100 mt-1 leading-relaxed">
                HP Anda mengoptimasi baterai yang mematikan GPS saat layar off.
                Aktifkan izin "Abaikan Optimasi Baterai" untuk tracking akurat.
              </p>
              {oemTip && (
                <p className="text-[10px] text-amber-200 mt-1 italic">
                  {oemTip[1]}
                </p>
              )}
              <div className="flex gap-2 mt-3">
                <button
                  onClick={handleOpenBatterySettings}
                  className="bg-white text-amber-700 px-4 py-1.5 rounded-lg font-bold text-xs uppercase tracking-wider active:scale-95 transition-all"
                >
                  Buka Pengaturan
                </button>
                <button
                  onClick={handleDismissBatteryOpt}
                  className="text-white/80 hover:text-white text-xs font-semibold px-2"
                >
                  Nanti
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PHASE 1: VENDOR CONFIRMATION                                   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {isWaitingConfirmation && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
          <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(245,158,11,0.2)]">
              <AlertCircle size={36} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">
                JOB ORDER SENTRALOGIS
              </h2>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Job: {jobOrder.jo_number}
              </p>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Tujuan: {jobOrder.routes?.[0]?.location_name || "-"} →{" "}
                {jobOrder.routes?.[jobOrder.routes.length - 1]?.location_name ||
                  "-"}
              </p>
              {jobOrder.container_number && (
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Container: {jobOrder.container_number}
                </p>
              )}
            </div>

            <div
              id="identity-confirm-step"
              className="bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner"
            >
              <p className="font-black text-slate-800 text-lg mb-6 leading-relaxed">
                APAKAH ANDA {jobOrder?.driver?.name?.toUpperCase() || "DRIVER"}?
              </p>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    const el = document.getElementById("vehicle-confirm-step");
                    if (el) el.style.display = "block";
                    const elIdentity = document.getElementById(
                      "identity-confirm-step",
                    );
                    if (elIdentity) elIdentity.style.display = "none";
                  }}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-black text-sm tracking-widest transition-all active:scale-95 shadow-md"
                >
                  YA
                </button>
                <button
                  onClick={() => {
                    setUpdating("rejected");
                    fetch("/api/jo/" + token, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        status: "rejected",
                        rejection_note: "DRIVER_IDENTITY_MISMATCH",
                      }),
                    })
                      .then(() => {
                        toast.success("Ditolak karena tidak sesuai");
                        window.location.reload();
                      })
                      .catch((e) => toast.error("Gagal"));
                  }}
                  disabled={!!updating}
                  className="w-full bg-slate-200 hover:bg-slate-300 text-slate-700 py-4 rounded-xl font-bold text-xs tracking-widest uppercase transition-all active:scale-95"
                >
                  BUKAN SAYA
                </button>
              </div>
            </div>

            <div
              id="vehicle-confirm-step"
              style={{ display: "none" }}
              className="animate-in fade-in slide-in-from-bottom-4 duration-300"
            >
              <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 mt-4 shadow-sm">
                <p className="font-black text-slate-800 text-lg mb-6 leading-relaxed">
                  APAKAH ANDA MENGGUNAKAN TRUK{" "}
                  {jobOrder?.fleet?.plate_number || "-"}?
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => updateStatus("accepted")}
                    disabled={!!updating}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-xl font-black text-sm tracking-widest transition-all active:scale-95 shadow-md flex items-center justify-center"
                  >
                    {updating === "accepted" ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      "YA"
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setUpdating("rejected");
                      fetch("/api/jo/" + token, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          status: "rejected",
                          rejection_note: "VEHICLE_MISMATCH",
                        }),
                      })
                        .then(() => {
                          toast.success("Ditolak karena beda armada");
                          window.location.reload();
                        })
                        .catch((e) => toast.error("Gagal"));
                    }}
                    disabled={!!updating}
                    className="w-full bg-rose-100 hover:bg-rose-200 text-rose-700 py-4 rounded-xl font-bold text-xs tracking-widest uppercase transition-all active:scale-95"
                  >
                    BUKAN
                  </button>
                </div>
              </div>
            </div>

            {/* Display Device Health status securely and read-only */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-[10px] font-bold">
              <span className="text-slate-400">STATUS DEVICE</span>
              <div className="flex items-center gap-1.5">
                {gpsDiagnostic?.battery > 20 &&
                gpsDiagnostic?.speed !== undefined ? (
                  <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                    <Check size={12} /> DEVICE READY
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded">
                    <AlertCircle size={12} /> WARNING
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PHASE 2: PENDING START (Assigned info card)                  */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {isPendingStart && (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-50">
          <div className="w-full max-w-sm bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center space-y-6">
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto animate-pulse">
              <Clock size={36} />
            </div>

            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight mb-2">
                Tugas akan dimulai otomatis
              </h2>
              <p className="text-sm font-semibold text-slate-500">
                Persiapkan kendaraan Anda
              </p>
            </div>

            <div className="bg-slate-900 text-white p-6 rounded-2xl">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                Dimulai Dalam
              </p>
              <div className="text-4xl font-black font-mono tracking-wider">
                {timeLeft || "--:--"}
              </div>
            </div>

            <div className="border-t border-slate-100 pt-6 space-y-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500">
                  <FileText size={18} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    No. Job Order
                  </p>
                  <p className="font-black text-slate-800 text-sm">
                    {jobOrder.jo_number}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500">
                  <MapPin size={18} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Tujuan Utama
                  </p>
                  <p className="font-black text-slate-800 text-sm">
                    {nextStopName}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-500">
                  <Truck size={18} />
                </div>
                <div>
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    Armada
                  </p>
                  <p className="font-black text-slate-800 text-sm">
                    {jobOrder.fleet?.plate_number || "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PHASE 3: ACTIVE TRACKING (In progress / journey)             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {(isActive || isCompleted) && (
        <>
          {/* Sticky Header */}
          <div className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
            <div className="max-w-xl mx-auto px-6 py-4">
              {/* Top Row: Recipient + Status */}
              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black text-slate-900 truncate tracking-tight">
                    {jobOrder.tenant_name ||
                      jobOrder.customer?.name ||
                      "SENTRALOGIS"}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {jobOrder.jo_number}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {/* [Phase 4.1] GPS Status Indicator */}
                  <div
                    className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                      gpsStatus === "active"
                        ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"
                        : gpsStatus === "error"
                          ? "bg-rose-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
                          : gpsStatus === "loading"
                            ? "bg-amber-400 animate-pulse"
                            : "bg-slate-300"
                    }`}
                    title={
                      gpsStatus === "active"
                        ? `GPS Aktif - Akurasi ${gpsAccuracy || "?"}m`
                        : gpsStatus === "error"
                          ? "GPS Error - Coba restart"
                          : gpsStatus === "loading"
                            ? "GPS Menyala..."
                            : "GPS Tidak Aktif"
                    }
                  />
                  <div
                    className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] ${
                      isCompleted
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-900 text-white"
                    }`}
                  >
                    {(() => {
                      const s = jobOrder.status?.toUpperCase() || "";
                      if (s === "ACCEPTED") return "DITERIMA";
                      if (s === "IN_PROGRESS") return "DALAM PERJALANAN";
                      if (s === "COMPLETED" || s === "PEKERJAAN SELESAI")
                        return "SELESAI";
                      if (s.startsWith("MENUJU")) return "MENUJU";
                      if (s.startsWith("TIBA")) return "TIBA";
                      return s.replace(/_/g, " ");
                    })()}
                  </div>
                </div>
              </div>

              {/* Milestone Dots */}
              <div className="flex items-start gap-1 overflow-x-auto pb-1">
                {milestones.map((m, idx) => (
                  <div key={m.id} className="flex items-start gap-1 shrink-0">
                    <div className="flex flex-col items-center gap-0.5">
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 transition-all ${
                          m.status === "completed"
                            ? "bg-emerald-500 text-white"
                            : m.status === "current"
                              ? "bg-blue-600 text-white animate-pulse ring-2 ring-blue-300"
                              : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {m.status === "completed" ? (
                          <Check size={12} />
                        ) : (
                          (m.label || idx + 1).substring(0, 2).toUpperCase()
                        )}
                      </div>
                      <span
                        className={`text-[7px] font-semibold leading-tight text-center max-w-[56px] truncate ${
                          m.status === "completed"
                            ? "text-emerald-600"
                            : m.status === "current"
                              ? "text-blue-600"
                              : "text-slate-400"
                        }`}
                      >
                        {m.label === "MULAI"
                          ? "Start"
                          : m.label === "SELESAI"
                            ? "Selesai"
                            : m.label}
                      </span>
                    </div>
                    {idx < milestones.length - 1 && (
                      <div className="self-center mt-3">
                        <div
                          className={`w-3 h-[2px] rounded-full ${m.status === "completed" ? "bg-emerald-300" : "bg-slate-200"}`}
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <main className="max-w-xl mx-auto space-y-0">
            {/* Phase 4.2: Offline Banner */}
            {!isOnline && (
              <div className="mx-6 mt-4 bg-amber-500 text-white rounded-2xl p-4 shadow-xl border-2 border-amber-400 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-3">
                  <WifiOff size={20} className="shrink-0" />
                  <div>
                    <h3 className="text-sm font-black tracking-tight uppercase leading-tight mb-0.5">
                      KONEKSI TERPUTUS
                    </h3>
                    <p className="text-[10px] font-bold text-amber-100 leading-relaxed">
                      GPS ping akan diantrekan dan dikirim otomatis saat koneksi kembali.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Geofence Banner */}
            {geofenceBanner && (
              <div className="mx-6 mt-4 bg-emerald-600 text-white rounded-2xl p-5 shadow-2xl border-2 border-emerald-400 animate-in fade-in slide-in-from-top-4 duration-500 relative">
                <button
                  onClick={() => setGeofenceBanner(null)}
                  className="absolute top-3 right-3 text-white/80 hover:text-white p-1 bg-black/20 rounded-full"
                >
                  <X size={14} />
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-2xl animate-bounce">📍</span>
                  <div className="pr-4">
                    <h3 className="text-sm font-black tracking-tight uppercase leading-tight mb-0.5">
                      TIBA DI {geofenceBanner.arrived_stop || "LOKASI"}
                    </h3>
                    <p className="text-[10px] font-bold text-emerald-100 leading-relaxed">
                      Terverifikasi via Geofence (
                      {geofenceBanner.distance_m || "< 500"}m). Status rute
                      diperbarui!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* GPS Diagnostic Banner */}
            {gpsDiagnostic && (
              <div className="mx-6 mt-4 bg-slate-900 text-white rounded-2xl p-4 shadow-xl border border-slate-700 animate-in fade-in duration-500">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Activity size={14} className="text-emerald-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                      NATIVE GPS ACTIVE
                    </span>
                  </div>
                  <span className="text-[9px] font-bold bg-slate-800 px-2 py-0.5 rounded text-slate-400">
                    BATT:{" "}
                    {gpsDiagnostic.battery > 0
                      ? gpsDiagnostic.battery + "%"
                      : "N/A"}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-300">
                  <div>
                    Speed:{" "}
                    {gpsDiagnostic.speed
                      ? (gpsDiagnostic.speed * 3.6).toFixed(1)
                      : 0}{" "}
                    km/h
                  </div>
                  <div>
                    Accuracy: {gpsDiagnostic.accuracy?.toFixed(1) || "-"} m
                  </div>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {lastError && (
              <div className="mx-6 mt-4 bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 animate-bounce">
                <div className="flex items-center gap-2 text-rose-700 mb-1">
                  <AlertCircle size={16} />
                  <p className="text-[10px] font-black uppercase tracking-widest">
                    Update Gagal!
                  </p>
                </div>
                <p className="text-xs font-bold text-rose-600">{lastError}</p>
              </div>
            )}

            {/* Single Map — Shows current active route */}
            {isLoaded && mapMarkers.length > 0 && (
              <div className="relative">
                <div className="h-[45vh] min-h-[280px] w-full">
                  <GoogleMap
                    mapContainerStyle={{ width: "100%", height: "100%" }}
                    center={mapCenter}
                    zoom={13}
                    options={{
                      disableDefaultUI: false,
                      zoomControl: true,
                      mapTypeControl: false,
                      streetViewControl: false,
                      fullscreenControl: false,
                    }}
                  >
                    {mapMarkers.map((marker) => (
                      <MarkerF
                        key={marker.sequence}
                        position={{ lat: marker.lat, lng: marker.lng }}
                        label={{
                          text: String(marker.sequence),
                          color: "#ffffff",
                          fontWeight: "black",
                          fontSize: "11px",
                        }}
                      />
                    ))}
                    {directionsResponse ? (
                      <DirectionsRenderer
                        directions={directionsResponse}
                        options={{
                          suppressMarkers: true,
                          polylineOptions: {
                            strokeColor: "#3b82f6",
                            strokeOpacity: 0.9,
                            strokeWeight: 5,
                          },
                        }}
                      />
                    ) : (
                      polylinePath.length > 1 && (
                        <PolylineF
                          path={polylinePath}
                          options={{
                            strokeColor: "#3b82f6",
                            strokeOpacity: 0.8,
                            strokeWeight: 4,
                          }}
                        />
                      )
                    )}
                    {driverPosition && (
                      <MarkerF
                        position={{ lat: driverPosition.lat, lng: driverPosition.lng }}
                        icon={{
                          path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z",
          fillColor: "#2563eb",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          scale: 1.5,
          anchor: new google.maps.Point(12, 22),
                        }}
                        label={{
                          text: "●",
              color: "#2563eb",
              fontSize: "24px",
              fontWeight: "black",
                        }}
                        title="Posisi Anda (GPS)"
                      />
                    )}
                  </GoogleMap>
                </div>

                {/* Map overlay: current destination */}
                {activeStop && !isCompleted && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-10 pb-4 px-6">
                    <div className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-xl border border-slate-100">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          activeStop.status === "completed"
                            ? "bg-emerald-50 text-emerald-600"
                            : activeStop.status === "arrived"
                              ? "bg-blue-50 text-blue-600"
                              : "bg-slate-50 text-slate-400"
                        }`}
                      >
                        {activeStop.sequence}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                              activeStop.stop_type === "PICKUP"
                                ? "bg-blue-50 text-blue-600"
                                : "bg-emerald-50 text-emerald-600"
                            }`}
                          >
                            {activeStop.stop_type}
                          </span>
                          {activeStop.status === "arrived" && (
                            <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">
                              Tiba
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-black text-slate-800 truncate mt-0.5">
                          {activeStop.location_name}
                        </p>
                        <p className="text-[10px] font-medium text-slate-400 truncate">
                          {activeStop.address}
                        </p>
                      </div>
                      <button
                        onClick={() => openInGoogleMaps(activeStop.address)}
                        className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-lg shadow-blue-600/30"
                      >
                        <NavIcon size={20} fill="currentColor" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Route Stops */}
            {totalStops > 0 && (
              <div className="px-6 py-6 space-y-3">
                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <MapPin size={12} /> RUTE PERJALANAN ({completedStops}/
                  {totalStops})
                </h2>
                {jobOrder.routes.map((stop) => (
                  <div
                    key={stop.id}
                    className={`bg-white rounded-2xl p-4 border shadow-sm transition-all ${
                      stop.status === "completed"
                        ? "border-emerald-100 bg-emerald-50/30"
                        : stop.status === "arrived"
                          ? "border-blue-200 ring-2 ring-blue-100"
                          : "border-slate-100"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                          stop.status === "completed"
                            ? "bg-emerald-500 text-white"
                            : stop.status === "arrived"
                              ? "bg-blue-500 text-white"
                              : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {stop.status === "completed" ? (
                          <Check size={14} />
                        ) : (
                          stop.sequence
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                              stop.stop_type === "PICKUP"
                                ? "bg-blue-50 text-blue-600"
                                : "bg-emerald-50 text-emerald-600"
                            }`}
                          >
                            {stop.stop_type}
                          </span>
                          <span className="text-[9px] font-bold text-slate-400">
                            {stop.contact_name}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm mt-0.5 truncate">
                          {stop.location_name}
                        </h3>
                        <p className="text-[10px] font-medium text-slate-400 truncate">
                          {stop.address}
                        </p>

                        {/* Arrival time + elapsed duration */}
                        {(stop.actual_arrival || stop.actual_departure) && (
                          <div className="flex items-center gap-4 mt-2">
                            {stop.actual_arrival && (
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] font-bold text-slate-400 uppercase">
                                  Tiba
                                </span>
                                <span className="text-[10px] font-black text-slate-700">
                                  {formatTime(stop.actual_arrival)}
                                </span>
                              </div>
                            )}
                            {stop.actual_departure ? (
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] font-bold text-slate-400 uppercase">
                                  Berangkat
                                </span>
                                <span className="text-[10px] font-black text-slate-700">
                                  {formatTime(stop.actual_departure)}
                                </span>
                              </div>
                            ) : stop.status === "arrived" && stop.actual_arrival ? (
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                                <span className="text-[8px] font-bold text-blue-600 uppercase tracking-wide">
                                  {formatDuration(parseUTC(stop.actual_arrival)?.getTime() ?? Date.now(), now)}
                                </span>
                              </div>
                            ) : null}
                          </div>
                        )}

                        {/* Removed Action Buttons from Card (Moved to Bottom Nav) */}
                      </div>

                      {/* Bottom Nav for Camera and Navigasi */}
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => openInGoogleMaps(stop.address)}
                          className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center active:scale-95 transition-all border border-blue-100"
                          title="Navigasi"
                        >
                          <NavIcon
                            size={16}
                            fill="currentColor"
                            className="opacity-80"
                          />
                        </button>
                        <div className="relative">
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            id={`photo-${stop.id}`}
                            onChange={(e) => handlePhotoUpload(stop.id, e)}
                          />
                          <label
                            htmlFor={`photo-${stop.id}`}
                            className={`relative w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-all border cursor-pointer ${
                              stop.route_photos?.length || stop.pod_photo_url
                                ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                                : "bg-slate-50 text-slate-400 border-slate-100"
                            }`}
                          >
                            {photoLoading === stop.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : stop.route_photos?.length || stop.pod_photo_url ? (
                              <Camera size={14} />
                            ) : (
                              <Camera size={14} />
                            )}
                            {(stop.route_photos?.length || 0) > 0 && (
                              <span className="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-0.5 rounded-full bg-emerald-500 text-white text-[8px] font-black flex items-center justify-center">
                                {stop.route_photos!.length}
                              </span>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* Photos Thumbnails */}
                    {(Array.isArray(stop.route_photos) && stop.route_photos.length > 0 || !!stop.pod_photo_url) && (
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="flex items-center gap-2 mb-2">
                          <Camera size={12} className="text-emerald-600" />
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            Foto Lokasi ({Array.isArray(stop.route_photos) ? stop.route_photos.length : 1})
                          </p>
                        </div>
                        <div className="flex gap-2 overflow-x-auto">
                          {(Array.isArray(stop.route_photos) && stop.route_photos.length
                            ? stop.route_photos
                            : stop.pod_photo_url
                              ? [{ id: stop.id, file_url: stop.pod_photo_url! }]
                              : []
                          ).map((photo: any, idx: number) => (
                            <div
                              key={photo.id || idx}
                              onClick={() =>
                                setSelectedPhotoPreview(photo.file_url)
                              }
                              className="w-14 h-14 shrink-0 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 cursor-pointer active:scale-[0.98] transition-all"
                            >
                              <img
                                src={photo.file_url}
                                alt={`Foto lokasi ${idx + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Container & Seal Input */}
            <div className="px-6 pb-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Box size={16} className="text-indigo-600" />
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">
                      Kontainer & Seal
                    </p>
                  </div>
                  {(jobOrder.container_number ||
                    jobOrder.sbu_metadata?.seal_number) && (
                    <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-emerald-200">
                      TERISI
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Kontainer
                    </label>
                    <input
                      type="text"
                      placeholder="TGHU-123456-7"
                      value={containerNo}
                      onChange={(e) =>
                        setContainerNo(e.target.value.toUpperCase())
                      }
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold uppercase text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                      Seal
                    </label>
                    <input
                      type="text"
                      placeholder="SL-98765"
                      value={sealNo}
                      onChange={(e) => setSealNo(e.target.value.toUpperCase())}
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold uppercase text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>
                <button
                  onClick={saveContainerInfo}
                  disabled={savingContainer || (!containerNo && !sealNo)}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                >
                  {savingContainer ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <>
                      <Check size={14} /> SIMPAN
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Documents */}
            {jobOrder.assignment_documents &&
              jobOrder.assignment_documents.length > 0 && (
                <div className="px-6 pb-4">
                  <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-sm space-y-3">
                    <div className="flex items-center gap-2">
                      <FolderGit2 size={16} className="text-blue-600" />
                      <p className="text-xs font-black text-slate-800 uppercase tracking-tight">
                        Dokumen
                      </p>
                    </div>
                    <div className="space-y-2">
                      {jobOrder.assignment_documents.map(
                        (doc: any, idx: number) => (
                          <a
                            key={doc.id || idx}
                            href={doc.file_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 bg-blue-50/50 border border-blue-200/60 rounded-xl p-3 active:scale-[0.98] transition-all"
                          >
                            <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 border border-blue-100">
                              {doc.name?.endsWith(".pdf") ||
                              doc.file_type?.includes("pdf") ? (
                                <FileText size={16} className="text-red-500" />
                              ) : (
                                <ImageIcon
                                  size={16}
                                  className="text-blue-500"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-bold text-slate-800 truncate">
                                {doc.name}
                              </p>
                              <p className="text-[9px] text-slate-400">
                                {doc.file_size || ""}
                              </p>
                            </div>
                            <Eye size={14} className="text-blue-500 shrink-0" />
                          </a>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              )}

            {/* Manual Completion Button Removed */}

            {/* Completed Screen */}
            {isCompleted && (
              <div className="px-6 pb-8 pt-4">
                <div className="bg-emerald-50 border-4 border-emerald-500 rounded-2xl p-8 text-center shadow-xl">
                  <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg shadow-emerald-500/30">
                    🏁
                  </div>
                  <h2 className="text-xl font-black text-emerald-800 uppercase tracking-tight mb-2">
                    PEKERJAAN SELESAI
                  </h2>
                  <p className="text-xs font-bold text-slate-600 mb-4">
                    Tugas telah ditutup oleh sistem.
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-emerald-200 text-emerald-700 font-black text-xs uppercase tracking-widest">
                    <CheckCircle2 size={14} /> {jobOrder.status.toUpperCase()}
                  </div>
                </div>
              </div>
            )}
          </main>
        </>
      )}

      {/* Photo Overlay Modal */}
      {selectedPhotoPreview && (
        <div
          className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setSelectedPhotoPreview(null)}
        >
          <div
            className="relative max-w-4xl w-full h-full max-h-[80vh] flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute -top-12 right-0 text-white hover:text-slate-300 flex items-center gap-2 font-black uppercase text-xs tracking-widest"
              onClick={() => setSelectedPhotoPreview(null)}
            >
              Close <X className="w-6 h-6" />
            </button>
            <div className="relative w-full h-full bg-white rounded-3xl overflow-hidden shadow-2xl">
              <img
                src={selectedPhotoPreview}
                alt="Evidence Full"
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Floating SOS Button */}
      {isActive && (
        <button
          onClick={() => setPanicModalOpen(true)}
          className="fixed bottom-24 right-6 z-50 w-14 h-14 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex flex-col items-center justify-center shadow-[0_8px_30px_rgb(225,29,72,0.3)] border-2 border-rose-300 active:scale-90 transition-all animate-pulse"
          title="Tombol Darurat SOS"
        >
          <span className="text-xl leading-none">🚨</span>
          <span className="text-[9px] font-black uppercase tracking-tighter mt-0.5">
            SOS
          </span>
        </button>
      )}

      {/* Panic Modal */}
      {panicModalOpen && (
        <div
          className="fixed inset-0 z-[1100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto"
          onClick={() => !panicSending && setPanicModalOpen(false)}
        >
          <div
            className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full shadow-2xl border-4 border-rose-500 relative my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl animate-bounce">
              🚨
            </div>
            <h3 className="text-lg font-black text-center text-slate-900 uppercase tracking-tight mb-1">
              Sinyal Darurat SOS
            </h3>
            <p className="text-[11px] text-center font-bold text-slate-500 mb-5 leading-relaxed">
              GPS & status muatan langsung terkirim ke Head Ops HQ!
            </p>

            <div className="space-y-2 mb-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                1. Apa yang Anda Butuhkan?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "swap_fleet", label: "Ganti Armada", icon: "🚛" },
                  { id: "swap_driver", label: "Ganti Supir", icon: "🧑‍✈️" },
                  { id: "general", label: "Darurat Lain", icon: "🚨" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPanicType(item.id as any);
                      if (!panicReason) {
                        setPanicReason(
                          item.id === "swap_fleet"
                            ? "Mesin mogok / radiator bocor tidak bisa jalan"
                            : item.id === "swap_driver"
                              ? "Sakit demam / kecapekan tidak kuat lanjut nyetir"
                              : "Kendala keamanan / hadangan di perjalanan",
                        );
                      }
                    }}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1 transition-all ${
                      panicType === item.id
                        ? "bg-rose-50 border-rose-500 text-rose-700 font-black shadow-sm ring-2 ring-rose-200"
                        : "bg-slate-50 border-slate-200 text-slate-600 font-bold hover:bg-slate-100"
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-[10px] uppercase tracking-tight leading-tight">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                2.{" "}
                {panicType === "swap_fleet"
                  ? "Kenapa Minta Ganti Armada?"
                  : panicType === "swap_driver"
                    ? "Kenapa Minta Ganti Supir?"
                    : "Keterangan Situasi:"}
              </label>
              <textarea
                value={panicReason}
                onChange={(e) => setPanicReason(e.target.value)}
                placeholder="Tulis alasan singkat..."
                rows={2}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">
                3. Ada Muatan?
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPanicHasCargo(true)}
                  className={`py-3 rounded-xl border text-xs font-black transition-all uppercase tracking-wider ${panicHasCargo ? "bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-300" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"}`}
                >
                  ⚠️ YA, ADA MUATAN
                </button>
                <button
                  type="button"
                  onClick={() => setPanicHasCargo(false)}
                  className={`py-3 rounded-xl border text-xs font-black transition-all uppercase tracking-wider ${!panicHasCargo ? "bg-slate-800 text-white border-slate-900 shadow-md ring-2 ring-slate-400" : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"}`}
                >
                  ✖️ TIDAK / KOSONG
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPanicModalOpen(false)}
                disabled={panicSending}
                className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase tracking-wider transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={panicSending}
                onClick={async () => {
                  setPanicSending(true);
                  try {
                    const location = await getLocation();
                    const res = await fetch(`/api/jo/${token}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        action: "panic_button",
                        panic_type: panicType,
                        reason:
                          panicReason ||
                          (panicType === "swap_fleet"
                            ? "Minta Ganti Armada"
                            : panicType === "swap_driver"
                              ? "Minta Ganti Supir"
                              : "Darurat SOS"),
                        has_cargo: panicHasCargo,
                        lat: location?.lat,
                        lng: location?.lng,
                      }),
                    });
                    if (!res.ok)
                      throw new Error("Gagal mengirim sinyal darurat");
                    toast.error("🚨 SINYAL DARURAT TERKIRIM KE HEAD OPS HQ!", {
                      duration: 8000,
                    });
                    if (navigator.vibrate)
                      navigator.vibrate([500, 200, 500, 200, 1000]);
                    setPanicModalOpen(false);
                  } catch (err: any) {
                    toast.error(err.message);
                  } finally {
                    setPanicSending(false);
                  }
                }}
                className="py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 active:scale-95"
              >
                {panicSending ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  "KIRIM SOS NOW"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      {isActive && jobOrder && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 px-6 py-4 pb-6 z-40 flex items-center justify-around shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.1)]">
          {(() => {
            const activeStop =
              jobOrder.routes?.find((s: any) => s.status !== "completed") ||
              jobOrder.routes?.[jobOrder.routes.length - 1];
            return (
              <>
                <button
                  onClick={() =>
                    activeStop && openInGoogleMaps(activeStop.address)
                  }
                  className="flex flex-col items-center gap-1.5 text-blue-600 active:scale-95 transition-all group"
                >
                  <div className="w-12 h-12 bg-blue-50 group-hover:bg-blue-100 rounded-[1.25rem] flex items-center justify-center transition-all">
                    <NavIcon size={22} fill="currentColor" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                    Navigasi
                  </span>
                </button>

                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    id={`photo-bottom`}
                    onChange={(e) =>
                      activeStop && handlePhotoUpload(activeStop.id, e)
                    }
                  />
                  <label
                    htmlFor={`photo-bottom`}
                    className={`relative flex flex-col items-center gap-1.5 active:scale-95 transition-all cursor-pointer group ${activeStop?.route_photos?.length ? "text-emerald-600" : "text-slate-700"}`}
                  >
                    <div
                      className={`w-12 h-12 rounded-[1.25rem] flex items-center justify-center transition-all ${activeStop?.route_photos?.length ? "bg-emerald-50" : "bg-slate-100 group-hover:bg-slate-200"}`}
                    >
                      {activeStop ? (
                        photoLoading === activeStop.id ? (
                          <Loader2
                            size={22}
                            className="animate-spin text-emerald-600"
                          />
                        ) : (
                          <Camera size={22} className="text-slate-600" />
                        )
                      ) : (
                        <Camera size={22} className="text-slate-600" />
                      )}
                    </div>
                    {activeStop?.route_photos?.length ? (
                      <span className="absolute -top-1 right-4 min-w-4 h-4 px-0.5 rounded-full bg-emerald-500 text-white text-[8px] font-black flex items-center justify-center">
                        {activeStop.route_photos.length}
                      </span>
                    ) : null}
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                      Foto Lokasi
                    </span>
                  </label>
                </div>

                <button
                  onClick={() => {
                    // For Remarks, you can attach it to SOS modal or separate later.
                    // The user requested keeping Remarks icon in bottom nav.
                    window.alert("Fitur Remarks akan segera hadir.");
                  }}
                  className="flex flex-col items-center gap-1.5 text-slate-700 active:scale-95 transition-all group"
                >
                  <div className="w-12 h-12 bg-slate-100 group-hover:bg-slate-200 rounded-[1.25rem] flex items-center justify-center transition-all">
                    <MessageSquare size={22} className="text-slate-600" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-600">
                    Remarks
                  </span>
                </button>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
