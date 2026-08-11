"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast, Toaster } from "react-hot-toast";
import {
  FileText, ChevronLeft, Check, BarChart3, Loader2, Inbox,
  FileSpreadsheet, Filter, ChevronDown,
  Truck, Warehouse, LayoutGrid, Ship, Layers,
  PackageCheck, XCircle
} from "lucide-react";
import {
  COL_OPERATION, COL_FINANCIAL, NUMERIC_COLS, SBU_PILL_COLORS,
  type ColDef,
} from "@/lib/reporting/columns";
import {
  COMPLETED_STATUSES,
} from "@/lib/reporting/status";
import { flattenWorkOrderReport } from "@/lib/reporting/transform";
import { fmtCurrency } from "@/lib/reporting/financials";

// ─── SBU Config ────────────────────────────────────────────────────
const SBU_TABS = [
  { id: "all",        label: "All SBU",     icon: Layers,     color: "slate" },
  { id: "TRUCKING",   label: "Trucking",    icon: Truck,      color: "blue" },
  { id: "WAREHOUSE",  label: "Warehouse",   icon: Warehouse,  color: "amber" },
  { id: "CLEARANCE",  label: "Clearance",   icon: LayoutGrid, color: "emerald" },
  { id: "FORWARDING", label: "Forwarding",  icon: Ship,       color: "indigo" },
] as const;

type SbuId = typeof SBU_TABS[number]["id"];

