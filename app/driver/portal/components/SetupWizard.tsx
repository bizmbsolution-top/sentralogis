'use client';

import { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Network } from '@capacitor/network';
import { Geolocation } from '@capacitor/geolocation';
import { ShieldAlert, CheckCircle2, AlertTriangle, AlertCircle, RefreshCw, Navigation, Settings, WifiOff, Smartphone, ShieldCheck, Battery, Loader2 } from 'lucide-react';

interface SetupWizardProps {
  onComplete: () => void;
}

export default function SetupWizard({ onComplete }: SetupWizardProps) {
  const [deviceReady, setDeviceReady] = useState<boolean | null>(null);
  const [networkStatus, setNetworkStatus] = useState<'good' | 'weak' | 'offline' | null>(null);
  const [gpsPermission, setGpsPermission] = useState<'granted' | 'prompt' | 'denied' | null>(null);
  const [gpsTestResult, setGpsTestResult] = useState<{ lat: number; lng: number; acc: number } | null>(null);
  const [isTestingGps, setIsTestingGps] = useState(false);
  const [bgInfoAcknowledged, setBgInfoAcknowledged] = useState(false);
  
  const [checking, setChecking] = useState(true);

  const runChecks = async () => {
    setChecking(true);
    
    // 1. Device Compatibility
    const isNative = Capacitor.isNativePlatform() || (typeof navigator !== 'undefined' && navigator.userAgent.includes('SentraLogis_AndroidApp'));
    setDeviceReady(isNative);

    // 2. Network Check
    try {
      const status = await Network.getStatus();
      if (!status.connected) {
        setNetworkStatus('offline');
      } else {
        setNetworkStatus(status.connectionType === 'wifi' || status.connectionType === 'cellular' ? 'good' : 'weak');
      }
    } catch (e) {
      setNetworkStatus('offline');
    }

    // 3. Permission Check
    if (isNative) {
      try {
        const perm = await Geolocation.checkPermissions();
        setGpsPermission(perm.location);
      } catch (e) {
        setGpsPermission('prompt');
      }
    } else {
      setGpsPermission('granted'); // Bypass for web testing if needed
    }

    setChecking(false);
  };

  useEffect(() => {
    runChecks();
  }, []);

  const requestGpsPermission = async () => {
    try {
      const perm = await Geolocation.requestPermissions();
      setGpsPermission(perm.location);
    } catch (e) {
      alert('Gagal meminta izin lokasi. Pastikan Anda memberikan izin lokasi di Pengaturan HP Anda.');
    }
  };

  const testGps = async () => {
    if (gpsPermission !== 'granted') {
      alert('Harap izinkan akses lokasi terlebih dahulu.');
      return;
    }
    
    setIsTestingGps(true);
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      setGpsTestResult({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        acc: Math.round(pos.coords.accuracy)
      });
    } catch (e) {
      setGpsTestResult(null);
      alert('Gagal mendapatkan lokasi. Pastikan GPS aktif dan berada di area terbuka.');
    }
    setIsTestingGps(false);
  };

  const allReady = 
    deviceReady && 
    networkStatus === 'good' && 
    gpsPermission === 'granted' && 
    gpsTestResult !== null &&
    bgInfoAcknowledged;

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col p-4 md:p-6 overflow-y-auto font-sans">
      <div className="max-w-2xl w-full mx-auto bg-white shadow-xl rounded-2xl p-6 md:p-8">
        <h1 className="text-2xl font-bold text-gray-900 text-center mb-2">Persiapan Perangkat</h1>
        <p className="text-gray-500 text-center mb-8">Selesaikan langkah berikut sebelum menggunakan SentraLogis Driver.</p>
        
        <div className="space-y-4">
          
          {/* 1. Device Check */}
          <div className="border border-gray-100 rounded-xl p-4 flex flex-col gap-2 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Smartphone className={`w-6 h-6 ${deviceReady ? 'text-green-500' : 'text-gray-400'}`} />
                <span className="font-semibold text-gray-800">Kompatibilitas Perangkat</span>
              </div>
              {deviceReady ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : (deviceReady === false ? <AlertCircle className="w-5 h-5 text-red-500" /> : <Loader2 className="w-5 h-5 animate-spin text-gray-400" />)}
            </div>
            {deviceReady === false && (
              <div className="mt-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                ⚠️ Anda tidak menggunakan aplikasi Native Android SentraLogis. Anda mungkin kehilangan fitur Background GPS.
              </div>
            )}
            {deviceReady && <p className="text-sm text-gray-500 pl-9">✅ Aplikasi Native terdeteksi.</p>}
          </div>

          {/* 2. Internet Check */}
          <div className="border border-gray-100 rounded-xl p-4 flex flex-col gap-2 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {networkStatus === 'offline' ? <WifiOff className="w-6 h-6 text-red-500" /> : <RefreshCw className={`w-6 h-6 ${networkStatus === 'good' ? 'text-green-500' : 'text-yellow-500'}`} />}
                <span className="font-semibold text-gray-800">Koneksi Internet</span>
              </div>
              {networkStatus === 'good' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : (networkStatus === 'offline' ? <AlertCircle className="w-5 h-5 text-red-500" /> : <Loader2 className="w-5 h-5 animate-spin text-gray-400" />)}
            </div>
            {networkStatus === 'offline' && (
              <div className="mt-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 flex flex-col gap-2">
                <p>🔴 Tidak Ada Koneksi Internet. SentraLogis membutuhkan koneksi internet untuk menerima Job Order.</p>
                <button onClick={runChecks} className="bg-red-600 text-white px-4 py-2 rounded-lg font-medium w-fit">Cek Ulang Koneksi</button>
              </div>
            )}
            {networkStatus === 'good' && <p className="text-sm text-gray-500 pl-9">🟢 Internet Connected</p>}
          </div>

          {/* 3. GPS Permission */}
          <div className="border border-gray-100 rounded-xl p-4 flex flex-col gap-2 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <ShieldCheck className={`w-6 h-6 ${gpsPermission === 'granted' ? 'text-green-500' : 'text-yellow-500'}`} />
                <span className="font-semibold text-gray-800">Izin Lokasi</span>
              </div>
              {gpsPermission === 'granted' ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <AlertTriangle className="w-5 h-5 text-yellow-500" />}
            </div>
            {gpsPermission !== 'granted' && gpsPermission !== null && (
              <div className="mt-2 text-sm text-yellow-700 bg-yellow-50 p-3 rounded-lg border border-yellow-100 flex flex-col gap-2">
                <p>⚠️ Izin Lokasi Belum Diberikan. SentraLogis membutuhkan akses lokasi.</p>
                <button onClick={requestGpsPermission} className="bg-yellow-500 text-white px-4 py-2 rounded-lg font-medium w-fit">IZINKAN LOKASI</button>
              </div>
            )}
            {gpsPermission === 'granted' && <p className="text-sm text-gray-500 pl-9">🟢 Izin lokasi telah diberikan.</p>}
          </div>

          {/* 4. Background GPS & Battery */}
          <div className="border border-gray-100 rounded-xl p-4 flex flex-col gap-2 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Battery className={`w-6 h-6 ${bgInfoAcknowledged ? 'text-green-500' : 'text-blue-500'}`} />
                <span className="font-semibold text-gray-800">Background GPS & Baterai</span>
              </div>
              {bgInfoAcknowledged ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <AlertCircle className="w-5 h-5 text-blue-500" />}
            </div>
            {!bgInfoAcknowledged ? (
              <div className="mt-2 text-sm text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-100 flex flex-col gap-3">
                <p>⚠️ <strong>Penting:</strong> Agar GPS tetap berjalan saat layar mati, pastikan pada <strong>Pengaturan Baterai HP Anda</strong>, aplikasi SentraLogis diset ke "Tidak Dibatasi" (Unrestricted).</p>
                <p>Pilih "Izinkan Sepanjang Waktu" (Allow all the time) jika ditanyakan tentang akses lokasi background oleh Android.</p>
                <button onClick={() => setBgInfoAcknowledged(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium w-full mt-1 transition-colors">SAYA MENGERTI</button>
              </div>
            ) : (
              <p className="text-sm text-gray-500 pl-9">🟢 Instruksi background GPS telah disetujui.</p>
            )}
          </div>

          {/* 5. GPS Test */}
          <div className="border border-gray-100 rounded-xl p-4 flex flex-col gap-2 bg-white shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Navigation className={`w-6 h-6 ${gpsTestResult ? 'text-green-500' : 'text-gray-400'}`} />
                <span className="font-semibold text-gray-800">Test Sinyal GPS</span>
              </div>
              {gpsTestResult ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : (isTestingGps ? <Loader2 className="w-5 h-5 animate-spin text-blue-500" /> : <span className="text-gray-400">---</span>)}
            </div>
            
            {!gpsTestResult ? (
              <div className="mt-2 text-sm pl-9">
                <button onClick={testGps} disabled={isTestingGps || gpsPermission !== 'granted'} className="bg-gray-800 disabled:bg-gray-300 text-white px-4 py-2 rounded-lg font-medium w-fit">
                  {isTestingGps ? 'Mencari lokasi...' : 'TEST GPS SEKARANG'}
                </button>
              </div>
            ) : (
              <div className="mt-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-100 pl-9">
                <p>🟢 GPS Ready</p>
                <p>Akurasi: ± {gpsTestResult.acc} meter</p>
              </div>
            )}
          </div>

        </div>

        <div className="mt-8">
          <button 
            onClick={() => {
              if (allReady) {
                localStorage.setItem('sentraship_setup_complete', 'true');
                onComplete();
              }
            }}
            disabled={!allReady}
            className={`w-full py-4 rounded-xl font-bold text-lg transition-all ${allReady ? 'bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-200' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            {allReady ? 'PERANGKAT SIAP (MASUK PORTAL)' : 'LENGKAPI SEMUA SYARAT'}
          </button>
        </div>
      </div>
    </div>
  );
}
