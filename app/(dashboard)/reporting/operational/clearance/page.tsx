"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { ChevronLeft, BarChart3, Loader2, AlertCircle } from "lucide-react";

const HQ_ROLES = ["hq_ops", "hq_director_ops", "hq_finance", "hq_director_fin", "hq_cs", "hq_director_cs", "hq_commercial_director", "hq_director_bizdev", "hq_director_hrd"];
const SBU_CL_ROLES = ["sbu_manager_cl", "sbu_ops_cl", "sbu_fin_cl", "sbu_admin_cl"];
const GLOBAL_ROLES = ["owner_sentralogis", "tenant_superadmin", "tenant_admin"];

export default function ClearanceReportingPage() {
  const { profile } = useAuth();
  const isHqRole = !!profile && HQ_ROLES.includes(profile.role);
  const isSbuCl = !!profile && SBU_CL_ROLES.includes(profile.role);
  const isGlobalRole = !!profile && GLOBAL_ROLES.includes(profile.role);
  const canAccess = !!profile && (isHqRole || isSbuCl || isGlobalRole);

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-center max-w-md">
          <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-rose-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Akses Ditolak</h2>
          <p className="text-xs text-slate-500">Hanya user HQ/Clearance yang dapat mengakses halaman ini.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center p-8">
      <Link href="/hq/ops-dashboard" className="absolute top-6 left-6 p-2.5 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all">
        <ChevronLeft className="w-5 h-5 text-slate-700" />
      </Link>
      <div className="bg-white border border-slate-200 rounded-3xl p-12 max-w-2xl text-center shadow-sm">
        <div className="mx-auto w-20 h-20 rounded-full bg-indigo-50 flex items-center justify-center mb-6">
          <BarChart3 className="w-10 h-10 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Clearance Tracking</h1>
        <p className="text-slate-500 mb-8">Fitur pelacakan dokumen bea cukai, status import/export, dan siklus waktu customs.</p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
          <p className="text-sm font-semibold text-amber-800 mb-2">🚧 Coming Soon</p>
          <p className="text-xs text-amber-700">Halaman ini sedang dalam pengembangan. Fitur akan mencakup:</p>
          <ul className="text-xs text-amber-700 list-disc list-inside space-y-1 mt-2">
            <li>Status dokumen PIB/PEB per JO</li>
            <li>Siklus waktu customs clearance</li>
            <li>Demurrage & detention tracking</li>
            <li>Vendor customs broker performance</li>
          </ul>
        </div>
      </div>
    </div>
  );
}