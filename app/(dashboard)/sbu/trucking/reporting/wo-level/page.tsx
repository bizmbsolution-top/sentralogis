"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { toast, Toaster } from "react-hot-toast";
import {
  ChevronLeft,
  Loader2,
  RefreshCw,
  FileSpreadsheet,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Truck,
  Inbox,
  MapPin,
  Calendar,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  FileText,
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

export default function WOLevelReportingPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [allData, setAllData] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [expandedWOs, setExpandedWOs] = useState<Set<string>>(new Set());

  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 90))
      .toISOString()
      .split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [customerFilter, setCustomerFilter] = useState("");
  const [woSearch, setWoSearch] = useState("");

  const [customers, setCustomers] = useState<any[]>([]);
  const [pageSize, setPageSize] = useState<number>(20);
  const [page, setPage] = useState(1);

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

  // Load customers
  useEffect(() => {
    const loadCustomers = async () => {
      if (!tenantId) return;
      const { data } = await supabase
        .from("md_entities")
        .select("id, name, legal_name")
        .eq("is_customer", true)
        .eq("tenant_id", tenantId)
        .order("name");
      setCustomers(data || []);
    };
    loadCustomers();
  }, [tenantId]);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      if (!tenantId || !canAccess) {
        toast.error("Akses ditolak: hanya SBU Trucking / Owner tenant terkait");
        setLoading(false);
        return;
      }

      let query = supabase
        .from("work_orders")
        .select(
          `
                    id,
                    wo_number,
                    order_date,
                    status,
                    customer_id,
                    customers:md_entities!customer_id (id, name, legal_name),
                    wo_items (
                        id,
                        item_code,
                        sbu_type,
                        status,
                        total_revenue,
                        item_data,
                        job_orders (
                            id,
                            jo_number,
                            status,
                            driver_id,
                            fleet_id,
                            advance_amount,
                            purchase_price,
                            md_drivers (name),
                            md_fleets (plate_number, md_fleet_types (type_name)),
                            transporter:md_entities!transporter_id (name, legal_name)
                        )
                    )
                `,
        )
        .eq("tenant_id", tenantId)
        .gte("order_date", startDate)
        .lte("order_date", endDate)
        .order("order_date", { ascending: false });

      if (customerFilter) {
        query = query.eq("customer_id", customerFilter);
      }

      const { data: woData, error } = await query;
      if (error) throw error;

      // Format JO Status helper
      const formatJoStatus = (status: string | null | undefined) => {
        if (!status) return "-";
        const upper = status.toUpperCase();
        if (upper === "PENDING" || upper === "ASSIGNED" || upper === "ACCEPTED") return "MENUNGGU BERANGKAT";
        if (upper === "IN_PROGRESS" || upper === "ON_JOURNEY") return "DALAM PERJALANAN";
        if (upper === "COMPLETED" || upper === "DONE" || upper === "FINISHED") return "SELESAI";
        if (upper === "REJECTED" || upper === "CANCELLED") return "DIBATALKAN";
        return upper.replace(/_/g, " ");
      };

      // Filter and group by WO
      const filtered = (woData || []).filter((wo: any) => {
        if (!woSearch) return true;
        const term = woSearch.toLowerCase();
        return (
          (wo.wo_number || "").toLowerCase().includes(term) ||
          (wo.customers?.name || "").toLowerCase().includes(term) ||
          (wo.customers?.legal_name || "").toLowerCase().includes(term)
        );
      });

      const grouped: any[] = [];
      filtered.forEach((wo: any) => {
        const truckingItems = (wo.wo_items || []).filter(
          (i: any) => i.sbu_type?.toLowerCase() === "trucking",
        );
        if (truckingItems.length === 0) return;

        const firstItem = truckingItems[0];
        const origin =
          firstItem?.item_data?.shipper_name ||
          firstItem?.item_data?.origin_name ||
          "TBA";
        const destination =
          firstItem?.item_data?.recipient_name ||
          firstItem?.item_data?.destination_name ||
          "TBA";
        const routeStr = `${origin} → ${destination}`;
        const truckType = firstItem?.item_data?.vehicle_type_name || "-";

        // Calculate totals
        let totalAR = 0;
        let totalCost = 0;
        const jos: any[] = [];

        truckingItems.forEach((item: any) => {
          const itemAR = Number(
            item.total_revenue || item.item_data?.deal_price || 0,
          );
          const totalJOsInItem = item.job_orders?.length || 1;
          const arShare = itemAR / totalJOsInItem;

          (item.job_orders || []).forEach((jo: any) => {
            const cashTotal = Number(jo.advance_amount || 0);
            const apTotal = Number(jo.purchase_price || jo.vendor_price || 0);
            const isInternal =
              !jo.transporter?.name ||
              jo.transporter?.name?.toLowerCase().includes("sentralogis");
            const cost = isInternal ? cashTotal : apTotal;

            const upperStatus = (jo.status || "").toUpperCase();
            const isAssignedDone =
              upperStatus !== "DIBATALKAN" &&
              upperStatus !== "REJECTED" &&
              upperStatus !== "CANCELLED" &&
              upperStatus !== "DRAFT" &&
              upperStatus !== "";

            if (isAssignedDone) {
              totalAR += arShare;
              totalCost += cost;
            }

            jos.push({
              id: jo.id,
              jo_number: jo.jo_number,
              status: formatJoStatus(jo.status),
              driver_name: jo.md_drivers?.name || "-",
              plate_number:
                jo.md_fleets?.plate_number || jo.plate_number || "-",
              truck_type: jo.md_fleets?.md_fleet_types?.type_name || truckType,
              transporter_name:
                jo.transporter?.name || (isInternal ? "Internal" : "Vendor"),
              advance_amount: cashTotal,
              purchase_price: apTotal,
              ar_share: arShare,
            });
          });
        });

        const totalMargin = totalAR - totalCost;

        grouped.push({
          id: wo.id,
          wo_number: wo.wo_number,
          order_date: wo.order_date,
          customer_name: wo.customers?.legal_name || wo.customers?.name || "-",
          route: routeStr,
          truck_type: truckType,
          total_jo: jos.length,
          total_ar: totalAR,
          total_cost: totalCost,
          margin: totalMargin,
          jos: jos,
        });
      });

      setTotalRecords(grouped.length);
      setAllData(grouped);
    } catch (err: unknown) {
      console.error("[AI] WO reporting sync error: ", err);
      toast.error("Sync Failed");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, customerFilter, woSearch, tenantId, canAccess]);

  useEffect(() => {
    fetchReportData();
    setPage(1);
  }, [fetchReportData]);

  const toggleWO = (woId: string) => {
    setExpandedWOs((prev) => {
      const next = new Set(prev);
      if (next.has(woId)) next.delete(woId);
      else next.add(woId);
      return next;
    });
  };

  const formatNumber = (num: number) => {
    if (!num || isNaN(num)) return "0";
    return num.toLocaleString("id-ID");
  };

  const data = useMemo(() => {
    if (pageSize === 999999) return allData;
    const startIdx = (page - 1) * pageSize;
    return allData.slice(startIdx, startIdx + pageSize);
  }, [allData, page, pageSize]);

  // Bottom Summary metrics calculations
  const totalWOs = data.length;
  const totalJOs = data.reduce((sum, d) => sum + (d.total_jo || 0), 0);
  const totalRevenue = data.reduce((sum, d) => sum + Number(d.total_ar || 0), 0);
  const totalCost = data.reduce((sum, d) => sum + Number(d.total_cost || 0), 0);
  const totalGrossMargin = data.reduce((sum, d) => sum + Number(d.margin || 0), 0);
  const marginRatio = totalRevenue > 0 ? (totalGrossMargin / totalRevenue) * 100 : 0;

  const handleExportExcel = async () => {
    if (data.length === 0) return toast.error("No data to export");
    const tid = toast.loading("Excel Engine Starting...");
    try {
      const XLSX = await import("xlsx");
      const exportData: any[] = [];

      data.forEach((wo: any) => {
        // WO level row
        exportData.push({
          "WO Number": wo.wo_number,
          "Order Date": wo.order_date
            ? format(new Date(wo.order_date), "dd MMM yyyy", { locale: id })
            : "-",
          Customer: wo.customer_name,
          Route: wo.route,
          "Truck Type": wo.truck_type,
          "Total JO": wo.total_jo,
          "Revenue (AR)": `Rp ${formatNumber(wo.total_ar)}`,
          Cost: `Rp ${formatNumber(wo.total_cost)}`,
          Margin: `Rp ${formatNumber(wo.margin)}`,
          "JO Detail": "",
        });

        // JO level rows
        (wo.jos || []).forEach((jo: any) => {
          exportData.push({
            "WO Number": "",
            "Order Date": "",
            Customer: "",
            Route: "",
            "Truck Type": "",
            "Total JO": "",
            "Revenue (AR)": "",
            Cost: "",
            Margin: "",
            "JO Detail": `${jo.jo_number} | ${jo.driver_name} | ${jo.plate_number} | ${jo.transporter_name} | Adv: Rp ${formatNumber(jo.advance_amount)} | Cost: Rp ${formatNumber(jo.purchase_price)}`,
          });
        });
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "WO-Level Report");
      XLSX.writeFile(
        workbook,
        `WO_Report_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
      toast.success("Excel Ready", { id: tid });
    } catch (err: unknown) {
      toast.error(`Excel Error: ${(err as Error).message}`, { id: tid });
    }
  };

  // Pagination
  const totalRows = allData.length;
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

  // Derived metrics for summary
  const sumWO = allData.length;
  const sumRitase = allData.reduce((acc: number, wo: any) => acc + (wo.total_jo || 0), 0);
  const sumRevenue = allData.reduce((acc: number, wo: any) => acc + (wo.total_ar || 0), 0);
  const sumCost = allData.reduce((acc: number, wo: any) => acc + (wo.total_cost || 0), 0);
  const sumMargin = allData.reduce((acc: number, wo: any) => acc + (wo.margin || 0), 0);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24">
      <Toaster position="top-right" />

      {/* Header Section */}
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
              Work Order-Level Report
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              Trucking Financial Analytics by WO & JO
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
              {tenantList.map((t: any) => (
                <option key={t.id} value={t.id}>
                  {t.tenant_code} — {t.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleExportExcel}
            className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold tracking-wide text-xs flex items-center gap-2 shadow-sm hover:bg-emerald-700 transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" /> EXCEL
          </button>
        </div>
      </header>

      {/* Filters Section */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              Date Range
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
              Customer
            </label>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500 transition-all"
            >
              <option value="">All Customers</option>
              {customers.map((c: any) => (
                <option key={c.id} value={c.id}>
                  {c.legal_name || c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
              WO Search
            </label>
            <div className="relative">
              <input
                type="text"
                value={woSearch}
                onChange={(e) => setWoSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 pl-9 text-xs font-medium outline-none focus:border-blue-500 transition-all"
                placeholder="Search by WO Number or Customer..."
              />
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>
        <div className="flex justify-end mt-4">
          <button
            onClick={fetchReportData}
            disabled={loading}
            className="h-[38px] px-6 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />{" "}
            Generate Report
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* SBU Snapshot Card */}
        <div className="bg-slate-900 rounded-2xl p-4 md:p-5 text-white shadow-md relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
              WO Level Snapshot
            </p>
            <h3 className="text-lg font-bold uppercase text-white mb-4">
              Trucking Financials
            </h3>
            <div className="flex flex-wrap items-center gap-4 sm:gap-6">
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-extrabold text-white leading-none">
                  {sumWO}{" "}
                  <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold block sm:inline sm:ml-1">
                    Total WO
                  </span>
                </p>
              </div>
              <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-extrabold text-blue-400 leading-none">
                  {sumRitase}{" "}
                  <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold block sm:inline sm:ml-1">
                    Total Ritase (JO)
                  </span>
                </p>
              </div>
              <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-extrabold text-emerald-300 leading-none">
                  Rp {sumRevenue.toLocaleString("id-ID")}{" "}
                  <span className="text-[10px] text-emerald-500/70 uppercase tracking-wider font-bold block sm:inline sm:ml-1">
                    Revenue (AR)
                  </span>
                </p>
              </div>
              <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
              <div className="flex flex-col">
                <p className="text-xl sm:text-2xl font-extrabold text-rose-300 leading-none">
                  Rp {sumCost.toLocaleString("id-ID")}{" "}
                  <span className="text-[10px] text-rose-500/70 uppercase tracking-wider font-bold block sm:inline sm:ml-1">
                    Cost (AP)
                  </span>
                </p>
              </div>
              <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
              <div className="flex flex-col">
                <p
                  className={`text-xl sm:text-2xl font-extrabold leading-none ${sumMargin >= 0 ? "text-blue-300" : "text-rose-400"}`}
                >
                  Rp {sumMargin.toLocaleString("id-ID")}{" "}
                  <span
                    className={`text-[10px] uppercase tracking-wider font-bold block sm:inline sm:ml-1 ${sumMargin >= 0 ? "text-blue-500/70" : "text-rose-500/70"}`}
                  >
                    Margin
                  </span>
                </p>
              </div>
            </div>
          </div>
          {/* Decorative Elements */}
          <div className="absolute -top-24 -right-24 w-64 h-64 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
          <div className="absolute -bottom-24 -right-12 w-48 h-48 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20"></div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
        <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-40">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
            Work Order Financial Matrix
          </h3>
          {loading && (
            <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          )}
        </div>

        <div className="overflow-auto w-full max-h-[600px] relative">
          <div className="min-w-[1000px]">
            {/* Table Header */}
            <div className="sticky top-0 z-20 bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-3">
              <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">WO Number</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Customer</span>
                </div>
                <div className="col-span-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Route</span>
                </div>
                <div className="col-span-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Truck</span>
                </div>
                <div className="col-span-1 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">JOs</span>
                </div>
                <div className="col-span-1 text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Revenue (AR)</span>
                </div>
                <div className="col-span-1 text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Cost (AP)</span>
                </div>
                <div className="col-span-1 text-right">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Margin</span>
                </div>
              </div>
              <div className="shrink-0 w-4"></div>
            </div>

            {/* WO Rows */}
            <div className="divide-y divide-slate-100">
              {data.map((wo: any) => (
              <div key={wo.id} className="hover:bg-slate-50/30 transition-all">
                {/* WO Header Row */}
                <div
                  className="flex items-center gap-3 px-5 py-4 cursor-pointer select-none"
                  onClick={() => toggleWO(wo.id)}
                >
                  <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-2">
                      <span className="text-xs font-bold text-blue-600 font-mono">
                        {wo.wo_number}
                      </span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-xs font-semibold text-slate-700 truncate block">
                        {wo.customer_name}
                      </span>
                    </div>
                    <div className="col-span-3">
                      <span className="text-xs text-slate-500 truncate block">
                        {wo.route}
                      </span>
                    </div>
                    <div className="col-span-1">
                      <span className="text-[10px] font-bold text-slate-400">
                        {wo.truck_type}
                      </span>
                    </div>
                    <div className="col-span-1 text-center">
                      <span className="text-xs font-bold text-slate-600">
                        {wo.total_jo}
                      </span>
                    </div>
                    <div className="col-span-1 text-right">
                      <span className="text-xs font-semibold text-emerald-600">
                        Rp {formatNumber(wo.total_ar)}
                      </span>
                    </div>
                    <div className="col-span-1 text-right">
                      <span className="text-xs font-semibold text-amber-600">
                        Rp {formatNumber(wo.total_cost)}
                      </span>
                    </div>
                    <div className="col-span-1 text-right">
                      <span
                        className={`text-xs font-bold ${wo.margin >= 0 ? "text-blue-600" : "text-rose-600"}`}
                      >
                        Rp {formatNumber(wo.margin)}
                      </span>
                    </div>
                  </div>
                  <div className="shrink-0 text-slate-300">
                    {expandedWOs.has(wo.id) ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </div>
                </div>

                {/* Expanded JO Details */}
                {expandedWOs.has(wo.id) && (
                  <div className="bg-slate-50/70 border-t border-slate-100">
                    {wo.jos && wo.jos.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="bg-slate-100/50">
                              <th className="px-5 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                JO Number
                              </th>
                              <th className="px-4 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-4 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                Driver
                              </th>
                              <th className="px-4 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                Plate
                              </th>
                              <th className="px-4 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                                Transporter
                              </th>
                              <th className="px-4 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider text-right">
                                Advance
                              </th>
                              <th className="px-4 py-2 text-[9px] font-bold text-slate-500 uppercase tracking-wider text-right">
                                Vendor Cost
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {wo.jos.map((jo: any) => (
                              <tr
                                key={jo.id}
                                className="hover:bg-white transition-all"
                              >
                                <td className="px-5 py-2.5">
                                  <span className="text-xs font-mono font-medium text-blue-600">
                                    {jo.jo_number}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5">
                                  <span
                                    className={`inline-flex px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                      jo.status === "SELESAI"
                                        ? "bg-emerald-50 text-emerald-700"
                                        : jo.status === "DALAM PERJALANAN"
                                          ? "bg-blue-50 text-blue-700"
                                          : jo.status === "DIBATALKAN"
                                            ? "bg-rose-50 text-rose-700"
                                            : jo.status === "MENUNGGU BERANGKAT"
                                              ? "bg-amber-50 text-amber-700"
                                              : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {jo.status || "-"}
                                  </span>
                                </td>
                                <td className="px-4 py-2.5 text-xs text-slate-700">
                                  {jo.driver_name}
                                </td>
                                <td className="px-4 py-2.5 text-xs font-semibold text-slate-600">
                                  {jo.plate_number}
                                </td>
                                <td className="px-4 py-2.5 text-xs text-slate-500">
                                  {jo.transporter_name}
                                </td>
                                <td className="px-4 py-2.5 text-xs text-right font-semibold text-slate-700">
                                  Rp {formatNumber(jo.advance_amount)}
                                </td>
                                <td className="px-4 py-2.5 text-xs text-right font-semibold text-amber-700">
                                  Rp {formatNumber(jo.purchase_price)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="px-5 py-4 text-center text-xs text-slate-400 italic">
                        No Job Orders for this Work Order
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Summary Footer */}
          {data.length > 0 && (
            <div className="sticky bottom-0 z-20 bg-slate-50 border-t border-slate-200 px-5 py-4">
              <div className="flex items-center gap-3 min-w-[1000px]">
                <div className="flex-1 grid grid-cols-12 gap-2 items-center">
                  <div className="col-span-7 flex justify-end">
                    <span className="text-xs font-bold text-slate-600 uppercase tracking-widest mr-4">
                      Total
                    </span>
                  </div>
                  <div className="col-span-1 text-center">
                    <span className="text-sm font-bold text-slate-800">
                      {totalJOs}
                    </span>
                  </div>
                  <div className="col-span-1 text-right">
                    <span className="text-sm font-bold text-emerald-600">
                      Rp {formatNumber(totalRevenue)}
                    </span>
                  </div>
                  <div className="col-span-1 text-right">
                    <span className="text-sm font-bold text-amber-600">
                      Rp {formatNumber(totalCost)}
                    </span>
                  </div>
                  <div className="col-span-1 text-right flex flex-col items-end">
                    <span
                      className={`text-sm font-bold ${totalGrossMargin >= 0 ? "text-blue-600" : "text-rose-600"}`}
                    >
                      Rp {formatNumber(totalGrossMargin)}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
                      {marginRatio.toFixed(1)}% Margin
                    </span>
                  </div>
                </div>
                <div className="shrink-0 w-4"></div>
              </div>
            </div>
          )}

          {data.length === 0 && !loading && (
            <div className="py-24 text-center opacity-25 grayscale flex flex-col items-center justify-center">
              <Inbox className="w-16 h-16 mb-2 text-slate-400" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                No Work Order Data Found
              </p>
            </div>
          )}
          </div>
        </div>

        {/* Pagination */}
        {data.length > 0 && (
          <div className="px-5 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
            <div className="flex items-center gap-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Showing {startRecord}-{endRecord} of {totalRows} records
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
                <option value="50">50 / page</option>
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
  </div>
  );
}
