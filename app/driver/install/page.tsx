'use client';

import { useState, useEffect } from 'react';
import { Download, AlertCircle, Phone, ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Head from 'next/head';

export default function DriverInstallationPage() {
  const router = useRouter();
  const [deviceType, setDeviceType] = useState<'android' | 'ios' | 'unknown' | 'loading'>('loading');
  const apkUrl = '/app-debug.apk'; // URL to the APK file in the public folder or external server

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || (window as any).opera;
    if (/android/i.test(ua)) {
      setDeviceType('android');
    } else if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
      setDeviceType('ios');
    } else {
      setDeviceType('unknown');
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4 font-sans">
      <Head>
        <title>Instalasi Sentralogis</title>
      </Head>

      <div className="max-w-md w-full bg-white shadow-xl rounded-2xl p-6 text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Phone className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-2">Sentralogis Driver</h1>
        <p className="text-gray-600 mb-8">Pendeteksian Perangkat Otomatis</p>

        {deviceType === 'loading' && (
          <div className="flex flex-col items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
            <p className="text-gray-500">Mendeteksi perangkat Anda...</p>
          </div>
        )}

        {deviceType === 'android' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 text-left">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-blue-800 font-medium flex items-center justify-center gap-2">
                <span className="text-xl">✅</span> Perangkat Android terdeteksi
              </p>
              <p className="text-sm text-blue-600 mt-1 text-center">Ikuti 4 langkah ini untuk menerima Job Order:</p>
            </div>
            
            <div className="space-y-4 mb-6">
              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 text-sm">1</div>
                <div>
                  <p className="font-bold text-gray-800">Download Sentralogis Driver</p>
                  <a 
                    href={apkUrl}
                    download
                    className="mt-2 inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all active:scale-95 shadow-md text-sm"
                  >
                    <Download className="w-4 h-4" /> DOWNLOAD APK
                  </a>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold shrink-0 text-sm">2</div>
                <div>
                  <p className="font-bold text-gray-800">Install APK</p>
                  <p className="text-xs text-gray-500 mt-1">Buka file hasil download. Jika muncul peringatan, pilih "Tetap Install" (Install Anyway).</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold shrink-0 text-sm shadow-[0_0_10px_rgba(245,158,11,0.5)]">3</div>
                <div>
                  <p className="font-bold text-gray-800">Kembali ke WhatsApp</p>
                  <p className="text-xs text-gray-500 mt-1">Setelah instalasi selesai, <strong className="text-amber-600">JANGAN buka aplikasi dulu</strong>. Kembali ke chat WhatsApp SBU.</p>
                </div>
              </div>

              <div className="flex gap-3 items-start">
                <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0 text-sm shadow-[0_0_10px_rgba(16,185,129,0.5)]">4</div>
                <div>
                  <p className="font-bold text-gray-800">Tekan Kembali Link Job Order</p>
                  <p className="text-xs text-gray-500 mt-1">Klik ulang link Job dari WhatsApp agar aplikasi otomatis terbuka membawa data Job Anda.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {deviceType === 'ios' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
              <p className="text-red-800 font-bold text-lg flex items-center justify-center gap-2 mb-2">
                <span className="text-2xl">🍎</span> iPhone Terdeteksi
              </p>
              <p className="text-red-600 text-sm leading-relaxed">
                Sentralogis Driver saat ini membutuhkan perangkat <strong>Android</strong> untuk aplikasi driver. 
                <br/><br/>
                Silakan gunakan HP Android untuk menginstall Sentralogis Driver.
              </p>
            </div>
            
            <button 
              onClick={() => router.back()}
              className="w-full flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-semibold py-4 px-6 rounded-xl transition-all active:scale-95"
            >
              <ArrowLeft className="w-5 h-5" />
              KEMBALI
            </button>
          </div>
        )}

        {deviceType === 'unknown' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 mb-6">
              <p className="text-yellow-800 font-bold flex items-center justify-center gap-2 mb-2">
                <AlertCircle className="w-6 h-6" /> Perangkat tidak dapat dikenali
              </p>
              <p className="text-yellow-700 text-sm leading-relaxed">
                Kami tidak dapat mendeteksi sistem operasi perangkat Anda. Silakan gunakan HP Android untuk Sentralogis Driver.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
