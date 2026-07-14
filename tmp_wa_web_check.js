'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { useSearchParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import {
   Truck, Search, Loader2, Zap, Box, MapPin, Navigation, ShieldCheck, Maximize2, Activity, Menu, X, Clock, ChevronLeft, ChevronRight, MessageSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';
import MissionTimeline from './MissionTimeline';

const UnifiedMissionRadarMap = dynamic(() => import('./UnifiedMissionRadarMap'), {
   ssr: false,
   loading: () => (
      
         
         Memuat Radar Satelit Terpadu...
      
   )
});

const TripReplayModal = dynamic(() => import('./TripReplayModal'), { ssr: false });

export default function FleetTrackingConsole() {
   const { profile } = useAuth();
   const searchParams = useSearchParams();
   const joParam = searchParams?.get('jo') || null;
   const [jobOrders, setJobOrders] = useState([]);
   const [allJobOrders, setAllJobOrders] = useState([]);
   const [selectedJoId, setSelectedJoId] = useState(null);
   const [selectedWoGroup, setSelectedWoGroup] = useState('ALL');
   const [expandedWoGroups, setExpandedWoGroups] = useState({});
   const selectedJo = useMemo(() => (allJobOrders.length > 0 ? allJobOrders : jobOrders).find(j => j.id === selectedJoId) || null, [allJobOrders, jobOrders, selectedJoId]);
   const [loading, setLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState('');
   const [lastUpdated, setLastUpdated] = useState(new Date());
   const [showLog, setShowLog] = useState(false);
   const [mounted, setMounted] = useState(false);
   const [focusedLocation, setFocusedLocation] = useState(null);
   
   // UI sidebar state (works universally for desktop slide-out and mobile overlay)
   const [isSidebarOpen, setIsSidebarOpen] = useState(true);
   const [showMissionPanel, setShowMissionPanel] = useState(true);
   const [replayJo, setReplayJo] = useState(null);

   useEffect(() => {
      setMounted(true);
      if (typeof window !== 'undefined' && window.innerWidth  {
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
         
         // Enrich ALL JOs (including completed) so search & replay can access them
         const allJosWithAssets = (baseData || []).filter(jo => jo.driver_id && jo.fleet_id);

         if (allJosWithAssets.length > 0) {
            const joIds = allJosWithAssets.map(j => j.id);
            const driverIds = [...new Set(allJosWithAssets.map(j => j.driver_id).filter(Boolean))];
            const fleetIds = [...new Set(allJosWithAssets.map(j => j.fleet_id).filter(Boolean))];

            const [driversRes, fleetsRes, routesRes, trackingRes, docsRes] = await Promise.all([
               supabase.from('md_drivers').select('id, name, phone').in('id', driverIds),
               supabase.from('md_fleets').select('id, plate_number, fleet_type:md_fleet_types!fleet_type_id(id, type_name, icon_url)').in('id', fleetIds),
               supabase.from('job_routes').select('*').in('job_order_id', joIds),
               supabase.from('job_tracking').select('*').in('job_order_id', joIds).order('created_at', { ascending: false }),
               supabase.from('documents').select('*').in('job_order_id', joIds)
            ]);

            const enrichedAll = (baseData || []).map(jo => {
               if (!jo.driver_id || !jo.fleet_id) {
                  return {
                     ...jo,
                     wo_id: jo.wo_item?.wo?.id || null,
                     wo_number: jo.wo_item?.wo?.wo_number || "NO WO",
                     customer_name: jo.wo_item?.wo?.customer?.name || "PRIVATE CLIENT",
                     customer_phone: jo.wo_item?.wo?.customer?.phone || null,
                     plate_number: "NO PLATE",
                     driver_name: "NO DRIVER",
                     driver_phone: null,
                     truck_type: "STANDARD",
                     fleet_icon: null,
                     routes: [],
                     tracking_history: [],
                     attachments: [],
                     latest_log: null
                  };
               }
               
               const driver = driversRes.data?.find(d => d.id === jo.driver_id);
               const fleet = fleetsRes.data?.find(f => f.id === jo.fleet_id);
               const routes = (routesRes.data || []).filter(r => r.job_order_id === jo.id).sort((a, b) => a.sequence - b.sequence);
               const tracking = (trackingRes.data || []).filter(t => t.job_order_id === jo.id).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
               const attachments = (docsRes?.data || []).filter((d: any) => d.job_order_id === jo.id);
               
               const enrichedRoutes = routes.map(r => {
                  const stops = jo.wo_item?.item_data?.stops || [];
                  const matchingStop = stops.find((s: any) => s.sequence === r.sequence);
                  return {
                     ...r,
                     latitude: matchingStop?.latitude || null,
                     longitude: matchingStop?.longitude || null,
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
                  wo_id: jo.wo_item?.wo?.id || null,
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
                  latest_log: tracking[0]
               };
            });

            setAllJobOrders(enrichedAll);
            
            const activeJOs = enrichedAll.filter(jo => {
               if (!jo.driver_id || !jo.fleet_id) return false;
               const s = (jo.status || '').toUpperCase();
               if (DONE_STATUSES.includes(s) || REJECTED_STATUSES.includes(s) || s === 'DRAFT') return false;
               return (
                  ACTIVE_STATUSES.includes(s) ||
                  s.startsWith('TIBA DI') ||
                  s.startsWith('MENUJU')
               );
            });

            setJobOrders(activeJOs);
            if (!selectedJoId && enrichedAll.length > 0) {
               if (joParam) {
                  const matched = enrichedAll.find(j => j.jo_number === joParam);
                  if (matched) {
                     setSelectedJoId(matched.id);
                     setSelectedWoGroup(matched.wo_number);
                  } else {
                     setSelectedJoId(null);
                     setSelectedWoGroup('ALL');
                  }
               } else {
                  setSelectedJoId(null);
                  setSelectedWoGroup('ALL');
               }
            }
         } else {
            const emptyEnriched = (baseData || []).map(jo => ({
               ...jo,
               routes: [],
               tracking_history: [],
               attachments: [],
               latest_log: null
            }));
            setAllJobOrders(emptyEnriched);
            setJobOrders([]);
         }
         setLastUpdated(new Date());
      } catch (err) {
         console.error('Assignments Logic Error:', err);
      } finally {
         setLoading(false);
      }
    }, [profile?.tenant_id, profile?.role, selectedJoId, joParam]);

   const handleShareToCustomer = (woNum: string) => {
      const allJosForWo = (allJobOrders.length > 0 ? allJobOrders : jobOrders).filter(j => j.wo_number === woNum);
      if (allJosForWo.length === 0) return;

      const firstJo = allJosForWo[0];
      const woId = firstJo.wo_id || firstJo.wo_item?.wo?.id || null;
      const woNumber = firstJo.wo_number || firstJo.wo_item?.wo?.wo_number || 'N/A';
      const customerName = firstJo.customer_name || 'Pelanggan';
      
      const link = woId
        ? `${window.location.origin}/track/wo/${woId}`
        : `${window.location.origin}/track/${firstJo.driver_link_token || firstJo.tracking_token || firstJo.id}`;
      
      const joList = allJosForWo.map((j: any) => {
         const milestones = (j.routes || [])
            .filter((r: any) => r.stop_type)
            .map((r: any) => `  - ${r.stop_type}: ${r.location_name} (${r.status || 'pending'})`)
            .join('\n');
         return `• ${j.jo_number} | ${j.plate_number} | ${j.driver_name}\n  Milestone:\n${milestones || '  - Menunggu update'}`;
      }).join('\n\n');

      const message = `Halo ${customerName},\n\nBerikut link pelacakan pengiriman Anda:\n${woNumber}\n\nDaftar Armada & Milestone:\n${joList}\n\nPantau secara real-time:\n${link}`;
      
      let phone = firstJo.customer_phone || '';
      phone = phone.replace(/\D/g, '');
      if (phone.startsWith('0')) phone = '62' + phone.substring(1);
      if (phone.startsWith('8')) phone = '62' + phone;

       if (phone && phone.length >= 10) {
         window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`, '_blank');
       } else {
         window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
       }
      toast.success('Membuka WhatsApp...');
    };

    useEffect(() => {
      if (profile) {
         fetchActiveJobs();
         
         const channel = supabase
            .channel('fleet-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'job_tracking' }, () => fetchActiveJobs())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'job_orders' }, () => fetchActiveJobs())
            .subscribe();

         const interval = setInterval(fetchActiveJobs, 10000);
         return () => {
            clearInterval(interval);
            supabase.removeChannel(channel);
         };
      }
   }, [profile, fetchActiveJobs]);

     const groupedByWO = useMemo(() => {
        const groups: { [key: string]: any[] } = {};
        const source = searchQuery.trim() ? (allJobOrders.length > 0 ? allJobOrders : jobOrders) : jobOrders;
        const filtered = source.filter(jo => 
           jo.wo_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
           jo.plate_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
           jo.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
        );
        filtered.forEach(jo => {
           if (!groups[jo.wo_number]) groups[jo.wo_number] = [];
           groups[jo.wo_number].push(jo);
        });
        return groups;
     }, [allJobOrders, jobOrders, searchQuery]);

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
      
         
            
               
                  
                     
                  
                   
                      Live Radar Armada
                      {(allJobOrders.length > 0 ? allJobOrders.length : jobOrders.length)} Armada • {Object.keys(groupedByWO).length} Proyek WO
                   
               
               
                   window.open('/radar', '_blank')}
                     className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-all text-slate-600"
                     title="Buka Radar Layar Penuh (Tab Baru)"
                  >
                     
                  
                   setIsSidebarOpen(false)}
                     className="w-7 h-7 bg-slate-100 hover:bg-slate-200 hover:bg-rose-100 hover:text-rose-600 rounded-lg flex items-center justify-center transition-all text-slate-600"
                     title="Sembunyikan Panel (Perluas Peta)"
                  >
                     
                  
               
            

            {/* Master Toggle: Semua Armada */}
             {
                  setSelectedJoId(null);
                  setSelectedWoGroup('ALL');
                  if (typeof window !== 'undefined' && window.innerWidth 
               
                  
                  🌐 Tampilkan Semua Armada
               
                   
                   {(allJobOrders.length > 0 ? allJobOrders.length : jobOrders.length)} Unit
                   
            
         
            
               
                setSearchQuery(e.target.value)}
               />
            
         

         
            {loading && jobOrders.length === 0 ? (
               
                  
                  Loading missions...
               
            ) : Object.keys(groupedByWO).length === 0 ? (
               
                  
                     
                  
                  No active missions
               
            ) : (
               
                  {/* WORK ORDER ACCORDION GROUPS */}
                  {Object.entries(groupedByWO).map(([woNum, jos]) => {
                     const isWoSelected = selectedWoGroup === woNum && !selectedJoId;
                     const isExpanded = expandedWoGroups[woNum] ?? (Object.keys(groupedByWO).length === 1);
                     const activeCount = jos.filter(j => ['IN_PROGRESS', 'DALAM PERJALANAN', 'ON_ROAD', 'MENUJU ASAL', 'TIBA DI ASAL', 'PICKING_UP', 'DELIVERING'].includes((j.status || '').toUpperCase())).length;

                     return (
                        
                           {/* WO Accordion Header Button */}
                           
                               {
                                    setSelectedJoId(null);
                                    setSelectedWoGroup(woNum);
                                    setExpandedWoGroups(prev => ({ ...prev, [woNum]: !isExpanded }));
                                    if (typeof window !== 'undefined' && window.innerWidth 
                                 
                                    
                                       WO
                                    
                                    
                                       {woNum}
                                       {jos[0].customer_name}
                                    
                                 
                                 
                                    
                                       {jos.length} Armada
                                    
                                    
                                       🟢 {jos.length - activeCount} / 🔵 {activeCount}
                                    
                                 
                               

                               {/* Expand/Collapse Dropdown Arrow */}
                               {
                                    e.stopPropagation();
                                    setSelectedJoId(null);
                                    setSelectedWoGroup(woNum);
                                    setExpandedWoGroups(prev => ({ ...prev, [woNum]: !isExpanded }));
                                 }}
                                 className={`p-2.5 rounded-xl border transition-all shrink-0 flex items-center justify-center shadow-sm ${
                                    isExpanded ? "bg-blue-50 border-blue-300 text-blue-600" : "bg-white hover:bg-slate-100 border-slate-200 text-slate-500"
                                 }`}
                                 title={isExpanded ? "Tutup rincian JO" : "Lihat rincian JO"}
                              >
                                 
                              
                            

                            {/* Send WA to Customer - full width below header */}
                             {
                                  e.stopPropagation();
                                  handleShareToCustomer(woNum);
                               }}
                               className="w-full mt-1.5 h-8 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 rounded-lg text-[11px] font-semibold text-emerald-700 flex items-center justify-center gap-1.5 transition-all"
                               title="Kirim WA ke Pelanggan (Bundling semua JO di WO ini)"
                            >
                               
                               Kirim WA ke Pelanggan
                            

                            {/* Sub-JO Accordion List (1 WO -> 10 JO) */}
                           {isExpanded && (
                              
                                 {jos.map(jo => {
                                    const isSelected = selectedJoId === jo.id;
                                    return (
                                        {
                                             setSelectedJoId(jo.id);
                                             setSelectedWoGroup(woNum);
                                             if (typeof window !== 'undefined' && window.innerWidth 
                                          
                                             
                                                {jo.fleet_icon ? (
                                                   
                                                ) : (
                                                   
                                                )}
                                             
                                             
                                                
                                                   {jo.jo_number}
                                                   {jo.status?.replace(/_/, ' ')}
                                                
                                                {jo.plate_number}
                                                
                                                   {jo.driver_name}
                                                   {jo.latest_log && (
                                                      
                                                         
                                                         {format(new Date(jo.latest_log.created_at), 'HH:mm')}
                                                      
                                                   )}
                                                
                                             
                                          
                                       
                                    );
                                 })}
                              
                           )}
                        
                     );
                  })}
               
            )}
         

         
            
               
               Live tracking
            
            {mounted ? format(lastUpdated, "HH:mm:ss") : "--:--:--"}
         
      
   );

   return (
      
       {/* DESKTOP SIDEBAR (Slide out / Collapsible for wider map view) */}
       
          
             
          
       

         {/* MOBILE SIDEBAR OVERLAY */}
         {isSidebarOpen && (
            
                setIsSidebarOpen(false)} />
               
                  
               
            
         )}

         {/* MAIN CONTENT */}
         
            {/* Mobile top bar */}
            
                setIsSidebarOpen(true)}
                  className="w-9 h-9 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200"
               >
                  
               
               
                  
                     {selectedJo ? selectedJo.plate_number : 'Fleet Tracking'}
                  
                  {selectedJo && (
                     
                        {selectedJo.status?.replace(/_/, ' ')}
                     
                  )}
               
                setShowMissionPanel(!showMissionPanel)}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center border transition-all ${showMissionPanel ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-slate-50 border-slate-200 text-slate-500"}`}
               >
                  
               
            

            {/* UNIFIED PERSISTENT RADAR MAP (No map unmounting when switching between WO card and single JO) */}
            
               {/* Overlay Status Badge & Quick Navigation Controls */}
               
                  {!isSidebarOpen && (
                      setIsSidebarOpen(true)}
                        className="hidden lg:flex bg-slate-900/90 hover:bg-slate-800 text-white backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-2xl items-center gap-2 transition-all hover:scale-105 group shrink-0"
                        title="Tampilkan Panel Daftar Armada"
                     >
                        
                        Daftar Armada
                     
                  )}
                  {!selectedJo ? (
                     
                        
                           
                        
                        
                           
                              {selectedWoGroup === 'ALL' || !selectedWoGroup ? 'Consolidated Radar' : `Work Order Radar`}
                           
                           
                              {selectedWoGroup === 'ALL' || !selectedWoGroup 
                                 ? `Semua Armada Aktif (${jobOrders.length} Unit)` 
                                 : `${(groupedByWO[selectedWoGroup] || []).length} Armada Jalan • ${(groupedByWO[selectedWoGroup] || [])[0]?.customer_name || selectedWoGroup}`}
                           
                        
                     
                  ) : (
                     
                         setSelectedJoId(null)}
                           className="bg-slate-900/90 hover:bg-slate-900 text-white backdrop-blur-md border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-2xl transition-all hover:scale-105"
                           title="Kembali memantau seluruh armada WO / konsolidasi"
                        >
                           ⬅ Kembali ke Radar {selectedWoGroup === 'ALL' || !selectedWoGroup ? 'Semua Armada' : `WO ${selectedWoGroup}`}
                        
                        
                           Fokus Truk:
                           {selectedJo.plate_number}
                           ({selectedJo.driver_name})
                        
                     
                  )}
               

               {/* Persistent Map Canvas */}
               
                   {
                        setSelectedJoId(jo.id);
                        setSelectedWoGroup(jo.wo_number);
                        setShowMissionPanel(true);
                     }}
                     focusedLocation={focusedLocation}
                  />
               
            

            {/* MISSION DETAILS BOTTOM PANEL (Appears when single JO selected) */}
            {selectedJo && (
               
                  {/* MISSION CONTROL PANEL */}
                  {showMissionPanel && (
                     
                        {/* Mobile: collapsible header */}
                        
                            setShowMissionPanel(false)}
                              className="text-xs text-slate-500 flex items-center gap-1"
                           >
                               Hide panel
                           
                           Mission Details
                           
                        

                        
                           {/* Info row */}
                           
                              
                                 
                                    
                                 
                                 
                                    Driver
                                    {selectedJo.driver_name}
                                 
                              
                              
                                 
                                    
                                 
                                 
                                    Truck Type
                                    {selectedJo.truck_type}
                                 
                              
                              
                                 
                                    
                                 
                                 
                                    Status
                                    
                                       {selectedJo.status?.replace(/_/g, ' ')}
                                    
                                 
                              
                              {selectedJo.latest_log && (
                                 
                                    
                                       
                                    
                                    
                                       Last Ping
                                       {format(new Date(selectedJo.latest_log.created_at), 'HH:mm:ss')}
                                    
                                 
                              )}
                           

                           {/* Action buttons */}
                           
                               setShowLog(!showLog)}
                                 className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 border ${
                                    showLog 
                                    ? "bg-blue-600 text-white border-blue-600" 
                                    : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                 }`}
                              >
                                 
                                 {showLog ? "Close Log" : "View Log"}
                              
                               setReplayJo(selectedJo)}
                                 className="px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-md hover:shadow-cyan-500/20 active:scale-95 uppercase tracking-wider"
                              >
                                 🎬 Trip Replay (Blackbox)
                              
                                {
                                    setLoading(true);
                                    await fetchActiveJobs();
                                    toast.success('Sync complete');
                                 }}
                                 disabled={loading}
                                 className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-50"
                              >
                                 {loading ?  : }
                                 {loading ? "Syncing..." : "Refresh"}
                              
                           

                           {/* Route stops - horizontal scroll */}
                           
                              {selectedJo.routes.map((route: any, idx: number) => (
                                 
                                    
                                       {idx + 1}
                                       
                                          {route.stop_type}
                                          {route.location_name}
                                       
                                    
                                    
                                       
                                    
                                 
                              ))}
                           
                        
                     
                  )}

                  {/* Mobile: show panel toggle when hidden */}
                  {!showMissionPanel && (
                      setShowMissionPanel(true)}
                        className="lg:hidden absolute bottom-4 right-4 w-10 h-10 bg-blue-600 text-white rounded-full shadow-lg flex items-center justify-center"
                     >
                        
                     
                  )}
               
            )}
         

         {/* MISSION LOG DRAWER */}
         {selectedJo && (
            
               {/* Mobile: full-screen overlay */}
               {showLog && (
                   setShowLog(false)} />
               )}
                
                  
                     Mission Log
                      setShowLog(false)}
                        className="w-8 h-8 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center"
                     >
                        
                     
                  
                  
                     
                  
               
            
         )}

         {/* 🎬 TRIP REPLAY / BLACKBOX TELEMETRY MODAL */}
          setReplayJo(null)} 
           jobOrder={replayJo} 
         />
      
   );
}
