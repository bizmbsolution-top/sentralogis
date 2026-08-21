"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { ChevronLeft, BarChart3, AlertCircle } from "lucide-react";

const HQ_ROLES = ["hq_ops", "hq_director_ops", "hq_finance", "hq_director_fin", "hq_cs", "hq_director_cs", "hq_commercial_director", "hq_director_bizdev", "hq_director_hrd"];
const SBU_FW_ROLES = ["sbu_manager_fw", "sbu_ops_fw", "sbu_fin_fw", "sbu_admin_fw"];
const GLOBAL_ROLES = ["owner_sentralogis", "tenant_superadmin", "tenant_admin"];

export default function ForwardingReportingPage() {
  const { profile } = useAuth();
  const isHqRole = !!profile && HQ_ROLES.includes(profile.role);
  const isSbuFw = !!profile && SBU_FW_ROLES.includes(profile.role);
  const isGlobalRole = !!profile && GLOBAL_ROLES.includes(profile.role);
  const canAccess = !!profile && (isHqRole || isSbuFw || isGlobalRole);

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-center max-w-md">
          <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-rose-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Akses Ditolak</h2>
          <p className="text-xs text-slate-500">Hanya user HQ/Forwarding yang dapat mengakses halaman ini.</p>
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
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Forwarding Shipment Tracking</h1>
        <p className="text-slate-500 mb-8">Fitur pelacakan shipment FCL/LCL, jadwal vessel, dan status container.</p>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-left">
          <p className="text-sm font-semibold text-amber-800 mb-2">🚧 Coming Soon</p>
          <p className="text-xs text-amber-700">Halaman ini sedang dalam pengembangan. Fitur akan mencakup:</p>
          <ul className="text-xs text-amber-700 list-disc list-inside space-y-1 mt-2">
            <li>Vessel schedule & ETA tracking</li>
            <li>Container status (FCL/LCL)</li>
            <li>Port dwell time analysis</li>
            <li>Shipping line performance</li>
          </ul>
        </div>
      </div>
    </div>
  );
}