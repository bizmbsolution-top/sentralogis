"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks/useAuth";
import { Loader2, BarChart3 } from "lucide-react";

const HQ_OPS_ROLES = [
  "hq_ops", "hq_director_ops", "hq_director_fin", "hq_director_cs",
  "hq_commercial_director", "hq_director_bizdev", "hq_director_hrd", "hq_cs",
];
const HQ_FINANCE_ROLES = ["hq_finance", "hq_director_fin", "hq_director_ops"];
const GLOBAL_ROLES = ["owner_sentralogis", "tenant_superadmin", "tenant_admin"];
const SBU_TRUCKING_ROLES = ["sbu_manager_tr", "sbu_ops_tr", "sbu_fin_tr", "sbu_admin_tr"];
const SBU_WAREHOUSE_ROLES = ["sbu_manager_wh", "sbu_ops_wh", "sbu_fin_wh", "sbu_admin_wh"];

export default function ReportingHubPage() {
  const router = useRouter();
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile) return;

    const role = profile.role;
    let targetPath = "/reporting/operational/overview";

    if (GLOBAL_ROLES.includes(role)) {
      targetPath = "/reporting/bi/executive";
    } else if (HQ_FINANCE_ROLES.includes(role)) {
      targetPath = "/reporting/finance/pl-by-sbu";
    } else if (HQ_OPS_ROLES.includes(role)) {
      targetPath = "/reporting/operational/overview";
    } else if (SBU_TRUCKING_ROLES.includes(role)) {
      targetPath = "/reporting/operational/trucking";
    } else if (SBU_WAREHOUSE_ROLES.includes(role)) {
      targetPath = "/reporting/operational/warehouse";
    } else {
      targetPath = "/reporting/operational/overview";
    }

    router.replace(targetPath);
  }, [profile, router]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Mengarahkan ke Reporting...</p>
        <BarChart3 className="w-8 h-8 text-slate-200" />
      </div>
    </div>
  );
}