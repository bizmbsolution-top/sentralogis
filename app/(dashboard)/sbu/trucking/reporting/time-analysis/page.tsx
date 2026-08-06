"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { toast, Toaster } from "react-hot-toast";
import {
  ChevronLeft,
  Loader2,
  Clock,
  Truck,
  Search,
  Filter,
  ArrowDown,
  ArrowUp,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

const TRUCKING_SBU_ROLES = [
  "sbu_manager_tr",
  "sbu_ops_tr",
  "sbu_fin_tr",
  "sbu_admin_tr",
];
const GLOBAL_ROLES = ["owner_sentralogis", "tenant_superadmin", "tenant_admin"];

interface StopTimeData {
  jo_id: string;
  jo_number: string;
  wo_number: string;
  customer_name: string;
  driver_name: string;
  plate_number: string;
  stop_name: string;
  stop_type: string;
  actual_arrival: string | null;
  actual_departure: string | null;
  duration_min: number | null;
  status: string;
  is_skipped: boolean;
}

interface JoTimeSummary {
  jo_id: string;
  jo_number: string;
  wo_number: string;
  customer_name: string;
  driver_name: string;
  plate_number: string;
  total_duration_min: number;
  loading_min: number;
  unloading_min: number;
  transit_min: number;
  stops: StopTimeData[];
}

export default function TimeAnalysisPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<JoTimeSummary[]>([]);
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<"loading" | "unloading" | "total">("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const isTruckingSbu = !!profile && TRUCKING_SBU_ROLES.includes(profile.role);
  const isGlobalRole = !!profile && GLOBAL_ROLES.includes(profile.role);
  const [resolvedTenantId, setResolvedTenantId] = useState<string | null>(
    profile?.tenant_id || null
  );
  const [tenantList, setTenantList] = useState<any[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    if (profile.tenant_id) {
      setResolvedTenantId(profile.tenant_id);
      return;
    }
    if (isGlobalRole) {
      const fetchTenant = async () => {
        const { data } = await supabase.from("tenants").select("id").limit(1);
        if (data && data.length > 0) setResolvedTenantId(data[0].id);
      };
      fetchTenant();
    }
  }, [profile, isGlobalRole]);

  useEffect(() => {
    if (!isGlobalRole) return;
    const fetchTenantList = async () => {
      const { data } = await supabase
        .from("tenants")
        .select("id, tenant_code, name")
        .order("tenant_code");
      if (data && data.length > 0) {
        setTenantList(data);
        setSelectedTenantId((prev) => prev || resolvedTenantId || data[0].id);
      }
    };
    fetchTenantList();
  }, [isGlobalRole, resolvedTenantId]);

  const tenantId = isGlobalRole
    ? selectedTenantId || resolvedTenantId
    : resolvedTenantId;

  const fetchData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data: jos, error } = await supabase
        .from("job_orders")
        .select(`
          id, jo_number, status, started_at, completed_at,
          wo_items!wo_item_id (
            id, wo_id,
            work_orders!wo_id (wo_number, customers:md_entities!customer_id (name))
          ),
          md_drivers!driver_id (name),
          md_fleets!fleet_id (plate_number)
        `)
        .eq("tenant_id", tenantId)
        .in("status", ["PEKERJAAN SELESAI", "COMPLETED", "DALAM PERJALANAN", "MENUJU BYD INDO - BYD SUBANG", "MENUNGGU SELESAI", "TIBA DI LOKASI BONGKAR"])
        .gte("created_at", `${startDate}T00:00:00`)
        .lte("created_at", `${endDate}T23:59:59`)
        .not("started_at", "is", null)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const summaries: JoTimeSummary[] = [];

      for (const jo of jos || []) {
        const { data: routes } = await supabase
          .from("job_routes")
          .select("sequence, location_name, stop_type, status, actual_arrival, actual_departure, notes")
          .eq("job_order_id", jo.id)
          .order("sequence");

        if (!routes || routes.length === 0) continue;

        const stops: StopTimeData[] = routes.map((r) => {
          const arrival = r.actual_arrival ? new Date(r.actual_arrival) : null;
          const departure = r.actual_departure ? new Date(r.actual_departure) : null;
          const duration = arrival && departure
            ? Math.round((departure.getTime() - arrival.getTime()) / 1000 / 60)
            : null;
          const isSkipped = r.notes?.includes("Auto-completed") || r.notes?.includes("dilompati");

          return {
            jo_id: jo.id,
            jo_number: jo.jo_number,
            wo_number: (jo as any).wo_items?.[0]?.work_orders?.wo_number || "-",
            customer_name: (jo as any).wo_items?.[0]?.work_orders?.customers?.name || "-",
            driver_name: (jo as any).md_drivers?.name || "-",
            plate_number: (jo as any).md_fleets?.plate_number || "-",
            stop_name: r.location_name || `Stop #${r.sequence}`,
            stop_type: r.stop_type || "-",
            actual_arrival: r.actual_arrival || null,
            actual_departure: r.actual_departure || null,
            duration_min: duration,
            status: r.status,
            is_skipped: isSkipped,
          };
        });

        const loadingStop = stops.find(
          (s) => s.stop_type === "PICKUP" && s.duration_min !== null
        );
        const unloadingStop = stops.find(
          (s) => s.stop_type === "DROPOFF" && s.duration_min !== null
        );
        const loadingMin = loadingStop?.duration_min || 0;
        const unloadingMin = unloadingStop?.duration_min || 0;

        const joStart = jo.started_at ? new Date(jo.started_at).getTime() : 0;
        const joEnd = jo.completed_at
          ? new Date(jo.completed_at).getTime()
          : Date.now();
        const totalMin = joStart
          ? Math.round((joEnd - joStart) / 1000 / 60)
          : 0;
        const transitMin = Math.max(0, totalMin - loadingMin - unloadingMin);

        summaries.push({
          jo_id: jo.id,
          jo_number: jo.jo_number,
          wo_number: stops[0]?.wo_number || "-",
          customer_name: stops[0]?.customer_name || "-",
          driver_name: stops[0]?.driver_name || "-",
          plate_number: stops[0]?.plate_number || "-",
          total_duration_min: totalMin,
          loading_min: loadingMin,
          unloading_min: unloadingMin,
          transit_min: transitMin,
          stops,
        });
      }

      setData(summaries);
    } catch (err: any) {
      toast.error("Gagal memuat data: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [tenantId, startDate, endDate]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filtered = data
    .filter(
      (j) =>
        j.wo_number.toLowerCase().includes(search.toLowerCase()) ||
        j.jo_number.toLowerCase().includes(search.toLowerCase()) ||
        j.customer_name.toLowerCase().includes(search.toLowerCase()) ||
        j.driver_name.toLowerCase().includes(search.toLowerCase()) ||
        j.plate_number.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const aVal =
        sortField === "loading"
          ? a.loading_min
          : sortField === "unloading"
            ? a.unloading_min
            : a.total_duration_min;
      const bVal =
        sortField === "loading"
          ? b.loading_min
          : sortField === "unloading"
            ? b.unloading_min
            : b.total_duration_min;
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    });

  const formatDuration = (min: number | null) => {
    if (min === null || min === undefined) return "-";
    if (min < 60) return `${min}m`;
    const h = Math.floor(min / 60);
    const m = min % 60;
    return m > 0 ? `${h}j ${m}m` : `${h}j`;
  };

  const formatTime = (iso: string | null) => {
    if (!iso) return "-";
    return new Date(iso).toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getDurationColor = (min: number | null, type: "loading" | "unloading") => {
    if (min === null) return "text-slate-400";
    const threshold = type === "loading" ? 120 : 60;
    if (min > threshold * 2) return "text-rose-600 font-bold";
    if (min > threshold) return "text-amber-600 font-semibold";
    return "text-emerald-600";
  };

  const avgLoading = data.length
    ? Math.round(data.reduce((s, j) => s + j.loading_min, 0) / data.length)
    : 0;
  const maxLoading = Math.max(...data.map((j) => j.loading_min), 0);
  const maxUnloading = Math.max(...data.map((j) => j.unloading_min), 0);

  if (!isTruckingSbu && !isGlobalRole) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200 text-center max-w-md">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900 mb-1">Akses Ditolak</h2>
          <p className="text-xs text-slate-500">
            Halaman ini hanya dapat diakses oleh user SBU Trucking.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/sbu/trucking/reporting"
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-slate-700" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Time Analysis
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              Loading & Unloading Duration Report
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          {isGlobalRole && tenantList.length > 0 && (
            <select
              value={tenantId || ""}
              onChange={(e) => setSelectedTenantId(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500 transition-all shadow-sm"
            >
              {tenantList.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.tenant_code} — {t.name}
                </option>
              ))}
            </select>
          )}
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none"
          />
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none"
          />
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold tracking-wide text-xs flex items-center gap-2 shadow-sm hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Clock className="w-4 h-4" />}
            Refresh
          </button>
        </div>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Truck size={16} className="text-slate-500" />
          </div>
          <p className="text-xl font-bold text-slate-900">{data.length}</p>
          <p className="text-[10px] text-slate-500">Total JO</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm bg-blue-50/50">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDown size={16} className="text-blue-600" />
          </div>
          <p className="text-xl font-bold text-blue-700">{formatDuration(avgLoading)}</p>
          <p className="text-[10px] text-blue-600">Rata-rata Muat</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-amber-200 shadow-sm bg-amber-50/50">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUp size={16} className="text-amber-600" />
          </div>
          <p className="text-xl font-bold text-amber-700">{formatDuration(maxLoading)}</p>
          <p className="text-[10px] text-amber-600">Muat Terlama</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-rose-200 shadow-sm bg-rose-50/50">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-rose-600" />
          </div>
          <p className="text-xl font-bold text-rose-700">{formatDuration(maxUnloading)}</p>
          <p className="text-[10px] text-rose-600">Bongkar Terlama</p>
        </div>
      </div>

      {/* Search & Sort */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-4">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Cari WO / JO / Pelanggan / Driver / Plat..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-10 pl-10 pr-4 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-slate-400" />
          <span className="text-xs font-medium text-slate-500">Sort:</span>
          {[
            { key: "total" as const, label: "Total" },
            { key: "loading" as const, label: "Muat" },
            { key: "unloading" as const, label: "Bongkar" },
          ].map((opt) => (
            <button
              key={opt.key}
              onClick={() => {
                if (sortField === opt.key) {
                  setSortDir(sortDir === "asc" ? "desc" : "asc");
                } else {
                  setSortField(opt.key);
                  setSortDir("desc");
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                sortField === opt.key
                  ? "bg-blue-100 text-blue-700"
                  : "bg-white text-slate-600 hover:bg-slate-50 border border-slate-200"
              }`}
            >
              {opt.label}
              {sortField === opt.key && (
                sortDir === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-3" />
          <p className="text-xs text-slate-400">Memuat data waktu...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center bg-white rounded-xl border border-slate-200">
          <Clock className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-sm font-bold text-slate-600">Tidak ada data</p>
          <p className="text-xs text-slate-400">Belum ada JO dengan data waktu perjalanan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((jo) => (
            <div
              key={jo.jo_id}
              className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
            >
              {/* JO Header */}
              <div className="px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-xs">
                      {jo.plate_number?.slice(-4) || "?"}
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900">{jo.jo_number}</p>
                      <p className="text-[10px] text-slate-400">
                        {jo.wo_number} • {jo.customer_name} • {jo.driver_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">Total</p>
                      <p className={`text-sm font-black ${getDurationColor(jo.total_duration_min, "loading")}`}>
                        {formatDuration(jo.total_duration_min)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-blue-500">Muat</p>
                      <p className={`text-sm font-bold ${getDurationColor(jo.loading_min, "loading")}`}>
                        {formatDuration(jo.loading_min)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-amber-500">Bongkar</p>
                      <p className={`text-sm font-bold ${getDurationColor(jo.unloading_min, "unloading")}`}>
                        {formatDuration(jo.unloading_min)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">Transit</p>
                      <p className="text-sm font-medium text-slate-600">
                        {formatDuration(jo.transit_min)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Stops Detail */}
              <div className="px-4 py-3">
                <div className="space-y-2">
                  {jo.stops.map((stop, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 text-xs ${
                        stop.is_skipped ? "opacity-50" : ""
                      }`}
                    >
                      <div
                        className={`w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] shrink-0 ${
                          stop.status === "completed"
                            ? "bg-emerald-100 text-emerald-700"
                            : stop.status === "arrived"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-slate-100 text-slate-400"
                        }`}
                      >
                        {stop.status === "completed" ? (
                          <CheckCircle2 size={12} />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[8px] font-black uppercase px-1 py-0.5 rounded ${
                              stop.stop_type === "PICKUP"
                                ? "bg-blue-50 text-blue-600"
                                : "bg-emerald-50 text-emerald-600"
                            }`}
                          >
                            {stop.stop_type === "PICKUP" ? "MUAT" : "BONGKAR"}
                          </span>
                          {stop.is_skipped && (
                            <span className="text-[8px] font-bold text-slate-400 line-through">
                              DILEWATI
                            </span>
                          )}
                        </div>
                        <p className="font-semibold text-slate-700 truncate">{stop.stop_name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[10px] text-slate-400">
                          {formatTime(stop.actual_arrival)} → {formatTime(stop.actual_departure)}
                        </p>
                        <p
                          className={`font-bold ${
                            stop.duration_min !== null
                              ? stop.stop_type === "PICKUP"
                                ? getDurationColor(stop.duration_min, "loading")
                                : getDurationColor(stop.duration_min, "unloading")
                              : "text-slate-400"
                          }`}
                        >
                          {stop.duration_min !== null
                            ? formatDuration(stop.duration_min)
                            : "belum selesai"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
