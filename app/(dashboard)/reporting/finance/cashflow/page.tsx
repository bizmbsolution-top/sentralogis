"use client";

import Link from "next/link";
import { useAuth } from "@/lib/hooks/useAuth";
import { ChevronLeft, DollarSign, AlertCircle } from "lucide-react";

const HQ_FIN_ROLES = ["hq_finance", "hq_director_fin", "hq_director_ops"];
const GLOBAL_ROLES = ["owner_sentralogis", "tenant_superadmin", "tenant_admin"];

export default function CashflowPage() {
  const { profile } = useAuth();
  const isHqFin = !!profile && HQ_FIN_ROLES.includes(profile.role);
  const isGlobalRole = !!profile && GLOBAL_ROLES.includes(profile.role);
  const canAccess = !!profile && (isHqFin || isGlobalRole);

  if (!canAccess) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="bg-white border border-slate-200 rounded-2xl p-10 shadow-sm text-center max-w-md">
          <div className="mx-auto w-14 h-14 rounded-full bg-rose-50 flex items-center justify-center mb-4">
            <AlertCircle className="w-7 h-7 text-rose-500" />
          </div>
          <h2 className="text-lg font-bold text-slate-900 mb-1">Akses Ditolak</h2>
          <p className="text-xs text-slate-500">Hanya user Finance/Director yang dapat mengakses halaman ini.</p>
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
        <div className="mx-auto w-20 h-20 rounded-full bg-blue-50 flex items-center justify-center mb-6">
          <DollarSign className="w-10 h-10 text-blue-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Cash Flow per WO/JO</h1>
        <p className="text-slate-500 mb-8">Timing arus kas: cash advance, vendor payment, customer receipt per job.</p>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
          <p className="text-sm font-semibold text-blue-800 mb-2">🚧 Coming Soon (Phase 3)</p>
          <p className="text-xs text-blue-700">Fitur akan mencakup:</p>
          <ul className="text-xs text-blue-700 list-disc list-inside space-y-1 mt-2">
            <li>Cash advance vs actual spend per JO</li>
            <li>Vendor payment schedule</li>
            <li>Customer payment collection timeline</li>
            <li>Net cash position per project</li>
          </ul>
        </div>
      </div>
    </div>
  );
}