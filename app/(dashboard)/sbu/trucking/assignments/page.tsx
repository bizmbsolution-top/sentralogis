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
  Clock, CheckCircle2, Navigation as NavIcon, MessageCircle,
  AlertCircle, Activity, ClipboardList,
  ShieldCheck, Phone, Satellite, Share2,
  Info
} from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Printer, X, ShieldCheck as Shield, FileText, User as UserIcon, Truck as TruckIcon, MapPin as MapIcon } from 'lucide-react';
import { sendNotification } from '@/lib/supabase/notifications';
import RejectedViewModal from '../../../hq/work-orders/components/RejectedViewModal';

// ---------------------------------------------------------
// DELIVERY NOTE MODAL (Surat Jalan)
// ---------------------------------------------------------
const DeliveryNoteModal = ({ jo, onClose, profile }: { jo: any; onClose: () => void; profile: any }) => {
  if (!jo) return null;

  const tenantName = profile?.tenants?.name || 'SENTRALOGIS OPS';
  const creatorName = profile?.full_name || 'Operational Staff';
  const customerName = jo.wo_item?.wo?.customer?.name || 'Pelanggan';
  const plateNumber = jo.md_fleets?.plate_number || '-';
  const truckType = jo.md_fleets?.fleet_type?.type_name || '-';
  const driverName = jo.md_drivers?.name || '-';
  const origin = jo.wo_item?.item_data?.origin_name || jo.wo_item?.item_data?.shipper_city || 'Origin';
  const destination = jo.wo_item?.item_data?.destination_name || jo.wo_item?.item_data?.recipient_city || 'Destination';
  const joDate = format(new Date(jo.created_at), 'dd MMMM yyyy', { locale: id });

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 md:p-8">
      <div className="bg-slate-900 w-full max-w-4xl h-[90vh] rounded-[2.5rem] shadow-[0_0_50px_rgba(0,0,0,0.5)] border border-slate-700 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header Control */}
        <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900">
           <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center shadow-inner">
                 <FileText className="text-slate-300" size={20} />
              </div>
              <div>
                 <h2 className="text-sm font-black text-white uppercase tracking-widest italic">Surat Jalan / Delivery Note</h2>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{jo.jo_number}</p>
              </div>
           </div>
           <div className="flex items-center gap-3">
              <Button onClick={() => window.print()} className="bg-slate-800 border border-slate-700 hover:bg-slate-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest px-6 h-10 flex items-center gap-2 transition-all">
                 <Printer size={16} /> Print Document
              </Button>
              <button onClick={onClose} className="w-10 h-10 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors">
                 <X size={20} />
              </button>
           </div>
        </div>

        {/* Document Content */}
        <div className="flex-1 overflow-y-auto p-12 bg-slate-900/50 print:bg-white print:p-0" id="delivery-note-print">
           <style dangerouslySetInnerHTML={{ __html: `
              @media print {
                body * { visibility: hidden; }
                #delivery-note-print, #delivery-note-print * { visibility: visible; }
                #delivery-note-print { position: absolute; left: 0; top: 0; width: 100%; }
              }
           `}} />

           <div className="max-w-[800px] mx-auto border-2 border-slate-200 bg-white shadow-xl print:shadow-none p-12">
              {/* Header */}
              <div className="flex justify-between items-start mb-12 border-b-2 border-slate-900 pb-8">
                 <div>
                    <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter mb-2">{tenantName}</h1>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.3em] italic">Logistic & Distribution Services</p>
                 </div>
                 <div className="text-right">
                    <h2 className="text-xl font-black text-slate-900 uppercase italic mb-1">SURAT JALAN</h2>
                    <p className="text-xs font-bold text-slate-500">NO: {jo.jo_number}</p>
                    <p className="text-xs font-bold text-slate-500 mt-1">{joDate}</p>
                 </div>
              </div>

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-12 mb-12">
                 <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">Pihak Penerima / Customer</p>
                    <p className="text-lg font-black text-slate-900 uppercase italic leading-tight">{customerName}</p>
                    <p className="text-xs font-bold text-slate-500 mt-2">Lokasi Tujuan: {destination}</p>
                 </div>
                 <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 italic">Informasi Kendaraan & Driver</p>
                    <div className="space-y-2">
                       <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-400 uppercase">Driver:</span>
                          <span className="font-black text-slate-900 uppercase">{driverName}</span>
                       </div>
                       <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-400 uppercase">Unit:</span>
                          <span className="font-black text-slate-900 uppercase">{plateNumber}</span>
                       </div>
                       <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-400 uppercase">Type:</span>
                          <span className="font-black text-slate-900 uppercase">{truckType}</span>
                       </div>
                    </div>
                 </div>
              </div>

              {/* Items Table */}
              <table className="w-full mb-16">
                 <thead>
                    <tr className="border-y-2 border-slate-900">
                       <th className="py-4 text-left text-[10px] font-black uppercase tracking-widest italic">Deskripsi Barang / Jasa</th>
                       <th className="py-4 text-center text-[10px] font-black uppercase tracking-widest italic w-24">Qty</th>
                       <th className="py-4 text-left text-[10px] font-black uppercase tracking-widest italic pl-10">Rute Perjalanan</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-slate-100">
                    <tr>
                       <td className="py-6">
                          <p className="text-sm font-black text-slate-900 uppercase italic mb-1">PENGIRIMAN LOGISTIK</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">JO REF: {jo.jo_number}</p>
                       </td>
                       <td className="py-6 text-center font-black text-slate-900">1 UNIT</td>
                       <td className="py-6 pl-10">
                          <div className="flex items-center gap-2 text-[11px] font-black text-slate-700 uppercase italic">
                             {origin} <span className="text-slate-300">→</span> {destination}
                          </div>
                       </td>
                    </tr>
                 </tbody>
              </table>

              {/* Signature Section */}
              <div className="grid grid-cols-3 gap-8 text-center">
                 <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-16 italic">Dibuat Oleh (Ops)</p>
                    <p className="text-xs font-black text-slate-900 uppercase border-t border-slate-900 pt-2 inline-block min-w-[150px] italic">{creatorName}</p>
                 </div>
                 <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-16 italic">Driver / Pembawa</p>
                    <p className="text-xs font-black text-slate-900 uppercase border-t border-slate-900 pt-2 inline-block min-w-[150px] italic">{driverName}</p>
                 </div>
                 <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-16 italic">Diterima Oleh</p>
                    <p className="text-xs font-black text-slate-900 uppercase border-t border-slate-900 pt-2 inline-block min-w-[150px] italic">{customerName}</p>
                 </div>
              </div>

              {/* Footer Note */}
              <div className="mt-20 pt-8 border-t border-slate-100 text-center">
                 <p className="text-[8px] font-bold text-slate-300 uppercase tracking-[0.5em] italic">Surat Jalan ini sah sebagai bukti pengiriman barang resmi dari {tenantName}</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

const supabase = createClient();




export default function JobOrderManagementPage() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [printingJo, setPrintingJo] = useState<any | null>(null);
  const [showRejectedModal, setShowRejectedModal] = useState(false);
  const [selectedRejectedWo, setSelectedRejectedWo] = useState<any>(null);
  const [fetchingWo, setFetchingWo] = useState(false);


  useEffect(() => {
    const q = searchParams.get('q');
    if (q) setSearchTerm(q);
  }, [searchParams]);

  const fetchAssignments = useCallback(async (silent = false) => {
    if (!profile?.tenant_id) return;
    try {
      if (!silent) setLoading(true);
      
      const { data: baseData, error: baseError } = await supabase
        .from('job_orders')
        .select(`
          *,
          wo_item:wo_items!wo_item_id (
            id, item_data,
            wo:work_orders!wo_id (
              id, wo_number, customer:md_entities!customer_id (id, name)
            )
          )
        `)
        .eq('tenant_id', profile?.tenant_id)
        .order('created_at', { ascending: false });

      if (baseError) throw baseError;
      
      const rawJOs = baseData || [];
      // [AI] Include rejected JOs even if they have no driver/fleet — they still need to be visible
      const baseJOs = Array.from(new Map(rawJOs.map(jo => [jo.id, jo])).values())
        .filter(jo => jo.driver_id && jo.fleet_id || ['REJECTED', 'HANDOVER_REJECTED', 'CANCELLED'].includes(jo.status?.toUpperCase()));

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
      console.error('Error fetching assignments detailed:', err?.message || err);
      toast.error(`Gagal mengambil data penugasan: ${err?.message || 'Error Unknown'}`);
    } finally {
      setLoading(false);
    }
  }, [supabase, profile?.tenant_id]);

  useEffect(() => {
    fetchAssignments();
  }, [fetchAssignments]);

  // [AI] Fetch full WO with wo_items for RejectedViewModal
  const fetchFullWo = async (woId: string) => {
    if (!woId) return;
    setFetchingWo(true);
    try {
      const { data, error } = await supabase
        .from('work_orders')
        .select(`
          *,
          md_entities:customer_id (id, name, legal_name),
          wo_items (
            id, item_code, status, item_data
          )
        `)
        .eq('id', woId)
        .single();
      if (error) throw error;
      setSelectedRejectedWo(data);
      setShowRejectedModal(true);
    } catch (err: any) {
      toast.error('Gagal memuat data Work Order: ' + (err?.message || 'Error'));
    } finally {
      setFetchingWo(false);
    }
  };

  // --- STANDARDIZED STATUS LOGIC ---
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
    // ASSIGNED: has driver/fleet, properly deployed via Complete Assignment flow
    if (jo.driver_id && jo.fleet_id && !DONE_STATUSES.includes(s) && !ACTIVE_STATUSES.includes(s)) return 'assigned';
    // NEW: no driver/fleet yet
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

      // [AI] Rejected JOs are hidden from 'all' — only visible via 'rejected' tab
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
        return <Badge className="bg-slate-900 text-white border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">{label}</Badge>;
    }
    if (category === 'active') {
        return <Badge className="bg-emerald-100 text-emerald-600 border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic animate-pulse">ON JOURNEY</Badge>;
    }
    if (category === 'assigned') {
        return <Badge className="bg-blue-100 text-blue-600 border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">ASSIGNED</Badge>;
    }
    if (category === 'rejected') return <Badge className="bg-rose-100 text-rose-600 border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">REJECTED</Badge>;
    return <Badge className="bg-amber-100 text-amber-600 border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">NEW</Badge>;
  };

  if (loading && jobOrders.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-slate-900 animate-spin mb-4" />
        <p className="text-slate-900 font-black tracking-widest text-[10px] uppercase">Initializing Satellite Matrix...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-6">
      <Toaster position="top-right" />
      
      {/* Header Section */}
      <div className="max-w-[1600px] mx-auto mb-10">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm rotate-3 hover:rotate-0 transition-transform duration-500 border border-blue-100">
              <Truck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="w-6 h-[2px] bg-blue-500 rounded-full"></span>
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.3em]">Fleet Operations</p>
              </div>
              <h1 className="text-2xl font-black text-indigo-950 italic uppercase tracking-tighter leading-none">Job Order Console</h1>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative group w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search Driver, Plate, or JO..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-white border border-indigo-100 rounded-2xl text-[11px] font-black focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none shadow-sm text-indigo-900"
              />
            </div>
            <Button 
                onClick={() => fetchAssignments()}
                className="h-12 px-6 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-lg shadow-slate-900/20 active:scale-95 transition-all"
            >
                <Activity size={16} /> Refresh Matrix
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
                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-sm' 
                  : 'text-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600'
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
          <Card className="p-32 text-center border-none shadow-sm rounded-[3.5rem] bg-white">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
                <AlertCircle size={48} className="text-slate-200" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">No Active Deployments</h3>
            <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-[10px]">Try adjusting your filter to view completed or pending missions.</p>
          </Card>
        ) : (
          filteredJobs.map((jo) => (
            <Card key={jo.id} className="group relative overflow-hidden border border-indigo-50 shadow-sm hover:shadow-md transition-all duration-300 rounded-3xl bg-white">
               <div className="flex flex-col lg:flex-row">
                  {/* Status Indicator Bar */}
                  <div className={`w-2 h-auto ${
                      getJobCategory(jo) === 'rejected' ? 'bg-rose-500' :
                      ['completed', 'PEKERJAAN SELESAI', 'verified', 'ready_for_billing', 'awaiting_audit'].includes(jo.status) ? 'bg-indigo-900' :
                      jo.driver_response === 'accepted' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                  }`} />

                   <div className="flex-1 p-6">
                    <div className="flex flex-col xl:flex-row justify-between items-start gap-4 mb-6">
                       <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-3">
                           <h2 className="text-lg font-black text-indigo-950 italic uppercase tracking-tighter group-hover:text-blue-600 transition-colors duration-300">
                             {jo.jo_number}
                           </h2>
                           {getStatusBadge(jo)}
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                           <span className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-lg text-[8px] font-black tracking-widest uppercase italic">
                             {jo.wo_item?.wo?.wo_number || 'LEGACY-WO'}
                           </span>
                           <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic">
                             {jo.wo_item?.wo?.customer?.legal_name || jo.wo_item?.wo?.customer?.name || 'Private Client'}
                           </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 text-right">
                         <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest italic">Deployment</p>
                         <div className="flex items-center gap-2 text-slate-500">
                            <Calendar size={12} />
                            <span className="text-[10px] font-bold">
                               {format(new Date(jo.created_at), 'dd MMM yyyy HH:mm', { locale: id })}
                            </span>
                         </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       {/* Driver Info */}
                       <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50 flex items-center gap-4 group/meta hover:bg-white hover:border-blue-500/20 hover:shadow-lg transition-all duration-300">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-400 group-hover/meta:bg-blue-600 group-hover/meta:text-white transition-all duration-300">
                             <User size={18} />
                          </div>
                          <div className="min-w-0">
                             <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5 italic text-ellipsis overflow-hidden">Pilot</p>
                             <p className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">{jo.md_drivers?.name || 'OUTSOURCED'}</p>
                             <div className="flex items-center gap-1.5 mt-0.5">
                                <Phone size={10} className="text-blue-500" />
                                <p className="text-[9px] font-bold text-slate-500 tracking-tight">{jo.driver_phone || jo.md_drivers?.phone || 'NO CONTACT'}</p>
                             </div>
                          </div>
                       </div>

                       {/* Fleet Info */}
                       <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50 flex items-center gap-4 group/meta hover:bg-white hover:border-emerald-500/20 hover:shadow-lg transition-all duration-300">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-400 group-hover/meta:bg-emerald-600 group-hover/meta:text-white transition-all duration-300">
                             <Truck size={18} />
                          </div>
                          <div className="min-w-0">
                             <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5 italic text-ellipsis overflow-hidden">Asset</p>
                             <p className="text-xs font-black text-slate-900 uppercase tracking-tight truncate">{jo.md_fleets?.plate_number || 'Generic Unit'}</p>
                             <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest truncate">{jo.md_fleets?.fleet_type?.type_name || 'Generic Class'}</p>
                          </div>
                       </div>

                       {/* Mission Scope */}
                       <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100/50 flex items-center gap-4 group/meta hover:bg-white hover:border-orange-500/20 hover:shadow-lg transition-all duration-300">
                          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-slate-400 group-hover/meta:bg-orange-500 group-hover/meta:text-white transition-all duration-300">
                             <MapPin size={18} />
                          </div>
                          <div className="flex-1 min-w-0">
                             <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-0.5 italic">Scope</p>
                             <p className="text-xs font-black text-slate-900 uppercase tracking-tight truncate group-hover:whitespace-normal group-hover:overflow-visible transition-all">
                                {jo.wo_item?.item_data?.origin_name || jo.wo_item?.item_data?.shipper_name || jo.wo_item?.item_data?.shipper_city || 'Origin'} → {jo.wo_item?.item_data?.destination_name || jo.wo_item?.item_data?.recipient_name || jo.wo_item?.item_data?.recipient_city || 'Dest'}
                             </p>
                             <div className="flex flex-col gap-1 mt-1 opacity-0 h-0 group-hover:opacity-100 group-hover:h-auto transition-all duration-300">
                                <p className="text-[9px] text-slate-500 font-medium">
                                   <span className="font-bold text-slate-700">Origin:</span> {jo.wo_item?.item_data?.shipper_name || 'N/A'} - {jo.wo_item?.item_data?.shipper_address || 'No Address'}
                                </p>
                                <p className="text-[9px] text-slate-500 font-medium">
                                   <span className="font-bold text-slate-700">Dest:</span> {jo.wo_item?.item_data?.recipient_name || 'N/A'} - {jo.wo_item?.item_data?.recipient_address || 'No Address'}
                                </p>
                             </div>
                             <div className="flex items-center gap-1.5 mt-1.5">
                                <Activity size={10} className={jo.wo_item?.item_data?.locations?.length > 2 ? 'text-orange-500' : 'text-emerald-500'} />
                                <p className={`text-[9px] font-bold uppercase italic ${jo.wo_item?.item_data?.locations?.length > 2 ? 'text-orange-500' : 'text-emerald-500'}`}>
                                  {jo.wo_item?.item_data?.locations?.length > 2 ? `${jo.wo_item.item_data.locations.length} Stops (Multi-Stop)` : 'Direct Delivery'}
                                </p>
                             </div>
                             {jo.wo_item?.item_data?.locations && jo.wo_item.item_data.locations.length > 0 && (
                               <p className="text-[8px] text-slate-400 truncate mt-1">
                                 {jo.wo_item.item_data.locations.map((loc: any) => loc.city || loc.name).join(' → ')}
                               </p>
                             )}
                          </div>
                       </div>
                    </div>
                  </div>

                   {/* Actions Panel */}
                   <div className={`lg:w-64 p-6 border-l flex flex-col justify-center gap-3 relative overflow-hidden ${
                     getJobCategory(jo) === 'rejected' 
                       ? 'bg-rose-950 border-rose-900'
                       : 'bg-slate-900 border-slate-800'
                   }`}>
                     <ShieldCheck size={80} className="absolute -right-4 -bottom-4 text-white/5 rotate-12" />
                     <div className="relative z-10 space-y-3">

                       {getJobCategory(jo) === 'rejected' ? (
                         <>
                           <div className="text-center mb-2">
                             <div className="w-10 h-10 bg-rose-500/20 rounded-xl flex items-center justify-center mx-auto mb-2 border border-rose-500/30">
                               <AlertCircle size={18} className="text-rose-400" />
                             </div>
                             <p className="text-[8px] font-black text-rose-400 uppercase tracking-[0.2em]">Handover Rejected</p>
                             <p className="text-[7px] text-rose-500/60 uppercase tracking-widest mt-0.5">{jo.wo_item?.wo?.wo_number || '—'}</p>
                           </div>
                           <Button
                             disabled={fetchingWo}
                             onClick={() => fetchFullWo(jo.wo_item?.wo?.id)}
                             className="w-full h-11 bg-rose-900 hover:bg-rose-800 text-rose-100 border border-rose-800 hover:border-rose-700 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-rose-900/30 active:scale-95 transition-all disabled:opacity-50"
                           >
                             {fetchingWo ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                             View Rejection
                           </Button>
                         </>
                       ) : getJobCategory(jo) === 'completed' ? (
                         <>
                           <div className="text-center mb-2">
                             <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center mx-auto mb-2 border border-emerald-500/30">
                               <CheckCircle2 size={18} className="text-emerald-400" />
                             </div>
                             <p className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.2em]">Mission Complete</p>
                           </div>
                           <Link href={`/sbu/trucking/completed?wo=${encodeURIComponent(jo.wo_item?.wo?.wo_number || jo.jo_number)}`} className="w-full block">
                             <Button className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/30 active:scale-95 transition-all border border-indigo-500">
                               <FileText size={14} /> Document & Finances
                             </Button>
                           </Link>
                         </>
                        ) : (
                          <>
                            {getJobCategory(jo) === 'assigned' && (
                              <Button
                                onClick={() => {
                                  const driverPhone = jo.driver_phone || jo.md_drivers?.phone;
                                  const driverName = jo.md_drivers?.name || 'Driver';
                                  if (!driverPhone) { toast.error('Nomor telepon driver tidak ditemukan'); return; }
                                  let formattedPhone = driverPhone.replace(/\D/g, '');
                                  if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.substring(1);
                                  const origin = typeof window !== 'undefined' ? window.location.origin : '';
                                  const link = `${origin}/jo/${jo.driver_link_token || jo.id}`;
                                  const msg = `Halo ${driverName}, berikut link untuk konfirmasi tugas Anda (${jo.jo_number}): ${link}`;
                                  window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                                }}
                                className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 hover:border-emerald-400 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
                              >
                                <MessageCircle size={14} /> SEND LINK TO DRIVERS
                              </Button>
                            )}
                            <Button
                              onClick={() => setPrintingJo(jo)}
                              className="w-full h-10 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-black/20 transition-all"
                            >
                              <Printer size={14} /> PRINT DN
                            </Button>
                            {getJobCategory(jo) === 'active' ? (
                              <Link href="/hq/sbu-activities" className="w-full block">
                                <Button className="w-full h-10 bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 hover:border-blue-400 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-900/30 transition-all active:scale-95">
                                  <Satellite size={14} /> Live Tracking
                                </Button>
                              </Link>
                            ) : (
                              <Link href={`/sbu/trucking/tracking?jo=${jo.jo_number}`} className="w-full block">
                                <Button className="w-full h-10 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 hover:border-slate-600 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-black/20 transition-all">
                                  <NavIcon size={14} /> Tracking
                                </Button>
                              </Link>
                            )}
                          </>
                        )}

                     </div>
                   </div>
                </div>
             </Card>
           ))
         )}
       </div>
       {printingJo && (
         <DeliveryNoteModal
           jo={printingJo}
           onClose={() => setPrintingJo(null)}
           profile={profile}
         />
       )}
       {showRejectedModal && selectedRejectedWo && (
         <RejectedViewModal
           wo={selectedRejectedWo}
           onClose={() => setShowRejectedModal(false)}
         />
       )}

     </div>
   );
}
