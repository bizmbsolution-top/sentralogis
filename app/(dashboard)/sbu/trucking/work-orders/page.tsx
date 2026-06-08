'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { sendNotification } from '@/lib/supabase/notifications';
import { useSearchParams, useRouter } from 'next/navigation';
import { 
  Truck, Search, Filter, Loader2, 
  MapPin, Calendar, Clock, ChevronRight, User,
  ClipboardList, AlertCircle, Activity,
  Package, CheckCircle, ArrowRight, AlertTriangle,
  Layers, ExternalLink, ShieldCheck, Box, CheckCircle2, Eye, MessageCircle
} from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { StatusBadge } from '../../../../../components/ui/StatusBadge';
import AssignmentModal from './components/AssignmentModal';
import WODetailSidebar from './components/WODetailSidebar';
import HandoverSbuModal from '../components/HandoverSbuModal';
import RejectedViewModal from '../../../../(dashboard)/hq/work-orders/components/RejectedViewModal';

export const filterItemByTab = (item: any, tabId: string) => {
  const s = item.status?.toUpperCase() || '';
  
  // CRITICAL: Prevent PAID/INVOICED leakage
  if (['INVOICED', 'PAID'].includes(s)) return false;

  const jos = (item.job_orders || []).filter((j: any) => j.status !== 'cancelled');
  const totalUnits = item.item_data?.unit_count || jos.length || 1;
  const isHandoverApproved = item.item_data?.handover_approved === true;
  
  // Check how many JOs have driver and fleet assigned (exclude pending drafts)
  const assignedJOs = jos.filter((j: any) => j.driver_id && j.fleet_id && j.status !== 'pending');
  const hasAnyAssigned = assignedJOs.length > 0;
  
  const allJobsCompleted = jos.length > 0 && jos.length >= totalUnits && jos.every((j: any) => 
    ['COMPLETED', 'DONE', 'PEKERJAAN SELESAI', 'READY_FOR_BILLING', 'VERIFIED', 'AWAITING_AUDIT'].includes(j.status?.toUpperCase())
  );
  
  const isCompleted = allJobsCompleted || ['COMPLETED', 'DONE', 'PEKERJAAN SELESAI', 'READY_FOR_BILLING', 'VERIFIED', 'AWAITING_AUDIT'].includes(s);
  
  const anyMoving = !isCompleted && jos.some((j: any) => 
    j.status?.toUpperCase().startsWith('MENUJU') || 
    j.status?.toUpperCase().startsWith('TIBA') || 
    ['IN_PROGRESS', 'DALAM PERJALANAN', 'PICKING_UP', 'DELIVERING', 'START JOURNEY'].includes(j.status?.toUpperCase())
  );

  const allAssigned = (jos.length > 0 && jos.length >= totalUnits) && jos.every((j: any) => j.fleet_id && j.driver_id && j.status !== 'pending');
  const isAssignedStatus = ['ASSIGNED', 'ACTIVE', 'ORDER DITERIMA', 'MENUNGGU MULAI / START', 'MENUNGGU BERANGKAT'].includes(s);
  const hasAssignedStatus = s === 'ASSIGNED' || s === 'ACTIVE';

  if (tabId === 'all') return true;
  
  if (tabId === 'pending') {
    return (!hasAnyAssigned && (s === 'PENDING' || s === 'NEED_ASSIGNMENT')) || (s === 'PENDING' && !allAssigned);
  }
  
  if (tabId === 'assigned_units') {
    const isRejectedOrPending = ['HANDOVER_REJECTED', 'HANDOVER_PENDING'].includes(s);
    return (hasAnyAssigned || isAssignedStatus || hasAssignedStatus || isHandoverApproved) && !anyMoving && !isCompleted && !isRejectedOrPending;
  }
  
  if (tabId === 'on_road') return anyMoving && !isCompleted;
  if (tabId === 'completed') return isCompleted;
  if (tabId === 'handover_pending') return s === 'HANDOVER_PENDING';
  if (tabId === 'handover_rejected') return s === 'HANDOVER_REJECTED';
  
  return item.status === tabId;
};

