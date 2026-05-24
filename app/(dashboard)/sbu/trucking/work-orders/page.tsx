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
          id, wo_item_id, status, wa_link_sent_at, driver_response, tracking_token, jo_number,
          fleet_id, driver_id, is_doc_finished, is_cost_finished,
          transporter:md_entities!transporter_id(name)
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
    total: items.length,
    pending: items.filter(i => ['pending', 'need_assignment', 'NEED_ASSIGNMENT', 'PENDING'].includes(i.status?.toUpperCase())).length,
    active: items.filter(i => ['active', 'assigned', 'in_progress', 'ACTIVE', 'ASSIGNED', 'IN_PROGRESS', 'ORDER DITERIMA', 'DALAM PERJALANAN', 'MENUNGGU MULAI / START', 'PICKING_UP', 'DELIVERING', 'MENUNGGU BERANGKAT', 'START JOURNEY'].includes(i.status?.toUpperCase())).length,
    handover: items.filter(i => i.status?.toUpperCase() === 'HANDOVER_PENDING').length,
    rejected: items.filter(i => i.status?.toUpperCase() === 'HANDOVER_REJECTED').length,
    completed: items.filter(i => ['completed', 'DONE', 'PEKERJAAN SELESAI', 'ready_for_billing', 'verified', 'awaiting_audit', 'COMPLETED', 'READY_FOR_BILLING', 'VERIFIED', 'AWAITING_AUDIT'].includes(i.status?.toUpperCase())).length
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

      const s = item.status?.toUpperCase() || '';
      
      // CRITICAL: Prevent PAID/INVOICED leakage
      if (['INVOICED', 'PAID'].includes(s)) return false;

      const jos = (item.job_orders || []).filter((j: any) => j.status !== 'cancelled');
      const totalUnits = item.item_data?.unit_count || jos.length || 1;
      const isHandoverApproved = item.item_data?.handover_approved === true;
      const maxJOCount = isHandoverApproved ? (Number(item.item_data.max_jo_count) || 0) : totalUnits;
      
      // Check how many JOs have driver and fleet assigned
      const assignedJOs = jos.filter((j: any) => j.driver_id && j.fleet_id);
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

      // More lenient check - if item status is 'assigned' show in assigned tab
      const allAssigned = (jos.length > 0 && jos.length >= totalUnits) && jos.every((j: any) => j.fleet_id && j.driver_id);
      const isAssignedStatus = ['ASSIGNED', 'ACTIVE', 'ORDER DITERIMA', 'MENUNGGU MULAI / START', 'MENUNGGU BERANGKAT'].includes(s);
      const hasAssignedStatus = s === 'ASSIGNED' || s === 'ACTIVE';

      // Debug logging
      console.log(`Item ${item.item_code}: status=${s}, jos=${jos.length}, assignedJOs=${assignedJOs.length}, totalUnits=${totalUnits}, isAssignedStatus=${isAssignedStatus}, hasAssignedStatus=${hasAssignedStatus}`);

      if (selectedStatus === 'all') return true;
      
      // Pending: show if no units assigned yet OR status is PENDING/NEED_ASSIGNMENT
      if (selectedStatus === 'pending') {
        return (!hasAnyAssigned && (s === 'PENDING' || s === 'NEED_ASSIGNMENT')) || (s === 'PENDING' && !allAssigned);
      }
      
      // Assigned: show if has any assigned OR status is ASSIGNED/ACTIVE OR handover approved
      // [AI] Exclude rejected/pending handover items from assigned tab
      if (selectedStatus === 'assigned_units') {
        const isRejectedOrPending = ['HANDOVER_REJECTED', 'HANDOVER_PENDING'].includes(s);
        return (hasAnyAssigned || isAssignedStatus || hasAssignedStatus || isHandoverApproved) && !anyMoving && !isCompleted && !isRejectedOrPending;
      }
      
      if (selectedStatus === 'on_road') return anyMoving && !isCompleted;
      if (selectedStatus === 'completed') return isCompleted;
      if (selectedStatus === 'handover_pending') return s === 'HANDOVER_PENDING';
      if (selectedStatus === 'handover_rejected') return s === 'HANDOVER_REJECTED';
      return item.status === selectedStatus;
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
      ['ORDER DITERIMA', 'MENUNGGU MULAI / START', 'ACCEPTED', 'MENUNGGU BERANGKAT'].includes(j.status?.toUpperCase())
    );

    const allAssigned = (jos.length > 0 && jos.length >= totalUnits) && jos.every((j: any) => j.fleet_id && j.driver_id);
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

    if (anyAccepted || s === 'ORDER DITERIMA' || s === 'MENUNGGU MULAI / START') {
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
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-6">
      {/* Header Section */}
      <div className="max-w-[1600px] mx-auto mb-10">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm rotate-3 hover:rotate-0 transition-transform duration-500 border border-blue-100">
              <ClipboardList size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="w-6 h-[2px] bg-blue-500 rounded-full"></span>
                <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.3em]">Operational Planning</p>
              </div>
              <h1 className="text-2xl font-black text-indigo-950 italic uppercase tracking-tighter leading-none">Missions Center</h1>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative group w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search Item, WO, or Customer..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-white border border-indigo-100 rounded-2xl text-[11px] font-black focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none shadow-sm text-indigo-900"
              />
            </div>
          </div>
        </div>

        <div className="mt-8">
          {/* Mobile: Horizontal scrollable tabs | Desktop: Wrapped tabs */}
          <div className="relative">
            <div className="flex lg:flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 overflow-x-auto lg:overflow-visible scrollbar-hide w-fit lg:w-auto max-w-full">
              <style dangerouslySetInnerHTML={{ __html: `
                .scrollbar-hide::-webkit-scrollbar { display: none; }
                .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
              `}} />
              {[
                { id: 'all', label: 'All', count: stats.total, color: 'text-slate-500' },
                { id: 'pending', label: 'Pending', count: stats.pending, color: 'text-rose-500' },
                { id: 'assigned_units', label: 'Assigned', count: items.filter(i => {
                  const jos = (i.job_orders || []).filter((j: any) => j.status !== 'cancelled');
                  const anyMoving = jos.some((j: any) => 
                    j.status?.startsWith('MENUJU') || 
                    j.status?.startsWith('TIBA') || 
                    j.status === 'in_progress' || 
                    j.status === 'DALAM PERJALANAN'
                  );
                  const allAssigned = (jos.length > 0 && jos.length >= (i.item_data?.unit_count || 1)) && jos.every((j: any) => j.fleet_id && j.driver_id);
                  const statusStr = i.status?.toUpperCase() || '';
                  const isCompleted = ['COMPLETED', 'PEKERJAAN SELESAI', 'READY_FOR_BILLING', 'VERIFIED', 'AWAITING_AUDIT'].includes(statusStr);
                  const isAssignedStatus = ['ASSIGNED', 'ACTIVE', 'ORDER DITERIMA', 'MENUNGGU MULAI / START', 'MENUNGGU BERANGKAT'].includes(statusStr);
                  const isRejectedOrPending = ['HANDOVER_REJECTED', 'HANDOVER_PENDING'].includes(statusStr);
                  return (allAssigned || isAssignedStatus) && !anyMoving && !isCompleted && !isRejectedOrPending;
                }).length, color: 'text-blue-500' },
                { id: 'on_road', label: 'On Road', count: items.filter(i => {
                  const jos = (i.job_orders || []).filter((j: any) => j.status !== 'cancelled');
                  const anyMoving = jos.some((j: any) => 
                    j.status?.toUpperCase().startsWith('MENUJU') || 
                    j.status?.toUpperCase().startsWith('TIBA') || 
                    ['IN_PROGRESS', 'DALAM PERJALANAN', 'PICKING_UP', 'DELIVERING', 'START JOURNEY', 'MENUNGGU BERANGKAT'].includes(j.status?.toUpperCase())
                  );
                  const isCompleted = ['COMPLETED', 'DONE', 'PEKERJAAN SELESAI', 'READY_FOR_BILLING', 'VERIFIED', 'AWAITING_AUDIT'].includes(i.status?.toUpperCase() || '');
                  return anyMoving && !isCompleted;
                }).length, color: 'text-emerald-500' },
                { id: 'handover_pending', label: 'Handover', count: stats.handover, color: 'text-orange-500' },
                { id: 'handover_rejected', label: 'Rejected', count: stats.rejected, color: 'text-rose-500' },
                { id: 'completed', label: 'Done', count: stats.completed, color: 'text-slate-900' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedStatus(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 lg:px-5 lg:py-2.5 rounded-xl text-[10px] lg:text-[9px] font-black uppercase tracking-wider lg:tracking-widest transition-all whitespace-nowrap flex-shrink-0 min-h-[44px] ${
                    selectedStatus === tab.id ? 'bg-slate-900 text-white shadow-md scale-[1.02]' : 'text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  {tab.label}
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] lg:text-[9px] font-black ${
                    selectedStatus === tab.id 
                      ? 'bg-white/20 text-white' 
                      : `bg-slate-100 ${tab.color}`
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
      <div className="max-w-[1600px] mx-auto">
        {loading ? (
          <div className="h-[300px] flex flex-col items-center justify-center bg-white rounded-3xl border border-slate-100">
            <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-3" />
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em]">Syncing Fleet Data...</p>
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="h-[300px] flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-slate-200 opacity-70">
            <Box size={48} className="text-slate-300 mb-4" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Missions Found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-in fade-in duration-700">
            {filteredItems.map((item) => (
              <Card 
                key={item.id} 
                className="group rounded-3xl border border-indigo-50 shadow-sm bg-white hover:shadow-md transition-all duration-300 overflow-hidden relative"
              >
                <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 rounded-full -mr-12 -mt-12 transition-colors duration-500 group-hover:bg-blue-50/50"></div>
 
                <div className="p-6 relative">
                  <div className="flex items-center justify-between mb-6">
                    <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center shadow-sm rotate-3 group-hover:rotate-0 transition-transform">
                      <Layers size={18} />
                    </div>
                    {getStatusBadge(item)}
                  </div>

                  <div className="mb-6">
                    <div className="flex items-center gap-2 mb-1.5">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">WO: {item.work_orders?.wo_number}</p>
                       <span className="w-1 h-1 bg-slate-200 rounded-full"></span>
                       <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest">ITEM: {item.item_code}</p>
                    </div>
                    <h3 className="text-lg font-black text-slate-900 italic uppercase tracking-tight leading-none group-hover:text-blue-600 transition-colors">
                      {item.work_orders?.md_entities?.legal_name || item.work_orders?.md_entities?.name}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-6">
                    <div className="bg-slate-50 p-4 rounded-xl group-hover:bg-blue-50/50 transition-colors">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Execution</p>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Calendar size={12} className="text-blue-500" />
                        <span className="text-[10px] font-black">{new Date(item.work_orders?.execution_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-xl group-hover:bg-blue-50/50 transition-colors">
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Assigned To</p>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Truck size={12} className="text-blue-500" />
                        <span className="text-[10px] font-black italic truncate">
                          {(() => {
                            const jos = (item.job_orders || []).filter((j: any) => j.status !== 'cancelled');
                            if (jos.length === 0) return 'Waiting Assignment';
                            
                            const firstJo = jos[0];
                            const transName = firstJo.transporter?.name || 'Assigned';
                            const joStatus = firstJo.status?.toUpperCase() || '';
                            
                            // Check for completion first
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

                  <div className="flex items-center gap-2">
                    {(() => {
                      const status = item.status?.toLowerCase();
                      const jos = item.job_orders || [];
                      const anyAccepted = jos.some((j: any) => j.driver_response === 'accepted' || j.status === 'in_progress');
                      const allAssigned = (jos.length > 0 && jos.length >= (item.item_data?.unit_count || 1)) && jos.every((j: any) => j.fleet_id && j.driver_id);
                      const anyNeedWa = jos.some((j: any) => !j.wa_link_sent_at && j.driver_response !== 'accepted');
                      const isCompleted = ['completed', 'verified', 'ready_for_billing', 'awaiting_audit'].includes(status);
                      const isHandoverApproved = item.item_data?.handover_approved === true;
                      const maxJOCount = isHandoverApproved ? (Number(item.item_data.max_jo_count) || 0) : (item.item_data?.unit_count || jos.length || 1);
                      
                      if (isCompleted) {
                        const allJobsReady = jos.length > 0 && jos.every((j: any) => j.status === 'ready_for_billing' || (j.is_doc_finished && j.is_cost_finished));
                        const isFinal = ['ready_for_billing', 'verified'].includes(status) || allJobsReady;
                        
                        if (isFinal) {
                          return (
                            <div className="flex-1 h-12 bg-emerald-50 text-emerald-600 rounded-xl font-black text-[9px] uppercase tracking-widest flex items-center justify-center gap-1.5 border border-emerald-100">
                                <ShieldCheck size={14} /> Ready for HQ Finance
                            </div>
                          );
                        }

                        return (
                          <Link href="/sbu/trucking/completed" className="flex-1">
                            <Button 
                              className="w-full h-12 bg-slate-900 hover:bg-blue-900/40 text-white border border-slate-700 hover:border-blue-500/50 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-slate-900/20"
                            >
                              DOCS & COST <ExternalLink size={14} />
                            </Button>
                          </Link>
                        );
                      }

                      if (anyAccepted) {
                        return (
                          <Link href={`/sbu/trucking/tracking?jo=${jos.find((j:any) => j.driver_response === 'accepted' || j.status === 'in_progress')?.jo_number || jos[0]?.jo_number}`} className="flex-1">
                            <Button 
                              className="w-full h-12 bg-slate-900 hover:bg-emerald-900/40 text-white border border-slate-700 hover:border-emerald-500/50 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-slate-900/20"
                            >
                              TRACK MISSION <Activity size={14} />
                            </Button>
                          </Link>
                        );
                      }
                      
                      // [AI] Rejected items get VIEW-only button
                      if (item.status?.toUpperCase() === 'HANDOVER_REJECTED') {
                        return (
                          <Button 
                            onClick={() => {
                              // Build a WO-like object for the RejectedViewModal
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
                            className="flex-1 h-12 bg-slate-900 hover:bg-rose-900/40 text-white border border-slate-700 hover:border-rose-500/50 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-slate-900/20"
                          >
                            <Eye size={14} /> VIEW <ArrowRight size={14} />
                          </Button>
                        );
                      }

                      // Simplified: only show EDIT button on card
                      if (item.status?.toUpperCase() === 'ASSIGNED' || isHandoverApproved) {
                        // [AI] Check if all JOs are fully assigned (have fleet + driver)
                        const allJOsAssigned = jos.length > 0 && jos.every((j: any) => j.fleet_id && j.driver_id);
                        const isConfirmedAssigned = item.item_data?.confirmed_assigned === true;
                        
                        if (allJOsAssigned || isConfirmedAssigned) {
                          // Show SEND LINK TO DRIVERS button
                          return (
                            <Button 
                              onClick={() => {
                                const assignedJOs = jos.filter((j: any) => j.fleet_id && j.driver_id);
                                const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || (typeof window !== 'undefined' ? window.location.origin : 'https://www.sentralogis.com');
                                for (const jo of assignedJOs) {
                                  const driverPhone = jo.driver_phone || '';
                                  const driverName = 'Driver';
                                  if (!driverPhone) continue;
                                  let formattedPhone = driverPhone.replace(/\D/g, '');
                                  if (formattedPhone.startsWith('0')) formattedPhone = '62' + formattedPhone.substring(1);
                                  const link = `${baseUrl}/jo/${jo.driver_link_token || jo.id}`;
                                  const msg = `Halo ${driverName}, berikut link untuk konfirmasi tugas Anda (${jo.jo_number || item.item_code}): ${link}`;
                                  window.open(`https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`, '_blank');
                                }
                              }}
                              className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 hover:border-emerald-400 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/30 active:scale-95"
                            >
                              <MessageCircle size={14} /> SEND LINK TO DRIVERS <ArrowRight size={14} />
                            </Button>
                          );
                        }

                        return (
                          <Button 
                            onClick={() => { setSelectedItemForAssignment(item); setShowAssignmentModal(true); }}
                            className="flex-1 h-12 bg-slate-900 hover:bg-emerald-900/40 text-white border border-slate-700 hover:border-emerald-500/50 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-slate-900/20"
                          >
                            {isHandoverApproved ? `MANAGE ${maxJOCount} JO(S)` : 'MANAGE ASSIGNMENTS'} <ArrowRight size={14} />
                          </Button>
                        );
                      }

                      return (
                        <Button 
                          onClick={() => { setSelectedItemForAssignment(item); setShowAssignmentModal(true); }}
                          className="flex-1 h-12 bg-slate-900 hover:bg-indigo-900/40 text-white border border-slate-700 hover:border-indigo-500/50 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-slate-900/20"
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
