'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
   Truck, Search, Loader2, Zap, Box, MapPin, Navigation, ShieldCheck, Maximize2, Activity, MessageSquare, Menu, X, Clock, ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import MissionTimeline from './MissionTimeline';

const MissionMap = dynamic(() => import('./MissionMap'), {
   ssr: false,
   loading: () => (
      <div className="h-full w-full rounded-xl bg-slate-100 flex flex-col items-center justify-center border border-slate-200">
         <Loader2 className="w-6 h-6 text-blue-500 animate-spin mb-2" />
         <p className="text-slate-400 text-xs">Loading map...</p>
      </div>
   )
});

export default function FleetTrackingConsole() {
   const { profile } = useAuth();
   const searchParams = useSearchParams();
   const joParam = searchParams?.get('jo') || null;
   const [jobOrders, setJobOrders] = useState<any[]>([]);
   const [selectedJoId, setSelectedJoId] = useState<string | null>(null);
   const selectedJo = useMemo(() => jobOrders.find(j => j.id === selectedJoId) || null, [jobOrders, selectedJoId]);
   const [loading, setLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState('');
   const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
   const [showLog, setShowLog] = useState(false);
   const [mounted, setMounted] = useState(false);
   const [focusedLocation, setFocusedLocation] = useState<{ lat: number, lng: number, title: string } | null>(null);
   
   // Mobile UI state
   const [showSidebar, setShowSidebar] = useState(false);
   const [showMissionPanel, setShowMissionPanel] = useState(true);

   useEffect(() => {
      setMounted(true);
   }, []);

   const fetchActiveJobs = useCallback(async () => {
      // [AI] Allow global roles like owner_sentralogis to bypass missing tenant_id by falling back to the first available tenant
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

         // [AI] Expand active status checking to support dynamic stop-based statuses (e.g. 'TIBA DI ...', 'MENUJU ...')
         const DONE_STATUSES = ['COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED', 'READY_FOR_BILLING', 'AWAITING_AUDIT', 'DONE', 'INVOICED', 'PAID'];
         const REJECTED_STATUSES = ['REJECTED', 'HANDOVER_REJECTED', 'CANCELLED'];
         const ACTIVE_STATUSES = [
            'IN_PROGRESS', 'DALAM PERJALANAN', 'ON ROAD', 'ON JOURNEY', 'ON_ROAD',
            'MENUJU ASAL', 'TIBA DI ASAL', 'PICKING_UP', 'DELIVERING', 
            'START JOURNEY', 'MENUNGGU BERANGKAT', 'STARTED', 'LOADING', 
            'UNLOADING', 'DITERIMA', 'SELESAI', 'ORDER DITERIMA', 'ACCEPTED'
         ];
         const activeJOs = (baseData || []).filter(jo => {
            if (!jo.driver_id || !jo.fleet_id) return false;
            const s = (jo.status || '').toUpperCase();
            if (DONE_STATUSES.includes(s) || REJECTED_STATUSES.includes(s) || s === 'DRAFT') return false;
            return (
               ACTIVE_STATUSES.includes(s) ||
               s.startsWith('TIBA DI') ||
               s.startsWith('MENUJU')
            );
         });

         if (activeJOs.length > 0) {
            const joIds = activeJOs.map(j => j.id);
            const driverIds = [...new Set(activeJOs.map(j => j.driver_id).filter(Boolean))];
            const fleetIds = [...new Set(activeJOs.map(j => j.fleet_id).filter(Boolean))];

            const [driversRes, fleetsRes, routesRes, trackingRes, docsRes] = await Promise.all([
               supabase.from('md_drivers').select('id, name, phone').in('id', driverIds),
               supabase.from('md_fleets').select('id, plate_number, fleet_type:md_fleet_types!fleet_type_id(id, type_name, icon_url)').in('id', fleetIds),
               supabase.from('job_routes').select('*').in('job_order_id', joIds),
               supabase.from('job_tracking').select('*').in('job_order_id', joIds),
               supabase.from('documents').select('*').in('job_order_id', joIds)
            ]);

            const enriched = activeJOs.map(jo => {
               const driver = driversRes.data?.find(d => d.id === jo.driver_id);
               const fleet = fleetsRes.data?.find(f => f.id === jo.fleet_id);
               const routes = (routesRes.data || []).filter(r => r.job_order_id === jo.id).sort((a, b) => a.sequence - b.sequence);
               const tracking = (trackingRes.data || []).filter(t => t.job_order_id === jo.id).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
               const attachments = (docsRes?.data || []).filter((d: any) => d.job_order_id === jo.id);
               
               const enrichedRoutes = routes.map(r => {
                   const stops = jo.wo_item?.item_data?.stops || [];
                   const matchingStop = stops.find((s: any) => s.sequence === r.sequence);
                   return {
                      ...r,
                      // [AI] Always use original Work Order stop coordinates for the stop location itself
                      latitude: matchingStop?.latitude || null,
                      longitude: matchingStop?.longitude || null,
                      // [AI] Store driver's actual update coordinates independently to know where they clicked
                      actual_update_lat: r.latitude || null,
                      actual_update_lng: r.longitude || null
                   };
                });

               let iconUrl = fleet?.fleet_type?.icon_url || null;
               if (iconUrl && !iconUrl.startsWith('http')) {
                  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nsvkewvmzivudkcczhnk.supabase.co';
                  iconUrl = `${baseUrl}/storage/v1/object/public/logos/${iconUrl}`;
               }

               return {
                  ...jo,
                  wo_number: jo.wo_item?.wo?.wo_number || "NO WO",
                  customer_name: jo.wo_item?.wo?.customer?.name || "PRIVATE CLIENT",
                  customer_phone: jo.wo_item?.wo?.customer?.phone || null,
                  plate_number: fleet?.plate_number || "NO PLATE",
                  driver_name: driver?.name || "NO DRIVER",
                  driver_phone: driver?.phone || null,
                  truck_type: fleet?.fleet_type?.type_name || "STANDARD",
                  fleet_icon: iconUrl,
                  routes: enrichedRoutes,
                  tracking_history: tracking,
                  attachments: attachments,
                  latest_log: tracking[tracking.length - 1]
               };
            });

            setJobOrders(enriched);
            if (!selectedJoId && enriched.length > 0) {
               if (joParam) {
                  const matched = enriched.find(j => j.jo_number === joParam);
                  setSelectedJoId(matched ? matched.id : enriched[0].id);
               } else {
                  setSelectedJoId(enriched[0].id);
               }
            }
         } else {
            setJobOrders([]);
         }
         setLastUpdated(new Date());
      } catch (err) {
         console.error('Assignments Logic Error:', err);
      } finally {
         setLoading(false);
      }
    }, [profile?.tenant_id, profile?.role, selectedJoId, joParam]);

   useEffect(() => {
      if (profile) {
         fetchActiveJobs();
         
         const channel = supabase
            .channel('fleet-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'job_tracking' }, () => fetchActiveJobs())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'job_orders' }, () => fetchActiveJobs())
            .subscribe();

         const interval = setInterval(fetchActiveJobs, 30000);
         return () => {
            clearInterval(interval);
            supabase.removeChannel(channel);
         };
      }
   }, [profile, fetchActiveJobs]);

   const groupedByWO = useMemo(() => {
      const groups: { [key: string]: any[] } = {};
      const filtered = jobOrders.filter(jo => 
         jo.wo_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
         jo.plate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
         jo.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      filtered.forEach(jo => {
         if (!groups[jo.wo_number]) groups[jo.wo_number] = [];
         groups[jo.wo_number].push(jo);
      });
      return groups;
   }, [jobOrders, searchQuery]);

   const getStatusColor = (status: string) => {
      const s = (status || '').toUpperCase();
      if (s.includes('DELIVER') || s.includes('SELESAI') || s.includes('DITERIMA')) return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      // [AI] Support blue styling for dynamic/active transit statuses
      if (s.includes('ROAD') || s.includes('JOURNEY') || s.includes('PERJALANAN') || s.includes('DELIVERING') || s.includes('MENUJU') || s.includes('IN_PROGRESS')) return 'bg-blue-50 text-blue-700 border-blue-200';
      if (s.includes('LOADING') || s.includes('PICKING') || s.includes('TIBA')) return 'bg-amber-50 text-amber-700 border-amber-200';
      return 'bg-slate-50 text-slate-600 border-slate-200';
   };

   // Sidebar Content (reusable for desktop and mobile)
   const SidebarContent = () => (
      <>
         <div className="p-4 border-b border-slate-200">
            <div className="flex items-center justify-between mb-4">
               <div className="flex items-center gap-2">
                  <div className="bg-blue-50 p-1.5 rounded-lg">
                     <Zap size={14} className="text-blue-600" />
                  </div>
                  <div>
                     <h2 className="text-xs font-semibold text-slate-900">Fleet Tracking</h2>
                     <p className="text-[10px] text-slate-400">{jobOrders.length} active missions</p>
                  </div>
               </div>
               <div className="flex items-center gap-2">
                  <button 
                     onClick={() => window.open('/radar', '_blank')}
                     className="w-8 h-8 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center transition-all border border-slate-200"
                     title="Open Full Page Radar"
                  >
                     <Maximize2 size={14} className="text-slate-500" />
                  </button>
                  {/* Mobile close button */}
                  <button 
                     onClick={() => setShowSidebar(false)}
                     className="w-8 h-8 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center lg:hidden"
                  >
                     <X size={14} className="text-slate-500" />
                  </button>
               </div>
            </div>
            
            <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
               <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-2 pl-9 pr-3 text-sm text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400"
                  placeholder="Search missions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
               />
            </div>
         </div>

         <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {loading && jobOrders.length === 0 ? (
               <div className="flex flex-col items-center justify-center py-16">
                  <Loader2 className="animate-spin text-blue-500 mb-3" size={20} />
                  <p className="text-xs text-slate-400">Loading missions...</p>
               </div>
            ) : Object.keys(groupedByWO).length === 0 ? (
               <div className="flex flex-col items-center justify-center py-16 text-center px-4">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                     <Navigation size={20} className="text-slate-300" />
                  </div>
                  <p className="text-xs text-slate-400">No active missions</p>
               </div>
            ) : (
               Object.entries(groupedByWO).map(([woNum, jos]) => (
                  <div key={woNum} className="space-y-1.5">
                     <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-1.5">
                           <Box size={12} className="text-blue-500" />
                           <span className="text-xs font-medium text-blue-600">{woNum}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 truncate ml-2">{jos[0].customer_name}</span>
                     </div>
                     <div className="space-y-1">
                        {jos.map(jo => {
                           const isSelected = selectedJoId === jo.id;
                           return (
                              <button
                                 key={jo.id}
                                 onClick={() => {
                                    setSelectedJoId(jo.id);
                                    setShowSidebar(false);
                                    setShowMissionPanel(true);
                                 }}
                                 className={`w-full text-left p-3 rounded-lg border transition-all duration-200 ${
                                    isSelected 
                                    ? "bg-blue-50 border-blue-300 shadow-sm" 
                                    : "bg-white border-slate-200 hover:border-slate-300"
                                 }`}
                              >
                                 <div className="flex items-center gap-2.5">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-blue-100" : "bg-slate-100"}`}>
                                       {jo.fleet_icon ? (
                                          <img src={jo.fleet_icon} alt="" className="w-5 h-5 object-contain" crossOrigin="anonymous" />
                                       ) : (
                                          <Truck size={14} className={isSelected ? "text-blue-600" : "text-slate-400"} />
                                       )}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                       <div className="flex items-center justify-between gap-2 mb-0.5">
                                          <span className={`text-[10px] font-medium ${isSelected ? "text-blue-700" : "text-slate-500"}`}>{jo.jo_number}</span>
                                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${isSelected ? "bg-blue-100 text-blue-700 border-blue-200" : getStatusColor(jo.status)}`}>{jo.status?.replace(/_/, ' ')}</span>
                                       </div>
                                      <h4 className={`text-xs font-medium truncate leading-tight mb-0.5 ${isSelected ? "text-slate-900" : "text-slate-700"}`}>{jo.plate_number}</h4>
                                      <div className="flex items-center justify-between">
                                        <p className={`text-[10px] truncate ${isSelected ? "text-blue-600" : "text-slate-400"}`}>{jo.driver_name}</p>
                                        {jo.latest_log && (
                                          <span className={`text-[10px] flex items-center gap-0.5 ${isSelected ? "text-blue-500" : "text-slate-400"}`}>
                                            <Clock size={10} />
                                            {format(new Date(jo.latest_log.created_at), 'HH:mm')}
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                 </div>
                              </button>
                           );
                        })}
                     </div>
                  </div>
               ))
            )}
         </div>

         <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
            <div className="flex items-center gap-1.5">
               <ShieldCheck size={12} className="text-emerald-500" />
               <span>Live tracking</span>
            </div>
            <span>{mounted ? format(lastUpdated, "HH:mm:ss") : "--:--:--"}</span>
         </div>
      </>
   );

   return (
      <div className="flex h-[calc(100vh-64px)] bg-white overflow-hidden">
         {/* DESKTOP SIDEBAR */}
         <div className="hidden lg:flex w-80 flex-col border-r border-slate-200 bg-white z-30">
            <SidebarContent />
         </div>

         {/* MOBILE SIDEBAR OVERLAY */}
         {showSidebar && (
            <>
               <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setShowSidebar(false)} />
               <div className="fixed inset-y-0 left-0 w-80 bg-white z-50 flex flex-col shadow-xl lg:hidden">
                  <SidebarContent />
               </div>
            </>
         )}

         {/* MAIN CONTENT */}
         <div className="flex-1 flex flex-col min-w-0 relative">
            {/* Mobile top bar */}
            <div className="lg:hidden flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200">
               <button 
                  onClick={() => setShowSidebar(true)}
                  className="w-9 h-9 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200"
               >
                  <Menu size={16} className="text-slate-600" />
               </button>
               <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-slate-700">
                     {selectedJo ? selectedJo.plate_number : 'Fleet Tracking'}
                  </span>
                  {selectedJo && (
                     <span className={`text-[10px] px-2 py-0.5 rounded border ${getStatusColor(selectedJo.status)}`}>
                        {selectedJo.status?.replace(/_/, ' ')}
                     </span>
                  )}
               </div>
               <button 
                  onClick={() => setShowMissionPanel(!showMissionPanel)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all ${showMissionPanel ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-slate-50 border-slate-200 text-slate-500"}`}
               >
                  <Activity size={16} />
               </button>
            </div>

            {!selectedJo ? (
               <div className="flex-1 flex flex-col items-center justify-center">
                  <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                     <Navigation size={28} className="text-slate-300 -rotate-45" />
                  </div>
                  <h2 className="text-sm font-medium text-slate-400 mb-1">Select a mission</h2>
                  <p className="text-xs text-slate-300">Choose from the sidebar to start tracking</p>
               </div>
            ) : (
               <>
                  {/* MAP */}
                  <div className="flex-1 p-3 lg:p-4 relative min-h-0">
                     <MissionMap 
                        stops={selectedJo.routes || []} 
                        tracking={selectedJo.tracking_history || []} 
                        fleetIcon={selectedJo.fleet_icon} 
                        focusedLocation={focusedLocation} 
                     />
                  </div>

                  {/* MISSION CONTROL PANEL */}
                  {showMissionPanel && (
                     <div className="bg-white border-t border-slate-200 shadow-lg">
                        {/* Mobile: collapsible header */}
                        <div className="lg:hidden flex items-center justify-between px-4 py-2 border-b border-slate-100">
                           <button 
                              onClick={() => setShowMissionPanel(false)}
                              className="text-xs text-slate-500 flex items-center gap-1"
                           >
                              <ChevronRight size={14} className="rotate-90" /> Hide panel
                           </button>
                           <span className="text-xs font-medium text-slate-700">Mission Details</span>
                           <div className="w-16" />
                        </div>

                        <div className="p-4 lg:p-5">
                           {/* Info row */}
                           <div className="flex flex-wrap items-center gap-4 mb-4">
                              <div className="flex items-center gap-2">
                                 <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                    <Truck size={14} className="text-slate-500" />
                                 </div>
                                 <div>
                                    <p className="text-[10px] text-slate-400">Driver</p>
                                    <p className="text-sm font-medium text-slate-900">{selectedJo.driver_name}</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2">
                                 <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                    <Box size={14} className="text-slate-500" />
                                 </div>
                                 <div>
                                    <p className="text-[10px] text-slate-400">Truck Type</p>
                                    <p className="text-sm font-medium text-slate-900">{selectedJo.truck_type}</p>
                                 </div>
                              </div>
                              <div className="flex items-center gap-2">
                                 <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                    <MapPin size={14} className="text-slate-500" />
                                 </div>
                                 <div>
                                    <p className="text-[10px] text-slate-400">Status</p>
                                    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${getStatusColor(selectedJo.status)}`}>
                                       {selectedJo.status?.replace(/_/g, ' ')}
                                    </span>
                                 </div>
                              </div>
                              {selectedJo.latest_log && (
                                 <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
                                       <Clock size={14} className="text-slate-500" />
                                    </div>
                                    <div>
                                       <p className="text-[10px] text-slate-400">Last Ping</p>
                                       <p className="text-sm font-medium text-slate-900">{format(new Date(selectedJo.latest_log.created_at), 'HH:mm:ss')}</p>
                                    </div>
                                 </div>
                              )}
                           </div>

                           {/* Action buttons */}
                           <div className="flex flex-wrap items-center gap-2 mb-4">
                              <button 
                                 onClick={() => setShowLog(!showLog)}
                                 className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                                    showLog 
                                    ? "bg-blue-600 text-white border-blue-600" 
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                 }`}
                              >
                                 <Activity size={12} className={showLog ? "animate-pulse" : ""} />
                                 {showLog ? "Close Log" : "View Log"}
                              </button>
                              <button 
                                 onClick={() => {
                                    if (!selectedJo.tracking_token) {
                                       toast.error('Tracking Token not found for this JO');
                                       return;
                                    }
                                    const link = `${window.location.origin}/track/mission/${selectedJo.tracking_token}`;
                                    const message = `Halo ${selectedJo.customer_name || 'Pelanggan'},\n\nBerikut adalah link pelacakan untuk pengiriman Anda (${selectedJo.jo_number}) menggunakan armada ${selectedJo.plate_number}:\n\n${link}\n\nTerima kasih telah menggunakan Sentralogis.`;
                                    
                                    let phone = selectedJo.customer_phone || '';
                                    phone = phone.replace(/\D/g, '');
                                    if (phone.startsWith('0')) phone = '62' + phone.substring(1);
                                    else if (phone.startsWith('8')) phone = '62' + phone;

                                    const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
                                    window.open(waUrl, '_blank');
                                    
                                    navigator.clipboard.writeText(link);
                                    toast.success('WA Web Opened & Link Copied!');
                                 }}
                                 className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5"
                              >
                                 <MessageSquare size={12} /> Share to WA
                              </button>
                              <button 
                                 onClick={async () => {
                                    setLoading(true);
                                    await fetchActiveJobs();
                                    toast.success('Sync complete');
                                 }}
                                 disabled={loading}
                                 className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
                              >
                                 {loading ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} />}
                                 {loading ? "Syncing..." : "Refresh"}
                              </button>
                           </div>

                           {/* Route stops - horizontal scroll */}
                           <div className="flex gap-3 overflow-x-auto pb-2">
                              {selectedJo.routes.map((route: any, idx: number) => (
                                 <div key={route.id} className={`min-w-[200px] p-3 rounded-lg border transition-all duration-300 ${['completed', 'arrived', 'departed'].includes(route.status) ? "bg-emerald-50 border-emerald-200" : "bg-slate-50 border-slate-200"}`}>
                                    <div className="flex items-center gap-2 mb-2">
                                       <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-semibold ${['completed', 'arrived', 'departed'].includes(route.status) ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-400"}`}>{idx + 1}</div>
                                       <div className="min-w-0 flex-1">
                                          <p className={`text-[10px] font-medium uppercase ${['completed', 'arrived', 'departed'].includes(route.status) ? "text-emerald-600" : "text-slate-400"}`}>{route.stop_type}</p>
                                          <h5 className={`text-xs font-medium truncate ${['completed', 'arrived', 'departed'].includes(route.status) ? "text-emerald-800" : "text-slate-700"}`}>{route.location_name}</h5>
                                       </div>
                                    </div>
                                    <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
                                       <div className={`h-full transition-all duration-500 ${['completed', 'arrived', 'departed'].includes(route.status) ? "w-full bg-emerald-500" : "w-0"}`} />
                                    </div>
                                 </div>
                              ))}
                           </div>
                        </div>
                     </div>
                  )}

                  {/* Mobile: show panel toggle when hidden */}
                  {!showMissionPanel && (
                     <button 
                        onClick={() => setShowMissionPanel(true)}
                        className="lg:hidden absolute bottom-4 right-4 w-10 h-10 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center"
                     >
                        <ChevronRight size={18} className="-rotate-90" />
                     </button>
                  )}
               </>
            )}
         </div>

         {/* MISSION LOG DRAWER */}
         {selectedJo && (
            <>
               {/* Mobile: full-screen overlay */}
               {showLog && (
                  <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setShowLog(false)} />
               )}
               <div className={`${
                  showLog ? "translate-x-0" : "translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden"
               } fixed lg:relative right-0 top-0 bottom-0 w-full lg:w-0 md:w-96 bg-white border-l border-slate-200 z-50 lg:z-auto transition-all duration-300 flex flex-col shadow-xl lg:shadow-none`}>
                  <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                     <h3 className="text-sm font-semibold text-slate-900">Mission Log</h3>
                     <button 
                        onClick={() => setShowLog(false)}
                        className="w-8 h-8 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center"
                     >
                        <X size={14} className="text-slate-500" />
                     </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                     <MissionTimeline 
                        tracking={selectedJo.tracking_history || []} 
                        routes={selectedJo.routes || []} 
                        attachments={selectedJo.attachments || []}
                        joId={selectedJo.id}
                        joNumber={selectedJo.jo_number}
                        jo_status={selectedJo.status}
                     />
                  </div>
               </div>
            </>
         )}
      </div>
   );
}
