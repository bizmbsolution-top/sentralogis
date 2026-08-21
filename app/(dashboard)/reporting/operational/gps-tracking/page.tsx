"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { toast, Toaster } from "react-hot-toast";
import {
  ChevronLeft,
  Loader2,
  Truck,
  MapPin,
  Clock,
  Calendar,
  RefreshCw,
  FileSpreadsheet,
  Filter,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

const TRUCKING_SBU_ROLES = [
  "sbu_manager_tr",
  "sbu_ops_tr",
  "sbu_fin_tr",
  "sbu_admin_tr",
];
const GLOBAL_ROLES = ["owner_sentralogis", "tenant_superadmin", "tenant_admin"];

export default function GPSTrackingPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any[]>([]);

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
  const canAccess = !!tenantId && (isTruckingSbu || isGlobalRole);

  const fetchData = useCallback(async () => {
    if (!tenantId || !canAccess) return;
    setLoading(true);
    try {
      const { data: tracks } = await (supabase
        .from("job_tracking") as any)
        .select(
          `*, job_orders!inner(job_number, wo_items!inner(work_orders!inner(job_number, customers:md_entities!customer_id(name, legal_name))), fleets:fleet_id(plate_number, companies:md_entities(name)), drivers:driver_id(name))`
        )
        .eq("tenant_id", tenantId)
        .gte("created_at", startDate)
        .lte("created_at", endDate)
        .eq("status_update", "GPS_PING_BATCH")
        .order("created_at", { ascending: false })
        .limit(500);

      if (tracks) {
        const enriched = tracks.map((t: any) => ({
          id: t.id,
          jo_number: t.job_orders?.job_number,
          wo_number: t.job_orders?.wo_items?.[0]?.work_orders?.job_number,
          customer: t.job_orders?.wo_items?.[0]?.work_orders?.customers?.legal_name,
          fleet: t.job_orders?.fleets?.plate_number,
          vendor: t.job_orders?.fleets?.companies?.name,
          driver: t.job_orders?.drivers?.name,
          lat: t.latitude,
          lng: t.longitude,
          speed: t.speed,
          accuracy: t.accuracy,
          created_at: t.created_at,
          recorded_at: t.recorded_at,
        }));
        setData(enriched);
      }
    } catch (e) {
      toast.error("Gagal memuat GPS data");
    } finally {
      setLoading(false);
    }
  }, [tenantId, canAccess, startDate, endDate]);

  useEffect(() => { fetchData(); }, [fetchData]);

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Toaster position="top-right" />
        <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-center max-w-md">
          <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mb-4">
            <MapPin className="w-7 h-7 text-rose-500" />
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
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">GPS & Telemetry Tracking</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Real-time Fleet Position & Movement History</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isGlobalRole && tenantList.length > 0 && (
            <select value={tenantId || ""} onChange={(e) => setSelectedTenantId(e.target.value)} className="bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500 transition-all shadow-sm">
              {tenantList.map((t) => <option key={t.id} value={t.id}>{t.tenant_code} — {t.name}</option>)}
            </select>
          )}
          <button onClick={fetchData} disabled={loading} className="bg-blue-600 text-white px-4 py-2.5 rounded-xl font-bold tracking-wide text-xs flex items-center gap-2 shadow-sm hover:bg-blue-700 transition-all">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </button>
          <button className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold tracking-wide text-xs flex items-center gap-2 shadow-sm hover:bg-emerald-700 transition-all">
            <FileSpreadsheet className="w-4 h-4" /> EXCEL
          </button>
        </div>
      </header>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1.5 md:col-span-2">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">Periode</label>
            <div className="grid grid-cols-2 gap-2">
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:border-blue-500 transition-all" />
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:border-blue-500 transition-all" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">GPS Pings</h3>
          {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {["JO", "Customer", "Fleet/Plate", "Vendor", "Driver", "Lat", "Lng", "Speed (km/h)", "Accuracy (m)", "Recorded At"].map((h) => (
                  <th key={h} className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.slice(0, 100).map((d, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-xs font-medium text-slate-700">{d.jo_number}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{d.customer}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-600">{d.fleet}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{d.vendor}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{d.driver}</td>
                  <td className="px-4 py-3 text-xs font-mono text-right text-blue-600">{d.lat?.toFixed(6)}</td>
                  <td className="px-4 py-3 text-xs font-mono text-right text-blue-600">{d.lng?.toFixed(6)}</td>
                  <td className="px-4 py-3 text-xs text-right text-slate-600">{d.speed?.toFixed(1)}</td>
                  <td className="px-4 py-3 text-xs text-right text-slate-600">{d.accuracy?.toFixed(1)}</td>
                  <td className="px-4 py-3 text-xs text-right text-slate-500">{new Date(d.recorded_at || d.created_at).toLocaleString("id-ID")}</td>
                </tr>
              ))}
              {data.length === 0 && !loading && (
                <tr><td colSpan={10} className="py-16 text-center text-slate-400 text-xs">Tidak ada GPS data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}