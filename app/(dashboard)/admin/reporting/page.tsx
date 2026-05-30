"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function AdminReportingRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    // [AI] Redirect old admin route to unified hq/reporting route
    router.replace("/hq/reporting");
  }, [router]);

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-[#F8FAFC]">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Redirecting to Intelligence Matrix...</p>
    </div>
  );
}
