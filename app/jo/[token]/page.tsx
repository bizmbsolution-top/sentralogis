'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Truck, MapPin, Navigation as NavIcon, Phone, 
  CheckCircle2, Clock, ChevronRight, AlertCircle, 
  Loader2, Play, Check, X, Camera, Calendar, Activity,
  Expand, Image as ImageIcon, Lock, Box, FileText, Download, Eye, FolderGit2
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { useGoogleMaps } from '@/lib/google-maps-context';
import { GoogleMap, MarkerF, PolylineF } from '@react-google-maps/api';
import { useDriverGpsPing } from '@/lib/hooks/useDriverGpsPing';

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
  container_number?: string;
  sbu_metadata?: {
    seal_number?: string;
    [key: string]: any;
  };
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
  assignment_documents?: any[];
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

  const [containerNo, setContainerNo] = useState('');
  const [sealNo, setSealNo] = useState('');
  const [savingContainer, setSavingContainer] = useState(false);

  const [geofenceBanner, setGeofenceBanner] = useState<{ arrived_stop: string | null; distance_m: number | null } | null>(null);
  const [panicModalOpen, setPanicModalOpen] = useState(false);
  const [panicType, setPanicType] = useState<'swap_fleet' | 'swap_driver' | 'general'>('swap_fleet');
  const [panicReason, setPanicReason] = useState('');
  const [panicHasCargo, setPanicHasCargo] = useState<boolean>(true);
  const [panicSending, setPanicSending] = useState(false);

  const [readyConfirmOpen, setReadyConfirmOpen] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchJobOrder();
  }, [token]);

  useDriverGpsPing(token, jobOrder?.status, !!jobOrder, (evt) => {
    if (evt.geofence_triggered) {
      setGeofenceBanner({ arrived_stop: evt.arrived_stop, distance_m: evt.distance_m });
      fetchJobOrder();
    }
  });

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
      setContainerNo(result.data?.container_number || '');
      setSealNo(result.data?.sbu_metadata?.seal_number || '');
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

  const saveContainerInfo = async () => {
    try {
      setSavingContainer(true);
      const response = await fetch(`/api/jo/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_container',
          container_number: containerNo,
          seal_number: sealNo
        })
      });
      const res = await response.json();
      if (!response.ok) throw new Error(res.error || 'Gagal menyimpan data kontainer');
      toast.success('Nomor Kontainer & Seal berhasil disimpan!');
      await fetchJobOrder();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSavingContainer(false);
    }
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
      const location = await getLocation();
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await fetch(`/api/jo/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          route_id: routeId, 
          pod_photo_base64: base64,
          pod_photo_name: file.name,
          lat: location?.lat,
          lng: location?.lng
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

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  };

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
      base = (current / total) * 100 + (1 / total * 50);
    }
    return Math.min(base, 100);
  })();

  const totalStops = jobOrder?.routes?.length || 0;
  const completedStops = jobOrder?.routes?.filter((r: any) => {
    const s = (r.status || '').toLowerCase();
    return s === 'completed' || s === 'arrived' || !!r.actual_arrival;
  }).length || 0;

  const activeStop = jobOrder?.routes?.find((r: any) => r.status === 'arrived' || r.status === 'pending');
  const activeStopMarker = activeStop ? (() => {
    const lat = activeStop.latitude ? Number((activeStop as any).latitude) : null;
    const lng = activeStop.longitude ? Number((activeStop as any).longitude) : null;
    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      return { lat, lng, label: activeStop.location_name };
    }
    return null;
  })() : null;

  const mapMarkers = (jobOrder?.routes || []).map((stop: any) => {
    const lat = stop.latitude ? Number(stop.latitude) : null;
    const lng = stop.longitude ? Number(stop.longitude) : null;
    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
      return { lat, lng, sequence: stop.sequence, label: stop.location_name };
    }
    return null;
  }).filter(Boolean) as { lat: number; lng: number; sequence: number; label: string }[];

  const polylinePath = mapMarkers.map(m => ({ lat: m.lat, lng: m.lng }));
  const mapCenter = activeStopMarker
    ? { lat: activeStopMarker.lat, lng: activeStopMarker.lng }
    : mapMarkers.length > 0
      ? { lat: mapMarkers[0].lat, lng: mapMarkers[0].lng }
      : { lat: -6.2, lng: 106.816666 };

  const isGreeting = jobOrder?.driver_response !== 'accepted';
  const isPendingStart = jobOrder?.driver_response === 'accepted' && !jobOrder?.started_at && !['in_progress', 'DALAM PERJALANAN'].includes(jobOrder?.status || '') && !jobOrder?.status?.startsWith('MENUJU');
  const isActive = !isGreeting && !isPendingStart && !['completed', 'PEKERJAAN SELESAI', 'SELESAI', 'PAID', 'ready_for_billing', 'verified'].includes(jobOrder?.status || '');
  const isCompleted = ['completed', 'PEKERJAAN SELESAI', 'SELESAI', 'PAID', 'ready_for_billing', 'verified'].includes(jobOrder?.status || '');

  const nextStopName = activeStop?.location_name?.toUpperCase() || 'LOKASI TUJUAN';

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

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PHASE 1: GREETING SCREEN (Before Accept)                     */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {isGreeting && (
        <div className="min-h-screen flex flex-col items-center justify-center px-6 py-12">
          <div className="max-w-sm w-full space-y-6">
            {/* Greeting */}
            <div className="text-center">
              <div className="w-20 h-20 bg-blue-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-600/30">
                <Truck size={36} />
              </div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-2">Selamat Datang</p>
              <h1 className="text-3xl font-black text-slate-900 tracking-tight">
                Halo, {jobOrder.driver?.name || 'Driver'} 👋
              </h1>
              <p className="text-base font-semibold text-slate-500 mt-3 leading-relaxed">
                Anda mendapat tugas baru
              </p>
            </div>

            {/* Job Info Card */}
            <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-lg space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Job Order</span>
                <span className="bg-slate-900 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{jobOrder.jo_number}</span>
              </div>
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600 shrink-0">
                    <Calendar size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tanggal</p>
                    <p className="text-sm font-black text-slate-800">{formatDate(jobOrder.wo_details?.execution_date || new Date().toISOString())}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center text-emerald-600 shrink-0">
                    <MapPin size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tujuan</p>
                    <p className="text-sm font-black text-slate-800">{jobOrder.routes[0]?.location_name || '-'}</p>
                    <p className="text-[10px] font-medium text-slate-400 mt-0.5">{jobOrder.routes.length} titik lokasi</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center text-amber-600 shrink-0">
                    <Truck size={14} />
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Armada</p>
                    <p className="text-sm font-black text-slate-800">{jobOrder.fleet?.plate_number || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Advance Payment */}
            {jobOrder.advance_status === 'paid' && (
              <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-200 flex items-center gap-4">
                <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0">
                  <Check size={20} />
                </div>
                <div>
                  <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Dana Operasional Cair</p>
                  <p className="text-sm font-black text-emerald-800">Rp. {new Intl.NumberFormat('id-ID').format(jobOrder.advance_amount || 0)}</p>
                </div>
              </div>
            )}

            {/* Accept/Reject Buttons */}
            <div className="space-y-3">
              <button
                onClick={() => updateStatus('accepted')}
                disabled={updating !== null}
                className="w-full h-16 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all uppercase tracking-widest"
              >
                {updating === 'accepted' ? <Loader2 className="animate-spin" /> : <><Check size={22} /> TERIMA TUGAS</>}
              </button>
              <button
                onClick={() => updateStatus('rejected')}
                disabled={updating !== null}
                className="w-full h-14 bg-white hover:bg-rose-50 text-rose-600 border-2 border-rose-200 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                {updating === 'rejected' ? <Loader2 className="animate-spin" size={18} /> : <><X size={18} /> TOLAK</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PHASE 2: READY TO DEPART (After accept, before start)        */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {isPendingStart && (
        <div className="min-h-screen flex flex-col">
          {/* Compact Header */}
          <div className="bg-white border-b border-slate-100 px-6 py-4 shadow-sm">
            <div className="max-w-xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-100 text-emerald-600 rounded-lg flex items-center justify-center">
                  <Check size={16} />
                </div>
                <div>
                  <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Diterima</p>
                  <p className="text-[10px] font-bold text-slate-400">{jobOrder.jo_number}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Driver</p>
                <p className="text-xs font-black text-slate-800 uppercase">{jobOrder.driver?.name}</p>
              </div>
            </div>
          </div>

          {/* Milestones (compact) */}
          <div className="px-6 py-4">
            <div className="max-w-xl mx-auto">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {milestones.map((m, idx) => (
                  <div key={m.id} className="flex items-center gap-2 shrink-0">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[9px] font-black shrink-0 ${
                      m.status === 'completed' ? 'bg-emerald-500 text-white' :
                      m.status === 'current' ? 'bg-blue-600 text-white' :
                      'bg-slate-100 text-slate-400'
                    }`}>
                      {m.status === 'completed' ? <Check size={12} /> : idx + 1}
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">{m.label}</span>
                    {idx < milestones.length - 1 && <ChevronRight size={10} className="text-slate-300" />}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 flex flex-col items-center justify-center px-6">
            <div className="max-w-sm w-full text-center space-y-8">
              <div>
                <div className="w-24 h-24 bg-blue-100 text-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 animate-bounce">
                  <Truck size={48} />
                </div>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight mb-2">
                  Siap Berangkat?
                </h2>
                <p className="text-sm font-semibold text-slate-500 leading-relaxed">
                  Konfirmasi bahwa Anda sudah siap menuju lokasi pengambilan
                </p>
                <div className="mt-4 bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Tujuan Pertama</p>
                  <p className="text-sm font-black text-slate-800">{nextStopName}</p>
                </div>
              </div>

              <button
                onClick={() => updateStatus('in_progress')}
                disabled={updating !== null}
                className="w-full h-16 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 shadow-lg shadow-blue-600/20 active:scale-95 transition-all uppercase tracking-widest"
              >
                {updating === 'in_progress' ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <>
                    <Play size={20} /> YA, BERANGKAT!
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* PHASE 3: ACTIVE TRACKING (In progress / journey)             */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {(isActive || isCompleted) && (
        <>
          {/* Sticky Header */}
          <div className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-40">
            <div className="max-w-xl mx-auto px-6 py-4">
              {/* Top Row: Recipient + Status */}
              <div className="flex items-center justify-between mb-3">
                <div className="min-w-0 flex-1">
                  <p className="text-lg font-black text-slate-900 truncate tracking-tight">
                    {jobOrder.tenant_name || jobOrder.customer?.name || 'SENTRALOGIS'}
                  </p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{jobOrder.jo_number}</p>
                </div>
                <div className={`px-3 py-1.5 rounded-full text-[9px] font-black uppercase tracking-[0.2em] shrink-0 ml-3 ${
                  isCompleted ? 'bg-emerald-100 text-emerald-700' :
                  'bg-slate-900 text-white'
                }`}>
                  {(() => {
                    const s = jobOrder.status?.toUpperCase() || '';
                    if (s === 'ACCEPTED') return 'DITERIMA';
                    if (s === 'IN_PROGRESS') return 'DALAM PERJALANAN';
                    if (s === 'COMPLETED' || s === 'PEKERJAAN SELESAI') return 'SELESAI';
                    if (s.startsWith('MENUJU')) return 'MENUJU';
                    if (s.startsWith('TIBA')) return 'TIBA';
                    return s.replace(/_/g, ' ');
                  })()}
                </div>
              </div>

              {/* Milestone Dots */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {milestones.map((m, idx) => (
                  <div key={m.id} className="flex items-center gap-1.5 shrink-0">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[8px] font-black shrink-0 transition-all ${
                      m.status === 'completed' ? 'bg-emerald-500 text-white' :
                      m.status === 'current' ? 'bg-blue-600 text-white animate-pulse' :
                      'bg-slate-100 text-slate-400'
                    }`}>
                      {m.status === 'completed' ? <Check size={10} /> : idx + 1}
                    </div>
                    {idx < milestones.length - 1 && (
                      <div className={`w-4 h-[2px] rounded-full ${m.status === 'completed' ? 'bg-emerald-300' : 'bg-slate-200'}`} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <main className="max-w-xl mx-auto space-y-0">
            {/* Geofence Banner */}
            {geofenceBanner && (
              <div className="mx-6 mt-4 bg-emerald-600 text-white rounded-2xl p-5 shadow-2xl border-2 border-emerald-400 animate-in fade-in slide-in-from-top-4 duration-500 relative">
                <button 
                  onClick={() => setGeofenceBanner(null)} 
                  className="absolute top-3 right-3 text-white/80 hover:text-white p-1 bg-black/20 rounded-full"
                >
                  <X size={14} />
                </button>
                <div className="flex items-center gap-3">
                  <span className="text-2xl animate-bounce">📍</span>
                  <div className="pr-4">
                    <h3 className="text-sm font-black tracking-tight uppercase leading-tight mb-0.5">
                      TIBA DI {geofenceBanner.arrived_stop || 'LOKASI'}
                    </h3>
                    <p className="text-[10px] font-bold text-emerald-100 leading-relaxed">
                      Terverifikasi via Geofence ({geofenceBanner.distance_m || '< 500'}m). Status rute diperbarui!
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Error Banner */}
            {lastError && (
              <div className="mx-6 mt-4 bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 animate-bounce">
                <div className="flex items-center gap-2 text-rose-700 mb-1">
                  <AlertCircle size={16} />
                  <p className="text-[10px] font-black uppercase tracking-widest">Update Gagal!</p>
                </div>
                <p className="text-xs font-bold text-rose-600">{lastError}</p>
              </div>
            )}

            {/* Single Map — Shows current active route */}
            {isLoaded && mapMarkers.length > 0 && (
              <div className="relative">
                <div className="h-[45vh] min-h-[280px] w-full">
                  <GoogleMap
                    mapContainerStyle={{ width: '100%', height: '100%' }}
                    center={mapCenter}
                    zoom={13}
                    options={{
                      disableDefaultUI: false,
                      zoomControl: true,
                      mapTypeControl: false,
                      streetViewControl: false,
                      fullscreenControl: false,
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
                          fontSize: '11px',
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

                {/* Map overlay: current destination */}
                {activeStop && !isCompleted && (
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-white via-white/95 to-transparent pt-10 pb-4 px-6">
                    <div className="flex items-center gap-3 bg-white rounded-2xl p-4 shadow-xl border border-slate-100">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        activeStop.status === 'completed' ? 'bg-emerald-50 text-emerald-600' :
                        activeStop.status === 'arrived' ? 'bg-blue-50 text-blue-600' :
                        'bg-slate-50 text-slate-400'
                      }`}>
                        {activeStop.sequence}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                            activeStop.stop_type === 'PICKUP' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>{activeStop.stop_type}</span>
                          {activeStop.status === 'arrived' && (
                            <span className="text-[8px] font-black text-blue-600 uppercase tracking-widest">Tiba</span>
                          )}
                        </div>
                        <p className="text-sm font-black text-slate-800 truncate mt-0.5">{activeStop.location_name}</p>
                        <p className="text-[10px] font-medium text-slate-400 truncate">{activeStop.address}</p>
                      </div>
                      <button
                        onClick={() => openInGoogleMaps(activeStop.address)}
                        className="w-12 h-12 bg-blue-600 text-white rounded-xl flex items-center justify-center shrink-0 active:scale-95 transition-all shadow-lg shadow-blue-600/30"
                      >
                        <NavIcon size={20} fill="currentColor" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Route Stops */}
            {totalStops > 0 && (
              <div className="px-6 py-6 space-y-3">
                <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                  <MapPin size={12} /> RUTE PERJALANAN ({completedStops}/{totalStops})
                </h2>
                {jobOrder.routes.map((stop) => (
                  <div key={stop.id} className={`bg-white rounded-2xl p-4 border shadow-sm transition-all ${
                    stop.status === 'completed' ? 'border-emerald-100 bg-emerald-50/30' :
                    stop.status === 'arrived' ? 'border-blue-200 ring-2 ring-blue-100' :
                    'border-slate-100'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                        stop.status === 'completed' ? 'bg-emerald-500 text-white' :
                        stop.status === 'arrived' ? 'bg-blue-500 text-white' :
                        'bg-slate-100 text-slate-400'
                      }`}>
                        {stop.status === 'completed' ? <Check size={14} /> : stop.sequence}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded ${
                            stop.stop_type === 'PICKUP' ? 'bg-blue-50 text-blue-600' : 'bg-emerald-50 text-emerald-600'
                          }`}>{stop.stop_type}</span>
                          <span className="text-[9px] font-bold text-slate-400">{stop.contact_name}</span>
                        </div>
                        <h3 className="font-bold text-slate-800 text-sm mt-0.5 truncate">{stop.location_name}</h3>
                        <p className="text-[10px] font-medium text-slate-400 truncate">{stop.address}</p>

                        {/* Arrival time */}
                        {(stop.actual_arrival || stop.actual_departure) && (
                          <div className="flex items-center gap-4 mt-2">
                            {stop.actual_arrival && (
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] font-bold text-slate-400 uppercase">Tiba</span>
                                <span className="text-[10px] font-black text-slate-700">{formatTime(stop.actual_arrival)}</span>
                              </div>
                            )}
                            {stop.actual_departure && (
                              <div className="flex items-center gap-1">
                                <span className="text-[8px] font-bold text-slate-400 uppercase">Berangkat</span>
                                <span className="text-[10px] font-black text-slate-700">{formatTime(stop.actual_departure)}</span>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Geofence status */}
                        {isActive && (
                          <div className="mt-2">
                            {stop.status === 'completed' ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                                <CheckCircle2 size={11} /> Selesai
                              </span>
                            ) : stop.status === 'arrived' ? (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black text-blue-600 uppercase tracking-widest animate-pulse">
                                <MapPin size={11} /> Tiba (Geofence)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping" />
                                Menunggu (&lt;500m)
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Action Buttons */}
                      <div className="flex flex-col gap-2 shrink-0">
                        <button 
                          onClick={() => openInGoogleMaps(stop.address)}
                          className="w-9 h-9 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center active:scale-95 transition-all border border-blue-100"
                          title="Navigasi"
                        >
                          <NavIcon size={16} fill="currentColor" className="opacity-80" />
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
                            className={`w-9 h-9 rounded-xl flex items-center justify-center active:scale-95 transition-all border cursor-pointer ${
                              stop.pod_photo_url ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'
                            }`}
                          >
                            {photoLoading === stop.id ? (
                              <Loader2 size={14} className="animate-spin" />
                            ) : stop.pod_photo_url ? (
                              <Check size={14} />
                            ) : (
                              <Camera size={14} />
                            )}
                          </label>
                        </div>
                      </div>
                    </div>

                    {/* POD Photo Thumbnail */}
                    {stop.pod_photo_url && (
                      <div 
                        onClick={() => setSelectedPhotoPreview(stop.pod_photo_url!)}
                        className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-3 cursor-pointer active:scale-[0.98] transition-all"
                      >
                        <div className="w-14 h-14 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                          <img src={stop.pod_photo_url} alt="POD" className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Foto POD</p>
                          <p className="text-[10px] font-bold text-blue-600 flex items-center gap-1"><Eye size={10} /> Lihat Foto</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Container & Seal Input */}
            <div className="px-6 pb-4">
              <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Box size={16} className="text-indigo-600" />
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Kontainer & Seal</p>
                  </div>
                  {(jobOrder.container_number || jobOrder.sbu_metadata?.seal_number) && (
                    <span className="bg-emerald-50 text-emerald-600 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full border border-emerald-200">TERISI</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Kontainer</label>
                    <input 
                      type="text" 
                      placeholder="TGHU-123456-7"
                      value={containerNo}
                      onChange={(e) => setContainerNo(e.target.value.toUpperCase())}
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold uppercase text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Seal</label>
                    <input 
                      type="text" 
                      placeholder="SL-98765"
                      value={sealNo}
                      onChange={(e) => setSealNo(e.target.value.toUpperCase())}
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white text-xs font-bold uppercase text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                    />
                  </div>
                </div>
                <button
                  onClick={saveContainerInfo}
                  disabled={savingContainer || (!containerNo && !sealNo)}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl font-bold text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-md active:scale-95"
                >
                  {savingContainer ? <Loader2 size={14} className="animate-spin" /> : <><Check size={14} /> SIMPAN</>}
                </button>
              </div>
            </div>

            {/* Documents */}
            {jobOrder.assignment_documents && jobOrder.assignment_documents.length > 0 && (
              <div className="px-6 pb-4">
                <div className="bg-white rounded-2xl p-5 border border-blue-100 shadow-sm space-y-3">
                  <div className="flex items-center gap-2">
                    <FolderGit2 size={16} className="text-blue-600" />
                    <p className="text-xs font-black text-slate-800 uppercase tracking-tight">Dokumen</p>
                  </div>
                  <div className="space-y-2">
                    {jobOrder.assignment_documents.map((doc: any, idx: number) => (
                      <a
                        key={doc.id || idx}
                        href={doc.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 bg-blue-50/50 border border-blue-200/60 rounded-xl p-3 active:scale-[0.98] transition-all"
                      >
                        <div className="w-9 h-9 rounded-lg bg-white flex items-center justify-center shrink-0 border border-blue-100">
                          {doc.name?.endsWith('.pdf') || doc.file_type?.includes('pdf') ? (
                            <FileText size={16} className="text-red-500" />
                          ) : (
                            <ImageIcon size={16} className="text-blue-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-slate-800 truncate">{doc.name}</p>
                          <p className="text-[9px] text-slate-400">{doc.file_size || ''}</p>
                        </div>
                        <Eye size={14} className="text-blue-500 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Completion Button */}
            {isActive && (
              <div className="px-6 pb-8 pt-4">
                <div className="bg-slate-900 rounded-2xl p-6 shadow-xl relative overflow-hidden">
                  <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-3">
                      <CheckCircle2 size={18} className="text-emerald-400" />
                      <p className="text-xs font-black text-white uppercase tracking-widest">Selesai</p>
                    </div>
                    {completedStops < totalStops && (
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4 flex items-center gap-2">
                        <AlertCircle size={14} className="text-amber-400 shrink-0" />
                        <p className="text-[9px] font-bold text-amber-200 uppercase leading-tight">
                          {totalStops - completedStops} lokasi belum selesai
                        </p>
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (completedStops < totalStops && totalStops > 0) {
                          const unvisited = totalStops - completedStops;
                          if (!window.confirm(`⚠️ Masih ada ${unvisited} lokasi belum selesai. Tetap selesaikan?`)) return;
                        } else {
                          if (!window.confirm('Selesaikan seluruh pekerjaan?')) return;
                        }
                        updateStatus('completed');
                      }}
                      disabled={updating !== null}
                      className="w-full h-14 bg-white text-slate-900 hover:bg-slate-50 rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      {updating === 'completed' ? <Loader2 className="animate-spin" /> : <>PEKERJAAN SELESAI <ChevronRight size={16} /></>}
                    </button>
                  </div>
                  <Activity className="absolute -bottom-4 -right-4 w-24 h-24 text-white/5 rotate-12" />
                </div>
              </div>
            )}

            {/* Completed Screen */}
            {isCompleted && (
              <div className="px-6 pb-8 pt-4">
                <div className="bg-emerald-50 border-4 border-emerald-500 rounded-2xl p-8 text-center shadow-xl">
                  <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl shadow-lg shadow-emerald-500/30">
                    🏁
                  </div>
                  <h2 className="text-xl font-black text-emerald-800 uppercase tracking-tight mb-2">PEKERJAAN SELESAI</h2>
                  <p className="text-xs font-bold text-slate-600 mb-4">Tugas telah ditutup oleh sistem.</p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-xl border border-emerald-200 text-emerald-700 font-black text-xs uppercase tracking-widest">
                    <CheckCircle2 size={14} /> {jobOrder.status.toUpperCase()}
                  </div>
                </div>
              </div>
            )}
          </main>
        </>
      )}

      {/* Photo Overlay Modal */}
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

      {/* Floating SOS Button */}
      {isActive && (
        <button
          onClick={() => setPanicModalOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-16 h-16 bg-rose-600 hover:bg-rose-700 text-white rounded-full flex flex-col items-center justify-center shadow-2xl shadow-rose-600/50 border-4 border-rose-300 active:scale-90 transition-all animate-pulse"
          title="Tombol Darurat SOS"
        >
          <span className="text-xl leading-none">🚨</span>
          <span className="text-[9px] font-black uppercase tracking-tighter mt-0.5">SOS</span>
        </button>
      )}

      {/* Panic Modal */}
      {panicModalOpen && (
        <div 
          className="fixed inset-0 z-[1100] bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300 overflow-y-auto"
          onClick={() => !panicSending && setPanicModalOpen(false)}
        >
          <div 
            className="bg-white rounded-[2.5rem] p-6 sm:p-8 max-w-md w-full shadow-2xl border-4 border-rose-500 relative my-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl animate-bounce">
              🚨
            </div>
            <h3 className="text-lg font-black text-center text-slate-900 uppercase tracking-tight mb-1">Sinyal Darurat SOS</h3>
            <p className="text-[11px] text-center font-bold text-slate-500 mb-5 leading-relaxed">
              GPS & status muatan langsung terkirim ke Head Ops HQ!
            </p>

            <div className="space-y-2 mb-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">1. Apa yang Anda Butuhkan?</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'swap_fleet', label: 'Ganti Armada', icon: '🚛' },
                  { id: 'swap_driver', label: 'Ganti Supir', icon: '🧑‍✈️' },
                  { id: 'general', label: 'Darurat Lain', icon: '🚨' }
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setPanicType(item.id as any);
                      if (!panicReason) {
                        setPanicReason(
                          item.id === 'swap_fleet' ? 'Mesin mogok / radiator bocor tidak bisa jalan' :
                          item.id === 'swap_driver' ? 'Sakit demam / kecapekan tidak kuat lanjut nyetir' :
                          'Kendala keamanan / hadangan di perjalanan'
                        );
                      }
                    }}
                    className={`p-2.5 rounded-xl border flex flex-col items-center justify-center text-center gap-1 transition-all ${
                      panicType === item.id
                        ? 'bg-rose-50 border-rose-500 text-rose-700 font-black shadow-sm ring-2 ring-rose-200'
                        : 'bg-slate-50 border-slate-200 text-slate-600 font-bold hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-lg">{item.icon}</span>
                    <span className="text-[10px] uppercase tracking-tight leading-tight">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
                2. {panicType === 'swap_fleet' ? 'Kenapa Minta Ganti Armada?' : panicType === 'swap_driver' ? 'Kenapa Minta Ganti Supir?' : 'Keterangan Situasi:'}
              </label>
              <textarea
                value={panicReason}
                onChange={(e) => setPanicReason(e.target.value)}
                placeholder="Tulis alasan singkat..."
                rows={2}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500"
              />
            </div>

            <div className="mb-6">
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5">3. Ada Muatan?</label>
              <div className="grid grid-cols-2 gap-2.5">
                <button type="button" onClick={() => setPanicHasCargo(true)} className={`py-3 rounded-xl border text-xs font-black transition-all uppercase tracking-wider ${panicHasCargo ? 'bg-amber-500 text-white border-amber-600 shadow-md ring-2 ring-amber-300' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                  ⚠️ YA, ADA MUATAN
                </button>
                <button type="button" onClick={() => setPanicHasCargo(false)} className={`py-3 rounded-xl border text-xs font-black transition-all uppercase tracking-wider ${!panicHasCargo ? 'bg-slate-800 text-white border-slate-900 shadow-md ring-2 ring-slate-400' : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'}`}>
                  ✖️ TIDAK / KOSONG
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setPanicModalOpen(false)} disabled={panicSending} className="py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs uppercase tracking-wider transition-all">
                Batal
              </button>
              <button
                type="button"
                disabled={panicSending}
                onClick={async () => {
                  setPanicSending(true);
                  try {
                    const location = await getLocation();
                    const res = await fetch(`/api/jo/${token}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        action: 'panic_button',
                        panic_type: panicType,
                        reason: panicReason || (panicType === 'swap_fleet' ? 'Minta Ganti Armada' : panicType === 'swap_driver' ? 'Minta Ganti Supir' : 'Darurat SOS'),
                        has_cargo: panicHasCargo,
                        lat: location?.lat,
                        lng: location?.lng
                      })
                    });
                    if (!res.ok) throw new Error('Gagal mengirim sinyal darurat');
                    toast.error('🚨 SINYAL DARURAT TERKIRIM KE HEAD OPS HQ!', { duration: 8000 });
                    if (navigator.vibrate) navigator.vibrate([500, 200, 500, 200, 1000]);
                    setPanicModalOpen(false);
                  } catch (err: any) {
                    toast.error(err.message);
                  } finally {
                    setPanicSending(false);
                  }
                }}
                className="py-3.5 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs uppercase tracking-widest transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 active:scale-95"
              >
                {panicSending ? <Loader2 size={16} className="animate-spin" /> : 'KIRIM SOS NOW'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
