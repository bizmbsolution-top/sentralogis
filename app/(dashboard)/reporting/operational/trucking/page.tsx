"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { toast, Toaster } from "react-hot-toast";
import {
  FileText,
  ChevronLeft,
  Check,
  Search,
  BarChart3,
  Loader2,
  Inbox,
  RefreshCw,
  FileSpreadsheet,
  Filter,
  ChevronDown,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
  MapPin,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { flattenWorkOrderReport } from "@/lib/reporting/transform";

const TRUCKING_SBU_ROLES = [
  "sbu_manager_tr",
  "sbu_ops_tr",
  "sbu_fin_tr",
  "sbu_admin_tr",
];
const GLOBAL_ROLES = ["owner_sentralogis", "tenant_superadmin", "tenant_admin"];

export default function TruckingReportingPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [allData, setAllData] = useState<any[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 90))
      .toISOString()
      .split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [customerFilter, setCustomerFilter] = useState("");
  const [truckTypeFilter, setTruckTypeFilter] = useState("");
  const [transporterFilter, setTransporterFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [joNumberFilter, setJoNumberFilter] = useState("");

  const [customers, setCustomers] = useState<any[]>([]);
  const [truckTypes, setTruckTypes] = useState<string[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(30);

  const columns = [
    { id: "wo_number", label: "WO Number" },
    { id: "jo_number", label: "JO Number" },
    { id: "company_name", label: "Pelanggan" },
    { id: "jo_status", label: "Execution Status" },
    { id: "route", label: "Route" },
    { id: "fleet_info", label: "Fleet/Plate" },
    { id: "vendor_name", label: "Vendor" },
    { id: "truck_type", label: "Truck Type" },
  ];

  const selectedCols = [
    "wo_number",
    "jo_number",
    "company_name",
    "jo_status",
    "route",
    "fleet_info",
    "vendor_name",
    "truck_type",
  ];

  const data = useMemo(() => {
    if (pageSize === 999999) return allData;
    const startIdx = (page - 1) * pageSize;
    return allData.slice(startIdx, startIdx + pageSize);
  }, [allData, page, pageSize]);

  const operationalStatuses = ["done", "rejected", "on_journey", "pending"];

  const fetchMasterData = async () => {
    if (!tenantId) return;
    try {
      const [{ data: ct }, { data: vd }] = await Promise.all([
        supabase
          .from("md_entities")
          .select("id, name, legal_name")
          .eq("is_customer", true)
          .eq("tenant_id", tenantId)
          .order("name"),
        supabase
          .from("md_entities")
          .select("id, name")
          .eq("is_vendor", true)
          .eq("vendor_type", "TRANSPORTER")
          .eq("tenant_id", tenantId)
          .eq("is_active", true)
          .order("name"),
      ]);

      setCustomers(ct || []);
      setVendors(vd || []);
    } catch (e) {}
  };

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
          `*, customers:md_entities!customer_id (id, name, legal_name), wo_items (*, job_orders (*, fleets:fleet_id (id, plate_number, companies:md_entities (id, name))))`,
        )
        .gte("order_date", startDate)
        .lte("order_date", endDate)
        .order("order_date", { ascending: false }) as any;

      query = query.eq("tenant_id", tenantId);

      const { data: woData, error } = await query;

      if (error) throw error;
      const flattened = flattenWorkOrderReport(woData || [], {
        sbuFilter: "TRUCKING",
        statusFilter,
        customerFilter,
        truckTypeFilter,
        transporterFilter,
        vendorFilter,
        joNumberFilter,
        indonesianStatus: true,
      });
      const truckTypeSet = new Set<string>();
      (woData || []).forEach((wo: any) =>
        (wo.wo_items || []).forEach((i: any) => {
          const vt = i.item_data?.vehicle_type_name;
          if (i.sbu_type?.toLowerCase() === "trucking" && vt) truckTypeSet.add(String(vt));
        })
      );
      setTruckTypes(Array.from(truckTypeSet).sort());

      setTotalRecords(flattened.length);
      setAllData(flattened);
    } catch (err: unknown) {
      console.error("[AI] Sync error: ", err);
      toast.error("Sync Failed");
    } finally {
      setLoading(false);
    }
  }, [
    startDate,
    endDate,
    statusFilter,
    customerFilter,
    truckTypeFilter,
    transporterFilter,
    vendorFilter,
    joNumberFilter,
    tenantId,
    canAccess,
  ]);

  const handleExportExcel = async () => {
    if (data.length === 0) return toast.error("No data to export");
    const tid = toast.loading("Excel Engine Starting...");
    try {
      const XLSX = await import("xlsx");
      const colLabels = selectedCols.map(
        (id) => columns.find((c) => c.id === id)?.label || id,
      );
      const excelData = data.map((row) => {
        const filteredRow: any = {};
        selectedCols.forEach((colId, idx) => {
          filteredRow[colLabels[idx]] = row[colId];
        });
        return filteredRow;
      });
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Trucking Report");
      XLSX.writeFile(
        workbook,
        `Trucking_SBU_Report_${new Date().toISOString().split("T")[0]}.xlsx`,
      );
      toast.success("Excel Ready", { id: tid });
    } catch (err: unknown) {
      toast.error(`Excel Error: ${(err as Error).message}`, { id: tid });
    }
  };

  const handleExportPDF = async () => {
    if (data.length === 0) return toast.error("No records found");
    const tid = toast.loading("PDF Matrix Rendering...");
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF("l", "pt");
      const head = [
        selectedCols.map(
          (colId) => columns.find((c) => c.id === colId)?.label || colId,
        ),
      ];
      const body = data.map((item) =>
        selectedCols.map((colId) => {
          const val = item[colId];
          if (
            typeof val === "number" &&
            [
              "ar_total",
              "cash_advance",
              "ap_total",
              "total_cost",
              "gross_margin",
            ].includes(colId)
          ) {
            return `Rp ${val.toLocaleString("id-ID")}`;
          }
          return String(val || "-");
        }),
      );
      doc.setFontSize(18);
      doc.text("SBU TRUCKING OPERATIONAL REPORT", 40, 50);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 68);
      autoTable(doc, {
        headStyles: { fillColor: [15, 23, 42] },
        head: head,
        body: body,
        startY: 85,
        theme: "grid",
        styles: { fontSize: 8 },
      });
      doc.save(`Trucking_SBU_Matrix_${new Date().getTime()}.pdf`);
      toast.success("PDF Downloaded", { id: tid });
    } catch (err: unknown) {
      toast.error(`PDF Error: ${(err as Error).message}`, { id: tid });
    }
  };

  useEffect(() => {
    fetchReportData();
    fetchMasterData();
    setPage(1);
  }, [fetchReportData]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      )
        setShowStatusDropdown(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const totalRitase = data.length;
  const totalPages =
    pageSize === 999999 ? 1 : Math.max(1, Math.ceil(totalRecords / pageSize));
  const startRecord = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, totalRecords);

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Toaster position="top-right" />
        <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-center max-w-md">
          <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mb-4">
            <BarChart3 className="w-7 h-7 text-rose-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">
            Akses Ditolak
          </h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Halaman reporting SBU Trucking hanya dapat diakses oleh user SBU
            Trucking (tenant scope). Silakan login dengan akun SBU Trucking yang
            terikat ke tenant Anda.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" />

      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/sbu/trucking"
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all"
          >
            <ChevronLeft className="w-5 h-5 text-slate-700" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Trucking SBU Reporting
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
              Trucking Operational Reporting System
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

          <button
            onClick={handleExportExcel}
            className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold tracking-wide text-xs flex items-center gap-2 shadow-sm hover:bg-emerald-700 transition-all active:scale-95"
          >
            <FileSpreadsheet className="w-4 h-4" /> EXCEL
          </button>
          <button
            onClick={handleExportPDF}
            className="bg-rose-600 text-white px-4 py-2.5 rounded-xl font-bold tracking-wide text-xs flex items-center gap-2 shadow-sm hover:bg-rose-700 transition-all active:scale-95"
          >
            <FileText className="w-4 h-4" /> PDF
          </button>
        </div>
      </header>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-5 gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              Time Horizon
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

          <div className="space-y-1.5" ref={dropdownRef}>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              Execution Status
            </label>
            <div
              className="relative cursor-pointer"
              onClick={() => setShowStatusDropdown(!showStatusDropdown)}
            >
              <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 flex justify-between items-center select-none">
                <span>
                  {statusFilter.length > 0
                    ? `${statusFilter.length} Selected`
                    : "All Statuses"}
                </span>
                <ChevronDown size={14} className="text-slate-400" />
              </div>
              {showStatusDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                  {operationalStatuses.map((s) => {
                    const labelMap: Record<string, string> = {
                      done: "SELESAI (DONE)",
                      rejected: "DIBATALKAN (REJECTED)",
                      on_journey: "DALAM PERJALANAN",
                      pending: "MENUNGGU BERANGKAT",
                    };
                    return (
                      <button
                        key={s}
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatusFilter((prev) =>
                            prev.includes(s)
                              ? prev.filter((x) => x !== s)
                              : [...prev, s],
                          );
                        }}
                        className="w-full px-4 py-2.5 text-left text-xs font-semibold uppercase transition-all hover:bg-slate-50 flex items-center justify-between"
                      >
                        {labelMap[s] || s.replace(/_/g, " ")}
                        {statusFilter.includes(s) && (
                          <Check className="w-4 h-4 text-blue-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              Truck Type
            </label>
            <select
              value={truckTypeFilter}
              onChange={(e) => setTruckTypeFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500 transition-all"
            >
              <option value="">All Fleet Types</option>
              {truckTypes.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              Transporter
            </label>
            <select
              value={transporterFilter}
              onChange={(e) => setTransporterFilter(e.target.value as any)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500 transition-all"
            >
              <option value="all">All Transporter</option>
              <option value="internal">Internal Fleet</option>
              <option value="vendor">Vendor</option>
            </select>
          </div>

          {transporterFilter === "vendor" && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
                Vendor Name
              </label>
              <select
                value={vendorFilter}
                onChange={(e) => setVendorFilter(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500 transition-all"
              >
                <option value="all">All Vendors</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              JO Number
            </label>
            <input
              type="text"
              value={joNumberFilter}
              onChange={(e) => setJoNumberFilter(e.target.value)}
              placeholder="Search JO..."
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:border-blue-500 transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5 block">
              Account Client
            </label>
            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 transition-all"
            >
              <option value="">All Clients</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.legal_name || c.name}
                </option>
              ))}
            </select>
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

<div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-4 md:p-5 text-white shadow-md relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">
                SBU Snapshot
              </p>
              <h3 className="text-lg font-bold uppercase text-white mb-4">
                Trucking Performance
              </h3>
              <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                <div className="flex flex-col">
                  <p className="text-xl sm:text-2xl font-extrabold text-blue-400 leading-none">
                    {totalRitase}{" "}
                    <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold block sm:inline sm:ml-1">
                      Total Ritase
                    </span>
                  </p>
                </div>
                <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
                <div className="flex flex-col">
                  <p className="text-xl sm:text-2xl font-extrabold text-emerald-300 leading-none">
                    {data.filter(d => d.jo_status === "SELESAI").length}{" "}
                    <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold block sm:inline sm:ml-1">
                      Completed
                    </span>
                  </p>
                </div>
                <div className="w-px h-6 bg-white/10 hidden sm:block"></div>
                <div className="flex flex-col">
                  <p className="text-xl sm:text-2xl font-extrabold text-amber-300 leading-none">
                    {data.filter(d => d.jo_status === "DALAM PERJALANAN").length}{" "}
                    <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold block sm:inline sm:ml-1">
                      In Transit
                    </span>
                  </p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-white/5 pt-3">
                <div className="px-3.5 py-2.5 bg-slate-800/40 rounded-xl border border-slate-700/50">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Pending
                  </p>
                  <p className="text-sm font-extrabold text-blue-200">
                    {data.filter(d => d.jo_status === "MENUNGGU BERANGKAT").length}
                  </p>
                </div>
                <div className="px-3.5 py-2.5 bg-slate-800/40 rounded-xl border border-slate-700/50">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Cancelled
                  </p>
                  <p className="text-sm font-extrabold text-emerald-200">
                    {data.filter(d => d.jo_status === "DIBATALKAN").length}
                  </p>
                </div>
                <div className="px-3.5 py-2.5 bg-slate-800/40 rounded-xl border border-slate-700/50">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Internal Fleet
                  </p>
                  <p className="text-sm font-extrabold text-amber-200">
                    {data.filter(d => d.vendor_name?.toLowerCase().includes("internal") || d.vendor_name?.toLowerCase().includes("own")).length}
                  </p>
                </div>
                <div className="px-3.5 py-2.5 bg-slate-800/40 rounded-xl border border-slate-700/50">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">
                    Vendor Fleet
                  </p>
                  <p className="text-sm font-extrabold text-rose-300">
                    {data.filter(d => !d.vendor_name?.toLowerCase().includes("internal") && !d.vendor_name?.toLowerCase().includes("own")).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-12 -right-12 opacity-5 pointer-events-none transition-transform rotate-12">
              <BarChart3 className="w-48 h-48" />
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-40">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                Trucking Operational Matrix
              </h3>
              {loading && (
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              )}
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {selectedCols.map((colId) => (
                      <th
                        key={colId}
                        className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-wider"
                      >
                        {columns.find((c) => c.id === colId)?.label || colId}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((row, idx) => (
                    <tr
                      key={idx}
                      className="hover:bg-slate-50/50 transition-all"
                    >
                      {selectedCols.map((colId) => {
                        let val = row[colId];
                        if (colId === "jo_status") {
                          const color =
                            val === "SELESAI"
                              ? "bg-emerald-100 text-emerald-700"
                              : val === "DALAM PERJALANAN"
                                ? "bg-blue-100 text-blue-700"
                                : val === "DIBATALKAN"
                                  ? "bg-rose-100 text-rose-700"
                                  : val === "MENUNGGU BERANGKAT"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-slate-100 text-slate-700";
                          val = (
                            <span
                              className={`px-2.5 py-1 border rounded-lg font-bold text-[9px] uppercase tracking-wide ${color}`}
                            >
                              {val}
                            </span>
                          );
                        }
                        if (
                          [
                            "ar_total",
                            "cash_advance",
                            "ap_total",
                            "total_cost",
                            "gross_margin",
                          ].includes(colId)
                        ) {
                          val = (
                            <span
                              className={`font-semibold ${colId === "gross_margin" ? "text-blue-600" : "text-slate-800"} whitespace-nowrap text-xs`}
                            >
                              Rp {Number(val || 0).toLocaleString("id-ID")}
                            </span>
                          );
                        }
                        return (
                          <td
                            key={colId}
                            className="px-4 py-3 text-xs font-medium text-slate-700 whitespace-nowrap"
                          >
                            {val}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>

                {data.length > 0 && (
                  <tfoot className="bg-slate-900 text-white font-bold border-t border-slate-900 sticky bottom-0">
                    <tr>
                      <td
                        className="px-4 py-3.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider"
                        colSpan={3}
                      >
                        TOTAL REKAPITULASI
                      </td>
                      <td className="px-4 py-3.5 text-xs font-bold text-blue-400 whitespace-nowrap">
                        {totalRitase} Ritase
                      </td>
                      <td colSpan={5} className="px-4"></td>
                    </tr>
                  </tfoot>
                )}
              </table>

              {data.length > 0 && (
                <div className="px-5 py-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Showing {startRecord}-{endRecord} of {totalRecords}{" "}
                      records
                    </span>
                    <select
                      value={pageSize === 999999 ? "all" : pageSize}
                      onChange={(e) => {
                        const val = e.target.value;
                        setPageSize(val === "all" ? 999999 : Number(val));
                        setPage(1);
                      }}
                      className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-slate-700 outline-none cursor-pointer focus:border-blue-500"
                    >
                      <option value="10">10 / page</option>
                      <option value="30">30 / page</option>
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
                      {Array.from(
                        { length: Math.min(totalPages, 5) },
                        (_, i) => {
                          let pageNum: number;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (page <= 3) {
                            pageNum = i + 1;
                          } else if (page >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = page - 2 + i;
                          }

                          return (
                            <button
                              key={pageNum}
                              onClick={() => setPage(pageNum)}
                              className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all ${
                                page === pageNum
                                  ? "bg-blue-600 text-white shadow-md"
                                  : "hover:bg-slate-100 text-slate-600"
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        },
                      )}
                    </div>

                    <button
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                      className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      <ChevronRightIcon size={14} className="text-slate-600" />
                    </button>
                  </div>
                </div>
              )}

              {data.length === 0 && !loading && (
                <div className="py-24 text-center opacity-25 grayscale flex flex-col items-center justify-center">
                  <Inbox className="w-16 h-16 mb-2 text-slate-400" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Trucking Matrix Empty
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
    </>
  );
}