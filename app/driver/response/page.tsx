// app/driver/response/page.tsx
'use client';

import { useEffect, useState, use } from 'react';
import { supabase } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
import { Truck, MapPin, Navigation, Phone, CheckCircle2, Clock, ChevronRight, AlertCircle, Loader2, Play, Check, X, Camera, Calendar, Activity } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

// Dynamic import untuk Leaflet (avoid SSR)
const MapComponent = dynamic(() => import('@/components/DriverRouteMap'), {
  ssr: false,
  loading: () => <div className="h-64 bg-gray-100 animate-pulse rounded-lg" />
});

export default function DriverResponsePage() {
  const [woData, setWoData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const woId = params.get('wo');

    if (!token || !woId) {
      setError('Link tidak valid');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      // Query mengambil data WO dengan token
      // Note: Using the provided relation names from user prompt
      const { data, error } = await supabase
        .from('job_orders')
        .select(`
          *,
          md_drivers (
            id,
            name,
            phone,
            bank_name,
            bank_account
          ),
          md_entities (
            id,
            name,
            phone
          ),
          wo_items (*),
          job_routes (*)
        `)
        .eq('id', woId)
        .eq('wa_token', token)
        .single();

      if (error || !data) {
        console.error('Fetch error:', error);
        setError('Work Order tidak ditemukan atau link sudah kadaluarsa');
      } else {
        setWoData(data);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  const handleResponse = async (decision: 'accepted' | 'rejected') => {
    if (decision === 'rejected') {
        const confirmReject = window.confirm('Apakah Anda yakin ingin MENOLAK tugas ini?');
        if (!confirmReject) return;
    }

    setSubmitting(true);
    
    const updateData = {
      driver_response: decision,
      driver_response_at: new Date().toISOString(),
      status: decision === 'accepted' ? 'accepted' : 'rejected'
    };

    const { error } = await supabase
      .from('job_orders')
      .update(updateData)
      .eq('id', woData.id);

    if (error) {
      toast.error('Gagal: ' + error.message);
    } else {
      const message = decision === 'accepted' 
        ? '✅ Work Order diterima! Anda akan mendapat notifikasi lanjutan.'
        : '❌ Work Order ditolak. Terima kasih.';
      
      toast.success(message);
      
      // Redirect to the tracking update page for the driver
      setTimeout(() => {
        window.location.href = `/jo/${woData.tracking_token}`;
      }, 2000);
    }
    setSubmitting(false);
  };

  const formatRupiah = (number: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(number);
  };

  if (loading) return <LoadingSkeleton />;
  if (error) return <ErrorDisplay error={error} />;
  if (!woData) return <ErrorDisplay error="Data tidak ditemukan" />;

  const driverSharePercent = woData.driver_share_percentage || woData.driver_revenue_share || 0;
  const driverShare = (woData.estimated_margin || 0) * (driverSharePercent / 100);

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 font-sans">
      <Toaster position="top-center" />
      <div className="max-w-xl mx-auto">
        {/* Header Gradient */}
        <div className="bg-slate-900 text-white rounded-t-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full -mr-16 -mt-16 blur-3xl" />
          <h1 className="text-sm font-black uppercase tracking-[0.3em] text-blue-400 mb-2">Pemberitahuan Tugas</h1>
          <h2 className="text-3xl font-black tracking-tighter">Work Order Assignment</h2>
          <p className="text-slate-400 mt-4 font-medium">Halo, <span className="text-white font-bold">{woData.md_drivers?.name || 'Driver'}</span></p>
        </div>

        <div className="bg-white rounded-b-3xl shadow-xl overflow-hidden border-x border-b border-slate-100">
          {/* Detail WO */}
          <div className="p-8 border-b border-slate-50">
            <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                    <Activity size={18} />
                </div>
                <h2 className="font-black text-slate-800 uppercase tracking-widest text-xs">Detail Pekerjaan</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Nomor JO</p>
                <p className="font-bold text-slate-900">{woData.jo_number || woData.order_number || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Status</p>
                <p className="inline-block px-3 py-1 bg-amber-50 text-amber-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-amber-100">
                  Awaiting Response
                </p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Muatan</p>
                <p className="font-bold text-slate-900">{woData.wo_items?.item_data?.description || woData.wo_items?.description || '-'}</p>
              </div>
              <div>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">Estimasi Berat</p>
                <p className="font-bold text-slate-900">{woData.wo_items?.item_data?.weight || woData.wo_items?.weight || 0} kg</p>
              </div>
            </div>
          </div>

          {/* Lokasi */}
          <div className="p-8 border-b border-slate-50 bg-slate-50/50">
            <div className="flex items-center gap-2 mb-6">
                <div className="w-8 h-8 bg-rose-50 rounded-lg flex items-center justify-center text-rose-600">
                    <MapPin size={18} />
                </div>
                <h2 className="font-black text-slate-800 uppercase tracking-widest text-xs">Rute Perjalanan</h2>
            </div>

            <div className="space-y-6 relative">
              <div className="absolute left-[15px] top-8 bottom-8 w-[2px] bg-slate-200 border-dashed border-l" />
              
              <div className="flex gap-4 relative z-10">
                <div className="w-8 h-8 bg-white border-2 border-emerald-500 rounded-full flex items-center justify-center text-emerald-600 text-[10px] font-black shadow-sm shrink-0">P</div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titik Muat (Pickup)</p>
                  <p className="font-bold text-slate-800 text-sm">{woData.pickup_address || '-'}</p>
                </div>
              </div>
              
              <div className="flex gap-4 relative z-10">
                <div className="w-8 h-8 bg-white border-2 border-rose-500 rounded-full flex items-center justify-center text-rose-600 text-[10px] font-black shadow-sm shrink-0">D</div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Titik Bongkar (Delivery)</p>
                  <p className="font-bold text-slate-800 text-sm">{woData.delivery_address || '-'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* PETA */}
          <div className="p-0 border-b border-slate-50">
            <div className="h-80 w-full relative">
              <MapComponent 
                pickup={woData.pickup_address}
                delivery={woData.delivery_address}
              />
            </div>
          </div>

          {/* BAGI HASIL */}
          <div className="p-8 border-b border-slate-50 bg-emerald-50/30">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                    <CheckCircle2 size={18} />
                </div>
                <h2 className="font-black text-slate-800 uppercase tracking-widest text-xs">Potensi Pendapatan</h2>
            </div>
            <p className="text-4xl font-black text-emerald-600 tracking-tighter">
              {formatRupiah(driverShare)}
            </p>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2 italic">
              * Estimasi {driverSharePercent}% dari margin operasional
            </p>
          </div>

          {/* TOMBOL TERIMA/TOLAK */}
          <div className="p-8 flex flex-col gap-3">
            <button
              onClick={() => handleResponse('accepted')}
              disabled={submitting}
              className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-black disabled:opacity-50 transition-all active:scale-95 shadow-xl shadow-slate-900/20 flex items-center justify-center gap-3"
            >
              {submitting ? <Loader2 className="animate-spin" /> : <><Check size={18} /> Terima Pekerjaan</>}
            </button>
            <button
              onClick={() => handleResponse('rejected')}
              disabled={submitting}
              className="w-full bg-white text-rose-600 border-2 border-rose-100 py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-rose-50 disabled:opacity-50 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              {submitting ? <Loader2 className="animate-spin" /> : <><X size={18} /> Tolak Pekerjaan</>}
            </button>
          </div>

          {/* Catatan */}
          <div className="bg-slate-50 p-6 text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
            <p className="mb-2">⚠️ Dengan menerima WO, Anda setuju untuk menyelesaikan pekerjaan sesuai SOP.</p>
            <p>💰 Dana akan ditransfer setelah status Job Order dinyatakan selesai.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 flex items-center justify-center">
      <div className="max-w-xl w-full">
        <div className="bg-slate-200 h-48 rounded-t-3xl animate-pulse" />
        <div className="bg-white p-8 space-y-6 rounded-b-3xl">
          <div className="h-4 bg-slate-100 rounded w-1/4 animate-pulse" />
          <div className="space-y-2">
            <div className="h-8 bg-slate-100 rounded w-full animate-pulse" />
            <div className="h-8 bg-slate-100 rounded w-3/4 animate-pulse" />
          </div>
          <div className="h-64 bg-slate-50 rounded-2xl animate-pulse" />
          <div className="h-20 bg-emerald-50/50 rounded-2xl animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// Error Display
function ErrorDisplay({ error }: { error: string }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-12 max-w-md text-center border border-slate-100">
        <div className="w-24 h-24 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-8">
          <AlertCircle size={48} className="text-rose-500" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-4 uppercase tracking-tighter">LINK TIDAK VALID</h2>
        <p className="text-slate-500 font-medium mb-10 leading-relaxed uppercase text-[10px] tracking-widest">{error}</p>
        <button 
          onClick={() => window.location.href = '/'}
          className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-slate-900/20 active:scale-95 transition-all"
        >
          KEMBALI KE BERANDA
        </button>
      </div>
    </div>
  );
}
