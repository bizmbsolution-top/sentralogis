'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { 
  Truck, 
  MapPin, 
  Clock, 
  Phone, 
  ChevronRight,
  Search, 
  Navigation,
  Loader2,
  CheckCircle2,
  AlertCircle,
  History,
  Image as ImageIcon,
  Activity,
  Zap,
  RefreshCcw,
  ExternalLink,
  User,
  MoreHorizontal
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { format, formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'bg-emerald-500 text-white';
    case 'in_progress': return 'bg-blue-600 text-white';
    case 'accepted': return 'bg-amber-500 text-white';
    default: return 'bg-slate-400 text-white';
  }
};

const getStatusLabel = (jo: any) => {
  if (jo.status === 'accepted') return 'MENUNGGU BERANGKAT';
  if (jo.status === 'in_progress') {
    const activeStop = jo.routes?.find((r: any) => r.status === 'arrived');
    if (activeStop) return `TIBA DI ${activeStop.location_name?.toUpperCase()}`;

    const nextStop = jo.routes?.find((r: any) => r.status === 'pending');
    if (nextStop) return `MENUJU ${nextStop.location_name?.toUpperCase()}`;

    return 'MENUNGGU SELESAI';
  }
  if (jo.status === 'completed') return 'PEKERJAAN SELESAI';
  return jo.status.toUpperCase().replace(/_/g, ' ');
};