export default function WorkOrderPlanningPage() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('pending'); 
  
  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedItemForAssignment, setSelectedItemForAssignment] = useState<any>(null);
  
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [handoverItem, setHandoverItem] = useState<any>(null);
  const [isSubmittingHandover, setIsSubmittingHandover] = useState(false);
  const [showRejectedModal, setShowRejectedModal] = useState(false);
  const [selectedRejectedItem, setSelectedRejectedItem] = useState<any>(null);

  useEffect(() => {
    const status = searchParams.get('status');
    if (status) setSelectedStatus(status);
  }, [searchParams]);

  const fetchData = useCallback(async () => {
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
        console.error('Failed to resolve fallback tenant ID for SBU work orders:', e);
      }
    }

    if (!tenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    
    const { data: baseItems, error: baseError } = await supabase
      .from('wo_items')
      .select(`
        *, 
        work_orders!inner(id, wo_number, execution_date, status, md_entities!customer_id(name, legal_name))
      `)
      .eq('tenant_id', tenantId)
      .eq('sbu_type', 'TRUCKING')
      .order('created_at', { ascending: false });

    if (baseError) {
      toast.error('Gagal mengambil data operasional');
      setLoading(false);
      return;
    }

    const itemsData = baseItems || [];
    const itemIds = itemsData.map(i => i.id);
    
    if (itemIds.length > 0) {
      const { data: joData } = await supabase
        .from('job_orders')
        .select(`
          id, wo_item_id, status, wa_link_sent_at, driver_response, tracking_token, wa_token, jo_number,
          fleet_id, driver_id, is_doc_finished, is_cost_finished,
          transporter:md_entities!transporter_id(name),
          driver:md_drivers(name, phone, md_entities(is_vendor))
        `)
        .in('wo_item_id', itemIds);
      
      const enrichedItems = itemsData.map(item => ({
        ...item,
        item_data: typeof item.item_data === 'string' ? JSON.parse(item.item_data) : (item.item_data || {}),
        job_orders: (joData || []).filter(jo => jo.wo_item_id === item.id)
      }));
      setItems(enrichedItems);
    } else {
      const parsedItems = itemsData.map(item => ({
        ...item,
        item_data: typeof item.item_data === 'string' ? JSON.parse(item.item_data) : (item.item_data || {})
      }));
      setItems(parsedItems);
    }
    setLoading(false);
  }, [profile?.tenant_id, profile?.role]);

  useEffect(() => {
    const isGlobalRole = profile?.role === 'owner_sentralogis' || profile?.role?.startsWith('hq_');
    if (!profile?.tenant_id && !isGlobalRole) {
      // If we've waited and still no tenant_id, stop loading to show empty or login
      const timer = setTimeout(() => setLoading(false), 2000);
      return () => clearTimeout(timer);
    }
    fetchData();
  }, [profile?.tenant_id, profile?.role, fetchData]);

  useEffect(() => {
    const itemId = searchParams.get('itemId');
    if (itemId && items.length > 0) {
      const item = items.find(i => i.id === itemId);
      if (item) {
        setSelectedItemForAssignment(item);
        setShowAssignmentModal(true);
      }
    }
  }, [searchParams, items]);

  const stats = {
    total: items.filter(i => filterItemByTab(i, 'all')).length,
    pending: items.filter(i => filterItemByTab(i, 'pending')).length,
    assigned_units: items.filter(i => filterItemByTab(i, 'assigned_units')).length,
    on_road: items.filter(i => filterItemByTab(i, 'on_road')).length,
    handover: items.filter(i => filterItemByTab(i, 'handover_pending')).length,
    rejected: items.filter(i => filterItemByTab(i, 'handover_rejected')).length,
    completed: items.filter(i => filterItemByTab(i, 'completed')).length
  };

  useEffect(() => {
  const channel = supabase.channel('public:job_orders')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'job_orders' }, payload => {
      console.log('Realtime update:', payload);
      fetchData();
    })
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}, []);

