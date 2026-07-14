'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  DollarSign, 
  Calendar, 
  User,
  MessageSquare,
  AlertCircle
} from 'lucide-react';

export default function SbuApprovalsPage({ params }: { params: Promise<{ type: string }> }) {
  const resolvedParams = React.use(params);
  const type = resolvedParams.type;
  const sbuType = type.toUpperCase(); // WAREHOUSE, TRUCKING, CLEARANCE, FORWARDING
  
  const { user, profile } = useAuth();
  
  const [filter, setFilter] = useState<'PENDING' | 'NEGOTIATION' | 'APPROVED' | 'REJECTED'>('PENDING');
  const [sections, setSections] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);
  
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    if (user && sbuType) {
      fetchData();
    }
  }, [user, sbuType, filter]);

  async function fetchData() {
    setLoading(true);
    try {
      // 1. Fetch sections requiring review
      const { data: sectionsData, error: secError } = await supabase
        .from('crm_quotation_sections')
        .select(`
          *,
          crm_quotations (
            id,
            quote_number,
            status,
            onetime_total,
            recurring_total,
            total_amount,
            created_at,
            crm_deals (
              title,
              md_entities (
                name
              )
            )
          )
        `)
        .eq('sbu_type', sbuType)
        .eq('approval_status', filter)
        .order('created_at', { ascending: false });

      if (secError) throw secError;
      
      const currentSections = sectionsData || [];
      setSections(currentSections);

      // 2. Fetch items for these sections in bulk
      if (currentSections.length > 0) {
        const quoteIds = currentSections.map(s => s.quotation_id);
        const { data: itemsData, error: itemsError } = await supabase
          .from('crm_quotation_items')
          .select('*')
          .in('quotation_id', quoteIds)
          .eq('sbu_cluster', sbuType);

        if (itemsError) throw itemsError;
        setItems(itemsData || []);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.warn('Error fetching approval data:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleApprove = async (sectionId: string, approve: boolean, reason?: string) => {
    setActioningId(sectionId);
    try {
      const { error } = await supabase
        .from('crm_quotation_sections')
        .update({
          approval_status: approve ? 'APPROVED' : 'REJECTED',
          approved_by: user?.id,
          approved_at: approve ? new Date().toISOString() : null,
          rejection_reason: approve ? null : reason
        })
        .eq('id', sectionId);

      if (error) throw error;
      fetchData();
    } catch (err: any) {
      alert("Gagal melakukan aksi: " + err.message);
    } finally {
      setActioningId(null);
    }
  };

  const handleRejectPrompt = (sectionId: string) => {
    const reason = prompt("Masukkan alasan penolakan:");
    if (reason === null) return;
    if (!reason.trim()) {
      alert("Alasan penolakan wajib diisi.");
      return;
    }
    handleApprove(sectionId, false, reason);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(val || 0);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight capitalize">{type} Approvals</h1>
        <p className="text-slate-500 text-xs mt-1">Review dan berikan persetujuan (approval) tarif quotation sebelum dikirim ke pelanggan.</p>
      </div>

      {/* Filter Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        {['PENDING', 'NEGOTIATION', 'APPROVED', 'REJECTED'].map((f) => (
          <button
            key={f}
            onClick={() => {
              setFilter(f as any);
              setExpandedSectionId(null);
            }}
            className={`px-6 py-2 rounded-lg text-xs font-bold transition-all ${
              filter === f
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
            }`}
          >
            {f === 'PENDING' ? 'New Requests' : f === 'NEGOTIATION' ? 'Nego Requests' : f}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 text-sm">Memuat data approval...</div>
      ) : sections.length === 0 ? (
        <div className="py-12 bg-white rounded-2xl border border-dashed border-slate-300 text-center p-6 shadow-sm">
          <Clock className="w-8 h-8 text-slate-300 mx-auto mb-3" />
          <h3 className="font-bold text-slate-700 text-sm">Tidak Ada Data</h3>
          <p className="text-slate-400 text-xs mt-1">Tidak ada quotation yang berada dalam status {filter} untuk layanan {sbuType} saat ini.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map(sec => {
            const isExpanded = expandedSectionId === sec.id;
            const quote = sec.crm_quotations;
            if (!quote) return null;
            
            const customerName = quote.crm_deals?.md_entities?.name || (Array.isArray(quote.crm_deals?.md_entities) ? quote.crm_deals?.md_entities[0]?.name : '-');
            const dealTitle = quote.crm_deals?.title || '-';
            const secItems = items.filter(item => item.section_id === sec.id || (!item.section_id && item.quotation_id === quote.id));

            return (
              <div key={sec.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden hover:border-slate-300 transition-all">
                {/* Summary Row */}
                <div 
                  onClick={() => setExpandedSectionId(isExpanded ? null : sec.id)}
                  className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                        {quote.quote_number}
                      </span>
                      <h4 className="font-bold text-slate-800 text-sm">{customerName}</h4>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">{dealTitle}</p>
                    <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5" /> {formatDate(quote.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5" /> {secItems.length} Items
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Subtotal SBU</span>
                      <span className="text-sm font-black text-indigo-700">{formatCurrency(sec.subtotal)}</span>
                    </div>
                    <div className="text-slate-400">
                      {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="border-t border-slate-100 bg-slate-50/30 p-5 space-y-4">
                    {/* Items List */}
                    <div>
                      <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Rincian Layanan</h5>
                      <div className="space-y-2">
                        {secItems.map((item, idx) => (
                          <div key={item.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs font-bold text-slate-800">{idx + 1}. {item.description}</p>
                                <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-1">
                                  <span className="bg-slate-100 px-1.5 py-0.5 rounded font-bold">{item.qty} {item.uom}</span>
                                  <span>x</span>
                                  <span>{formatCurrency(item.unit_price)}</span>
                                </div>
                                {item.nego_price !== null && item.nego_price !== undefined && Number(item.nego_price) !== Number(item.unit_price) && (
                                  <div className="mt-1 flex items-center gap-1.5 text-[10px]">
                                    <span className="font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                                      Harga Nego: {formatCurrency(item.nego_price)}
                                    </span>
                                    <span className="text-slate-400 line-through">
                                      {formatCurrency(item.unit_price)}
                                    </span>
                                  </div>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-bold text-indigo-600 font-mono">{formatCurrency(item.total_price)}</p>
                                {item.tax_percent > 0 && <p className="text-[9px] text-slate-400 mt-0.5">+ {item.tax_percent}% PPN</p>}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* SBU Notes */}
                    {sec.sbu_notes && (
                      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Ketentuan Khusus ({sbuType})</h5>
                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">{sec.sbu_notes}</p>
                      </div>
                    )}

                    {/* Rejection / Reviewer Info */}
                    {filter === 'REJECTED' && sec.rejection_reason && (
                      <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-100 text-rose-800 flex gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <h5 className="text-xs font-bold text-rose-800">Alasan Penolakan</h5>
                          <p className="text-xs italic text-rose-700 mt-1">"{sec.rejection_reason}"</p>
                        </div>
                      </div>
                    )}

                    {/* Approval Action Buttons */}
                    {(filter === 'PENDING' || filter === 'NEGOTIATION') && (
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleApprove(sec.id, true)}
                          disabled={actioningId === sec.id}
                          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Approve {filter === 'NEGOTIATION' && 'Nego'}
                        </button>
                        <button 
                          onClick={() => handleRejectPrompt(sec.id)}
                          disabled={actioningId === sec.id}
                          className="px-4 py-2 bg-rose-600 text-white rounded-lg text-xs font-bold hover:bg-rose-700 transition-colors flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <XCircle className="w-3.5 h-3.5" /> Reject
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
