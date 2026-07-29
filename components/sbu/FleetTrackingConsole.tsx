'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2, Truck, Clock, AlertTriangle, CheckCircle2, Activity, Maximize, Minimize, X, Target } from 'lucide-react';
import { format, differenceInMinutes } from 'date-fns';
import { getAdvancedJobCategory, JO_DONE_STATUSES, JO_REJECTED_STATUSES } from '@/lib/domain/jo/status';

// Geofence status: 'moving' | 'idle' per JO id
export type GeofenceMovementStatus = 'moving' | 'idle' | 'sos';

// Simple geofence: round lat/lng to ~100m grid cell
function getGeofenceKey(lat: number, lng: number): string {
  // ~111m precision per 0.001 degree
  return `${Math.round(lat * 1000) / 1000},${Math.round(lng * 1000) / 1000}`;
}

const UnifiedMissionRadarMap = dynamic(() => import('./UnifiedMissionRadarMap'), {
   ssr: false,
   loading: () => (
      <div className="h-full w-full bg-slate-950 flex flex-col items-center justify-center border border-slate-800 p-6">
         <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
         <p className="text-slate-300 text-xs font-black uppercase tracking-wider">Memuat Radar Videowall...</p>
      </div>
   )
});

const IntelligenceTower = dynamic(() => import('./IntelligenceTower'), {
   ssr: false,
   loading: () => (
      <div className="h-full w-full bg-slate-950 flex flex-col items-center justify-center border border-slate-800 p-6">
         <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
         <p className="text-slate-300 text-xs font-black uppercase tracking-wider">Memuat Intelijen Tower...</p>
      </div>
   )
});

// Using JO status domain logic for consistency across app