const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.work_orders.wo_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.work_orders.md_entities.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchesSearch) return false;

      return filterItemByTab(item, selectedStatus);
    });
  }, [items, searchTerm, selectedStatus]);

  const getStatusBadge = (item: any) => {
    const s = item.status?.toUpperCase() || '';
    const jos = (item.job_orders || []).filter((j: any) => j.status !== 'cancelled');
    const totalUnits = item.item_data?.unit_count || jos.length || 1;
    const isHandoverApproved = item.item_data?.handover_approved === true;
    const isConfirmedAssigned = item.item_data?.confirmed_assigned === true;
    const maxJOCount = isHandoverApproved ? (Number(item.item_data.max_jo_count) || 0) : totalUnits;
    
    const allJobsCompleted = jos.length > 0 && jos.length >= totalUnits && jos.every((j: any) => 
      ['COMPLETED', 'DONE', 'PEKERJAAN SELESAI', 'READY_FOR_BILLING', 'VERIFIED', 'AWAITING_AUDIT'].includes(j.status?.toUpperCase())
    );
    
    const isCompleted = allJobsCompleted || ['COMPLETED', 'DONE', 'PEKERJAAN SELESAI', 'READY_FOR_BILLING', 'VERIFIED', 'AWAITING_AUDIT', 'DOC_COMPLETED'].includes(s);

    if (isCompleted) {
        const allDocDone = jos.every((j: any) => j.is_doc_finished);
        const allCostDone = jos.every((j: any) => j.is_cost_finished);
        const allReady = jos.every((j: any) => j.status === 'ready_for_billing' || (j.is_doc_finished && j.is_cost_finished));
        const anyAwaitingAudit = jos.some((j: any) => j.status?.toUpperCase() === 'AWAITING_AUDIT');

        if (allReady || s === 'READY_FOR_BILLING' || s === 'VERIFIED') {
          return <Badge className="!bg-emerald-600 !text-white border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic shadow-lg shadow-emerald-500/20">SIAP INVOICE</Badge>;
        }

        if (anyAwaitingAudit || s === 'AWAITING_AUDIT') {
          return <Badge className="!bg-amber-600 !text-white border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">MENUNGGU AUDIT</Badge>;
        }

        if (!allDocDone || !allCostDone) {
          return <Badge className="!bg-blue-500 !text-white border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic animate-pulse">PROSES DOC & COST</Badge>;
        }
        
        return <Badge className="!bg-slate-900 !text-white border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">PEKERJAAN SELESAI</Badge>;
    }

    const anyMoving = jos.some((j: any) => 
      j.status?.toUpperCase().startsWith('MENUJU') || 
      j.status?.toUpperCase().startsWith('TIBA') || 
      ['IN_PROGRESS', 'DALAM PERJALANAN', 'PICKING_UP', 'DELIVERING', 'START JOURNEY'].includes(j.status?.toUpperCase())
    );
    
    const anyAccepted = jos.some((j:any) => 
      j.driver_response === 'accepted' || 
      ['ORDER DITERIMA', 'MENUNGGU MULAI / START', 'ACCEPTED', 'MENUNGGU BERANGKAT', 'DITERIMA'].includes(j.status?.toUpperCase())
    );

    const allAssigned = (jos.length > 0 && jos.length >= totalUnits) && jos.every((j: any) => j.fleet_id && j.driver_id && j.status !== 'pending');
    const isAssignedStatus = ['ASSIGNED', 'ACTIVE', 'ORDER DITERIMA', 'MENUNGGU MULAI / START', 'MENUNGGU BERANGKAT'].includes(s);
    
    // [AI] Check rejected status before assigned
    if (s === 'HANDOVER_REJECTED') {
      return <Badge className="!bg-rose-500 !text-white border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">REJECTED</Badge>;
    }
    if (s === 'HANDOVER_PENDING') {
      return <Badge className="!bg-orange-500 !text-white border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic animate-pulse">HANDOVER PENDING</Badge>;
    }
    
    if (anyMoving) {
      return <Badge className="!bg-amber-500 !text-white border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic animate-pulse">ON ROAD</Badge>;
    }

    if (anyAccepted || s === 'ORDER DITERIMA' || s === 'MENUNGGU MULAI / START' || s === 'DITERIMA') {
       return <Badge className="!bg-emerald-500 !text-white border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">ACCEPTED</Badge>;
    }

    if (allAssigned || isAssignedStatus) {
      const anyDispatched = jos.some((j: any) => j.wa_link_sent_at);
      if (isConfirmedAssigned) return <Badge className="!bg-emerald-600 !text-white border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic shadow-lg shadow-emerald-500/20">CONFIRMED ASSIGNED</Badge>;
      if (anyDispatched) return <Badge className="!bg-blue-500 !text-white border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">DISPATCHED</Badge>;
      if (isHandoverApproved) return <Badge className="!bg-emerald-500 !text-white border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">HANDOVER APPROVED ({maxJOCount} JO)</Badge>;
      return <Badge className="!bg-indigo-500 !text-white border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">ASSIGNED</Badge>;
    }

    return <Badge className="!bg-rose-500 !text-white border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">NEED ASSIGNMENT</Badge>;
  };

  const handleHandoverSubmit = async (reason: string) => {
    if (!handoverItem || !reason.trim()) return;
    setIsSubmittingHandover(true);
    try {
      // Store rejection reason in item_data instead of notes column
      const currentItemData = typeof handoverItem.item_data === 'string' 
        ? JSON.parse(handoverItem.item_data) 
        : (handoverItem.item_data || {});
      
      const { error } = await supabase
        .from('wo_items')
        .update({ 
          status: 'handover_pending',
          item_data: {
            ...currentItemData,
            handover_note: reason,
            handover_requested_at: new Date().toISOString(),
            handover_requested_by: profile?.full_name || profile?.id
          }
        })
        .eq('id', handoverItem.id);

      if (error) throw error;

      // Trigger Notification for HQ
      await sendNotification(profile?.tenant_id || '', {
        title: 'Handover Requested',
        message: `SBU requested handover for ${handoverItem.item_code} (${handoverItem.work_orders?.wo_number})`,
        link: `/hq/work-orders?status=handover_pending&itemId=${handoverItem.id}`,
        role: 'HQ_ADMIN' // Or HQ_CS
      });

      toast.success('Misi berhasil dikembalikan ke HQ');
      setShowHandoverModal(false);
      fetchData();
    } catch (err: any) {
      toast.error('Gagal memproses handover: ' + err.message);
    } finally {
      setIsSubmittingHandover(false);
    }
  };

  const handleCompleteAssignment = async (item: any) => {
    try {
      const jos = item.job_orders || [];
      const pendingJos = jos.filter((j: any) => j.status === 'pending' && j.driver_id && j.fleet_id);

      // Update all pending job_orders to 'assigned' status
      if (pendingJos.length > 0) {
        const joIds = pendingJos.map((j: any) => j.id);
        const { error: joError } = await supabase
          .from('job_orders')
          .update({ status: 'assigned' })
          .in('id', joIds);

        if (joError) throw joError;
      }

      // Update WO Item status to 'assigned'
      const { error } = await supabase
        .from('wo_items')
        .update({ status: 'assigned' })
        .eq('id', item.id);

      if (error) throw error;

      toast.success(`Assignment completed! ${pendingJos.length} units ready for dispatch.`);
      fetchData();
    } catch (err: any) {
      toast.error('Failed to complete assignment: ' + err.message);
    }
  };

  const handleSaveToDraft = async (item: any) => {
    try {
      // Keep status as 'pending' - just save current assignments
      const { error } = await supabase
        .from('wo_items')
        .update({ status: 'pending' })
        .eq('id', item.id);

      if (error) throw error;

      toast.success('Saved as draft - can continue editing later');
      fetchData();
    } catch (err: any) {
      toast.error('Failed to save draft: ' + err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-8">
      {/* Header Section */}
      <div className="max-w-[1400px] mx-auto mb-8">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white text-slate-800 rounded-xl flex items-center justify-center shadow-sm border border-slate-200">
              <ClipboardList size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-500 mb-1">Operational Planning</p>
              <h1 className="text-2xl md:text-3xl font-bold text-slate-900 leading-none">Assignment Console</h1>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative group w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search Item, WO, or Customer..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 pl-11 pr-4 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all outline-none shadow-sm text-slate-900"
              />
            </div>
          </div>
        </div>

        <div className="mt-6">
          <div className="relative">
            <div className="flex items-center gap-6 border-b border-slate-200 overflow-x-auto scrollbar-hide w-full pb-px">
              <style dangerouslySetInnerHTML={{ __html: `
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
              `}} />
              {[
                { id: 'all', label: 'All Assignments', count: stats.total, color: 'text-slate-500' },
                { id: 'pending', label: 'Need Assignment', count: stats.pending, color: 'text-rose-500' },
                { id: 'assigned_units', label: 'Assigned', count: stats.assigned_units, color: 'text-blue-500' },
                { id: 'on_road', label: 'On Journey', count: stats.on_road, color: 'text-emerald-500' },
                { id: 'handover_pending', label: 'Handover', count: stats.handover, color: 'text-orange-500' },
                { id: 'handover_rejected', label: 'Rejected', count: stats.rejected, color: 'text-rose-500' },
                { id: 'completed', label: 'Completed', count: stats.completed, color: 'text-slate-900' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedStatus(tab.id)}
                  className={`flex items-center gap-2 pb-4 border-b-2 text-sm font-semibold transition-all whitespace-nowrap ${
                    selectedStatus === tab.id ? 'border-slate-900 text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
                >
                  {tab.label}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    selectedStatus === tab.id 
                      ? 'bg-slate-100 text-slate-900' 
                      : `bg-slate-50 ${tab.color}`
                  }`}>
                    {tab.count}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
 
      {/* Grid Content */}
      <div className="max-w-[1400px] mx-auto pb-20">
        {loading ? (
          <div className="h-[300px] flex flex-col items-center justify-center bg-white rounded-xl border border-slate-200">
            <Loader2 className="w-8 h-8 text-slate-400 animate-spin mb-3" />
            <p className="text-sm font-semibold text-slate-500">Syncing Fleet Data...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="h-[300px] flex flex-col items-center justify-center bg-white rounded-xl border border-dashed border-slate-200 opacity-70">
            <Box size={48} className="text-slate-300 mb-4" />
            <p className="text-sm font-semibold text-slate-500">No Missions Found</p>
          </div>
        ) : (
          <div className="flex flex-col space-y-4 animate-in fade-in duration-500">
            {filteredItems.map((item) => (
              <Card 
                key={item.id} 
                className="group rounded-xl border border-slate-200 shadow-sm bg-white hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden"
              >
                <div className="p-5 sm:p-6 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
                  
                  {/* Left: Info */}
                  <div className="flex-1 min-w-0 flex items-start gap-5">
                    <div className="w-12 h-12 bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center border border-slate-200 shrink-0">
                      <Layers size={20} />
                    </div>
                    
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        {getStatusBadge(item)}
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">WO: {item.work_orders?.wo_number}</span>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">ITEM: {item.item_code}</span>
                      </div>
                      
                      <h3 className="text-lg font-bold text-slate-900 truncate pr-4">
                        {item.work_orders?.md_entities?.legal_name || item.work_orders?.md_entities?.name}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-6 mt-3">
                        <div className="flex items-center gap-2 text-slate-600">
                          <Calendar size={14} className="text-slate-400" />
                          <span className="text-sm font-medium">{new Date(item.work_orders?.execution_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                        <div className="flex items-center gap-2 text-slate-600">
                          <Truck size={14} className="text-slate-400" />
                          <span className="text-sm font-medium truncate max-w-[200px] xl:max-w-[300px]">
                            {(() => {
                              const jos = (item.job_orders || []).filter((j: any) => j.status !== 'cancelled');
                              if (jos.length === 0) return 'Waiting Assignment';
                              
                              const firstJo = jos[0];
                              const transName = firstJo.transporter?.name || 'Assigned';
                              const joStatus = firstJo.status?.toUpperCase() || '';
                              
                              if (['COMPLETED', 'DONE', 'READY_FOR_BILLING', 'VERIFIED'].includes(joStatus)) {
                                 return `${transName} - COMPLETED`;
                              }
                              if (jos.length > 1) return `${jos.length} Units Assigned`;
                              if (joStatus.startsWith('MENUJU') || joStatus.startsWith('TIBA') || joStatus === 'DALAM PERJALANAN' || joStatus === 'IN_PROGRESS' || joStatus === 'PICKING_UP' || joStatus === 'DELIVERING' || joStatus === 'START JOURNEY') {
                                return `${transName} - ON JOURNEY`;
                              }
                              if (joStatus === 'MENUNGGU MULAI / START' || joStatus === 'MENUNGGU BERANGKAT' || firstJo.driver_response === 'accepted') {
                                return `${transName} - WAITING START`;
                              }
                              
                              return transName;
                            })()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="w-full lg:w-48 shrink-0 flex flex-col gap-2 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-6">
                    {(() => {
                      const status = item.status?.toLowerCase();
                      const jos = item.job_orders || [];
                      const anyAccepted = jos.some((j: any) => j.driver_response === 'accepted' || j.status === 'in_progress');
                      const allAssigned = (jos.length > 0 && jos.length >= (item.item_data?.unit_count || 1)) && jos.every((j: any) => j.fleet_id && j.driver_id && j.status !== 'pending');
                      const anyNeedWa = jos.some((j: any) => !j.wa_link_sent_at && j.driver_response !== 'accepted');
                      const isCompleted = ['completed', 'verified', 'ready_for_billing', 'awaiting_audit'].includes(status);
                      const isHandoverApproved = item.item_data?.handover_approved === true;
                      const maxJOCount = isHandoverApproved ? (Number(item.item_data.max_jo_count) || 0) : (item.item_data?.unit_count || jos.length || 1);
                      
                      if (isCompleted) {
                        const allJobsReady = jos.length > 0 && jos.every((j: any) => j.status === 'ready_for_billing' || (j.is_doc_finished && j.is_cost_finished));
                        const isFinal = ['ready_for_billing', 'verified'].includes(status) || allJobsReady;
                        
                        if (isFinal) {
                          return (
                            <div className="w-full h-10 bg-emerald-50 text-emerald-700 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 border border-emerald-200">
                                <ShieldCheck size={16} /> HQ Finance
                            </div>
                          );
                        }

                        return (
                          <Link href="/sbu/trucking/completed" className="w-full">
                            <Button className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2">
                              DOCS & COST <ExternalLink size={14} />
                            </Button>
                          </Link>
                        );
                      }

                      if (anyAccepted) {
                        return (
                          <Link href={`/sbu/trucking/tracking?jo=${jos.find((j:any) => j.driver_response === 'accepted' || j.status === 'in_progress')?.jo_number || jos[0]?.jo_number}`} className="w-full">
                            <Button className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2">
                              TRACK MISSION <Activity size={14} />
                            </Button>
                          </Link>
                        );
                      }
                      
                      if (item.status?.toUpperCase() === 'HANDOVER_REJECTED') {
                        return (
                          <Button 
                            onClick={() => {
                              setSelectedRejectedItem({
                                id: item.work_orders?.id,
                                wo_number: item.work_orders?.wo_number,
                                execution_date: item.work_orders?.execution_date,
                                order_date: item.work_orders?.order_date,
                                md_entities: item.work_orders?.md_entities,
                                notes: item.work_orders?.notes,
                                status: item.work_orders?.status,
                                wo_items: [item]
                              });
                              setShowRejectedModal(true);
                            }}
                            className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                          >
                            <Eye size={14} /> VIEW
                          </Button>
                        );
                      }

                      if (item.status?.toUpperCase() === 'ASSIGNED' || isHandoverApproved) {
                        const allJOsAssigned = jos.length > 0 && jos.every((j: any) => j.fleet_id && j.driver_id);
                        const isConfirmedAssigned = item.item_data?.confirmed_assigned === true;
                        
                        if (allJOsAssigned || isConfirmedAssigned) {
                          return (
                            <Button 
                              onClick={() => {
                                const assignedJOs = jos.filter((j: any) => j.fleet_id && j.driver_id);
                                const baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://www.sentralogis.com')).trim().replace(/[\r\n\s]+$/, '');
                                for (const jo of assignedJOs) {
                                  const driver = jo.driver;
                                  const driverPhone = driver?.phone || '';
                                  const driverName = driver?.name || 'Driver';
                                  if (!driverPhone) continue;
                                  let formattedPhone = driverPhone.replace(/\D/g, '');
                                  if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.substring(1);
                                  
                                  const isInternal = driver?.md_entities?.is_vendor === false;
                                  let link, msg;
                                  
                                  if (isInternal) {
                                    link = `${baseUrl}/driver/portal`;
                                    msg = `Halo ${driverName}, Anda mendapat tugas baru (${jo.jo_number || item.item_code}). Silakan buka aplikasi Driver Portal Anda untuk mengecek dan menerima tugas: ${link}`;
                                  } else {
                                    link = `${baseUrl}/jo/${jo.driver_link_token || jo.id}`;
                                    msg = `Halo ${driverName}, berikut link untuk konfirmasi tugas Anda (${jo.jo_number || item.item_code}): ${link}`;
                                  }
                                  
                                  window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                                }
                              }}
                              className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-sm"
                            >
                              <MessageCircle size={14} /> LINK TO DRIVERS
                            </Button>
                          );
                        }

                        return (
                          <Button 
                            onClick={() => { setSelectedItemForAssignment(item); setShowAssignmentModal(true); }}
                            className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                          >
                            {isHandoverApproved ? `MANAGE ${maxJOCount} JO(S)` : 'MANAGE'} <ArrowRight size={14} />
                          </Button>
                        );
                      }

                      return (
                        <Button 
                          onClick={() => { setSelectedItemForAssignment(item); setShowAssignmentModal(true); }}
                          className="w-full h-10 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                        >
                          EDIT <ArrowRight size={14} />
                        </Button>
                      );
                    })()}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showAssignmentModal && (
        <AssignmentModal 
          key={selectedItemForAssignment?.id}
          item={selectedItemForAssignment}
          onClose={() => {
            setShowAssignmentModal(false);
            router.replace('/sbu/trucking/work-orders');
          }}
          onSuccess={() => { 
            setShowAssignmentModal(false); 
            router.replace('/sbu/trucking/work-orders');
            fetchData(); 
          }}
          onHandover={() => {
            setShowAssignmentModal(false);
            setHandoverItem(selectedItemForAssignment);
            setShowHandoverModal(true);
          }}
        />
      )}

      {showHandoverModal && (
        <HandoverSbuModal
          show={showHandoverModal}
          workOrder={handoverItem}
          onClose={() => setShowHandoverModal(false)}
          onSubmit={handleHandoverSubmit}
          isSubmitting={isSubmittingHandover}
        />
      )}

      {showRejectedModal && selectedRejectedItem && (
        <RejectedViewModal
          wo={selectedRejectedItem}
          onClose={() => setShowRejectedModal(false)}
        />
      )}
    </div>
  );
}
