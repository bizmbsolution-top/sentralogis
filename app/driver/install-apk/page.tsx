"use client";

import { useState, useEffect } from "react";
import { Download, Smartphone, CheckCircle, ExternalLink } from "lucide-react";

export default function InstallApkPage() {
  const [isAndroid, setIsAndroid] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setIsAndroid(ua.includes("android"));
    // Check if already in native app
    setIsInstalled(ua.includes("sentralogis_androidapp"));
  }, []);

  const apkUrl = "/sentralogis-driver.apk";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Smartphone size={32} className="text-white" />
          </div>
          <h1 className="text-xl font-black text-white">SENTRALOGIS DRIVER</h1>
          <p className="text-blue-100 text-sm mt-1">Aplikasi Driver Android</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {isInstalled ? (
            /* Already Installed */
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h2 className="text-lg font-bold text-slate-900 mb-2">
                Aplikasi Terinstall
              </h2>
              <p className="text-sm text-slate-600 mb-6">
                Anda sudah menggunakan aplikasi SentraLogis Driver. Buka link
                tugas dari WhatsApp untuk mulai bekerja.
              </p>
              <a
                href="/"
                className="inline-block w-full py-3 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
              >
                Kembali ke Beranda
              </a>
            </div>
          ) : (
            /* Not Installed */
            <div>
              <h2 className="text-lg font-bold text-slate-900 mb-4">
                Download Aplikasi
              </h2>

              {/* Features */}
              <div className="space-y-3 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-blue-600 text-sm">📍</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      GPS Akurat
                    </p>
                    <p className="text-xs text-slate-500">
                      Tracking lokasi real-time meskipun aplikasi di background
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-green-600 text-sm">🔔</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Notifikasi Push
                    </p>
                    <p className="text-xs text-slate-500">
                      Terima notifikasi saat dapat tugas baru
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                    <span className="text-purple-600 text-sm">📡</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      Offline Support
                    </p>
                    <p className="text-xs text-slate-500">
                      GPS tetap terkirim meskipun sinyal hilang sementara
                    </p>
                  </div>
                </div>
              </div>

              {/* Download Button */}
              {isAndroid ? (
                <a
                  href={apkUrl}
                  download
                  className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
                >
                  <Download size={20} />
                  Download APK
                </a>
              ) : (
                <div>
                  <p className="text-sm text-slate-600 mb-3 text-center">
                    Buka halaman ini dari HP Android untuk download.
                  </p>
                  <a
                    href={apkUrl}
                    download
                    className="flex items-center justify-center gap-2 w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg"
                  >
                    <Download size={20} />
                    Download APK
                  </a>
                </div>
              )}

              {/* Install Instructions */}
              <div className="mt-6 p-4 bg-slate-50 rounded-xl">
                <p className="text-xs font-semibold text-slate-700 mb-2">
                  Cara Install:
                </p>
                <ol className="text-xs text-slate-600 space-y-1 list-decimal list-inside">
                  <li>Klik tombol Download di atas</li>
                  <li>Buka file APK yang sudah didownload</li>
                  <li>Klik &quot;Install&quot; jika diminta</li>
                  <li>Buka link tugas dari WhatsApp</li>
                </ol>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
