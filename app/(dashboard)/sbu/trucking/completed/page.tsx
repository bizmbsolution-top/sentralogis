'use client';

import { useState, useEffect, useMemo, Suspense, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast, Toaster } from 'react-hot-toast';
import { Search, Loader2, Activity, AlertCircle, Receipt, Eye, Clock } from 'lucide-react';
import { Button } from '@/components/ui/Button';

import SBUFinanceHybridModal from '@/components/sbu/SBUFinanceHybridModal';
import JobDetailModal from './components/JobDetailModal';

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
  driver_payment_status?: string;
  base_price?: number;
  driver_share_percentage?: number;
  created_at: string;
  advance_receipt_url?: string;
}

function DocumentsAndFinancesContent() {
  const { profile } = useAuth();
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<CompletedJob[]>([]);
  const [viMap, setViMap] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<CompletedJob | null>(null);
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
          driver_payment_amount, driver_payment_status,
          base_price, driver_share_percentage,
          is_doc_finished, is_cost_finished, created_at, updated_at, assignment_documents
        `)
        .in('status', [
            'accepted', 'ORDER DITERIMA', 'DITERIMA',
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

        const [driversRes, fleetsRes, woItemsRes, costsRes, viRes] = await Promise.all([
          driverIds.length > 0 ? supabase.from('md_drivers').select('id, name').in('id', driverIds) : { data: [] },
          fleetIds.length > 0 ? supabase.from('md_fleets').select('id, plate_number, fleet_type_id, md_entities(name, is_vendor), md_fleet_types(type_name)').in('id', fleetIds) : { data: [] },
          woItemIds.length > 0 ? supabase.from('wo_items').select('id, wo_id, item_data, sbu_type').in('id', woItemIds) : { data: [] },
          supabase.from('extra_costs').select('id, jo_id, status').in('jo_id', jos.map(j => j.id)),
          supabase.from('vendor_invoices').select('id, invoice_number, status, jo_ids, invoice_amount')
        ]);

        const driversMap = Object.fromEntries((driversRes.data || []).map(d => [d.id, d]));
        const fleetsMap = Object.fromEntries((fleetsRes.data || []).map(f => [f.id, f]));
        const woItemsMap = Object.fromEntries((woItemsRes.data || []).map(i => [i.id, i]));
        const costsData = costsRes.data || [];
        const viData = viRes.data || [];

        // Build vendor invoice map: jo_id → vendor invoice
        const invoiceByJoId: Record<string, any> = {};
        for (const vi of viData) {
          const joIdList: string[] = vi.jo_ids || [];
          for (const joId of joIdList) {
            if (!invoiceByJoId[joId]) invoiceByJoId[joId] = vi;
          }
        }
        setViMap(invoiceByJoId);

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

        // Only show TRUCKING jobs on this trucking page (warehouse JOs have no trucking fleet/driver)
        const truckingOnly = hydrated.filter(j => j.wo_items?.sbu_type === 'TRUCKING');

        // DEDUPLICATION: Ensure unique JO IDs
        const uniqueHydrated = Array.from(new Map(truckingOnly.map(item => [item.id, item])).values());
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
      setSelectedJob(null);
    } catch (err: any) {
      toast.error('Gagal update status: ' + err.message);
    }
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
    accepted: searchedJobs.filter(j => ['ACCEPTED', 'ORDER DITERIMA', 'DITERIMA'].includes(j.status?.toUpperCase())).length,
    onRoad: searchedJobs.filter(j => ['ASSIGNED', 'MENUNGGU BERANGKAT', 'PICKING_UP', 'DELIVERING', 'IN_PROGRESS', 'DALAM PERJALANAN', 'START JOURNEY'].includes(j.status?.toUpperCase())).length,
    jobDone: searchedJobs.filter(j => ['COMPLETED', 'DONE', 'PEKERJAAN SELESAI', 'AWAITING_AUDIT'].includes(j.status?.toUpperCase()) && !j.is_doc_finished).length,
    readyForBilling: searchedJobs.filter(j => j.is_doc_finished || ['READY_FOR_BILLING', 'VERIFIED'].includes(j.status?.toUpperCase())).length
  }), [searchedJobs]);

  const filteredJobs = useMemo(() => {
    return searchedJobs.filter(j => {
        const s = j.status?.toUpperCase() || '';
        // CRITICAL: Always hide if already invoiced or paid
        if (['INVOICED', 'PAID'].includes(s)) return false;

        if (activeFilter === 'all') return true;
        if (activeFilter === 'accepted') return s === 'ACCEPTED' || s === 'ORDER DITERIMA' || s === 'DITERIMA';
        if (activeFilter === 'on-road') return ['ASSIGNED', 'MENUNGGU BERANGKAT', 'PICKING_UP', 'DELIVERING', 'IN_PROGRESS', 'DALAM PERJALANAN', 'START JOURNEY'].includes(s);
        if (activeFilter === 'done') return ['COMPLETED', 'DONE', 'PEKERJAAN SELESAI', 'AWAITING_AUDIT'].includes(s) && !j.is_doc_finished;
        if (activeFilter === 'billing') return j.is_doc_finished || ['READY_FOR_BILLING', 'VERIFIED'].includes(s);
        return true;
    });
  }, [searchedJobs, activeFilter]);

  if (loading && jobs.length === 0) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-gray-900 animate-spin mb-4" />
        <p className="text-gray-900 font-bold text-xs uppercase">Syncing Operational Ledger...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white px-6 py-10">
      <Toaster position="top-right" />
      
      {/* Header */}
      <div className="max-w-[1600px] mx-auto mb-12">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gray-900 text-white flex items-center justify-center">
              <Receipt size={28} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wider">Settlement & Documentation</p>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900">Documents & Finances</h1>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
              <input 
                type="text" 
                placeholder="Search by JO Number..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-11 pl-11 pr-4 bg-white border border-gray-200 text-sm text-gray-900 placeholder-gray-500 outline-none focus:border-gray-400 transition-colors"
              />
            </div>
            <Button 
                onClick={fetchCompletedJobs}
                className="h-11 px-5 bg-gray-900 hover:bg-gray-800 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-colors"
            >
                <Activity size={16} /> Refresh
            </Button>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="mt-8 flex items-center gap-2">
          {[
            { id: 'all', label: 'All', count: stats.total },
            { id: 'accepted', label: 'Accepted', count: stats.accepted },
            { id: 'on-road', label: 'On Road', count: stats.onRoad },
            { id: 'done', label: 'Done', count: stats.jobDone },
            { id: 'billing', label: 'Ready', count: stats.readyForBilling }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${
                activeFilter === tab.id 
                  ? 'bg-gray-900 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 text-[10px] font-bold ${
                activeFilter === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Compact Card Grid */}
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
        {filteredJobs.length === 0 ? (
          <div className="col-span-full py-24 text-center">
            <div className="w-16 h-16 bg-gray-100 flex items-center justify-center mx-auto mb-6">
                <AlertCircle size={32} className="text-gray-400" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">No Records Found</h3>
            <p className="text-sm text-gray-600 mt-1">Your current filter contains no matching records.</p>
          </div>
        ) : (
          filteredJobs.map((job) => (
            <div
              key={job.id}
              className="border border-gray-200 bg-white hover:border-gray-400 cursor-pointer transition-colors"
              onClick={() => setSelectedJob(job)}
            >
              <div className="p-4">
                {/* Top: JO number + status */}
                <div className="flex items-start justify-between mb-3">
                  <p className="text-sm font-bold text-gray-900 leading-tight">{job.jo_number}</p>
                  <span className={`shrink-0 ml-2 px-2 py-0.5 text-[10px] font-bold uppercase ${
                    (() => {
                      const s = job.status?.toLowerCase() || '';
                      if (['accepted', 'order diterima', 'diterima'].includes(s)) return job.md_fleets?.md_entities?.is_vendor ? 'text-orange-700 bg-orange-50' : 'text-blue-700 bg-blue-50';
                      if (['in_progress', 'dalam perjalanan', 'start journey', 'picking_up', 'delivering', 'menunggu berangkat'].includes(s)) return 'text-blue-700 bg-blue-50';
                      if (['completed', 'done', 'pekerjaan selesai'].includes(s) && !job.is_doc_finished) return 'text-red-700 bg-red-50';
                      if (['awaiting_audit'].includes(s)) return 'text-amber-700 bg-amber-50';
                      if (job.is_doc_finished && !['ready_for_billing', 'verified', 'VERIFIED'].includes(s)) return 'text-indigo-700 bg-indigo-50';
                      if (['ready_for_billing', 'verified', 'VERIFIED'].includes(s)) return 'text-emerald-700 bg-emerald-50';
                      return 'text-gray-600 bg-gray-100';
                    })()
                  }`}>
                    {(s => {
                      if (['accepted', 'order diterima', 'diterima'].includes(s)) return 'Accepted';
                      if (['in_progress', 'dalam perjalanan', 'start journey', 'picking_up', 'delivering', 'menunggu berangkat'].includes(s)) return 'On Road';
                      if (['completed', 'done', 'pekerjaan selesai'].includes(s) && !job.is_doc_finished) return 'POD Needed';
                      if (['awaiting_audit'].includes(s)) return 'Audit';
                      if (job.is_doc_finished && !['ready_for_billing', 'verified', 'VERIFIED'].includes(s)) return 'Docs Ready';
                      if (['ready_for_billing', 'verified', 'VERIFIED'].includes(s)) return 'Billing';
                      return job.status;
                    })(job.status?.toLowerCase() || '')}
                  </span>
                </div>

                {/* Entity: Vendor name or Internal */}
                <div className="flex items-center gap-2 mb-3">
                  {job.md_fleets?.md_entities?.is_vendor ? (
                    <>
                      <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold uppercase text-orange-700 bg-orange-50">Vendor</span>
                      <p className="text-xs text-gray-900 font-semibold truncate">{job.md_fleets?.md_entities?.name || 'Vendor'}</p>
                    </>
                  ) : (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase text-blue-700 bg-blue-50">Internal</span>
                  )}
                </div>

                {/* Driver & Fleet */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                  <div>
                    <span className="text-gray-500">Driver</span>
                    <p className="font-semibold text-gray-900 truncate">{job.md_drivers?.name || '-'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500">Fleet</span>
                    <p className="font-semibold text-gray-900 truncate">{job.md_fleets?.plate_number || '-'}</p>
                  </div>
                </div>

                {/* Bottom: date + view */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock size={12} />
                    <span className="text-[11px]">{new Date(job.completed_at || job.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</span>
                  </div>
                  <span className="text-[11px] font-bold text-gray-900 uppercase flex items-center gap-1 group">
                    <Eye size={13} className="text-gray-500 group-hover:text-gray-900 transition-colors" />
                    Detail
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Modal */}
      {selectedJob && (
        <JobDetailModal
          job={selectedJob}
          viMap={viMap}
          onClose={() => setSelectedJob(null)}
          onFinalizeGate={handleFinalizeGate}
          onAddCost={(j) => setHybridFinanceJob(j)}
          onOpenFinanceHub={(j) => setHybridFinanceJob(j)}
          onUpdate={(updated) => setSelectedJob(updated)}
        />
      )}

      {hybridFinanceJob && (
         <SBUFinanceHybridModal 
            job={hybridFinanceJob} 
            onClose={() => setHybridFinanceJob(null)}
            onSuccess={() => {
               setHybridFinanceJob(null);
               fetchCompletedJobs();
               setSelectedJob(null);
            }}
         />
      )}
    </div>
  );
}

export default function DocumentsAndFinancesPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-gray-900 animate-spin mb-4" />
        <p className="text-gray-900 font-bold text-xs uppercase">Syncing Operational Ledger...</p>
      </div>
    }>
      <DocumentsAndFinancesContent />
    </Suspense>
  );
}
