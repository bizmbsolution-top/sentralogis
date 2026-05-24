'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  FileText, Search, Loader2, Files, ShieldCheck, 
  Download, ArrowRight, CheckCircle2, AlertCircle, 
  Clock, Truck, User, Calendar, MapPin, ExternalLink,
  Layers, Box, Archive, Activity, FileCheck, Database
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast, Toaster } from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import PhysicalDocModal from '../components/PhysicalDocModal';

export default function SBUDocumentsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [jobOrders, setJobOrders] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState('all');
  const [selectedJo, setSelectedJo] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);

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
        console.error('Failed to resolve fallback tenant ID for SBU documents:', e);
      }
    }

    if (!tenantId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('job_orders')
        .select(`
          *,
          wo_item:wo_items (
            id,
            wo:work_orders (
              id, wo_number, customer:md_entities!customer_id(name)
            )
          )
        `)
        .eq('tenant_id', tenantId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setJobOrders(data || []);
    } catch (err: any) {
      console.error('Fetch Error:', err);
      toast.error('Gagal mengambil data dokumen');
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id, profile?.role]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredJobs = useMemo(() => {
    return jobOrders.filter(jo => {
      const matchesSearch = 
        jo.jo_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        jo.wo_item?.wo?.wo_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        jo.wo_item?.wo?.customer?.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesFilter = true;
      if (activeFilter === 'pending') matchesFilter = jo.pod_status !== 'received_hq';
      else if (activeFilter === 'completed') matchesFilter = jo.pod_status === 'received_hq';

      return matchesSearch && matchesFilter;
    });
  }, [jobOrders, searchTerm, activeFilter]);

  const getStatusBadge = (status: string) => {
    const s = status?.toUpperCase().replace(/_/g, ' ') || 'PENDING POD';
    if (status === 'received_hq') return <Badge className="bg-slate-900 text-white border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">RECEIVED HQ</Badge>;
    if (status === 'sent_to_hq') return <Badge className="bg-blue-100 text-blue-600 border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic animate-pulse">IN TRANSIT</Badge>;
    return <Badge className="bg-amber-100 text-amber-600 border-none font-black text-[9px] px-3 py-1 uppercase tracking-widest italic">PENDING POD</Badge>;
  };

  const stats = useMemo(() => ({
    total: jobOrders.length,
    pending: jobOrders.filter(j => j.pod_status !== 'received_hq').length,
    completed: jobOrders.filter(j => j.pod_status === 'received_hq').length,
    transit: jobOrders.filter(j => j.pod_status === 'sent_to_hq').length
  }), [jobOrders]);

  if (loading && jobOrders.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-slate-900 animate-spin mb-4" />
        <p className="text-slate-900 font-black tracking-widest text-[10px] uppercase">Syncing Document Vault...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-6">
      <Toaster position="top-right" />
      
      {/* Header Section */}
      <div className="max-w-[1600px] mx-auto mb-10">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shadow-sm rotate-3 hover:rotate-0 transition-transform duration-500 border border-amber-100">
              <Archive size={24} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="w-6 h-[2px] bg-amber-500 rounded-full"></span>
                <p className="text-[9px] font-black text-amber-500 uppercase tracking-[0.3em]">Proof of Delivery Archive</p>
              </div>
              <h1 className="text-2xl font-black text-indigo-950 italic uppercase tracking-tighter leading-none">POD Manifest</h1>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="relative group w-full md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={16} />
              <input 
                type="text" 
                placeholder="Search JO, WO, or Customer..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-12 pl-12 pr-4 bg-white border border-amber-100 rounded-2xl text-[11px] font-black focus:border-amber-500/30 focus:ring-4 focus:ring-amber-500/5 transition-all outline-none shadow-sm text-indigo-900"
              />
            </div>
          </div>
        </div>

        {/* Manifest Statistics Header */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
           <Card className="p-6 border border-slate-100 shadow-sm rounded-3xl bg-white group hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4 mb-3">
                 <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center group-hover:bg-amber-100 transition-all duration-300">
                    <Activity size={24} />
                 </div>
                 <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Pending Documents</p>
                    <p className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">{stats.pending} Units</p>
                 </div>
              </div>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Active missions awaiting physical POD submission</p>
           </Card>

           <Card className="p-6 border border-slate-100 shadow-sm rounded-3xl bg-white group hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4 mb-3">
                 <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center group-hover:bg-blue-100 transition-all duration-300">
                    <Truck size={24} />
                 </div>
                 <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">In Transit to HQ</p>
                    <p className="text-xl font-black text-slate-900 italic uppercase tracking-tighter">{stats.transit} Units</p>
                 </div>
              </div>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-tight">Documents currently dispatched to central archive</p>
           </Card>

           <Card className="p-6 border border-amber-100 shadow-sm rounded-3xl bg-amber-50 group hover:shadow-md transition-all duration-300">
              <div className="flex items-center gap-4 mb-3">
                 <div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-xl flex items-center justify-center group-hover:bg-amber-200 transition-all duration-300">
                    <Database size={24} />
                 </div>
                 <div>
                    <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest italic">Total Archived</p>
                    <p className="text-xl font-black text-amber-900 italic uppercase tracking-tighter">{stats.completed} Units</p>
                 </div>
              </div>
              <p className="text-[8px] font-bold text-amber-600 uppercase tracking-tight">Total documents successfully verified in HQ vault</p>
           </Card>
        </div>

        {/* Filter Tabs */}
        <div className="mt-8 flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-fit">
          {[
            { id: 'all', label: 'All Documents', count: stats.total },
            { id: 'pending', label: 'Pending POD', count: stats.pending },
            { id: 'completed', label: 'Archived HQ', count: stats.completed }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`h-10 px-5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                activeFilter === tab.id 
                  ? 'bg-amber-100 text-amber-900 border border-amber-200 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 rounded-md text-[8px] ${activeFilter === tab.id ? 'bg-amber-200 text-amber-900' : 'bg-slate-100 text-slate-500'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filteredJobs.length === 0 ? (
          <div className="col-span-full p-32 text-center bg-white rounded-[3.5rem] shadow-sm border border-slate-100">
            <div className="w-24 h-24 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-8">
                <AlertCircle size={48} className="text-slate-200" />
            </div>
            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">No Manifest Records</h3>
            <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-[10px]">Your current archive filter contains no matching documents.</p>
          </div>
        ) : (
          filteredJobs.map((jo) => (
            <Card key={jo.id} className="group border border-slate-100 shadow-sm hover:shadow-md transition-all duration-300 rounded-3xl bg-white">
               <div className="p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12 group-hover:rotate-0 transition-transform duration-700">
                     <FileText size={120} className="text-slate-900" />
                  </div>

                  <div className="flex items-center justify-between mb-6 relative z-10">
                     <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center shadow-sm rotate-3 group-hover:rotate-0 transition-transform duration-300">
                        <FileCheck size={20} />
                     </div>
                     {getStatusBadge(jo.pod_status)}
                  </div>

                  <div className="space-y-3 mb-6 relative z-10">
                     <div className="flex flex-wrap items-center gap-2">
                        <span className="px-3 py-1 bg-slate-100 text-slate-500 rounded-lg text-[8px] font-black uppercase tracking-widest">
                           {jo.jo_number}
                        </span>
                        <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest italic">
                           {jo.wo_item?.wo?.wo_number}
                        </span>
                     </div>
                     <h3 className="text-lg font-black text-slate-900 italic uppercase tracking-tighter leading-none group-hover:text-blue-600 transition-colors">
                        {jo.wo_item?.wo?.customer?.legal_name || jo.wo_item?.wo?.customer?.name || 'Private Logistics'}
                     </h3>
                  </div>

                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100/50 group hover:bg-white hover:border-orange-500/20 hover:shadow-lg transition-all duration-300 mb-6 relative z-10">
                     <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Scope</p>
                     <p className="text-xs font-black text-slate-900 uppercase tracking-tight truncate group-hover:whitespace-normal group-hover:overflow-visible transition-all">
                        {jo.wo_item?.item_data?.origin_name || jo.wo_item?.item_data?.shipper_name || jo.wo_item?.item_data?.shipper_city || 'Origin'} → {jo.wo_item?.item_data?.destination_name || jo.wo_item?.item_data?.recipient_name || jo.wo_item?.item_data?.recipient_city || 'Dest'}
                     </p>
                     <div className="flex flex-col gap-1 mt-1 opacity-0 h-0 group-hover:opacity-100 group-hover:h-auto transition-all duration-300">
                        <p className="text-[9px] text-slate-500 font-medium">
                           <span className="font-bold text-slate-700">Origin:</span> {jo.wo_item?.item_data?.shipper_name || 'N/A'} - {jo.wo_item?.item_data?.shipper_address || 'No Address'}
                        </p>
                        <p className="text-[9px] text-slate-500 font-medium">
                           <span className="font-bold text-slate-700">Dest:</span> {jo.wo_item?.item_data?.recipient_name || 'N/A'} - {jo.wo_item?.item_data?.recipient_address || 'No Address'}
                        </p>
                     </div>
                     <div className="flex items-center gap-1.5 mt-1.5">
                        <Activity size={10} className={jo.wo_item?.item_data?.locations?.length > 2 ? 'text-orange-500' : 'text-emerald-500'} />
                        <p className={`text-[9px] font-bold uppercase italic ${jo.wo_item?.item_data?.locations?.length > 2 ? 'text-orange-500' : 'text-emerald-500'}`}>
                          {jo.wo_item?.item_data?.locations?.length > 2 ? `${jo.wo_item.item_data.locations.length} Stops (Multi-Stop)` : 'Direct Delivery'}
                        </p>
                     </div>
                     {jo.wo_item?.item_data?.locations && jo.wo_item.item_data.locations.length > 0 && (
                       <p className="text-[8px] text-slate-400 truncate mt-1">
                         {jo.wo_item.item_data.locations.map((loc: any) => loc.city || loc.name).join(' → ')}
                       </p>
                     )}
                  </div>
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 group-hover:bg-white group-hover:border-amber-500/20 transition-all duration-300 mb-6 relative z-10">
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Submission Status</p>
                    <div className="flex items-center gap-2">
                       <ShieldCheck size={12} className="text-amber-500" />
                       <p className="text-[10px] font-black text-slate-700 uppercase italic">
                          {jo.pod_status?.toUpperCase().replace(/_/g, ' ') || 'PENDING MISSION'}
                       </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 relative z-10">
                     <Button 
                        onClick={() => { setSelectedJo(jo); setShowModal(true); }}
                        className="flex-1 h-12 bg-slate-900 hover:bg-indigo-900/40 text-white border border-slate-700 hover:border-indigo-500/50 rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-slate-900/20"
                     >
                        Update Manifest <ArrowRight size={14} />
                     </Button>
                     {jo.driver_link_token && (
                        <a 
                          href={`/tracking/${jo.driver_link_token}`} 
                          target="_blank"
                          className="w-12 h-12 bg-slate-900 hover:bg-amber-900/40 text-white border border-slate-700 hover:border-amber-500/50 rounded-xl flex items-center justify-center transition-all duration-300 shadow-lg shadow-slate-900/20 active:scale-90"
                        >
                          <ExternalLink size={16} />
                        </a>
                     )}
                  </div>
               </div>
            </Card>
          ))
        )}
      </div>

      {showModal && (
      <PhysicalDocModal
          show={showModal}
          jo={selectedJo}
          onClose={() => setShowModal(false)}
          onVerify={async (data) => {
            try {
              await supabase.from('job_orders').update({
                pod_status: 'received_hq',
                physical_doc_files: data.files,
                physical_doc_notes: data.notes,
                updated_at: new Date().toISOString()
              }).eq('id', selectedJo.id);
              toast.success("Dokumen berhasil diverifikasi!");
              setShowModal(false);
              fetchData();
            } catch (err) {
              toast.error("Gagal verifikasi dokumen");
            }
          }}
        />
      )}
    </div>
  );
}
