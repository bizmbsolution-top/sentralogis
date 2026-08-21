"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { ChevronLeft, Users, AlertCircle, TrendingUp } from "lucide-react";

const GLOBAL_ROLES = ["owner_sentralogis", "tenant_superadmin", "tenant_admin"];
const COMM_ROLES = ["hq_commercial_director", "hq_director_bizdev"];

export default function CohortsPage() {
  const { profile } = useAuth();
  const isGlobalRole = !!profile && GLOBAL_ROLES.includes(profile.role);
  const isComm = !!profile && COMM_ROLES.includes(profile.role);
  const canAccess = !!profile && (isGlobalRole || isComm);

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-center max-w-md">
          <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-rose-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Akses Ditolak</h2>
          <p className="text-xs text-slate-500">Hanya Owner/Commercial Director yang dapat mengakses.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8">
      <Link href="/hq/ops-dashboard" className="absolute top-6 left-6 p-2.5 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all">
        <ChevronLeft className="w-5 h-5 text-slate-700" />
      </Link>
      <div className="max-w-[1600px] mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Cohort & Retention Analysis</h1>
          <p className="text-slate-500 text-sm mt-1">Customer cohort revenue retention, repeat rate</p>
        </header>
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <Users className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">Coming Soon (Phase 4)</h3>
          <p className="text-slate-500 mb-4">Fitur akan mencakup:</p>
          <ul className="text-sm text-slate-600 list-disc list-inside space-y-2 text-left max-w-md mx-auto">
            <li>Monthly cohort revenue retention matrix</li>
            <li>Repeat order rate by cohort</li>
            <li>Average orders per customer per cohort</li>
            <li>Revenue per customer over time</li>
            <li>Churned customer win-back tracking</li>
            <li>Cohort comparison: new vs existing customers</li>
          </ul>
        </div>
      </div>
    </div>
  );
}