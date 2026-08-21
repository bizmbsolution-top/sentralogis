"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, MapPin } from "lucide-react";

export default function SBUTruckingGPSTrackingRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/reporting/operational/gps-tracking");
  }, [router]);

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
      <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Mengarahkan ke GPS Tracking...</p>
      <MapPin className="w-8 h-8 text-slate-200" />
    </div>
  );
}