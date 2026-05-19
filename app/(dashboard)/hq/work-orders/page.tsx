'use client';
// Refreshed at: 2026-05-12T10:35:00Z

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  Plus, Search, FileText, Filter, Loader2, 
  ChevronRight, Calendar, User, Clock, CheckCircle2,
  Truck, Activity, ShieldCheck, TrendingUp, ScanBarcode,
  ArrowRight, Users, Layers, ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import CreateWOForm from './components/CreateWOForm';
import HandoverApprovalModal from './components/HandoverApprovalModal';
import RejectedViewModal from './components/RejectedViewModal';

interface WorkOrder {
  id: string;
  wo_number: string;
  customer_id: string;
  order_date: string;
  execution_date: string;
  execution_time?: string;
  status: string;
  notes: string;
  md_entities: { name: string; legal_name?: string };
  wo_items: any[];
  hasPendingCosts?: boolean;
}

export default function HQWorkOrdersPage() {
  const searchParams = useSearchParams();
  const initialStatus = searchParams.get('status') || 'all';
  
  const { profile, loading: loadingAuth } = useAuth();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatus);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedWOForApproval, setSelectedWOForApproval] = useState<WorkOrder | null>(null);
  const [showRejectedModal, setShowRejectedModal] = useState(false);
  const [selectedWOForRejected, setSelectedWOForRejected] = useState<WorkOrder | null>(null);
 
  useEffect(() => {
    const status = searchParams.get('status');
    if (status) setStatusFilter(status);
    
    const q = searchParams.get('q');
    if (q) setSearchTerm(q);
  }, [searchParams]);

  useEffect(() => {
    const itemId = searchParams.get('itemId');
    if (itemId && workOrders.length > 0) {
      const wo = workOrders.find(w => w.wo_items?.some(i => i.id === itemId));
      if (wo) {
        setSelectedWOForApproval(wo);
        setShowApprovalModal(true);
      }
    }
  }, [searchParams, workOrders]);

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    
    try {
      const [woRes, costsRes] = await Promise.all([
        supabase
          .from('work_orders')
          .select(`
            *, 
            md_entities!customer_id(name, legal_name), 
            wo_items(
              *,
              job_orders(
                id, 
                status,
                is_doc_finished,
                is_cost_finished,
                transporter:md_entities!transporter_id(name)
              )
            )
          `)
          .eq('tenant_id', profile.tenant_id)
          .order('updated_at', { ascending: false }),
        supabase
          .from('extra_costs')
          .select('id, jo_id, status')
          .eq('status', 'need_approval')
      ]);

      if (woRes.error) throw woRes.error;

      const wos = woRes.data || [];
      const pendingCosts = costsRes.data || [];

      const hydratedWos = wos.map(wo => {
        const joIds = wo.wo_items?.flatMap((i: any) => i.job_orders?.map((j: any) => j.id)) || [];
        const hasPending = pendingCosts.some(c => joIds.includes(c.jo_id));
        return { ...wo, hasPendingCosts: hasPending };
      });

      setWorkOrders(hydratedWos);
    } catch (err) {
      console.error('Fetch Error:', err);
      toast.error('Gagal mengambil data Work Order');
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id]);

  useEffect(() => {
    if (!loadingAuth) {
      if (profile?.tenant_id) {
        fetchData();
      } else {
        setLoading(false);
      }
    }
  }, [loadingAuth, profile?.tenant_id, fetchData]);



  const filteredWorkOrders = useMemo(() => {
    return workOrders.filter(wo => {
      const matchesSearch = wo.wo_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          wo.md_entities?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesStatus = true;
      if (statusFilter !== 'all') {
        const s = wo.status?.toUpperCase() || '';
        const allItems = wo.wo_items || [];
        const allJobs = allItems.flatMap(i => i.job_orders || []).filter(j => j.status !== 'cancelled');
        
        // [AI] Check handover status FIRST — WO with handover_pending/rejected items should NOT leak into other tabs
        const hasHandoverPending = s === 'HANDOVER_PENDING' || allItems.some((i: any) => i.status === 'handover_pending');
        const hasHandoverRejected = s === 'HANDOVER_REJECTED' || allItems.some((i: any) => i.status === 'handover_rejected');
        
        const allJobsCompleted = allJobs.length > 0 && allJobs.every(j => 
          ['COMPLETED', 'DONE', 'PEKERJAAN SELESAI', 'READY_FOR_BILLING', 'VERIFIED', 'AWAITING_AUDIT'].includes(j.status?.toUpperCase())
        );
        const isCompleted = allJobsCompleted || ['COMPLETED', 'DONE', 'PEKERJAAN SELESAI', 'READY_FOR_BILLING', 'VERIFIED', 'AWAITING_AUDIT'].includes(s);

        const anyMoving = !isCompleted && !hasHandoverPending && !hasHandoverRejected && allJobs.some(j => 
          j.status?.toUpperCase().startsWith('MENUJU') || 
          j.status?.toUpperCase().startsWith('TIBA') || 
          ['IN_PROGRESS', 'DALAM PERJALANAN', 'PICKING_UP', 'DELIVERING', 'START JOURNEY'].includes(j.status?.toUpperCase())
        );

        const anyAssigned = !isCompleted && !hasHandoverPending && !hasHandoverRejected && !anyMoving && allJobs.some(j => j.fleet_id && j.driver_id);
        const isDraft = s === 'DRAFT' && !hasHandoverPending && !hasHandoverRejected;
        const isPending = (s === 'PENDING' || s === 'NEED_ASSIGNMENT' || s === 'ACTIVE') && !hasHandoverPending && !hasHandoverRejected && !anyAssigned && !anyMoving && !isCompleted;

        if (statusFilter === 'draft') return matchesSearch && isDraft;
        if (statusFilter === 'pending') return matchesSearch && isPending;
        if (statusFilter === 'assigned_units') return matchesSearch && anyAssigned;
        if (statusFilter === 'on_road') return matchesSearch && anyMoving;
        if (statusFilter === 'completed') return matchesSearch && isCompleted;
        
        if (statusFilter === 'need_audit') {
          matchesStatus = wo.hasPendingCosts === true;
        } else if (statusFilter === 'handover_pending') {
          matchesStatus = hasHandoverPending;
        } else if (statusFilter === 'handover_rejected') {
          matchesStatus = hasHandoverRejected;
        } else {
          matchesStatus = s === statusFilter.toUpperCase();
        }
      }
      
      return matchesSearch && matchesStatus;
    });
  }, [workOrders, searchTerm, statusFilter]);

  const getStatusBadge = (wo: WorkOrder) => {
    const s = wo.status?.toUpperCase() || '';
    const allItems = wo.wo_items || [];
    const allJobs = allItems.flatMap(i => i.job_orders || []).filter(j => j.status !== 'cancelled');
    
    // [AI] Check handover status FIRST — prevent fallback to "NEED ASSIGN UNITS"
    const hasHandoverPending = s === 'HANDOVER_PENDING' || allItems.some((i: any) => i.status === 'handover_pending');
    const hasHandoverRejected = s === 'HANDOVER_REJECTED' || allItems.some((i: any) => i.status === 'handover_rejected');
    
    if (hasHandoverRejected) return <Badge className="!bg-rose-100 !text-rose-700 !border-rose-200 font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">HANDOVER REJECTED</Badge>;
    if (hasHandoverPending) return <Badge className="!bg-orange-100 !text-orange-700 !border-orange-200 font-black text-[9px] px-3 py-1 uppercase tracking-widest italic animate-pulse">HANDOVER PENDING</Badge>;
    
    // Check for high-fidelity completion
    const allJobsCompleted = allJobs.length > 0 && allJobs.every(j => 
      ['COMPLETED', 'DONE', 'PEKERJAAN SELESAI', 'READY_FOR_BILLING', 'VERIFIED', 'AWAITING_AUDIT'].includes(j.status?.toUpperCase())
    );
    
    const isCompleted = allJobsCompleted || ['COMPLETED', 'DONE', 'PEKERJAAN SELESAI', 'READY_FOR_BILLING', 'VERIFIED', 'AWAITING_AUDIT'].includes(s);

    if (isCompleted) {
        const allDocDone = allJobs.every(j => j.is_doc_finished);
        const allCostDone = allJobs.every(j => j.is_cost_finished);
        const allReady = allJobs.every(j => j.status === 'ready_for_billing' || (j.is_doc_finished && j.is_cost_finished));
        const anyAwaitingAudit = allJobs.some(j => j.status?.toUpperCase() === 'AWAITING_AUDIT') || wo.hasPendingCosts;

        if (allReady || s === 'READY_FOR_BILLING' || s === 'VERIFIED') {
          return <Badge className="!bg-emerald-600 !text-white !border-emerald-600 font-black text-[9px] px-3 py-1 uppercase tracking-widest italic shadow-lg shadow-emerald-500/20">SIAP INVOICE</Badge>;
        }
        if (anyAwaitingAudit || s === 'AWAITING_AUDIT') {
          return <Badge className="!bg-amber-600 !text-white !border-amber-600 font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">MENUNGGU AUDIT</Badge>;
        }
        if (!allDocDone || !allCostDone) {
          return <Badge className="!bg-blue-500 !text-white !border-blue-500 font-black text-[9px] px-3 py-1 uppercase tracking-widest italic animate-pulse">PROSES DOC & COST</Badge>;
        }
        return <Badge className="!bg-indigo-950 !text-white !border-indigo-950 font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">PEKERJAAN SELESAI</Badge>;
    }

    const anyMoving = allJobs.some(j => 
      j.status?.toUpperCase().startsWith('MENUJU') || 
      j.status?.toUpperCase().startsWith('TIBA') || 
      ['IN_PROGRESS', 'DALAM PERJALANAN', 'PICKING_UP', 'DELIVERING', 'START JOURNEY'].includes(j.status?.toUpperCase())
    );
    
    if (anyMoving) return <Badge className="!bg-emerald-100 !text-emerald-700 !border-emerald-200 font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">ON JOURNEY</Badge>;

    const anyAccepted = allJobs.some(j => 
      j.driver_response === 'accepted' || 
      ['ORDER DITERIMA', 'MENUNGGU MULAI / START', 'ACCEPTED', 'MENUNGGU BERANGKAT'].includes(j.status?.toUpperCase())
    );

    if (anyAccepted) return <Badge className="!bg-blue-100 !text-blue-700 !border-blue-200 font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">ACCEPTED</Badge>;

    const anyAssigned = allJobs.some(j => j.fleet_id && j.driver_id);
    if (anyAssigned || s === 'ACTIVE' || s === 'ASSIGNED') {
      return <Badge className="!bg-sky-100 !text-sky-700 !border-sky-200 font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">ASSIGNED UNITS</Badge>;
    }

    if (s === 'DRAFT') {
      return <Badge className="!bg-amber-100 !text-amber-700 font-black text-[9px] px-3 py-1 uppercase tracking-widest italic border-2 !border-amber-200">DRAFT MANIFEST</Badge>;
    }

    return <Badge className="!bg-indigo-100 !text-indigo-600 !border-indigo-200 font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">NEED ASSIGN UNITS</Badge>;
  };

  const handleEdit = (id: string) => {
    setEditingId(id);
    setIsFormOpen(true);
  };

  const handleApproveHandover = (wo: WorkOrder) => {
    setSelectedWOForApproval(wo);
    setShowApprovalModal(true);
  };

  const getHandoverStatus = (wo: WorkOrder) => {
    const allItems = wo.wo_items || [];
    let totalRequired = 0;
    let totalAssigned = 0;
    
    allItems.forEach((item: any) => {
      const required = Number(item.item_data?.unit_count) || 1;
      const jobs = item.job_orders || [];
      const assignedJobs = jobs.filter((j: any) => j.driver_id && j.fleet_id);
      
      totalRequired += required;
      totalAssigned += assignedJobs.length;
    });
    
    return { totalRequired, totalAssigned, isAllAssigned: totalAssigned >= totalRequired };
  };

  const stats = {
    total: workOrders.length,
    draft: workOrders.filter(w => w.status === 'draft').length,
    new: workOrders.filter(w => ['pending', 'need_assignment'].includes(w.status)).length,
    active: workOrders.filter(w => ['active', 'in_progress'].includes(w.status)).length,
    handover: workOrders.filter(w => w.status === 'handover_pending' || w.wo_items?.some(i => i.status === 'handover_pending')).length,
    rejected: workOrders.filter(w => w.status === 'handover_rejected' || w.wo_items?.some(i => i.status === 'handover_rejected')).length,
    completed: workOrders.filter(w => ['completed', 'verified', 'ready_for_billing', 'awaiting_audit'].includes(w.status)).length
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-6">
      {/* Header Section */}
      <div className="max-w-[1600px] mx-auto mb-10">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center shadow-sm rotate-3 hover:rotate-0 transition-transform duration-500 border border-blue-100">
              <FileText size={24} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="w-6 h-[2px] bg-blue-500 rounded-full"></span>
                <p className="text-[9px] font-black text-blue-600 uppercase tracking-[0.3em]">Operations Management</p>
              </div>
              <h1 className="text-2xl font-black text-indigo-950 italic uppercase tracking-tighter leading-none">Work Orders</h1>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6">
            {/* Search Bar */}
            <div className="relative group w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:text-blue-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search WO or Customer..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-white border border-indigo-100 rounded-2xl text-[11px] font-black focus:border-blue-500/30 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none shadow-sm text-indigo-900"
              />
            </div>

            {/* Create Button */}
            <Button 
              onClick={() => { setEditingId(null); setIsFormOpen(true); }}
              className="h-12 px-6 bg-slate-900 hover:bg-slate-800 text-white border border-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-slate-900/20 flex items-center gap-2 transition-all hover:scale-105"
            >
              <Plus size={16} /> New Work Order
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mt-8 flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-indigo-50 w-fit">
          {[
            { id: 'all', label: 'All Jobs', count: stats.total },
            { id: 'draft', label: 'Draft', count: stats.draft },
            { id: 'pending', label: 'New Request', count: workOrders.filter(wo => {
                const s = wo.status?.toUpperCase() || '';
                const allItems = wo.wo_items || [];
                // [AI] Exclude WO with handover items
                const hasHandover = s === 'HANDOVER_PENDING' || s === 'HANDOVER_REJECTED' || allItems.some((i: any) => ['handover_pending', 'handover_rejected'].includes(i.status));
                if (hasHandover) return false;
                const allJobs = allItems.flatMap(i => i.job_orders || []).filter(j => j.status !== 'cancelled');
                const anyAssigned = allJobs.some(j => j.fleet_id && j.driver_id);
                const anyMoving = allJobs.some(j => j.status?.toUpperCase().startsWith('MENUJU') || ['IN_PROGRESS', 'DALAM PERJALANAN'].includes(j.status?.toUpperCase()));
                const allJobsCompleted = allJobs.length > 0 && allJobs.every(j => ['COMPLETED', 'DONE', 'READY_FOR_BILLING'].includes(j.status?.toUpperCase()));
                return (s === 'PENDING' || s === 'NEED_ASSIGNMENT' || s === 'ACTIVE') && !anyAssigned && !anyMoving && !allJobsCompleted;
            }).length },
            { id: 'assigned_units', label: 'Assigned', count: workOrders.filter(wo => {
                const s = wo.status?.toUpperCase() || '';
                const allItems = wo.wo_items || [];
                // [AI] Exclude WO with handover items
                const hasHandover = s === 'HANDOVER_PENDING' || s === 'HANDOVER_REJECTED' || allItems.some((i: any) => ['handover_pending', 'handover_rejected'].includes(i.status));
                if (hasHandover) return false;
                const allJobs = allItems.flatMap(i => i.job_orders || []).filter(j => j.status !== 'cancelled');
                const anyAssigned = allJobs.some(j => j.fleet_id && j.driver_id);
                const anyMoving = allJobs.some(j => j.status?.toUpperCase().startsWith('MENUJU') || ['IN_PROGRESS', 'DALAM PERJALANAN'].includes(j.status?.toUpperCase()));
                const allJobsCompleted = allJobs.length > 0 && allJobs.every(j => ['COMPLETED', 'DONE', 'READY_FOR_BILLING'].includes(j.status?.toUpperCase()));
                return anyAssigned && !anyMoving && !allJobsCompleted;
            }).length },
            { id: 'on_road', label: 'On Road', count: workOrders.filter(wo => {
                const s = wo.status?.toUpperCase() || '';
                const allItems = wo.wo_items || [];
                // [AI] Exclude WO with handover items
                const hasHandover = s === 'HANDOVER_PENDING' || s === 'HANDOVER_REJECTED' || allItems.some((i: any) => ['handover_pending', 'handover_rejected'].includes(i.status));
                if (hasHandover) return false;
                const allJobs = allItems.flatMap(i => i.job_orders || []).filter(j => j.status !== 'cancelled');
                const anyMoving = allJobs.some(j => j.status?.toUpperCase().startsWith('MENUJU') || ['IN_PROGRESS', 'DALAM PERJALANAN'].includes(j.status?.toUpperCase()));
                const allJobsCompleted = allJobs.length > 0 && allJobs.every(j => ['COMPLETED', 'DONE', 'READY_FOR_BILLING'].includes(j.status?.toUpperCase()));
                return anyMoving && !allJobsCompleted;
            }).length },
            { id: 'handover_pending', label: 'Handover', count: stats.handover },
            { id: 'handover_rejected', label: 'Rejected', count: stats.rejected },
            { id: 'completed', label: 'Completed', count: stats.completed }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${
                statusFilter === tab.id ? 'bg-indigo-100 text-indigo-800 shadow-sm border border-indigo-200' : 'text-indigo-400 hover:bg-indigo-50/50'
              }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 rounded-md text-[8px] ${statusFilter === tab.id ? 'bg-indigo-200 text-indigo-900' : 'bg-indigo-50/80 text-indigo-500'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-[1600px] mx-auto">
        {loading ? (
          <div className="h-[300px] flex flex-col items-center justify-center bg-white rounded-3xl border border-indigo-50">
            <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Syncing Operations Center...</p>
          </div>
        ) : filteredWorkOrders.length === 0 ? (
          <div className="h-[300px] flex flex-col items-center justify-center bg-white rounded-3xl border border-dashed border-indigo-200 opacity-70">
            <ShieldCheck size={48} className="text-indigo-300 mb-4" />
            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">No Work Orders Found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 animate-in fade-in duration-700">
            {filteredWorkOrders.map((wo) => (
              <Card 
                key={wo.id} 
                className="group rounded-3xl border border-indigo-50 shadow-sm bg-white hover:shadow-md transition-all duration-300 overflow-hidden relative"
              >
                {/* Decorative Accent */}
                <div className={`absolute top-0 right-0 w-24 h-24 rounded-full -mr-12 -mt-12 transition-colors duration-500 ${
                  wo.status === 'completed' ? 'bg-indigo-50/50' : 'bg-blue-50'
                }`}></div>

                <div className="p-6 relative">
                  <div className="flex items-center justify-between mb-8">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm transition-all rotate-3 group-hover:rotate-0 ${
                      wo.status === 'completed' ? 'bg-indigo-100 text-indigo-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      <Activity size={20} />
                    </div>
                    <div className="flex items-center gap-2">
                       {wo.hasPendingCosts && (
                          <Badge className="bg-amber-100 text-amber-600 border border-amber-200 font-black text-[9px] px-3 py-1 uppercase tracking-widest italic animate-pulse">AUDIT BIAYA</Badge>
                       )}
                       {getStatusBadge(wo)}
                    </div>
                  </div>

                  <div className="mb-8">
                    <h3 className="text-lg font-black text-blue-700 italic uppercase tracking-tighter leading-none group-hover:text-blue-500 transition-colors">
                      {wo.wo_number}
                    </h3>
                    <div className="flex items-center gap-2 mt-2">
                      <Users size={12} className="text-sky-500" />
                      <p className="text-[9px] font-black text-sky-700 uppercase tracking-widest truncate">{wo.md_entities?.legal_name || wo.md_entities?.name}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-8">
                    <div className="bg-emerald-50/50 p-4 rounded-2xl group-hover:bg-emerald-50 transition-colors border border-emerald-100/50">
                      <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest mb-1 italic">Execution</p>
                      <div className="flex items-center gap-2 text-emerald-700">
                        <Calendar size={12} className="text-emerald-500" />
                        <span className="text-xs font-black italic">{new Date(wo.execution_date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' })}</span>
                      </div>
                    </div>
                    <div className="bg-amber-50/50 p-4 rounded-2xl group-hover:bg-amber-50 transition-colors border border-amber-100/50">
                      <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-1 italic">Missions</p>
                      <div className="flex items-center gap-2 text-amber-700">
                        <Layers size={12} className="text-amber-500" />
                        <span className="text-xs font-black italic">{wo.wo_items?.length || 0} JO UNITS</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Area */}
                  {/* [AI] When WO has handover_pending items, primary button = REVIEW HANDOVER, edit is secondary */}
                  <div className="flex items-center gap-3">
                    {(() => {
                      const hasHandoverPending = wo.status === 'handover_pending' || wo.wo_items?.some((i: any) => i.status === 'handover_pending');
                      const isRejected = wo.status === 'handover_rejected' || wo.wo_items?.some((i: any) => i.status === 'handover_rejected');
                      
                      if (isRejected) {
                        return (
                          <Button 
                            onClick={() => { setSelectedWOForRejected(wo); setShowRejectedModal(true); }}
                            className="flex-1 h-12 bg-slate-900 hover:bg-rose-900/40 text-white border border-slate-700 hover:border-rose-500/50 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
                          >
                            <ExternalLink size={14} /> VIEW <ArrowRight size={14} />
                          </Button>
                        );
                      }

                      if (hasHandoverPending) {
                        return (
                          <>
                            <Button 
                              onClick={() => handleApproveHandover(wo)}
                              className="flex-1 h-12 bg-slate-900 hover:bg-orange-900/40 text-white border border-slate-700 hover:border-orange-500/50 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20 animate-pulse"
                            >
                              <ShieldCheck size={14} /> REVIEW HANDOVER <ArrowRight size={14} />
                            </Button>
                            <Button 
                              onClick={() => handleEdit(wo.id)}
                              className="w-12 h-12 bg-slate-900 hover:bg-indigo-900/40 text-white border border-slate-700 hover:border-indigo-500/50 rounded-xl flex items-center justify-center transition-all shadow-lg shadow-slate-900/20"
                              title="Edit WO Details"
                            >
                              <FileText size={16} />
                            </Button>
                          </>
                        );
                      }
                      
                      return (
                        <Button 
                          onClick={() => handleEdit(wo.id)}
                          className="flex-1 h-12 bg-slate-900 hover:bg-indigo-900/40 text-white border border-slate-700 hover:border-indigo-500/50 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
                        >
                          EDIT DETAILS <ArrowRight size={14} />
                        </Button>
                      );
                    })()}
                    {wo.hasPendingCosts && (
                      <Link href="/hq/finance/cost-audit">
                        <Button 
                          className="h-12 px-5 bg-slate-900 hover:bg-amber-900/40 text-white border border-slate-700 hover:border-amber-500/50 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
                        >
                          GO TO AUDIT <TrendingUp size={14} />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {isFormOpen && (
        <CreateWOForm 
          editId={editingId}
          onBack={() => {
            setIsFormOpen(false);
            fetchData();
          }}
        />
      )}

      {showApprovalModal && selectedWOForApproval && (
        <HandoverApprovalModal
          wo={selectedWOForApproval}
          onClose={() => setShowApprovalModal(false)}
          onSuccess={() => { setShowApprovalModal(false); fetchData(); }}
        />
      )}
      {showRejectedModal && selectedWOForRejected && (
        <RejectedViewModal
          wo={selectedWOForRejected}
          onClose={() => setShowRejectedModal(false)}
        />
      )}
    </div>
  );
}
