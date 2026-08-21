"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { ChevronLeft, LayoutDashboard, AlertCircle, TrendingUp, DollarSign, Users, Truck, Target } from "lucide-react";

const GLOBAL_ROLES = ["owner_sentralogis", "tenant_superadmin", "tenant_admin"];
const DIRECTOR_ROLES = ["hq_director_ops", "hq_director_fin", "hq_commercial_director", "hq_director_bizdev"];

export default function ExecutivePage() {
  const { profile } = useAuth();
  const isGlobalRole = !!profile && GLOBAL_ROLES.includes(profile.role);
  const isDirector = !!profile && DIRECTOR_ROLES.includes(profile.role);
  const canAccess = !!profile && (isGlobalRole || isDirector);

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-center max-w-md">
          <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-rose-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Akses Ditolak</h2>
          <p className="text-xs text-slate-500">Hanya Owner/Director yang dapat mengakses halaman ini.</p>
        </div>
      </div>
    );
  }

  const kpis = [
    { label: "Total Revenue (MTD)", value: "Rp 2.4B", change: "+12%", trend: "up", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Gross Margin %", value: "23.5%", change: "+1.2pp", trend: "up", icon: TrendingUp, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Fleet Utilization", value: "78%", change: "-3%", trend: "down", icon: Truck, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Active Customers", value: "142", change: "+5", trend: "up", icon: Users, color: "text-violet-600", bg: "bg-violet-50" },
    { label: "On-Time Delivery", value: "91%", change: "+2%", trend: "up", icon: Target, color: "text-teal-600", bg: "bg-teal-50" },
    { label: "Open JOs", value: "23", change: "-4", trend: "up", icon: Truck, color: "text-indigo-600", bg: "bg-indigo-50" },
  ];

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8">
      <Link href="/hq/ops-dashboard" className="absolute top-6 left-6 p-2.5 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all">
        <ChevronLeft className="w-5 h-5 text-slate-700" />
      </Link>
      <div className="max-w-[1600px] mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Executive Cockpit</h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Strategic KPIs & Business Health Overview</p>
          </div>
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {kpis.map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl ${kpi.bg} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${kpi.color}`} />
                  </div>
                  <div className="text-left">
                    <p className="text-xs text-slate-500 uppercase tracking-wider">{kpi.label}</p>
                    <p className="text-xl font-extrabold text-slate-900">{kpi.value}</p>
                    <p className={`text-xs font-bold ${kpi.trend === "up" ? "text-emerald-600" : "text-rose-600"}`}>{kpi.change} vs last month</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Revenue Trend (6 Months)</h3>
            <div className="h-64 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 text-sm">📈 Chart placeholder - Recharts integration needed</div>
          </div>
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
            <h3 className="text-lg font-bold text-slate-900 mb-4">Margin by SBU</h3>
            <div className="h-64 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 text-sm">📊 Chart placeholder</div>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <p className="text-sm font-semibold text-amber-800 mb-2">🚧 Coming Soon (Phase 4)</p>
          <p className="text-xs text-amber-700">Full BI dashboard dengan:</p>
          <ul className="text-xs text-amber-700 list-disc list-inside space-y-1 mt-2 grid grid-cols-2 gap-x-4">
            <li>Revenue forecasting (ARIMA/Prophet)</li>
            <li>Customer churn prediction</li>
            <li>Capacity planning alerts</li>
            <li>Automated executive summary email</li>
            <li>Drill-through to operational reports</li>
            <li>Mobile-responsive executive view</li>
          </ul>
        </div>
      </div>
    </div>
  );
}