export default function IntelligenceTower() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('jo') || '';
  const [searchQuery, setSearchQuery] = useState(initialQuery);
  const [workOrder, setWorkOrder] = useState<any>(null);
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  useEffect(() => {
    if (profile) fetchData(initialQuery, false);
  }, [initialQuery, profile]);

  useEffect(() => {
    if (!profile) return;
    const q = searchQuery || initialQuery;
    const interval = setInterval(() => fetchData(q, true), 10000);
    return () => clearInterval(interval);
  }, [searchQuery, initialQuery, profile]);

  const fetchData = async (query: string, silent = false) => {
    if (!profile) return;
    if (!silent) setLoading(true);
    
    try {
      let targetWoId = null;
      let targetJoId = null;
      let woData = null;

      // Determine if we should filter by tenant_id (SBU roles)
      const isHq = profile.role.startsWith('hq_') || profile.role === 'admin';
      const userTenantId = profile.tenant_id;

      if (query) {
        // 1. Specific Search Logic
        let { data: wo } = await supabase
          .from('work_orders')
          .select('*, customer:md_entities(name)')
          .eq('wo_number', query)
          .maybeSingle();

        if (wo) {
          targetWoId = wo.id;
          woData = wo;
        } else {
          const { data: jo } = await supabase
            .from('job_orders')
            .select('*, wo_item:wo_item_id(wo_id)')
            .or(`jo_number.eq.${query},tracking_token.eq.${query}`)
            .maybeSingle();
          
          if (jo) {
            targetJoId = jo.id;
            targetWoId = jo.wo_item?.wo_id;
            if (targetWoId) {
              const { data: parentWo } = await supabase
                .from('work_orders')
                .select('*, customer:md_entities!customer_id(name)')
                .eq('id', targetWoId)
                .maybeSingle();
              woData = parentWo;
            }
          }
        }
      }

      // 2. Fetch JOs
      let queryBuilder = supabase.from('job_orders').select(`
        id, jo_number, status, accepted_at, started_at, completed_at, updated_at, wo_item_id, tracking_token
      `);

      if (targetJoId) {
        // If specific JO search, filter to only that JO
        queryBuilder = queryBuilder.eq('id', targetJoId);
      } else if (targetWoId) {
        // If specific WO search, filter to all JOs in the WO
        const { data: items } = await supabase.from('wo_items').select('id').eq('wo_id', targetWoId);
        const itemIds = items?.map(i => i.id) || [];
        if (itemIds.length > 0) {
          queryBuilder = queryBuilder.in('wo_item_id', itemIds);
        } else {
          // If no items, this WO has no jobs
          setJobOrders([]);
          setWorkOrder(woData);
          setLoading(false);
          return;
        }
      } else if (query && !targetWoId && !targetJoId) {
        // If query doesn't match anything
        setJobOrders([]);
        setWorkOrder(null);
        setLoading(false);
        return;
      } else {
        // If NO search, show all ACTIVE (not completed)
        queryBuilder = queryBuilder.in('status', ['accepted', 'in_progress']);
        
        // SBU roles only see their own tenant
        if (!isHq && userTenantId) {
          queryBuilder = queryBuilder.eq('tenant_id', userTenantId);
        }
        
        queryBuilder = queryBuilder.order('updated_at', { ascending: false });
      }

      const { data: jos, error: joError } = await queryBuilder;

      if (joError) {
        console.error("JO Fetch Error Details:", joError.message, joError.details, joError.hint);
        setJobOrders([]);
        setWorkOrder(null);
        return;
      }

      if (jos) {
        // If we don't have woData (view all mode), we need to fetch WO info for each JO
        const processedJos = await Promise.all(jos.map(async (jo) => {
          let parentWo = (jo as any).wo_item?.work_orders;
          
          if (!parentWo && woData) {
            parentWo = woData;
          }

          const stops = (jo.routes || []).sort((a: any, b: any) => a.sequence - b.sequence);
          const latestLog = (jo.tracking || []).sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
          
          const milestones = [
            { label: 'TERIMA', status: jo.accepted_at ? 'completed' : 'pending' },
            { label: 'MULAI', status: jo.started_at ? 'completed' : (jo.accepted_at ? 'current' : 'pending') },
            ...stops.map((s: any) => ({
              label: s.location_name?.toUpperCase() || `LOC ${s.sequence}`,
              status: s.status === 'completed' ? 'completed' : (s.status === 'arrived' ? 'current' : 'pending')
            })),
            { label: 'FINISH', status: jo.completed_at ? 'completed' : 'pending' }
          ];

          const totalDots = milestones.length;
          const gap = 100 / (totalDots - 1);
          const latestReachedIndex = [...milestones].reverse().findIndex(m => m.status !== 'pending');
          const i = latestReachedIndex === -1 ? 0 : (milestones.length - 1 - latestReachedIndex);
          let progress = i * gap;
          if (milestones[i].status === 'completed' && i < milestones.length - 1) {
             progress += gap * 0.5;
          }
          if (jo.status === 'completed') progress = 100;

          return {
            ...jo,
            milestones,
            progress_pipeline: progress,
            latest_log: latestLog,
            parent_wo: parentWo
          };
        }));

        setJobOrders(processedJos);
        setWorkOrder(woData || (processedJos.length > 0 ? { wo_number: 'ALL ACTIVE JOURNEYS' } : null));
        setLastRefreshed(new Date());
      } else {
        setJobOrders([]);
        setWorkOrder(null);
      }
    } catch (err) {
      console.error("Tower Sync Error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#F8FAFC] -mx-8 -mt-8 min-h-screen">
      {/* Header Bar */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 px-8 py-4 shadow-sm">
         <div className="max-w-[1800px] mx-auto flex items-center justify-between">
            <div className="flex items-center gap-6">
               <div className="bg-slate-900 text-white p-3 rounded-2xl shadow-xl rotate-3">
                  <Navigation size={24} />
               </div>
               <div>
                  <h1 className="text-xl font-black text-slate-900 tracking-tighter uppercase leading-none">Intelligence Tower</h1>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping"></span>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                       {lastRefreshed ? `Live Sync: ${format(lastRefreshed, 'HH:mm:ss')}` : 'Connecting...'}
                    </p>
                  </div>
               </div>
            </div>

            <div className="flex items-center gap-8">
               {workOrder && (
                 <div className="flex items-center gap-6 bg-slate-50 px-6 py-2.5 rounded-2xl border border-slate-100">
                    <div className="text-right">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Customer</p>
                       <p className="text-[10px] font-black text-slate-900 uppercase truncate max-w-[150px]">{workOrder.customer?.name}</p>
                    </div>
                    <div className="w-px h-8 bg-slate-200"></div>
                    <div className="text-center">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em]">Active Work Order</p>
                       <h2 className="text-lg font-black text-blue-600 uppercase tracking-tighter">{workOrder.wo_number}</h2>
                    </div>
                 </div>
               )}

               <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <Input 
                      placeholder="SCAN WO / JO NUMBER..." 
                      className="w-80 h-12 pl-12 bg-slate-50 border-transparent rounded-2xl font-black text-xs tracking-widest uppercase focus:bg-white focus:ring-4 focus:ring-slate-900/5 transition-all outline-none"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                      onKeyDown={(e) => e.key === 'Enter' && fetchData(searchQuery)}
                    />
                  </div>
                  <Button 
                    className="bg-slate-900 hover:bg-black text-white h-12 rounded-2xl px-8 font-black uppercase text-xs tracking-widest shadow-xl shadow-slate-900/20 flex gap-3 transition-all active:scale-95"
                    onClick={() => fetchData(searchQuery)}
                  >
                    {loading ? <Loader2 className="animate-spin" size={18} /> : <RefreshCcw size={18} />} 
                    Monitor
                  </Button>
               </div>
            </div>
         </div>
      </div>

      <div className="max-w-[1800px] mx-auto p-8">
         {!loading && jobOrders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-48 border-4 border-dashed border-slate-100 rounded-[50px] bg-white shadow-inner">
               <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mb-8">
                  <Activity size={48} className="text-slate-200" />
               </div>
               <h3 className="text-3xl font-black text-slate-900 uppercase tracking-tighter opacity-50">No Active Journeys</h3>
               <p className="text-slate-400 font-bold mt-3 text-lg">Semua armada sedang dalam posisi parkir atau belum memulai penugasan.</p>
            </div>
         )}

         {jobOrders.length > 0 && (
            <div className="space-y-6">
               <div className="flex items-center justify-between px-4">
                  <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">Fleet Journey Pipelines — {jobOrders.length} Units Active</h3>
                  <div className="flex gap-4">
                    <Badge className="bg-blue-600/10 text-blue-600 border-blue-100 text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
                       {jobOrders.filter(j => j.status === 'in_progress').length} Moving
                    </Badge>
                    <Badge className="bg-emerald-600/10 text-emerald-600 border-emerald-100 text-[9px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest">
                       {jobOrders.filter(j => j.status === 'completed').length} Delivered
                    </Badge>
                  </div>
               </div>

               <div className="space-y-4">
                  {jobOrders.map(jo => (
                    <Card key={jo.id} className="p-0 rounded-[2.5rem] border-slate-100 shadow-sm hover:shadow-xl hover:scale-[1.005] transition-all duration-500 overflow-hidden bg-white group">
                       <div className="flex items-center min-h-[140px]">
                          {/* LEFT: IDENTITY */}
                          <div className="w-1/4 p-8 border-r border-slate-50 flex items-center gap-6">
                             <div className="w-16 h-16 bg-slate-900 text-white rounded-[1.5rem] flex items-center justify-center shadow-2xl shrink-0 group-hover:rotate-6 transition-transform">
                                <Truck size={32} />
                             </div>
                             <div className="min-w-0">
                                {jo.parent_wo && (
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 truncate">
                                     {jo.parent_wo.customer?.name} / {jo.parent_wo.wo_number}
                                  </p>
                                )}
                                <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1 truncate">{jo.jo_number}</p>
                                <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-tight">{jo.fleets?.plate_number}</h4>
                                <div className="flex items-center gap-2 mt-1.5">
                                   <User size={12} className="text-slate-400" />
                                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-tight truncate">{jo.drivers?.name || 'No Driver'}</p>
                                </div>
                             </div>
                          </div>

                          {/* MIDDLE: JOURNEY PIPELINE */}
                          <div className="flex-1 px-12 py-8">
                             <div className="relative h-20 flex flex-col justify-center">
                                {/* The Pipe Line */}
                                <div className="absolute left-0 right-0 h-1 bg-slate-100 rounded-full">
                                   <div 
                                      className="h-full bg-blue-600 transition-all duration-1000 shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                                      style={{ width: `${jo.progress_pipeline}%` }}
                                   />
                                </div>

                                {/* Dots / Milestones */}
                                <div className="absolute left-0 right-0 flex justify-between items-center px-1">
                                   {jo.milestones.map((m: any, idx: number) => (
                                      <div key={idx} className="flex flex-col items-center group/dot">
                                         <div className={`w-6 h-6 rounded-full border-4 transition-all duration-500 flex items-center justify-center z-10 ${
                                            m.status === 'completed' ? 'bg-emerald-500 border-emerald-100 scale-110' : 
                                            m.status === 'current' ? 'bg-blue-600 border-blue-100 animate-pulse scale-125' : 
                                            'bg-white border-slate-100 group-hover/dot:border-slate-300'
                                         }`}>
                                            {m.status === 'completed' && <CheckCircle2 size={10} className="text-white" />}
                                            {m.status === 'current' && <Activity size={10} className="text-white" />}
                                         </div>
                                         <span className={`absolute mt-12 text-[8px] font-black uppercase tracking-tighter text-center whitespace-nowrap transition-colors duration-500 ${
                                            m.status === 'completed' ? 'text-emerald-600' : 
                                            m.status === 'current' ? 'text-blue-600' : 'text-slate-300'
                                         }`}>
                                            {m.label}
                                         </span>
                                      </div>
                                   ))}
                                </div>
                             </div>
                          </div>

                          {/* RIGHT: LAST UPDATE & STATUS */}
                          <div className="w-1/4 p-8 border-l border-slate-50 bg-slate-50/30 flex flex-col justify-center">
                             <div className="mb-4">
                                <div className={`inline-flex px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest shadow-sm ${getStatusColor(jo.status)}`}>
                                   {getStatusLabel(jo)}
                                </div>
                             </div>
                             
                             <div className="space-y-1">
                                <div className="flex items-center gap-2 text-slate-400">
                                   <History size={12} />
                                   <p className="text-[9px] font-black uppercase tracking-widest">Last Activity</p>
                                </div>
                                {jo.latest_log ? (
                                   <div>
                                      <p className="text-[11px] font-black text-slate-900 uppercase tracking-tight line-clamp-1">
                                         {jo.latest_log.status_update.replace(/_/g, ' ')}
                                      </p>
                                      <p className="text-[9px] font-bold text-slate-400 italic">
                                         {formatDistanceToNow(new Date(jo.latest_log.created_at), { addSuffix: true, locale: id })}
                                      </p>
                                   </div>
                                ) : (
                                   <p className="text-[10px] font-bold text-slate-300 italic">Belum ada aktivitas</p>
                                )}
                             </div>
                             
                             <div className="mt-4 flex items-center gap-4">
                                <button className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline flex items-center gap-1">
                                   <ExternalLink size={10} /> Live Map
                                </button>
                                <button className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-900 flex items-center gap-1">
                                   <ImageIcon size={10} /> Proofs
                                </button>
                             </div>
                          </div>
                       </div>
                    </Card>
                  ))}
               </div>
            </div>
         )}
      </div>
    </div>
  );
}
