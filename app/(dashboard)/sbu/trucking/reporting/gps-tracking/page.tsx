"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { toast, Toaster } from "react-hot-toast";
import {
  ChevronLeft,
  Loader2,
  Inbox,
  RefreshCw,
  FileSpreadsheet,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  Truck,
  MapPin,
  Clock,
  Calendar,
  ChevronDown,
  ChevronUp,
  Navigation,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { format } from "date-fns";
import { id } from "date-fns/locale";

const TRUCKING_SBU_ROLES = [
  "sbu_manager_tr",
  "sbu_ops_tr",
  "sbu_fin_tr",
  "sbu_admin_tr",
];
const GLOBAL_ROLES = ["owner_sentralogis", "tenant_superadmin", "tenant_admin"];

function formatDuration(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}j ${m}m`;
  if (m > 0) return `${m}m ${s}d`;
  return `${s}d`;
}

function formatDurationDetail(seconds: number | null): string {
  if (!seconds || seconds <= 0) return "-";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h} jam ${m} menit`;
  if (m > 0) return `${m} menit ${s} detik`;
  return `${s} detik`;
}

export default function GPSTrackingReportPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [groupedData, setGroupedData] = useState<any[]>([]);
  const [totalJO, setTotalJO] = useState(0);
  const [expandedWOs, setExpandedWOs] = useState<Set<string>>(new Set());

  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
      .toISOString()
      .split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(20);
  const [selectedWoId, setSelectedWoId] = useState<string>("all");

  const isTruckingSbu = !!profile && TRUCKING_SBU_ROLES.includes(profile.role);
  const isGlobalRole = !!profile && GLOBAL_ROLES.includes(profile.role);
  const [resolvedTenantId, setResolvedTenantId] = useState<string | null>(
    profile?.tenant_id || null,
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

  const toggleWO = (woId: string) => {
    setExpandedWOs((prev) => {
      const next = new Set(prev);
      if (next.has(woId)) next.delete(woId);
      else next.add(woId);
      return next;
    });
  };

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      if (!tenantId || !canAccess) {
        toast.error("Akses ditolak: hanya SBU Trucking / Owner tenant terkait");
        setLoading(false);
        return;
      }

      // Step 1: Fetch job_routes with actual_arrival within date range
      const { data: routes, error } = await supabase
        .from("job_routes")
        .select(
          "id, sequence, location_name, actual_arrival, actual_departure, status, job_order_id",
        )
        .not("actual_arrival", "is", null)
        .gte("actual_arrival", startDate)
        .lte("actual_arrival", endDate + "T23:59:59")
        .order("sequence", { ascending: true });

      if (error) throw error;

      if (!routes || routes.length === 0) {
        setGroupedData([]);
        setTotalJO(0);
        setLoading(false);
        return;
      }

      // Step 2: Fetch related job_orders
      const joIds = [...new Set(routes.map((r: any) => r.job_order_id))];
      const { data: jos, error: joError } = await supabase
        .from("job_orders")
        .select(
          `id, jo_number, driver_id, fleet_id, plate_number, wo_item_id,
          md_drivers (name), md_fleets (plate_number, md_fleet_types (type_name))
        `,
        )
        .in("id", joIds);

      if (joError) throw joError;

      // Step 3: Fetch wo_items for WO context
      const woItemIds = [
        ...new Set(jos.map((jo: any) => jo.wo_item_id).filter(Boolean)),
      ];
      const woItemMap: Record<string, any> = {};
      const woMap: Record<string, any> = {};

      if (woItemIds.length > 0) {
        const { data: woItems } = await supabase
          .from("wo_items")
          .select("id, wo_id, item_code, item_data")
          .in("id", woItemIds);

        if (woItems) {
          woItems.forEach((wi: any) => {
            woItemMap[wi.id] = wi;
          });

          const woIds = [...new Set(woItems.map((wi: any) => wi.wo_id))];
          if (woIds.length > 0) {
            const { data: wos } = await supabase
              .from("work_orders")
              .select(
                "id, wo_number, customer_id, customers:md_entities!customer_id (id, name, legal_name)",
              )
              .in("id", woIds);

            if (wos) {
              wos.forEach((wo: any) => {
                woMap[wo.id] = {
                  wo_number: wo.wo_number,
                  customer_name:
                    wo.customers?.legal_name || wo.customers?.name || "-",
                };
              });
            }
          }
        }
      }

      // Build JO map
      const joMap: Record<string, any> = {};
      jos.forEach((jo: any) => {
        const woItem = woItemMap[jo.wo_item_id] || {};
        const wo = woMap[woItem.wo_id] || {};
        joMap[jo.id] = {
          jo_number: jo.jo_number,
          driver_name: jo.md_drivers?.name || "-",
          plate_number: jo.md_fleets?.plate_number || jo.plate_number || "-",
          truck_type: jo.md_fleets?.md_fleet_types?.type_name || "-",
          wo_number: wo.wo_number || "-",
          customer_name: wo.customer_name || "-",
          wo_id: woItem.wo_id || null,
        };
      });

      // Step 4: Group routes by JO (and WO)
      const routeGroups: Record<string, any[]> = {};
      (routes || []).forEach((r: any) => {
        const joId = r.job_order_id;
        if (!routeGroups[joId]) routeGroups[joId] = [];
        const joInfo = joMap[joId] || {};
        routeGroups[joId].push({
          ...r,
          jo_number: joInfo.jo_number || "-",
          driver_name: joInfo.driver_name || "-",
          plate_number: joInfo.plate_number || "-",
          truck_type: joInfo.truck_type || "-",
          wo_number: joInfo.wo_number || "-",
          customer_name: joInfo.customer_name || "-",
        });
      });

      // Step 5: Group by WO for display
      const woGroups: Record<string, any> = {};

      Object.entries(routeGroups).forEach(([joId, stops]) => {
        stops.sort((a: any, b: any) => a.sequence - b.sequence);

        // Calculate stats per stop
        let totalDurationSeconds = 0;
        const stopDetails = stops.map((stop: any, idx: number) => {
          const prev = stops[idx - 1] || null;
          const dwellSeconds =
            stop.actual_departure && stop.actual_arrival
              ? Math.floor(
                  (new Date(stop.actual_departure).getTime() -
                    new Date(stop.actual_arrival).getTime()) /
                    1000,
                )
              : null;
          const travelSeconds =
            prev && prev.actual_departure && stop.actual_arrival
              ? Math.floor(
                  (new Date(stop.actual_arrival).getTime() -
                    new Date(prev.actual_departure).getTime()) /
                    1000,
                )
              : null;

          return {
            id: stop.id,
            sequence: stop.sequence,
            location_name: stop.location_name || `Stop #${stop.sequence}`,
            actual_arrival: stop.actual_arrival,
            actual_departure: stop.actual_departure,
            dwell_seconds: dwellSeconds,
            travel_seconds: travelSeconds,
          };
        });

        // Total duration: from first arrival to last departure
        const firstArrival = stops[0]?.actual_arrival;
        const lastDeparture = stops[stops.length - 1]?.actual_departure;
        if (firstArrival && lastDeparture) {
          totalDurationSeconds = Math.floor(
            (new Date(lastDeparture).getTime() -
              new Date(firstArrival).getTime()) /
              1000,
          );
        }

        const joInfo = stops[0];
        const woKey = joInfo.wo_id || joInfo.wo_number || `wo-${joId}`;

        if (!woGroups[woKey]) {
          woGroups[woKey] = {
            wo_id: joInfo.wo_id,
            wo_number: joInfo.wo_number || "-",
            customer_name: joInfo.customer_name || "-",
            jos: [],
          };
        }

        woGroups[woKey].jos.push({
          jo_id: joId,
          jo_number: joInfo.jo_number || "-",
          driver_name: joInfo.driver_name || "-",
          plate_number: joInfo.plate_number || "-",
          truck_type: joInfo.truck_type || "-",
          stops: stopDetails,
          total_duration_seconds: totalDurationSeconds,
          first_arrival: firstArrival,
          last_departure: lastDeparture,
        });
      });

      // Convert to array
      const groupedArray = Object.values(woGroups);
      setTotalJO(groupedArray.length);
      setGroupedData(groupedArray as any[]);
    } catch (err: any) {
      console.error("[AI] GPS tracking sync error:", err);
      const msg =
        err?.message ||
        (typeof err === "string" ? err : "Query error") ||
        "Sync Failed";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, tenantId, canAccess]);

  const filteredData = useMemo(() => {
    if (selectedWoId === "all") return groupedData;
    return groupedData.filter((wo: any) => wo.wo_id === selectedWoId);
  }, [groupedData, selectedWoId]);

  const pagedData = useMemo(() => {
    if (pageSize === 999999) return filteredData;
    const startIdx = (page - 1) * pageSize;
    return filteredData.slice(startIdx, startIdx + pageSize);
  }, [filteredData, page, pageSize]);

  useEffect(() => {
    fetchReportData();
    setPage(1);
  }, [fetchReportData]);

  const handleExportExcel = async () => {
    if (filteredData.length === 0) return toast.error("No data to export");
    const tid = toast.loading("Excel Engine Starting...");
    try {
      const XLSX = await import("xlsx");
      const exportData: any[] = [];

      filteredData.forEach((wo: any) => {
        wo.jos.forEach((jo: any) => {
          // JO Header
          exportData.push({
            "WO Number": wo.wo_number,
            Customer: wo.customer_name,
            "JO Number": jo.jo_number,
            Driver: jo.driver_name,
            Fleet: jo.plate_number,
            "Truck Type": jo.truck_type,
            Location: "--- HEADER ---",
            Arrival: jo.first_arrival
              ? format(new Date(jo.first_arrival), "dd MMM yyyy HH:mm")
              : "-",
            Departure: jo.last_departure
              ? format(new Date(jo.last_departure), "dd MMM yyyy HH:mm")
              : "-",
            "Dwell Time": "",
            "Travel Time": "",
            "Total Duration": formatDurationDetail(jo.total_duration_seconds),
          });

          // Stop details
          jo.stops.forEach((stop: any) => {
            exportData.push({
              "WO Number": "",
              Customer: "",
              "JO Number": "",
              Driver: "",
              Fleet: "",
              "Truck Type": "",
              Location: stop.location_name,
              Arrival: stop.actual_arrival
                ? format(new Date(stop.actual_arrival), "dd MMM yyyy HH:mm")
                : "-",
              Departure: stop.actual_departure
                ? format(new Date(stop.actual_departure), "dd MMM yyyy HH:mm")
                : "-",
              "Dwell Time": formatDuration(stop.dwell_seconds),
              "Travel Time": formatDuration(stop.travel_seconds),
              "Total Duration": "",
            });
          });
        });
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "GPS Tracking by JO");
      XLSX.writeFile(
        workbook,
        `GPS_Tracking_Report_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
      toast.success("Excel Ready", { id: tid });
    } catch (err: unknown) {
      toast.error(`Excel Error: ${(err as Error).message}`, { id: tid });
    }
  };

  const totalRows = filteredData.length;
  const startRecord = totalRows === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, totalRows);
  const totalPages =
    pageSize === 999999 ? 1 : Math.max(1, Math.ceil(totalRows / pageSize));

  if (!canAccess) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24 flex items-center justify-center">
        <Toaster position="top-right" />
        <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-center max-w-md">
          <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mb-4">
            <Truck className="w-7 h-7 text-rose-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            Akses Ditolak
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Halaman reporting SBU Trucking hanya dapat diakses oleh user SBU
            Trucking (tenant scope).
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
              GPS Tracking Report by JO
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              Geofence Dwell Time, Travel Time & Total Duration per Job Order
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
          <Link
            href="/sbu/trucking/reporting/wo-level"
            className="h-[42px] px-4 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm"
          >
            <Navigation className="w-4 h-4" /> WO Financial
          </Link>
          <button
            onClick={handleExportExcel}
            className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold tracking-wide text-xs flex items-center gap-2 shadow-sm hover:bg-emerald-700 transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" /> EXCEL
          </button>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              Date Range (by Arrival)
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:border-blue-500 transition-all"
              />
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              Work Order
            </label>
            <select
              value={selectedWoId}
              onChange={(e) => {
                setSelectedWoId(e.target.value);
                setPage(1);
              }}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:border-blue-500 transition-all cursor-pointer"
            >
              <option value="all">Semua Work Order</option>
              {groupedData.map((wo: any) => (
                <option key={wo.wo_id || wo.wo_number} value={wo.wo_id}>
                  {wo.wo_number} — {wo.customer_name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2 flex items-end justify-end gap-3">
            <button
              onClick={fetchReportData}
              disabled={loading}
              className="h-[42px] px-4 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all flex items-center gap-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${loading ? "animate-spin" : ""}`}
              />{" "}
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-40">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            GPS Tracking per Work Order
          </h3>
          {loading && (
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          )}
        </div>

        <div className="overflow-x-auto w-full">
          {/* WO Groups */}
          {pagedData.map((wo: any) => (
            <div
              key={wo.wo_id || wo.wo_number}
              className="border-b border-slate-200 last:border-b-0"
            >
              {/* WO Header */}
              <div
                className="flex items-center justify-between px-5 py-3 bg-slate-50 hover:bg-slate-100/70 cursor-pointer select-none transition-all"
                onClick={() => toggleWO(wo.wo_id || wo.wo_number)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-blue-700 font-mono">
                        {wo.wo_number}
                      </span>
                      <span className="text-[10px] text-slate-400">|</span>
                      <span className="text-sm font-semibold text-slate-800">
                        {wo.customer_name}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium">
                      {wo.jos.length} Job Order(s) — Total{" "}
                      {wo.jos.reduce(
                        (sum: number, j: any) => sum + j.stops.length,
                        0,
                      )}{" "}
                      location stop(s)
                    </p>
                  </div>
                </div>
                <div className="text-slate-400">
                  {expandedWOs.has(wo.wo_id || wo.wo_number) ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </div>
              </div>

              {/* Expanded JO Details */}
              {expandedWOs.has(wo.wo_id || wo.wo_number) && (
                <div className="divide-y divide-slate-100">
                  {wo.jos.map((jo: any) => {
                    // Calculate first arrival and last departure for total
                    const firstStop = jo.stops[0];
                    const lastStop = jo.stops[jo.stops.length - 1];

                    return (
                      <div key={jo.jo_id} className="bg-white">
                        {/* JO Header Info */}
                        <div className="px-5 py-3 bg-blue-50/30 border-b border-blue-100/50">
                          <div className="flex flex-wrap items-center gap-4">
                            <span className="text-xs font-bold font-mono text-indigo-700">
                              {jo.jo_number}
                            </span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Truck className="w-3 h-3" /> {jo.plate_number}
                            </span>
                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                              <Navigation className="w-3 h-3" />{" "}
                              {jo.driver_name}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              {jo.truck_type}
                            </span>
                            <span className="text-[10px] font-semibold text-emerald-700 ml-auto">
                              Total:{" "}
                              {formatDurationDetail(jo.total_duration_seconds)}
                            </span>
                          </div>
                        </div>

                        {/* Stops Table */}
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-slate-50/80">
                              <th className="px-4 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                #
                              </th>
                              <th className="px-4 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                Location
                              </th>
                              <th className="px-4 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                Enter (Arrival)
                              </th>
                              <th className="px-4 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                Exit (Departure)
                              </th>
                              <th className="px-4 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider text-right">
                                Dwell Time
                              </th>
                              <th className="px-4 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider text-right">
                                Travel to Here
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {jo.stops.map((stop: any) => (
                              <tr
                                key={stop.id}
                                className="hover:bg-slate-50/50 transition-all"
                              >
                                <td className="px-4 py-2.5 text-xs font-bold text-slate-400">
                                  #{stop.sequence}
                                </td>
                                <td className="px-4 py-2.5 text-xs font-semibold text-slate-700">
                                  {stop.location_name}
                                </td>
                                <td className="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                                  {stop.actual_arrival
                                    ? format(
                                        new Date(stop.actual_arrival),
                                        "dd MMM yyyy HH:mm",
                                      )
                                    : "-"}
                                </td>
                                <td className="px-4 py-2.5 text-xs text-slate-600 whitespace-nowrap">
                                  {stop.actual_departure
                                    ? format(
                                        new Date(stop.actual_departure),
                                        "dd MMM yyyy HH:mm",
                                      )
                                    : "-"}
                                </td>
                                <td className="px-4 py-2.5 text-xs font-bold text-right whitespace-nowrap">
                                  {stop.dwell_seconds ? (
                                    <span className="text-emerald-600">
                                      {formatDuration(stop.dwell_seconds)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-2.5 text-xs font-bold text-right whitespace-nowrap">
                                  {stop.travel_seconds ? (
                                    <span className="text-blue-600">
                                      {formatDuration(stop.travel_seconds)}
                                    </span>
                                  ) : (
                                    <span className="text-slate-300">-</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          {/* JO Total Row */}
                          <tfoot>
                            <tr className="bg-slate-100/80">
                              <td
                                colSpan={4}
                                className="px-4 py-2.5 text-[10px] font-bold text-slate-600 uppercase tracking-wider"
                              >
                                Total Duration:{" "}
                                {formatDurationDetail(
                                  jo.total_duration_seconds,
                                )}
                                {firstStop?.actual_arrival &&
                                  lastStop?.actual_departure && (
                                    <span className="text-[9px] text-slate-400 ml-2 font-normal normal-case">
                                      (
                                      {format(
                                        new Date(firstStop.actual_arrival),
                                        "dd MMM HH:mm",
                                      )}{" "}
                                      →{" "}
                                      {format(
                                        new Date(lastStop.actual_departure),
                                        "dd MMM HH:mm",
                                      )}
                                      )
                                    </span>
                                  )}
                              </td>
                              <td
                                colSpan={2}
                                className="px-4 py-2.5 text-xs font-bold text-right text-blue-700"
                              >
                                {formatDuration(jo.total_duration_seconds)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}

          {pagedData.length === 0 && !loading && (
            <div className="py-24 text-center opacity-25 grayscale flex flex-col items-center justify-center">
              <MapPin className="w-16 h-16 mb-2 text-slate-400" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                No GPS Tracking Data Found
              </p>
              <p className="text-[9px] text-slate-400 mt-1">
                Try adjusting the date range
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagedData.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Showing {startRecord}-{endRecord} of {totalRows} WO(s)
              </span>
              <select
                value={pageSize === 999999 ? "all" : pageSize}
                onChange={(e) => {
                  setPageSize(
                    e.target.value === "all" ? 999999 : Number(e.target.value),
                  );
                  setPage(1);
                }}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-slate-700 outline-none cursor-pointer focus:border-blue-500"
              >
                <option value="10">10 / page</option>
                <option value="20">20 / page</option>
                <option value="all">All lines</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeftIcon size={14} className="text-slate-600" />
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  let pageNum: number;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (page <= 3) pageNum = i + 1;
                  else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = page - 2 + i;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all ${page === pageNum ? "bg-blue-600 text-white shadow-md" : "hover:bg-slate-100 text-slate-600"}`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRightIcon size={14} className="text-slate-600" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
