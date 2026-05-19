'use client';

import { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast, Toaster } from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { 
  CheckCircle, Calendar, Phone, DollarSign, 
  TrendingUp, FileText, 
  ShieldCheck, Receipt, Search, Loader2,
  Clock, Package, ArrowRight, Activity,
  Image as ImageIcon, Plus, Archive, Database, 
  ShieldAlert, Banknote, Coins, AlertCircle
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

import SBUFinanceHybridModal from '@/components/sbu/SBUFinanceHybridModal';

interface CompletedJob {
  id: string;
  jo_number: string;
  status: string;
  completed_at: string;
  driver_phone: string | null;
  purchase_price: number;
  pod_photo_url: string | null;
  pod_status: string;
  wo_item_id: string;
  wo_items?: any;
  wo_item?: { wo_id: string } | any;
  md_fleets: { plate_number: string } | any;
  md_drivers: { name: string } | any;
  has_draft_costs?: boolean;
  has_pending_audit?: boolean;
  advance_status?: string;
  is_doc_finished?: boolean;
  is_cost_finished?: boolean;
  advance_amount?: number;
  driver_payment_amount?: number;
  created_at: string;
  advance_receipt_url?: string;
}

function DocumentsAndFinancesContent() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<CompletedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState('accepted');
  const [hybridFinanceJob, setHybridFinanceJob] = useState<any>(null);
  const [uploadingAdvanceForJo, setUploadingAdvanceForJo] = useState<string | null>(null);

  const fetchCompletedJobs = useCallback(async () => {
    try {
      setLoading(true);
      
      const { data: jos, error: joError } = await supabase
        .from('job_orders')
        .select(`
          id, jo_number, status, completed_at, driver_phone,
          purchase_price, pod_photo_url, pod_status,
          wo_item_id, fleet_id, driver_id,
          advance_amount, advance_status, advance_receipt_url,
          driver_revenue_share,
          is_doc_finished, is_cost_finished, created_at, updated_at
        `)
        .in('status', [
            'accepted', 'ORDER DITERIMA', 
            'in_progress', 'DALAM PERJALANAN', 'START JOURNEY',
            'completed', 'done', 'PEKERJAAN SELESAI', 
            'ready_for_billing', 'verified', 'VERIFIED',
            'awaiting_audit', 'picking_up', 'delivering', 'MENUNGGU BERANGKAT'
        ])
        .not('status', 'in', '("invoiced","paid","INVOICED","PAID")')
        .eq('tenant_id', profile?.tenant_id)
        .order('updated_at', { ascending: false });

      if (joError) throw joError;

      if (jos && jos.length > 0) {
        const driverIds = Array.from(new Set(jos.map(j => j.driver_id).filter(Boolean)));
        const fleetIds = Array.from(new Set(jos.map(j => j.fleet_id).filter(Boolean)));
        const woItemIds = Array.from(new Set(jos.map(j => j.wo_item_id).filter(Boolean)));

        const [driversRes, fleetsRes, woItemsRes, costsRes] = await Promise.all([
          driverIds.length > 0 ? supabase.from('md_drivers').select('id, name').in('id', driverIds) : { data: [] },
          fleetIds.length > 0 ? supabase.from('md_fleets').select('id, plate_number, fleet_type_id, md_entities(name, is_vendor), md_fleet_types(type_name)').in('id', fleetIds) : { data: [] },
          woItemIds.length > 0 ? supabase.from('wo_items').select('id, wo_id, item_data').in('id', woItemIds) : { data: [] },
          supabase.from('extra_costs').select('id, jo_id, status').in('jo_id', jos.map(j => j.id))
        ]);

        const driversMap = Object.fromEntries((driversRes.data || []).map(d => [d.id, d]));
        const fleetsMap = Object.fromEntries((fleetsRes.data || []).map(f => [f.id, f]));
        const woItemsMap = Object.fromEntries((woItemsRes.data || []).map(i => [i.id, i]));
        const costsData = costsRes.data || [];

        const woIds = Array.from(new Set(woItemsRes.data?.map(i => i.wo_id).filter(Boolean)));
        const { data: wosRes } = woIds.length > 0 ? 
          await supabase.from('work_orders').select('id, wo_number, execution_date, md_entities(name)').in('id', woIds) : 
          { data: [] };
        const wosMap = Object.fromEntries((wosRes || []).map(w => [w.id, w]));

        const hydrated = jos.map(j => ({
          ...j,
          md_drivers: driversMap[j.driver_id],
          md_fleets: fleetsMap[j.fleet_id],
          wo_items: woItemsMap[j.wo_item_id] ? {
            ...woItemsMap[j.wo_item_id],
            work_orders: wosMap[woItemsMap[j.wo_item_id].wo_id]
          } : null,
          has_pending_audit: costsData.some(c => c.jo_id === j.id && c.status === 'need_approval'),
          has_draft_costs: costsData.some(c => c.jo_id === j.id && c.status === 'draft')
        }));

        // DEDUPLICATION: Ensure unique JO IDs
        const uniqueHydrated = Array.from(new Map(hydrated.map(item => [item.id, item])).values());
        setJobs(uniqueHydrated);
      } else {
        setJobs([]);
      }
    } catch (err: any) {
      console.error('Fetch Error:', err);
      toast.error('Gagal mengambil data operasional');
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id]);

  useEffect(() => {
    const joParam = searchParams.get('jo');
    const woParam = searchParams.get('wo');
    if (woParam) setSearchTerm(woParam);
    else if (joParam) setSearchTerm(joParam);
  }, [searchParams]);

  useEffect(() => {
    if (profile?.tenant_id) {
      fetchCompletedJobs();
    }
  }, [profile?.tenant_id, fetchCompletedJobs]);
  
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCompletedJobs();
    }, 30000); // Sync every 30 seconds
    return () => clearInterval(interval);
  }, [fetchCompletedJobs]);
  
  const handleFinalizeGate = async (joId: string, field: 'is_doc_finished' | 'is_cost_finished', value: boolean) => {
    try {
      const { error } = await supabase
        .from('job_orders')
        .update({ [field]: value })
        .eq('id', joId);
      
      if (error) throw error;
      
      // Check if both are finished to set status to ready_for_billing
      const job = jobs.find(j => j.id === joId);
      if (job) {
        const docFin = field === 'is_doc_finished' ? value : (job as any).is_doc_finished;
        const costFin = field === 'is_cost_finished' ? value : (job as any).is_cost_finished;
        
        if (docFin && costFin) {
          await supabase.from('job_orders').update({ status: 'ready_for_billing' }).eq('id', joId);
          if (job.wo_item_id) {
             await supabase.from('wo_items').update({ status: 'ready_for_billing' }).eq('id', job.wo_item_id);
          }
          toast.success('Job marked as READY TO INVOICE!');
        }
      }
      
      fetchCompletedJobs();
    } catch (err: any) {
      toast.error('Gagal update status: ' + err.message);
    }
  };

  const formatRupiah = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(value);
  };

  const searchedJobs = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return jobs.filter(j =>
      j.jo_number.toLowerCase().includes(term) ||
      j.md_drivers?.name?.toLowerCase().includes(term) ||
      j.md_fleets?.plate_number?.toLowerCase().includes(term) ||
      (j as any).wo_items?.work_orders?.wo_number?.toLowerCase().includes(term)
    );
  }, [jobs, searchTerm]);

  const stats = useMemo(() => ({
    total: searchedJobs.length,
    accepted: searchedJobs.filter(j => ['ACCEPTED', 'ORDER DITERIMA'].includes(j.status?.toUpperCase())).length,
    onRoad: searchedJobs.filter(j => ['ASSIGNED', 'MENUNGGU BERANGKAT', 'PICKING_UP', 'DELIVERING', 'IN_PROGRESS', 'DALAM PERJALANAN', 'START JOURNEY'].includes(j.status?.toUpperCase())).length,
    jobDone: searchedJobs.filter(j => ['COMPLETED', 'DONE', 'PEKERJAAN SELESAI', 'AWAITING_AUDIT'].includes(j.status?.toUpperCase())).length,
    readyForBilling: searchedJobs.filter(j => ['READY_FOR_BILLING', 'VERIFIED'].includes(j.status?.toUpperCase())).length
  }), [searchedJobs]);

  const filteredJobs = useMemo(() => {
    return searchedJobs.filter(j => {
        const s = j.status?.toUpperCase() || '';
        // CRITICAL: Always hide if already invoiced or paid
        if (['INVOICED', 'PAID'].includes(s)) return false;

        if (activeFilter === 'all') return true;
        if (activeFilter === 'accepted') return s === 'ACCEPTED' || s === 'ORDER DITERIMA';
        if (activeFilter === 'on-road') return ['ASSIGNED', 'MENUNGGU BERANGKAT', 'PICKING_UP', 'DELIVERING', 'IN_PROGRESS', 'DALAM PERJALANAN', 'START JOURNEY'].includes(s);
        if (activeFilter === 'done') return ['COMPLETED', 'DONE', 'PEKERJAAN SELESAI', 'AWAITING_AUDIT'].includes(s);
        if (activeFilter === 'billing') return ['READY_FOR_BILLING', 'VERIFIED'].includes(s);
        return true;
    });
  }, [searchedJobs, activeFilter]);

  if (loading && jobs.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-slate-900 animate-spin mb-4" />
        <p className="text-slate-900 font-black tracking-widest text-[10px] uppercase">Syncing Operational Ledger...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-6 lg:p-12">
      <Toaster position="top-right" />
      
      {/* Header Section */}
      <div className="max-w-[1600px] mx-auto mb-16">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-10">
          <div className="flex items-center gap-6">
            <div className="w-20 h-20 bg-slate-900 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500">
              <Receipt size={36} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="w-8 h-[2px] bg-blue-500 rounded-full"></span>
                <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em]">Settlement & Documentation</p>
              </div>
              <h1 className="text-xl md:text-2xl font-semibold text-slate-900 italic uppercase tracking-tight leading-none">Documents & Finances</h1>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative group w-full md:w-96">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={20} />
              <input 
                type="text" 
                placeholder="Search by JO Number..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-16 pl-14 pr-6 bg-white border-2 border-transparent rounded-[2rem] text-sm font-black focus:border-blue-500/10 focus:ring-4 focus:ring-blue-500/5 transition-all outline-none shadow-sm"
              />
            </div>
            <Button 
                onClick={fetchCompletedJobs}
                className="h-16 px-8 bg-slate-900 hover:bg-slate-800 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest flex items-center gap-3 shadow-xl active:scale-95 transition-all"
            >
                <Activity size={18} /> Refresh Data
            </Button>
          </div>
        </div>

        {/* Global Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-12">
           <Card className="p-6 border-none shadow-sm rounded-3xl bg-white group hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-4 mb-3">
                 <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:bg-amber-600 group-hover:text-white transition-all">
                    <CheckCircle size={24} />
                 </div>
                 <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Driver Accepted</p>
                    <p className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">{stats.accepted} Units</p>
                 </div>
              </div>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Orders confirmed by drivers awaiting settlement</p>
           </Card>

           <Card className="p-6 border-none shadow-sm rounded-3xl bg-white group hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-4 mb-3">
                 <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                    <TrendingUp size={24} />
                 </div>
                 <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">On the Road</p>
                    <p className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">{stats.onRoad} Units</p>
                 </div>
              </div>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Active fleets currently in deployment</p>
           </Card>

           <Card className="p-6 border-none shadow-sm rounded-3xl bg-white group hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-4 mb-3">
                 <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center group-hover:bg-rose-600 group-hover:text-white transition-all">
                    <Archive size={24} />
                 </div>
                 <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Job Done</p>
                    <p className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">{stats.jobDone} Units</p>
                 </div>
              </div>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Completed missions awaiting POD verification</p>
           </Card>

           <Card className="p-6 border-none shadow-sm rounded-3xl bg-slate-900 group hover:shadow-lg transition-all duration-300">
              <div className="flex items-center gap-4 mb-3">
                 <div className="w-12 h-12 bg-white/10 text-emerald-400 rounded-2xl flex items-center justify-center group-hover:bg-emerald-400 group-hover:text-slate-900 transition-all">
                    <Coins size={24} />
                 </div>
                 <div>
                    <p className="text-[8px] font-black text-white/40 uppercase tracking-widest italic text-emerald-400">Ready to Invoice</p>
                    <p className="text-xl font-black text-white italic uppercase tracking-tighter">{stats.readyForBilling} Units</p>
                 </div>
              </div>
              <p className="text-[8px] font-bold text-white/30 uppercase tracking-tight">Verified cycles cleared for HQ billing</p>
           </Card>
        </div>

        {/* Filter Tabs */}
        <div className="mt-12 flex flex-wrap items-center gap-3 bg-white p-2 rounded-[2.5rem] shadow-sm border border-slate-100 w-fit">
          {[
            { id: 'all', label: 'All Records', count: stats.total },
            { id: 'accepted', label: 'Driver Accepted', count: stats.accepted },
            { id: 'on-road', label: 'On the Road', count: stats.onRoad },
            { id: 'done', label: 'Job Done', count: stats.jobDone },
            { id: 'billing', label: 'Ready for Invoice', count: stats.readyForBilling }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`h-12 px-8 rounded-[2rem] text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-3 ${
                activeFilter === tab.id 
                  ? (
                      tab.id === 'accepted' ? 'bg-amber-50 text-amber-600 border-2 border-amber-200' :
                      tab.id === 'on-road' ? 'bg-blue-50 text-blue-600 border-2 border-blue-200' :
                      tab.id === 'done' ? 'bg-rose-50 text-rose-600 border-2 border-rose-200' :
                      tab.id === 'billing' ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200' :
                      'bg-slate-900 text-white shadow-lg'
                    )
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 rounded-lg text-[9px] ${
                activeFilter === tab.id 
                  ? (
                      tab.id === 'accepted' ? 'bg-amber-600/10 text-amber-600' :
                      tab.id === 'on-road' ? 'bg-blue-600/10 text-blue-600' :
                      tab.id === 'done' ? 'bg-rose-600/10 text-rose-600' :
                      tab.id === 'billing' ? 'bg-emerald-600/10 text-emerald-600' :
                      'bg-white/20 text-white'
                    )
                  : 'bg-slate-100 text-slate-500'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredJobs.length === 0 ? (
          <div className="col-span-full p-32 text-center bg-white rounded-[3.5rem] shadow-sm border border-slate-100">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
                <AlertCircle size={48} className="text-slate-200" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">No Records Found</h3>
            <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-[10px]">Your current filter contains no matching financial records.</p>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <Card key={job.id} className="group relative overflow-hidden border-none shadow-sm hover:shadow-xl hover:shadow-slate-200/40 transition-all duration-500 rounded-[2rem] bg-white">
               <div className="p-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 group-hover:rotate-0 transition-transform duration-700">
                     <Archive size={180} className="text-slate-900" />
                  </div>

                  <div className="flex items-center justify-between mb-10 relative z-10">
                     <div className="w-14 h-14 bg-slate-900 text-white rounded-2xl flex items-center justify-center shadow-xl rotate-3 group-hover:rotate-0 transition-transform duration-500">
                        <Database size={24} />
                     </div>
                     <div className="flex flex-col items-end gap-2">
                        {/* Status Payout */}
                        {(['accepted', 'ORDER DITERIMA'].includes(job.status?.toLowerCase())) && job.advance_status !== 'paid' && (
                            <Badge className={`border font-black text-[8px] px-3 py-1 uppercase tracking-widest italic animate-pulse ${job.md_fleets?.md_entities?.is_vendor ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                {job.md_fleets?.md_entities?.is_vendor ? 'AWAITING DP (VENDOR)' : 'AWAITING SETTLEMENT (INTERNAL)'}
                            </Badge>
                        )}
                        
                        {/* Status Live Mission */}
                        {['in_progress', 'DALAM PERJALANAN', 'START JOURNEY', 'picking_up', 'delivering', 'MENUNGGU BERANGKAT'].includes(job.status?.toLowerCase()) && (
                            <Badge className="bg-blue-50 text-blue-600 border border-blue-100 font-black text-[8px] px-3 py-1 uppercase tracking-widest italic">LIVE MISSION (ON ROAD)</Badge>
                        )}

                        {/* Status Job Done & POD Collection */}
                        {['completed', 'done', 'PEKERJAAN SELESAI', 'awaiting_audit'].includes(job.status?.toLowerCase()) && !job.is_doc_finished && (
                            <Badge className="bg-rose-50 text-rose-500 border-2 border-rose-200 font-black text-[8px] px-3 py-1 uppercase tracking-widest italic animate-bounce">KUMPULKAN POD!</Badge>
                        )}

                        {/* Status Cost Audit */}
                        {job.has_pending_audit && (
                            <Badge className="bg-amber-50 text-amber-700 border border-amber-200 font-black text-[8px] px-3 py-1 uppercase tracking-widest italic animate-pulse">CS AUDIT PENDING</Badge>
                        )}

                        {/* Status Ready to Invoice */}
                        {['ready_for_billing', 'verified', 'VERIFIED'].includes(job.status?.toLowerCase()) && (
                            <Badge className="bg-emerald-50 text-emerald-600 border border-emerald-100 font-black text-[8px] px-3 py-1 uppercase tracking-widest italic">READY TO INVOICE</Badge>
                        )}
                     </div>
                  </div>

                  <div className="space-y-3 mb-8 relative z-10">
                     <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-md text-[8px] font-black uppercase tracking-widest">
                           {job.jo_number}
                        </span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] italic truncate max-w-[200px]">
                           {job.wo_items?.work_orders?.md_entities?.legal_name || job.wo_items?.work_orders?.md_entities?.name || 'Customer'}
                        </span>
                     </div>
                     
                     <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 group hover:bg-white hover:border-orange-500/20 hover:shadow-lg transition-all duration-300 mt-2 mb-4">
                        <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Scope</p>
                        <p className="text-xs font-black text-slate-900 uppercase tracking-tight truncate group-hover:whitespace-normal group-hover:overflow-visible transition-all">
                           {job.wo_items?.item_data?.origin_name || job.wo_items?.item_data?.shipper_name || job.wo_items?.item_data?.shipper_city || 'Origin'} → {job.wo_items?.item_data?.destination_name || job.wo_items?.item_data?.recipient_name || job.wo_items?.item_data?.recipient_city || 'Dest'}
                        </p>
                        <div className="flex flex-col gap-1 mt-1 opacity-0 h-0 group-hover:opacity-100 group-hover:h-auto transition-all duration-300">
                           <p className="text-[9px] text-slate-500 font-medium">
                              <span className="font-bold text-slate-700">Origin:</span> {job.wo_items?.item_data?.shipper_name || 'N/A'} - {job.wo_items?.item_data?.shipper_address || 'No Address'}
                           </p>
                           <p className="text-[9px] text-slate-500 font-medium">
                              <span className="font-bold text-slate-700">Dest:</span> {job.wo_items?.item_data?.recipient_name || 'N/A'} - {job.wo_items?.item_data?.recipient_address || 'No Address'}
                           </p>
                        </div>
                     </div>
                     <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Settlement Progress</p>
                        <div className="flex items-baseline gap-2">
                           <p className="text-xl font-black text-emerald-600 tracking-tighter italic">
                              {formatRupiah(job.md_fleets?.md_entities?.is_vendor ? (job.purchase_price || 0) : (job.advance_amount || 0))}
                           </p>
                           {((job.driver_payment_amount || 0) > 0) && (
                              <div className="flex items-center gap-2">
                                 <span className="text-[9px] font-black text-slate-300">/</span>
                                 <p className="text-[10px] font-black text-blue-500 uppercase italic">
                                    Paid: {formatRupiah(job.driver_payment_amount || 0)}
                                 </p>
                              </div>
                           )}
                        </div>
                        {((job.driver_payment_amount || 0) > 0) && (
                           <p className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-1">
                              Remaining: {formatRupiah((job.md_fleets?.md_entities?.is_vendor ? (job.purchase_price || 0) : (job.advance_amount || 0)) - (job.driver_payment_amount || 0))}
                           </p>
                        )}
                     </div>
                     <h3 className="text-xl font-black text-slate-900 italic uppercase tracking-tighter leading-none group-hover:text-blue-600 transition-colors">
                        {job.md_drivers?.name || 'Assigned Driver'}
                     </h3>
                     <div className="flex items-center gap-2 text-slate-400">
                        <Calendar size={12} />
                        <p className="text-[9px] font-black uppercase tracking-widest italic">
                           {job.completed_at ? 'Closed' : 'Started'} {new Date(job.completed_at || job.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                        </p>
                     </div>
                  </div>

                  <div className="bg-slate-50/50 p-5 rounded-2xl border border-slate-100/50 group-hover:bg-white group-hover:border-blue-500/20 transition-all duration-500 mb-8 relative z-10">
                    <div className="flex justify-between items-center mb-3">
                       <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest italic">Document Manifest</p>
                       <p className={`text-[9px] font-black uppercase italic ${job.is_doc_finished ? 'text-emerald-600' : 'text-slate-400'}`}>
                          {job.is_doc_finished ? 'VERIFIED' : (job.pod_status || 'WAITING')}
                       </p>
                    </div>
                    <div className="flex items-center gap-2">
                       <ShieldCheck size={12} className={job.is_doc_finished ? 'text-emerald-500' : 'text-slate-300'} />
                       <div className="h-1 flex-1 bg-slate-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ${
                                job.is_doc_finished ? 'w-full bg-emerald-500' : 
                                (['completed', 'done', 'PEKERJAAN SELESAI'].includes(job.status) ? 'w-1/2 bg-amber-400' : 'w-0')
                            }`}
                          />
                       </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 relative z-10">
                     {/* CONSOLIDATED CLOSING HUB */}
                     {['completed', 'done', 'PEKERJAAN SELESAI', 'awaiting_audit', 'ready_for_billing', 'verified', 'VERIFIED', 'in_progress', 'DALAM PERJALANAN', 'START JOURNEY', 'picking_up', 'delivering', 'MENUNGGU BERANGKAT'].includes(job.status) && (
                        <div className="space-y-3">
                           {/* Primary Unified Button */}
                           <Button 
                              variant="secondary"
                              onClick={() => setHybridFinanceJob(job)}
                              disabled={['ready_for_billing', 'verified', 'VERIFIED'].includes(job.status)}
                              className={`w-full h-16 rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 shadow-sm transition-all ${
                                 job.is_doc_finished && job.is_cost_finished
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                                    : 'bg-white border-slate-200 hover:bg-blue-50 hover:text-blue-600'
                              }`}
                           >
                              <Banknote size={18} className={job.is_cost_finished ? 'text-emerald-500' : 'text-blue-500'} /> 
                              {['ready_for_billing', 'verified', 'VERIFIED'].includes(job.status) ? 'VIEW ARCHIVED DATA' : 'OPERATIONAL & FINANCE HUB'}
                           </Button>

                           {/* Final Settlement Gates (Only for Completed/Done) */}
                           {['completed', 'done', 'PEKERJAAN SELESAI', 'awaiting_audit', 'ready_for_billing'].includes(job.status) && (
                              <div className="grid grid-cols-2 gap-3 pt-2">
                                 <button 
                                    onClick={() => handleFinalizeGate(job.id, 'is_doc_finished', !job.is_doc_finished)}
                                    disabled={['ready_for_billing', 'verified', 'VERIFIED'].includes(job.status)}
                                    className={`h-14 rounded-xl border-2 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all ${
                                       job.is_doc_finished ? 'bg-emerald-50 border-emerald-500 text-emerald-600' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                                    }`}
                                 >
                                    {job.is_doc_finished ? <CheckCircle size={16} /> : <div className="w-4 h-4 border-2 border-slate-200 rounded-full" />}
                                    Docs Finished
                                 </button>
                                 <button 
                                    onClick={() => handleFinalizeGate(job.id, 'is_cost_finished', !job.is_cost_finished)}
                                    disabled={['ready_for_billing', 'verified', 'VERIFIED'].includes(job.status)}
                                    className={`h-14 rounded-xl border-2 flex items-center justify-center gap-2 text-[9px] font-black uppercase tracking-widest transition-all ${
                                       job.is_cost_finished ? 'bg-blue-50 border-blue-500 text-blue-600' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-300'
                                    }`}
                                 >
                                    {job.is_cost_finished ? <CheckCircle size={16} /> : <div className="w-4 h-4 border-2 border-slate-200 rounded-full" />}
                                    Cost Finished
                                 </button>
                              </div>
                           )}
                        </div>
                     )}

                     {/* INITIAL PAYOUT PHASE (For Accepted Only) */}
                     {['accepted', 'ORDER DITERIMA'].includes(job.status) && job.advance_status !== 'paid' && (
                        <div className="space-y-3">
                           <div className={`border rounded-2xl p-4 flex items-center justify-between ${job.md_fleets?.md_entities?.is_vendor ? 'bg-orange-50 border-orange-100' : 'bg-blue-50 border-blue-100'}`}>
                              <div>
                                 <p className={`text-[9px] font-black uppercase tracking-widest ${job.md_fleets?.md_entities?.is_vendor ? 'text-orange-600' : 'text-blue-600'}`}>
                                    {job.md_fleets?.md_entities?.is_vendor ? 'Vendor DP Amount' : 'Driver Advance (Bagi Hasil)'}
                                 </p>
                                 <p className="text-sm font-black text-slate-900">{formatRupiah(job.advance_amount || 0)}</p>
                              </div>
                              <Banknote className={job.md_fleets?.md_entities?.is_vendor ? 'text-orange-500' : 'text-blue-500'} size={24} />
                           </div>
                           <Button 
                              onClick={() => setHybridFinanceJob(job)}
                              className={`w-full h-16 text-white rounded-[1.5rem] font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 cursor-pointer transition-all ${
                                 job.md_fleets?.md_entities?.is_vendor ? 'bg-orange-600 hover:bg-orange-700 shadow-orange-500/20' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                              }`}
                           >
                              <Receipt size={18} /> {job.advance_receipt_url ? 'View Payout' : 'Confirm & Upload Proof'}
                           </Button>
                        </div>
                     )}
                  </div>
               </div>
            </Card>
          ))
        )}
      </div>

      {hybridFinanceJob && (
         <SBUFinanceHybridModal 
            job={hybridFinanceJob} 
            onClose={() => setHybridFinanceJob(null)}
            onSuccess={() => {
               setHybridFinanceJob(null);
               fetchCompletedJobs();
            }}
         />
      )}
    </div>
  );
}

export default function DocumentsAndFinancesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-slate-900 animate-spin mb-4" />
        <p className="text-slate-900 font-black tracking-widest text-[10px] uppercase">Syncing Operational Ledger...</p>
      </div>
    }>
      <DocumentsAndFinancesContent />
    </Suspense>
  );
}
