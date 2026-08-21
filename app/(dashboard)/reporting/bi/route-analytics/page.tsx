"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { ChevronLeft, MapPin, AlertCircle, TrendingUp } from "lucide-react";

const GLOBAL_ROLES = ["owner_sentralogis", "tenant_superadmin", "tenant_admin"];
const DIRECTOR_ROLES = ["hq_director_ops", "hq_commercial_director", "hq_director_bizdev"];
const SBU_TR = ["sbu_manager_tr"];

export default function RouteAnalyticsPage() {
  const { profile } = useAuth();
  const isGlobalRole = !!profile && GLOBAL_ROLES.includes(profile.role);
  const isDirector = !!profile && DIRECTOR_ROLES.includes(profile.role);
  const isSbuTr = !!profile && SBU_TR.includes(profile.role);
  const canAccess = !!profile && (isGlobalRole || isDirector || isSbuTr);

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-center max-w-md">
          <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-rose-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Akses Ditolak</h2>
          <p className="text-xs text-slate-500">Hanya Owner/Director/SBU Trucking yang dapat mengakses.</p>
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
          <h1 className="text-2xl font-bold text-slate-900">Analisis Rute & Lane</h1>
          <p className="text-slate-500 text-sm mt-1">Volume, margin, growth by origin-destination pair</p>
        </header>
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <MapPin className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-900 mb-2">Coming Soon (Phase 4)</h3>
          <p className="text-slate-500 mb-4">Fitur akan mencakup:</p>
          <ul className="text-sm text-slate-600 list-disc list-inside space-y-2 text-left max-w-md mx-auto">
            <li>Top routes by volume & revenue</li>
            <li>Margin per lane (origin-destination)</li>
            <li>Route growth YoY / QoQ</li>
            <li>Empty backhaul analysis</li>
            <li>Seasonal demand patterns per lane</li>
            <li>New lane opportunity scoring</li>
          </ul>
        </div>
      </div>
    </div>
  );
}