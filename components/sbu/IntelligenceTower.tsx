'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { 
  Truck, 
  Search, 
  Loader2,
  CheckCircle2,
  RefreshCcw,
  User,
  Target,
  MessageSquare,
  Box,
  MapPin,
  Clock,
  Navigation,
  History,
  Package,
  Menu,
  X,
  ChevronLeft
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import dynamic from 'next/dynamic';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

const IntelligenceMap = dynamic(() => import('./IntelligenceMap'), { 
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-slate-100 flex flex-col items-center justify-center rounded-xl">
      <Loader2 className="w-6 h-6 text-blue-600 animate-spin mb-2" />
      <p className="text-slate-400 text-xs">Loading map...</p>
    </div>
  )
});

const MissionTimeline = dynamic(() => import('./MissionTimeline'), { ssr: false });

export default function IntelligenceTower() {
  const supabase = createClient();
  const { profile } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [selectedJoId, setSelectedJoId] = useState<string | null>(null);
  const [showLog, setShowLog] = useState(false);
  const [focusedLocation, setFocusedLocation] = useState<{ lat: number, lng: number, title: string } | null>(null);
  
  // Mobile UI state
  const [showSidebar, setShowSidebar] = useState(false);
  const [activeTab, setActiveTab] = useState<'map' | 'details' | 'log'>('map');

  const fetchData = useCallback(async (silent = false) => {
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
        console.error('Failed to resolve fallback tenant ID for IntelligenceTower:', e);
      }
    }

    if (!tenantId) {
      setLoading(false);
      return;
    }

    if (!silent) setLoading(true);
    
    try {
      const queryBuilder = supabase.from('job_orders').select(`
        id, jo_number, status, accepted_at, started_at, loaded_at, unloaded_at, completed_at, updated_at, tracking_token, driver_link_token,
        driver_id, fleet_id, driver_response,
        wo_item:wo_items!wo_item_id (
            id, item_data,
            wo:work_orders!wo_id (
                id, wo_number,
                customer:md_entities!customer_id (id, name, phone)
            )
        )
      `)
      .eq('tenant_id', tenantId)
      .not('driver_id', 'is', null)
      .not('fleet_id', 'is', null)
      .order('created_at', { ascending: false });

      const { data: jos, error: joError } = await queryBuilder;

      if (joError) throw joError;

      const DONE_STATUSES = ['COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED', 'READY_FOR_BILLING', 'AWAITING_AUDIT', 'DONE', 'INVOICED', 'PAID'];
      const REJECTED_STATUSES = ['REJECTED', 'HANDOVER_REJECTED', 'CANCELLED'];
      const activeJos = (jos || []).filter(jo => {
        const s = jo.status?.toUpperCase() || '';
        return !DONE_STATUSES.includes(s) && !REJECTED_STATUSES.includes(s);
      });

      if (activeJos.length > 0) {
        const joIds = activeJos.map(j => j.id);
        const driverIds = [...new Set(activeJos.map(j => j.driver_id).filter(Boolean))];
        const fleetIds = [...new Set(activeJos.map(j => j.fleet_id).filter(Boolean))];

        const [driversRes, fleetsRes, routesRes, trackingRes] = await Promise.all([
          driverIds.length > 0 ? supabase.from('md_drivers').select('id, name, phone').in('id', driverIds) : { data: [] },
          fleetIds.length > 0 ? supabase.from('md_fleets').select('id, plate_number, fleet_type:md_fleet_types!fleet_type_id(type_name, icon_url)').in('id', fleetIds) : { data: [] },
          supabase.from('job_routes').select('*').in('job_order_id', joIds).order('sequence', { ascending: true }),
          supabase.from('job_tracking').select('*').in('job_order_id', joIds).order('created_at', { ascending: false }),
        ]);

        let docsRes: any = { data: null };
        try {
          docsRes = await supabase.from('documents').select('*').in('job_order_id', joIds);
        } catch (_) {
          docsRes = { data: null };
        }

        const processedJos = activeJos.map(jo => {
          const joDriver = driversRes.data?.find(d => d.id === jo.driver_id);
          const joFleet = fleetsRes.data?.find(f => f.id === jo.fleet_id);
          const joRoutes = ((routesRes.data as any[]) || []).filter((r: any) => r.job_order_id === jo.id);
          const joTracking = ((trackingRes.data as any[]) || []).filter((t: any) => t.job_order_id === jo.id);
          const attachments = (docsRes?.data || []).filter((d: any) => d.job_order_id === jo.id);
          
          const isStarted = jo.started_at !== null;
          const isCompleted = jo.completed_at !== null;
          const isAccepted = jo.driver_response === 'accepted';

          let category = 'assigned';
          if (isCompleted || DONE_STATUSES.includes(jo.status?.toUpperCase() || '')) category = 'completed';
          else if (isStarted || jo.status === 'in_progress' || jo.status === 'DALAM PERJALANAN' || (jo.status && (jo.status.startsWith('MENUJU') || jo.status.startsWith('TIBA')))) category = 'active';
          else if (isAccepted) category = 'active';

          let iconUrl = (joFleet as any)?.fleet_type?.icon_url || null;
          if (iconUrl && !iconUrl.startsWith('http')) {
            const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://nsvkewvmzivudkcczhnk.supabase.co';
            iconUrl = `${baseUrl}/storage/v1/object/public/logos/${iconUrl}`;
          }

          return {
            ...jo,
            drivers: joDriver,
            fleets: joFleet,
            fleet_type_name: (joFleet as any)?.fleet_type?.type_name || 'Truck',
            icon_url: iconUrl,
            wo_id: jo.wo_item?.wo?.id || null,
            wo_number: jo.wo_item?.wo?.wo_number || 'NO WO',
            customer_name: jo.wo_item?.wo?.customer?.name || 'PRIVATE CLIENT',
            customer_phone: jo.wo_item?.wo?.customer?.phone || null,
            plate_number: (joFleet as any)?.plate_number || 'NO PLATE',
            driver_name: joDriver?.name || 'NO DRIVER',
            driver_phone: joDriver?.phone || null,
            routes: joRoutes,
            tracking_history: joTracking,
            attachments: attachments,
            latest_log: joTracking[0],
            category
          };
        });

        setJobOrders(processedJos);
        // [AI] Don't auto-select first job - let user click marker to see details
        setLastRefreshed(new Date());
      } else {
        setJobOrders([]);
      }
    } catch (err) {
      console.error("Mission Radar Fetch Error:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase, profile?.tenant_id, profile?.role, selectedJoId]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(() => fetchData(true), 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const filteredJos = useMemo(() => {
      if (!searchQuery) return jobOrders;
      const q = searchQuery.toLowerCase();
      return jobOrders.filter(j => 
        j.jo_number?.toLowerCase().includes(q) || 
        j.plate_number?.toLowerCase().includes(q) ||
        j.customer_name?.toLowerCase().includes(q) ||
        j.wo_number?.toLowerCase().includes(q)
      );
  }, [jobOrders, searchQuery]);

  const selectedJo = useMemo(() => jobOrders.find(j => j.id === selectedJoId) || null, [jobOrders, selectedJoId]);

  const groupedByWO = useMemo(() => {
    const groups: { [key: string]: any[] } = {};
    filteredJos.forEach(jo => {
      if (!groups[jo.wo_number]) groups[jo.wo_number] = [];
      groups[jo.wo_number].push(jo);
    });
    return groups;
  }, [filteredJos]);

  const activeCount = jobOrders.filter(j => j.category === 'active').length;
  const assignedCount = jobOrders.filter(j => j.category === 'assigned').length;

  const handleSelectJob = (joId: string) => {
    setSelectedJoId(joId);
    setShowLog(false);
    setShowSidebar(false);
    setActiveTab('map');
  };

  const handleShareToCustomer = (woJos: any[]) => {
    if (!woJos || woJos.length === 0) return;

    const firstJo = woJos[0];
    const woId = firstJo.wo_id || firstJo.wo_item?.wo?.id || null;
    const woNumber = firstJo.wo_number || firstJo.wo_item?.wo?.wo_number || 'N/A';
    const customerName = firstJo.customer_name || 'Pelanggan';
    
    const link = woId
      ? `${window.location.origin}/track/wo/${woId}`
      : `${window.location.origin}/track/${firstJo.driver_link_token || firstJo.tracking_token || firstJo.id}`;
    
    const joList = woJos.map((j: any) => `• ${j.plate_number} — ${j.driver_name}`).join('\n');
    const message = `Halo ${customerName},\n\nBerikut link pelacakan pengiriman Anda:\n${woNumber}\n\nArmada:\n${joList}\n\nPantau secara real-time:\n${link}`;
    
    let phone = firstJo.customer_phone || '';
    phone = phone.replace(/\D/g, '');
    if (phone.startsWith('0')) phone = '62' + phone.substring(1);
    if (phone.startsWith('8')) phone = '62' + phone;

    if (phone && phone.length >= 10) {
      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    } else {
      window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
    }
    toast.success('Membuka WhatsApp...');
  };

  // Reusable sidebar content
  const SidebarContent = () => (
    <>
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {Object.keys(groupedByWO).length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-slate-200" />
            </div>
            <p className="text-xs text-slate-500 font-medium">No active shipments</p>
            <p className="text-[10px] text-slate-400 mt-1">Assigned jobs will appear here</p>
          </div>
        ) : (
          Object.entries(groupedByWO).map(([woNum, jos]) => (
            <div key={woNum}>
              <div className="px-2 mb-1">
                <div className="flex items-center gap-2">
                  <Box className="w-3 h-3 text-slate-400" />
                  <span className="text-xs font-medium text-slate-600">{woNum}</span>
                  <span className="text-[10px] text-slate-400 flex-1 truncate">{jos[0].customer_name}</span>
                </div>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); handleShareToCustomer(jos); }}
                className="w-full mb-1.5 h-8 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 hover:border-emerald-300 rounded-lg text-[11px] font-semibold text-emerald-700 flex items-center justify-center gap-1.5 transition-all"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                Share WA ke Pelanggan
              </button>
              <div className="space-y-1">
                {jos.map(jo => {
                  const isSelected = selectedJoId === jo.id;
                  return (
                    <button
                      key={jo.id}
                      onClick={() => handleSelectJob(jo.id)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-200 shadow-sm' 
                          : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                          isSelected ? 'bg-blue-100' : 'bg-slate-100'
                        }`}>
                          {jo.icon_url ? (
                            <img src={jo.icon_url} alt="" className="w-4 h-4 object-contain" crossOrigin="anonymous" />
                          ) : (
                            <Truck className={`w-4 h-4 ${isSelected ? 'text-blue-600' : 'text-slate-500'}`} />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between mb-0.5">
                            <span className="text-xs font-medium text-slate-900 truncate">{jo.plate_number}</span>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ml-1 ${
                              jo.category === 'active' 
                                ? 'bg-emerald-100 text-emerald-700' 
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                              {jo.category === 'active' ? 'Active' : 'Assigned'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-500 truncate">{jo.jo_number}</p>
                          <div className="flex items-center justify-between mt-0.5">
                            <span className="text-[10px] text-slate-400 truncate">{jo.driver_name}</span>
                            {jo.latest_log && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
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

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>Last sync</span>
          <span className="font-mono">{lastRefreshed ? format(lastRefreshed, 'HH:mm:ss') : '--:--:--'}</span>
        </div>
      </div>
    </>
  );

  if (loading && jobOrders.length === 0) {
    return (
      <div className="h-[calc(100vh-4rem)] w-full bg-white flex flex-col items-center justify-center">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin mb-3" />
        <p className="text-slate-500 text-sm font-medium">Loading fleet data...</p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] bg-slate-50 flex flex-col">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-slate-200 px-3 md:px-4 py-2.5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          {/* Mobile: sidebar toggle */}
          <button 
            onClick={() => setShowSidebar(true)}
            className="w-8 h-8 bg-slate-50 hover:bg-slate-100 rounded-lg flex items-center justify-center border border-slate-200 lg:hidden"
          >
            <Menu size={16} className="text-slate-600" />
          </button>
          <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
            <Target className="w-4 h-4 text-blue-600" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-semibold text-slate-900">Fleet Tracking</h1>
            <p className="text-[10px] text-slate-400">Real-time monitoring</p>
          </div>
        </div>

        {/* Stats - hidden on very small screens */}
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 rounded-lg">
            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-medium text-emerald-700">{activeCount} On Journey</span>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 rounded-lg">
            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
            <span className="text-[10px] font-medium text-blue-700">{assignedCount} Assigned</span>
          </div>
        </div>

        {/* Search - hidden on mobile, shown in sidebar */}
        <div className="hidden lg:block relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
          <input 
            placeholder="Search JO, plate, customer..." 
            className="w-56 h-8 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Refresh */}
        <button 
          onClick={() => { fetchData(); toast.success('Data refreshed'); }}
          className="h-8 px-3 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all"
        >
          <RefreshCcw className="w-3 h-3" />
          <span className="hidden sm:inline">Refresh</span>
        </button>
      </div>

      {/* Mobile: stats bar */}
      <div className="md:hidden flex items-center gap-2 px-3 py-1.5 bg-slate-50 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded">
          <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
          <span className="text-[10px] font-medium text-emerald-700">{activeCount} Active</span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 rounded">
          <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
          <span className="text-[10px] font-medium text-blue-700">{assignedCount} Assigned</span>
        </div>
        {selectedJo && (
          <div className="ml-auto flex items-center gap-1">
            <span className="text-[10px] text-slate-500 truncate">{selectedJo.plate_number}</span>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
              selectedJo.category === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'
            }`}>
              {selectedJo.category === 'active' ? 'Active' : 'Assigned'}
            </span>
          </div>
        )}
      </div>

      {/* Mobile: tab bar */}
      {selectedJo && (
        <div className="lg:hidden flex items-center border-b border-slate-200 bg-white shrink-0">
          {[
            { key: 'map' as const, label: 'Map', icon: MapPin },
            { key: 'details' as const, label: 'Details', icon: Truck },
            { key: 'log' as const, label: 'Log', icon: History },
          ].map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-medium transition-all border-b-2 ${
                activeTab === tab.key
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              <tab.icon size={14} />
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Left Sidebar */}
        <div className="hidden lg:flex w-72 bg-white border-r border-slate-200 flex-col shrink-0">
          {/* Search in sidebar */}
          <div className="p-3 border-b border-slate-100">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input 
                placeholder="Search..." 
                className="w-full h-8 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-blue-500 outline-none transition-all"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <SidebarContent />
        </div>

        {/* Mobile sidebar overlay */}
        {showSidebar && (
          <>
            <div className="fixed inset-0 bg-black/30 z-40 lg:hidden" onClick={() => setShowSidebar(false)} />
            <div className="fixed inset-y-0 left-0 w-72 bg-white z-50 flex flex-col shadow-xl lg:hidden">
              <div className="flex items-center justify-between p-3 border-b border-slate-200">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-semibold text-slate-900">Shipments</span>
                </div>
                <button onClick={() => setShowSidebar(false)} className="w-8 h-8 rounded-lg hover:bg-slate-100 flex items-center justify-center">
                  <X size={16} className="text-slate-500" />
                </button>
              </div>
              <div className="p-3 border-b border-slate-100">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                  <input 
                    placeholder="Search..." 
                    className="w-full h-8 pl-8 pr-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:bg-white focus:border-blue-500 outline-none transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
              <SidebarContent />
            </div>
          </>
        )}

        {/* Center Content */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {!selectedJo ? (
            <div className="flex-1 flex flex-col items-center justify-center bg-white">
              <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                <Navigation className="w-8 h-8 text-slate-200" />
              </div>
              <h3 className="text-sm font-medium text-slate-500 mb-1">Select a shipment</h3>
              <p className="text-xs text-slate-400">Choose from the sidebar to view details</p>
            </div>
          ) : (
            <>
              {/* Map - shown on desktop always, on mobile when tab='map' */}
              <div className={`flex-1 p-3 min-h-0 ${activeTab !== 'map' ? 'hidden lg:block' : ''}`}>
                <div className="h-full bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <IntelligenceMap 
                    missions={jobOrders} 
                    selectedMissionId={selectedJoId}
                    onSelectMission={(m) => setSelectedJoId(m ? m.id : null)}
                    focusedLocation={focusedLocation}
                  />
                </div>
              </div>

              {/* Details Panel - shown on desktop always, on mobile when tab='details' */}
              <div className={`${activeTab !== 'details' ? 'hidden lg:block' : ''} bg-white border-t border-slate-200 lg:border-t-0 shrink-0`}>
                {/* Mobile: collapsible header */}
                <div className="lg:hidden flex items-center justify-between px-3 py-2 border-b border-slate-100">
                  <span className="text-xs font-medium text-slate-700">Job Details</span>
                  <button onClick={() => setActiveTab('map')} className="text-[10px] text-blue-600 flex items-center gap-1">
                    <ChevronLeft size={12} /> Back to map
                  </button>
                </div>

                <div className="p-3 md:p-4">
                  {/* Job Info - responsive grid */}
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
                    <div>
                      <p className="text-[10px] text-slate-400 mb-0.5">Job Order</p>
                      <p className="text-xs font-semibold text-slate-900 truncate">{selectedJo.jo_number}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 mb-0.5">Customer</p>
                      <p className="text-xs font-semibold text-slate-900 truncate">{selectedJo.customer_name}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 mb-0.5">Driver</p>
                      <div className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-400" />
                        <p className="text-xs font-semibold text-slate-900 truncate">{selectedJo.driver_name}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 mb-0.5">Vehicle</p>
                      <p className="text-xs font-semibold text-slate-900 truncate">{selectedJo.plate_number}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-slate-400 mb-0.5">Status</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                        selectedJo.category === 'active' 
                          ? 'bg-emerald-100 text-emerald-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {selectedJo.category === 'active' ? (
                          <><div className="w-1 h-1 bg-emerald-500 rounded-full mr-1 animate-pulse" /> On Journey</>
                        ) : (
                          <><div className="w-1 h-1 bg-blue-500 rounded-full mr-1" /> Assigned</>
                        )}
                      </span>
                    </div>
                    {/* Actions - only visible on larger screens in this grid */}
                    <div className="hidden lg:flex items-center gap-2">
                      <button 
                        onClick={() => { setShowLog(!showLog); setActiveTab('map'); }}
                        className={`h-7 px-2 rounded-lg text-[10px] font-medium flex items-center gap-1 border transition-all ${
                          showLog 
                            ? 'bg-blue-50 text-blue-700 border-blue-200' 
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <History className="w-3 h-3" />
                        Log
                      </button>
                    </div>
                  </div>

                  {/* Mobile action button - Log shortcut (Share is FAB) */}
                  <div className="lg:hidden mb-3">
                    <button 
                      onClick={() => setActiveTab('log')}
                      className="w-full h-9 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all"
                    >
                      <History className="w-3.5 h-3.5" />
                      View Mission Log
                    </button>
                  </div>

                  {/* Route Stops */}
                  {selectedJo.routes && selectedJo.routes.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {selectedJo.routes.map((route: any, idx: number) => (
                        <div 
                          key={route.id} 
                          className={`min-w-[180px] p-2.5 rounded-lg border transition-all cursor-pointer ${
                            ['completed', 'arrived', 'departed'].includes(route.status) 
                              ? 'bg-emerald-50 border-emerald-100' 
                              : 'bg-white border-slate-100 hover:border-slate-200'
                          }`}
                          onClick={() => {
                            if (route.latitude && route.longitude) {
                              setFocusedLocation({ lat: route.latitude, lng: route.longitude, title: route.location_name });
                            }
                          }}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <div className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-semibold shrink-0 ${
                              ['completed', 'arrived', 'departed'].includes(route.status) 
                                ? 'bg-emerald-500 text-white' 
                                : 'bg-slate-100 text-slate-500'
                            }`}>
                              {idx + 1}
                            </div>
                            <div className="min-w-0 flex-1">
                              <span className={`text-[10px] font-medium ${
                                ['completed', 'arrived', 'departed'].includes(route.status) ? 'text-emerald-600' : 'text-slate-500'
                              }`}>
                                {route.stop_type}
                              </span>
                              <p className="text-xs font-medium text-slate-900 truncate">{route.location_name}</p>
                            </div>
                          </div>
                          <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className={`h-full transition-all duration-500 ${
                              ['completed', 'arrived', 'departed'].includes(route.status) ? 'w-full bg-emerald-500' : 'w-0'
                            }`} />
                          </div>
                          {route.pod_photo_url && (
                            <div className="mt-1.5 flex items-center gap-1 text-[10px] text-emerald-600 font-medium">
                              <CheckCircle2 className="w-3 h-3" /> Photo attached
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Desktop Right Drawer - Mission Log */}
        {selectedJo && showLog && (
          <div className="hidden lg:flex w-80 bg-white border-l border-slate-200 flex-col shrink-0">
            <div className="p-3 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-slate-900">Mission Log</h3>
                <p className="text-[10px] text-slate-400">{selectedJo.jo_number}</p>
              </div>
              <button 
                onClick={() => setShowLog(false)}
                className="w-7 h-7 rounded-lg hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-all"
              >
                <X size={14} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
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
        )}

        {/* Mobile: Log as full view when tab='log' */}
        {selectedJo && activeTab === 'log' && (
          <div className="lg:hidden flex flex-col bg-white shrink-0 overflow-y-auto">
            <div className="p-3 border-b border-slate-100 sticky top-0 bg-white z-10">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold text-slate-900">Mission Log</h3>
                  <p className="text-[10px] text-slate-400">{selectedJo.jo_number}</p>
                </div>
                <button 
                  onClick={() => setActiveTab('map')}
                  className="text-[10px] text-blue-600 flex items-center gap-1"
                >
                  <ChevronLeft size={12} /> Back
                </button>
              </div>
            </div>
            <div className="flex-1 p-3">
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
        )}
      </div>
    </div>
  );
}
