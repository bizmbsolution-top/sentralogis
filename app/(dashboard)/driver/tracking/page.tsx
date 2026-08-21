'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Truck,
  MapPin,
  Navigation as NavIcon,
  Phone,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  Activity,
  Satellite,
} from 'lucide-react';
import { useDriverGpsPing } from '@/lib/hooks/useDriverGpsPing';
import { parseUTC } from '@/lib/utils/dateUtils';
import { Card } from '@/components/ui/Card';
import { Capacitor } from '@capacitor/core';

interface RouteStop {
  id: string;
  sequence: number;
  stop_type: 'PICKUP' | 'DROPOFF';
  location_name: string;
  address: string;
  contact_name: string;
  contact_phone: string;
  status: 'pending' | 'arrived' | 'completed';
  actual_arrival: string;
  actual_departure: string;
  latitude?: number;
  longitude?: number;
}

interface JobOrder {
  id: string;
  jo_number: string;
  status: string;
  container_number?: string;
  customer?: { name: string; address: string; phone?: string };
  driver?: { id: string; name: string; phone: string };
  fleet?: { id: string; plate_number: string; type_name: string };
  routes: RouteStop[];
}

export default function DriverTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = params as { token: string };
  const [jobOrder, setJobOrder] = useState<JobOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gpsLat, setGpsLat] = useState<number | null>(null);
  const [gpsLng, setGpsLng] = useState<number | null>(null);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [gpsSpeed, setGpsSpeed] = useState<number | null>(null);
  const [gpsStatus, setGpsStatus] = useState<'active' | 'inactive' | 'error' | 'loading' | 'recovering' | 'idle'>('loading');

  const status = jobOrder?.status;

  const onGeofenceRef = useRef<(evt: any) => void>(() => {});
  onGeofenceRef.current = (evt) => {
    if (evt.geofence_triggered) {
      setJobOrder((prev) => prev ? { ...prev, status: 'TIBA DI LOKASI MUAT' } : prev);
    }
  };

  const isNativeApp = typeof window !== 'undefined' ? (Capacitor.isNativePlatform() || navigator.userAgent.includes('SentraLogis_AndroidApp')) : false;

  useDriverGpsPing(
    token || null,
    status,
    !!jobOrder,
    useCallback((evt: any) => onGeofenceRef.current(evt), []),
    jobOrder?.status === 'ASSIGNED' || jobOrder?.status === 'ORDER DITERIMA' || jobOrder?.status === 'MENUNGGU BERANGKAT'
      ? new Date().toISOString()
      : null,
    isNativeApp,
    undefined,
    (state) => {
      if (state.status !== undefined) setGpsStatus(state.status);
      if (state.accuracy !== undefined) setGpsAccuracy(state.accuracy);
      if (state.speed !== undefined) setGpsSpeed(state.speed);
    }
  );

  const fetchJobOrder = async () => {
    if (!token) return;
    try {
      setLoading(true);
      const response = await fetch(`/api/jo/${token}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' },
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Gagal mengambil data');
      }
      setJobOrder(result.data);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobOrder();
  }, [token]);

  useEffect(() => {
    const channel = setInterval(() => {
      if (!token) return;
      fetch(`/api/jo/${token}/tracking`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).catch(() => {});
    }, 30000);
    return () => clearInterval(channel);
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !jobOrder) {
    return (
      <div className="space-y-6 p-6">
        <h1 className="text-2xl font-bold text-slate-900">Tracking</h1>
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-800 mb-2">
            {error ? 'Gagal Memuat Tracking' : 'Token Tidak Valid'}
          </h2>
          <p className="text-slate-500 mt-2">Token tidak ditemukan atau sudah kedaluwarsa.</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 text-sm text-indigo-600 font-medium hover:underline"
          >
            Kembali ke Beranda
          </button>
        </Card>
      </div>
    );
  }

  const activeStops = jobOrder.routes.filter((r) => r.status !== 'completed');
  const nextStop = activeStops[0];

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tracking Real-Time</h1>
          <p className="text-slate-500 text-sm mt-1">{jobOrder.jo_number}</p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100">
          <div className={`w-2.5 h-2.5 rounded-full ${gpsStatus === 'active' ? 'bg-green-500 animate-pulse' : gpsStatus === 'error' ? 'bg-red-500' : 'bg-amber-500'}`} />
          <span className="text-xs font-medium text-slate-600 capitalize">{gpsStatus}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
              <Truck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Job Order</p>
              <p className="font-bold text-slate-900">{jobOrder.jo_number}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Stop Berikutnya</p>
              <p className="font-bold text-slate-900">{nextStop?.location_name || 'Selesai'}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
              <NavIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Status Rute</p>
              <p className="font-bold text-slate-900">
                {jobOrder.routes.filter((r) => r.status === 'completed').length} / {jobOrder.routes.length} selesai
              </p>
            </div>
          </div>
        </Card>
      </div>

      {gpsLat && gpsLng && (
        <Card className="p-4 bg-slate-50">
          <div className="flex items-center gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <Satellite className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-medium text-slate-500">GPS</span>
              <span className="text-xs font-mono text-slate-900">{gpsLat.toFixed(4)}, {gpsLng.toFixed(4)}</span>
            </div>
            {gpsAccuracy && (
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-slate-400" />
                <span className="text-xs text-slate-600">Akurasi: {Math.round(gpsAccuracy)}m</span>
              </div>
            )}
            {gpsSpeed != null && gpsSpeed > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600">{Math.round(gpsSpeed * 3.6)} km/jam</span>
              </div>
            )}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider mb-4">Timeline Rute</h3>
        <div className="relative space-y-0">
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-slate-200" />
          {jobOrder.routes.map((stop) => (
            <div key={stop.id} className="relative pb-4 last:pb-0">
              <div className={`absolute left-[13px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 ${
                stop.status === 'completed' ? 'bg-green-500' :
                stop.status === 'arrived' ? 'bg-amber-500' :
                'bg-slate-300'
              }`} />
              <div className="ml-10">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-sm">
                    {stop.stop_type === 'PICKUP' ? 'Muat' : 'Bongkar'} #{stop.sequence}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    stop.status === 'completed' ? 'bg-green-100 text-green-700' :
                    stop.status === 'arrived' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-500'
                  }`}>
                    {stop.status === 'completed' ? 'SELESAI' :
                     stop.status === 'arrived' ? 'TIBA' : 'BERIKUTNYA'}
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-0.5">{stop.location_name}</p>
                <p className="text-xs text-slate-400 mt-0.5">{stop.address}</p>
                {(stop.actual_arrival || stop.actual_departure) && (
                  <div className="flex gap-4 mt-1">
                    {stop.actual_arrival && (
                      <span className="text-xs text-green-600 font-medium">
                        Tiba: {parseUTC(stop.actual_arrival)?.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                    {stop.actual_departure && (
                      <span className="text-xs text-blue-600 font-medium">
                        Berangkat: {parseUTC(stop.actual_departure)?.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
            <Phone className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-900">{jobOrder.customer?.name || '-'}</p>
            <p className="text-xs text-slate-500">{jobOrder.customer?.address || '-'}</p>
            {jobOrder.customer?.phone && (
              <a href={`tel:${jobOrder.customer.phone}`} className="text-xs text-indigo-600 font-medium mt-1 block">
                {jobOrder.customer.phone}
              </a>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}