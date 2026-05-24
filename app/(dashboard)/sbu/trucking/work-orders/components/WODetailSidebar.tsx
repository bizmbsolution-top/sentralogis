'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  Truck, Loader2, Calendar, Clock, 
  User, Package, Building2,
  ArrowLeft, X, Activity, MessageCircle
} from 'lucide-react';
import ChatPanel from '@/components/chat/ChatPanel';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import AssignmentModal from './AssignmentModal';

interface WODetailSidebarProps {
  woId: string;
  onClose: () => void;
}

interface WorkOrder {
  id: string;
  wo_number: string;
  order_date: string;
  execution_date: string;
  execution_time: string;
  status: string;
  notes: string;
  customer: {
    name: string;
    legal_name: string;
  }
}

interface WOItem {
  id: string;
  item_code: string;
  sbu_type: string;
  item_data: any;
  status: string;
  job_orders: any[];
}

export default function WODetailSidebar({ woId, onClose }: WODetailSidebarProps) {
  const { profile } = useAuth();
  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [items, setItems] = useState<WOItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);
  const [showChat, setShowChat] = useState(false);

  const fetchData = useCallback(async () => {
    if (!woId || !profile?.tenant_id) return;
    setLoading(true);
    
    try {
      // 1. Fetch WO Header
      const { data: woData, error: woError } = await supabase
        .from('work_orders')
        .select(`
          *,
          customer:md_entities!customer_id(name, legal_name)
        `)
        .eq('id', woId)
        .single();

      if (woError) throw woError;
      setWo(woData);

      // 2. Fetch WO Items
      const { data: itemsData, error: itemsError } = await supabase
        .from('wo_items')
        .select('*')
        .eq('wo_id', woId)
        .eq('sbu_type', 'TRUCKING');

      if (itemsError) throw itemsError;
      const baseItems = itemsData || [];

      // 3. Fetch all Job Orders
      const itemIds = baseItems.map(i => i.id);
      if (itemIds.length > 0) {
        const { data: joData, error: joError } = await supabase
          .from('job_orders')
          .select('*')
          .in('wo_item_id', itemIds);

        if (joError) throw joError;
        const baseJOs = joData || [];

        // 4. Manual Fetch Relations
        const transporterIds = [...new Set(baseJOs.map(j => j.transporter_id).filter(Boolean))];
        const fleetIds = [...new Set(baseJOs.map(j => j.fleet_id).filter(Boolean))];
        const driverIds = [...new Set(baseJOs.map(j => j.driver_id).filter(Boolean))];

        const [transporters, fleets, drivers] = await Promise.all([
          transporterIds.length > 0 ? supabase.from('md_entities').select('id, name').in('id', transporterIds) : { data: [] },
          fleetIds.length > 0 ? supabase.from('md_fleets').select('id, plate_number').in('id', fleetIds) : { data: [] },
          driverIds.length > 0 ? supabase.from('md_drivers').select('id, name, phone').in('id', driverIds) : { data: [] }
        ]);

        const enrichedJOs = baseJOs.map(jo => ({
          ...jo,
          transporter: transporters.data?.find(t => t.id === jo.transporter_id),
          md_fleets: fleets.data?.find(f => f.id === jo.fleet_id),
          md_drivers: drivers.data?.find(d => d.id === jo.driver_id)
        }));

        const itemsWithJOs = baseItems.map(item => ({
          ...item,
          job_orders: enrichedJOs.filter(jo => jo.wo_item_id === item.id)
        }));
        setItems(itemsWithJOs);
      } else {
        setItems(baseItems);
      }
    } catch (error: any) {
      console.error('Error fetching WO details:', error);
      toast.error('Gagal mengambil detail: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [woId, profile?.tenant_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="fixed inset-0 z-40 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      
      {/* Sidebar Content */}
      <div className="relative w-full max-w-4xl bg-[#F8FAFC] h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300 overflow-hidden">
        {/* Header */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500"
            >
              <X size={18} />
            </button>
            <div className="h-4 w-[1px] bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{wo?.wo_number || 'LOADING...'}</span>
              {wo && (
                <>
                  <div className={`w-2 h-2 rounded-full ${wo.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{wo.status.replace('_', ' ')}</span>
                </>
              )}
            </div>
          </div>
          <h1 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] italic hidden sm:block">Work Order Detail</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowChat(true)}
              className="w-8 h-8 rounded-full bg-slate-100 hover:bg-emerald-50 hover:text-emerald-600 text-slate-500 flex items-center justify-center border border-slate-200 transition-all active:scale-90"
              title="Discussion"
            >
              <MessageCircle size={16} />
            </button>
            <button onClick={onClose} className="text-slate-400"><X size={20}/></button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {loading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center space-y-4">
                <Loader2 className="w-10 h-10 text-slate-300 animate-spin mx-auto" />
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic animate-pulse">Syncing Operational Data...</p>
              </div>
            </div>
          ) : !wo ? (
            <div className="p-12 text-center text-slate-400">Data tidak ditemukan</div>
          ) : (
            <div className="p-6 space-y-8 pb-20">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                {/* Left: Summary */}
                <div className="md:col-span-4 space-y-6">
                  <Card className="p-5 border-slate-200 shadow-sm space-y-5 bg-white rounded-2xl">
                    <div>
                       <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Customer Info</label>
                       <div className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200 shrink-0">
                             <Building2 size={14} />
                          </div>
                          <div>
                             <p className="text-sm font-black text-slate-900 uppercase leading-tight">{wo.customer.name}</p>
                             <p className="text-[10px] font-bold text-slate-500">{wo.customer.legal_name}</p>
                          </div>
                       </div>
                    </div>

                    <div className="space-y-3 pt-4 border-t border-slate-50">
                       <div className="flex items-center gap-3">
                          <Calendar size={14} className="text-slate-400" />
                          <p className="text-[11px] font-black text-slate-900 uppercase">
                             {new Date(wo.execution_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                       </div>
                       <div className="flex items-center gap-3">
                          <Clock size={14} className="text-slate-400" />
                          <p className="text-[11px] font-black text-slate-900 uppercase">{wo.execution_time}</p>
                       </div>
                    </div>
                  </Card>

                  <Card className="p-5 border-slate-200 shadow-sm bg-white rounded-2xl space-y-3">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest block">Progress</label>
                    <div className="space-y-2">
                       <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <span className="text-[9px] font-black text-slate-500 uppercase">Items</span>
                          <span className="text-xs font-black text-slate-900">{items.length}</span>
                       </div>
                       <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-xl border border-emerald-100">
                          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Done</span>
                          <span className="text-xs font-black text-emerald-600">{items.filter(i => i.status === 'completed').length}</span>
                       </div>
                    </div>
                  </Card>
                </div>

                {/* Right: Manifests */}
                <div className="md:col-span-8 space-y-4">
                  <h2 className="text-[9px] font-black text-slate-900 uppercase tracking-[0.4em] flex items-center gap-2 mb-2">
                     <Package size={12} className="text-slate-400" /> Manifest Breakdown
                  </h2>

                  {items.map((item) => (
                    <Card key={item.id} className="p-0 border-slate-200 shadow-sm overflow-hidden bg-white rounded-2xl group">
                       <div className="p-4">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                             <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center font-mono text-[9px] font-black shadow-lg shadow-slate-900/10 shrink-0">
                                   {item.item_code.split('-').pop()}
                                </div>
                                <div>
                                   <h4 className="text-sm font-black text-slate-900 uppercase tracking-tight leading-none">{item.item_data.vehicle_type_name}</h4>
                                   <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mt-1">{item.item_code} / Units: {item.item_data.unit_count}</p>
                                </div>
                             </div>

                             <div className="flex items-center gap-2">
                                <Badge className={`text-[7px] font-black px-2 py-0.5 rounded uppercase tracking-widest ${
                                   item.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                                   'bg-blue-100 text-blue-700'
                                }`}>
                                   {item.status.replace('_', ' ')}
                                </Badge>
                                <button 
                                  onClick={() => setSelectedItem(item)}
                                  className="w-7 h-7 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white flex items-center justify-center transition-all border border-slate-100"
                                >
                                   <Truck size={14} />
                                </button>
                             </div>
                          </div>

                          {/* Route Inline */}
                          <div className="mt-3 flex items-center gap-3 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100 text-[9px]">
                             <div className="flex-1 min-w-0">
                                <span className="text-[7px] font-black text-slate-400 uppercase mr-2 tracking-tighter">Origin:</span>
                                <span className="font-black text-slate-900 uppercase italic truncate">{item.item_data.shipper_name}</span>
                             </div>
                             <ArrowLeft size={10} className="text-slate-300 rotate-180" />
                             <div className="flex-1 min-w-0 text-right">
                                <span className="text-[7px] font-black text-slate-400 uppercase mr-2 tracking-tighter">Dest:</span>
                                <span className="font-black text-slate-900 uppercase italic truncate">{item.item_data.recipient_name}</span>
                             </div>
                          </div>

                          {/* JO Grid */}
                          {item.job_orders && item.job_orders.length > 0 && (
                            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                               {item.job_orders.map((jo: any) => (
                                 <div key={jo.id} className="bg-slate-50/50 border border-slate-100 p-2.5 rounded-xl space-y-1.5">
                                    <div className="flex justify-between items-center">
                                       <span className="text-[8px] font-black text-slate-900">{jo.jo_number}</span>
                                       <div className={`w-1 h-1 rounded-full ${jo.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                                    </div>
                                    <div className="space-y-1">
                                       <div className="flex items-center gap-1.5 text-[8px] font-black text-slate-700 uppercase">
                                          <Building2 size={8} className="text-slate-400" />
                                          <span className="truncate">{jo.transporter?.name || 'Vendor'}</span>
                                          <span className="text-blue-600 bg-blue-50 px-1 rounded">{jo.md_fleets?.plate_number}</span>
                                       </div>
                                       <div className="flex items-center gap-1.5 text-[8px] font-bold text-slate-500 uppercase">
                                          <User size={8} className="text-slate-400" />
                                          <span className="truncate">{jo.md_drivers?.name || 'No Pilot'}</span>
                                       </div>
                                    </div>
                                 </div>
                               ))}
                            </div>
                          )}
                       </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Chat Modal */}
      {showChat && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="w-full max-w-lg h-[70vh] flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 bg-[#0a0e27] rounded-t-2xl border-b border-white/10">
              <div className="flex items-center gap-2">
                <MessageCircle size={16} className="text-blue-400" />
                <span className="text-white text-sm font-semibold">Discussion — {wo?.wo_number}</span>
              </div>
              <button onClick={() => setShowChat(false)} className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
                <X size={16} className="text-white/60" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden rounded-b-2xl">
              <ChatPanel channelType="work_order" entityId={woId} userId={profile?.id || ''} />
            </div>
          </div>
        </div>
      )}

      {selectedItem && (
        <AssignmentModal 
          item={{...selectedItem, work_orders: wo}} 
          onClose={() => setSelectedItem(null)} 
          onSuccess={() => { setSelectedItem(null); fetchData(); }} 
        />
      )}
    </div>
  );
}
