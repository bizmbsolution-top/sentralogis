'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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
  ShieldCheck, Phone, Share2,
  ArrowRight, Box
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Printer, X, FileText } from 'lucide-react';
import RejectedViewModal from '../work-orders/components/RejectedViewModal';

const supabase = createClient();

export default function HQJobOrdersPage() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showRejectedModal, setShowRejectedModal] = useState(false);
  const [selectedRejectedWo, setSelectedRejectedWo] = useState<any>(null);

  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearchTerm(q);
  }, [searchParams]);

  const fetchJobOrders = useCallback(async (silent = false) => {
    if (!profile?.tenant_id) return;
    try {
      if (!silent) setLoading(true);
      
      // [AI] reading from .env.local via createClient
      const { data: baseData, error: baseError } = await supabase
        .from('job_orders')
        .select(`
          *,
          wo_item:wo_items!wo_item_id (
            id, item_data,
            wo:work_orders!wo_id (
              id, wo_number, status, customer:md_entities!customer_id (id, name, legal_name)
            )
          )
        `)
        .eq('tenant_id', profile?.tenant_id)
        .order('created_at', { ascending: false });

      if (baseError) throw baseError;
      
      const rawJOs = baseData || [];
      // [AI] Only show JOs with driver+fleet assigned (same as SBU)
      const baseJOs = Array.from(new Map(rawJOs.map(jo => [jo.id, jo])).values())
        .filter(jo => jo.driver_id && jo.fleet_id);

      if (baseJOs.length > 0) {
        const driverIds = [...new Set(baseJOs.map(j => j.driver_id).filter(Boolean))];
        const fleetIds = [...new Set(baseJOs.map(j => j.fleet_id).filter(Boolean))];

        const [driversRes, fleetsRes] = await Promise.all([
          driverIds.length > 0 ? supabase.from('md_drivers').select('id, name, phone').in('id', driverIds) : { data: [] },
          fleetIds.length > 0 ? supabase.from('md_fleets').select('id, plate_number, fleet_type:md_fleet_types!fleet_type_id(type_name)').in('id', fleetIds) : { data: [] }
        ]);

        const enrichedJOs = baseJOs.map(jo => ({
          ...jo,
          md_drivers: driversRes.data?.find(d => d.id === jo.driver_id),
          md_fleets: fleetsRes.data?.find(f => f.id === jo.fleet_id)
        }));

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



  // --- STANDARDIZED STATUS LOGIC (synced with SBU) ---
  const DONE_STATUSES = ['COMPLETED', 'PEKERJAAN SELESAI', 'VERIFIED', 'READY_FOR_BILLING', 'AWAITING_AUDIT', 'DONE', 'INVOICED', 'PAID'];
  const ACTIVE_STATUSES = [
    'IN_PROGRESS', 'DALAM PERJALANAN', 'ON_ROAD', 'ON JOURNEY',
    'ORDER DITERIMA', 'ACCEPTED', 'TIBA DI ASAL', 'MENUJU ASAL',
    'PICKING_UP', 'DELIVERING', 'START JOURNEY', 'MENUNGGU BERANGKAT',
    'STARTED', 'LOADING', 'UNLOADING', 'DITERIMA', 'SELESAI'
  ];
  const REJECTED_STATUSES = ['REJECTED', 'HANDOVER_REJECTED', 'CANCELLED'];

  const getJobCategory = useCallback((jo: any) => {
    const s = jo.status?.toUpperCase() || '';
    const dr = jo.driver_response?.toLowerCase() || '';

    // [AI] Rejected JOs get their own category — must come before 'assigned' check
    if (REJECTED_STATUSES.includes(s)) return 'rejected';
    if (DONE_STATUSES.includes(s)) return 'completed';
    if (ACTIVE_STATUSES.includes(s) || dr === 'accepted') return 'active';
    // ASSIGNED: has driver/fleet, properly deployed
    if (jo.driver_id && jo.fleet_id && !DONE_STATUSES.includes(s) && !ACTIVE_STATUSES.includes(s)) return 'assigned';
    return 'awaiting';
  }, [ACTIVE_STATUSES, DONE_STATUSES, REJECTED_STATUSES]);

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
  }, [jobOrders, getJobCategory]);

  const filteredJobs = useMemo(() => {
    return jobOrders.filter(jo => {
      const category = getJobCategory(jo);
      
      const matchesSearch = 
        jo.jo_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        jo.md_drivers?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        jo.wo_item?.wo?.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // [AI] Rejected JOs hidden from 'all' — only visible via 'rejected' tab
      if (selectedStatus === 'all') return category !== 'rejected';
      if (selectedStatus === 'new') return category === 'awaiting';
      if (selectedStatus === 'rejected') return category === 'rejected';
      return category === selectedStatus;
    });
  }, [jobOrders, searchTerm, selectedStatus, getJobCategory]);

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

  if (loading && jobOrders.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-indigo-950 animate-spin mb-4" />
        <p className="text-indigo-950 font-black tracking-widest text-[10px] uppercase">Loading Job Orders...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-6">
      <Toaster position="top-right" />
      
      {/* Header Section */}
      <div className="max-w-[1600px] mx-auto mb-16">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-10">
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

          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative group w-full md:w-72">
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
                className="h-12 px-6 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-slate-900/20 active:scale-95 transition-all"
            >
                <Activity size={16} /> Refresh
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mt-8 flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-indigo-50 w-fit">
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
      </div>

      {/* Main Grid */}
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 gap-8">
        {filteredJobs.length === 0 ? (
          <Card className="p-16 text-center border-none shadow-sm rounded-3xl bg-white">
            <div className="w-16 h-16 bg-indigo-50/50 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} className="text-indigo-300" />
            </div>
            <h3 className="text-xl font-black text-indigo-900 uppercase tracking-tighter italic">No Active Deployments</h3>
            <p className="text-indigo-400 font-bold mt-2 uppercase tracking-widest text-[9px]">Try adjusting your filter to view completed or pending missions.</p>
          </Card>
        ) : (
          filteredJobs.map((jo) => (
            <Card key={jo.id} className="group relative overflow-hidden border border-indigo-50 shadow-sm hover:shadow-md transition-all duration-300 rounded-3xl bg-white">
               <div className="flex flex-col lg:flex-row">
                  {/* Status Indicator Bar */}
                  <div className={`w-2 h-auto ${
                      getJobCategory(jo) === 'rejected' ? 'bg-rose-500' :
                      ['completed', 'PEKERJAAN SELESAI', 'verified', 'ready_for_billing', 'awaiting_audit'].includes(jo.status) ? 'bg-indigo-950' :
                      jo.driver_response === 'accepted' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                  }`} />

                   <div className="flex-1 p-5 lg:p-6">
                    <div className="flex flex-col xl:flex-row justify-between items-start gap-3 mb-6">
                       <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                           <h2 className="text-lg font-black text-indigo-950 italic uppercase tracking-tighter group-hover:text-sky-600 transition-colors duration-300">
                             {jo.jo_number}
                           </h2>
                           {getStatusBadge(jo)}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                           <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-md text-[7px] font-black tracking-widest uppercase italic">
                             {jo.wo_item?.wo?.wo_number || 'LEGACY-WO'}
                           </span>
                           <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] italic">
                             {jo.wo_item?.wo?.customer?.legal_name || jo.wo_item?.wo?.customer?.name || 'Private Client'}
                           </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-0.5 text-right">
                         <p className="text-[7px] font-black text-indigo-300 uppercase tracking-widest italic">Deployment</p>
                         <div className="flex items-center gap-1.5 text-indigo-500">
                            <Calendar size={10} />
                            <span className="text-[9px] font-bold">
                               {format(new Date(jo.created_at), 'dd MMM yyyy HH:mm', { locale: id })}
                            </span>
                         </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                       {/* Driver Info */}
                       <div className="p-4 bg-indigo-50/50/50 rounded-2xl border border-indigo-50/50 flex items-center gap-4 group/meta hover:bg-white hover:border-sky-500/20 hover:shadow-lg transition-all duration-300">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-indigo-400 group-hover/meta:bg-sky-600 group-hover/meta:text-white transition-all duration-300">
                             <User size={18} />
                          </div>
                          <div className="min-w-0">
                             <p className="text-[7px] font-black text-indigo-400 uppercase tracking-widest mb-0.5 italic text-ellipsis overflow-hidden">Pilot</p>
                             <p className="text-xs font-black text-indigo-950 uppercase tracking-tight truncate">{jo.md_drivers?.name || 'OUTSOURCED'}</p>
                             <div className="flex items-center gap-1.5 mt-0.5">
                                <Phone size={10} className="text-sky-500" />
                                <p className="text-[9px] font-bold text-indigo-500 tracking-tight">{jo.driver_phone || jo.md_drivers?.phone || 'NO CONTACT'}</p>
                             </div>
                          </div>
                       </div>

                       {/* Fleet Info */}
                       <div className="p-4 bg-indigo-50/50/50 rounded-2xl border border-indigo-50/50 flex items-center gap-4 group/meta hover:bg-white hover:border-emerald-500/20 hover:shadow-lg transition-all duration-300">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-indigo-400 group-hover/meta:bg-emerald-600 group-hover/meta:text-white transition-all duration-300">
                             <Truck size={18} />
                          </div>
                          <div className="min-w-0">
                             <p className="text-[7px] font-black text-indigo-400 uppercase tracking-widest mb-0.5 italic text-ellipsis overflow-hidden">Asset</p>
                             <p className="text-xs font-black text-indigo-950 uppercase tracking-tight truncate">{jo.md_fleets?.plate_number || 'Generic Unit'}</p>
                             <p className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest truncate">{jo.md_fleets?.fleet_type?.type_name || 'Generic Class'}</p>
                          </div>
                       </div>

                       {/* Mission Scope */}
                       <div className="p-4 bg-indigo-50/50/50 rounded-2xl border border-indigo-50/50 flex items-center gap-4 group/meta hover:bg-white hover:border-orange-500/20 hover:shadow-lg transition-all duration-300">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-indigo-400 group-hover/meta:bg-orange-500 group-hover/meta:text-white transition-all duration-300">
                             <MapPin size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="text-[7px] font-black text-indigo-400 uppercase tracking-widest mb-0.5 italic">Scope</p>
                             <p className="text-xs font-black text-indigo-950 uppercase tracking-tight truncate group-hover:whitespace-normal group-hover:overflow-visible transition-all">
                                {jo.wo_item?.item_data?.origin_name || jo.wo_item?.item_data?.shipper_name || jo.wo_item?.item_data?.shipper_city || 'Origin'} → {jo.wo_item?.item_data?.destination_name || jo.wo_item?.item_data?.recipient_name || jo.wo_item?.item_data?.recipient_city || 'Dest'}
                             </p>
                             <div className="flex flex-col gap-1 mt-1 opacity-0 h-0 group-hover:opacity-100 group-hover:h-auto transition-all duration-300">
                                <p className="text-[9px] text-indigo-500 font-medium">
                                   <span className="font-bold text-indigo-700">Origin:</span> {jo.wo_item?.item_data?.shipper_name || 'N/A'} - {jo.wo_item?.item_data?.shipper_address || 'No Address'}
                                </p>
                                <p className="text-[9px] text-indigo-500 font-medium">
                                   <span className="font-bold text-indigo-700">Dest:</span> {jo.wo_item?.item_data?.recipient_name || 'N/A'} - {jo.wo_item?.item_data?.recipient_address || 'No Address'}
                                </p>
                             </div>
                             <div className="flex items-center gap-1.5 mt-1.5">
                                <Activity size={10} className={jo.wo_item?.item_data?.locations?.length > 2 ? 'text-orange-500' : 'text-emerald-500'} />
                                <p className={`text-[9px] font-bold uppercase italic ${jo.wo_item?.item_data?.locations?.length > 2 ? 'text-orange-500' : 'text-emerald-500'}`}>
                                  {jo.wo_item?.item_data?.locations?.length > 2 ? `${jo.wo_item.item_data.locations.length} Stops (Multi-Stop)` : 'Direct Delivery'}
                                </p>
                             </div>
                             {jo.wo_item?.item_data?.locations && jo.wo_item.item_data.locations.length > 0 && (
                               <p className="text-[8px] text-indigo-400 truncate mt-1">
                                 {jo.wo_item.item_data.locations.map((loc: any) => loc.city || loc.name).join(' → ')}
                               </p>
                             )}
                          </div>
                       </div>
                    </div>
                  </div>

                  {/* Actions Panel */}
                  {getJobCategory(jo) === 'rejected' ? (
                    <div className="lg:w-56 p-5 lg:p-6 bg-rose-50 border-l border-rose-100 flex flex-col justify-center items-center gap-3 relative overflow-hidden">
                      <AlertCircle size={64} className="absolute -right-4 -bottom-4 text-rose-500/5 rotate-12" />
                      <div className="relative z-10 text-center space-y-3">
                        <div className="w-10 h-10 bg-rose-100 rounded-xl flex items-center justify-center mx-auto border border-rose-200">
                          <AlertCircle size={20} className="text-rose-600" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-rose-700 uppercase tracking-[0.2em]">Ditolak oleh CS</p>
                          <p className="text-[7px] font-bold text-rose-400 uppercase tracking-wider mt-0.5">Read Only</p>
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
                          className="w-full h-10 bg-slate-900 hover:bg-rose-900/40 text-white rounded-xl font-black text-[8px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all border border-slate-700 hover:border-rose-500/50 shadow-lg shadow-slate-900/20"
                        >
                          <ClipboardList size={12} /> Lihat Detail
                        </Button>
                      </div>
                    </div>
                  ) : getJobCategory(jo) === 'completed' ? (
                  <div className="lg:w-56 p-5 lg:p-6 bg-indigo-50 border-l border-indigo-100 flex flex-col justify-center items-center gap-3 relative overflow-hidden">
                     <ShieldCheck size={64} className="absolute -right-4 -bottom-4 text-indigo-500/5 rotate-12" />
                     <div className="relative z-10 text-center space-y-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center mx-auto border border-emerald-200">
                          <CheckCircle2 size={20} className="text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-[9px] font-black text-emerald-700 uppercase tracking-[0.2em]">Mission Complete</p>
                          <p className="text-[7px] font-bold text-indigo-400 uppercase tracking-wider mt-0.5">
                            {jo.status?.toUpperCase() === 'INVOICED' || jo.status?.toUpperCase() === 'PAID' ? 'Invoiced' : 'Awaiting Audit'}
                          </p>
                        </div>
                        <Link href={`/hq/finance/cost-audit?jo_id=${jo.id}`} className="w-full block">
                           <Button className="w-full h-10 bg-slate-900 hover:bg-indigo-900/40 text-white rounded-xl font-black text-[8px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/20 border border-slate-700 hover:border-indigo-500/50">
                               <FileText size={12} /> Cost Audit
                           </Button>
                        </Link>
                     </div>
                  </div>
                  ) : (
                  <div className="lg:w-56 p-5 lg:p-6 bg-indigo-50 border-l border-indigo-100 flex flex-col justify-center gap-2.5 relative overflow-hidden">
                     <ShieldCheck size={64} className="absolute -right-4 -bottom-4 text-indigo-500/5 rotate-12" />
                     <div className="relative z-10 space-y-2">
                        <div className="w-full h-10 bg-white rounded-xl flex items-center justify-center gap-2 border border-indigo-100 shadow-sm">
                           <CheckCircle2 size={12} className="text-emerald-500" />
                           <span className="text-[8px] font-black text-emerald-700 uppercase tracking-widest italic">
                             {jo.wa_link_sent_at ? 'Link Dispatched' : 'Awaiting Dispatch'}
                           </span>
                        </div>

                        <Link href={`/hq/finance/cost-audit?jo_id=${jo.id}`} className="w-full block">
                           <Button variant="ghost" className="w-full h-10 bg-slate-900 border border-slate-700 text-white hover:bg-indigo-900/40 hover:border-indigo-500/50 rounded-xl font-black text-[8px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/20">
                               <FileText size={12} /> Finance
                           </Button>
                        </Link>

                        <Link href={`/hq/tracking?jo=${jo.jo_number}`} className="w-full block">
                           <Button variant="ghost" className="w-full h-10 bg-slate-900 border border-slate-700 text-white hover:bg-indigo-900/40 hover:border-indigo-500/50 rounded-xl font-black text-[8px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/20">
                               <NavIcon size={12} /> Tracking
                           </Button>
                        </Link>
                     </div>

                     <div className="text-center mt-1 relative z-10">
                        <p className="text-[7px] font-black text-indigo-400 uppercase tracking-[0.2em]">HQ Monitoring</p>
                     </div>
                  </div>
                  )}
               </div>
            </Card>
          ))
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
