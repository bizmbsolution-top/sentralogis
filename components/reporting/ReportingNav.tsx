"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Truck, DollarSign, BarChart3, ChevronDown, LayoutDashboard, FileSpreadsheet, Clock, MapPin, Warehouse, Ship, Users, TrendingUp, CreditCard, PieChart, Target } from "lucide-react";

function IconRenderer({ icon: Icon, size = 14 }: { icon?: React.ComponentType<{ className?: string; size?: number }>; size?: number }) {
  if (!Icon) return null;
  return <Icon className={`w-${size/4} h-${size/4}`} size={size} />;
}

export type ReportCategory = "operational" | "finance" | "bi";

interface ReportItem {
  id: string;
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  roles: string[];
}

interface ReportCategoryConfig {
  id: ReportCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  items: ReportItem[];
}

const HQ_OPS_ROLES = ["hq_ops", "hq_director_ops", "hq_director_fin", "hq_director_cs", "hq_commercial_director", "hq_director_bizdev", "hq_director_hrd", "hq_cs"];
const HQ_FINANCE_ROLES = ["hq_finance", "hq_director_fin", "hq_director_ops"];
const GLOBAL_ROLES = ["owner_sentralogis", "tenant_superadmin", "tenant_admin"];
const SBU_TRUCKING_ROLES = ["sbu_manager_tr", "sbu_ops_tr", "sbu_fin_tr", "sbu_admin_tr"];
const SBU_WAREHOUSE_ROLES = ["sbu_manager_wh", "sbu_ops_wh", "sbu_fin_wh", "sbu_admin_wh"];
const SBU_CLEARANCE_ROLES = ["sbu_manager_cl", "sbu_ops_cl", "sbu_fin_cl", "sbu_admin_cl"];
const SBU_FORWARDING_ROLES = ["sbu_manager_fw", "sbu_ops_fw", "sbu_fin_fw", "sbu_admin_fw"];

const ALL_HQ_ROLES = [...HQ_OPS_ROLES, ...HQ_FINANCE_ROLES, "hq_director_comm"];

