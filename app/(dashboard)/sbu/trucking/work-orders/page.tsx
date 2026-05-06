'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { useSearchParams } from 'next/navigation';
import { 
  Truck, Search, Filter, Loader2, 
  MapPin, Calendar, Clock, ChevronRight, User,
  ClipboardList, AlertCircle, Activity
} from 'lucide-react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import AssignmentModal from './components/AssignmentModal';

interface WOItem {
  id: string;
  item_code: string;
  wo_id: string;
  sbu_type: string;
  item_data: any;
  status: string;
  deal_price: number;
  work_orders: {
    wo_number: string;
    execution_date: string;
    md_entities: { name: string; legal_name: string };
  }
}

export default function SBUTruckingWorkOrdersPage() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<WOItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<WOItem | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('pending');

  useEffect(() => {
    const status = searchParams.get('status');
    if (status) setSelectedStatus(status);
  }, [searchParams]);

  // Handle deep-linking to specific item
  useEffect(() => {
    const itemId = searchParams.get('itemId');
    if (itemId && items.length > 0) {
      const targetItem = items.find(i => i.id === itemId);
      if (targetItem) {
        setSelectedItem(targetItem);
      }
    }
  }, [items, searchParams]);

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) return;
    setLoading(true);
    
    const { data, error } = await supabase
      .from('wo_items')
      .select(`
        *, 
        work_orders!inner(wo_number, execution_date, status, md_entities!customer_id(name, legal_name)),
        job_orders(
          id,
          transporter:md_entities!transporter_id(name)
        )
      `)
      .eq('tenant_id', profile.tenant_id)
      .eq('sbu_type', 'TRUCKING')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error('Gagal mengambil data operasional');
    } else {
      setItems(data || []);
    }
    setLoading(false);
  }, [profile?.tenant_id]);

  useEffect(() => {
    if (profile?.tenant_id) fetchData();
  }, [profile?.tenant_id, fetchData]);

  const filteredItems = items.filter(item => {
    const matchesSearch = 
      item.item_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.work_orders.wo_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.work_orders.md_entities.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (selectedStatus === 'pending') {
      return ['pending', 'need_assignment'].includes(item.status);
    }
    if (selectedStatus === 'handover_pending') {
      return item.status === 'handover_pending';
    }
    if (selectedStatus === 'handover_rejected') {
      return item.status === 'handover_rejected';
    }
    if (selectedStatus === 'assigned') {
      return ['assigned', 'in_progress'].includes(item.status);
    }
    if (selectedStatus === 'completed') {
      return item.status === 'completed';
    }
    if (selectedStatus === 'doc_completed') {
      return item.status === 'doc_completed';
    }
    
    return true;
  });

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1600px] mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-2xl shadow-slate-900/20">
            <ClipboardList size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 italic uppercase tracking-tight">TRUCKING OPERATIONS</h1>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-0.5 italic">Fleet Deployment Console</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-4 border-slate-200 shadow-none">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text" 
                placeholder="Search by WO Number, Item Code, or Customer..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-slate-900/5 outline-none transition-all"
              />
            </div>
          </Card>

          <div className="space-y-4">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] ml-2 flex items-center gap-2">
              <AlertCircle size={14} className={selectedStatus === 'handover_rejected' ? 'text-rose-500' : 'text-amber-500'} /> 
              {selectedStatus === 'handover_rejected' ? 'Rejected Handover Data' : 
               selectedStatus === 'handover_pending' ? 'Handovers Awaiting Review' :
               selectedStatus === 'assigned' ? 'In Progress / Active' : 
               selectedStatus === 'completed' ? 'Jobs Done / Delivered' :
               selectedStatus === 'doc_completed' ? 'Documentation Finalized' : 'Pending Assignments'}
            </h3>
            
            {loading ? (
              <div className="py-20 text-center space-y-4">
                <Loader2 className="w-10 h-10 text-slate-200 animate-spin mx-auto" />
                <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Scanning Operations...</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <Card className="py-20 text-center border-dashed border-2 border-slate-200 shadow-none">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest italic">No pending assignments found</p>
              </Card>
            ) : (
              filteredItems.map((item) => (
                <Card key={item.id} className={`p-0 border-slate-200 shadow-none hover:border-slate-400 transition-all group overflow-hidden bg-white ${item.status === 'handover_rejected' ? 'ring-2 ring-rose-500/20 border-rose-200' : ''}`}>
                  <div className="flex flex-col md:flex-row">
                    <div className="p-6 flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                         <div className="flex items-center gap-3">
                            <div className="flex flex-col">
                               <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none mb-1">
                                   {profile?.tenants?.name || 'SYSTEM'}
                               </span>
                               <div className="flex items-center gap-2">
                                  <span className="font-mono text-[10px] font-black bg-slate-100 px-2 py-1 rounded text-slate-500 tracking-tighter">{item.item_code}</span>
                                  <span className="text-xs font-black text-slate-900">{item.work_orders.wo_number}</span>
                               </div>
                            </div>
                         </div>
                         <div className="flex items-center gap-2">
                            <span className="text-[9px] font-black bg-slate-900 text-white px-2 py-1 rounded uppercase tracking-[0.2em]">{item.item_data.vehicle_type_name}</span>
                            {item.status === 'handover_pending' ? (
                              <span className="text-[9px] font-black bg-orange-500 text-white px-2 py-1 rounded-full uppercase tracking-widest italic animate-pulse">Handover Sent</span>
                            ) : item.status === 'handover_rejected' ? (
                              <span className="text-[9px] font-black bg-rose-600 text-white px-2 py-1 rounded-full uppercase tracking-widest italic animate-bounce shadow-lg shadow-rose-600/20">Rejected by HQ</span>
                            ) : item.status === 'assigned' || item.status === 'in_progress' ? (
                               <span className="text-[9px] font-black bg-blue-600 text-white px-2 py-1 rounded-full uppercase tracking-widest italic shadow-lg shadow-blue-600/20">In Progress / Active</span>
                            ) : item.status === 'completed' ? (
                               <span className="text-[9px] font-black bg-emerald-600 text-white px-2 py-1 rounded-full uppercase tracking-widest italic shadow-lg shadow-emerald-600/20">Completed / Done</span>
                            ) : item.status === 'doc_completed' ? (
                               <span className="text-[9px] font-black bg-slate-700 text-white px-2 py-1 rounded-full uppercase tracking-widest italic shadow-lg shadow-slate-700/20">Document Completed</span>
                            ) : (
                               <span className="text-[9px] font-black bg-amber-500 text-white px-2 py-1 rounded-full uppercase tracking-widest italic shadow-lg shadow-amber-500/20">Need Assignment</span>
                            )}
                         </div>
                      </div>

                      {item.status === 'handover_rejected' && (
                        <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl flex items-start gap-3">
                           <AlertCircle className="text-rose-500 shrink-0" size={16} />
                           <div className="space-y-1">
                              <span className="text-[9px] font-black text-rose-600 uppercase tracking-widest">HQ Rejection Note</span>
                              <p className="text-[11px] font-bold text-rose-800 italic">
                                "{item.item_data.rejection_note || 'No specific note provided'}"
                              </p>
                           </div>
                        </div>
                      )}

                      <div className="flex flex-col md:flex-row justify-between items-end gap-4 pt-2">
                         <div className="space-y-2">
                            <h4 className="text-xl font-black text-slate-900 leading-tight">
                               {item.work_orders.md_entities.name}
                            </h4>
                            <div className="flex flex-wrap items-center gap-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                               <div className="flex items-center gap-1.5 font-black text-slate-700 italic bg-slate-50 px-2 py-1 rounded">
                                  {item.item_data.shipper_name} <ChevronRight size={14} className="text-slate-300" /> {item.item_data.recipient_name}
                               </div>
                               <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-2 py-1 rounded border border-rose-100 font-black italic shadow-sm">
                                  <Clock size={14} /> 
                                  {new Date(item.work_orders.execution_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} @ {item.item_data.execution_time}
                               </div>
                               <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100 font-black italic shadow-sm">
                                  <Truck size={14} /> 
                                  {item.job_orders?.[0]?.transporter?.name ? item.job_orders[0].transporter.name : (item.status === 'assigned' || item.status === 'in_progress' ? 'UNIT ACTIVE' : 'AWAITING DEPLOY')}
                               </div>
                            </div>
                         </div>
                         
                         <div className="flex flex-col items-end gap-3">
                            {(item.status === 'assigned' || item.status === 'in_progress') && (
                              <Link 
                                href={`/sbu/trucking/tracking?jo=${item.work_orders.wo_number}`}
                                className="flex items-center gap-2 text-[10px] font-black text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white transition-all uppercase tracking-[0.2em] px-6 py-3 rounded-xl border border-blue-100 group/monitor shadow-lg shadow-blue-600/5"
                              >
                                <Activity size={16} className="group-hover/monitor:animate-pulse" /> Monitor Journey
                              </Link>
                            )}
                            
                            {(profile?.department?.toUpperCase().includes('OPS') || profile?.role?.toUpperCase().includes('OPS')) ? (
                              <button 
                                onClick={() => setSelectedItem(item)}
                                disabled={item.status === 'handover_pending' || item.status === 'handover_rejected'}
                                className={`px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all flex items-center gap-3 group/btn shadow-2xl ${
                                  (item.status === 'handover_pending' || item.status === 'handover_rejected')
                                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200 shadow-none' 
                                  : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-900/30 active:scale-95'
                                }`}
                              >
                                 <Truck size={18} className={(item.status !== 'handover_pending' && item.status !== 'handover_rejected') ? "group-hover/btn:animate-bounce" : ""} /> 
                                 {item.status === 'handover_pending' ? 'Waiting HQ Review' : 
                                  item.status === 'handover_rejected' ? 'Order Rejected' : `Assign Units (${item.item_data.unit_count})`}
                              </button>
                            ) : (
                              <div className="flex flex-col items-end gap-1">
                                 <span className="text-[9px] font-black text-slate-400 uppercase italic tracking-widest">Operations Only</span>
                                 <button 
                                   disabled
                                   className="px-6 py-3 bg-slate-100 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest cursor-not-allowed opacity-50 flex items-center gap-2 border border-slate-200"
                                 >
                                    <Truck size={16} /> View Only
                                 </button>
                              </div>
                            )}
                         </div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
           <Card className="p-8 border-slate-900 border-2 shadow-2xl shadow-slate-900/10">
              <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] italic mb-6">Ops Dashboard</h3>
               <div className="space-y-4">
                  <button 
                    onClick={() => setSelectedStatus('pending')}
                    className={`w-full p-4 rounded-2xl flex items-center justify-between border transition-all ${selectedStatus === 'pending' ? 'bg-slate-900 text-white border-slate-900 shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-900 hover:border-slate-300'}`}
                  >
                     <span className={`text-[10px] font-black uppercase tracking-widest ${selectedStatus === 'pending' ? 'text-slate-400' : 'text-slate-400'}`}>New Requests</span>
                     <span className="text-xl font-black">{items.filter(i => ['pending', 'need_assignment'].includes(i.status)).length}</span>
                  </button>
                  <button 
                    onClick={() => setSelectedStatus('handover_pending')}
                    className={`w-full p-4 rounded-2xl flex items-center justify-between border transition-all ${selectedStatus === 'handover_pending' ? 'bg-orange-500 text-white border-orange-500 shadow-lg' : 'bg-orange-50 border-orange-100 text-orange-900 hover:border-orange-300'}`}
                  >
                     <span className={`text-[10px] font-black uppercase tracking-widest ${selectedStatus === 'handover_pending' ? 'text-orange-200' : 'text-orange-400'}`}>Handover Sent</span>
                     <span className="text-xl font-black">{items.filter(i => i.status === 'handover_pending').length}</span>
                  </button>
                  <button 
                    onClick={() => setSelectedStatus('handover_rejected')}
                    className={`w-full p-4 rounded-2xl flex items-center justify-between border transition-all ${selectedStatus === 'handover_rejected' ? 'bg-rose-600 text-white border-rose-600 shadow-lg' : 'bg-rose-50 border-rose-100 text-rose-900 hover:border-rose-300'}`}
                  >
                     <span className={`text-[10px] font-black uppercase tracking-widest ${selectedStatus === 'handover_rejected' ? 'text-rose-200' : 'text-rose-500'}`}>Handover Rejected</span>
                     <span className="text-xl font-black">{items.filter(i => i.status === 'handover_rejected').length}</span>
                  </button>
                  <button 
                    onClick={() => setSelectedStatus('assigned')}
                    className={`w-full p-4 rounded-2xl flex items-center justify-between border transition-all ${selectedStatus === 'assigned' ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-blue-50 border-blue-100 text-blue-900 hover:border-blue-300'}`}
                  >
                     <span className={`text-[10px] font-black uppercase tracking-widest ${selectedStatus === 'assigned' ? 'text-blue-200' : 'text-blue-400'}`}>In Progress / Active</span>
                     <span className="text-xl font-black">{items.filter(i => ['assigned', 'in_progress'].includes(i.status)).length}</span>
                  </button>
                  <button 
                    onClick={() => setSelectedStatus('completed')}
                    className={`w-full p-4 rounded-2xl flex items-center justify-between border transition-all ${selectedStatus === 'completed' ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg' : 'bg-emerald-50 border-emerald-100 text-emerald-900 hover:border-emerald-300'}`}
                  >
                     <span className={`text-[10px] font-black uppercase tracking-widest ${selectedStatus === 'completed' ? 'text-emerald-200' : 'text-emerald-400'}`}>Done</span>
                     <span className="text-xl font-black">{items.filter(i => i.status === 'completed').length}</span>
                  </button>
                  <button 
                    onClick={() => setSelectedStatus('doc_completed')}
                    className={`w-full p-4 rounded-2xl flex items-center justify-between border transition-all ${selectedStatus === 'doc_completed' ? 'bg-slate-700 text-white border-slate-700 shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-900 hover:border-slate-300'}`}
                  >
                     <span className={`text-[10px] font-black uppercase tracking-widest ${selectedStatus === 'doc_completed' ? 'text-slate-300' : 'text-slate-400'}`}>Document Completed</span>
                     <span className="text-xl font-black">{items.filter(i => i.status === 'doc_completed').length}</span>
                  </button>
               </div>
           </Card>

           <div className="bg-emerald-50 border border-emerald-100 rounded-[2rem] p-6 space-y-4">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-emerald-600 text-white rounded-xl flex items-center justify-center">
                    <User size={20} />
                 </div>
                 <h4 className="text-xs font-black text-emerald-900 uppercase tracking-widest">Resource Health</h4>
              </div>
              <p className="text-[10px] font-bold text-emerald-700 leading-relaxed uppercase tracking-wider">
                 Ensure all drivers have valid SIM and all fleets have active STNK/KIR before assignment.
              </p>
           </div>
        </div>
      </div>

      {selectedItem && (
        <AssignmentModal 
          item={selectedItem} 
          onClose={() => setSelectedItem(null)} 
          onSuccess={() => { setSelectedItem(null); fetchData(); }} 
        />
      )}
    </div>
  );
}
