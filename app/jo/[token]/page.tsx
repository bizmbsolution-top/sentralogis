'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Truck, MapPin, Navigation, Phone, 
  CheckCircle2, Clock, ChevronRight, AlertCircle, 
  Loader2, Play, Check, X, Camera, Calendar, Activity
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

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
  pod_photo_url?: string;
}

interface JobOrder {
  id: string;
  jo_number: string;
  status: string;
  driver_phone: string;
  accepted_at: string;
  started_at: string;
  completed_at: string;
  customer: {
    name: string;
    address: string;
  };
  tenant_name: string;
  wo_details: {
    wo_number: string;
    execution_date: string;
    execution_time?: string;
  };
  routes: RouteStop[];
}

export default function DriverTrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  
  const [jobOrder, setJobOrder] = useState<JobOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    fetchJobOrder();
  }, [token]);

  const fetchJobOrder = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/jo/${token}`, {
        headers: { 'ngrok-skip-browser-warning': 'true' }
      });
      const result = await response.json();
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Link sudah kadaluarsa atau tidak valid. Silakan hubungi operator.');
        }
        throw new Error(result.error || 'Gagal mengambil data');
      }
      
      setJobOrder(result.data);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching job order:', err);
      setError(err.message.includes('Failed to fetch') ? 'Terjadi kesalahan koneksi. Periksa koneksi internet Anda.' : err.message);
    } finally {
      setLoading(false);
    }
  };

  const getLocation = (): Promise<{ lat: number; lng: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn('Geolocation not supported');
        resolve(null);
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => {
          console.warn('Location error:', err);
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 5000 }
      );
    });
  };

  const updateStatus = async (newStatus: string) => {
    setUpdating(newStatus);
    try {
      const location = await getLocation();
      const response = await fetch(`/api/jo/${token}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true' 
        },
        body: JSON.stringify({ 
          status: newStatus,
          lat: location?.lat,
          lng: location?.lng
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Gagal memperbarui status');
      }
      
      toast.success(`Status diperbarui ke: ${newStatus.toUpperCase()}`);
      setLastError(null);
      await fetchJobOrder();
    } catch (err: any) {
      console.error('Update Status Error:', err);
      setLastError(err.message);
      toast.error('Error: ' + err.message, { duration: 5000 });
    } finally {
      setUpdating(null);
    }
  };

  const updateRouteStatus = async (routeId: string, routeStatus: string) => {
    setUpdating(routeId);
    setLastError(null);
    try {
      const location = await getLocation();
      console.log('Updating Route:', routeId, routeStatus, location);
      const response = await fetch(`/api/jo/${token}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true' 
        },
        body: JSON.stringify({ 
          route_id: routeId, 
          route_status: routeStatus,
          lat: location?.lat,
          lng: location?.lng
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Gagal memperbarui rute');
      }
      
      toast.success(`Berhasil: ${routeStatus.toUpperCase()}`);
      await fetchJobOrder();
    } catch (err: any) {
      console.error('Update Route Error:', err);
      setLastError(err.message);
      toast.error('Gagal: ' + err.message, { duration: 5000 });
    } finally {
      setUpdating(null);
    }
  };

  const handlePhotoUpload = async (routeId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPhotoLoading(routeId);
    try {
      // Simulation of upload for now, but integrated with API
      // In real scenario, we would upload to Supabase Storage first
      const fakeUrl = `https://dummyimage.com/600x400/000/fff&text=POD+Photo+${routeId}`;
      
      const response = await fetch(`/api/jo/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          route_id: routeId, 
          pod_photo_url: fakeUrl 
        })
      });

      if (!response.ok) throw new Error('Gagal simpan foto');
      
      toast.success('Foto berhasil diunggah');
      await fetchJobOrder();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setPhotoLoading(null);
    }
  };

  const openInGoogleMaps = (address: string) => {
    const encodedAddress = encodeURIComponent(address);
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`, '_blank');
  };

  // Format date & time
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

  // Hitung progress
  const totalStops = jobOrder?.routes?.length || 0;
  const completedStops = jobOrder?.routes?.filter((r: any) => r.status === 'completed').length || 0;
  const progress = (() => {
    const stops = jobOrder?.routes || [];
    const totalPoints = stops.length * 2;
    let currentPoints = 0;
    stops.forEach((s: any) => {
      if (s.status === 'completed') currentPoints += 2;
      else if (s.status === 'arrived') currentPoints += 1;
    });
    return totalPoints > 0 ? (currentPoints / totalPoints) * 100 : 0;
  })();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-blue-600 animate-spin mb-4" />
        <p className="text-slate-500 font-medium animate-pulse">Memuat data Job Order...</p>
      </div>
    );
  }

  if (error || !jobOrder) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-sm text-center shadow-xl border border-slate-100">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-6" />
          <h2 className="text-xl font-bold text-slate-800 mb-2 uppercase tracking-tight">LINK TIDAK VALID</h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed">{error || 'Job Order tidak ditemukan'}</p>
          <button onClick={() => window.location.reload()} className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm transition-all active:scale-95">MUAT ULANG</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] pb-32">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-6 pt-8 pb-6 shadow-sm">
        <div className="max-w-xl mx-auto">
          <p className="text-sm font-black text-blue-900 uppercase tracking-tight mb-2">JO: {jobOrder.jo_number}</p>
          
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100/50 shadow-inner">
            <h1 className="text-2xl font-black text-slate-800 leading-tight mb-2 tracking-tighter">
              {jobOrder.tenant_name || jobOrder.customer?.name || 'SENTRALOGIS'}
            </h1>
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-rose-600" />
              <span className="text-sm text-rose-600 font-black tracking-tight">
                {formatDate(jobOrder.wo_details?.execution_date || new Date().toISOString())}
              </span>
              {jobOrder.wo_details?.execution_time && (
                <>
                  <span className="text-slate-300 mx-1">|</span>
                  <Clock size={16} className="text-rose-600" />
                  <span className="text-sm text-rose-600 font-black tracking-tight">
                    {jobOrder.wo_details.execution_time}
                  </span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-xl mx-auto px-6 pt-6 space-y-6">
        
        {/* Debug Section if Error */}
        {lastError && (
          <div className="bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 animate-bounce">
            <div className="flex items-center gap-2 text-rose-700 mb-1">
              <AlertCircle size={18} />
              <p className="text-xs font-black uppercase tracking-widest">Update Gagal!</p>
            </div>
            <p className="text-sm font-bold text-rose-600">{lastError}</p>
            <p className="text-[10px] text-rose-400 mt-2 italic">Coba refresh halaman atau cek koneksi internet Anda.</p>
          </div>
        )}
        
        {/* Journey Pipeline - SELALU TAMPIL JIKA ADA RUTE */}
        {totalStops > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
               <Navigation size={12} /> JOURNEY PIPELINE
            </h2>
            <div className="relative px-2">
              {/* Line background */}
              <div className="absolute top-4 left-4 right-4 h-[2px] bg-slate-100 rounded-full" />
              {/* Line progress */}
              <div 
                className="absolute top-4 left-4 h-[2px] bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: progress > 0 ? `calc(${progress}% - 32px)` : '0px' }}
              />
              
              <div className="relative flex justify-between">
                {jobOrder.routes.map((stop, idx) => (
                  <div key={stop.id} className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black z-10 transition-all duration-500 shadow-sm ${
                      stop.status === 'completed' ? 'bg-emerald-500 text-white' : 
                      stop.status === 'arrived' ? 'bg-blue-600 text-white animate-pulse' : 
                      'bg-white border-2 border-slate-100 text-slate-300'
                    }`}>
                      {stop.sequence}
                    </div>
                    <p className="text-[9px] font-bold text-slate-500 mt-2 text-center max-w-[60px] truncate uppercase tracking-tighter">
                      {stop.location_name}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Action Section */}
        <div className="space-y-4">
          {/* Phase 1: Pending (Accept/Reject) */}
          {(jobOrder.status === 'pending' || jobOrder.status === 'assigned') && (
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => updateStatus('accepted')}
                disabled={updating !== null}
                className="h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
              >
                {updating === 'accepted' ? <Loader2 className="animate-spin" /> : <><Check size={20} /> TERIMA</>}
              </button>
              <button
                onClick={() => updateStatus('rejected')}
                disabled={updating !== null}
                className="h-16 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-rose-600/20 active:scale-95 transition-all"
              >
                {updating === 'rejected' ? <Loader2 className="animate-spin" /> : <><X size={20} /> TOLAK</>}
              </button>
            </div>
          )}

          {/* Phase 2: Accepted (Start Journey) */}
          {jobOrder.status === 'accepted' && (
            <button
              onClick={() => updateStatus('in_progress')}
              disabled={updating}
              className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20 active:scale-95 transition-all uppercase tracking-widest"
            >
              {updating === 'in_progress' ? <Loader2 className="animate-spin" /> : <><Truck size={22} /> BERANGKAT SEKARANG</>}
            </button>
          )}

          {/* Daftar Lokasi - TAMPILKAN SEBAGAI PREVIEW JIKA PENDING */}
          {totalStops > 0 && (
            <div className="space-y-4">
              <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] ml-1 flex items-center gap-2">
                 <MapPin size={12} /> RUTE PERJALANAN
              </h2>
            {jobOrder.routes.map((stop) => (
                <div key={stop.id} className={`bg-white rounded-2xl p-5 border shadow-sm transition-all ${
                   stop.status === 'completed' ? 'border-emerald-100 opacity-75' : 
                   stop.status === 'arrived' ? 'border-blue-200 ring-2 ring-blue-50' : 
                   'border-slate-100'
                }`}>
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex gap-4 flex-1">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        stop.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 
                        stop.status === 'arrived' ? 'bg-blue-50 text-blue-600' : 
                        'bg-slate-50 text-slate-400'
                      }`}>
                        {stop.sequence}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                            stop.stop_type === 'PICKUP' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>
                            {stop.stop_type}
                          </span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-base mt-1 uppercase tracking-tight leading-none truncate">{stop.location_name}</h3>
                        <p className="text-[11px] font-medium text-slate-400 leading-relaxed mt-1 break-words">{stop.address}</p>
                      </div>
                    </div>
                    
                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2">
                      <button 
                        onClick={() => openInGoogleMaps(stop.address)}
                        className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-sm border border-blue-100"
                        title="Buka Navigasi"
                      >
                        <Navigation size={18} fill="currentColor" className="opacity-80" />
                      </button>

                      <div className="relative">
                        <input 
                          type="file" 
                          accept="image/*" 
                          capture="environment"
                          className="hidden"
                          id={`photo-${stop.id}`}
                          onChange={(e) => handlePhotoUpload(stop.id, e)}
                        />
                        <label 
                          htmlFor={`photo-${stop.id}`}
                          className={`w-10 h-10 rounded-xl flex items-center justify-center active:scale-95 transition-all shadow-sm border cursor-pointer ${
                            stop.pod_photo_url ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                          }`}
                        >
                          {photoLoading === stop.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : stop.pod_photo_url ? (
                            <Check size={18} />
                          ) : (
                            <Camera size={18} />
                          )}
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Arrival/Departure info */}
                  {(stop.actual_arrival || stop.actual_departure) && (
                    <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-50">
                       <div className="text-center">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Tiba</p>
                          <p className="text-xs font-black text-slate-700">{formatTime(stop.actual_arrival)}</p>
                       </div>
                       <div className="text-center">
                          <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Berangkat</p>
                          <p className="text-xs font-black text-slate-700">{formatTime(stop.actual_departure)}</p>
                       </div>
                    </div>
                  )}

                  {/* Contextual Buttons - HANYA TAMPIL JIKA STATUS IN_PROGRESS */}
                  {jobOrder.status === 'in_progress' && (
                    <div className="mt-5">
                      {stop.status === 'pending' && (
                        <button
                          onClick={() => updateRouteStatus(stop.id, 'arrived')}
                          disabled={updating !== null}
                          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                        >
                          {updating === stop.id ? <Loader2 className="animate-spin" /> : <><MapPin size={16} /> TIBA DI LOKASI</>}
                        </button>
                      )}

                      {stop.status === 'arrived' && stop.stop_type === 'PICKUP' && (
                        <button
                          onClick={() => updateRouteStatus(stop.id, 'completed')}
                          disabled={updating !== null}
                          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                        >
                          {updating === stop.id ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={16} /> SELESAIKAN MUAT</>}
                        </button>
                      )}

                      {stop.status === 'arrived' && stop.stop_type === 'DROPOFF' && (
                        <button
                          onClick={() => updateRouteStatus(stop.id, 'completed')}
                          disabled={updating !== null}
                          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                        >
                          {updating === stop.id ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={16} /> SELESAIKAN BONGKAR</>}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Final Job Completion */}
        {jobOrder.status === 'in_progress' && completedStops === totalStops && totalStops > 0 && (
          <div className="pt-6">
            <button
              onClick={() => updateStatus('completed')}
              disabled={updating}
              className="w-full h-16 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all"
            >
              {updating === 'completed' ? <Loader2 className="animate-spin" /> : 'PEKERJAAN SELESAI'}
            </button>
          </div>
        )}

      </main>
    </div>
  );
}