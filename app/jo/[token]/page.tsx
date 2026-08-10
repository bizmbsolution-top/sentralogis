"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Truck, Download, ExternalLink, ShieldCheck } from "lucide-react";
import { Capacitor } from "@capacitor/core";

export default function JoGatewayPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const router = useRouter();
  const [isNative, setIsNative] = useState<boolean | null>(null);

  useEffect(() => {
    // Detect Native App vs Web Browser
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const isCustomScheme = typeof window !== "undefined" && window.location.protocol === "sentralogis:";
    const isWebView = /(Android.*WebView|wv)/i.test(userAgent);
    const isAppUserAgent = userAgent.includes("SentraLogis_AndroidApp");
    const isCapacitor = Capacitor.isNativePlatform();

    const isNativeDetected = isCapacitor || isAppUserAgent || isCustomScheme || isWebView;
    setIsNative(isNativeDetected);

    if (isNativeDetected && token) {
      // Native App launch via deep link: store token as routing context and enter Portal
      try {
        localStorage.setItem("pending_jo_token", token);
      } catch (e) {
        console.warn("[Gateway] Storage error:", e);
      }
      router.replace(`/driver/portal`);
    }
  }, [token, router]);

  const isAndroidBrowser =
    typeof navigator !== "undefined" &&
    /android/i.test(navigator.userAgent) &&
    !isNative;

  return (
    <div className="min-h-[100dvh] bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-sm bg-slate-900/90 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-slate-800 relative z-10">
        <div className="w-20 h-20 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-blue-500/20">
          <Truck className="w-10 h-10 text-white" />
        </div>

        <h1 className="text-xl font-black text-white tracking-tight uppercase mb-2">
          SENTRALOGIS DRIVER
        </h1>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-xs font-bold uppercase tracking-wider mb-6">
          <ShieldCheck size={14} /> Gateway Job Order
        </div>

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
