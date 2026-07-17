'use client';

import React, { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Truck, MapPin, Phone, MessageSquare, ChevronRight, User, CheckCircle2, Clock, RefreshCw, Navigation, AlertCircle } from 'lucide-react';
import dynamic from 'next/dynamic';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';
import { calculateBearingFromHistory, getVehicleTopDownMarkerIcon } from '@/components/sbu/VehicleMarkerUtils';

const MultiFleetRadarMap = dynamic(() => import('@/components/sbu/MultiFleetRadarMap'), { ssr: false });

const MissionMap = dynamic(() => import('@/components/sbu/MissionMap'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full rounded-2xl bg-slate-900/50 flex flex-col items-center justify-center border border-slate-800 p-8">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
      <p className="text-slate-400 text-xs font-semibold tracking-wider uppercase">Memuat Peta...</p>
    </div>
  )
});

const formatWA = (phone: string | null | undefined) => {
  if (!phone) return '';
  return phone.replace(/^0/, '62').replace(/^\+/, '').replace(/[^0-9]/g, '');
};

const formatTimestamp = (dateStr: string | null | undefined) => {
  if (!dateStr) return 'Belum ada update';
  try {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) + ' WIB';
  } catch {
    return 'Baru saja';
  }
};

export default function WOTrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJoId, setSelectedJoId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'completed' | 'pending'>('all');
  const { t } = useLanguage();

  // Fetch data function
  const fetchData = async () => {
    try {
      const response = await fetch(`/api/track/wo/${token}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Gagal mengambil data pelacakan');
      const woData = result.data;
      if (!woData) throw new Error('Data tidak ditemukan');
      setData(woData);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching WO tracking data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Polling effect
  useEffect(() => {
    if (!token) return;
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [token]);

  // Real‑time subscription effect
  useEffect(() => {
    if (!data?.wo?.id) return;
    const channel = supabase.channel('public:job_orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'job_orders', filter: `wo_item_id=eq.${data.wo.id}` }, () => {
        fetchData();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [data?.wo?.id]);

  if (loading) return (
    <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center text-white font-sans p-6 text-center">
      <div className="w-16 h-16 bg-blue-500/10 rounded-3xl flex items-center justify-center border border-blue-500/20 mb-6">
        <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      </div>
      <h2 className="text-lg font-black tracking-widest uppercase mb-1">Sentralogis Live Radar</h2>
      <p className="text-xs text-slate-400 max-w-xs">Menyiapkan konsolidasi pelacakan real-time armada pengiriman Anda...</p>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-6 text-center font-sans text-white">
      <div className="max-w-md w-full bg-[#131d33] border border-slate-800 rounded-3xl p-8">
        <div className="w-16 h-16 bg-rose-500/10 text-rose-500 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-rose-500/20">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-white mb-2">Tautan Tidak Aktif / Kedaluwarsa</h1>
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">{error || 'Link pelacakan tidak valid atau pengiriman belum diinisiasi.'}</p>
        <button onClick={() => window.location.reload()} className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-widest transition-all">
          Coba Muat Ulang
        </button>
      </div>
    </div>
  );

  const { wo, jobOrders = [] } = data ?? {};

  const getJoInfo = (jo: any) => {
      const isDone = ['COMPLETED', 'PEKERJAAN SELESAI', 'DONE', 'RECEIVED'].includes(jo.status?.toUpperCase());
      const isActive = jo.started_at && !isDone;
      const isPending = !isActive && !isDone;

      let label = t.wo.statusLabels.waitingLoad;
      let statusColor = 'text-slate-400';
      let bgColor = 'bg-slate-800/50';
      let borderColor = 'border-slate-700/50';
      let dotColor = 'bg-slate-500';
      let stepIndex = 1;

      if (isDone) {
        label = t.wo.statusLabels.completed;
        statusColor = 'text-emerald-400';
        bgColor = 'bg-emerald-500/10';
        bgColor = 'bg-emerald-500/10';
        borderColor = 'border-emerald-500/30';
        dotColor = 'bg-emerald-500';
        stepIndex = 3;
      } else if (jo.unloaded_at) {
        label = 'Proses Bongkar';
        statusColor = 'text-blue-400';
        bgColor = 'bg-blue-500/10';
        borderColor = 'border-blue-500/30';
        dotColor = 'bg-blue-500';
        stepIndex = 3;
      } else if (jo.loaded_at) {
        label = t.wo.statusLabels.enRoute;
        statusColor = 'text-blue-300';
        bgColor = 'bg-blue-500/15';
        borderColor = 'border-blue-500/40';
        dotColor = 'bg-blue-400';
        stepIndex = 2;
      } else if (jo.started_at) {
        label = 'Menuju Pickup';
        statusColor = 'text-amber-400';
        bgColor = 'bg-amber-500/10';
        borderColor = 'border-amber-500/30';
        dotColor = 'bg-amber-400';
        stepIndex = 1;
      }

     let lastPosition = 'Menunggu penugasan armada.';
     let lastTimeStr = formatTimestamp(jo.updated_at || jo.created_at);

     if (jo.tracking_history && jo.tracking_history.length > 0) {
       const latestTrack = jo.tracking_history[0];
       lastPosition = latestTrack.location_name || latestTrack.notes || 'Posisi GPS terkini dilaporkan sopir.';
       lastTimeStr = formatTimestamp(latestTrack.created_at);
     } else if (isDone) {
       const destStop = jo.routes?.[jo.routes?.length - 1];
       lastPosition = `Tiba di ${destStop?.location_name || 'tujuan akhir'}. BAST telah disahkan.`;
       lastTimeStr = formatTimestamp(jo.completed_at || jo.unloaded_at || jo.updated_at);
     } else if (jo.loaded_at) {
       const originStop = jo.routes?.[0];
       const destStop = jo.routes?.[jo.routes?.length - 1];
       lastPosition = `Selesai muat di ${originStop?.location_name || 'gudang'} ➔ Menuju ${destStop?.location_name || 'tujuan'}.`;
       lastTimeStr = formatTimestamp(jo.loaded_at);
     } else if (jo.started_at) {
       const originStop = jo.routes?.[0];
       lastPosition = `Berangkat menuju ${originStop?.location_name || 'lokasi muat'}.`;
       lastTimeStr = formatTimestamp(jo.started_at);
     }

return { label, statusColor, bgColor, borderColor, dotColor, stepIndex, lastPosition, lastTimeStr, isDone, isActive, isPending };
   };

  const sortedJOs = [...jobOrders].sort((a, b) => {
    const infoA = getJoInfo(a);
    const infoB = getJoInfo(b);
    if (infoA.isActive && !infoB.isActive) return -1;
    if (!infoA.isActive && infoB.isActive) return 1;
    if (infoA.isDone && !infoB.isDone) return 1;
    if (!infoA.isDone && infoB.isDone) return -1;
    return 0;
  });

  const filteredJOs = sortedJOs.filter(jo => {
    const info = getJoInfo(jo);
    if (filterTab === 'active') return info.isActive;
    if (filterTab === 'completed') return info.isDone;
    if (filterTab === 'pending') return info.isPending;
    return true;
  });

  const selectedJo = jobOrders.find((j: any) => j.id === selectedJoId);
  const activeCount = jobOrders.filter((j: any) => getJoInfo(j).isActive).length;
  const completedCount = jobOrders.filter((j: any) => getJoInfo(j).isDone).length;
  const pendingCount = jobOrders.filter((j: any) => getJoInfo(j).isPending).length;
  const isAllCompleted = jobOrders.length > 0 && completedCount === jobOrders.length;
  const progressPercent = jobOrders.length > 0 ? Math.round((completedCount / jobOrders.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-100 font-sans pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#0a0f1e]/95 backdrop-blur-md border-b border-slate-800/60">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4">
          {/* Back button when detail open */}
          {selectedJo && (
            <button 
              onClick={() => setSelectedJoId(null)}
              className="flex items-center gap-2 text-xs font-bold text-blue-400 hover:text-blue-300 mb-3 px-3 py-1.5 bg-[#131d33] rounded-lg border border-slate-800 transition-all w-fit"
            >
              <ChevronRight size={14} className="rotate-180" /> Kembali ke Daftar
            </button>
          )}

{/* WO Title */}
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-blue-400 mb-1">{t.wo.workOrder}</p>
                  <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">{wo.wo_number}</h1>
                </div>
                <div className="flex items-center gap-2">
                  <RefreshCw size={12} className="text-emerald-400 animate-spin" />
                  <span className="text-[10px] font-medium text-slate-400">{t.wo.live}</span>
                </div>
              </div>

           {/* Language Selector */}
           <div className="flex items-center gap-4 mb-4">
             <LanguageSelector align="left" />
           </div>

{/* Customer Info */}
           <div className="flex items-center gap-3 mb-4 p-3.5 bg-[#131d33]/60 rounded-2xl border border-slate-800/60">
             <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
               <User size={18} />
             </div>
             <div className="min-w-0 flex-1">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t.wo.customer}</p>
               <p className="text-sm font-black text-white truncate">{wo.customer?.name || 'Private Client'}</p>
             </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Jadwal</p>
              <p className="text-xs font-bold text-slate-200">
                {wo.execution_date ? new Date(wo.execution_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) : '-'}
              </p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">Progress Pengiriman</span>
              <span className="text-xs font-black text-white">{completedCount}/{jobOrders.length} Selesai</span>
            </div>
            <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-[10px] font-bold text-slate-400">{activeCount} Aktif</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span className="text-[10px] font-bold text-slate-400">{completedCount} Selesai</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                  <span className="text-[10px] font-bold text-slate-400">{pendingCount} Menunggu</span>
                </div>
              </div>
              <span className="text-[10px] font-black text-white">{progressPercent}%</span>
            </div>
          </div>

          {/* All Completed Banner */}
          {isAllCompleted && (
            <div className="mb-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-black text-emerald-300 uppercase tracking-wider">Seluruh Pekerjaan Selesai</p>
                <p className="text-xs text-emerald-400/80 font-medium mt-0.5">Semua armada ({jobOrders.length} unit) telah mencapai tujuan akhir.</p>
              </div>
            </div>
          )}

{/* Filter Tabs */}
           {!selectedJo && (
             <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
               <button
                 onClick={() => setFilterTab('all')}
                 className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${filterTab === 'all' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[#131d33] border-slate-800 text-slate-400 hover:text-white'}`}
               >
                 {t.wo.filterTab.all} ({jobOrders.length})
               </button>
               <button
                 onClick={() => setFilterTab('active')}
                 className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${filterTab === 'active' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-[#131d33] border-slate-800 text-slate-400 hover:text-white'}`}
               >
                 {t.wo.filterTab.active} ({activeCount})
               </button>
               <button
                 onClick={() => setFilterTab('completed')}
                 className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${filterTab === 'completed' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-[#131d33] border-slate-800 text-slate-400 hover:text-white'}`}
               >
                 {t.wo.filterTab.completed} ({completedCount})
               </button>
               <button
                 onClick={() => setFilterTab('pending')}
                 className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${filterTab === 'pending' ? 'bg-amber-600 border-amber-500 text-white' : 'bg-[#131d33] border-slate-800 text-slate-400 hover:text-white'}`}
               >
                 {t.wo.filterTab.pending} ({pendingCount})
               </button>
             </div>
           )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        {!selectedJo ? (
          <>
            {/* Map Section - Collapsed by default for simplicity */}
            {filterTab === 'active' && filteredJOs.length > 0 && (
              <div className="mb-6 rounded-3xl border border-slate-800 bg-[#131d33] overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex items-center gap-2">
                  <Navigation size={14} className="text-blue-400" />
                  <span className="text-xs font-black text-white uppercase tracking-wider">Live Radar</span>
                  <span className="text-[10px] text-slate-400 ml-auto">{filteredJOs.length} armada aktif</span>
                </div>
                <div className="h-[320px]">
                  <MultiFleetRadarMap 
                    jobOrders={filteredJOs} 
                    onSelectJo={(jo) => setSelectedJoId(jo.id)} 
                    selectedJoId={selectedJoId}
                  />
                </div>
              </div>
            )}

            {/* JO Cards List */}
            <div className="space-y-3">
              {filteredJOs.map((jo: any, idx: number) => {
                const info = getJoInfo(jo);
                const containerNum = jo.wo_item?.item_data?.container_number || jo.wo_item?.item_data?.container_no || null;
                
                return (
                  <button
                    key={jo.id}
                    onClick={() => setSelectedJoId(jo.id)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all duration-200 ${info.isActive ? 'bg-blue-500/5 border-blue-500/30' : info.isDone ? 'bg-emerald-500/5 border-emerald-500/30' : 'bg-[#131d33] border-slate-800'}`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Status Icon */}
                      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border ${info.isActive ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : info.isDone ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                        {info.isDone ? <CheckCircle2 size={20} /> : <Truck size={20} />}
                      </div>

                      {/* Main Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-black text-white">{jo.fleet?.plate_number || `Unit #${idx + 1}`}</span>
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${info.bgColor} ${info.borderColor} ${info.statusColor}`}>
                            {info.label}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 font-medium mb-1">
                          {jo.jo_number} • {jo.fleet?.type_name || 'Truck'}
                          {containerNum && <span className="text-amber-400 ml-1">📦 {containerNum}</span>}
                        </p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                          <Navigation size={10} />
                          <span className="truncate">{info.lastPosition}</span>
                          <span className="shrink-0">• {info.lastTimeStr}</span>
                        </div>
                      </div>

                      {/* Arrow */}
                      <ChevronRight size={16} className="text-slate-600 shrink-0" />
                    </div>
                  </button>
                );
              })}
            </div>

            {filteredJOs.length === 0 && (
              <div className="py-16 text-center">
                <Truck className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h3 className="text-base font-bold text-white mb-1">Tidak Ada Armada</h3>
                <p className="text-xs text-slate-400">Tidak ada armada yang sesuai dengan filter.</p>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Single JO Detail View */}
            <div className="space-y-4">
              {/* JO Header */}
              <div className="p-5 rounded-3xl border border-slate-800 bg-[#131d33]">
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${getJoInfo(selectedJo).isActive ? 'bg-blue-500/10 border-blue-500/30 text-blue-400' : getJoInfo(selectedJo).isDone ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                    <Truck size={28} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h2 className="text-xl font-black text-white">{selectedJo.fleet?.plate_number || '-'}</h2>
                      <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full border ${getJoInfo(selectedJo).bgColor} ${getJoInfo(selectedJo).borderColor} ${getJoInfo(selectedJo).statusColor}`}>
                        {getJoInfo(selectedJo).label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 font-medium">
                      {selectedJo.jo_number} • {selectedJo.fleet?.type_name || 'Truck'}
                      {selectedJo.wo_item?.item_data?.container_number && <span className="text-amber-400 ml-2">📦 {selectedJo.wo_item.item_data.container_number}</span>}
                    </p>
                  </div>
                </div>

                {/* Driver Contact */}
                <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#0e1628] border border-slate-800">
                  <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300">
                    <User size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sopir</p>
                    <p className="text-sm font-bold text-white truncate">{selectedJo.driver?.name || 'Belum ditugaskan'}</p>
                  </div>
                  {selectedJo.driver?.phone && (
                    <div className="flex items-center gap-2 shrink-0">
                      <a href={`tel:${selectedJo.driver.phone}`} className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all" title="Call">
                        <Phone size={14} />
                      </a>
                      <a href={`https://wa.me/${formatWA(selectedJo.driver.phone)}`} target="_blank" rel="noopener noreferrer" className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl transition-all" title="WA">
                        <MessageSquare size={14} />
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Map */}
              <div className="h-80 sm:h-96 rounded-3xl border border-slate-800 overflow-hidden bg-[#0e1628]">
                <MissionMap 
                  stops={selectedJo.routes || []} 
                  tracking={selectedJo.tracking_history || []} 
                  fleetIcon={getVehicleTopDownMarkerIcon(
                    selectedJo.fleet_type_name || selectedJo.fleet?.fleet_type?.type_name || 'truck',
                    calculateBearingFromHistory(selectedJo.tracking_history || []),
                    '#3b82f6'
                  )}
                  focusedLocation={null}
                />
              </div>

              {/* Route Stops */}
              {selectedJo.routes && selectedJo.routes.length > 0 && (
                <div className="p-5 rounded-3xl border border-slate-800 bg-[#131d33]">
                  <h3 className="text-sm font-black text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                    <MapPin size={16} className="text-blue-400" />
                    Rute Pengiriman ({selectedJo.routes.length} Lokasi)
                  </h3>
                  <div className="space-y-3">
                    {selectedJo.routes.map((route: any, idx: number) => {
                      const isDone = ['completed', 'arrived', 'departed'].includes(route.status?.toLowerCase());
                      return (
                        <div key={route.id} className={`p-4 rounded-2xl border ${isDone ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-[#0e1628] border-slate-800'}`}>
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black shrink-0 ${isDone ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                              {isDone ? <CheckCircle2 size={16} /> : idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 mb-0.5">{route.stop_type}</p>
                              <p className="text-sm font-bold text-white">{route.location_name}</p>
                              <p className="text-[11px] text-slate-400 truncate">{route.address}</p>
                            </div>
                          </div>
                          {route.pod_photo_url && (
                            <div className="mt-3 pt-3 border-t border-slate-800/80">
                              <a href={route.pod_photo_url} target="_blank" rel="noopener noreferrer" className="relative w-full h-32 rounded-xl overflow-hidden border border-emerald-500/30 hover:scale-[1.02] transition-transform bg-slate-900">
                                <img src={route.pod_photo_url} alt={`POD ${route.location_name}`} className="w-full h-full object-cover" />
                              </a>
                              <p className="text-[10px] text-emerald-400 mt-1.5 font-medium">📸 Bukti POD - Klik foto untuk memperbesar</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
