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
      <div className="h-full w-full rounded-2xl bg-slate-900 flex flex-col items-center justify-center border border-slate-800 p-6">
         <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
         <p className="text-slate-300 text-xs font-black uppercase tracking-wider">Memuat Radar Satelit Terpadu...</p>
      </div>
   )
});

const TripReplayModal = dynamic(() => import('./TripReplayModal'), { ssr: false });

export default function FleetTrackingConsole() {
   const { profile } = useAuth();
   const searchParams = useSearchParams();
   const joParam = searchParams?.get('jo') || null;
   const [jobOrders, setJobOrders] = useState<any[]>([]);
   const [allJobOrders, setAllJobOrders] = useState<any[]>([]);
   const [selectedJoId, setSelectedJoId] = useState<string | null>(null);
   const [selectedWoGroup, setSelectedWoGroup] = useState<string | null>('ALL');
   const [expandedWoGroups, setExpandedWoGroups] = useState<{ [key: string]: boolean }>({});
   const selectedJo = useMemo(() => (allJobOrders.length > 0 ? allJobOrders : jobOrders).find(j => j.id === selectedJoId) || null, [allJobOrders, jobOrders, selectedJoId]);
   const [loading, setLoading] = useState(true);
   const [searchQuery, setSearchQuery] = useState('');
   const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
   const [showLog, setShowLog] = useState(false);
   const [mounted, setMounted] = useState(false);
   const [focusedLocation, setFocusedLocation] = useState<{ lat: number, lng: number, title: string } | null>(null);
   
   // UI sidebar state (works universally for desktop slide-out and mobile overlay)
   const [isSidebarOpen, setIsSidebarOpen] = useState(true);
   const [showMissionPanel, setShowMissionPanel] = useState(true);
   const [replayJo, setReplayJo] = useState<any>(null);

   useEffect(() => {
      setMounted(true);
      if (typeof window !== 'undefined' && window.innerWidth < 1024) {
         setIsSidebarOpen(false);
      }
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
      <>
         <div className="p-3 border-b border-slate-200 space-y-2.5">
            <div className="flex items-center justify-between">
               <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm shadow-blue-500/20">
                     <Navigation size={15} className="-rotate-45" />
                  </div>
                   <div>
                      <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">Live Radar Armada</h2>
                      <p className="text-[10px] font-medium text-slate-400">{(allJobOrders.length > 0 ? allJobOrders.length : jobOrders.length)} Armada • {Object.keys(groupedByWO).length} Proyek WO</p>
                   </div>
               </div>
               <div className="flex items-center gap-1.5">
                  <button 
                     onClick={() => window.open('/radar', '_blank')}
                     className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center justify-center transition-all text-slate-600"
                     title="Buka Radar Layar Penuh (Tab Baru)"
                  >
                     <Maximize2 size={13} />
                  </button>
                  <button 
                     onClick={() => setIsSidebarOpen(false)}
                     className="w-7 h-7 bg-slate-100 hover:bg-slate-200 hover:bg-rose-100 hover:text-rose-600 rounded-lg flex items-center justify-center transition-all text-slate-600"
                     title="Sembunyikan Panel (Perluas Peta)"
                  >
                     <ChevronLeft size={16} />
                  </button>
               </div>
            </div>

            {/* Master Toggle: Semua Armada */}
            <button
               onClick={() => {
                  setSelectedJoId(null);
                  setSelectedWoGroup('ALL');
                  if (typeof window !== 'undefined' && window.innerWidth < 1024) setIsSidebarOpen(false);
                  setShowMissionPanel(false);
               }}
               className={`w-full text-left px-3 py-2 rounded-xl border transition-all flex items-center justify-between ${
                  selectedWoGroup === 'ALL' && !selectedJoId
                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20 font-black"
                  : "bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700 hover:bg-slate-800"
               }`}
            >
               <div className="flex items-center gap-2">
                  <Truck size={14} className={selectedWoGroup === 'ALL' && !selectedJoId ? "text-white" : "text-blue-400"} />
                  <span className="text-xs uppercase tracking-wider font-extrabold">🌐 Tampilkan Semua Armada</span>
               </div>
                   <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${selectedWoGroup === 'ALL' && !selectedJoId ? "bg-white/20 text-white" : "bg-slate-800 text-slate-300"}`}>
                   {(allJobOrders.length > 0 ? allJobOrders.length : jobOrders.length)} Unit
                   </span>
            </button>
         
            <div className="relative">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
               <input
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400"
                  placeholder="Cari nopol, supir, atau WO..."
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
               <>
                  {/* WORK ORDER ACCORDION GROUPS */}
                  {Object.entries(groupedByWO).map(([woNum, jos]) => {
                     const isWoSelected = selectedWoGroup === woNum && !selectedJoId;
                     const isExpanded = expandedWoGroups[woNum] ?? (Object.keys(groupedByWO).length === 1);
                     const activeCount = jos.filter(j => ['IN_PROGRESS', 'DALAM PERJALANAN', 'ON_ROAD', 'MENUJU ASAL', 'TIBA DI ASAL', 'PICKING_UP', 'DELIVERING'].includes((j.status || '').toUpperCase())).length;

                     return (
                        <div key={woNum} className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50/50 p-2 overflow-hidden transition-all">
                           {/* WO Accordion Header Button */}
                           <div className="flex items-center justify-between gap-1">
                              <button
                                 onClick={() => {
                                    setSelectedJoId(null);
                                    setSelectedWoGroup(woNum);
                                    setExpandedWoGroups(prev => ({ ...prev, [woNum]: !isExpanded }));
                                    if (typeof window !== 'undefined' && window.innerWidth < 1024) setIsSidebarOpen(false);
                                    setShowMissionPanel(false);
                                 }}
                                 className={`flex-1 text-left p-2.5 rounded-xl transition-all flex items-center justify-between border ${
                                    isWoSelected
                                    ? "bg-blue-50 border-blue-300 shadow-sm"
                                    : "bg-white border-slate-200/80 hover:border-blue-200"
                                 }`}
                              >
                                 <div className="flex items-center gap-2 min-w-0">
                                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 font-black text-[10px] ${isWoSelected ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" : "bg-blue-50 text-blue-600 border border-blue-100"}`}>
                                       WO
                                    </div>
                                    <div className="min-w-0">
                                       <h3 className={`text-xs font-black truncate tracking-tight ${isWoSelected ? "text-blue-700" : "text-slate-800"}`}>{woNum}</h3>
                                       <p className="text-[10px] font-semibold text-slate-400 truncate">{jos[0].customer_name}</p>
                                    </div>
                                 </div>
                                 <div className="flex flex-col items-end shrink-0 ml-2">
                                    <span className="text-[10px] font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                                       {jos.length} Armada
                                    </span>
                                    <span className="text-[9px] font-bold text-emerald-600 mt-0.5">
                                       🟢 {jos.length - activeCount} / 🔵 {activeCount}
                                    </span>
                                 </div>
                               </button>

                               {/* Expand/Collapse Dropdown Arrow */}
                              <button
                                 onClick={(e) => {
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
                                 <ChevronRight size={16} className={`transition-transform duration-300 ${isExpanded ? "rotate-90 text-blue-600 font-bold" : ""}`} />
                              </button>
                            </div>

                            {/* Send WA to Customer - full width below header */}
                            <button
                               onClick={(e) => {
                                  e.stopPropagation();
                                  handleShareToCustomer(woNum);
                               }}
                               className="w-full mt-1.5 h-8 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 rounded-lg text-[11px] font-semibold text-emerald-700 flex items-center justify-center gap-1.5 transition-all"
                               title="Kirim WA ke Pelanggan (Bundling semua JO di WO ini)"
                            >
                               <MessageSquare className="w-3.5 h-3.5" />
                               Kirim WA ke Pelanggan
                            </button>

                            {/* Sub-JO Accordion List (1 WO -> 10 JO) */}
                           {isExpanded && (
                              <div className="space-y-1 pl-3 pt-1.5 border-l-2 border-blue-400/30 ml-2.5 transition-all">
                                 {jos.map(jo => {
                                    const isSelected = selectedJoId === jo.id;
                                    return (
                                       <button
                                          key={jo.id}
                                          onClick={() => {
                                             setSelectedJoId(jo.id);
                                             setSelectedWoGroup(woNum);
                                             if (typeof window !== 'undefined' && window.innerWidth < 1024) setIsSidebarOpen(false);
                                             setShowMissionPanel(true);
                                          }}
                                          className={`w-full text-left p-2.5 rounded-xl border transition-all duration-200 ${
                                             isSelected 
                                             ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20" 
                                             : "bg-white border-slate-200/90 hover:border-blue-300 hover:bg-blue-50/30"
                                          }`}
                                       >
                                          <div className="flex items-center gap-2.5">
                                             <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isSelected ? "bg-white/20" : "bg-slate-100"}`}>
                                                {jo.fleet_icon ? (
                                                   <img src={jo.fleet_icon} alt="" className="w-4 h-4 object-contain" crossOrigin="anonymous" />
                                                ) : (
                                                   <Truck size={13} className={isSelected ? "text-white" : "text-slate-400"} />
                                                )}
                                             </div>
                                             <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between gap-2 mb-0.5">
                                                   <span className={`text-[10px] font-extrabold ${isSelected ? "text-blue-100" : "text-blue-600"}`}>{jo.jo_number}</span>
                                                   <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${isSelected ? "bg-white/20 text-white border-white/30" : getStatusColor(jo.status)}`}>{jo.status?.replace(/_/, ' ')}</span>
                                                </div>
                                                <h4 className={`text-xs font-black truncate leading-tight mb-0.5 ${isSelected ? "text-white" : "text-slate-800"}`}>{jo.plate_number}</h4>
                                                <div className="flex items-center justify-between">
                                                   <p className={`text-[10px] truncate font-medium ${isSelected ? "text-blue-100" : "text-slate-400"}`}>{jo.driver_name}</p>
                                                   {jo.latest_log && (
                                                      <span className={`text-[9px] font-bold flex items-center gap-0.5 ${isSelected ? "text-blue-100" : "text-slate-400"}`}>
                                                         <Clock size={9} />
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
                           )}
                        </div>
                     );
                  })}
               </>
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
       {/* DESKTOP SIDEBAR (Slide out / Collapsible for wider map view) */}
       <div className={`hidden lg:flex flex-col border-r border-slate-200 bg-white relative z-50 transition-all duration-300 ease-in-out shrink-0 overflow-hidden ${
          isSidebarOpen ? 'w-80 opacity-100' : 'w-0 opacity-0 border-none pointer-events-none'
       }`}>
          <div className="w-80 h-full flex flex-col">
             <SidebarContent />
          </div>
       </div>

         {/* MOBILE SIDEBAR OVERLAY */}
         {isSidebarOpen && (
            <>
               <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
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
                  onClick={() => setIsSidebarOpen(true)}
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

            {/* UNIFIED PERSISTENT RADAR MAP (No map unmounting when switching between WO card and single JO) */}
            <div className="flex-1 p-3 lg:p-4 relative min-h-0 bg-slate-900 flex flex-col">
               {/* Overlay Status Badge & Quick Navigation Controls */}
               <div className="absolute top-6 left-6 z-10 flex flex-wrap items-center gap-2">
                  {!isSidebarOpen && (
                     <button
                        onClick={() => setIsSidebarOpen(true)}
                        className="hidden lg:flex bg-slate-900/90 hover:bg-slate-800 text-white backdrop-blur-md border border-slate-700/80 rounded-2xl p-3 shadow-2xl items-center gap-2 transition-all hover:scale-105 group shrink-0"
                        title="Tampilkan Panel Daftar Armada"
                     >
                        <ChevronRight size={18} className="text-blue-400 group-hover:scale-125 transition-transform" />
                        <span className="text-xs font-black uppercase tracking-wider">Daftar Armada</span>
                     </button>
                  )}
                  {!selectedJo ? (
                     <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 max-w-md">
                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shrink-0 shadow-lg shadow-blue-600/30">
                           <Truck size={20} />
                        </div>
                        <div className="min-w-0">
                           <span className="text-[10px] font-black uppercase tracking-widest text-blue-400 block leading-none mb-1">
                              {selectedWoGroup === 'ALL' || !selectedWoGroup ? 'Consolidated Radar' : `Work Order Radar`}
                           </span>
                           <h3 className="text-sm font-black text-white leading-tight truncate">
                              {selectedWoGroup === 'ALL' || !selectedWoGroup 
                                 ? `Semua Armada Aktif (${jobOrders.length} Unit)` 
                                 : `${(groupedByWO[selectedWoGroup] || []).length} Armada Jalan • ${(groupedByWO[selectedWoGroup] || [])[0]?.customer_name || selectedWoGroup}`}
                           </h3>
                        </div>
                     </div>
                  ) : (
                     <div className="flex items-center gap-2">
                        <button
                           onClick={() => setSelectedJoId(null)}
                           className="bg-slate-900/90 hover:bg-slate-900 text-white backdrop-blur-md border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 shadow-2xl transition-all hover:scale-105"
                           title="Kembali memantau seluruh armada WO / konsolidasi"
                        >
                           <span>⬅ Kembali ke Radar {selectedWoGroup === 'ALL' || !selectedWoGroup ? 'Semua Armada' : `WO ${selectedWoGroup}`}</span>
                        </button>
                        <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-xl px-3.5 py-2 shadow-2xl hidden sm:flex items-center gap-2">
                           <span className="text-[10px] font-extrabold text-blue-400 uppercase tracking-wider">Fokus Truk:</span>
                           <span className="text-xs font-black text-white">{selectedJo.plate_number}</span>
                           <span className="text-[10px] font-bold text-slate-300">({selectedJo.driver_name})</span>
                        </div>
                     </div>
                  )}
               </div>

               {/* Persistent Map Canvas */}
               <div className="w-full h-full rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative">
                  <UnifiedMissionRadarMap 
                     jobOrders={jobOrders}
                     selectedJoId={selectedJoId}
                     selectedWoGroup={selectedWoGroup}
                     onSelectJo={(jo) => {
                        setSelectedJoId(jo.id);
                        setSelectedWoGroup(jo.wo_number);
                        setShowMissionPanel(true);
                     }}
                     focusedLocation={focusedLocation}
                  />
               </div>
            </div>

            {/* MISSION DETAILS BOTTOM PANEL (Appears when single JO selected) */}
            {selectedJo && (
               <>
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
                                 onClick={() => setReplayJo(selectedJo)}
                                 className="px-3.5 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5 bg-gradient-to-r from-cyan-400 to-blue-500 hover:from-cyan-300 hover:to-blue-400 text-slate-950 shadow-md hover:shadow-cyan-500/20 active:scale-95 uppercase tracking-wider"
                              >
                                 🎬 Trip Replay (Blackbox)
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
                   showLog ? "translate-x-0 lg:w-96" : "translate-x-full lg:translate-x-0 lg:w-0 lg:overflow-hidden"
                } fixed lg:relative right-0 top-0 bottom-0 w-full md:w-96 bg-white border-l border-slate-200 z-50 lg:z-auto transition-all duration-300 flex flex-col shadow-xl lg:shadow-none`}>
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

         {/* 🎬 TRIP REPLAY / BLACKBOX TELEMETRY MODAL */}
         <TripReplayModal 
           isOpen={!!replayJo} 
           onClose={() => setReplayJo(null)} 
           jobOrder={replayJo} 
         />
      </div>
   );
}
