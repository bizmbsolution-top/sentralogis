"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import {
  Truck,
  MapPin,
  Calendar,
  User,
  Package,
  AlertCircle,
  Loader2,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ShieldCheck,
  Info,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { useDriverAuth } from "@/lib/hooks/useDriverAuth";
import InfoPerangkat from "../../components/InfoPerangkat";

interface RouteStop {
  id: string;
  sequence: number;
  stop_type: "PICKUP" | "DROPOFF";
  location_name: string;
  address: string;
}

interface JobOrder {
  id: string;
  jo_number: string;
  status: string;
  driver_response?: string;
  customer?: {
    name: string;
    address: string;
  };
  wo_details?: {
    wo_number: string;
    execution_date: string;
    execution_time?: string;
  };
  wo_items?: {
    item_data?: {
      shipper_name?: string;
      cargo_description?: string;
    };
  };
  driver?: {
    id: string;
    name: string;
  };
  fleet?: {
    plate_number: string;
    type_name?: string;
  };
  tenant_id?: string;
  tenant_name?: string;
  routes: RouteStop[];
}

export default function JoConfirmationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const { session, isLoading: sessionLoading } = useDriverAuth();

  const [jobOrder, setJobOrder] = useState<JobOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<"accept" | "reject" | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);

  // 1. Session & Auth Check
  useEffect(() => {
    if (!sessionLoading && !session) {
      router.replace(`/driver/login?redirect=/driver/order/${token}`);
    }
  }, [session, sessionLoading, router, token]);

  // 2. Fetch Job Order
  useEffect(() => {
    if (!session || !token) return;

    console.log("[ROUTE_FORENSIC] DRIVER_ORDER");
    console.log("[ROUTE_FORENSIC] current pathname = /driver/order/" + token);
    console.log("[ROUTE_FORENSIC] token =", token);

    let isMounted = true;
    async function fetchJO() {
      try {
        setLoading(true);
        const res = await fetch(`/api/jo/${token}`, {
          headers: {
            "X-Driver-ID": session?.driver_id || "",
          },
        });

        if (!res.ok) {
          throw new Error("Job Order tidak ditemukan atau gagal dimuat");
        }

        const data = await res.json();
        if (isMounted) {
          const joData = data.jobOrder || data.data || data;
          setJobOrder(joData);

          // Assignment Verification
          if (joData.driver && session?.driver_id) {
            if (joData.driver.id !== session.driver_id) {
              setIsBlocked(true);
            } else {
              setIsBlocked(false);
            }
          }

          // If already accepted, redirect directly to execution page
          if (
            joData.driver_response === "accepted" ||
            ["CONFIRMED_BY_DRIVER", "AUTO_CONFIRMED", "ORDER DITERIMA", "IN_PROGRESS"].includes(
              (joData.status || "").toUpperCase()
            )
          ) {
            router.replace(`/driver/execution/${token}`);
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || "Gagal memuat Job Order");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchJO();
    return () => {
      isMounted = false;
    };
  }, [session, token, router]);

  // 3. Handle ACCEPT
  const handleAccept = async () => {
    if (!session || !jobOrder) return;
    setUpdating("accept");
    try {
      const res = await fetch(`/api/jo/${token}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Driver-ID": session.driver_id,
        },
        body: JSON.stringify({
          status: "accepted",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menerima order");
      }

      toast.success("Order Berhasil Diterima!");
      // Navigate immediately to Stage 5: Execution Page
      router.replace(`/driver/execution/${token}`);
    } catch (err: any) {
      toast.error(err.message || "Gagal menerima order");
      setUpdating(null);
    }
  };

  // 4. Handle REJECT
  const handleReject = async () => {
    if (!session || !jobOrder) return;
    setUpdating("reject");
    try {
      const res = await fetch(`/api/jo/${token}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "X-Driver-ID": session.driver_id,
        },
        body: JSON.stringify({
          status: "rejected",
          rejection_note: "DRIVER_REJECTED",
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Gagal menolak order");
      }

      toast.success("Order Ditolak");
      router.replace("/driver/portal");
    } catch (err: any) {
      toast.error(err.message || "Gagal menolak order");
      setUpdating(null);
    }
  };

  if (sessionLoading || loading) {
    return (
      <div className="min-h-[100dvh] bg-slate-950 flex flex-col items-center justify-center p-6 text-white">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
        <p className="text-sm font-bold text-slate-400">Memuat Job Order...</p>
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
            Job Order ini ditugaskan untuk driver lain.
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
        <div className="bg-slate-900 rounded-3xl p-8 max-w-sm text-center shadow-2xl border border-slate-800">
          <AlertCircle className="w-16 h-16 text-amber-500 mx-auto mb-6" />
          <h2 className="text-lg font-bold text-white mb-2 uppercase">
            Order Tidak Ditemukan
          </h2>
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

  const pickupStop = jobOrder.routes?.[0];
  const dropoffStop = jobOrder.routes?.[jobOrder.routes.length - 1];

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white p-6 flex flex-col justify-between relative overflow-hidden">
      <Toaster position="top-center" containerStyle={{ top: 70 }} />

      {/* Header */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => router.push("/driver/portal")}
            className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-white uppercase tracking-wider transition-colors"
          >
            <ArrowLeft size={16} /> Driver Portal
          </button>
          <button
            onClick={() => setInfoOpen(true)}
            className="w-8 h-8 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-all"
            title="Info Perangkat"
          >
            <Info size={14} />
          </button>
        </div>

        <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl p-6 border border-slate-800 shadow-2xl space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full inline-block mb-2">
                JOB ORDER BARU
              </span>
              <h1 className="text-2xl font-black text-white tracking-tight">
                {jobOrder.jo_number}
              </h1>
            </div>
            <div className="w-12 h-12 bg-indigo-600/20 text-indigo-400 rounded-2xl flex items-center justify-center border border-indigo-500/30">
              <Truck size={24} />
            </div>
          </div>

          {/* Details Grid */}
          <div className="space-y-4 pt-2 border-t border-slate-800">
            {/* Customer */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <User size={18} className="text-indigo-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Customer / Pelanggan
                </p>
                <p className="font-bold text-white text-sm">
                  {jobOrder.customer?.name ||
                    jobOrder.wo_items?.item_data?.shipper_name ||
                    "SENTRALOGIS"}
                </p>
              </div>
            </div>

            {/* Pickup */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={18} className="text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Lokasi Muat (Pickup)
                </p>
                <p className="font-bold text-white text-sm">
                  {pickupStop?.location_name || "-"}
                </p>
                {pickupStop?.address && (
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                    {pickupStop.address}
                  </p>
                )}
              </div>
            </div>

            {/* Destination */}
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                <MapPin size={18} className="text-rose-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Lokasi Bongkar (Destination)
                </p>
                <p className="font-bold text-white text-sm">
                  {dropoffStop?.location_name || "-"}
                </p>
                {dropoffStop?.address && (
                  <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">
                    {dropoffStop.address}
                  </p>
                )}
              </div>
            </div>

            {/* Date & Vehicle */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-2xl border border-slate-800">
                <Calendar size={18} className="text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    Tanggal
                  </p>
                  <p className="font-bold text-white text-xs truncate">
                    {jobOrder.wo_details?.execution_date || "Hari Ini"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-800/50 p-3 rounded-2xl border border-slate-800">
                <Truck size={18} className="text-purple-400 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    Kendaraan
                  </p>
                  <p className="font-bold text-white text-xs truncate">
                    {jobOrder.fleet?.plate_number || "-"}
                  </p>
                </div>
              </div>
            </div>

            {/* Cargo */}
            {jobOrder.wo_items?.item_data?.cargo_description && (
              <div className="flex items-start gap-3 bg-slate-800/50 p-3 rounded-2xl border border-slate-800">
                <Package size={18} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                    Muatan
                  </p>
                  <p className="font-bold text-white text-xs">
                    {jobOrder.wo_items.item_data.cargo_description}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation & Action Buttons */}
      <div className="mt-8 space-y-4">
        <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 text-center">
          <p className="text-xs font-semibold text-slate-300">
            Anda mendapatkan order ini.<br />Apakah Anda bersedia menjalankan Job Order ini?
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleReject}
            disabled={!!updating}
            className="py-4 bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2"
          >
            {updating === "reject" ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                <XCircle size={18} /> TOLAK ORDER
              </>
            )}
          </button>

          <button
            onClick={handleAccept}
            disabled={!!updating}
            className="py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
          >
            {updating === "accept" ? (
              <Loader2 className="animate-spin text-white" size={18} />
            ) : (
              <>
                <CheckCircle2 size={18} /> TERIMA ORDER
              </>
            )}
          </button>
        </div>

        <InfoPerangkat
          open={infoOpen}
          onClose={() => setInfoOpen(false)}
          tenantName={jobOrder.tenant_name}
        />
      </div>
    </div>
  );
}
