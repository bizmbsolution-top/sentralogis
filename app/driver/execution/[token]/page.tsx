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
  Lock,
  Box,
  FileText,
  Download,
  Eye,
  MessageSquare,
  Satellite,
  Wifi,
  Send,
  Coins,
  ArrowLeft,
  AlertOctagon,
  Info,
  LogOut,
} from "lucide-react";
import { toast, Toaster } from "react-hot-toast";
import { useGoogleMaps } from "@/lib/google-maps-context";
import {
  GoogleMap,
  MarkerF,
  PolylineF,
  DirectionsRenderer,
} from "@react-google-maps/api";
import { useDriverGpsPing, isActiveTransitStatus } from "@/lib/hooks/useDriverGpsPing";
import { formatDateUTC } from "@/lib/utils/dateUtils";
import AlertInfoModal from "./components/AlertInfoModal";
import { useTTS } from "@/lib/hooks/useTTS";
import { useDriverAuth } from "@/lib/hooks/useDriverAuth";
import InfoPerangkat from "../../components/InfoPerangkat";
import React from "react";

// Error Boundary for Google Maps to prevent page crashes if API Key is restricted
class MapErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean}> {
  constructor(props: {children: React.ReactNode}) {
    super(props);
    this.state = { hasError: false };
  }
  
  componentDidMount() {
    // Google Maps API calls this global function on authentication failure (e.g. invalid API key, restricted domain)
    (window as any).gm_authFailure = () => {
      this.setState({ hasError: true });
    };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true };
  }
  componentDidCatch(error: any, errorInfo: any) {
    console.warn("Map rendering error:", error);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-full flex items-center justify-center bg-slate-100 text-slate-400 p-4 text-center rounded-2xl">
          <div className="flex flex-col items-center gap-2">
            <MapPin size={24} className="opacity-50" />
            <span className="text-xs font-bold">Peta tidak tersedia (API Key Error)</span>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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
  driver?: {
    id: string;
    name: string;
    phone: string;
    driver_type?: string;
  };
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
  tracking_logs?: any[];
}

