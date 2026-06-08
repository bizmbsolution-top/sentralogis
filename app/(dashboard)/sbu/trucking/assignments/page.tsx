'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
// [AI] Import printCashAdvanceSlip utility to print cash advance slips for internal drivers directly from assignments list
import { printCashAdvanceSlip } from '../utils';
import { getAdvancedJobCategory as getJobCategory } from '@/lib/domain/jo/status';

// ---------------------------------------------------------
// DELIVERY NOTE MODAL (Surat Jalan)
// ---------------------------------------------------------
const DeliveryNoteModal = ({ jo, onClose, profile }: { jo: any; onClose: () => void; profile: any }) => {
  if (!jo) return null;

  const [tenantLogo, setTenantLogo] = useState<string | null>(null);

  useEffect(() => {
    if (profile?.tenant_id) {
      supabase
        .from('tenants')
        .select('logo_url')
        .eq('id', profile.tenant_id)
        .single()
        .then(({ data }) => {
          if (data?.logo_url) setTenantLogo(data.logo_url);
        });
    }
  }, [profile?.tenant_id]);

  const tenantName = profile?.tenants?.name || 'SENTRALOGIS';
  const creatorName = profile?.full_name || 'Operational Staff';
  const customer = jo.wo_item?.wo?.customer || {};
  const customerName = customer.legal_name || customer.name || '-';
  const billingParts = [customer.billing_address, customer.billing_city, customer.billing_province, customer.billing_postal_code].filter(Boolean);
  const customerAddress = billingParts.length > 0 ? billingParts.join(', ') : '-';
  const plateNumber = jo.md_fleets?.plate_number || '-';
  const truckType = jo.md_fleets?.fleet_type?.type_name || '-';
  const driverName = jo.md_drivers?.name || '-';
  const driverPhone = jo.md_drivers?.phone || jo.driver_phone || '-';
  
  const itemData = jo.wo_item?.item_data || {};
  const locations = itemData.locations || [];
  const origin = locations.length > 0 
    ? (locations[0].city || locations[0].name || locations[0].address || '-') 
    : (itemData.origin_name || itemData.shipper_name || itemData.shipper_city || itemData.pickup_location || '-');
  const destination = locations.length > 0 
    ? (locations[locations.length - 1].city || locations[locations.length - 1].name || locations[locations.length - 1].address || '-') 
    : (itemData.destination_name || itemData.recipient_name || itemData.recipient_city || itemData.delivery_location || '-');
  const routeDisplay = locations.length > 2 
    ? `${origin} → ... → ${destination} (${locations.length} stops)`
    : `${origin} → ${destination}`;
  
  const joDate = format(new Date(jo.created_at), 'dd MMM yyyy', { locale: id });
  const notes = itemData.notes || '-';

  const content = (
    <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 overflow-y-auto" id="print-overlay">
      <div className="bg-white w-full max-w-3xl shadow-lg rounded-sm border border-gray-300" id="print-container">
        
        {/* Header Control */}
        <div className="sticky top-0 z-10 px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between print:hidden">
           <div className="flex items-center gap-3">
              <FileText className="text-gray-600" size={16} />
              <span className="text-sm font-medium text-gray-700">Surat Jalan - {jo.jo_number}</span>
           </div>
           <div className="flex items-center gap-2">
              <button onClick={() => window.print()} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded flex items-center gap-1.5 transition-colors">
                 <Printer size={14} /> Print
              </button>
              <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors">
                 <X size={16} />
              </button>
           </div>
        </div>

        {/* Document Content */}
        <div className="p-6" id="delivery-note-print">
           <style dangerouslySetInnerHTML={{ __html: `
              @page { size: A4 portrait; margin: 10mm; }
              @media print {
                body > *:not(#print-overlay) {
                  display: none !important;
                }
                #print-overlay {
                  position: static !important;
                  width: 100% !important;
                  height: auto !important;
                  background: white !important;
                  padding: 0 !important;
                  margin: 0 !important;
                  overflow: visible !important;
                  z-index: auto !important;
                }
                #print-container {
                  width: 100% !important;
                  max-width: none !important;
                  box-shadow: none !important;
                  border: none !important;
                  border-radius: 0 !important;
                  margin: 0 !important;
                }
                .print\\:hidden {
                  display: none !important;
                }
                #delivery-note-print {
                  padding: 0 !important;
                  margin: 0 !important;
                }
                table, tr, td, th, div {
                  page-break-inside: avoid !important;
                }
                html, body {
                  overflow: visible !important;
                  height: auto !important;
                }
              }
           `}} />

           <div className="max-w-[190mm] mx-auto text-black">
              {/* Header */}
              <div className="flex justify-between items-start border-b-2 border-black pb-3 mb-5">
                 <div className="flex items-center gap-3">
                    {tenantLogo && (
                       <img src={tenantLogo} alt="Logo" className="h-8 w-auto object-contain" />
                    )}
                    <h1 className="text-lg font-bold">{tenantName}</h1>
                 </div>
                 <div className="text-right">
                    <h2 className="text-base font-bold">SURAT JALAN</h2>
                    <p className="text-xs mt-0.5">No: {jo.jo_number}</p>
                    <p className="text-xs">{joDate}</p>
                 </div>
              </div>

              {/* Info Section */}
              <div className="grid grid-cols-2 gap-6 mb-6">
                 <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Bill To / Customer</p>
                    <p className="text-sm font-bold">{customerName}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{customerAddress}</p>
                 </div>
                 <div className="border border-gray-300 rounded-md p-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Kendaraan & Driver</p>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                       <span className="text-gray-500">Driver:</span>
                       <span className="font-medium">{driverName}</span>
                       <span className="text-gray-500">Telp:</span>
                       <span className="font-medium">{driverPhone}</span>
                       <span className="text-gray-500">No. Polisi:</span>
                       <span className="font-medium">{plateNumber}</span>
                       <span className="text-gray-500">Jenis:</span>
                       <span className="font-medium">{truckType}</span>
                    </div>
                 </div>
              </div>

              {/* Items Table */}
              <table className="w-full border border-gray-400 mb-5 text-xs">
                 <thead>
                    <tr className="bg-gray-50">
                       <th className="border border-gray-400 px-3 py-2 text-left font-semibold w-10">No</th>
                       <th className="border border-gray-400 px-3 py-2 text-left font-semibold">Deskripsi Barang</th>
                       <th className="border border-gray-400 px-3 py-2 text-center font-semibold w-12">Qty</th>
                       <th className="border border-gray-400 px-3 py-2 text-left font-semibold">Rute</th>
                    </tr>
                 </thead>
                 <tbody>
                    <tr>
                       <td className="border border-gray-400 px-3 py-2 text-center">1</td>
                       <td className="border border-gray-400 px-3 py-2">{truckType}</td>
                       <td className="border border-gray-400 px-3 py-2 text-center">1</td>
                       <td className="border border-gray-400 px-3 py-2">{routeDisplay}</td>
                    </tr>
                 </tbody>
              </table>

              {/* Notes */}
              <div className="mb-8">
                 <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Catatan</p>
                 <div className="border border-gray-300 rounded-md p-3 text-xs text-gray-600 min-h-[35px]">
                    {notes}
                 </div>
              </div>

              {/* Signature Section */}
              <div className="grid grid-cols-3 gap-8 text-center mb-6">
                 <div>
                    <p className="text-xs text-gray-500 mb-12">Dibuat Oleh</p>
                    <div className="border-t border-black pt-2">
                       <p className="text-xs font-bold">{creatorName}</p>
                    </div>
                 </div>
                 <div>
                    <p className="text-xs text-gray-500 mb-12">Driver / Pengirim</p>
                    <div className="border-t border-black pt-2">
                       <p className="text-xs font-bold">{driverName}</p>
                    </div>
                 </div>
                 <div>
                    <p className="text-xs text-gray-500 mb-12">Penerima</p>
                    <div className="border-t border-black pt-2">
                       <p className="text-xs font-bold">{customerName}</p>
                    </div>
                 </div>
              </div>

              {/* Footer */}
              <div className="pt-3 border-t border-gray-200 text-center">
                 <p className="text-[9px] text-gray-400">Dokumen ini sah sebagai bukti pengiriman resmi dari {tenantName}</p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : null;
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
        console.error('Failed to resolve fallback tenant ID for SBU assignments:', e);
      }
    }

    if (!tenantId) {
      setLoading(false);
      return;
    }

    try {
      if (!silent) setLoading(true);
      
      const { data: baseData, error: baseError } = await supabase
        .from('job_orders')
        .select(`
          *,
          wo_item:wo_items!wo_item_id (
            id, item_data,
            wo:work_orders!wo_id (
              id, wo_number, customer:md_entities!customer_id (id, legal_name, billing_address, billing_city, billing_province, billing_postal_code)
            )
          )
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      if (baseError) throw baseError;
      const rawJOs = baseData || [];
      // [AI] Strictly filter for TRUCKING SBU to prevent Warehouse JOs from leaking into Trucking Dashboard
      const truckingJOs = rawJOs.filter((jo: any) => jo.wo_item?.sbu_type === 'TRUCKING');
      
      // [AI] Include rejected JOs even if they have no driver/fleet — they still need to be visible
      const baseJOs = Array.from(new Map(truckingJOs.map(jo => [jo.id, jo])).values())
        .filter(jo => jo.driver_id && jo.fleet_id || ['REJECTED', 'HANDOVER_REJECTED', 'CANCELLED'].includes(jo.status?.toUpperCase()));

      if (baseJOs.length > 0) {
        const driverIds = [...new Set(baseJOs.map(j => j.driver_id).filter(Boolean))];
        const fleetIds = [...new Set(baseJOs.map(j => j.fleet_id).filter(Boolean))];

        const [driversRes, fleetsRes] = await Promise.all([
          driverIds.length > 0 ? supabase.from('md_drivers').select('id, name, phone, md_entities(is_vendor)').in('id', driverIds) : { data: [] },
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
  }, [supabase, profile?.tenant_id, profile?.role]);

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

  // [AI] getJobCategory is now imported from @/lib/domain/jo/status

  const stats = useMemo(() => {
    const categories = jobOrders.map(jo => getJobCategory(jo));
    return {
      total: jobOrders.filter(jo => {
        const cat = getJobCategory(jo);
        return cat !== 'rejected' && cat !== 'completed';
      }).length,
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

      // [AI] Rejected and Completed JOs are hidden from 'all' — only visible via their respective tabs
      if (selectedStatus === 'all') return category !== 'rejected' && category !== 'completed';
      if (selectedStatus === 'new') return category === 'awaiting';
      if (selectedStatus === 'rejected') return category === 'rejected';
      return category === selectedStatus;
    });
  }, [jobOrders, searchTerm, selectedStatus]);

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
        <div className="mt-8">
          <div className="relative">
            <div className="flex lg:flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-indigo-50 overflow-x-auto lg:overflow-visible scrollbar-hide w-fit lg:w-auto max-w-full">
              <style dangerouslySetInnerHTML={{ __html: `
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
              `}} />
              {[
                { id: 'all', label: 'All', count: stats.total },
                { id: 'new', label: 'New', count: stats.needsAssign },
                { id: 'assigned', label: 'Assigned', count: stats.assignedCount },
                { id: 'active', label: 'On Journey', count: stats.onJourney },
                { id: 'rejected', label: 'Rejected', count: stats.rejected },
                { id: 'completed', label: 'Done', count: stats.jobDone }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedStatus(tab.id)}
                  className={`h-[44px] px-3 lg:px-5 rounded-xl text-[10px] lg:text-[9px] font-black uppercase tracking-wider lg:tracking-widest transition-all flex items-center gap-1.5 whitespace-nowrap flex-shrink-0 ${
                    selectedStatus === tab.id 
                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-200 shadow-sm' 
                      : 'text-indigo-400 hover:bg-indigo-50/50 hover:text-indigo-600'
                  }`}
                >
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] lg:text-[8px] ${selectedStatus === tab.id ? 'bg-indigo-200 text-indigo-900' : 'bg-indigo-50/80 text-indigo-500'}`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
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
                                  const isInternal = jo.md_drivers?.md_entities?.is_vendor === false;
                                  
                                  let link, msg;
                                  if (isInternal) {
                                    link = `${origin}/driver/portal`;
                                    msg = `Halo ${driverName}, Anda mendapat tugas baru (${jo.jo_number}). Silakan buka aplikasi Driver Portal Anda untuk mengecek dan menerima tugas: ${link}`;
                                  } else {
                                    link = `${origin}/jo/${jo.driver_link_token || jo.id}`;
                                    msg = `Halo ${driverName}, berikut link untuk konfirmasi tugas Anda (${jo.jo_number}): ${link}`;
                                  }
                                  
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
                            {/* [AI] Print cash advance/payout voucher button - only visible if there is an allocated advance amount */}
                            {Number(jo.advance_amount || 0) > 0 && (
                              <Button
                                onClick={() => printCashAdvanceSlip(jo)}
                                className="w-full h-10 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 hover:border-emerald-400 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/30 transition-all active:scale-95"
                              >
                                <Printer size={14} /> PRINT KASBON
                              </Button>
                            )}
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
