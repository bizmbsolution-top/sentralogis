"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [sortField, setSortField] = useState<"loading" | "unloading" | "total">("total");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0]
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0]
  );

  const getSuggestions = (query: string) => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    const terms = q.split(/\s+/).filter(Boolean);
    return data
      .filter((d) =>
        terms.every(
          (t) =>
            d.jo_number.toLowerCase().includes(t) ||
            d.customer_name?.toLowerCase().includes(t) ||
            d.driver_name?.toLowerCase().includes(t) ||
            d.plate_number?.toLowerCase().includes(t)
        )
      )
      .slice(0, 8)
      .map((d) => ({
        jo_number: d.jo_number,
        customer_name: d.customer_name,
        driver_name: d.driver_name,
        plate_number: d.plate_number,
      }));
  };

  const filteredData = data.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    const terms = q.split(/\s+/).filter(Boolean);
    return terms.every(
      (t) =>
        d.jo_number.toLowerCase().includes(t) ||
        d.customer_name?.toLowerCase().includes(t) ||
        d.driver_name?.toLowerCase().includes(t) ||
        d.plate_number?.toLowerCase().includes(t)
    );
  });

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearch(val);
    if (val.trim() && data.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding to allow click on suggestion
    setTimeout(() => {
      if (dropdownRef.current && !dropdownRef.current.matches(':hover')) {
        setShowSuggestions(false);
      }
    }, 150);
  };

  const handleInputFocus = () => {
    if (search.trim() && data.length > 0) {
      setShowSuggestions(true);
    }
  };

  const selectSuggestion = (e: React.MouseEvent, jo: string) => {
    e.preventDefault();
    e.stopPropagation();
    setSearch(jo);
    setShowSuggestions(false);
    (e.target as HTMLElement).blur();
  };

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
  const canAccess = !!tenantId && (isTruckingSbu || isGlobalRole);

  const fetchData = useCallback(async () => {
    if (!tenantId || !canAccess) return;
    setLoading(true);
    try {
      const { data: jobOrders } = await supabase
        .from("job_orders")
        .select(
          `*, wo_items!inner(*, work_orders!inner(*, customers:md_entities!customer_id(name, legal_name))), job_routes(*), fleets:fleet_id(plate_number, companies:md_entities(name)), drivers:driver_id(name)`
        )
        .eq("tenant_id", tenantId)
        .gte("wo_items.work_orders.created_at", startDate)
        .lte("wo_items.work_orders.created_at", endDate)
        .eq("sbu_type", "TRUCKING") as any;

      if (!jobOrders) { setData([]); return; }

      const enriched = jobOrders.map((jo: any) => {
        const routes = jo.job_routes || [];
        const stops = routes
          .filter((r: any) => r.actual_arrival || r.actual_departure)
          .map((r: any) => ({
            jo_id: jo.id,
            jo_number: jo.job_number,
            wo_number: jo.wo_items?.[0]?.work_orders?.job_number,
            customer_name: jo.wo_items?.[0]?.work_orders?.customers?.legal_name || jo.wo_items?.[0]?.work_orders?.customers?.name,
            driver_name: jo.drivers?.name,
            plate_number: jo.fleets?.plate_number,
            stop_name: r.stop_name,
            stop_type: r.stop_type,
            actual_arrival: r.actual_arrival,
            actual_departure: r.actual_departure,
            duration_min: r.duration_min,
            status: r.status,
            is_skipped: r.is_skipped,
          }));

        const loadingStops = stops.filter((s: any) => s.stop_type === "LOADING");
        const unloadingStops = stops.filter((s: any) => s.stop_type === "UNLOADING");

        return {
          jo_id: jo.id,
          jo_number: jo.job_number,
          wo_number: jo.wo_items?.[0]?.work_orders?.job_number,
          customer_name: jo.wo_items?.[0]?.work_orders?.customers?.legal_name,
          driver_name: jo.drivers?.name,
          plate_number: jo.fleets?.plate_number,
          total_duration_min: stops.reduce((a: number, s: any) => a + (s.duration_min || 0), 0),
          loading_min: loadingStops.reduce((a: number, s: any) => a + (s.duration_min || 0), 0),
          unloading_min: unloadingStops.reduce((a: number, s: any) => a + (s.duration_min || 0), 0),
          transit_min: stops.filter((s: any) => s.stop_type === "TRANSIT").reduce((a: number, s: any) => a + (s.duration_min || 0), 0),
          stops,
        };
      });

      setData(enriched);
    } catch (e) {
      toast.error("Gagal memuat data");
    } finally {
      setLoading(false);
    }
  }, [tenantId, canAccess, startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSort = (field: "loading" | "unloading" | "total") => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  const sortedData = [...data].sort((a, b) => {
    const av = a[sortField === "loading" ? "loading_min" : sortField === "unloading" ? "unloading_min" : "total_duration_min"] || 0;
    const bv = b[sortField === "loading" ? "loading_min" : sortField === "unloading" ? "unloading_min" : "total_duration_min"] || 0;
    return sortDir === "asc" ? av - bv : bv - av;
  });

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Toaster position="top-right" />
        <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-center max-w-md">
          <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mb-4">
            <Clock className="w-7 h-7 text-rose-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Akses Ditolak</h2>
          <p className="text-xs text-slate-500">Hanya user SBU Trucking yang dapat mengakses halaman ini.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/sbu/trucking" className="p-2.5 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all">
            <ChevronLeft className="w-5 h-5 text-slate-700" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Time & Motion Analysis</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Analisis Waktu Loading, Unloading & Transit per JO</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isGlobalRole && tenantList.length > 0 && (
            <select value={tenantId || ""} onChange={(e) => setSelectedTenantId(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500 transition-all shadow-sm">
              {tenantList.map((t) => <option key={t.id} value={t.id}>{t.tenant_code} — {t.name}</option>)}
            </select>
          )}
        </div>
      </header>

      <div className="bg-slate-900 rounded-2xl p-4 md:p-5 text-white shadow-md relative overflow-hidden mb-6">
        <div className="relative z-10">
          <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Time & Motion Snapshot</p>
          <h3 className="text-lg font-bold uppercase text-white mb-4">Trucking Efficiency</h3>
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex flex-col">
              <p className="text-xl sm:text-2xl font-extrabold text-blue-400 leading-none">
                {filteredData.length}{" "}
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold block sm:inline sm:ml-1">
                  JO Analyzed
                </span>
              </p>
            </div>
            <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
            <div className="flex flex-col">
              <p className="text-xl sm:text-2xl font-extrabold text-emerald-300 leading-none">
                {Math.round(filteredData.reduce((a, d) => a + (d.loading_min || 0), 0) / (filteredData.length || 1))}{" "}
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold block sm:inline sm:ml-1">
                  Avg Loading (min)
                </span>
              </p>
            </div>
            <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
            <div className="flex flex-col">
              <p className="text-xl sm:text-2xl font-extrabold text-amber-300 leading-none">
                {Math.round(filteredData.reduce((a, d) => a + (d.unloading_min || 0), 0) / (filteredData.length || 1))}{" "}
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold block sm:inline sm:ml-1">
                  Avg Unloading (min)
                </span>
              </p>
            </div>
            <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
            <div className="flex flex-col">
              <p className="text-xl sm:text-2xl font-extrabold text-purple-300 leading-none">
                {Math.round(filteredData.reduce((a, d) => a + (d.transit_min || 0), 0) / (filteredData.length || 1))}{" "}
                <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold block sm:inline sm:ml-1">
                  Avg Transit (min)
                </span>
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-white/5 pt-3">
            <div className="px-3.5 py-2.5 bg-slate-800/40 rounded-xl border border-slate-700/50">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Loading</p>
              <p className="text-sm font-extrabold text-blue-200">
                {filteredData.reduce((a, d) => a + (d.loading_min || 0), 0)} min
              </p>
            </div>
            <div className="px-3.5 py-2.5 bg-slate-800/40 rounded-xl border border-slate-700/50">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Unloading</p>
              <p className="text-sm font-extrabold text-amber-200">
                {filteredData.reduce((a, d) => a + (d.unloading_min || 0), 0)} min
              </p>
            </div>
            <div className="px-3.5 py-2.5 bg-slate-800/40 rounded-xl border border-slate-700/50">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Transit</p>
              <p className="text-sm font-extrabold text-purple-200">
                {filteredData.reduce((a, d) => a + (d.transit_min || 0), 0)} min
              </p>
            </div>
            <div className="px-3.5 py-2.5 bg-slate-800/40 rounded-xl border border-slate-700/50">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Total Duration</p>
              <p className="text-sm font-extrabold text-rose-300">
                {filteredData.reduce((a, d) => a + (d.total_duration_min || 0), 0)} min
              </p>
            </div>
          </div>
        </div>
        <div className="absolute -bottom-12 -right-12 opacity-5 pointer-events-none transition-transform rotate-12">
          <Clock className="w-48 h-48" />
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Periode</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:border-blue-500 transition-all" />
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:border-blue-500 transition-all" />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Cari JO / Customer / Driver / Plate</label>
            <div className="relative" ref={dropdownRef}>
              <input
                type="text"
                value={search}
                onChange={handleSearch}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                placeholder="Ketik nama customer, JO, driver, atau plat..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:border-blue-500 transition-all"
                autoComplete="off"
                style={{ backgroundColor: showSuggestions ? '#fef3c7' : undefined }}
              />
              {showSuggestions && search.trim() && data.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-60 overflow-y-auto">
                  {getSuggestions(search).map((s) => (
                    <button
                      key={s.jo_number}
                      onClick={(e) => selectSuggestion(e, s.jo_number)}
                      className="w-full px-3 py-2 text-left text-xs hover:bg-slate-50 border-b border-slate-100 last:border-0 flex items-center gap-2"
                    >
                      <span className="font-mono text-blue-600 w-24">{s.jo_number}</span>
                      <span className="text-slate-600 truncate flex-1">{s.customer_name}</span>
                      <span className="text-slate-500 text-[10px]">{s.driver_name}</span>
                      <span className="font-mono text-slate-500 text-[10px]">{s.plate_number}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Time Analysis Matrix</h3>
          {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {["JO Number", "Customer", "Driver", "Plate", "Loading (min)", "Unloading (min)", "Transit (min)", "Total (min)"].map((h, i) => (
                  <th key={h} className={`px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap ${i >= 4 ? "text-right cursor-pointer hover:bg-slate-100" : ""}`} onClick={() => i >= 4 && handleSort(["loading", "unloading", "transit", "total"][i - 4] as any)}>
                    {h} {i >= 4 && (sortField === ["loading", "unloading", "transit", "total"][i - 4] ? (sortDir === "asc" ? <ArrowUp size={10} /> : <ArrowDown size={10} />) : null)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.map((d, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-xs font-medium text-slate-700">{d.jo_number}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{d.customer_name}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{d.driver_name}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-600">{d.plate_number}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-right text-blue-600">{d.loading_min}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-right text-orange-600">{d.unloading_min}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-right text-purple-600">{d.transit_min}</td>
                  <td className="px-4 py-3 text-xs font-bold text-right text-slate-800">{d.total_duration_min}</td>
                </tr>
              ))}
              {filteredData.length === 0 && !loading && (
                <tr><td colSpan={8} className="py-16 text-center text-slate-400 text-xs">Tidak ada data</td></tr>
              )}
            </tbody>

            {filteredData.length > 0 && (
              <tfoot className="bg-slate-900 text-white font-bold border-t border-slate-900 sticky bottom-0">
                <tr>
                  <td className="px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider" colSpan={4}>
                    TOTAL REKAPITULASI
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-blue-400 whitespace-nowrap text-right">
                    {filteredData.reduce((a, d) => a + (d.loading_min || 0), 0)} min
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-amber-400 whitespace-nowrap text-right">
                    {filteredData.reduce((a, d) => a + (d.unloading_min || 0), 0)} min
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-purple-400 whitespace-nowrap text-right">
                    {filteredData.reduce((a, d) => a + (d.transit_min || 0), 0)} min
                  </td>
                  <td className="px-4 py-3.5 text-xs font-bold text-rose-400 whitespace-nowrap text-right">
                    {filteredData.reduce((a, d) => a + (d.total_duration_min || 0), 0)} min
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </>
  );
}