const REPORT_CATEGORIES: ReportCategoryConfig[] = [
  {
    id: "operational",
    label: "Operasional",
    icon: Truck,
    items: [
      { id: "overview", label: "Ringkasan Semua SBU", href: "/reporting/operational/overview", icon: LayoutDashboard, roles: [...ALL_HQ_ROLES, ...GLOBAL_ROLES] },
      { id: "trucking", label: "Trucking Matrix", href: "/reporting/operational/trucking", icon: Truck, roles: [...SBU_TRUCKING_ROLES, ...ALL_HQ_ROLES, ...GLOBAL_ROLES] },
      { id: "time-analysis", label: "Time & Motion", href: "/reporting/operational/time-analysis", icon: Clock, roles: [...SBU_TRUCKING_ROLES, ...ALL_HQ_ROLES, ...GLOBAL_ROLES] },
      { id: "gps-tracking", label: "GPS & Telemetry", href: "/reporting/operational/gps-tracking", icon: MapPin, roles: [...SBU_TRUCKING_ROLES, ...ALL_HQ_ROLES, ...GLOBAL_ROLES] },
      { id: "wo-level", label: "WO Level Detail", href: "/reporting/operational/wo-level", icon: FileSpreadsheet, roles: [...SBU_TRUCKING_ROLES, ...ALL_HQ_ROLES, ...GLOBAL_ROLES] },
      { id: "warehouse", label: "Warehouse Ops", href: "/reporting/operational/warehouse", icon: Warehouse, roles: [...SBU_WAREHOUSE_ROLES, ...ALL_HQ_ROLES, ...GLOBAL_ROLES] },
      { id: "clearance", label: "Clearance Tracking", href: "/reporting/operational/clearance", icon: Ship, roles: [...SBU_CLEARANCE_ROLES, ...ALL_HQ_ROLES, ...GLOBAL_ROLES] },
      { id: "forwarding", label: "Forwarding Shipment", href: "/reporting/operational/forwarding", icon: Ship, roles: [...SBU_FORWARDING_ROLES, ...ALL_HQ_ROLES, ...GLOBAL_ROLES] },
    ],
  },
  {
    id: "finance",
    label: "Keuangan",
    icon: DollarSign,
    items: [
      { id: "pl-by-sbu", label: "P&L per SBU", href: "/reporting/finance/pl-by-sbu", icon: PieChart, roles: [...HQ_FINANCE_ROLES, ...SBU_TRUCKING_ROLES.filter(r => r.includes("fin")), ...SBU_WAREHOUSE_ROLES.filter(r => r.includes("fin")), ...GLOBAL_ROLES] },
      { id: "ar-aging", label: "AR Aging & Piutang", href: "/reporting/finance/ar-aging", icon: CreditCard, roles: [...HQ_FINANCE_ROLES, ...SBU_TRUCKING_ROLES.filter(r => r.includes("fin")), ...SBU_WAREHOUSE_ROLES.filter(r => r.includes("fin")), ...GLOBAL_ROLES] },
      { id: "ap-aging", label: "AP Aging & Hutang Vendor", href: "/reporting/finance/ap-aging", icon: CreditCard, roles: [...HQ_FINANCE_ROLES, ...SBU_TRUCKING_ROLES.filter(r => r.includes("fin")), ...SBU_WAREHOUSE_ROLES.filter(r => r.includes("fin")), ...GLOBAL_ROLES] },
      { id: "margin-waterfall", label: "Margin Waterfall", href: "/reporting/finance/margin-waterfall", icon: TrendingUp, roles: [...HQ_FINANCE_ROLES, "hq_director_ops", ...GLOBAL_ROLES] },
      { id: "cashflow", label: "Cash Flow per WO/JO", href: "/reporting/finance/cashflow", icon: TrendingUp, roles: [...HQ_FINANCE_ROLES, ...GLOBAL_ROLES] },
      { id: "billing", label: "Billing & Invoicing", href: "/reporting/finance/billing", icon: FileSpreadsheet, roles: [...HQ_FINANCE_ROLES, ...GLOBAL_ROLES] },
      { id: "vendor-cost", label: "Vendor Cost Analysis", href: "/reporting/finance/vendor-cost", icon: Target, roles: [...HQ_FINANCE_ROLES, ...SBU_TRUCKING_ROLES, ...GLOBAL_ROLES] },
    ],
  },
  {
    id: "bi",
    label: "Business Intelligence",
    icon: BarChart3,
    items: [
      { id: "executive", label: "Executive Cockpit", href: "/reporting/bi/executive", icon: LayoutDashboard, roles: [...GLOBAL_ROLES, "hq_director_ops", "hq_director_fin", "hq_commercial_director", "hq_director_bizdev"] },
      { id: "customer-profitability", label: "Profitabilitas Pelanggan", href: "/reporting/bi/customer-profitability", icon: Users, roles: [...GLOBAL_ROLES, "hq_commercial_director", "hq_director_bizdev"] },
      { id: "fleet-roi", label: "Fleet & Asset ROI", href: "/reporting/bi/fleet-roi", icon: Truck, roles: [...GLOBAL_ROLES, "hq_director_ops", ...SBU_TRUCKING_ROLES] },
      { id: "route-analytics", label: "Analisis Rute & Lane", href: "/reporting/bi/route-analytics", icon: MapPin, roles: [...GLOBAL_ROLES, "hq_director_ops", "hq_commercial_director", "hq_director_bizdev", ...SBU_TRUCKING_ROLES] },
      { id: "forecasting", label: "Seasonality & Forecasting", href: "/reporting/bi/forecasting", icon: TrendingUp, roles: [...GLOBAL_ROLES, "hq_director_ops", "hq_director_fin", "hq_commercial_director"] },
      { id: "vendor-scorecard", label: "Vendor Performance Scorecard", href: "/reporting/bi/vendor-scorecard", icon: Target, roles: [...GLOBAL_ROLES, "hq_director_ops", ...SBU_TRUCKING_ROLES, ...SBU_WAREHOUSE_ROLES] },
      { id: "cohorts", label: "Cohort & Retention", href: "/reporting/bi/cohorts", icon: Users, roles: [...GLOBAL_ROLES, "hq_commercial_director", "hq_director_bizdev"] },
    ],
  },
];

