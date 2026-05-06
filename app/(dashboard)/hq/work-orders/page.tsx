'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  Plus, Search, FileText, Filter, Loader2, 
  ChevronRight, Calendar, User, Clock, CheckCircle2,
  Truck,
  Activity
} from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import CreateWOForm from './components/CreateWOForm';
import HandoverApprovalModal from './components/HandoverApprovalModal';

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
 
  useEffect(() => {
    const status = searchParams.get('status');
    if (status) setStatusFilter(status);
  }, [searchParams]);

  // Handle deep-linking to specific item
  useEffect(() => {
    const itemId = searchParams.get('itemId');
    if (itemId && workOrders.length > 0) {
      // Find the WO that contains this item
      const targetWO = workOrders.find(wo => wo.wo_items?.some(item => item.id === itemId));
      if (targetWO) {
        if (targetWO.status === 'handover_pending') {
          setSelectedWOForApproval(targetWO);
          setShowApprovalModal(true);
        } else {
          setEditingId(targetWO.id);
          setIsFormOpen(true);
        }
      }
    }
  }, [workOrders, searchParams]);

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    
    let query = supabase
      .from('work_orders')
      .select(`
        *, 
        md_entities!customer_id(name, legal_name), 
        wo_items(
          *,
          job_orders(
            id, 
            transporter:md_entities!transporter_id(name)
          )
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .order('updated_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      toast.error('Gagal mengambil data Work Order');
    } else {
      let finalData = data || [];
      
      // Filter in JS to support complex status checks like handover_pending in items
      if (statusFilter !== 'all') {
        finalData = finalData.filter(wo => {
          if (statusFilter === 'handover_pending') {
            return wo.status === 'handover_pending' || wo.wo_items?.some(i => i.status === 'handover_pending');
          }
          return wo.status === statusFilter;
        });
      }
      
      setWorkOrders(finalData);
    }
    setLoading(false);
  }, [profile?.tenant_id, statusFilter]);

  useEffect(() => {
    if (profile?.tenant_id) fetchData();
  }, [profile?.tenant_id, fetchData]);

  const getStatusStyle = (status: string) => {
    switch (status.toLowerCase()) {
      case 'draft': return 'bg-slate-100 text-slate-600';
      case 'need_assignment': return 'bg-amber-100 text-amber-700 font-bold animate-pulse';
      case 'handover_pending': return 'bg-orange-500 text-white font-bold animate-pulse shadow-lg shadow-orange-500/20';
      case 'handover_rejected': return 'bg-rose-600 text-white font-black shadow-lg shadow-rose-600/20';
      case 'assigned': return 'bg-blue-100 text-blue-700';
      case 'in_progress': return 'bg-indigo-100 text-indigo-700';
      case 'completed': return 'bg-emerald-100 text-emerald-700';
      case 'cancelled': return 'bg-rose-100 text-rose-700';
      default: return 'bg-slate-100 text-slate-600';
    }
  };

  const filteredWO = workOrders.filter(wo => 
    wo.wo_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    wo.md_entities?.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isFormOpen) {
    return <CreateWOForm 
      editId={editingId}
      onBack={() => { 
        setIsFormOpen(false); 
        setEditingId(null);
        fetchData(); 
      }} 
    />;
  }

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 flex items-center gap-2 italic">
            <FileText className="text-slate-900" size={28} />
            WORK ORDERS
          </h1>
          <p className="text-sm text-slate-500 font-medium mt-1 uppercase tracking-widest">Enterprise Logistics Orchestration</p>
        </div>
        <button 
          onClick={() => setIsFormOpen(true)}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all font-bold text-sm shadow-xl shadow-slate-900/20 active:scale-95"
        >
          <Plus size={20} />
          CREATE WORK ORDER
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card className="p-4 border-slate-200 shadow-none flex flex-col gap-1">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Active</span>
          <span className="text-2xl font-black text-slate-900">{workOrders.filter(w => w.status !== 'completed' && w.status !== 'cancelled').length}</span>
        </Card>
        <Card className="p-4 border-slate-200 shadow-none flex flex-col gap-1">
          <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Need Assignment</span>
          <span className="text-2xl font-black text-slate-900">{workOrders.filter(w => w.status === 'need_assignment').length}</span>
        </Card>
        <Card className="p-4 border-slate-200 shadow-none flex flex-col gap-1">
          <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest animate-pulse">Need Approval Handover</span>
          <span className="text-2xl font-black text-slate-900">{workOrders.filter(w => w.status === 'handover_pending' || w.wo_items?.some(i => i.status === 'handover_pending')).length}</span>
        </Card>
        <Card className="p-4 border-slate-200 shadow-none flex flex-col gap-1 border-l-4 border-l-rose-500">
          <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Handover Rejected</span>
          <span className="text-2xl font-black text-slate-900">{workOrders.filter(w => w.status === 'handover_rejected' || w.wo_items?.some(i => i.status === 'handover_rejected' || i.handover_status === 'rejected')).length}</span>
        </Card>
        <Card className="p-4 border-slate-200 shadow-none flex flex-col gap-1">
          <span className="text-[10px] font-black text-blue-500 uppercase tracking-widest">In Progress</span>
          <span className="text-2xl font-black text-slate-900">{workOrders.filter(w => w.status === 'in_progress').length}</span>
        </Card>
        <Card className="p-4 border-slate-200 shadow-none flex flex-col gap-1">
          <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Completed</span>
          <span className="text-2xl font-black text-slate-900">{workOrders.filter(w => w.status === 'completed').length}</span>
        </Card>
      </div>

      <Card className="p-4 border-slate-200 shadow-none">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search by WO Number or Customer..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:outline-none focus:ring-4 focus:ring-slate-900/5 transition-all"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={18} className="text-slate-400" />
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-600 outline-none"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="need_assignment">Need Assignment</option>
              <option value="handover_pending">Handover Pending</option>
              <option value="handover_rejected">Handover Rejected</option>
              <option value="assigned">Assigned</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        {loading ? (
          <div className="py-20 text-center space-y-4">
            <Loader2 className="w-10 h-10 text-slate-300 animate-spin mx-auto" />
            <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Synchronizing Data...</p>
          </div>
        ) : filteredWO.length === 0 ? (
          <Card className="py-20 text-center border-dashed border-2 border-slate-200 shadow-none">
            <p className="text-slate-400 font-medium">No work orders found.</p>
          </Card>
        ) : (
          filteredWO.map((wo) => {
            const totalUnits = wo.wo_items?.reduce((acc, curr) => acc + (Number(curr.item_data?.unit_count) || 0), 0) || 0;
            const firstItem = wo.wo_items?.[0]?.item_data;

            const isRejected = wo.status === 'handover_rejected';

            return (
              <Card 
                key={wo.id} 
                onClick={() => {
                  setEditingId(wo.id);
                  setIsFormOpen(true);
                }}
                className={`group p-0 border-slate-200 shadow-none transition-all overflow-hidden ${isRejected ? 'hover:border-rose-400 cursor-pointer opacity-90' : 'hover:border-slate-400 cursor-pointer'}`}
              >
                <div className="flex flex-col md:flex-row">
                  <div className="p-6 flex-1 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sm font-black text-slate-900">{wo.wo_number}</span>
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getStatusStyle(wo.status)}`}>
                          {wo.status === 'handover_rejected' ? 'REJECTED' : wo.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="text-right">
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Execution Time</span>
                         <span className="text-sm font-black text-rose-600 italic">
                            {new Date(wo.execution_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} — {wo.execution_time?.substring(0,5) || '00:00'}
                         </span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-1">
                        <div className="flex items-baseline gap-2">
                           <h3 className="text-lg font-black text-slate-900 leading-tight">{wo.md_entities?.name}</h3>
                           {wo.md_entities?.legal_name && (
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">({wo.md_entities.legal_name})</span>
                           )}
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                          <span className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-lg text-blue-700 font-black border border-blue-100">
                            <Truck size={14} /> {wo.wo_items?.filter(i => i.status === 'assigned' || i.status === 'in_progress').length || 0} / {totalUnits} UNITS ACTIVE
                          </span>
                          {firstItem && (
                             <span className="flex items-center gap-1.5 font-bold text-slate-600 italic">
                                {firstItem.shipper_name} <ChevronRight size={14} className="text-slate-300" /> {firstItem.recipient_name}
                             </span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {(wo.status === 'assigned' || wo.status === 'in_progress') && (
                          <Link 
                            href={`/hq/sbu-activities?jo=${wo.wo_number}`}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center gap-2 text-xs font-black text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white transition-all uppercase tracking-widest px-4 py-3 rounded-xl shadow-sm border border-blue-100 group/monitor"
                          >
                            <Activity size={16} className="group-hover/monitor:animate-pulse" /> Monitor <ChevronRight size={16} />
                          </Link>
                        )}

                        {wo.status === 'handover_pending' || wo.wo_items?.some(i => i.status === 'handover_pending') ? (
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedWOForApproval(wo);
                              setShowApprovalModal(true);
                            }}
                            className="flex items-center gap-2 text-xs font-black text-white bg-orange-500 hover:bg-orange-600 transition-colors uppercase tracking-widest p-3 rounded-xl shadow-lg shadow-orange-500/20"
                          >
                            Review Handover <ChevronRight size={16} />
                          </button>
                        ) : (
                          <button className="flex items-center gap-2 text-xs font-black text-slate-400 group-hover:text-slate-900 transition-colors uppercase tracking-widest bg-white p-2 rounded-xl shadow-sm border border-slate-50">
                            View Details <ChevronRight size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-6 md:w-80 border-t md:border-t-0 md:border-l border-slate-200 flex flex-col justify-between gap-4">
                    <div className="space-y-4">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 block">Execution Timeline</span>
                      
                      <div className="relative space-y-4 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-[1px] before:bg-slate-200">
                        {/* Draft */}
                        <div className="relative pl-6">
                           <div className="absolute left-0 top-1.5 w-3.5 h-3.5 bg-slate-200 border-2 border-white rounded-full" />
                           <div className="flex flex-col">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Draft Created</span>
                              <span className="text-[11px] font-bold text-slate-900 italic">
                                {new Date(wo.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} — {new Date(wo.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                           </div>
                        </div>

                        {/* Submit to SBU - Assume created_at for now if we don't have a separate field */}
                        <div className="relative pl-6">
                           <div className="absolute left-0 top-1.5 w-3.5 h-3.5 bg-blue-500 border-2 border-white rounded-full shadow-lg shadow-blue-500/20" />
                           <div className="flex flex-col">
                              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Submitted to SBU</span>
                              <span className="text-[11px] font-bold text-slate-900 italic">
                                {new Date(wo.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} — {new Date(wo.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                           </div>
                        </div>

                        {/* Handover from SBU */}
                        {wo.wo_items?.some(i => i.item_data?.milestones?.handover || i.status === 'handover_pending') && (
                          <div className="relative pl-6">
                             <div className="absolute left-0 top-1.5 w-3.5 h-3.5 bg-orange-500 border-2 border-white rounded-full shadow-lg shadow-orange-500/20 animate-pulse" />
                             <div className="flex flex-col">
                                <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Handover Received</span>
                                <span className="text-[11px] font-bold text-slate-900 italic">
                                  {wo.wo_items.find(i => i.item_data?.milestones?.handover)?.item_data.milestones.handover 
                                    ? new Date(wo.wo_items.find(i => i.item_data?.milestones?.handover)!.item_data.milestones.handover).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                    : 'Awaiting Review'}
                                </span>
                             </div>
                          </div>
                        )}

                        {/* Rejected */}
                        {(wo.status === 'handover_rejected' || wo.wo_items?.some(i => i.status === 'handover_rejected')) && (
                          <div className="relative pl-6">
                             <div className="absolute left-0 top-1.5 w-3.5 h-3.5 bg-rose-600 border-2 border-white rounded-full shadow-lg shadow-rose-600/20" />
                             <div className="flex flex-col">
                                <span className="text-[10px] font-black text-rose-600 uppercase tracking-widest">Rejected by HQ</span>
                                <span className="text-[11px] font-bold text-slate-900 italic line-clamp-1">
                                  {wo.wo_items.find(i => i.item_data?.milestones?.rejected)?.item_data.milestones.rejected 
                                    ? new Date(wo.wo_items.find(i => i.item_data?.milestones?.rejected)!.item_data.milestones.rejected).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                                    : 'Recently Rejected'}
                                </span>
                             </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-slate-100">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Active SBU</span>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from(new Set(wo.wo_items?.map(i => i.sbu_type))).map(sbu => (
                          <span key={sbu} className="px-2 py-1 bg-white border border-slate-200 rounded text-[8px] font-black text-blue-600 uppercase tracking-widest">{sbu}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {showApprovalModal && selectedWOForApproval && (
        <HandoverApprovalModal 
          wo={selectedWOForApproval}
          onClose={() => {
            setShowApprovalModal(false);
            setSelectedWOForApproval(null);
          }}
          onSuccess={() => {
            setShowApprovalModal(false);
            setSelectedWOForApproval(null);
            fetchData();
          }}
        />
      )}
    </div>
  );
}