export default function FleetTrackingConsole() {
   const { profile } = useAuth();
   const router = useRouter();
   const searchParams = useSearchParams();
   const joParam = searchParams.get('jo');

   const [jobOrders, setJobOrders] = useState<any[]>([]);
   const [loading, setLoading] = useState(true);
   const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
   const [isFullscreen, setIsFullscreen] = useState(false);
   const [viewMode, setViewMode] = useState<'radar' | 'tower'>('radar');
   const consoleRef = useRef<HTMLDivElement>(null);

   // Geofence movement tracking
   // Map<joId, { lastGeofence: string, unchangedCount: number, status: GeofenceMovementStatus }>
   const geofenceTrackerRef = useRef<Map<string, { lastGeofence: string; unchangedCount: number; status: GeofenceMovementStatus }>>(new Map());
   const [geofenceStatusMap, setGeofenceStatusMap] = useState<Record<string, GeofenceMovementStatus>>({});

   const toggleFullscreen = () => {
      if (!document.fullscreenElement) {
         consoleRef.current?.requestFullscreen().catch(err => {
            console.error(`Error attempting to enable fullscreen: ${err.message}`);
         });
      } else {
         document.exitFullscreen();
      }
   };

   useEffect(() => {
      const handleFullscreenChange = () => {
         setIsFullscreen(!!document.fullscreenElement);
      };
      
      const handleKeyDown = (e: KeyboardEvent) => {
         if (e.key === 'Escape' && joParam) {
            router.push('/sbu/trucking/tracking');
         }
      };

      document.addEventListener('fullscreenchange', handleFullscreenChange);
      window.addEventListener('keydown', handleKeyDown);
      
      return () => {
         document.removeEventListener('fullscreenchange', handleFullscreenChange);
         window.removeEventListener('keydown', handleKeyDown);
      };
   }, [joParam, router]);

   const fetchActiveJobs = useCallback(async () => {
      let tenantId = profile?.tenant_id;
      const isGlobalRole = profile?.role === 'owner_sentralogis' || profile?.role?.startsWith('hq_');

      if (!tenantId && isGlobalRole) {
         try {
            const { data: tenantData } = await supabase.from('tenants').select('id').limit(1);
            if (tenantData && tenantData.length > 0) {
               tenantId = tenantData[0].id;
            }
         } catch (e) {
            console.error('Failed to resolve fallback tenant ID for FleetTrackingConsole:', e);
         }
      }

      if (!tenantId) {
         setLoading(false);
         return;
      }

      try {
         const { data: baseData, error: baseError } = await supabase
            .from('job_orders')
            .select(`
               *,
               tracking_token,
               wo_item:wo_items!wo_item_id (
                  id, item_data,
                  wo:work_orders!wo_id (
                     id, wo_number, customer:md_entities!customer_id (id, name, phone)
                  )
               )
            `)
            .eq('tenant_id', tenantId)
            .order('created_at', { ascending: false });

         if (baseError) throw baseError;

         const allJosWithAssets = (baseData || []).filter(jo => jo.driver_id || jo.fleet_id || jo.transporter_id || jo.vendor_id);
         let enrichedAll: any[] = [];
         let aggregatedLogs: any[] = [];

         if (allJosWithAssets.length > 0) {
            const joIds = allJosWithAssets.map(j => j.id);
            const driverIds = [...new Set(allJosWithAssets.map(j => j.driver_id).filter(Boolean))];
            const fleetIds = [...new Set(allJosWithAssets.map(j => j.fleet_id).filter(Boolean))];

            const [driversRes, fleetsRes, routesRes, trackingRes, entitiesRes] = await Promise.all([
               driverIds.length > 0 ? supabase.from('md_drivers').select('id, name, phone').in('id', driverIds) : { data: [] },
               fleetIds.length > 0 ? supabase.from('md_fleets').select('id, plate_number, fleet_type:md_fleet_types(id, type_name, icon_url)').in('id', fleetIds) : { data: [] },
               supabase.from('job_routes').select('*').in('job_order_id', joIds),
               supabase.from('job_tracking').select('*').in('job_order_id', joIds).order('created_at', { ascending: false }),
               supabase.from('md_entities').select('id, name, phone').in('id', [...new Set(allJosWithAssets.map(j => j.transporter_id || j.vendor_id).filter(Boolean))])
            ]);

            enrichedAll = (baseData || []).map(jo => {
               if (!jo.driver_id && !jo.fleet_id && !jo.transporter_id && !jo.vendor_id) return null;
               
               const driver = driversRes.data?.find(d => d.id === jo.driver_id);
               const fleet = fleetsRes.data?.find(f => f.id === jo.fleet_id);
               const transporter = entitiesRes.data?.find(e => e.id === jo.transporter_id || e.id === jo.vendor_id);
               
               const routes = (routesRes.data || []).filter(r => r.job_order_id === jo.id).sort((a, b) => a.sequence - b.sequence);
               const tracking = (trackingRes.data || []).filter(t => t.job_order_id === jo.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
               
               // aggregatedLogs removed as we now use jobOrders sorted by latest ping

               let iconUrl = fleet?.fleet_type?.icon_url || null;
               if (iconUrl && !iconUrl.startsWith('http')) {
                  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nsvkewvmzivudkcczhnk.supabase.co';
                  iconUrl = `${baseUrl}/storage/v1/object/public/logos/${iconUrl}`;
               }

               return {
                  ...jo,
                  plate_number: fleet?.plate_number || (transporter ? `VENDOR: ${transporter.name}` : "NO PLATE"),
                  driver_name: driver?.name || (transporter ? transporter.name : "NO DRIVER"),
                  driver_phone: driver?.phone || transporter?.phone || null,
                  truck_type: fleet?.fleet_type?.type_name || "STANDARD",
                  fleet_icon: iconUrl,
                  routes: routes,
                  tracking_history: tracking,
                  latest_log: tracking[0]
               };
            }).filter(Boolean);
         }

         const activeJOs = enrichedAll.filter(jo => {
            const status = (jo.status || '').toUpperCase();
            
            // User requested: "job order yang finish/done yakni selesai melampaui lokasi 2, marker truk tidak boleh ada lagi di maps."
            const routes = jo.routes || [];
            const isCompletedPhysically = routes.length > 0 && 
              (routes[routes.length - 1].actual_departure != null || routes[routes.length - 1].status === 'completed');

            const category = getAdvancedJobCategory(jo);
            return (category === 'active' || category === 'assigned') && status !== 'MENUNGGU SELESAI' && !isCompletedPhysically;
         });
         
         // Sort job orders by latest ping descending (moving at top, idle at bottom)
         activeJOs.sort((a, b) => {
            const timeA = a.latest_log ? new Date(a.latest_log.created_at).getTime() : 0;
            const timeB = b.latest_log ? new Date(b.latest_log.created_at).getTime() : 0;
            return timeB - timeA;
         });

         setJobOrders(activeJOs);
         setLastUpdated(new Date());
      } catch (err) {
         console.error('Assignments Logic Error:', err);
      } finally {
         setLoading(false);
      }
    }, [profile?.tenant_id, profile?.role]);

    useEffect(() => {
      if (profile) {
         fetchActiveJobs();
         
         const channel = supabase
            .channel('fleet-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'job_tracking' }, () => fetchActiveJobs())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'job_orders' }, () => fetchActiveJobs())
            .subscribe();

         const interval = setInterval(fetchActiveJobs, 15000); // 15 sec refresh
         return () => {
            clearInterval(interval);
            supabase.removeChannel(channel);
         };
      }
   }, [profile, fetchActiveJobs]);

   // Geofence check every 10 seconds
   useEffect(() => {
      if (jobOrders.length === 0) return;

      const checkGeofences = () => {
         const tracker = geofenceTrackerRef.current;
         const newStatusMap: Record<string, GeofenceMovementStatus> = {};

         jobOrders.forEach(jo => {
            // Check SOS first
            const logNote = (jo.latest_log?.notes || jo.latest_log?.status_update || '').toUpperCase();
            const isSos = logNote.includes('SOS') || logNote.includes('DARURAT');
            if (isSos) {
               newStatusMap[jo.id] = 'sos';
               return;
            }

            // Get current position
            const tracking = jo.tracking_history || [];
            const validTracking = tracking
               .filter((t: any) => t.latitude && t.longitude && Number(t.latitude) !== 0)
               .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            if (validTracking.length === 0) {
               newStatusMap[jo.id] = 'idle';
               return;
            }

            const lat = Number(validTracking[0].latitude);
            const lng = Number(validTracking[0].longitude);
            const currentGeofence = getGeofenceKey(lat, lng);

            const existing = tracker.get(jo.id);

            if (!existing) {
               // First check — assume moving
               tracker.set(jo.id, { lastGeofence: currentGeofence, unchangedCount: 0, status: 'moving' });
               newStatusMap[jo.id] = 'moving';
            } else if (currentGeofence !== existing.lastGeofence) {
               // Geofence changed — moving!
               tracker.set(jo.id, { lastGeofence: currentGeofence, unchangedCount: 0, status: 'moving' });
               newStatusMap[jo.id] = 'moving';
            } else {
               // Same geofence — increment counter
               const newCount = existing.unchangedCount + 1;
               const newStatus: GeofenceMovementStatus = newCount >= 10 ? 'idle' : 'moving';
               tracker.set(jo.id, { lastGeofence: currentGeofence, unchangedCount: newCount, status: newStatus });
               newStatusMap[jo.id] = newStatus;
            }
         });

         setGeofenceStatusMap(newStatusMap);
      };

      // Run immediately on mount / jobOrders change
      checkGeofences();
      const geofenceInterval = setInterval(checkGeofences, 10000); // 10 sec
      return () => clearInterval(geofenceInterval);
   }, [jobOrders]);

   // Filter jobs based on URL focus
   const visibleJobOrders = useMemo(() => {
     if (!joParam) return jobOrders;
     return jobOrders.filter(jo => jo.jo_number === joParam);
   }, [jobOrders, joParam]);

   // KPI Calculations
   const kpis = useMemo(() => {
      let total = visibleJobOrders.length;
      let active = 0;
      let idle = 0;
      let sos = 0;

      visibleJobOrders.forEach(jo => {
         const gfStatus = geofenceStatusMap[jo.id];
         if (gfStatus === 'sos') {
            sos++;
         } else if (gfStatus === 'idle') {
            idle++;
         } else {
            active++;
         }
      });

      return { total, active, idle, sos };
   }, [visibleJobOrders, geofenceStatusMap]);

   // Customer specific stats for running text
   // Running text items — same format as Live Event Feed
   const runningTextItems = useMemo(() => {
      return visibleJobOrders.map(jo => {
         const log = jo.latest_log;
         const gfStatus = geofenceStatusMap[jo.id] || 'idle';

         const logNote = (log?.notes || log?.status_update || '').toUpperCase();
         const isSOS = logNote.includes('SOS') || logNote.includes('DARURAT');

         const plate = jo.plate_number || 'TRUK';
         const driver = jo.driver_name || 'Supir';

         let statusText = '';
         let statusEmoji = '📍';
         let statusColor = 'text-blue-400';

         if (isSOS) {
            statusEmoji = '🚨';
            statusText = 'DARURAT / SOS';
            statusColor = 'text-rose-400';
         } else if (gfStatus === 'idle') {
            statusEmoji = '⏸';
            const diffMins = log ? differenceInMinutes(new Date(), new Date(log.created_at + (log.created_at.includes('+') || log.created_at.endsWith('Z') ? '' : 'Z'))) : 0;
            statusText = `IDLE / Tidak ada pergerakan (${diffMins} mnt)`;
            statusColor = 'text-amber-400';
         } else {
            // Moving — match Live Event Feed logic
            const s = jo.status || '';
            if (['GPS Ping', 'GPS_PING', 'IN_PROGRESS', 'COMPLETED', 'STARTED', 'ACCEPTED'].includes(log?.status_update)) {
               if (s === 'pending' || s === 'assigned') {
                  statusText = 'MENUNGGU BERANGKAT';
               } else if (s === 'in_progress') {
                  statusText = 'DALAM PERJALANAN';
               } else if (s === 'completed') {
                  statusText = 'SELESAI';
               } else {
                  statusText = s?.toUpperCase() || 'DALAM PERJALANAN';
               }
            } else {
               statusText = log?.status_update?.toLowerCase() === 'pending' || log?.status_update?.toLowerCase() === 'assigned'
                  ? 'MENUNGGU BERANGKAT'
                  : (log?.status_update || s?.toUpperCase() || 'AKTIF');
            }

            if (log) {
               const diff = Math.max(0, differenceInMinutes(new Date(), new Date(jo.updated_at + (jo.updated_at?.includes('+') || jo.updated_at?.endsWith('Z') ? '' : 'Z'))));
               const timeStr = diff < 60 ? `${diff} mnt` : `${Math.floor(diff / 60)} jam ${diff % 60} mnt`;
               statusText += ` (${timeStr})`;
            }
            statusColor = 'text-blue-400';
         }

         const time = log ? format(new Date(log.created_at + (log.created_at.includes('+') || log.created_at.endsWith('Z') ? '' : 'Z')), 'HH:mm') : '';

         return {
            id: jo.id,
            label: `${statusEmoji} ${plate} • ${driver}`,
            status: statusText,
            time,
            statusColor,
            isSOS,
            isMoving: gfStatus === 'moving',
         };
      }).filter(item => item.status);
   }, [visibleJobOrders, geofenceStatusMap]);

   const selectedJoId = useMemo(() => {
     if (!joParam || !jobOrders) return null;
     const target = jobOrders.find(j => j.jo_number === joParam);
     return target ? target.id : null;
   }, [joParam, jobOrders]);

   return (
      <div ref={consoleRef} className={`flex ${isFullscreen ? 'h-screen w-screen' : 'h-[calc(100vh-64px)] w-full'} bg-slate-950 overflow-hidden relative font-sans`}>
         {/* MAIN MAP */}
         <div className="absolute inset-0 z-0">
            {viewMode === 'radar' ? (
               <UnifiedMissionRadarMap
                  jobOrders={visibleJobOrders}
                  selectedJoId={selectedJoId}
                  isVideowallMode={true}
                  geofenceStatusMap={geofenceStatusMap}
               />
            ) : (
               <IntelligenceTower />
            )}
         </div>

         {/* TOP HUD: KPI RIBBON */}
         <div className="absolute top-4 md:top-6 left-1/2 -translate-x-1/2 z-10 w-[95%] md:w-11/12 max-w-5xl pointer-events-none">
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-3 md:p-4 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-3 md:gap-4 pointer-events-auto">
               
               <div className="flex items-center justify-between w-full md:w-auto">
                  {/* View Mode Tabs */}
               <div className="flex items-center gap-1 bg-slate-800/80 rounded-lg p-1 pointer-events-auto">
                  <button
                     onClick={() => setViewMode('radar')}
                     className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-colors ${viewMode === 'radar' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                     <Activity size={12} className="inline mr-1" /> Radar
                  </button>
                  <button
                     onClick={() => setViewMode('tower')}
                     className={`px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-colors ${viewMode === 'tower' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
                  >
                     <Target size={12} className="inline mr-1" /> Intelligence Tower
                  </button>
               </div>

               {/* Title / Logo Area */}
                  <div className="flex items-center gap-2 md:gap-3 md:pr-4">
                     <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <Activity size={20} className="md:w-6 md:h-6" />
                     </div>
                     <div>
                        <h1 className="text-sm md:text-lg font-black text-white tracking-widest uppercase leading-tight">Control Tower</h1>
                        <p className="text-[10px] md:text-xs font-medium text-blue-400">
                           {joParam ? `Fokus: ${joParam}` : 'Intelligent Fleet Monitoring'}
                        </p>
                     </div>
                  </div>
                  {joParam && (
                     <button
                        onClick={() => router.push('/sbu/trucking/tracking')}
                        className="hidden md:flex items-center gap-1.5 px-3 py-1.5 mr-4 border-r border-slate-700/50 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 rounded-l-xl transition-colors text-[9px] font-black uppercase tracking-widest"
                     >
                        <X size={14} /> Clear Focus
                     </button>
                  )}
                  {!joParam && <div className="hidden md:block w-px h-10 bg-slate-700/50 mr-4"></div>}
                  
                  <button 
                     onClick={toggleFullscreen}
                     className="md:hidden p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700"
                     title="Toggle Fullscreen"
                  >
                     {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
                  </button>
               </div>

               {/* KPIs */}
               <div className="flex-1 w-full md:w-auto flex flex-wrap md:flex-nowrap items-center justify-around px-2 md:px-4 gap-2">
                  <div className="flex flex-col items-center">
                     <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Armada</span>
                     <div className="flex items-center gap-2">
                        <Truck size={18} className="text-white" />
                        <span className="text-3xl font-black text-white leading-none">{kpis.total}</span>
                     </div>
                  </div>

                  <div className="flex flex-col items-center">
                     <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Aktif Berjalan</span>
                     <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-blue-500" />
                        <span className="text-3xl font-black text-blue-500 leading-none">{kpis.active}</span>
                     </div>
                  </div>

                  <div className="flex flex-col items-center">
                     <span className="text-[10px] font-bold text-amber-400/80 uppercase tracking-widest mb-1">Idle / Delayed</span>
                     <div className="flex items-center gap-2">
                        <Clock size={18} className="text-amber-500" />
                        <span className="text-3xl font-black text-amber-500 leading-none">{kpis.idle}</span>
                     </div>
                  </div>

                  <div className="flex flex-col items-center">
                     <span className="text-[10px] font-bold text-rose-400/80 uppercase tracking-widest mb-1">Critical / SOS</span>
                     <div className="flex items-center gap-2">
                        <AlertTriangle size={18} className={`text-rose-500 ${kpis.sos > 0 ? 'animate-pulse' : ''}`} />
                        <span className="text-3xl font-black text-rose-500 leading-none">{kpis.sos}</span>
                     </div>
                  </div>
               </div>

               {/* Last Updated */}
               <div className="hidden md:flex pl-6 border-l border-slate-700/50 flex-col items-end">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Live Sync</span>
                  <span className="text-sm font-black text-white">{format(lastUpdated, "HH:mm:ss")}</span>
               </div>
               
               <button 
                  onClick={toggleFullscreen}
                  className="hidden md:flex p-2 ml-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700"
                  title="Toggle Fullscreen"
               >
                  {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
               </button>
            </div>
         </div>

         {/* BOTTOM RIGHT: LIVE EVENT TICKER */}
         <div className="absolute bottom-16 right-8 z-10 w-96 max-h-80 overflow-hidden hidden lg:flex flex-col pointer-events-none">
            <div className="bg-slate-900/70 backdrop-blur-md border border-slate-700/50 rounded-t-xl px-4 py-2 border-b-0 pointer-events-auto">
               <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                  Live Event Feed
               </span>
            </div>
            <div className="flex-1 bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-b-xl rounded-tl-xl p-3 shadow-2xl flex flex-col gap-2 overflow-y-auto hide-scrollbar pointer-events-auto">
               {visibleJobOrders.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">Menunggu armada aktif...</p>
               ) : (
                  visibleJobOrders.map((jo) => {
                     const log = jo.latest_log;
                     if (!log) return null;
                     const gfStatus = geofenceStatusMap[jo.id] || 'idle';
                     const isSOS = gfStatus === 'sos';
                     const isMoving = gfStatus === 'moving';
                     
                     const diffMins = differenceInMinutes(new Date(), new Date(log.created_at + (log.created_at.includes('+') || log.created_at.endsWith('Z') ? '' : 'Z')));
                     
                     return (
                        <div key={`${jo.id}`} className={`p-2.5 rounded-lg border flex gap-3 items-start animate-fade-in-up transition-all ${isSOS ? 'bg-rose-500/20 border-rose-500/50' : (isMoving ? 'bg-slate-800/80 border-blue-500/40 shadow-[0_0_10px_rgba(59,130,246,0.1)]' : 'bg-slate-900/50 border-slate-800/50 opacity-60')}`}>
                           <div className="pt-0.5">
                              {isSOS ? (
                                 <AlertTriangle size={14} className="text-rose-500" />
                              ) : isMoving ? (
                                 <Activity size={14} className="text-blue-400" />
                              ) : (
                                 <Clock size={14} className="text-slate-500" />
                              )}
                           </div>
                           <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                 <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isSOS ? 'bg-rose-500/30 text-rose-300' : (isMoving ? 'bg-blue-500/20 text-blue-300' : 'bg-slate-800 text-slate-400')} truncate max-w-[70%]`}>
                                    {jo.plate_number} • {jo.driver_name}
                                 </span>
                                 <span className={`text-[10px] font-medium shrink-0 ${isMoving ? 'text-blue-400' : 'text-slate-500'}`}>
                                    {format(new Date(log.created_at + (log.created_at.includes('+') || log.created_at.endsWith('Z') ? '' : 'Z')), 'HH:mm')}
                                 </span>
                              </div>
                              <p className={`text-[11px] font-medium leading-tight ${isSOS ? 'text-rose-400 font-bold' : (isMoving ? 'text-slate-200' : 'text-slate-400')}`}>
                                 {['GPS Ping', 'GPS_PING', 'IN_PROGRESS', 'COMPLETED', 'STARTED', 'ACCEPTED'].includes(log.status_update) 
                                    ? `📍 ${jo.status === 'pending' || jo.status === 'assigned' ? 'MENUNGGU BERANGKAT' : (jo.status === 'in_progress' ? 'DALAM PERJALANAN' : (jo.status === 'completed' ? 'SELESAI' : (jo.status?.toUpperCase() || 'DALAM PERJALANAN')))} ${jo.updated_at ? `(${(() => {
                                          const diff = Math.max(0, differenceInMinutes(new Date(), new Date(jo.updated_at + (jo.updated_at.includes('+') || jo.updated_at.endsWith('Z') ? '' : 'Z'))));
                                          if (diff < 60) return `${diff} mnt`;
                                          return `${Math.floor(diff / 60)} jam ${diff % 60} mnt`;
                                       })()})` : ''}`
                                    : (log.status_update?.toLowerCase() === 'pending' || log.status_update?.toLowerCase() === 'assigned' ? 'MENUNGGU BERANGKAT' : log.status_update)}
                              </p>
                              {!isMoving && !isSOS && (
                                 <p className="text-[9px] text-slate-500 mt-1 italic">Idle / Tidak ada pergerakan ({diffMins} mnt)</p>
                              )}
                              {/* BADGES: JOB STATUS, GPS STATUS, DEVICE HEALTH */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-2 pt-2 border-t border-slate-700/50">
                                 {/* JOB STATUS BADGE */}
                                 <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                                    {jo.job_status ? jo.job_status.replace(/_/g, ' ').toUpperCase() : 'UNKNOWN'}
                                 </span>
                                 
                                 {/* GPS STATUS BADGE */}
                                 {jo.gps_status && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                       jo.gps_status === 'ACTIVE' 
                                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                                          : jo.gps_status === 'IDLE'
                                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                    }`}>
                                       GPS: {jo.gps_status}
                                    </span>
                                 )}

                                 {/* DEVICE HEALTH BADGE */}
                                 {jo.device_health && (
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${
                                       jo.device_health === 'HEALTHY' 
                                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                                          : jo.device_health === 'WARNING'
                                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                          : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                    }`}>
                                       DEV: {jo.device_health}
                                    </span>
                                 )}
                                 
                                 {/* NATIVE GPS DIAGNOSTICS */}
                                 {log.source && log.source !== 'pwa' && log.source !== 'web' && (
                                    <>
                                       <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider ml-1">({log.source.replace('_', ' ')})</span>
                                       {log.battery_level !== null && log.battery_level !== undefined && (
                                          <span className="text-[9px] text-slate-400">⚡ {Math.round(log.battery_level)}%</span>
                                       )}
                                    </>
                                 )}
                              </div>
                           </div>
                        </div>
                     );
                  })
               )}
            </div>
         </div>

         {/* RUNNING TEXT TICKER (BOTTOM NEWS FEED) — matches Live Event Feed */}
         <div className="fixed bottom-0 left-0 right-0 w-full h-12 bg-slate-900/95 border-t border-slate-700/50 flex items-center z-[99999] overflow-hidden text-sm font-black uppercase tracking-widest text-slate-300">
            <div className="bg-blue-600 h-full px-6 flex items-center justify-center shrink-0 shadow-[5px_0_15px_-3px_rgba(0,0,0,0.5)] text-white relative z-10 whitespace-nowrap">
               <span className="w-2 h-2 rounded-full bg-white animate-pulse mr-2"></span>
               LIVE FEED
            </div>
            <div className="flex-1 overflow-hidden relative h-full flex items-center">
               <div className="animate-marquee whitespace-nowrap flex items-center gap-12 pl-12">
                  {runningTextItems.length > 0 ? runningTextItems.map((item, idx) => (
                     <span key={`a-${idx}`} className="flex items-center gap-2">
                        <span className={`font-bold text-xs ${item.isSOS ? 'text-rose-400' : (item.isMoving ? 'text-blue-300' : 'text-slate-400')}`}>{item.label}</span>
                        <span className={`text-xs ${item.statusColor}`}>{item.status}</span>
                        {item.time && <span className="text-[10px] text-slate-500">[{item.time}]</span>}
                        <span className="text-slate-700 ml-3">│</span>
                     </span>
                  )) : (
                     <span>Menunggu armada aktif...</span>
                  )}
                  {/* Duplicate for infinite loop */}
                  {runningTextItems.length > 0 && runningTextItems.map((item, idx) => (
                     <span key={`b-${idx}`} className="flex items-center gap-2">
                        <span className={`font-bold text-xs ${item.isSOS ? 'text-rose-400' : (item.isMoving ? 'text-blue-300' : 'text-slate-400')}`}>{item.label}</span>
                        <span className={`text-xs ${item.statusColor}`}>{item.status}</span>
                        {item.time && <span className="text-[10px] text-slate-500">[{item.time}]</span>}
                        <span className="text-slate-700 ml-3">│</span>
                     </span>
                  ))}
               </div>
            </div>
         </div>

         <style dangerouslySetInnerHTML={{__html: `
            .hide-scrollbar::-webkit-scrollbar { display: none; }
            .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
            @keyframes fadeInUp {
               from { opacity: 0; transform: translateY(10px); }
               to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in-up { animation: fadeInUp 0.4s ease-out forwards; }
            @keyframes marquee {
               0% { transform: translateX(0); }
               100% { transform: translateX(-50%); }
            }
            .animate-marquee {
               display: flex;
               width: max-content;
               animation: marquee 120s linear infinite;
            }
            .animate-marquee:hover {
               animation-play-state: paused;
            }
         `}} />
      </div>
   );
}