function hasRoleAccess(userRole: string | undefined, allowedRoles: string[]): boolean {
  if (!userRole) return false;
  return allowedRoles.includes(userRole);
}

function filterItemsByRole(items: ReportItem[], userRole: string | undefined): ReportItem[] {
  return items.filter(item => hasRoleAccess(userRole, item.roles));
}

export function ReportingNav({ 
  activeCategory, 
  activeReport, 
  userRole 
}: { 
  activeCategory: ReportCategory; 
  activeReport?: string; 
  userRole?: string; 
}) {
  const pathname = usePathname();
  
  const filteredCategories = REPORT_CATEGORIES.map(cat => ({
    ...cat,
    items: filterItemsByRole(cat.items, userRole),
  })).filter(cat => cat.items.length > 0);

  const isActiveCategory = (catId: ReportCategory) => activeCategory === catId;
  const isActiveReport = (reportId: string) => activeReport === reportId || pathname === `/reporting/${activeCategory}/${reportId}` || pathname.startsWith(`/reporting/${activeCategory}/${reportId}/`);

  return (
    <nav className="w-full bg-white border-b border-slate-200 sticky top-0 z-40" role="navigation" aria-label="Reporting navigation">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
          {filteredCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => window.location.href = cat.items[0]?.href || "#"}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex-shrink-0 whitespace-nowrap ${
                isActiveCategory(cat.id)
                  ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20"
                  : "text-slate-400 hover:text-slate-600 hover:bg-slate-50"
              }`}
            >
              <IconRenderer icon={cat.icon} size={14} />
              <span>{cat.label}</span>
              <ChevronDown size={10} className="ml-1" />
            </button>
          ))}
        </div>
        
        {/* Active category dropdown menu */}
        <div className="hidden md:block">
          {filteredCategories.map((cat) => {
            const active = isActiveCategory(cat.id);
            if (!active) return null;
            
            return (
              <div key={cat.id} className="mt-2 pt-3 border-t border-slate-100 animate-fade-in">
                <div className="flex flex-wrap gap-2">
                  {cat.items.map((item) => (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                        isActiveReport(item.id)
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent"
                      }`}
                    >
                      {item.icon && <IconRenderer icon={item.icon} size={16} />}
                      <span>{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function ReportingNavMobile({ 
  activeCategory, 
  activeReport, 
  userRole 
}: { 
  activeCategory: ReportCategory; 
  activeReport?: string; 
  userRole?: string; 
}) {
  const pathname = usePathname();
  
  const filteredCategories = REPORT_CATEGORIES.map(cat => ({
    ...cat,
    items: filterItemsByRole(cat.items, userRole),
  })).filter(cat => cat.items.length > 0);

  const isActiveCategory = (catId: ReportCategory) => activeCategory === catId;
  const isActiveReport = (reportId: string) => activeReport === reportId || pathname === `/reporting/${activeCategory}/${reportId}` || pathname.startsWith(`/reporting/${activeCategory}/${reportId}/`);

  return (
    <div className="md:hidden bg-white border-t border-slate-200 pt-4">
      <div className="space-y-3">
        {filteredCategories.map((cat) => (
          <details key={cat.id} className="group">
            <summary className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer ${
              isActiveCategory(cat.id)
                ? "bg-slate-900 text-white"
                : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
            }`}>
              <IconRenderer icon={cat.icon} size={14} />
              <span className="flex-1">{cat.label}</span>
              <ChevronDown size={14} className="text-slate-400 group-open:rotate-180 transition-transform" />
            </summary>
            <div className="pl-6 mt-2 space-y-1 border-l border-slate-200 ml-2 animate-slide-down">
              {cat.items.map((item) => (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                    isActiveReport(item.id)
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {item.icon && <IconRenderer icon={item.icon} size={16} />}
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

export function getActiveCategoryFromPath(pathname: string): ReportCategory {
  if (pathname.startsWith("/reporting/operational")) return "operational";
  if (pathname.startsWith("/reporting/finance")) return "finance";
  if (pathname.startsWith("/reporting/bi")) return "bi";
  return "operational";
}

export function getActiveReportFromPath(pathname: string): string | undefined {
  const match = pathname.match(/\/reporting\/(?:operational|finance|bi)\/([^/]+)/);
  return match?.[1];
}