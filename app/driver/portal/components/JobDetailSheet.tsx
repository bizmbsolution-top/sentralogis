"use client";

import React, { useState, useRef } from "react";
import {
  ArrowLeft,
  Truck,
  MapPin,
  Camera,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Navigation,
  FileText,
  AlertOctagon,
  ChevronRight,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { GoogleMap, MarkerF, PolylineF, DirectionsRenderer } from "@react-google-maps/api";
import { useGoogleMaps } from "@/lib/google-maps-context";
import { JobOrderData, RouteStop } from "./types";
import { formatDateUTC } from "@/lib/utils/dateUtils";

interface JobDetailSheetProps {
  job: JobOrderData;
  isDark: boolean;
  getAuthHeaders: () => Record<string, string>;
  onClose: () => void;
  onRefreshFeed: () => void;
}

// Error Boundary for Map
class MapErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean }> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-48 bg-slate-800 rounded-2xl flex items-center justify-center text-slate-400 text-xs">
          Peta tidak dapat dimuat saat ini
        </div>
      );
    }
    return this.props.children;
  }
}

export const JobDetailSheet: React.FC<JobDetailSheetProps> = ({
  job,
  isDark,
  getAuthHeaders,
  onClose,
  onRefreshFeed,
}) => {
  const { isLoaded: isMapsLoaded } = useGoogleMaps();
  const [loading, setLoading] = useState(false);
  const [photoUploadingRouteId, setPhotoUploadingRouteId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});
  const [savingNotesId, setSavingNotesId] = useState<string | null>(null);

  const stops = job.job_routes || job.wo_items?.item_data?.stops || [];
  const originStop = stops[0]?.location_name || "Lokasi Muat";
  const destStop = stops[stops.length - 1]?.location_name || "Lokasi Bongkar";
  const shipperName =
    job.wo_items?.item_data?.shipper_name ||
    job.customer_name ||
    job.tenant_name ||
    "SENTRALOGIS";
  const plateNumber = job.md_fleets?.plate_number || "-";

  // Map center calculation
  const mapCenter = React.useMemo(() => {
    const validStop = stops.find((s: any) => s.latitude && s.longitude);
    if (validStop && validStop.latitude && validStop.longitude) {
      return { lat: Number(validStop.latitude), lng: Number(validStop.longitude) };
    }
    return { lat: -6.2088, lng: 106.8456 }; // Default Jakarta
  }, [stops]);

  // Update JO Status (e.g. In Progress, Completed)
  const handleUpdateJobStatus = async (newStatus: string) => {
    setLoading(true);
    try {
      let apiStatus = newStatus;
      if (newStatus === "DITERIMA") apiStatus = "accepted";
      if (newStatus === "START JOURNEY" || newStatus === "IN_PROGRESS") apiStatus = "in_progress";
      if (newStatus === "PEKERJAAN SELESAI" || newStatus === "SELESAI") apiStatus = "completed";

      let lat = null;
      let lng = null;
      try {
        const pos = await new Promise<any>((resolve, reject) => {
          if (!navigator.geolocation) return reject("No geolocation");
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (e) {}

      const res = await fetch(`/api/jo/${job.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: apiStatus, lat, lng }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memperbarui status tugas");
      }

      toast.success("Status berhasil diperbarui!");
      onRefreshFeed();
      if (apiStatus === "completed") {
        onClose();
      }
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui status");
    } finally {
      setLoading(false);
    }
  };

  // Update Stop Status (Arrived, Completed, Departed)
  const handleUpdateRouteStatus = async (routeId: string, routeStatus: string) => {
    setLoading(true);
    try {
      let lat = null;
      let lng = null;
      try {
        const pos = await new Promise<any>((resolve, reject) => {
          if (!navigator.geolocation) return reject("No geolocation");
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (e) {}

      const res = await fetch(`/api/jo/${job.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          route_id: routeId,
          route_status: routeStatus,
          lat,
          lng,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal memperbarui titik rute");
      }

      toast.success(`Berhasil: ${routeStatus.toUpperCase()}`);
      onRefreshFeed();
    } catch (err: any) {
      toast.error(err.message || "Gagal memperbarui rute");
    } finally {
      setLoading(false);
    }
  };

  // Upload POD Photo
  const handleUploadPod = async (routeId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoUploadingRouteId(routeId);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const res = await fetch(`/api/jo/${job.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          route_id: routeId,
          pod_photo_base64: base64,
          pod_photo_name: file.name,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal upload foto POD");
      }

      toast.success("Foto POD berhasil diunggah!");
      onRefreshFeed();
    } catch (err: any) {
      toast.error(err.message || "Gagal unggah foto");
    } finally {
      setPhotoUploadingRouteId(null);
    }
  };

  const isAllStopsCompleted = stops.length > 0 && stops.every((s: any) => s.status === "completed" || s.status === "departed");

  // Save per-stop notes (catatan pengiriman)
  const handleSaveNotes = async (stop: any) => {
    const note = (notesDraft[stop.id] ?? stop.notes ?? "").trim();
    setSavingNotesId(stop.id);
    try {
      const res = await fetch(`/api/jo/${job.id}`, {
        method: "PATCH",
        headers: getAuthHeaders(),
        body: JSON.stringify({
          action: "route_notes",
          route_id: stop.id,
          route_notes: note,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menyimpan catatan");
      }
      toast.success("Catatan disimpan");
      onRefreshFeed();
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan catatan");
    } finally {
      setSavingNotesId(null);
    }
  };

  // Open Google Maps navigation guidance to the stop location
  const openDirections = (stop: any) => {
    let dest = "";
    if (stop.latitude && stop.longitude) {
      dest = `${stop.latitude},${stop.longitude}`;
    } else if (stop.address) {
      dest = encodeURIComponent(stop.address);
    } else if (stop.location_name) {
      dest = encodeURIComponent(stop.location_name);
    }
    if (!dest) {
      toast.error("Koordinat/alamat lokasi tidak tersedia");
      return;
    }
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${dest}&travelmode=driving`,
      "_blank"
    );
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto pb-24 ${
        isDark ? "bg-slate-950 text-slate-100" : "bg-slate-50 text-slate-900"
      }`}
    >
      {/* Top Sticky Bar */}
      <div
        className={`sticky top-0 z-30 px-5 py-4 flex items-center justify-between border-b backdrop-blur-xl ${
          isDark
            ? "bg-slate-950/90 border-slate-800 text-white"
            : "bg-white/90 border-slate-200 text-slate-900"
        }`}
      >
        <button
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-indigo-500 hover:text-indigo-600 active:scale-95 transition-all cursor-pointer"
        >
          <ArrowLeft size={18} /> Kembali
        </button>

        <div className="text-right">
          <p className="text-xs font-black">{job.jo_number}</p>
          <p className="text-[10px] text-slate-400 font-bold uppercase">
            Plat: {plateNumber}
          </p>
        </div>
      </div>

      <div className="p-5 space-y-5 max-w-lg mx-auto">
        {/* Main Job Info Banner */}
        <div
          className={`rounded-3xl p-5 border shadow-xl ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">
                Shipper / Pelanggan
              </span>
              <h2 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white mt-0.5">
                {shipperName}
              </h2>
            </div>

            <span className="bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 text-[9px] font-black uppercase px-2.5 py-1 rounded-full">
              {(job.status || "ASSIGNED").replace(/_/g, " ")}
            </span>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2 pt-3 border-t border-slate-200/10">
            <MapPin size={14} className="text-indigo-400 shrink-0" />
            <span className="font-bold text-slate-300">{originStop}</span>
            <span>→</span>
            <span className="font-bold text-slate-300">{destStop}</span>
          </div>
        </div>

        {/* Interactive Google Map */}
        {isMapsLoaded && (
          <div className="rounded-3xl overflow-hidden border border-slate-800 shadow-xl">
            <MapErrorBoundary>
              <GoogleMap
                mapContainerStyle={{ width: "100%", height: "200px" }}
                center={mapCenter}
                zoom={12}
                options={{
                  disableDefaultUI: true,
                  zoomControl: false,
                  styles: isDark
                    ? [
                        { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
                        { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
                        { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
                      ]
                    : [],
                }}
              >
                {stops.map((st: any, idx: number) => {
                  if (!st.latitude || !st.longitude) return null;
                  return (
                    <MarkerF
                      key={idx}
                      position={{ lat: Number(st.latitude), lng: Number(st.longitude) }}
                      label={{
                        text: String(idx + 1),
                        color: "#ffffff",
                        fontWeight: "bold",
                      }}
                    />
                  );
                })}
              </GoogleMap>
            </MapErrorBoundary>
          </div>
        )}

        {/* Route Stops Timeline */}
        <div
          className={`rounded-3xl p-5 border shadow-xl space-y-4 ${
            isDark ? "bg-slate-900 border-slate-800" : "bg-white border-slate-200"
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/20">
            <h3 className="text-xs font-black uppercase tracking-wider flex items-center gap-2">
              <Navigation size={15} className="text-indigo-500" />
              Progres Titik Pengiriman ({stops.length} Stop)
            </h3>
          </div>

          <div className="space-y-4">
            {stops.map((stop: any, index: number) => {
              const isCompleted = stop.status === "completed" || stop.status === "departed";
              const isArrived = stop.status === "arrived";
              const isPickup = stop.stop_type === "PICKUP" || index === 0;
              const isUploading = photoUploadingRouteId === stop.id;

              return (
                <div
                  key={stop.id || index}
                  className={`rounded-2xl p-4 border transition-all ${
                    isCompleted
                      ? "bg-emerald-500/5 border-emerald-500/30"
                      : isArrived
                      ? "bg-indigo-500/10 border-indigo-500/40"
                      : isDark
                      ? "bg-slate-950/60 border-slate-850"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <span
                        className={`w-7 h-7 rounded-xl font-black text-xs flex items-center justify-center shadow-sm ${
                          isCompleted
                            ? "bg-emerald-500 text-white"
                            : isArrived
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {index + 1}
                      </span>
                      <div>
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-400">
                          {isPickup ? "LOKASI MUAT" : "LOKASI BONGKAR"}
                        </span>
                        <h4 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                          {stop.location_name}
                        </h4>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                        isCompleted
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                          : isArrived
                          ? "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30"
                          : "bg-slate-500/20 text-slate-400"
                      }`}
                    >
                      {isCompleted ? "SELESAI" : isArrived ? "TIBA" : "PENDING"}
                    </span>
                  </div>

                  {stop.address && (
                    <p className="text-xs text-slate-400 pl-9 mb-3">
                      {stop.address}
                    </p>
                  )}

                  {/* Stop Action Buttons */}
                  <div className="pl-9 space-y-2">
                    {!isCompleted && !isArrived && (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleUpdateRouteStatus(stop.id, "arrived")}
                        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                      >
                        <MapPin size={14} /> Tiba di Lokasi
                      </button>
                    )}

                    {/* Petunjuk Arah — Google Maps navigation */}
                    <button
                      type="button"
                      onClick={() => openDirections(stop)}
                      className="w-full py-2.5 bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/30 text-blue-400 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Navigation size={14} /> Petunjuk Arah{" "}
                      {isPickup ? "Lokasi Muat" : "Lokasi Bongkar"}
                    </button>

                    {/* POD Photo Upload — always available */}
                    <label className="w-full py-2.5 px-3 bg-white/10 hover:bg-white/15 border border-white/20 rounded-xl text-[11px] font-black uppercase tracking-wider text-center flex items-center justify-center gap-1.5 cursor-pointer text-indigo-300">
                      {isUploading ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Camera size={14} />
                      )}
                      {stop.pod_photo_url ? "Ganti Foto POD" : "Ambil Foto POD"}
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        className="hidden"
                        onChange={(e) => handleUploadPod(stop.id, e)}
                      />
                    </label>

                    {stop.pod_photo_url && (
                      <div className="relative rounded-xl overflow-hidden h-24 border border-emerald-500/30">
                        <img
                          src={stop.pod_photo_url}
                          alt="POD"
                          className="w-full h-full object-cover"
                        />
                        <span className="absolute bottom-1 right-1 bg-emerald-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded">
                          ✓ POD TERVERIFIKASI
                        </span>
                      </div>
                    )}

                    {/* Catatan per titik */}
                    <div className="space-y-1.5">
                      <textarea
                        value={notesDraft[stop.id] ?? stop.notes ?? ""}
                        onChange={(e) =>
                          setNotesDraft((prev) => ({
                            ...prev,
                            [stop.id]: e.target.value,
                          }))
                        }
                        placeholder="Catatan lokasi ini (misal: gerbang biru, hubungi PIC, dll)"
                        rows={2}
                        className={`w-full p-3 rounded-xl border text-xs font-semibold resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/30 ${
                          isDark
                            ? "bg-slate-950/60 border-slate-700 text-slate-100 placeholder:text-slate-500"
                            : "bg-slate-50 border-slate-200 text-slate-800 placeholder:text-slate-400"
                        }`}
                      />
                      <button
                        type="button"
                        disabled={savingNotesId === stop.id}
                        onClick={() => handleSaveNotes(stop)}
                        className="w-full py-2 bg-slate-700/40 hover:bg-slate-700/60 border border-slate-600/50 text-slate-300 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-60"
                      >
                        {savingNotesId === stop.id ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <FileText size={12} />
                        )}
                        Simpan Catatan
                      </button>
                    </div>

                    {isArrived && (
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleUpdateRouteStatus(stop.id, "completed")}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                      >
                        <CheckCircle2 size={14} /> Selesai di Titik Ini
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Complete Entire Job Order Action */}
        <div className="pt-2 pb-6">
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              if (
                window.confirm(
                  "Yakin ingin menyelesaikan seluruh Job Order ini? Status akan tercatat SELESAI dan antrean berikutnya akan dipromosikan."
                )
              ) {
                handleUpdateJobStatus("PEKERJAAN SELESAI");
              }
            }}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <CheckCircle2 size={16} />
            )}
            SELESAIKAN SELURUH TUGAS
          </button>
        </div>
      </div>
    </div>
  );
};
