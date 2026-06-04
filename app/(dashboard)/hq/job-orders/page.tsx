'use client';

import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  Truck, User, MapPin, Calendar,
  Search, Loader2,
  Clock, CheckCircle2, Navigation as NavIcon,
  AlertCircle, Activity, ClipboardList,
  Phone, X, FileText, Layers, Box,
  Warehouse, Ship, LayoutGrid
} from 'lucide-react';
import { SBU_MAP } from '@/lib/utils/sbuMapping';
import { toast, Toaster } from 'react-hot-toast';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useSearchParams } from 'next/navigation';
import { getAdvancedJobCategory as getJobCategory } from '@/lib/domain/jo/status';
import Link from 'next/link';
import RejectedViewModal from '../work-orders/components/RejectedViewModal';

const supabase = createClient();

const TABS = [
  { id: 'all', label: 'All', icon: Layers },
  { id: 'new', label: 'New', icon: Box },
  { id: 'assigned', label: 'Assigned', icon: Truck },
  { id: 'active', label: 'On Road', icon: NavIcon },
  { id: 'rejected', label: 'Rejected', icon: AlertCircle },
  { id: 'completed', label: 'Done', icon: CheckCircle2 },
];

// [AI] SBU visual indicators for JO cards — colors aligned with SBU_MAP
const SBU_BADGE_CONFIG: Record<string, {
  label: string; icon: React.ElementType;
  bg: string; text: string; border: string;
}> = {
  TRUCKING:   { label: 'Trucking',   icon: Truck,      bg: 'bg-blue-50',    text: 'text-blue-700',    border: 'border-blue-200' },
  WAREHOUSE:  { label: 'Warehouse',  icon: Warehouse,   bg: 'bg-amber-50',   text: 'text-amber-700',   border: 'border-amber-200' },
  CLEARANCE:  { label: 'Clearance',  icon: LayoutGrid,  bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  FORWARDING: { label: 'Forwarding', icon: Ship,        bg: 'bg-indigo-50',  text: 'text-indigo-700',  border: 'border-indigo-200' },
};

export default function HQJobOrdersPage() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();

  const [loading, setLoading] = useState(true);
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showRejectedModal, setShowRejectedModal] = useState(false);
  const [selectedRejectedWo, setSelectedRejectedWo] = useState<any>(null);
  const [showSearch, setShowSearch] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  // [AI] SBU filter state synced with URL
  const [sbuFilter, setSbuFilter] = useState(searchParams.get('sbu') || 'all');

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearchTerm(q);
    
    const sbu = searchParams.get('sbu');
    if (sbu) setSbuFilter(sbu);
  }, [searchParams]);

  const handleSbuFilterChange = (value: string) => {
    setSbuFilter(value);
    const url = new URL(window.location.href);
    if (value === 'all') {
      url.searchParams.delete('sbu');
    } else {
      url.searchParams.set('sbu', value);
    }
    window.history.replaceState({}, '', url.toString());
  };

  useEffect(() => {
    if (showSearch && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [showSearch]);

  const fetchJobOrders = useCallback(async (silent = false) => {
    if (!profile?.tenant_id) return;
    try {
      if (!silent) setLoading(true);

      const { data: baseData, error: baseError } = await supabase
        .from('job_orders')
        .select(`
          *,
          wo_item:wo_items!wo_item_id (
            id, item_data, sbu_type,
            wo:work_orders!wo_id (
              id, wo_number, status, customer:md_entities!customer_id (id, name, legal_name)
            )
          )
        `)
        .eq('tenant_id', profile?.tenant_id)
        .order('created_at', { ascending: false });

      if (baseError) throw baseError;

      const rawJOs = baseData || [];
      const baseJOs = Array.from(new Map(rawJOs.map(jo => [jo.id, jo])).values())
        // [AI] Warehouse JOs usually don't have driver/fleet, so don't exclude them
        .filter(jo => jo.wo_item?.sbu_type === 'WAREHOUSE' || (jo.driver_id && jo.fleet_id));

      if (baseJOs.length > 0) {
        const driverIds = [...new Set(baseJOs.map(j => j.driver_id).filter(Boolean))];
        const fleetIds = [...new Set(baseJOs.map(j => j.fleet_id).filter(Boolean))];
        const warehouseJoIds = baseJOs.filter(j => j.wo_item?.sbu_type === 'WAREHOUSE').map(j => j.id);

        const [driversRes, fleetsRes, warehouseReceiptsRes] = await Promise.all([
          driverIds.length > 0 ? supabase.from('md_drivers').select('id, name, phone').in('id', driverIds) : { data: [] },
          fleetIds.length > 0 ? supabase.from('md_fleets').select('id, plate_number, fleet_type:md_fleet_types!fleet_type_id(type_name)').in('id', fleetIds) : { data: [] },
          warehouseJoIds.length > 0 ? supabase.from('wh_inbound_receipts').select('wo_item_id, driver_name_manual, driver_phone, driver:driver_id(id, name, phone), fleet:fleet_id(id, plate_number, fleet_type:md_fleet_types(type_name))').in('wo_item_id', warehouseJoIds) : { data: [] }
        ]);

        const warehouseReceipts = warehouseReceiptsRes.data || [];

        const enrichedJOs = baseJOs.map(jo => {
          let driverObj = driversRes.data?.find(d => d.id === jo.driver_id);
          let fleetObj = fleetsRes.data?.find(f => f.id === jo.fleet_id);
          let extraPhone = null;

          if (jo.wo_item?.sbu_type === 'WAREHOUSE') {
            const receipt = warehouseReceipts.find(r => r.wo_item_id === jo.id);
            if (receipt) {
              if (receipt.driver) driverObj = receipt.driver;
              else if (receipt.driver_name_manual) {
                driverObj = { name: receipt.driver_name_manual, phone: receipt.driver_phone };
              }
              if (receipt.fleet) fleetObj = receipt.fleet;
            }
          }

          return {
            ...jo,
            md_drivers: driverObj,
            md_fleets: fleetObj,
            driver_phone: jo.driver_phone || extraPhone
          };
        });

        setJobOrders(enrichedJOs);
      } else {
        setJobOrders([]);
      }
    } catch (err: any) {
      console.error('Error fetching HQ JOs:', err?.message || err);
      toast.error(`Gagal mengambil data Job Order: ${err?.message || 'Error Unknown'}`);
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id]);

  useEffect(() => {
    fetchJobOrders();
  }, [fetchJobOrders]);

  // [AI] getJobCategory is now imported from @/lib/domain/jo/status

  const stats = useMemo(() => {
    const categories = jobOrders.map(jo => getJobCategory(jo));
    return {
      total: jobOrders.filter(jo => getJobCategory(jo) !== 'rejected').length,
      needsAssign: categories.filter(c => c === 'awaiting').length,
      assignedCount: categories.filter(c => c === 'assigned').length,
      onJourney: categories.filter(c => c === 'active').length,
      jobDone: categories.filter(c => c === 'completed').length,
      rejected: categories.filter(c => c === 'rejected').length
    };
  }, [jobOrders]);

  const filteredJobs = useMemo(() => {
    return jobOrders.filter(jo => {
      const category = getJobCategory(jo);

      const matchesSearch =
        jo.jo_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        jo.md_drivers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        jo.wo_item?.wo?.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // [AI] Filter by SBU type
      if (sbuFilter !== 'all') {
        const itemSbu = jo.wo_item?.sbu_type?.toUpperCase();
        if (itemSbu !== sbuFilter) return false;
      }

      if (selectedStatus === 'all') return category !== 'rejected';
      if (selectedStatus === 'new') return category === 'awaiting';
      if (selectedStatus === 'rejected') return category === 'rejected';
      return category === selectedStatus;
    });
  }, [jobOrders, searchTerm, selectedStatus, sbuFilter]);

  const getStatusBadge = (jo: any) => {
    const category = getJobCategory(jo);
    const s = jo.status?.toUpperCase();

    if (category === 'completed') {
      let label = 'COMPLETED';
      if (s === 'AWAITING_AUDIT') label = 'JOB DONE';
      if (s === 'READY_FOR_BILLING' || s === 'INVOICED' || s === 'PAID') label = 'BILLING READY';
      return <Badge className="!bg-indigo-950 !text-white !border-indigo-950 font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">{label}</Badge>;
    }
    if (category === 'active') {
      return <Badge className="!bg-emerald-100 !text-emerald-700 !border-emerald-200 font-black text-[9px] px-3 py-1 uppercase tracking-widest italic animate-pulse">ON JOURNEY</Badge>;
    }
    if (category === 'assigned') {
      return <Badge className="!bg-blue-100 !text-blue-700 !border-blue-200 font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">ASSIGNED</Badge>;
    }
    if (category === 'rejected') return <Badge className="!bg-rose-100 !text-rose-700 !border-rose-200 font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">REJECTED</Badge>;
    return <Badge className="!bg-amber-100 !text-amber-700 !border-amber-200 font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">NEW</Badge>;
  };

  const getTabCount = (tabId: string) => {
    switch (tabId) {
      case 'all': return stats.total;
      case 'new': return stats.needsAssign;
      case 'assigned': return stats.assignedCount;
      case 'active': return stats.onJourney;
      case 'rejected': return stats.rejected;
      case 'completed': return stats.jobDone;
      default: return 0;
    }
  };

  if (loading && jobOrders.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-950 animate-spin mb-4" />
        <p className="text-indigo-950 font-black tracking-widest text-[10px] uppercase">Loading Job Orders...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Toaster position="top-right" />

      {/* ===== MOBILE HEADER (sticky) ===== */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-200 lg:hidden">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
                <Truck size={18} />
              </div>
              <div>
                <h1 className="text-base font-bold text-slate-900 leading-tight">Job Orders</h1>
                <p className="text-[10px] text-slate-500 font-medium">{stats.total} active</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${showSearch ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
              >
                <Search size={18} />
              </button>
              <button
                onClick={() => fetchJobOrders()}
                className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <Clock size={18} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Mobile Search (expandable) */}
          {showSearch && (
            <div className="mt-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search Driver, Plate, or JO..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full h-10 pl-10 pr-10 bg-slate-100 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500/30 focus:bg-white transition-all"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Tab Bar — horizontal scroll */}
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {TABS.map(tab => {
              const Icon = tab.icon;
              const count = getTabCount(tab.id);
              const isActive = selectedStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedStatus(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-md shadow-slate-900/20'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  <Icon size={14} />
                  <span>{tab.label}</span>
                  {count > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-500'
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* [AI] Mobile SBU Type Filter */}
        <div className="px-4 pb-3">
          <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {[
              { id: 'all', label: 'All SBU', icon: Layers },
              ...Object.entries(SBU_BADGE_CONFIG).map(([key, val]) => ({ id: key, label: val.label, icon: val.icon })),
            ].map(item => {
              const isActive = sbuFilter === item.id;
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSbuFilterChange(item.id)}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                    isActive
                      ? 'bg-slate-800 text-white shadow-sm'
                      : 'bg-white text-slate-400 border border-slate-200'
                  }`}
                >
                  <Icon size={12} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ===== DESKTOP HEADER ===== */}
      <div className="hidden lg:block max-w-[1600px] mx-auto px-6 pt-6 mb-6">
        <div className="flex items-end justify-between gap-10">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm rotate-3 hover:rotate-0 transition-transform duration-500 border border-indigo-100">
              <Truck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="w-6 h-[2px] bg-sky-500 rounded-full"></span>
                <p className="text-[9px] font-black text-sky-600 uppercase tracking-[0.3em]">HQ Operations</p>
              </div>
              <h1 className="text-2xl font-black text-indigo-950 italic uppercase tracking-tighter leading-none">Job Order Console</h1>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="relative group w-72">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:text-sky-500 transition-colors" size={16} />
              <input
                type="text"
                placeholder="Search Driver, Plate, or JO..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-white border border-indigo-100 rounded-2xl text-[11px] font-black focus:border-sky-500/30 focus:ring-4 focus:ring-sky-500/5 transition-all outline-none shadow-sm text-indigo-900"
              />
            </div>
            <Button
              onClick={() => fetchJobOrders()}
              className="h-12 px-6 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-900/20 flex items-center gap-2 transition-all"
            >
              <Clock size={16} className={loading ? 'animate-spin' : ''} /> Refresh
            </Button>
          </div>
        </div>

        {/* Desktop Filter Tabs */}
        <div className="mt-6 flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-indigo-50 w-fit">
          {[
            { id: 'all', label: 'All Jobs', count: stats.total },
            { id: 'new', label: 'New', count: stats.needsAssign },
            { id: 'assigned', label: 'Assigned', count: stats.assignedCount },
            { id: 'active', label: 'On Journey', count: stats.onJourney },
            { id: 'rejected', label: 'Rejected', count: stats.rejected },
            { id: 'completed', label: 'Job Done', count: stats.jobDone }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`h-10 px-5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                selectedStatus === tab.id
                  ? 'bg-indigo-100 text-indigo-800 shadow-sm border border-indigo-200'
                  : 'text-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-700'
              }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 rounded-md text-[8px] ${selectedStatus === tab.id ? 'bg-indigo-200 text-indigo-900' : 'bg-indigo-50/80 text-indigo-500'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* [AI] Desktop SBU Type Filter */}
        <div className="mt-3 flex items-center gap-2">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mr-1">SBU</span>
          {[
            { id: 'all', label: 'All SBU', icon: Layers },
            ...Object.entries(SBU_BADGE_CONFIG).map(([key, val]) => ({ id: key, label: val.label, icon: val.icon })),
          ].map(item => {
            const isActive = sbuFilter === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleSbuFilterChange(item.id)}
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'bg-white text-slate-400 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <Icon size={12} />
                {item.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <div className="max-w-[1600px] mx-auto px-4 lg:px-6 pb-6">
        {/* Mobile: Active filter label */}
        <div className="lg:hidden flex items-center justify-between mb-4">
          <p className="text-sm text-slate-500">
            <span className="font-bold text-slate-900">{filteredJobs.length}</span> job orders
          </p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="text-xs text-blue-600 font-medium flex items-center gap-1"
            >
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {filteredJobs.length === 0 ? (
          <Card className="p-16 text-center border-none shadow-sm rounded-3xl bg-white">
            <div className="w-16 h-16 bg-indigo-50/50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle size={32} className="text-indigo-300" />
            </div>
            <h3 className="text-xl font-black text-indigo-900 uppercase tracking-tighter italic">No Active Deployments</h3>
            <p className="text-indigo-400 font-bold mt-2 uppercase tracking-widest text-[9px]">Try adjusting your filter to view completed or pending missions.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:gap-8">
            {filteredJobs.map((jo) => (
              <Card key={jo.id} className="group relative overflow-hidden border border-slate-200 lg:border-indigo-50 shadow-sm hover:shadow-md transition-all duration-300 rounded-2xl lg:rounded-3xl bg-white">
                {/* Status Indicator Bar */}
                <div className={`h-1 lg:w-2 lg:h-auto ${
                  getJobCategory(jo) === 'rejected' ? 'bg-rose-500' :
                  ['completed', 'PEKERJAAN SELESAI', 'verified', 'ready_for_billing', 'awaiting_audit'].includes(jo.status) ? 'bg-indigo-950' :
                  jo.driver_response === 'accepted' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                }`} />

                <div className="p-4 lg:p-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4 lg:mb-6">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-base lg:text-lg font-black text-indigo-950 italic uppercase tracking-tighter group-hover:text-sky-600 transition-colors duration-300">
                          {jo.jo_number}
                        </h2>
                        {getStatusBadge(jo)}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md text-[7px] font-black tracking-widest uppercase italic">
                          {jo.wo_item?.wo?.wo_number || 'LEGACY-WO'}
                        </span>
                        
                        {/* [AI] SBU Badge */}
                        {(() => {
                          const sbu = jo.wo_item?.sbu_type?.toUpperCase();
                          const config = SBU_BADGE_CONFIG[sbu];
                          if (!config) return null;
                          const Icon = config.icon;
                          return (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase tracking-wider border ${config.bg} ${config.text} ${config.border}`}>
                              <Icon size={8} /> {config.label}
                            </span>
                          );
                        })()}
                        
                        <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] italic truncate">
                          {jo.wo_item?.wo?.customer?.legal_name || jo.wo_item?.wo?.customer?.name || 'Private Client'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-start sm:items-end gap-0.5 text-right flex-shrink-0">
                      <p className="text-[7px] font-black text-indigo-300 uppercase tracking-widest italic">Deployment</p>
                      <div className="flex items-center gap-1.5 text-indigo-500">
                        <Calendar size={10} />
                        <span className="text-[9px] font-bold">
                          {format(new Date(jo.created_at), 'dd MMM yyyy HH:mm', { locale: id })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Info Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4 lg:mb-6">
                    {/* Driver Info */}
                    <div className="p-3 lg:p-4 bg-indigo-50/50 rounded-xl lg:rounded-2xl border border-indigo-50/50 flex items-center gap-3 lg:gap-4 hover:bg-white hover:border-sky-500/20 hover:shadow-lg transition-all duration-300">
                      <div className="w-9 h-9 lg:w-10 lg:h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-indigo-400 hover:bg-sky-600 hover:text-white transition-all duration-300 flex-shrink-0">
                        <User size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[7px] font-black text-indigo-400 uppercase tracking-widest mb-0.5 italic">Pilot</p>
                        <p className="text-xs font-black text-indigo-950 uppercase tracking-tight truncate">{jo.md_drivers?.name || 'OUTSOURCED'}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <Phone size={10} className="text-sky-500" />
                          <p className="text-[9px] font-bold text-indigo-500 tracking-tight truncate">{jo.driver_phone || jo.md_drivers?.phone || 'NO CONTACT'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Fleet Info */}
                    <div className="p-3 lg:p-4 bg-indigo-50/50 rounded-xl lg:rounded-2xl border border-indigo-50/50 flex items-center gap-3 lg:gap-4 hover:bg-white hover:border-emerald-500/20 hover:shadow-lg transition-all duration-300">
                      <div className="w-9 h-9 lg:w-10 lg:h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-indigo-400 hover:bg-emerald-600 hover:text-white transition-all duration-300 flex-shrink-0">
                        <Truck size={16} />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[7px] font-black text-indigo-400 uppercase tracking-widest mb-0.5 italic">Asset</p>
                        <p className="text-xs font-black text-indigo-950 uppercase tracking-tight truncate">{jo.md_fleets?.plate_number || 'Generic Unit'}</p>
                        <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest truncate">{jo.md_fleets?.fleet_type?.type_name || 'Generic Class'}</p>
                      </div>
                    </div>

                    {/* Mission Scope */}
                    <div className="p-3 lg:p-4 bg-indigo-50/50 rounded-xl lg:rounded-2xl border border-indigo-50/50 flex items-start gap-3 lg:gap-4 hover:bg-white hover:border-orange-500/20 hover:shadow-lg transition-all duration-300">
                      <div className="w-9 h-9 lg:w-10 lg:h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-indigo-400 hover:bg-orange-500 hover:text-white transition-all duration-300 flex-shrink-0 mt-0.5">
                        <MapPin size={16} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[7px] font-black text-indigo-400 uppercase tracking-widest mb-0.5 italic">Scope</p>
                        <p className="text-xs font-black text-indigo-950 uppercase tracking-tight truncate">
                          {jo.wo_item?.item_data?.origin_name || jo.wo_item?.item_data?.shipper_name || jo.wo_item?.item_data?.shipper_city || 'Origin'} → {jo.wo_item?.item_data?.destination_name || jo.wo_item?.item_data?.recipient_name || jo.wo_item?.item_data?.recipient_city || 'Dest'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1.5">
                          <Activity size={10} className={jo.wo_item?.item_data?.locations?.length > 2 ? 'text-orange-500' : 'text-emerald-500'} />
                          <p className={`text-[9px] font-bold uppercase italic ${jo.wo_item?.item_data?.locations?.length > 2 ? 'text-orange-500' : 'text-emerald-500'}`}>
                            {jo.wo_item?.item_data?.locations?.length > 2 ? `${jo.wo_item.item_data.locations.length} Stops` : 'Direct'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  {getJobCategory(jo) === 'rejected' ? (
                    <div className="p-3 lg:p-4 bg-rose-50 rounded-xl lg:rounded-2xl border border-rose-100 flex flex-col sm:flex-row items-center gap-3">
                      <AlertCircle size={16} className="text-rose-500 flex-shrink-0" />
                      <div className="flex-1 text-center sm:text-left">
                        <p className="text-[9px] font-black text-rose-700 uppercase tracking-widest">Ditolak oleh CS</p>
                        <p className="text-[7px] font-bold text-rose-400 uppercase tracking-wider">Read Only</p>
                      </div>
                      <Button
                        onClick={() => {
                          const woItem = jo.wo_item;
                          setSelectedRejectedWo({
                            id: woItem?.wo?.id,
                            wo_number: woItem?.wo?.wo_number,
                            execution_date: woItem?.item_data?.execution_date,
                            order_date: woItem?.item_data?.order_date,
                            md_entities: woItem?.wo?.customer,
                            notes: woItem?.wo?.notes,
                            status: 'handover_rejected',
                            wo_items: [{
                              ...woItem,
                              status: 'handover_rejected',
                              job_orders: [jo]
                            }]
                          });
                          setShowRejectedModal(true);
                        }}
                        className="w-full sm:w-auto h-10 bg-slate-900 hover:bg-rose-900/40 text-white rounded-xl font-black text-[8px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-slate-700 hover:border-rose-500/50 shadow-lg shadow-slate-900/20"
                      >
                        <ClipboardList size={12} /> Lihat Detail
                      </Button>
                    </div>
                  ) : getJobCategory(jo) === 'completed' ? (
                    <div className="p-3 lg:p-4 bg-indigo-50 rounded-xl lg:rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-center gap-3">
                      <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
                      <div className="flex-1 text-center sm:text-left">
                        <p className="text-[9px] font-black text-emerald-700 uppercase tracking-widest">Mission Complete</p>
                        <p className="text-[7px] font-bold text-indigo-400 uppercase tracking-wider">
                          {jo.status?.toUpperCase() === 'INVOICED' || jo.status?.toUpperCase() === 'PAID' ? 'Invoiced' : 'Awaiting Audit'}
                        </p>
                      </div>
                      <Link href={`/hq/finance/cost-audit?jo_id=${jo.id}`} className="w-full sm:w-auto block">
                        <Button className="w-full h-10 bg-slate-900 hover:bg-indigo-900/40 text-white rounded-xl font-black text-[8px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/20 border border-slate-700 hover:border-indigo-500/50">
                          <FileText size={12} /> Cost Audit
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <div className="p-3 lg:p-4 bg-indigo-50 rounded-xl lg:rounded-2xl border border-indigo-100 flex flex-col sm:flex-row items-center gap-3">
                      <div className="w-full sm:w-auto h-9 bg-white rounded-lg flex items-center justify-center gap-2 border border-indigo-100 shadow-sm flex-shrink-0">
                        <CheckCircle2 size={12} className="text-emerald-500" />
                        <span className="text-[8px] font-black text-emerald-700 uppercase tracking-widest italic">
                          {jo.wa_link_sent_at ? 'Link Sent' : 'Awaiting'}
                        </span>
                      </div>
                      <Link href={`/hq/finance/cost-audit?jo_id=${jo.id}`} className="w-full sm:w-auto block">
                        <Button variant="ghost" className="w-full h-9 bg-slate-900 border border-slate-700 text-white hover:bg-indigo-900/40 hover:border-indigo-500/50 rounded-lg font-black text-[8px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/20">
                          <FileText size={12} /> Finance
                        </Button>
                      </Link>
                      {(() => {
                        const sbu = jo.wo_item?.sbu_type?.toUpperCase();
                        const trackingToken = jo.wo_item?.wo?.tracking_token || jo.wo_item?.wo?.id;
                        const trackUrl = sbu === 'WAREHOUSE' 
                          ? `/track/warehouse/${trackingToken}?jo_id=${jo.id}` 
                          : `/hq/tracking?jo=${jo.jo_number}`;
                        
                        return (
                          <Link href={trackUrl} className="w-full sm:w-auto block">
                            <Button variant="ghost" className="w-full h-9 bg-slate-900 border border-slate-700 text-white hover:bg-indigo-900/40 hover:border-indigo-500/50 rounded-lg font-black text-[8px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/20">
                              <NavIcon size={12} /> Tracking
                            </Button>
                          </Link>
                        );
                      })()}
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showRejectedModal && selectedRejectedWo && (
        <RejectedViewModal
          wo={selectedRejectedWo}
          onClose={() => setShowRejectedModal(false)}
        />
      )}
    </div>
  );
}
