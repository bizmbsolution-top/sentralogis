"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Warehouse } from "lucide-react";

export default function HQWarehouseReportingRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/reporting/operational/warehouse");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Mengarahkan ke Warehouse Reporting...</p>
      <Warehouse className="w-8 h-8 text-slate-200" />
    </div>
  );
}