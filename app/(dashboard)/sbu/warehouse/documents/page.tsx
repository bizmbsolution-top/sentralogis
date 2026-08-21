'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { 
  FileText, Search, Loader2, CheckCircle2, AlertCircle, 
  Truck, Calendar, MapPin, FileCheck, Database, Package,
  Warehouse, CloudDownload, X, Box, PackageOpen, Scissors, PackagePlus, PackageCheck, ArrowLeftRight
} from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast, Toaster } from 'react-hot-toast';
import { Card } from '@/components/ui/Card';

interface Document {
  id: string;
  type: 'INBOUND_RECEIPT' | 'OUTBOUND_SHIPMENT' | 'TRANSFER_ORDER' | 'INTERNAL_MOVEMENT' | 'REPACKING_ORDER';
  title: string;
  number: string;
  status: string;
  warehouse: { name: string };
  date: string;
  documents: { batb?: string; pod?: string; bast?: string; manifest?: string; };
  missingDocs: string[];
  icon: any;
  color: string;
}

export default function WarehouseDocumentsPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState('all');
  const [submitting, setSubmitting] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!profile?.tenant_id) { setLoading(false); return; }
    setLoading(true);
    try {
      let whId = profile.warehouse_id || null;
      if (!whId) {
        const { data: orgUser } = await supabase
          .from('wo_organization_users')
          .select('assigned_warehouse_id')
          .eq('user_id', profile.id)
          .maybeSingle();
        whId = orgUser?.assigned_warehouse_id || null;
      }

      const [inboundRes, outboundRes, transferRes, movementRes, repackingRes] = await Promise.all([
        supabase
          .from('wh_inbound_receipts')
          .select(`
            *, 
            warehouse:warehouse_id(name),
            transporter:transporter_id(name)
          `)
          .eq('tenant_id', profile.tenant_id)
          .eq('warehouse_id', whId || '00000000-0000-0000-0000-000000000000')
          .order('updated_at', { ascending: false }),
        
        supabase
          .from('wh_outbound_shipments')
          .select(`
            *, 
            warehouse:warehouse_id(name),
            transporter:transporter_id(name)
          `)
          .eq('tenant_id', profile.tenant_id)
          .eq('warehouse_id', whId || '00000000-0000-0000-0000-000000000000')
          .order('updated_at', { ascending: false }),
        
        (supabase
          .from('wh_transfer_orders' as any) as any)
          .select(`
            *, 
            from_warehouse:from_warehouse_id(name),
            to_warehouse:to_warehouse_id(name)
          `)
          .eq('tenant_id', profile.tenant_id)
          .order('updated_at', { ascending: false }),
        
        (supabase
          .from('wh_internal_movements' as any) as any)
          .select(`
            *, 
            warehouse:warehouse_id(name)
          `)
          .eq('tenant_id', profile.tenant_id)
          .eq('warehouse_id', whId || '00000000-0000-0000-0000-000000000000')
          .order('updated_at', { ascending: false }),
        
        (supabase
          .from('wh_repacking_orders' as any) as any)
          .select(`
            *, 
            warehouse:warehouse_id(name)
          `)
          .eq('tenant_id', profile.tenant_id)
          .eq('warehouse_id', whId || '00000000-0000-0000-0000-000000000000')
          .order('updated_at', { ascending: false }),
      ]);

      const allDocs: Document[] = [];

      if (inboundRes.data) {
        allDocs.push(...(inboundRes.data as any[]).map(r => ({
          id: r.id,
          type: 'INBOUND_RECEIPT' as const,
          title: 'Inbound Receipt',
          number: r.receipt_number,
          status: r.status,
          warehouse: r.warehouse,
          date: r.expected_arrival || r.created_at,
          documents: { batb: r.batb_document_url, pod: r.pod_document_url },
          missingDocs: [],
          icon: Truck,
          color: 'bg-blue-100 text-blue-700 border-blue-200'
        })));
      }

      if (outboundRes.data) {
        allDocs.push(...(outboundRes.data as any[]).map(s => ({
          id: s.id,
          type: 'OUTBOUND_SHIPMENT' as const,
          title: 'Outbound Shipment',
          number: s.shipment_number,
          status: s.status,
          warehouse: s.warehouse,
          date: s.dispatched_at || s.created_at,
          documents: { bast: s.bast_document_url, manifest: s.manifest_url },
          missingDocs: [],
          icon: PackageOpen,
          color: 'bg-orange-100 text-orange-700 border-orange-200'
        })));
      }

      if (transferRes.data) {
        allDocs.push(...(transferRes.data as any[]).map(t => ({
          id: t.id,
          type: 'TRANSFER_ORDER' as const,
          title: 'Transfer Order',
          number: t.transfer_number,
          status: t.status,
          warehouse: t.from_warehouse,
          date: t.created_at,
          documents: { manifest: t.manifest_url },
          missingDocs: [],
          icon: ArrowLeftRight,
          color: 'bg-purple-100 text-purple-700 border-purple-200'
        })));
      }

      if (movementRes.data) {
        allDocs.push(...(movementRes.data as any[]).map(m => ({
          id: m.id,
          type: 'INTERNAL_MOVEMENT' as const,
          title: 'Internal Movement',
          number: m.movement_number || `MOVE-${m.id.substring(0, 8)}`,
          status: m.status,
          warehouse: m.warehouse,
          date: m.movement_date || m.created_at,
          documents: { manifest: m.manifest_url },
          missingDocs: [],
          icon: MapPin,
          color: 'bg-green-100 text-green-700 border-green-200'
        })));
      }

      if (repackingRes.data) {
        allDocs.push(...(repackingRes.data as any[]).map(r => ({
          id: r.id,
          type: 'REPACKING_ORDER' as const,
          title: 'Repacking Order',
          number: r.order_number,
          status: r.status,
          warehouse: r.warehouse,
          date: r.created_at,
          documents: { manifest: r.manifest_url },
          missingDocs: [],
          icon: PackageCheck,
          color: 'bg-amber-100 text-amber-700 border-amber-200'
        })));
      }

      setDocuments(allDocs);
    } catch (err: any) {
      toast.error('Gagal mengambil data dokumen');
    } finally {
      setLoading(false);
    }
  }, [profile?.tenant_id, profile?.warehouse_id, profile?.id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    return documents.filter(doc => {
      const q = searchTerm.toLowerCase();
      const matchSearch = !q || 
        doc.number?.toLowerCase().includes(q) ||
        doc.warehouse?.name?.toLowerCase().includes(q) ||
        doc.title.toLowerCase().includes(q);
      if (!matchSearch) return false;

      if (activeFilter === 'missing_batb') return doc.type === 'INBOUND_RECEIPT' && !doc.documents.batb;
      if (activeFilter === 'missing_pod') return doc.type === 'INBOUND_RECEIPT' && !doc.documents.pod;
      if (activeFilter === 'missing_bast') return doc.type === 'OUTBOUND_SHIPMENT' && !doc.documents.bast;
      if (activeFilter === 'missing_manifest') return (doc.type === 'TRANSFER_ORDER' || doc.type === 'INTERNAL_MOVEMENT') && !doc.documents.manifest;
      if (activeFilter === 'complete') return doc.documents.batb && doc.documents.pod;
      return true;
    });
  }, [documents, searchTerm, activeFilter]);

  const stats = useMemo(() => ({
    total: documents.length,
    missingBatb: documents.filter(d => d.type === 'INBOUND_RECEIPT' && !d.documents.batb).length,
    missingPod: documents.filter(d => d.type === 'INBOUND_RECEIPT' && !d.documents.pod).length,
    missingBast: documents.filter(d => d.type === 'OUTBOUND_SHIPMENT' && !d.documents.bast).length,
    missingManifest: documents.filter(d => ['TRANSFER_ORDER', 'INTERNAL_MOVEMENT'].includes(d.type) && !d.documents.manifest).length,
    complete: documents.filter(d => 
      (d.type === 'INBOUND_RECEIPT' && d.documents.batb && d.documents.pod) ||
      (d.type === 'OUTBOUND_SHIPMENT' && d.documents.bast) ||
      (['TRANSFER_ORDER', 'INTERNAL_MOVEMENT', 'REPACKING_ORDER'].includes(d.type) && d.documents.manifest)
    ).length,
  }), [documents]);

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'INBOUND_RECEIPT': return 'Inbound';
      case 'OUTBOUND_SHIPMENT': return 'Outbound';
      case 'TRANSFER_ORDER': return 'Transfer';
      case 'INTERNAL_MOVEMENT': return 'Movement';
      case 'REPACKING_ORDER': return 'Repacking';
      default: return type;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'INBOUND_RECEIPT': return Truck;
      case 'OUTBOUND_SHIPMENT': return PackageOpen;
      case 'TRANSFER_ORDER': return ArrowLeftRight;
      case 'INTERNAL_MOVEMENT': return MapPin;
      case 'REPACKING_ORDER': return PackageCheck;
      default: return FileText;
    }
  };

  const handleDocumentUpload = async (docId: string, type: string, field: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setSubmitting(docId);
      try {
        const fileName = `${field}_${docId}_${Date.now()}.${file.name.split('.').pop()}`;
        const { error: uploadErr } = await supabase.storage
          .from('warehouse-docs')
          .upload(`documents/${fileName}`, file, { upsert: true });
        if (uploadErr) throw uploadErr;

        const { data: pub } = supabase.storage.from('warehouse-docs').getPublicUrl(`documents/${fileName}`);
        let updateQuery: any = {};
        if (type === 'INBOUND_RECEIPT') {
          updateQuery = { [field]: pub.publicUrl };
        } else if (type === 'OUTBOUND_SHIPMENT') {
          updateQuery = { [field]: pub.publicUrl };
        } else if (type === 'TRANSFER_ORDER' || type === 'INTERNAL_MOVEMENT' || type === 'REPACKING_ORDER') {
          updateQuery = { [field]: pub.publicUrl };
        }

        const table = type === 'INBOUND_RECEIPT' ? 'wh_inbound_receipts' :
          type === 'OUTBOUND_SHIPMENT' ? 'wh_outbound_shipments' :
          type === 'TRANSFER_ORDER' ? 'wh_transfer_orders' :
          type === 'INTERNAL_MOVEMENT' ? 'wh_internal_movements' : 'wh_repacking_orders';

        const { error: updErr } = await supabase
          .from(table)
          .update(updateQuery)
          .eq('id', docId);
        if (updErr) throw updErr;

        toast.success('Dokumen berhasil diupload!');
        fetchData();
      } catch (err: any) {
        toast.error('Gagal upload: ' + err.message);
      } finally {
        setSubmitting(null);
      }
    };
    input.click();
  };

  if (loading && documents.length === 0) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-slate-900 animate-spin mb-4" />
        <p className="text-slate-900 font-black tracking-widest text-[10px] uppercase">Loading Documents...
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 lg:p-6">
      <Toaster position="top-right" />
      
      <div className="max-w-[1600px] mx-auto mb-10">
        <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-6">
          <div className="flex items-center gap-6">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm border border-indigo-100">
              <FileText size={24} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <span className="w-6 h-[2px] bg-indigo-500 rounded-full"></span>
                <p className="text-[9px] font-black text-indigo-500 uppercase tracking-[0.3em]">Warehouse Document Center
                </p>
              </div>
              <h1 className="text-2xl font-black text-indigo-950 italic uppercase tracking-tighter leading-none">Warehouse Operations Documents
              </h1>
            </div>
          </div>

          <div className="relative group w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
            <input 
              type="text" 
              placeholder="Cari nomor dokumen, gudang..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-white border border-indigo-100 rounded-2xl text-[11px] font-black focus:border-indigo-500/30 focus:ring-4 focus:ring-indigo-500/5 transition-all outline-none shadow-sm text-indigo-900"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-8">
          <Card className="p-4 border border-slate-100 shadow-sm rounded-2xl bg-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-slate-50 text-slate-600 rounded-lg flex items-center justify-center">
                <FileText size={20} />
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total Documents</p>
                <p className="text-lg font-black text-slate-900">{stats.total}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border border-slate-100 shadow-sm rounded-2xl bg-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center">
                <Truck size={20} />
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Missing BATB</p>
                <p className="text-lg font-black text-slate-900">{stats.missingBatb}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border border-slate-100 shadow-sm rounded-2xl bg-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-orange-50 text-orange-600 rounded-lg flex items-center justify-center">
                <PackageOpen size={20} />
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Missing BAST</p>
                <p className="text-lg font-black text-slate-900">{stats.missingBast}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border border-slate-100 shadow-sm rounded-2xl bg-white">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center">
                <ArrowLeftRight size={20} />
              </div>
              <div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Missing Manifest</p>
                <p className="text-lg font-black text-slate-900">{stats.missingManifest}</p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border border-emerald-100 shadow-sm rounded-2xl bg-emerald-50">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-100 text-emerald-700 rounded-lg flex items-center justify-center">
                <Database size={20} />
              </div>
              <div>
                <p className="text-[8px] font-black text-emerald-600 uppercase tracking-widest">Completed</p>
                <p className="text-lg font-black text-emerald-900">{stats.complete}</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Filter Tabs */}
        <div className="mt-8 flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100 w-fit">
          {[
            { id: 'all', label: 'All Documents', count: stats.total },
            { id: 'missing_batb', label: 'Missing BATB', count: stats.missingBatb },
            { id: 'missing_pod', label: 'Missing POD', count: stats.missingPod },
            { id: 'missing_bast', label: 'Missing BAST', count: stats.missingBast },
            { id: 'missing_manifest', label: 'Missing Manifest', count: stats.missingManifest },
            { id: 'complete', label: 'Complete', count: stats.complete },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`h-10 px-5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                activeFilter === tab.id 
                  ? 'bg-indigo-100 text-indigo-900 border border-indigo-200 shadow-sm' 
                  : 'text-slate-400 hover:bg-slate-50 hover:text-slate-600'
              }`}
            >
              {tab.label}
              <span className={`px-2 py-0.5 rounded-md text-[8px] ${activeFilter === tab.id ? 'bg-indigo-200 text-indigo-900' : 'bg-slate-100 text-slate-500'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Document Cards */}
      <div className="max-w-[1600px] mx-auto grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {filtered.length === 0 ? (
          <div className="col-span-full p-32 text-center bg-white rounded-[3.5rem] shadow-sm border border-slate-100">
            <FileText size={48} className="mx-auto text-slate-200 mb-4" />
            <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter italic">No Documents</h3>
            <p className="text-slate-400 font-bold mt-2 uppercase tracking-widest text-[10px]">No matching documents found.</p>
          </div>
        ) : (
          filtered.map(doc => {
            const Icon = getTypeIcon(doc.type);
            return (
              <Card key={doc.id} className="group border border-slate-100 shadow-sm hover:shadow-md transition-all rounded-3xl bg-white">
                <div className="p-6 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] rotate-12">
                    <FileText size={120} className="text-slate-900" />
                  </div>

                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center shadow-sm">
                      <Icon size={20} />
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest border ${doc.color}`}>{getTypeLabel(doc.type)}
                    </span>
                  </div>

                  <div className="space-y-2 mb-4 relative z-10">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[8px] font-black uppercase tracking-widest">
                        {doc.number}
                      </span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                        doc.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {doc.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">
                      {doc.title}
                    </h3>
                  </div>

                  <div className="bg-slate-50/50 p-4 rounded-2xl border border-slate-100 mb-4 relative z-10">
                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600 mb-1.5">
                      <Warehouse size={12} /> {doc.warehouse?.name || 'Unknown'}
                    </div>
                    {doc.date && (
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-600">
                        <Calendar size={12} /> {new Date(doc.date).toLocaleDateString('id-ID')}
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 relative z-10">
                    {doc.type === 'INBOUND_RECEIPT' && (
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">BATB</span>
                        {doc.documents.batb ? (
                          <a href={doc.documents.batb} target="_blank" className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-1">
                            <FileCheck size={12} /> Lihat
                          </a>
                        ) : (
                          <button
                            onClick={() => handleDocumentUpload(doc.id, doc.type, 'batb_document_url')}
                            disabled={submitting === doc.id}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          >
                            {submitting === doc.id ? <Loader2 size={12} className="animate-spin" /> : <CloudDownload size={12} />}
                            Upload
                          </button>
                        )}
                      </div>
                    )}

                    {doc.type === 'INBOUND_RECEIPT' && (
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">POD</span>
                        {doc.documents.pod ? (
                          <a href={doc.documents.pod} target="_blank" className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-1">
                            <FileCheck size={12} /> Lihat
                          </a>
                        ) : (
                          <button
                            onClick={() => handleDocumentUpload(doc.id, doc.type, 'pod_document_url')}
                            disabled={submitting === doc.id}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          >
                            {submitting === doc.id ? <Loader2 size={12} className="animate-spin" /> : <CloudDownload size={12} />}
                            Upload
                          </button>
                        )}
                      </div>
                    )}

                    {doc.type === 'OUTBOUND_SHIPMENT' && (
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">BAST</span>
                        {doc.documents.bast ? (
                          <a href={doc.documents.bast} target="_blank" className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-1">
                            <FileCheck size={12} /> Lihat
                          </a>
                        ) : (
                          <button
                            onClick={() => handleDocumentUpload(doc.id, doc.type, 'bast_document_url')}
                            disabled={submitting === doc.id}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          >
                            {submitting === doc.id ? <Loader2 size={12} className="animate-spin" /> : <CloudDownload size={12} />}
                            Upload
                          </button>
                        )}
                      </div>
                    )}

                    {['TRANSFER_ORDER', 'INTERNAL_MOVEMENT', 'REPACKING_ORDER'].includes(doc.type) && (
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Manifest</span>
                        {doc.documents.manifest ? (
                          <a href={doc.documents.manifest} target="_blank" className="text-[10px] font-bold text-emerald-600 hover:underline flex items-center gap-1">
                            <FileCheck size={12} /> Lihat
                          </a>
                        ) : (
                          <button
                            onClick={() => handleDocumentUpload(doc.id, doc.type, 'manifest_url')}
                            disabled={submitting === doc.id}
                            className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
                          >
                            {submitting === doc.id ? <Loader2 size={12} className="animate-spin" /> : <CloudDownload size={12} />}
                            Upload
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}