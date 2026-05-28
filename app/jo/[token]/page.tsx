'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Truck, MapPin, Navigation as NavIcon, Phone, 
  CheckCircle2, Clock, ChevronRight, AlertCircle, 
  Loader2, Play, Check, X, Camera, Calendar, Activity,
  Expand, Image as ImageIcon, Lock
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { useGoogleMaps } from '@/lib/google-maps-context';
import { GoogleMap, MarkerF, PolylineF } from '@react-google-maps/api';

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
  customer?: {
    name: string;
    address: string;
  };
  tenant_name?: string;
  wo_details?: {
    wo_number: string;
    execution_date: string;
    execution_time?: string;
  };
  driver?: { id: string; name: string; phone: string };
  fleet?: { id: string; plate_number: string; type_name: string };
  driver_response?: string;
  accepted_at?: string;
  started_at?: string;
  completed_at?: string;
  advance_amount?: number;
  advance_status?: string;
  routes: RouteStop[];
}

export default function DriverTrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const { isLoaded } = useGoogleMaps();
  
  const [jobOrder, setJobOrder] = useState<JobOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState<string | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);

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
    if (newStatus === 'rejected') {
      const confirmReject = window.confirm('Apakah Anda yakin ingin MENOLAK tugas ini?');
      if (!confirmReject) return;
      
      const note = window.prompt('Alasan penolakan (opsional):');
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
            rejection_note: note,
            lat: location?.lat,
            lng: location?.lng
          })
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.error || 'Gagal memperbarui status');
        }
        
        toast.success('Tugas telah ditolak');
        await fetchJobOrder();
        return;
      } catch (err: any) {
        toast.error('Error: ' + err.message);
        setUpdating(null);
        return;
      }
    }

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
      // Convert file to base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Upload via API
      const response = await fetch(`/api/jo/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          route_id: routeId, 
          pod_photo_base64: base64,
          pod_photo_name: file.name
        })
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Gagal simpan foto ke database');
      }
      
      toast.success('Foto berhasil diunggah');
      await fetchJobOrder();
    } catch (err: any) {
      console.error('Upload error:', err);
      toast.error('Gagal upload: ' + err.message);
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

  // Hitung progress & Milestones
  const milestones = jobOrder ? [
    { id: 'start', label: 'TERIMA', status: jobOrder.accepted_at ? 'completed' : 'pending' },
    { id: 'depart', label: 'BERANGKAT', status: (jobOrder.started_at || jobOrder.status === 'DALAM PERJALANAN' || jobOrder.status.startsWith('MENUJU')) ? 'completed' : (jobOrder.accepted_at || jobOrder.status === 'MENUNGGU MULAI / START' || jobOrder.status === 'ORDER DITERIMA' ? 'current' : 'pending') },
    ...jobOrder.routes.map((s) => ({
      id: s.id,
      label: s.location_name,
      status: s.status === 'completed' ? 'completed' : (s.status === 'arrived' || jobOrder.status.includes(s.location_name.toUpperCase()) ? 'current' : 'pending')
    })),
    { id: 'finish', label: 'SELESAI', status: (jobOrder.completed_at || jobOrder.status === 'PEKERJAAN SELESAI' || jobOrder.status === 'COMPLETED') ? 'completed' : 'pending' }
  ] : [];

  const progress = (() => {
    if (!milestones.length) return 0;
    const total = milestones.length;
    const reached = milestones.filter(m => m.status === 'completed').length;
    const current = milestones.findIndex(m => m.status === 'current');
    
    let base = (reached / total) * 100;
    if (current !== -1) {
      base = (current / total) * 100 + (1 / total * 50); // halfway to current
    }
    return Math.min(base, 100);
  })();

  const totalStops = jobOrder?.routes?.length || 0;
  const completedStops = jobOrder?.routes?.filter((r: any) => r.status === 'completed').length || 0;

  const mapMarkers = (jobOrder?.routes || []).map((stop: any) => {
    const lat = stop.latitude ? Number(stop.latitude) : null;
    const lng = stop.longitude ? Number(stop.longitude) : null;
    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      return { lat, lng, sequence: stop.sequence, label: stop.location_name };
    }
    return null;
  }).filter(Boolean) as { lat: number; lng: number; sequence: number; label: string }[];

  const polylinePath = mapMarkers.map(m => ({ lat: m.lat, lng: m.lng }));
  const mapCenter = mapMarkers.length > 0 ? { lat: mapMarkers[0].lat, lng: mapMarkers[0].lng } : { lat: -6.2, lng: 106.816666 };

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
          {/* Advance Payment Notification */}
          {jobOrder.advance_status === 'paid' && (
            <div className="mb-6 bg-emerald-600 text-white p-5 rounded-[2rem] shadow-xl shadow-emerald-600/20 flex items-center gap-5 animate-in slide-in-from-top-4 duration-700">
               <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center shrink-0">
                  <Check size={24} className="text-white" />
               </div>
               <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-emerald-100 mb-1">DANA OPERASIONAL CAIR</p>
                  <h3 className="text-lg font-black tracking-tight leading-none">
                     Uang jalan Rp. {new Intl.NumberFormat('id-ID').format(jobOrder.advance_amount || 0)} telah ditransfer.
                  </h3>
                  <p className="text-[9px] font-bold text-emerald-100/60 uppercase mt-1">Silakan memulai perjalanan Anda.</p>
               </div>
            </div>
          )}
          <div className="flex justify-between items-start mb-2">
            <p className="text-sm font-black text-blue-900 uppercase tracking-tight">JO: {jobOrder.jo_number}</p>
            <div className="bg-slate-900 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-[0.2em] italic">
               {(() => {
                 const s = jobOrder.status?.toUpperCase() || '';
                 if (s === 'ACCEPTED') return 'ORDER DITERIMA';
                 if (s === 'IN_PROGRESS') return 'DALAM PERJALANAN';
                 if (s === 'COMPLETED') return 'PEKERJAAN SELESAI';
                 return s.replace('_', ' ');
               })()}
            </div>
          </div>
          
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100/50 shadow-inner mb-4">
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

          {/* New Driver & Fleet Info */}
          <div className="grid grid-cols-2 gap-3">
             <div className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                   <Phone size={18} />
                </div>
                <div className="min-w-0">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Driver</p>
                   <p className="text-xs font-black text-slate-800 truncate uppercase italic">{jobOrder.driver?.name || '-'}</p>
                </div>
             </div>
             <div className="bg-white border border-slate-100 rounded-xl p-3 flex items-center gap-3 shadow-sm">
                <div className="w-10 h-10 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                   <Truck size={18} />
                </div>
                <div className="min-w-0">
                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{jobOrder.fleet?.type_name || 'Fleet'}</p>
                   <p className="text-xs font-black text-slate-800 truncate uppercase italic">{jobOrder.fleet?.plate_number || '-'}</p>
                </div>
             </div>
          </div>
        </div>
      </div>

      <main className="max-w-xl mx-auto px-6 pt-6 space-y-6">
        
        {/* Job Completed Success Screen */}
        {(jobOrder.status === 'completed' || jobOrder.status === 'PEKERJAAN SELESAI' || jobOrder.status === 'ready_for_billing' || jobOrder.status === 'verified') && (
          <div className="bg-white rounded-[2.5rem] p-10 text-center shadow-xl border-4 border-emerald-500/20 animate-in zoom-in duration-500">
             <div className="w-24 h-24 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/40">
                <CheckCircle2 size={48} />
             </div>
             <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase italic mb-2">PEKERJAAN SELESAI</h2>
             <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-8">Terima kasih atas dedikasi Anda di lapangan!</p>
             
             <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex flex-col gap-4">
                <div className="flex justify-between items-center">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Waktu Selesai</span>
                   <span className="text-sm font-black text-slate-900">{jobOrder.completed_at ? formatTime(jobOrder.completed_at) : '-'}</span>
                </div>
                <div className="flex justify-between items-center">
                   <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tanggal</span>
                   <span className="text-sm font-black text-slate-900">{jobOrder.completed_at ? formatDate(jobOrder.completed_at) : '-'}</span>
                </div>
             </div>

             <div className="mt-8 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                <p className="text-[11px] font-black text-emerald-700 uppercase tracking-tight">Status: Menunggu Verifikasi Dokumen oleh HQ</p>
             </div>
          </div>
        )}

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
        
        {/* Journey Pipeline - HANYA TAMPIL JIKA BELUM SELESAI */}
        {totalStops > 0 && !['completed', 'PEKERJAAN SELESAI', 'ready_for_billing', 'verified'].includes(jobOrder.status) && (
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
               <NavIcon size={12} /> JOURNEY PIPELINE
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
                {milestones.map((m, idx) => (
                  <div key={m.id} className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black z-10 transition-all duration-500 shadow-sm ${
                      m.status === 'completed' ? 'bg-emerald-500 text-white' : 
                      m.status === 'current' ? 'bg-blue-600 text-white animate-pulse' : 
                      'bg-white border-2 border-slate-100 text-slate-300'
                    }`}>
                      {idx + 1}
                    </div>
                    <p className="text-[9px] font-bold text-slate-500 mt-2 text-center max-w-[60px] truncate uppercase tracking-tighter">
                      {m.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Interactive Google Map ("Peta Petunjuk") */}
        {isLoaded && mapMarkers.length > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm overflow-hidden">
            <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
               <NavIcon size={12} className="text-indigo-600 animate-pulse" /> PETA PETUNJUK RUTE
            </h2>
            <div className="h-64 rounded-xl overflow-hidden border border-slate-100 relative">
              <GoogleMap
                mapContainerStyle={{ width: '100%', height: '100%' }}
                center={mapCenter}
                zoom={11}
                options={{
                  disableDefaultUI: false,
                  zoomControl: true,
                  mapTypeControl: false,
                  streetViewControl: false,
                }}
              >
                {mapMarkers.map((marker) => (
                  <MarkerF
                    key={marker.sequence}
                    position={{ lat: marker.lat, lng: marker.lng }}
                    label={{
                      text: String(marker.sequence),
                      color: '#ffffff',
                      fontWeight: 'black',
                    }}
                  />
                ))}
                {polylinePath.length > 1 && (
                  <PolylineF
                    path={polylinePath}
                    options={{
                      strokeColor: '#3b82f6',
                      strokeOpacity: 0.8,
                      strokeWeight: 4,
                    }}
                  />
                )}
              </GoogleMap>
            </div>
          </div>
        )}

        {/* Action Section - HANYA TAMPIL JIKA BELUM SELESAI */}
        {!['completed', 'PEKERJAAN SELESAI', 'ready_for_billing', 'verified'].includes(jobOrder.status) && (
          <div className="space-y-4">
            {/* Phase 1: Confirmation (Accept/Reject) */}
            {jobOrder.driver_response !== 'accepted' && (
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
                className={`h-16 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all ${
                  jobOrder.driver_response === 'rejected' 
                    ? 'bg-rose-50 text-rose-600 border-2 border-rose-200' 
                    : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                }`}
              >
                {updating === 'rejected' ? <Loader2 className="animate-spin" /> : (
                  <>
                    <X size={20} /> 
                    {jobOrder.driver_response === 'rejected' ? 'TUGAS DITOLAK' : 'TOLAK'}
                  </>
                )}
              </button>
            </div>
          )}

          {/* Phase 2: Accepted (Start Journey) */}
          {jobOrder.driver_response === 'accepted' && (jobOrder.status === 'accepted' || jobOrder.status === 'assigned' || jobOrder.status === 'MENUNGGU BERANGKAT' || jobOrder.status === 'MENUNGGU MULAI / START' || jobOrder.status === 'ORDER DITERIMA') && (
            <button
              onClick={() => updateStatus('in_progress')}
              disabled={updating !== null}
              className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-bold text-sm flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20 active:scale-95 transition-all uppercase tracking-widest"
            >
              {updating === 'in_progress' ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  <Truck size={22} /> 
                  BERANGKAT MENUJU {jobOrder.routes[0]?.location_name?.toUpperCase() || 'LOKASI'}
                </>
              )}
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
                        <NavIcon size={18} fill="currentColor" className="opacity-80" />
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

                    {/* Photo POD Preview Thumbnail */}
                    {stop.pod_photo_url && (
                      <div className="mt-4 pt-4 border-t border-slate-50 flex flex-col gap-2">
                         <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block leading-none">Foto Bukti POD</span>
                         <div 
                           onClick={() => setSelectedPhotoPreview(stop.pod_photo_url!)}
                           className="relative w-24 h-24 rounded-2xl overflow-hidden border border-slate-200/80 cursor-pointer active:scale-95 transition-all group shadow-sm bg-slate-100"
                         >
                           <img src={stop.pod_photo_url} alt="POD Preview" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                           <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                             <Expand size={16} />
                           </div>
                         </div>
                      </div>
                    )}
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

                  {/* Contextual Buttons - TAMPILKAN JIKA MISSION SEDANG BERJALAN */}
                  {(jobOrder.status === 'in_progress' || jobOrder.status === 'DALAM PERJALANAN' || jobOrder.status.startsWith('MENUJU') || jobOrder.status.startsWith('TIBA')) && (
                    <div className="mt-5">
                      {stop.status === 'pending' && (
                        (() => {
                          const firstUncompleted = jobOrder.routes.find((r: any) => r.status !== 'completed');
                          const isNext = firstUncompleted?.id === stop.id;
                          
                          if (isNext) {
                            return (
                              <button
                                onClick={() => updateRouteStatus(stop.id, 'arrived')}
                                disabled={updating !== null}
                                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 active:scale-95 transition-all"
                              >
                                {updating === stop.id ? <Loader2 className="animate-spin" /> : <><MapPin size={16} /> TIBA DI {stop.location_name?.toUpperCase()}</>}
                              </button>
                            );
                          } else {
                            return (
                              <button
                                disabled
                                className="w-full py-4 bg-slate-100 text-slate-400 rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 border border-slate-200 cursor-not-allowed"
                              >
                                <Lock size={14} /> SELESAIKAN STOP SEBELUMNYA DULU
                              </button>
                            );
                          }
                        })()
                      )}

                      {stop.status === 'arrived' && stop.stop_type === 'PICKUP' && (
                        <button
                          onClick={() => updateRouteStatus(stop.id, 'completed')}
                          disabled={updating !== null}
                          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                        >
                          {updating === stop.id ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={16} /> SELESAIKAN MUAT ({stop.location_name?.toUpperCase()})</>}
                        </button>
                      )}

                      {stop.status === 'arrived' && stop.stop_type === 'DROPOFF' && (
                        <button
                          onClick={() => updateRouteStatus(stop.id, 'completed')}
                          disabled={updating !== null}
                          className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
                        >
                          {updating === stop.id ? <Loader2 className="animate-spin" /> : <><CheckCircle2 size={16} /> SELESAIKAN BONGKAR ({stop.location_name?.toUpperCase()})</>}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          </div>
        )}

        {/* Final Job Completion Actions */}
        {(jobOrder.status === 'in_progress' || jobOrder.status === 'DALAM PERJALANAN' || jobOrder.status.startsWith('MENUJU') || jobOrder.status.startsWith('TIBA') || jobOrder.status === 'MENUNGGU SELESAI') && (
          <div className="pt-6 pb-12 border-t border-slate-200 mt-8">
            <div className="bg-slate-900 rounded-[2.5rem] p-8 shadow-2xl shadow-slate-900/30 relative overflow-hidden">
               <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                     <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
                        <CheckCircle2 size={20} className="text-emerald-400" />
                     </div>
                     <div>
                        <h4 className="text-white font-black text-sm uppercase tracking-widest">Konfirmasi Selesai</h4>
                        <p className="text-white/40 text-[10px] font-bold uppercase tracking-tight">Pastikan semua dokumen & foto POD sudah diunggah</p>
                     </div>
                  </div>

                  {completedStops < totalStops && (
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6 flex items-center gap-3">
                       <AlertCircle size={18} className="text-amber-400 shrink-0" />
                       <p className="text-[10px] font-bold text-amber-200 uppercase leading-tight">
                          Masih ada {totalStops - completedStops} lokasi yang belum ditandai selesai. Lanjutkan?
                       </p>
                    </div>
                  )}

                  <button
                    onClick={() => {
                      const confirmMsg = completedStops < totalStops 
                        ? 'Masih ada rute yang belum selesai. Apakah Anda yakin ingin mengakhiri tugas ini sekarang?'
                        : 'Apakah Anda yakin ingin menyelesaikan seluruh tugas ini?';
                      if (window.confirm(confirmMsg)) {
                        updateStatus('completed');
                      }
                    }}
                    disabled={updating !== null}
                    className="w-full h-16 bg-white text-slate-900 hover:bg-slate-50 rounded-2xl font-black text-xs uppercase tracking-[0.3em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 group"
                  >
                    {updating === 'completed' ? (
                       <Loader2 className="animate-spin" />
                    ) : (
                       <>PEKERJAAN SELESAI <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" /></>
                    )}
                  </button>
               </div>
               <Activity className="absolute -bottom-6 -right-6 w-32 h-32 text-white/5 rotate-12" />
            </div>
          </div>
        )}

      {/* 🖼️ PHOTO OVERLAY MODAL */}
      {selectedPhotoPreview && (
        <div 
          className="fixed inset-0 z-[1000] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4" 
          onClick={() => setSelectedPhotoPreview(null)}
        >
          <div className="relative max-w-4xl w-full h-full max-h-[80vh] flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
             <button 
               className="absolute -top-12 right-0 text-white hover:text-slate-300 flex items-center gap-2 font-black uppercase text-xs tracking-widest"
               onClick={() => setSelectedPhotoPreview(null)}
             >
                Close <X className="w-6 h-6" />
             </button>
             <div className="relative w-full h-full bg-white rounded-3xl overflow-hidden shadow-2xl">
                <img src={selectedPhotoPreview} alt="Evidence Full" className="w-full h-full object-contain" />
             </div>
          </div>
        </div>
      )}

      </main>
    </div>
  );
}