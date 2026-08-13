"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Truck, Download, ExternalLink, Loader2 } from "lucide-react";
import { Capacitor } from "@capacitor/core";

export default function JoGatewayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();

  const [isNative, setIsNative] = useState<boolean | null>(null);
  const [gateBypassed, setGateBypassed] = useState<boolean | null>(null);

  useEffect(() => {
    // 1. Detect environment flags
    const isCapacitor = Capacitor.isNativePlatform();
    const isAppUserAgent = typeof navigator !== "undefined" && navigator.userAgent.includes("SentraLogis_AndroidApp");
    const isCustomScheme = typeof window !== "undefined" && window.location.protocol === "sentralogis:";
    const isWebView = typeof navigator !== "undefined" && /(Android.*WebView|wv)/i.test(navigator.userAgent);

    // exactly ONE declaration of isActualNative
    const isActualNative = isCapacitor || isAppUserAgent || isCustomScheme || isWebView;
    
    // exactly ONE declaration of isDevelopmentBypass
    const isDevelopmentBypass = process.env.NODE_ENV === "development";

    // exactly ONE declaration of shouldBypassInstallGate
    const shouldBypassInstallGate = isActualNative || isDevelopmentBypass;

    // 2. Diagnostic logging for deep-link debugging
    console.log("[ROUTE_FORENSIC] JO_GATEWAY");
    console.log("[ROUTE_FORENSIC] current pathname = /jo/" + token);
    console.log("[ROUTE_FORENSIC] token =", token);
    console.log("[ROUTE_FORENSIC] target route = /driver/portal");

    console.log("[JO_FLOW] gateway mount");
    console.log("[JO_FLOW] gateway token =", token);
    console.log("[JO_GATEWAY] token =", token);
    console.log("[JO_GATEWAY] isCapacitor =", isCapacitor);
    console.log("[JO_GATEWAY] isAppUserAgent =", isAppUserAgent);
    console.log("[JO_GATEWAY] isWebView =", isWebView);
    console.log("[JO_GATEWAY] isCustomScheme =", isCustomScheme);
    console.log("[JO_GATEWAY] isActualNative =", isActualNative);
    console.log("[JO_GATEWAY] isDevelopmentBypass =", isDevelopmentBypass);
    console.log("[JO_GATEWAY] shouldBypassInstallGate =", shouldBypassInstallGate);
    console.log("[JO_GATEWAY] current URL =", window.location.href);
    console.log("[JO_GATEWAY] pending_jo_token (before set) =", localStorage.getItem("pending_jo_token"));

    // 3. State management
    // IMPORTANT: isDevelopmentBypass is NOT passed to setIsNative
    setIsNative(isActualNative);
    setGateBypassed(shouldBypassInstallGate);

    // 4. Side effects moved strictly into useEffect
    if (shouldBypassInstallGate && token) {
      try {
        localStorage.setItem("pending_jo_token", token);
        console.log("[ROUTE_FORENSIC] pending_jo_token (after set) =", localStorage.getItem("pending_jo_token"));
      } catch (e) {
        console.warn("[Gateway] Storage error:", e);
      }
      router.replace(`/driver/portal`);
    }
  }, [token, router]);

  // One coherent loading/native transition
  if (gateBypassed === null || gateBypassed === true) {
    return (
      <div className="min-h-[100dvh] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-4" />
        <p className="text-slate-400 text-sm animate-pulse">Memuat aplikasi...</p>
      </div>
    );
  }

  // Gateway UI shown ONLY when !shouldBypassInstallGate
  const isAndroidBrowser = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-600/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-blue-600/20 border border-blue-500/20">
          <Truck className="text-white w-10 h-10" />
        </div>

        <h1 className="text-3xl font-black text-white tracking-tight mb-3">
          Tugas Baru
        </h1>
        <p className="text-slate-300 text-sm mb-8 leading-relaxed font-medium">
          Job Order tersedia.<br />
          Untuk menerima dan menjalankan Job Order, silakan gunakan aplikasi{" "}
          <strong className="text-white">SentraLogis Driver</strong>.
        </p>

        <div className="space-y-3">
          {isAndroidBrowser && (
            <button
              onClick={() => {
                const intentUrl =
                  `intent://jo/${token}` +
                  "#Intent;" +
                  "scheme=sentralogis;" +
                  "package=com.sentralogis.driver;" +
                  `S.browser_fallback_url=https://www.sentralogis.com/driver/install-apk;` +
                  "end";
                window.location.href = intentUrl;
              }}
              className="w-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2"
            >
              <ExternalLink size={16} /> BUKA APLIKASI SENTRALOGIS
            </button>
          )}

          <button
            onClick={() => router.push("/driver/install-apk")}
            className="w-full bg-blue-600 hover:bg-blue-500 active:scale-95 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
          >
            <Download size={16} /> INSTALL APLIKASI SENTRALOGIS
          </button>
        </div>
      </div>
    </div>
  );
}
