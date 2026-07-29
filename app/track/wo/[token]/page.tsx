'use client';

import React, { useState, useEffect, use } from 'react';
import { supabase } from '@/lib/supabase/client';
import { Truck, MapPin, Phone, MessageSquare, ChevronRight, User, CheckCircle2, Clock, RefreshCw, Navigation, AlertCircle, Activity, Package, Map, ArrowLeft, Image as ImageIcon } from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { useLanguage } from '@/lib/i18n/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';

const formatWA = (phone: string | null | undefined) => {
  if (!phone) return '';
  return phone.replace(/^0/, '62').replace(/^\+/, '').replace(/[^0-9]/g, '');
};

const formatTimestamp = (dateStr: string | null | undefined, onlyTime: boolean = false) => {
  if (!dateStr) return '--:--';
  try {
    const d = new Date(dateStr);
    if (onlyTime) {
      return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) + ', ' + d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
};

const formatDuration = (start: string | null | undefined, end: string | null | undefined = null) => {
  if (!start) return null;
  const startTime = new Date(start).getTime();
  const endTime = end ? new Date(end).getTime() : new Date().getTime();
  const diffMs = endTime - startTime;
  if (diffMs < 0) return null;
  
  const diffMins = Math.floor(diffMs / 60000);
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  
  if (hours > 0) {
    return `${hours} jam ${mins} mnt`;
  }
  return `${mins} mnt`;
};

export default function WOTrackingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedJoId, setSelectedJoId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'completed' | 'pending'>('all');
  const { t } = useLanguage();

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

  useEffect(() => {
    if (!token) return;
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [token]);

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
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-900 font-sans p-6 text-center">
      <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-4" />
      <p className="text-sm text-slate-600 font-medium">Memuat data pengiriman...</p>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <AlertCircle className="w-12 h-12 text-rose-500 mb-4" />
      <h1 className="text-lg font-bold text-slate-900 mb-2">Pelacakan Tidak Ditemukan</h1>
      <p className="text-sm text-slate-500 mb-6 max-w-xs leading-relaxed">{error || 'Tautan ini sudah tidak valid.'}</p>
      <button onClick={() => window.location.reload()} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold">
        Muat Ulang
      </button>
    </div>
  );

  const { wo, jobOrders = [] } = data ?? {};

  const getJoInfo = (jo: any) => {
      const isDone = ['COMPLETED', 'PEKERJAAN SELESAI', 'DONE', 'RECEIVED'].includes(jo.status?.toUpperCase());
      const isActive = jo.started_at && !isDone;
      const isPending = !isActive && !isDone;

      let label = t.wo.statusLabels.waitingLoad;
      let statusColor = 'text-slate-500';
      let dotColor = 'bg-slate-300';
      
      if (isDone) {
        label = t.wo.statusLabels.completed;
        statusColor = 'text-emerald-600';
        dotColor = 'bg-emerald-500';
      } else if (jo.unloaded_at) {
        label = 'Proses Bongkar';
        statusColor = 'text-blue-600';
        dotColor = 'bg-blue-500';
      } else if (jo.loaded_at) {
        label = t.wo.statusLabels.enRoute;
        statusColor = 'text-blue-600';
        dotColor = 'bg-blue-500';
      } else if (jo.started_at) {
        label = 'Menuju Pickup';
        statusColor = 'text-amber-600';
        dotColor = 'bg-amber-500';
      }

     let lastPosition = 'Menunggu penugasan';
     let lastTimeStr = formatTimestamp(jo.updated_at || jo.created_at);
     let lastTimeOnlyStr = formatTimestamp(jo.updated_at || jo.created_at, true);

     if (jo.tracking_history && jo.tracking_history.length > 0) {
       const latestTrack = jo.tracking_history[0];
       lastPosition = latestTrack.location_name || latestTrack.notes || 'Update GPS Terkini';
       lastTimeStr = formatTimestamp(latestTrack.created_at);
       lastTimeOnlyStr = formatTimestamp(latestTrack.created_at, true);
     } else if (isDone) {
       const destStop = jo.routes?.[jo.routes?.length - 1];
       lastPosition = `Tiba di ${destStop?.location_name || 'tujuan akhir'}`;
       lastTimeStr = formatTimestamp(jo.completed_at || jo.unloaded_at || jo.updated_at);
       lastTimeOnlyStr = formatTimestamp(jo.completed_at || jo.unloaded_at || jo.updated_at, true);
     } else if (jo.loaded_at) {
       const destStop = jo.routes?.[jo.routes?.length - 1];
       lastPosition = `Menuju ${destStop?.location_name || 'tujuan'}`;
       lastTimeStr = formatTimestamp(jo.loaded_at);
       lastTimeOnlyStr = formatTimestamp(jo.loaded_at, true);
     } else if (jo.started_at) {
       const originStop = jo.routes?.[0];
       lastPosition = `Menuju ${originStop?.location_name || 'lokasi muat'}`;
       lastTimeStr = formatTimestamp(jo.started_at);
       lastTimeOnlyStr = formatTimestamp(jo.started_at, true);
     }

return { label, statusColor, dotColor, lastPosition, lastTimeStr, lastTimeOnlyStr, isDone, isActive, isPending };
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

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans pb-12 sm:bg-slate-50">
      <div className="max-w-md mx-auto bg-white min-h-screen sm:border-x sm:border-slate-200 sm:shadow-xl relative flex flex-col">
        
        {/* HEADER */}
        <header className="sticky top-0 z-40 bg-white border-b border-slate-100">
          <div className="px-5 py-4">
            
            {selectedJo ? (
              <div className="flex items-center justify-between">
                <button 
                  onClick={() => setSelectedJoId(null)}
                  className="p-1.5 -ml-1.5 text-slate-600 hover:text-slate-900 rounded-full hover:bg-slate-50 transition-colors flex items-center"
                >
                  <ArrowLeft size={20} strokeWidth={2.5} />
                </button>
                <div className="text-sm font-bold text-slate-900 text-center flex-1 pr-6">Detail Pelacakan</div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                     <div className="w-6 h-6 rounded bg-slate-900 flex items-center justify-center">
                        <Map size={12} strokeWidth={3} className="text-white" />
                     </div>
                     <span className="text-xs font-bold text-slate-900">Sentralogis</span>
                  </div>
                  <LanguageSelector />
                </div>

                <div className="mb-2">
                  <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{wo.wo_number}</h1>
                  <p className="text-sm text-slate-500 mt-0.5">{wo.customer?.name || 'Private Client'}</p>
                </div>
                
                <div className="mt-4 flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100">
                   <div>
                     <p className="text-xs text-slate-500 mb-0.5">Total Pengiriman</p>
                     <p className="text-sm font-semibold text-slate-900">{jobOrders.length} Unit Armada</p>
                   </div>
                   <div className="text-right">
                     <p className="text-xs text-slate-500 mb-0.5">Selesai</p>
                     <p className="text-sm font-semibold text-emerald-600">{completedCount} Unit</p>
                   </div>
                </div>
              </div>
            )}
            
            {/* Filters */}
            {!selectedJo && (
              <div className="mt-4 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                 <style dangerouslySetInnerHTML={{__html:`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}} />
                 {[
                   { id: 'all', label: 'Semua', count: jobOrders.length },
                   { id: 'active', label: 'Aktif', count: activeCount },
                   { id: 'pending', label: 'Menunggu', count: pendingCount },
                   { id: 'completed', label: 'Selesai', count: completedCount },
                 ].map(tab => (
                   <button
                     key={tab.id}
                     onClick={() => setFilterTab(tab.id as any)}
                     className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all border ${
                       filterTab === tab.id 
                         ? 'bg-slate-900 text-white border-slate-900' 
                         : 'bg-white text-slate-600 border-slate-200'
                     }`}
                   >
                     {tab.label} <span className="opacity-70">({tab.count})</span>
                   </button>
                 ))}
              </div>
            )}
          </div>
        </header>

        {/* MAIN CONTENT */}
        <main className="flex-1">
          {!selectedJo ? (
            <div className="divide-y divide-slate-100">
              {filteredJOs.map((jo: any, idx: number) => {
                const info = getJoInfo(jo);
                const containerNum = jo.wo_item?.item_data?.container_number || jo.wo_item?.item_data?.container_no || null;
                
                return (
                  <button
                    key={jo.id}
                    onClick={() => setSelectedJoId(jo.id)}
                    className="w-full text-left p-4 sm:px-5 hover:bg-slate-50 transition-colors flex items-start gap-3"
                  >
                    <div className="mt-0.5 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 text-slate-600">
                      {info.isDone ? <CheckCircle2 size={16} strokeWidth={2.5} className="text-emerald-500" /> : <Truck size={16} strokeWidth={2} />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="text-sm font-bold text-slate-900 truncate">{jo.fleet?.plate_number || `Unit #${idx + 1}`}</span>
                        <ChevronRight size={16} className="text-slate-400 shrink-0" />
                      </div>
                      
                      <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-500">
                        <span>{jo.jo_number}</span>
                        {containerNum && (
                           <>
                             <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                             <span className="text-slate-600 font-semibold">{containerNum}</span>
                           </>
                        )}
                      </div>

                      <div className="flex items-start gap-1.5">
                        <div className={`mt-1 w-1.5 h-1.5 rounded-full shrink-0 ${info.dotColor}`}></div>
                        <div>
                          <p className={`text-xs font-semibold ${info.statusColor}`}>{info.label}</p>
                          <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{info.lastPosition}</p>
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
              
              {filteredJOs.length === 0 && (
                <div className="py-20 text-center px-4">
                  <Package className="w-10 h-10 text-slate-300 mx-auto mb-3" strokeWidth={1.5} />
                  <p className="text-sm text-slate-500 font-medium">Belum ada armada pada kategori ini.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              
              {/* STATUS OVERVIEW */}
              <div className="px-5 py-6 border-b border-slate-100 bg-slate-50/50">
                 <div className="flex justify-between items-start mb-4">
                   <div>
                     <h2 className="text-xl font-bold text-slate-900 mb-1">{selectedJo.fleet?.plate_number || '-'}</h2>
                     <p className="text-xs text-slate-500">{selectedJo.jo_number}</p>
                   </div>
                   <div className={`px-2.5 py-1 rounded-md text-[11px] font-bold border bg-white ${getJoInfo(selectedJo).isDone ? 'text-emerald-600 border-emerald-200' : getJoInfo(selectedJo).isActive ? 'text-blue-600 border-blue-200' : 'text-slate-500 border-slate-200'}`}>
                     {getJoInfo(selectedJo).label}
                   </div>
                 </div>
                 
                 {/* DRIVER ROW */}
                 <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                   <div className="flex items-center gap-3 min-w-0">
                     <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 shrink-0">
                       <User size={18} strokeWidth={2} />
                     </div>
                     <div className="min-w-0">
                       <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Pengemudi</p>
                       <p className="text-sm font-semibold text-slate-900 truncate">{selectedJo.driver?.name || 'Belum ditugaskan'}</p>
                     </div>
                   </div>
                   {selectedJo.driver?.phone && (
                     <a href={`https://wa.me/${formatWA(selectedJo.driver.phone)}`} target="_blank" rel="noopener noreferrer" className="w-10 h-10 flex items-center justify-center bg-green-50 text-green-600 rounded-full transition-colors border border-green-100 hover:bg-green-100 shrink-0">
                       <MessageSquare size={18} strokeWidth={2} />
                     </a>
                   )}
                 </div>
              </div>

              {/* TIMELINE */}
              <div className="p-5">
                <h3 className="text-sm font-bold text-slate-900 mb-6 flex items-center gap-2">
                  <MapPin size={16} className="text-slate-400" /> Riwayat Perjalanan
                </h3>
                
                {selectedJo.routes && selectedJo.routes.length > 0 ? (
                  <div className="relative">
                    {/* Vertical line connecting dots */}
                    <div className="absolute left-[39px] sm:left-[51px] top-2 bottom-6 w-[1.5px] bg-slate-200" />
                    
                    <div className="space-y-6">
                      {selectedJo.routes.map((route: any, idx: number) => {
                        const isDone = ['completed', 'arrived', 'departed'].includes(route.status?.toLowerCase());
                        
                        // Calculate En-Route time (from previous departure to current arrival)
                        let enRouteStr = null;
                        let isCurrentlyEnRoute = false;
                        if (idx > 0) {
                          const prevRoute = selectedJo.routes[idx - 1];
                          if (prevRoute.actual_departure) {
                            if (route.actual_arrival) {
                              enRouteStr = `Perjalanan: ${formatDuration(prevRoute.actual_departure, route.actual_arrival)}`;
                            } else {
                              enRouteStr = `Sedang di perjalanan: ${formatDuration(prevRoute.actual_departure, null)}`;
                              isCurrentlyEnRoute = true;
                            }
                          }
                        }

                        // Calculate Dwell time (from arrival to departure)
                        let dwellStr = null;
                        let isCurrentlyDwelling = false;
                        if (route.actual_arrival) {
                          if (route.actual_departure) {
                            dwellStr = `Waktu di lokasi: ${formatDuration(route.actual_arrival, route.actual_departure)}`;
                          } else {
                            dwellStr = `Waktu berjalan: ${formatDuration(route.actual_arrival, null)} (Saat ini)`;
                            isCurrentlyDwelling = true;
                          }
                        }
                        
                        return (
                          <div key={route.id} className="relative flex flex-col gap-1">
                            {/* EN ROUTE TIME (shown above the node if applicable) */}
                            {enRouteStr && (
                               <div className="flex items-center gap-4 sm:gap-5 ml-2.5 sm:ml-4 -mt-3 mb-2">
                                 <div className="w-10 sm:w-12 shrink-0"></div>
                                 <div className="flex items-center gap-2 text-[11px] font-medium text-slate-400 bg-slate-50 px-2.5 py-0.5 rounded-full border border-slate-100 relative z-10">
                                    <Clock size={12} className={isCurrentlyEnRoute ? "text-blue-500 animate-pulse" : ""} />
                                    {enRouteStr}
                                 </div>
                               </div>
                            )}

                            <div className="relative flex items-start gap-4 sm:gap-5">
                              {/* Time (Left side) */}
                              <div className="w-10 sm:w-12 pt-0.5 text-right shrink-0">
                                 <p className="text-xs font-medium text-slate-500">
                                   {route.actual_arrival ? formatTimestamp(route.actual_arrival, true) : (route.updated_at && isDone ? formatTimestamp(route.updated_at, true) : '--:--')}
                                 </p>
                              </div>

                              {/* Dot */}
                              <div className="relative shrink-0 mt-1 z-10 bg-white py-0.5">
                                 <div className={`w-3 h-3 rounded-full border-2 ${isDone ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'}`}>
                                    {isCurrentlyDwelling && <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-50"></div>}
                                 </div>
                              </div>
                              
                              {/* Details (Right side) */}
                              <div className="flex-1 pb-4 min-w-0">
                                 <p className={`text-sm font-bold ${isDone ? 'text-slate-900' : 'text-slate-500'}`}>{route.location_name}</p>
                                 <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{route.address}</p>
                                 
                                 {/* DWELL TIME */}
                                 {dwellStr && (
                                   <p className={`text-xs mt-1.5 flex items-center gap-1.5 font-medium ${isCurrentlyDwelling ? 'text-blue-600' : 'text-emerald-600'}`}>
                                      <Activity size={12} className={isCurrentlyDwelling ? "animate-pulse" : ""} />
                                      {dwellStr}
                                   </p>
                                 )}

                                 {route.pod_photo_url && (
                                    <div className="mt-3">
                                      <a href={route.pod_photo_url} target="_blank" rel="noopener noreferrer" className="block w-24 h-24 rounded-lg overflow-hidden border border-slate-200 relative group bg-slate-50">
                                        <img src={route.pod_photo_url} alt={`POD ${route.location_name}`} className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                           <ImageIcon size={20} className="text-white" />
                                        </div>
                                      </a>
                                    </div>
                                 )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 text-center py-6">Belum ada rute tersedia.</p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