// ─── Component ─────────────────────────────────────────────────────
export default function HQReportingPage() {
  const { profile } = useAuth();

  // ─── Access control ────────────────────────────────────────────────
  // Roles that may view HQ reporting (all scoped to a single tenant).
  const HQ_REPORTING_ROLES = [
    "hq_cs",
    "hq_ops",
    "hq_finance",
    "hq_director_ops",
    "hq_director_fin",
    "hq_director_cs",
    "hq_commercial_director",
    "hq_director_comm",
    "hq_director_bizdev",
    "hq_director_hrd",
  ];
  const GLOBAL_ROLES = ["owner_sentralogis", "tenant_superadmin", "tenant_admin"];

  const isHqRole = !!profile && HQ_REPORTING_ROLES.includes(profile.role);
  const isGlobalRole = !!profile && GLOBAL_ROLES.includes(profile.role);
  const [resolvedTenantId, setResolvedTenantId] = useState<string | null>(
    profile?.tenant_id || null,
  );
  const [tenantList, setTenantList] = useState<any[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  // Global roles without a tenant in profile → resolve first tenant.
  useEffect(() => {
    if (!profile) return;
    if (profile.tenant_id) {
      setResolvedTenantId(profile.tenant_id);
      return;
    }
    if (isGlobalRole) {
      const fetchTenant = async () => {
        const { data } = await supabase.from("tenants").select("id").limit(1);
        if (data && data.length > 0) setResolvedTenantId((data[0] as { id: string }).id);
      };
      fetchTenant();
    }
  }, [profile, isGlobalRole]);

  // Global roles pick which tenant to report on.
  useEffect(() => {
    if (!isGlobalRole) return;
    const fetchTenantList = async () => {
      const { data } = await supabase
        .from("tenants")
        .select("id, tenant_code, name")
        .order("tenant_code");
      if (data && data.length > 0) {
        setTenantList(data);
        setSelectedTenantId((prev) => prev || resolvedTenantId || (data[0] as { id: string }).id);
      }
    };
    fetchTenantList();
  }, [isGlobalRole, resolvedTenantId]);

  // Effective tenant: HQ roles locked to their tenant; global roles use the selector.
  const tenantId = isGlobalRole ? selectedTenantId || resolvedTenantId : resolvedTenantId;
  const canAccess = !!tenantId && (isHqRole || isGlobalRole);

  // UI state
  const [loading, setLoading] = useState(false);
  const [reportMode, setReportMode] = useState<"operation" | "financial">("operation");
  const [sbuTab, setSbuTab] = useState<SbuId>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter state
  const [startDate, setStartDate] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [customerFilter, setCustomerFilter] = useState("");
  const [customerChildren, setCustomerChildren] = useState<any[]>([]);
  // SBU-specific
  const [truckTypeFilter, setTruckTypeFilter] = useState("");
  const [transporterFilter, setTransporterFilter] = useState("all");
  const [vendorFilter, setVendorFilter] = useState("all");
  const [clearanceModeFilter, setClearanceModeFilter] = useState("all");
  const [warehouseFilter, setWarehouseFilter] = useState("");
  const [opTypeFilter, setOpTypeFilter] = useState("all");

  // Master data
  const [customers, setCustomers] = useState<any[]>([]);
  const [truckTypes, setTruckTypes] = useState<string[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [transporters, setTransporters] = useState<any[]>([]);

  // Report data
  const [data, setData] = useState<any[]>([]);

  const statusOptions = ["done", "rejected"];

  // ─── Fetch Master Data ────────────────────────────────────────────
  const fetchMasterData = async () => {
    if (!tenantId || !canAccess) return;
    try {
      const [{ data: allCt }, { data: tt }, { data: wh }, { data: tr }] = await Promise.all([
        supabase.from("md_entities").select("id, name, legal_name, parent_id").eq("is_customer", true).eq("is_active", true).eq("tenant_id", tenantId).order("name"),
        supabase.from("wo_items").select("item_data").eq("sbu_type", "TRUCKING").eq("tenant_id", tenantId),
        supabase.from("md_warehouses").select("id, name").eq("tenant_id", tenantId).order("name"),
        supabase.from("md_entities").select("id, name, vendor_type").eq("is_vendor", true).eq("tenant_id", tenantId).eq("is_active", true).order("name"),
      ]);
      const parentCustomers = (allCt || []).filter((c: any) => !c.parent_id);
      const childCustomers = (allCt || []).filter((c: any) => c.parent_id);
      setCustomers(parentCustomers);
      setCustomerChildren(childCustomers);
      setWarehouses(wh || []);
      setTransporters(tr || []);
      const types = (tt || []).map((t: any) => t.item_data?.vehicle_type_name).filter(Boolean);
      setTruckTypes(Array.from(new Set(types)) as string[]);
    } catch (_) { /* silent */ }
  };

  // ─── Fetch Report Data ────────────────────────────────────────────
  const fetchReportData = useCallback(async () => {
    if (!tenantId) return;
    if (!canAccess) {
      toast.error("Akses ditolak: hanya role HQ / global yang dapat melihat report");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data: woData, error } = await supabase
        .from("work_orders")
        .select(`*, customers:md_entities!customer_id (id, name, legal_name), wo_items (*, wo_item_manifests (id, quantity, md_product_skus (name, sku_code)), job_orders (*, fleets:fleet_id (id, plate_number, companies:md_entities (id, name))))`)
        .eq("tenant_id", tenantId)
        .gte("order_date", startDate)
        .lte("order_date", endDate)
        .order("order_date", { ascending: false });

      if (error) throw error;

      const flattened = flattenWorkOrderReport(woData || [], {
        sbuFilter: sbuTab,
        statusFilter,
        customerFilter,
        customerChildren,
        truckTypeFilter,
        transporterFilter,
        vendorFilter,
        clearanceModeFilter,
        warehouseFilter,
        opTypeFilter,
      });
      setData(flattened);
    } catch (err: unknown) {
      console.error("[Reporting] Sync error:", err);
      toast.error("Gagal sinkronisasi data");
    } finally {
      setLoading(false);
    }
  }, [tenantId, canAccess, startDate, endDate, sbuTab, statusFilter, customerFilter, truckTypeFilter, transporterFilter, vendorFilter, clearanceModeFilter, warehouseFilter, opTypeFilter]);

  // ─── Active Columns ───────────────────────────────────────────────
  const activeCols: ColDef[] = reportMode === "financial"
    ? COL_FINANCIAL
    : COL_OPERATION[sbuTab] || COL_OPERATION.all;

  const activeColIds = activeCols.map(c => c.id);

  // ─── Export Excel ─────────────────────────────────────────────────
  const handleExportExcel = async () => {
    if (data.length === 0) return toast.error("Tidak ada data");
    const tid = toast.loading("Generating Excel...");
    try {
      const XLSX = await import("xlsx");
      const colLabels = activeCols.map(c => c.label);
      const excelData = data.map(row => {
        const r: any = {};
        activeCols.forEach((col, idx) => {
          r[colLabels[idx]] = NUMERIC_COLS.includes(col.id) ? Number(row[col.id] || 0) : (row[col.id] || "-");
        });
        return r;
      });
      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      const sheetName = sbuTab === "all" ? "All SBU" : sbuTab;
      XLSX.utils.book_append_sheet(wb, ws, `${sheetName} Report`);
      XLSX.writeFile(wb, `Sentralogis_${sheetName}_${reportMode}_${new Date().toISOString().split("T")[0]}.xlsx`);
      toast.success("Excel siap!", { id: tid });
    } catch (err: unknown) {
      toast.error(`Excel Error: ${(err as Error).message}`, { id: tid });
    }
  };

  // ─── Export PDF ───────────────────────────────────────────────────
  const handleExportPDF = async () => {
    if (data.length === 0) return toast.error("Tidak ada data");
    const tid = toast.loading("Rendering PDF...");
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF("l", "pt");
      const head = [activeCols.map(c => c.label)];
      const body = data.map(row =>
        activeCols.map(col => {
          const val = row[col.id];
          if (NUMERIC_COLS.includes(col.id)) return fmtCurrency(Number(val || 0));
          return String(val || "-");
        })
      );
      const sbuLabel = sbuTab === "all" ? "ALL SBU" : sbuTab;
      doc.setFontSize(16);
      doc.text(`SENTRALOGIS — ${sbuLabel} ${reportMode.toUpperCase()} REPORT`, 40, 45);
      doc.setFontSize(9);
      doc.text(`Period: ${startDate} s/d ${endDate}  |  Generated: ${new Date().toLocaleString("id-ID")}`, 40, 62);
      autoTable(doc, {
        headStyles: { fillColor: [15, 23, 42] },
        head, body, startY: 78, theme: "grid",
        styles: { fontSize: 7 },
      });
      doc.save(`Sentralogis_${sbuLabel}_${Date.now()}.pdf`);
      toast.success("PDF downloaded!", { id: tid });
    } catch (err: unknown) {
      toast.error(`PDF Error: ${(err as Error).message}`, { id: tid });
    }
  };

  // ─── Effects ──────────────────────────────────────────────────────
  useEffect(() => {
    if (tenantId) { fetchMasterData(); fetchReportData(); }
  }, [fetchReportData, tenantId]);

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowStatusDropdown(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  // ─── Summary Metrics ─────────────────────────────────────────────
  const sbuCounts = data.reduce((acc, d) => {
    acc[d.sbu_type] = (acc[d.sbu_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const totalWO = new Set(data.map(d => d.wo_number)).size;
  const totalJO = data.length;
  const totalRevenue = data.reduce((s, d) => s + Number(d.ar_total || 0), 0);
  const totalCost = data.reduce((s, d) => s + Number(d.total_cost || 0), 0);
  const totalGrossMargin = data.reduce((s, d) => s + Number(d.gross_margin || 0), 0);
  const marginRatio = totalRevenue > 0 ? (totalGrossMargin / totalRevenue) * 100 : 0;
  const completedCount = data.filter(d => d.jo_status !== "REJECTED").length;
  const rejectedCount = data.filter(d => d.jo_status === "REJECTED").length;

  // ─── Footer Sums ─────────────────────────────────────────────────
  const footerSums: Record<string, number> = {};
  NUMERIC_COLS.forEach(colId => {
    if (activeColIds.includes(colId)) {
      footerSums[colId] = data.reduce((s, d) => s + Number(d[colId] || 0), 0);
    }
  });

  // ─── Render ───────────────────────────────────────────────────────
  if (!canAccess) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto pb-24 flex items-center justify-center">
        <Toaster position="top-right" />
        <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-center max-w-md">
          <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mb-4">
            <BarChart3 className="w-7 h-7 text-rose-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Akses Ditolak</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Halaman Reporting HQ hanya dapat diakses oleh role HQ / global yang terikat ke tenant.
            Silakan login dengan akun yang berhak.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto pb-24">
      <Toaster position="top-right" />

      {/* ===== HEADER ===== */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div className="flex items-center gap-4">
          <Link href="/hq/ops-dashboard" className="p-2.5 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all">
            <ChevronLeft className="w-5 h-5 text-slate-700" />
          </Link>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">WO Completion Report</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Laporan Work Order Selesai & Rejected — Semua SBU</p>
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
                <option key={t.id} value={t.id}>{t.tenant_code} — {t.name}</option>
              ))}
            </select>
          )}
          {/* Mode Toggle */}
          <div className="flex p-0.5 bg-slate-100 rounded-xl border border-slate-200 mr-auto md:mr-0">
            <button onClick={() => setReportMode("operation")} className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${reportMode === "operation" ? "bg-white text-blue-600 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>Operations</button>
            <button onClick={() => setReportMode("financial")} className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${reportMode === "financial" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-500 hover:text-slate-900"}`}>Financials</button>
          </div>
          <button onClick={handleExportExcel} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold tracking-wide text-xs flex items-center gap-2 shadow-sm hover:bg-emerald-700 transition-all active:scale-95"><FileSpreadsheet className="w-4 h-4" /> EXCEL</button>
          <button onClick={handleExportPDF} className="bg-rose-600 text-white px-4 py-2.5 rounded-xl font-bold tracking-wide text-xs flex items-center gap-2 shadow-sm hover:bg-rose-700 transition-all active:scale-95"><FileText className="w-4 h-4" /> PDF</button>
        </div>
      </header>

      {/* ===== SBU TAB BAR ===== */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-6 scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
        {SBU_TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = sbuTab === tab.id;
          const count = tab.id === "all" ? data.length : (sbuCounts[tab.id] || 0);
          return (
            <button
              key={tab.id}
              onClick={() => setSbuTab(tab.id as SbuId)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all flex-shrink-0 ${
                isActive
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                  : "bg-white text-slate-400 border border-slate-200 hover:border-slate-300 hover:text-slate-600"
              }`}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-black ${isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* ===== Mobile Filter Toggle ===== */}
      <div className="xl:hidden mb-4">
        <button onClick={() => setShowFilters(!showFilters)} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
          <Filter size={14} className="text-slate-500" />
          {showFilters ? "Sembunyikan Filter" : "Tampilkan Filter"}
        </button>
      </div>

      {/* ===== MAIN GRID ===== */}
      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 items-start">

        {/* ─── Filter Sidebar ──────────────────────────────────────── */}
        <aside className={`${showFilters ? "block" : "hidden"} xl:block space-y-4`}>
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">

            {/* Time Horizon */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Periode</label>
              <div className="grid grid-cols-2 gap-2">
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:border-blue-500 transition-all" />
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:border-blue-500 transition-all" />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-1.5" ref={dropdownRef}>
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Status</label>
              <div className="flex bg-slate-50 p-0.5 rounded-xl border border-slate-200">
                <button onClick={() => setStatusFilter([])} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${statusFilter.length === 0 ? "bg-white text-slate-900 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                  All
                </button>
                <button onClick={() => setStatusFilter(["done"])} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${statusFilter.includes("done") && !statusFilter.includes("rejected") ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                  <PackageCheck size={12} /> Selesai
                </button>
                <button onClick={() => setStatusFilter(["rejected"])} className={`flex-1 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1 ${statusFilter.includes("rejected") && !statusFilter.includes("done") ? "bg-white text-rose-600 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
                  <XCircle size={12} /> Rejected
                </button>
              </div>
            </div>

            {/* Client */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pelanggan</label>
              <select value={customerFilter} onChange={e => setCustomerFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 transition-all">
                <option value="">Semua Pelanggan</option>
                {customers.map(c => <option key={c.id} value={c.id}>{c.legal_name || c.name}</option>)}
              </select>
            </div>

            {/* ─── SBU-Specific Filters ─────────────────────────── */}

            {/* Trucking Filters */}
            {(sbuTab === "TRUCKING" || sbuTab === "all") && (
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-blue-500 flex items-center gap-1.5"><Truck size={10} /> Trucking Filters</p>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Truck Type</label>
                  <select value={truckTypeFilter} onChange={e => setTruckTypeFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 transition-all">
                    <option value="">All Fleet Types</option>
                    {truckTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Transporter</label>
                  <div className="flex bg-slate-50 p-0.5 rounded-xl border border-slate-200">
                    <button onClick={() => { setTransporterFilter("all"); setVendorFilter("all"); }} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${transporterFilter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}>All</button>
                    <button onClick={() => { setTransporterFilter("internal"); setVendorFilter("all"); }} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${transporterFilter === "internal" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}>Internal</button>
                    <button onClick={() => setTransporterFilter("vendor")} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${transporterFilter === "vendor" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400"}`}>Vendor</button>
                  </div>
                </div>
                {transporterFilter === "vendor" && (
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nama Vendor</label>
                    <select value={vendorFilter} onChange={e => setVendorFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 transition-all">
                      <option value="all">Semua Vendor</option>
                      {transporters.filter((t: any) => t.vendor_type === "TRANSPORTER").map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {/* Warehouse Filters */}
            {(sbuTab === "WAREHOUSE" || sbuTab === "all") && (
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-amber-500 flex items-center gap-1.5"><Warehouse size={10} /> Warehouse Filters</p>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Gudang</label>
                  <select value={warehouseFilter} onChange={e => setWarehouseFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 transition-all">
                    <option value="">Semua Gudang</option>
                    {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Tipe Operasi</label>
                  <div className="flex bg-slate-50 p-0.5 rounded-xl border border-slate-200">
                    <button onClick={() => setOpTypeFilter("all")} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${opTypeFilter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}>All</button>
                    <button onClick={() => setOpTypeFilter("inbound")} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${opTypeFilter === "inbound" ? "bg-white text-sky-600 shadow-sm" : "text-slate-400"}`}>IN</button>
                    <button onClick={() => setOpTypeFilter("outbound")} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${opTypeFilter === "outbound" ? "bg-white text-orange-600 shadow-sm" : "text-slate-400"}`}>OUT</button>
                  </div>
                </div>
              </div>
            )}

            {/* Clearance Filters */}
            {(sbuTab === "CLEARANCE" || sbuTab === "all") && (
              <div className="space-y-4 pt-3 border-t border-slate-100">
                <p className="text-[9px] font-black uppercase tracking-widest text-emerald-500 flex items-center gap-1.5"><LayoutGrid size={10} /> Clearance Filters</p>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Mode</label>
                  <div className="flex bg-slate-50 p-0.5 rounded-xl border border-slate-200">
                    <button onClick={() => setClearanceModeFilter("all")} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${clearanceModeFilter === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-400"}`}>All</button>
                    <button onClick={() => setClearanceModeFilter("import")} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${clearanceModeFilter === "import" ? "bg-white text-blue-600 shadow-sm" : "text-slate-400"}`}>Import</button>
                    <button onClick={() => setClearanceModeFilter("export")} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${clearanceModeFilter === "export" ? "bg-white text-emerald-600 shadow-sm" : "text-slate-400"}`}>Export</button>
                  </div>
                </div>
              </div>
            )}

          </div>
        </aside>

        {/* ─── Main Content ────────────────────────────────────────── */}
        <main className="xl:col-span-4 space-y-6">

          {/* ── Snapshot Card ──────────────────────────────────── */}
          <div className="bg-slate-900 rounded-2xl p-5 md:p-6 text-white shadow-md relative overflow-hidden">
            <div className="relative z-10">
              <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-3">Completion Report Snapshot</p>

              {/* Top metrics */}
              <div className="flex flex-wrap items-center gap-6 mb-5">
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-blue-400 leading-none">
                    {totalWO} <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold block sm:inline sm:ml-1">Work Orders</span>
                  </p>
                </div>
                <div className="w-px h-8 bg-white/10 hidden sm:block" />
                <div>
                  <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 leading-none">
                    {totalJO} <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold block sm:inline sm:ml-1">Job Orders</span>
                  </p>
                </div>
                <div className="w-px h-8 bg-white/10 hidden sm:block" />
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-emerald-500/20 rounded-lg text-[10px] font-black text-emerald-300 border border-emerald-500/20">
                    <PackageCheck size={10} className="inline mr-1" />{completedCount} Selesai
                  </span>
                  {rejectedCount > 0 && (
                    <span className="px-2.5 py-1 bg-rose-500/20 rounded-lg text-[10px] font-black text-rose-300 border border-rose-500/20">
                      <XCircle size={10} className="inline mr-1" />{rejectedCount} Rejected
                    </span>
                  )}
                </div>
              </div>

              {/* SBU Breakdown pills */}
              <div className="flex flex-wrap gap-2 mb-5">
                {Object.entries(sbuCounts).map(([sbu, count]) => (
                  <span key={sbu} className="px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 text-[10px] font-bold text-white/70">
                    {sbu}: <span className="text-white font-extrabold">{String(count)}</span>
                  </span>
                ))}
              </div>

              {/* Financial row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-white/5 pt-4">
                <div className="px-3.5 py-2.5 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                  <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5">Total Revenue</p>
                  <p className="text-sm font-extrabold text-emerald-300">{fmtCurrency(totalRevenue)}</p>
                </div>
                <div className="px-3.5 py-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
                  <p className="text-[9px] font-bold text-amber-400 uppercase tracking-wider mb-0.5">Total Cost</p>
                  <p className="text-sm font-extrabold text-amber-300">{fmtCurrency(totalCost)}</p>
                </div>
                <div className="px-3.5 py-2.5 bg-blue-500/10 rounded-xl border border-blue-500/20">
                  <p className="text-[9px] font-bold text-blue-400 uppercase tracking-wider mb-0.5">Gross Margin</p>
                  <p className="text-sm font-extrabold text-blue-300">{fmtCurrency(totalGrossMargin)}</p>
                </div>
                <div className="px-3.5 py-2.5 bg-rose-500/10 rounded-xl border border-rose-500/20">
                  <p className="text-[9px] font-bold text-rose-400 uppercase tracking-wider mb-0.5">Margin Ratio</p>
                  <p className="text-sm font-extrabold text-rose-300">{marginRatio.toFixed(1)}%</p>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-12 -right-12 opacity-5 pointer-events-none rotate-12"><BarChart3 className="w-48 h-48" /></div>
          </div>

          {/* ── Table Matrix ──────────────────────────────────── */}
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
            <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-40">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                {reportMode === "operation" ? "Operational Matrix" : "Financial Matrix"}
                {sbuTab !== "all" && <span className="ml-2 text-slate-400">— {sbuTab}</span>}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-slate-400">{data.length} records</span>
                {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
              </div>
            </div>

            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200">
                    {activeCols.map(col => (
                      <th key={col.id} className={`px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap ${col.numeric ? "text-right" : ""}`}>
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-all">
                      {activeCols.map(col => {
                        let val: any = row[col.id];

                        // Status badge
                        if (col.id === "jo_status") {
                          const isDone = COMPLETED_STATUSES.includes(val?.toLowerCase() || "");
                          const isRej = val === "REJECTED";
                          const color = isDone
                            ? "bg-emerald-50 text-emerald-700 border-emerald-100"
                            : isRej
                            ? "bg-rose-50 text-rose-700 border-rose-100"
                            : "bg-slate-100 text-slate-600 border-slate-200";
                          val = <span className={`px-2.5 py-1 border rounded-lg font-bold text-[9px] uppercase tracking-wide ${color}`}>{val}</span>;
                        }

                        // SBU type badge
                        if (col.id === "sbu_type") {
                          const pillColor = SBU_PILL_COLORS[val] || "bg-slate-100 text-slate-600 border-slate-200";
                          val = <span className={`px-2 py-0.5 border rounded-md font-bold text-[9px] uppercase tracking-wider ${pillColor}`}>{val}</span>;
                        }

                        // Op type badge (warehouse)
                        if (col.id === "op_type") {
                          const opVal = String(val || "-").toUpperCase();
                          const opColor = opVal.includes("INBOUND") ? "text-sky-600" : opVal.includes("OUTBOUND") ? "text-orange-600" : opVal.includes("TRANSFER") ? "text-purple-600" : "text-slate-600";
                          val = <span className={`font-bold text-xs ${opColor}`}>{opVal}</span>;
                        }

                        // Clearance mode badge
                        if (col.id === "clearance_mode") {
                          const modeVal = String(val || "-").toUpperCase();
                          const mColor = modeVal.includes("IMPORT") ? "text-blue-600" : modeVal.includes("EXPORT") ? "text-emerald-600" : "text-slate-600";
                          val = <span className={`font-bold text-xs ${mColor}`}>{modeVal}</span>;
                        }

                        // Numeric currency
                        if (col.numeric && typeof row[col.id] === "number") {
                          const numColor = col.id === "gross_margin"
                            ? Number(row[col.id]) >= 0 ? "text-blue-600" : "text-rose-600"
                            : "text-slate-800";
                          val = <span className={`font-semibold whitespace-nowrap text-xs ${numColor}`}>{fmtCurrency(Number(row[col.id] || 0))}</span>;
                        }

                        return (
                          <td key={col.id} className={`px-4 py-3 text-xs font-medium text-slate-700 whitespace-nowrap ${col.numeric ? "text-right" : ""}`}>
                            {val ?? "-"}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>

                {/* Summary Footer */}
                {data.length > 0 && (
                  <tfoot className="bg-slate-900 text-white font-bold border-t border-slate-900 sticky bottom-0">
                    <tr>
                      {activeCols.map((col, i) => {
                        if (i === 0) {
                          return <td key={col.id} className="px-4 py-3.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">TOTAL REKAPITULASI</td>;
                        }
                        if (col.numeric && footerSums[col.id] !== undefined) {
                          const isMargin = col.id === "gross_margin";
                          return (
                            <td key={col.id} className={`px-4 py-3.5 text-xs font-bold whitespace-nowrap text-right ${isMargin ? "text-blue-300" : "text-emerald-300"}`}>
                              {fmtCurrency(footerSums[col.id])}
                            </td>
                          );
                        }
                        if (col.id === "jo_status") {
                          return <td key={col.id} className="px-4 py-3.5 text-xs font-bold text-blue-400 whitespace-nowrap">{totalJO} Records</td>;
                        }
                        return <td key={col.id} className="px-4 py-3.5" />;
                      })}
                    </tr>
                  </tfoot>
                )}
              </table>

              {/* Empty State */}
              {data.length === 0 && !loading && (
                <div className="py-24 text-center opacity-25 grayscale flex flex-col items-center justify-center">
                  <Inbox className="w-16 h-16 mb-2 text-slate-400" />
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Tidak ada data untuk filter ini</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