export default function JoExecutionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const { isLoaded } = useGoogleMaps();
  const { session, isLoading: sessionLoading } = useDriverAuth();

  // Consistent Native Detection Source of Truth
  const isNativeApp = typeof window !== "undefined" ? (
    Capacitor.isNativePlatform() || 
    navigator.userAgent.includes("SentraLogis_AndroidApp") ||
    /(Android.*WebView|wv)/i.test(navigator.userAgent) ||
    window.location.protocol === "sentralogis:"
  ) : false;

  useEffect(() => {
    console.log("[ROUTE_FORENSIC] DRIVER_EXECUTION");
    console.log("[ROUTE_FORENSIC] current pathname = /driver/execution/" + token);
    
    console.log("[DETECTION_FORENSIC] window_type=", typeof window);
    console.log("[DETECTION_FORENSIC] navigator_type=", typeof navigator);
    if (typeof window !== "undefined") {
      console.log("[DETECTION_FORENSIC] capacitor_isNative=", Capacitor.isNativePlatform());
      console.log("[DETECTION_FORENSIC] userAgent=", navigator.userAgent);
      console.log("[DETECTION_FORENSIC] ua_sentralogis=", navigator.userAgent.includes("SentraLogis_AndroidApp"));
      console.log("[DETECTION_FORENSIC] ua_android_webview=", /(Android.*WebView|wv)/i.test(navigator.userAgent));
      console.log("[DETECTION_FORENSIC] protocol=", window.location.protocol);
      
      let maskedHref = window.location.href;
      if (token && maskedHref.includes(token)) {
        maskedHref = maskedHref.replace(token, "[MASKED_TOKEN]");
      }
      console.log("[DETECTION_FORENSIC] pathname=", window.location.pathname.replace(token, "[MASKED_TOKEN]"));
      console.log("[DETECTION_FORENSIC] href=", maskedHref);
      
      // VISUAL INJECTION FOR DEVICE SCREENSHOT
      const div = document.createElement("div");
      div.id = "diagnostic-overlay";
      div.style.position = "fixed";
      div.style.top = "0";
      div.style.left = "0";
      div.style.right = "0";
      div.style.backgroundColor = "rgba(0,0,0,0.85)";
      div.style.color = "#0f0";
      div.style.fontSize = "10px";
      div.style.padding = "8px";
      div.style.zIndex = "99999";
      div.style.wordBreak = "break-all";
      div.style.maxHeight = "50vh";
      div.style.overflowY = "auto";
      div.innerHTML = `
        <b>DIAGNOSTIC FORENSIC</b><br/>
        cap_isNative: ${Capacitor.isNativePlatform()}<br/>
        ua: ${navigator.userAgent}<br/>
        ua_sl: ${navigator.userAgent.includes("SentraLogis_AndroidApp")}<br/>
        ua_wv: ${/(Android.*WebView|wv)/i.test(navigator.userAgent)}<br/>
        prot: ${window.location.protocol}<br/>
        isNativeApp: ${isNativeApp}
      `;
      document.body.appendChild(div);
    }
    console.log("[DETECTION_FORENSIC] final_isNativeApp=", isNativeApp);
    
    return () => {
      if (typeof document !== "undefined") {
        const el = document.getElementById("diagnostic-overlay");
        if (el) el.remove();
      }
    };

    console.log("[READINESS_FORENSIC] EXECUTION PAGE MOUNT");
    console.log("[READINESS_FORENSIC] TOKEN IN EXECUTION:", token);
    const storedToken = localStorage.getItem("pending_jo_token");
    console.log("[READINESS_FORENSIC] pending_jo_token AT EXECUTION:", storedToken);
    console.log("[READINESS_FORENSIC] IS_NATIVE_EXECUTION:", isNativeApp);
  }, [token, isNativeApp]);

  const [isNative, setIsNative] = useState<boolean>(true);
  const [gpsStatus, setGpsStatus] = useState<
    "active" | "inactive" | "error" | "loading"
  >("loading");
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsBattery, setGpsBattery] = useState<number | null>(null);
  const [gpsSpeed, setGpsSpeed] = useState<number | null>(null);
  const [gpsPingCount, setGpsPingCount] = useState<number>(0);
  const [gpsErrorMessage, setGpsErrorMessage] = useState<string | null>(null);

  const [readinessComplete, setReadinessComplete] = useState(false);
  const { speak: ttsSpeak } = useTTS();

  const [jobOrder, setJobOrder] = useState<JobOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState<string | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);

  const [containerNo, setContainerNo] = useState("");
  const [sealNo, setSealNo] = useState("");
  const [savingContainer, setSavingContainer] = useState(false);

  const [driverPosition, setDriverPosition] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  const [isBlocked, setIsBlocked] = useState(false);

  const [infoOpen, setInfoOpen] = useState(false);

  const [remarkText, setRemarkText] = useState<Record<string, string>>({});
  const [sosOpen, setSosOpen] = useState(false);
  const [sosCategory, setSosCategory] = useState("general");
  const [sosDescription, setSosDescription] = useState("");
  const [sosLoading, setSosLoading] = useState(false);
  const [directionsResponse, setDirectionsResponse] = useState<any>(null);
  

  // 1. Session Auth Check
  useEffect(() => {
    if (!sessionLoading && !session) {
      router.replace(`/driver/login?redirect=/driver/execution/${token}`);
    }
  }, [session, sessionLoading, router, token]);

  // 2. Fetch Job Order
  const fetchJobOrder = useCallback(async () => {
    if (!session || !token) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/jo/${token}`, {
        headers: {
          "X-Driver-ID": session?.driver_id || "",
        },
      });

      if (!res.ok) {
        throw new Error("Job Order tidak ditemukan");
      }

      const data = await res.json();
      const jo = data.jobOrder || data.data || data;
      setJobOrder(jo);

      // Verify Assignment (Cross-Tenant Profile ID)
      if (
        !session?.profile_id ||
        !jo?.driver?.profile_id ||
        jo.driver.profile_id !== session.profile_id
      ) {
        setIsBlocked(true);
      } else {
        setIsBlocked(false);
      }

      if (jo.container_number) setContainerNo(jo.container_number);
      if (jo.sbu_metadata?.seal_number) setSealNo(jo.sbu_metadata.seal_number);
    } catch (err: any) {
      setError(err.message || "Gagal memuat detail JO");
    } finally {
      setLoading(false);
    }
  }, [token, session]);

  useEffect(() => {
    fetchJobOrder();
  }, [fetchJobOrder]);

  // Live driver position watcher for map
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    let cancelled = false;
    const onPos = (pos: GeolocationPosition) => {
      if (cancelled) return;
      setDriverPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    };
    const onErr = () => {};
    navigator.geolocation.getCurrentPosition(onPos, onErr, {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 15000,
    });
    const watchId = navigator.geolocation.watchPosition(onPos, onErr, {
      enableHighAccuracy: true,
      maximumAge: 10000,
      timeout: 20000,
    });
    return () => {
      cancelled = true;
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId);
    };
  }, []);

  const routeStopsWithCoords = (jobOrder?.routes || []).filter(
    (s) => s.latitude && s.longitude,
  );
  const firstStopPos =
    routeStopsWithCoords.length > 0
      ? {
          lat: Number(routeStopsWithCoords[0].latitude),
          lng: Number(routeStopsWithCoords[0].longitude),
        }
      : { lat: -6.2, lng: 106.8 };
  const mapCenter = driverPosition || firstStopPos;
  const polylinePath = routeStopsWithCoords.map((s) => ({
    lat: Number(s.latitude),
    lng: Number(s.longitude),
  }));

  // Fetch real driving route (follows roads) between stops
  useEffect(() => {
    if (
      !isLoaded ||
      routeStopsWithCoords.length < 2 ||
      typeof google === "undefined"
    )
      return;
    const dirService = new google.maps.DirectionsService();
    const origin = driverPosition || {
      lat: Number(routeStopsWithCoords[0].latitude),
      lng: Number(routeStopsWithCoords[0].longitude),
    };
    const last = routeStopsWithCoords[routeStopsWithCoords.length - 1];
    const destination = { lat: Number(last.latitude), lng: Number(last.longitude) };
    const waypoints = routeStopsWithCoords.slice(1, -1).map((s) => ({
      location: { lat: Number(s.latitude), lng: Number(s.longitude) },
      stopover: true,
    }));
    dirService.route(
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, JSON.stringify(polylinePath)]);

  // Active GPS tracking hook
  const activeGpsToken = jobOrder?.id || token;

  useDriverGpsPing(
    activeGpsToken,
    jobOrder?.status,
    !!jobOrder,
    undefined,
    jobOrder?.started_at,
    isNativeApp,
    undefined,
    (state) => {
      if (state.status && state.status !== "recovering") setGpsStatus(state.status);
      if (state.accuracy !== undefined) setGpsAccuracy(state.accuracy);
      if (state.battery !== undefined) setGpsBattery(state.battery);
      if (state.speed !== undefined) setGpsSpeed(state.speed);
      if (state.pingCount !== undefined) setGpsPingCount(state.pingCount);
      if (state.errorMessage !== undefined) setGpsErrorMessage(state.errorMessage);
    }
  );

  const handleReadinessComplete = useCallback(() => {
    setReadinessComplete(true);
    ttsSpeak("Persiapan selesai. Selamat bertugas.", true);
  }, [ttsSpeak]);

  const updateRouteStatus = async (routeId: string, routeStatus: string) => {
    if (!session) return;
    setUpdating(routeId);
    try {
      const response = await fetch(`/api/jo/${token}`, {
        method: "PATCH",
        headers: {
          "X-Driver-ID": session.driver_id,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "route_status",
          route_id: routeId,
          route_status: routeStatus,
        }),
      });

      if (!response.ok) {
        throw new Error("Gagal memperbarui status rute");
      }

      toast.success("Status rute berhasil diperbarui!");
      await fetchJobOrder();
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui status rute");
    } finally {
      setUpdating(null);
    }
  };

  const handleSaveContainer = async () => {
    if (!session) return;
    setSavingContainer(true);
    try {
      const response = await fetch(`/api/jo/${token}`, {
        method: "PATCH",
        headers: {
          "X-Driver-ID": session.driver_id,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "update_container",
          container_number: containerNo,
          seal_number: sealNo,
        }),
      });

      if (!response.ok) throw new Error("Gagal menyimpan kontainer");
      toast.success("Nomor Kontainer & Seal berhasil disimpan!");
      await fetchJobOrder();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan kontainer");
    } finally {
      setSavingContainer(false);
    }
  };

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    routeId: string,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !session) return;
    setPhotoLoading(routeId);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await fetch(`/api/jo/${token}`, {
        method: "PATCH",
        headers: {
          "X-Driver-ID": session.driver_id,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          route_id: routeId,
          pod_photo_base64: base64,
          pod_photo_name: file.name,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Gagal simpan foto");
      }

      toast.success("Foto lokasi berhasil diunggah");
      await fetchJobOrder();
    } catch (err: any) {
      toast.error("Error foto: " + err.message);
    } finally {
      setPhotoLoading(null);
      e.target.value = "";
    }
  };

  const openNavigation = (stop: RouteStop) => {
    if (!stop.latitude || !stop.longitude) {
      toast.error("Lokasi tujuan tidak memiliki koordinat");
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}&travelmode=driving`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleRemarkSubmit = async (routeId: string) => {
    if (!session) return;
    const note = (remarkText[routeId] || "").trim();
    if (!note) return;
    setUpdating("remark_" + routeId);
    try {
      let lat: number | null = null;
      let lng: number | null = null;
      if (navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            () => resolve(null),
            { timeout: 5000 },
          );
        });
        if (pos) {
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        }
      }

      const response = await fetch(`/api/jo/${token}`, {
        method: "PATCH",
        headers: {
          "X-Driver-ID": session.driver_id,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "add_timeline_event",
          route_id: routeId,
          route_notes: note,
          lat,
          lng,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Gagal menyimpan remarks");
      }

      toast.success("Remarks berhasil dikirim");
      setRemarkText((prev) => ({ ...prev, [routeId]: "" }));
      await fetchJobOrder();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan remarks");
    } finally {
      setUpdating(null);
    }
  };

  const handleSOSSubmit = async () => {
    if (!session) return;
    setSosLoading(true);
    try {
      let lat: number | null = null;
      let lng: number | null = null;
      if (navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition | null>((resolve) => {
          navigator.geolocation.getCurrentPosition(
            resolve,
            () => resolve(null),
            { timeout: 5000 },
          );
        });
        if (pos) {
          lat = pos.coords.latitude;
          lng = pos.coords.longitude;
        }
      }

      const response = await fetch(`/api/jo/${token}`, {
        method: "PATCH",
        headers: {
          "X-Driver-ID": session.driver_id,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "panic_button",
          panic_type: sosCategory,
          reason: sosDescription || "Kondisi Darurat di Jalan",
          lat,
          lng,
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Gagal mengirim SOS");
      }

      toast.success("🚨 SOS DITERIMA HEAD OPS HQ!", { duration: 6000 });
      if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
      setSosOpen(false);
      setSosDescription("");
    } catch (err: any) {
      toast.error(err.message || "Gagal mengirim SOS");
    } finally {
      setSosLoading(false);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-400">Menyiapkan Halaman Pelacakan...</p>
      </div>
    );
  }

  if (isBlocked) {
    return (
      <div className="min-h-[100dvh] bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900 rounded-3xl p-8 max-w-sm text-center shadow-2xl border border-rose-500/20">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-6" />
          <h2 className="text-xl font-black text-white mb-2 uppercase tracking-tight">
            Akses Ditolak
          </h2>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">
            Order ini tidak ditugaskan kepada akun driver Anda.
          </p>
          <button
            onClick={() => router.push("/driver/portal")}
            className="w-full py-4 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold text-xs uppercase tracking-widest transition-all"
          >
            KEMBALI KE PORTAL
          </button>
        </div>
      </div>
    );
  }

  if (error || !jobOrder) {
    return (
      <div className="min-h-[100dvh] bg-slate-950 flex items-center justify-center p-6">
        <div className="bg-slate-900 rounded-3xl p-8 max-w-sm text-center shadow-2xl border border-slate-800 text-white">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
          <h2 className="text-lg font-bold mb-2 uppercase">Gagal Memuat Order</h2>
          <p className="text-slate-400 text-xs mb-8">{error}</p>
          <button
            onClick={() => router.push("/driver/portal")}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-bold text-xs uppercase tracking-widest"
          >
            KEMBALI KE PORTAL
          </button>
        </div>
      </div>
    );
  }

  // Stage 5 Readiness Gate (Appears ONLY AFTER acceptance when readiness is not complete)
  // DELETED: We now skip the readiness gate entirely for all job orders as requested

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 pb-32">
      <Toaster position="top-center" containerStyle={{ top: 70 }} />

      {/* Top Bar */}
      <div className="bg-white border-b border-slate-200 p-4 sticky top-0 z-40 flex items-center justify-between">
        <button
          onClick={() => router.push("/driver/portal")}
          className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-wider transition-colors"
        >
          <ArrowLeft size={16} /> Portal
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setInfoOpen(true)}
            className="w-8 h-8 bg-slate-100 border border-slate-300 text-slate-600 rounded-lg flex items-center justify-center hover:bg-slate-200 transition-all"
            title="Info Perangkat"
          >
            <Info size={14} />
          </button>
          <button
            onClick={() => {
              localStorage.removeItem("sentralogis_driver_session");
              router.push("/driver/portal");
            }}
            className="w-8 h-8 bg-rose-50 border border-rose-200 text-rose-500 rounded-lg flex items-center justify-center hover:bg-rose-100 transition-all ml-1"
            title="Keluar"
          >
            <LogOut size={14} />
          </button>
        </div>
      </div>

      {/* Header Card: JO ID + Fleet + Live GPS */}
      <div className="p-4 max-w-lg mx-auto">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm text-center">
          <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">
            {jobOrder.jo_number}
          </p>
          <p className="text-sm font-bold text-slate-900 uppercase mb-2">
            {jobOrder.fleet?.plate_number || "PELAKSANAN ORDER"}
          </p>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-emerald-700 text-[10px] font-bold uppercase">
            <Satellite size={10} className="animate-pulse" /> LIVE GPS
          </div>
        </div>
      </div>

      {/* Live Driver Map */}
      <div className="p-4 pb-0 max-w-lg mx-auto">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
              <Satellite size={16} className="text-blue-500" /> Peta Lokasi Driver
            </h3>
            <span
              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                driverPosition
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "bg-slate-100 text-slate-500 border border-slate-200"
              }`}
            >
               {driverPosition ? "LIVE" : "MENCARI SINYAL..."}
            </span>
          </div>
          <div className="h-64 rounded-2xl overflow-hidden border border-slate-200 relative bg-slate-50">
            {isLoaded ? (
              <MapErrorBoundary>
                <GoogleMap
                mapContainerStyle={{ width: "100%", height: "100%" }}
                center={mapCenter}
                zoom={driverPosition ? 14 : 11}
                options={{
                  disableDefaultUI: false,
                  zoomControl: true,
                  mapTypeControl: false,
                  streetViewControl: false,
                  fullscreenControl: true,
                }}
              >
                {directionsResponse ? (
                  <DirectionsRenderer
                    directions={directionsResponse}
                    options={{
                      suppressMarkers: true,
                      polylineOptions: {
                        strokeColor: "#6366f1",
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
                        strokeColor: "#6366f1",
                        strokeOpacity: 0.85,
                        strokeWeight: 4,
                      }}
                    />
                  )
                )}
                {routeStopsWithCoords.map((stop, i) => (
                  <MarkerF
                    key={stop.id}
                    position={{
                      lat: Number(stop.latitude),
                      lng: Number(stop.longitude),
                    }}
                    label={{
                      text: String(i + 1),
                      color: "#ffffff",
                      fontWeight: "bold",
                      fontSize: "11px",
                    }}
                  />
                ))}
                {driverPosition && (
                  <MarkerF
                    position={driverPosition}
                    icon={
                      typeof window !== "undefined" && window.google
                        ? {
                            path: window.google.maps.SymbolPath.CIRCLE,
                            scale: 10,
                            fillColor: "#3b82f6",
                            fillOpacity: 1,
                            strokeColor: "#ffffff",
                            strokeWeight: 3,
                          }
                        : undefined
                    }
                    title="Lokasi Anda"
                  />
                )}
              </GoogleMap>
              </MapErrorBoundary>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
                <p className="text-[10px] font-bold text-slate-500 uppercase ml-2">
                  Memuat Peta...
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Execution Tracking UI */}
      <div className="p-4 space-y-6 max-w-lg mx-auto">
        {/* Container & Seal Form (if applicable) */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4 shadow-sm">
          <div className="flex items-center gap-2">
            <Box size={18} className="text-indigo-600" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-600">
              Data Kontainer & Seal
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                No Kontainer
              </label>
              <input
                type="text"
                value={containerNo}
                onChange={(e) => setContainerNo(e.target.value.toUpperCase())}
                placeholder="SEAU1234567"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                No Seal
              </label>
              <input
                type="text"
                value={sealNo}
                onChange={(e) => setSealNo(e.target.value.toUpperCase())}
                placeholder="SL890123"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>
          <button
            onClick={handleSaveContainer}
            disabled={savingContainer}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
          >
            {savingContainer ? "Menyimpan..." : "Simpan Data Kontainer"}
          </button>
        </div>

        {/* Route Stops Progress */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4 shadow-sm">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-600 flex items-center gap-2">
            <MapPin size={18} className="text-emerald-500" /> Progress Rute & Perjalanan
          </h3>

          <div className="space-y-4 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
            {jobOrder.routes?.map((stop, idx) => {
              const isDone = stop.status === "completed";
              const isArrived = stop.status === "arrived";

              return (
                <div key={stop.id} className="relative pl-10">
                  <div
                    className={`absolute left-2.5 top-1.5 -translate-x-1/2 w-4 h-4 rounded-full border-2 ${
                      isDone
                        ? "bg-emerald-500 border-emerald-400"
                        : isArrived
                          ? "bg-amber-500 border-amber-400"
                          : "bg-slate-300 border-slate-400"
                    }`}
                  />

                  <div className="bg-white/80 p-4 rounded-2xl border border-slate-200/80 space-y-2 shadow-sm">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          STOP {idx + 1} — {stop.stop_type}
                        </span>
                        <h4 className="font-bold text-sm text-slate-900">{stop.location_name}</h4>
                      </div>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isDone
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : isArrived
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}
                      >
                        {stop.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500">{stop.address}</p>

                    {stop.contact_name && (
                      <p className="text-xs text-slate-500">
                        {stop.contact_name}
                        {stop.contact_phone ? ` • ${stop.contact_phone}` : ""}
                      </p>
                    )}

                    {/* Petunjuk (Directions) + Foto */}
                    <div className="pt-1 flex gap-2">
                      <button
                        onClick={() => openNavigation(stop)}
                        disabled={!stop.latitude || !stop.longitude}
                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 border border-slate-200"
                      >
                        <NavIcon size={13} /> Petunjuk
                      </button>
                      <label className="flex-1 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-indigo-200">
                        <Camera size={13} />
                        {photoLoading === stop.id ? "Upload..." : "Foto"}
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          disabled={photoLoading === stop.id}
                          onChange={(e) => handlePhotoUpload(e, stop.id)}
                        />
                      </label>
                    </div>

                    {/* Photo thumbnails */}
                    {((stop.route_photos && stop.route_photos.length > 0) ||
                      stop.pod_photo_url) && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {stop.route_photos?.map((p) => (
                          <img
                            key={p.id}
                            src={p.file_url}
                            alt={p.document_name || "Foto lokasi"}
                            className="w-16 h-16 rounded-lg object-cover border border-slate-200 cursor-pointer"
                            onClick={() => setSelectedPhotoPreview(p.file_url)}
                          />
                        ))}
                        {stop.pod_photo_url &&
                          !stop.route_photos?.some((p) => p.file_url === stop.pod_photo_url) && (
                            <img
                              src={stop.pod_photo_url}
                              alt="Foto lokasi terbaru"
                              className="w-16 h-16 rounded-lg object-cover border border-slate-200 cursor-pointer"
                              onClick={() => setSelectedPhotoPreview(stop.pod_photo_url!)}
                            />
                          )}
                      </div>
                    )}

                    {/* Existing remarks */}
                    {(jobOrder.tracking_logs || []).some(
                      (log: any) => log.job_route_id === stop.id && log.notes,
                    ) && (
                      <div className="pt-1 space-y-1.5">
                        {(jobOrder.tracking_logs || [])
                          .filter((log: any) => log.job_route_id === stop.id && log.notes)
                          .map((log: any) => (
                            <div
                              key={log.id}
                              className="flex items-start gap-2 bg-slate-50 rounded-lg px-3 py-2 border border-slate-200"
                            >
                              <MessageSquare size={12} className="text-slate-500 mt-0.5 shrink-0" />
                              <div>
                                <p className="text-[10px] text-slate-700 leading-snug">{log.notes}</p>
                                {log.created_at && (
                                  <p className="text-[9px] text-slate-500 mt-0.5">
                                    {formatDateUTC(log.created_at)}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}

                    {/* Remarks input */}
                    <div className="pt-1">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={remarkText[stop.id] || ""}
                          onChange={(e) =>
                            setRemarkText((prev) => ({
                              ...prev,
                              [stop.id]: e.target.value,
                            }))
                          }
                          placeholder="Tulis remarks / catatan lokasi..."
                          className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={() => handleRemarkSubmit(stop.id)}
                          disabled={updating === "remark_" + stop.id}
                          className="px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl transition-all disabled:opacity-50 flex items-center justify-center"
                          title="Kirim remarks"
                        >
                          <Send size={14} />
                        </button>
                      </div>
                    </div>

                    {/* Action Buttons for Route Stop */}
                    {!isDone && (
                      <div className="pt-2 flex gap-2">
                        {!isArrived && (
                          <button
                            onClick={() => updateRouteStatus(stop.id, "arrived")}
                            disabled={updating === stop.id}
                            className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                          >
                            Tiba Di Lokasi
                          </button>
                        )}
                        {isArrived && (
                          <button
                            onClick={() => updateRouteStatus(stop.id, "completed")}
                            disabled={updating === stop.id}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all"
                          >
                            Selesai & Berangkat
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* SOS Floating Button */}
      <button
        onClick={() => setSosOpen(true)}
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-600/40 flex items-center justify-center active:scale-95 transition-all border-2 border-rose-400"
        title="SOS Darurat"
      >
        <AlertOctagon size={24} />
      </button>

      {/* SOS Confirmation Modal */}
      {sosOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full border border-rose-200 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 flex items-center justify-center text-rose-600">
                <AlertOctagon size={22} />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  SOS Darurat
                </h3>
                <p className="text-[10px] text-slate-500">
                  Kirim sinyal darurat ke Head Ops HQ
                </p>
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                Kategori Darurat
              </label>
              <select
                value={sosCategory}
                onChange={(e) => setSosCategory(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-rose-500"
              >
                <option value="general">🚨 SINYAL DARURAT SOS</option>
                <option value="swap_fleet">🚛 Minta Ganti Armada</option>
                <option value="swap_driver">👤 Minta Ganti Supir</option>
              </select>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">
                Keterangan
              </label>
              <textarea
                value={sosDescription}
                onChange={(e) => setSosDescription(e.target.value)}
                rows={3}
                placeholder="Jelaskan kondisi darurat Anda..."
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setSosOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs uppercase tracking-wider transition-all border border-slate-200"
              >
                Batal
              </button>
              <button
                onClick={handleSOSSubmit}
                disabled={sosLoading}
                className="flex-1 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {sosLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <AlertOctagon size={14} />
                )}
                Kirim SOS
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Photo Preview Modal */}
      {selectedPhotoPreview && (
        <div
          className="fixed inset-0 z-[60] bg-black/60 flex items-center justify-center p-4"
          onClick={() => setSelectedPhotoPreview(null)}
        >
          <div className="relative max-w-lg w-full">
            <img
              src={selectedPhotoPreview}
              alt="Preview foto lokasi"
              className="w-full rounded-2xl border border-slate-200"
            />
            <button
              onClick={() => setSelectedPhotoPreview(null)}
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-white text-slate-700 flex items-center justify-center border border-slate-300 shadow"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Info Perangkat */}
      <InfoPerangkat
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        gpsStatus={gpsStatus}
        gpsAccuracy={gpsAccuracy}
        gpsSpeed={gpsSpeed}
        gpsPingCount={gpsPingCount}
        gpsErrorMessage={gpsErrorMessage || undefined}
        tenantName={jobOrder.tenant_name}
        isNative={isNative}
      />
    </div>
  );
}