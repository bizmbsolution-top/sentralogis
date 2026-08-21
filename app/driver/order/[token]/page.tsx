"use client";

import { useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function OrderForwardPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();

  useEffect(() => {
    if (token) {
      router.replace(`/driver/portal?job=${encodeURIComponent(token)}`);
    } else {
      router.replace(`/driver/portal`);
    }
  }, [token, router]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center text-white">
      <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mb-3" />
      <p className="text-sm font-medium text-slate-400">
        Membuka Job Order di Unified Driver Portal...
      </p>
    </div>
  );
}
