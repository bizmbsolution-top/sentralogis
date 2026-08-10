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
import { parseUTC } from "@/lib/utils/dateUtils";
import DriverReadinessGate from "../../../jo/[token]/components/DriverReadinessGate";
import { useTTS } from "@/lib/hooks/useTTS";
import { useDriverAuth } from "@/lib/hooks/useDriverAuth";

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

  const [isNative, setIsNative] = useState<boolean>(true);
  const [gpsStatus, setGpsStatus] = useState<
    "active" | "inactive" | "error" | "loading"
  >("loading");
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsBattery, setGpsBattery] = useState<number | null>(null);
  const [gpsSpeed, setGpsSpeed] = useState<number | null>(null);
  const [gpsPingCount, setGpsPingCount] = useState(0);

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

      // Verify Assignment
      if (jo.driver && session?.driver_id) {
        if (jo.driver.id !== session.driver_id) {
          setIsBlocked(true);
        } else {
          setIsBlocked(false);
        }
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

  // Active GPS tracking hook
  const activeGpsToken = jobOrder?.id || token;
  useDriverGpsPing(
    activeGpsToken,
    jobOrder?.status,
    readinessComplete && !!jobOrder,
    undefined,
    jobOrder?.started_at,
    null,
    undefined,
    (state) => {
      if (state.status && state.status !== "recovering") setGpsStatus(state.status);
      if (state.accuracy !== undefined) setGpsAccuracy(state.accuracy);
      if (state.battery !== undefined) setGpsBattery(state.battery);
      if (state.speed !== undefined) setGpsSpeed(state.speed);
      if (state.pingCount !== undefined) setGpsPingCount(state.pingCount);
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
  if (!readinessComplete && (jobOrder.status || "").toUpperCase() === "ASSIGNED") {
    return (
      <DriverReadinessGate
        token={token}
        isNative={isNative}
        onReady={handleReadinessComplete}
      />
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-950 text-white pb-32">
      <Toaster position="top-center" />

      {/* Top Bar */}
      <div className="bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-40 flex items-center justify-between">
        <button
          onClick={() => router.push("/driver/portal")}
          className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider transition-colors"
        >
          <ArrowLeft size={16} /> Portal
        </button>
        <div className="text-center">
          <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
            {jobOrder.jo_number}
          </p>
          <p className="text-xs font-bold text-white uppercase">
            {jobOrder.fleet?.plate_number || "PELAKSANAN ORDER"}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[10px] font-bold uppercase">
          <Satellite size={12} className="animate-pulse" /> LIVE GPS
        </div>
      </div>

      {/* Telemetry Status Bar */}
      <div className="bg-slate-900/50 p-3 border-b border-slate-800/80 grid grid-cols-3 gap-2 text-center">
        <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">GPS Pings</p>
          <p className="text-xs font-black text-emerald-400">{gpsPingCount} Pings</p>
        </div>
        <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Akurasi</p>
          <p className="text-xs font-black text-blue-400">
            {gpsAccuracy !== null ? `±${Math.round(gpsAccuracy)}m` : "Optimal"}
          </p>
        </div>
        <div className="bg-slate-950/60 p-2 rounded-xl border border-slate-800">
          <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Status</p>
          <p className="text-xs font-black text-purple-400">BERJALAN</p>
        </div>
      </div>

      {/* Main Execution Tracking UI */}
      <div className="p-4 space-y-6 max-w-lg mx-auto">
        {/* Container & Seal Form (if applicable) */}
        <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2">
            <Box size={18} className="text-indigo-400" />
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-300">
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
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
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-bold text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500"
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
        <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 space-y-4">
          <h3 className="text-xs font-black uppercase tracking-widest text-slate-300 flex items-center gap-2">
            <MapPin size={18} className="text-emerald-400" /> Progress Rute & Perjalanan
          </h3>

          <div className="space-y-4 relative before:absolute before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
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
                        : "bg-slate-900 border-slate-700"
                    }`}
                  />

                  <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">
                          STOP {idx + 1} — {stop.stop_type}
                        </span>
                        <h4 className="font-bold text-sm text-white">{stop.location_name}</h4>
                      </div>
                      <span
                        className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                          isDone
                            ? "bg-emerald-500/20 text-emerald-400"
                            : isArrived
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {stop.status.toUpperCase()}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400">{stop.address}</p>

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
    </div>
  );
}
