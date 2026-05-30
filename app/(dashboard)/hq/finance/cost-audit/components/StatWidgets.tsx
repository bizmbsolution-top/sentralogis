"use client";

import React from "react";
import { Clock, TrendingUp, FileCheck, AlertCircle, Receipt } from "lucide-react";
import { formatRupiah } from "../hooks/useCostAuditData";

interface StatWidgetsProps {
  stats: {
    pending: number;
    totalApproved: number;
    podReady: number;
    total: number;
    totalRevenue: number;
    totalAbsoluteMargin: number;
    totalItems: number;
  };
  avgMargin: string;
}

const widgets = [
  {
    key: "margin",
    label: "Gross Margin",
    icon: TrendingUp,
    tone: "bg-slate-900 text-white",
    badgeTone: "bg-slate-100 text-slate-700",
    badgeLabel: "Profitability",
  },
  {
    key: "revenue",
    label: "Revenue",
    icon: Receipt,
    tone: "bg-slate-100 text-slate-700",
    badgeTone: "bg-slate-100 text-slate-700",
    badgeLabel: "Sales",
  },
  {
    key: "pending",
    label: "Pending Review",
    icon: AlertCircle,
    tone: "bg-amber-50 text-amber-600",
    badgeTone: "bg-amber-50 text-amber-700",
    badgeLabel: "Audit Queue",
  },
  {
    key: "pod",
    label: "POD Coverage",
    icon: FileCheck,
    tone: "bg-emerald-50 text-emerald-600",
    badgeTone: "bg-emerald-50 text-emerald-700",
    badgeLabel: "Documents",
  },
] as const;

export default function StatWidgets({ stats, avgMargin }: StatWidgetsProps) {
  const marginNum = Number(avgMargin);
  const marginColor =
    marginNum >= 20
      ? "text-emerald-700"
      : marginNum >= 10
        ? "text-amber-700"
        : "text-rose-700";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 animate-in fade-in duration-500">
      {widgets.map((w) => {
        const Icon = w.icon;
        let mainValue: React.ReactNode;
        let helperText: string;

        if (w.key === "margin") {
          mainValue = <span className={marginColor}>{avgMargin}%</span>;
          helperText = formatRupiah(stats.totalAbsoluteMargin);
        } else if (w.key === "revenue") {
          mainValue = <span className="text-slate-900">{formatRupiah(stats.totalRevenue)}</span>;
          helperText = `${stats.total} mission${stats.total !== 1 ? "s" : ""}`;
        } else if (w.key === "pending") {
          mainValue = <span className="text-slate-900">{stats.pending}</span>;
          helperText = `${stats.totalItems} total item${stats.totalItems !== 1 ? "s" : ""}`;
        } else {
          mainValue = (
            <span className="text-slate-900">
              {stats.podReady}
              <span className="text-sm font-medium text-slate-400">/{stats.total}</span>
            </span>
          );
          helperText = stats.podReady === stats.total ? "Complete" : "Awaiting docs";
        }

        return (
          <div
            key={w.key}
            className="rounded-xl border border-slate-200 bg-white shadow-sm p-4 relative overflow-hidden transition-all hover:shadow-md duration-200"
          >
            {w.key === "margin" && (
              <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-slate-900/5 blur-xl" />
            )}
            <div className="relative">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-9 h-9 rounded-lg ${w.tone} flex items-center justify-center`}>
                  <Icon size={18} />
                </div>
                <span
                  className={`${w.badgeTone} text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full`}
                >
                  {w.badgeLabel}
                </span>
              </div>
              <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-slate-400 mb-1">
                {w.label}
              </p>
              <div className="text-xl font-bold tracking-tight mb-1">{mainValue}</div>
              <p className="text-[10px] font-semibold text-slate-500 leading-tight">{helperText}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
