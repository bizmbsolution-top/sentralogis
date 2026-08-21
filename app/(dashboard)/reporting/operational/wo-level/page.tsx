"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { toast, Toaster } from "react-hot-toast";
import {
  ChevronLeft,
  Loader2,
  FileText,
  Filter,
  RefreshCw,
  FileSpreadsheet,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

const TRUCKING_SBU_ROLES = [
  "sbu_manager_tr",
  "sbu_ops_tr",
  "sbu_fin_tr",
  "sbu_admin_tr",
];
const GLOBAL_ROLES = ["owner_sentralogis", "tenant_superadmin", "tenant_admin"];

export default function WOLevelPage() {
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
      const { data: wos } = await supabase
        .from("work_orders")
        .select(
          `*, customers:md_entities!customer_id(name, legal_name), wo_items(*, job_orders(*))`
        )
        .eq("tenant_id", tenantId)
        .gte("order_date", startDate)
        .lte("order_date", endDate)
        .order("order_date", { ascending: false });

      if (wos) {
        const enriched = wos.flatMap((wo: any) =>
          (wo.wo_items || []).map((item: any) => ({
            wo_number: wo.job_number,
            jo_number: item.job_orders?.[0]?.job_number || "-",
            customer: wo.customers?.legal_name || wo.customers?.name,
            sbu_type: item.sbu_type,
            status: item.job_orders?.[0]?.status || "PENDING",
            route: `${item.item_data?.origin || "-"} → ${item.item_data?.destination || "-"}`,
            ar_total: item.item_data?.deal_price || item.unit_price || 0,
          }))
        );
        setData(enriched);
      }
    } catch (e) {
      toast.error("Gagal memuat WO Level data");
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
            <FileText className="w-7 h-7 text-rose-500" />
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
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">WO Level Detail</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Detail Work Order per Item & Job Order</p>
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
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">WO Level Matrix</h3>
          {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {["WO Number", "JO Number", "Customer", "SBU", "Status", "Route", "Revenue"].map((h) => (
                  <th key={h} className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((d, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-xs font-medium text-slate-700">{d.wo_number}</td>
                  <td className="px-4 py-3 text-xs font-mono text-slate-600">{d.jo_number}</td>
                  <td className="px-4 py-3 text-xs text-slate-600">{d.customer}</td>
                  <td className="px-4 py-3 text-xs"><span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-bold">{d.sbu_type}</span></td>
                  <td className="px-4 py-3 text-xs"><span className={`px-2 py-0.5 rounded text-[9px] font-bold ${d.status === "SELESAI" ? "bg-emerald-100 text-emerald-700" : d.status === "DIBATALKAN" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"}`}>{d.status}</span></td>
                  <td className="px-4 py-3 text-xs text-slate-600">{d.route}</td>
                  <td className="px-4 py-3 text-xs font-semibold text-right text-blue-600">Rp {Number(d.ar_total || 0).toLocaleString("id-ID")}</td>
                </tr>
              ))}
              {data.length === 0 && !loading && (
                <tr><td colSpan={7} className="py-16 text-center text-slate-400 text-xs">Tidak ada data</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}