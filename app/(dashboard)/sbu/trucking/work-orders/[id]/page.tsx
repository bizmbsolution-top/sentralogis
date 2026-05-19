'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  Truck, Loader2, MapPin, Calendar, Clock, 
  ChevronRight, User, ClipboardList, ArrowLeft,
  CheckCircle2, AlertCircle, Package, Building2,
  Navigation, ExternalLink, Activity
} from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import AssignmentModal from '../components/AssignmentModal';

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
  job_orders: {
    id: string;
    jo_number: string;
    status: string;
    transporter: { name: string };
    md_fleets: { plate_number: string; md_fleet_types: { type_name: string } };
    md_drivers: { name: string; phone: string };
  }[]
}

export default function WorkOrderDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { profile } = useAuth();
  const [wo, setWo] = useState<WorkOrder | null>(null);
  const [items, setItems] = useState<WOItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any | null>(null);

  const fetchData = useCallback(async () => {
    if (!id || !profile?.tenant_id || id === '[id]') return;
    setLoading(true);
    
    try {
      // 1. Fetch WO Header
      const { data: woData, error: woError } = await supabase
        .from('work_orders')
        .select(`
          *,
          customer:md_entities!customer_id(name, legal_name)
        `)
        .eq('id', id)
        .single();

      if (woError) throw woError;
      setWo(woData);

      // 2. Fetch WO Items
      const { data: itemsData, error: itemsError } = await supabase
        .from('wo_items')
        .select('*')
        .eq('wo_id', id)
        .eq('sbu_type', 'TRUCKING');

      if (itemsError) throw itemsError;
      const baseItems = itemsData || [];

      // 3. Fetch all Job Orders for these items
      const itemIds = baseItems.map(i => i.id);
      if (itemIds.length > 0) {
        // AMBIL DATA JO TANPA JOIN (MANUAL FETCH UNTUK STABILITAS TOTAL)
        const { data: joData, error: joError } = await supabase
          .from('job_orders')
          .select('*')
          .in('wo_item_id', itemIds);

        if (joError) throw joError;
        const baseJOs = joData || [];

        // 4. Manual Fetch Relasi untuk menghindari "Schema Cache" error
        const transporterIds = [...new Set(baseJOs.map(j => j.transporter_id).filter(Boolean))];
        const fleetIds = [...new Set(baseJOs.map(j => j.fleet_id).filter(Boolean))];
        const driverIds = [...new Set(baseJOs.map(j => j.driver_id).filter(Boolean))];

        const [transporters, fleets, drivers] = await Promise.all([
          transporterIds.length > 0 ? supabase.from('md_entities').select('id, name').in('id', transporterIds) : { data: [] },
          fleetIds.length > 0 ? supabase.from('md_fleets').select('id, plate_number').in('id', fleetIds) : { data: [] },
          driverIds.length > 0 ? supabase.from('md_drivers').select('id, name, phone').in('id', driverIds) : { data: [] }
        ]);

        // Map relasi kembali ke JO
        const enrichedJOs = baseJOs.map(jo => ({
          ...jo,
          transporter: transporters.data?.find(t => t.id === jo.transporter_id),
          md_fleets: fleets.data?.find(f => f.id === jo.fleet_id),
          md_drivers: drivers.data?.find(d => d.id === jo.driver_id)
        }));

        // Map JOs back to items
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
      toast.error('Gagal mengambil detail Work Order: ' + error.message);
    } finally {
      setLoading(false);
    }
  }, [id, profile?.tenant_id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 text-slate-900 animate-spin mx-auto" />
          <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse italic">Synchronizing Operational Data...</p>
        </div>
      </div>
    );
  }

  if (!wo) {
    return (
      <div className="p-8 text-center space-y-4">
        <AlertCircle size={48} className="mx-auto text-rose-500" />
        <h2 className="text-2xl font-black text-slate-900 uppercase">Work Order Not Found</h2>
        <Button onClick={() => router.back()} variant="secondary">Go Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-12">
      {/* Top sticky bar */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => router.back()}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-500 transition-all active:scale-95"
            >
              <ArrowLeft size={18} />
            </button>
            <div className="h-4 w-[1px] bg-slate-200" />
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{wo.wo_number}</span>
              <div className={`w-2 h-2 rounded-full ${wo.status === 'completed' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{wo.status.replace('_', ' ')}</span>
            </div>
          </div>
          <h1 className="text-xs font-black text-slate-900 uppercase tracking-[0.3em] italic">Work Order Cockpit</h1>
          <div className="flex items-center gap-3">
             <div className="text-right hidden md:block">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none">Customer</p>
                <p className="text-[11px] font-black text-slate-900 uppercase">{wo.customer.name}</p>
             </div>
             <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200">
                <Building2 size={16} />
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto px-6 pt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Quick Stats & Info */}
        <div className="lg:col-span-3 space-y-6">
           <Card className="p-6 border-slate-200 shadow-sm space-y-6 bg-white rounded-2xl">
              <div>
                 <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Schedule & Logistics</label>
                 <div className="space-y-4">
                    <div className="flex items-center gap-3">
                       <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                          <Calendar size={18} />
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Execution Date</p>
                          <p className="text-xs font-black text-slate-900">{new Date(wo.execution_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-600">
                          <Clock size={18} />
                       </div>
                       <div>
                          <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">Dispatch Time</p>
                          <p className="text-xs font-black text-slate-900">{wo.execution_time}</p>
                       </div>
                    </div>
                 </div>
              </div>

              {wo.notes && (
                <div className="pt-5 border-t border-slate-100">
                   <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Notes</label>
                   <p className="text-[11px] font-bold text-slate-600 leading-relaxed italic">"{wo.notes}"</p>
                </div>
              )}
           </Card>

           <Card className="p-6 border-slate-200 shadow-sm bg-white rounded-2xl space-y-4">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">Operational Progress</label>
              <div className="space-y-3">
                 <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Total Items</span>
                    <span className="text-sm font-black text-slate-900">{items.length}</span>
                 </div>
                 <div className="flex items-center justify-between p-3 bg-blue-50/50 rounded-xl border border-blue-100">
                    <span className="text-[10px] font-black text-blue-600/70 uppercase">In Progress</span>
                    <span className="text-sm font-black text-blue-600">{items.filter(i => ['assigned', 'in_progress'].includes(i.status)).length}</span>
                 </div>
                 <div className="flex items-center justify-between p-3 bg-emerald-50/50 rounded-xl border border-emerald-100">
                    <span className="text-[10px] font-black text-emerald-600/70 uppercase">Completed</span>
                    <span className="text-sm font-black text-emerald-600">{items.filter(i => i.status === 'completed').length}</span>
                 </div>
              </div>
           </Card>
        </div>

        {/* Right: Detailed Manifest */}
        <div className="lg:col-span-9 space-y-6">
           <div className="flex items-center justify-between">
              <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.4em] flex items-center gap-2">
                 <Package size={14} className="text-slate-400" /> Manifest Breakdown
              </h2>
           </div>

           <div className="space-y-4">
              {items.map((item) => (
                <Card key={item.id} className="p-0 border-slate-200 shadow-sm overflow-hidden bg-white rounded-2xl group">
                   <div className="p-5">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                         <div className="flex items-center gap-4 flex-1">
                            <div className="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center font-mono text-[10px] font-black shadow-lg shadow-slate-900/10">
                               {item.item_code.split('-').pop()}
                            </div>
                            <div className="space-y-1">
                               <h4 className="text-base font-black text-slate-900 uppercase tracking-tight leading-none">{item.item_data.vehicle_type_name}</h4>
                               <div className="flex items-center gap-2 text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                  <span>{item.item_code}</span>
                                  <span className="text-slate-200">/</span>
                                  <span>Units: {item.item_data.unit_count}</span>
                               </div>
                            </div>
                         </div>

                         {/* Integrated Route */}
                         <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 max-w-md w-full">
                            <div className="flex-1 min-w-0">
                               <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Origin</p>
                               <p className="text-[10px] font-black text-slate-900 truncate uppercase italic">{item.item_data.shipper_name}</p>
                            </div>
                            <ArrowLeft size={12} className="text-slate-300 rotate-180" />
                            <div className="flex-1 min-w-0 text-right">
                               <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Destination</p>
                               <p className="text-[10px] font-black text-slate-900 truncate uppercase italic">{item.item_data.recipient_name}</p>
                            </div>
                         </div>

                         <div className="flex items-center gap-2">
                            <Badge className={`text-[8px] font-black px-2.5 py-1 rounded uppercase tracking-widest ${
                               item.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                               ['assigned', 'in_progress'].includes(item.status) ? 'bg-blue-100 text-blue-700' :
                               'bg-amber-100 text-amber-700'
                            }`}>
                               {item.status.replace('_', ' ')}
                            </Badge>
                            <button 
                              onClick={() => setSelectedItem(item)}
                              className="w-8 h-8 rounded-lg bg-slate-50 text-slate-400 hover:bg-slate-900 hover:text-white flex items-center justify-center transition-all shadow-sm border border-slate-100"
                            >
                               <Truck size={16} />
                            </button>
                         </div>
                      </div>

                      {/* Job Orders List - More Compact */}
                      {item.job_orders && item.job_orders.length > 0 && (
                        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                           {item.job_orders.map((jo) => (
                             <div key={jo.id} className="bg-slate-50/50 border border-slate-100 p-3 rounded-xl space-y-2 hover:bg-white hover:shadow-md transition-all">
                                <div className="flex justify-between items-center">
                                   <span className="text-[9px] font-black text-slate-900 tracking-tighter">{jo.jo_number}</span>
                                   <div className={`w-1.5 h-1.5 rounded-full ${jo.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                                </div>
                                <div className="space-y-1">
                                   <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-700 uppercase">
                                      <Building2 size={10} className="text-slate-400" />
                                      <span className="truncate">{jo.transporter?.name || 'Vendor'}</span>
                                      <span className="text-blue-600 bg-blue-50 px-1 rounded">{jo.md_fleets?.plate_number}</span>
                                   </div>
                                   <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-500 uppercase">
                                      <User size={10} className="text-slate-400" />
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
