'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { ChevronLeft, Building, Target, Banknote, Calendar, FileText, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function MobileDealDetail({ params }: { params: Promise<{ id: string }> }) {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [id, setId] = useState<string | null>(null);
  const [deal, setDeal] = useState<any>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingQuote, setCreatingQuote] = useState(false);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);


  useEffect(() => {
    if (user && id) {
      fetchDealAndQuotations();
    }
  }, [user, id]);

  async function fetchDealAndQuotations() {
    setLoading(true);
    try {
      const { data: dealData } = await supabase
        .from('crm_deals')
        .select(`*, md_entities(name)`)
        .eq('id', id)
        .single();
      
      if (dealData) {
        setDeal(dealData);
        const { data: quotesData } = await supabase
          .from('crm_quotations')
          .select('*')
          .eq('deal_id', id)
          .order('created_at', { ascending: false });
        setQuotations(quotesData || []);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  }

  const handleCreateQuotation = async () => {
    if (!deal) return;
    setCreatingQuote(true);
    try {
      // Auto-generate quote number e.g. QT-2026-06-XXXX
      const quoteNumber = `QT-${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2, '0')}-${Math.floor(Math.random()*10000).toString().padStart(4, '0')}`;
      
      const { data, error } = await supabase.from('crm_quotations').insert([{
        tenant_id: profile?.tenant_id,
        deal_id: deal.id,
        quote_number: quoteNumber,
        status: 'DRAFT',
        created_by: user?.id
      }]).select('id').single();

      if (error) throw error;
      
      // Navigate to the Quotation Builder
      router.push(`/portal/sales/quotations/${data.id}`);
    } catch (err: any) {
      alert('Failed to create quotation: ' + err.message);
      setCreatingQuote(false);
    }
  };

  if (loading) {
    return <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center text-slate-400 text-sm">Loading Deal...</div>;
  }

  if (!deal) {
    return <div className="min-h-[100dvh] bg-slate-50 flex items-center justify-center text-slate-400 text-sm">Deal not found</div>;
  }

  const entityName = Array.isArray(deal.md_entities) ? deal.md_entities[0]?.name : (deal.md_entities as any)?.name;
  const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

  return (
    <div className="flex flex-col min-h-full bg-slate-50 relative pb-24">
      {/* Header */}
      <div className="bg-amber-500 px-4 py-4 flex items-center gap-3 sticky top-0 z-20 text-white shadow-md">
        <button onClick={() => router.push('/portal/sales/deals')} className="p-2 -ml-2 rounded-full active:bg-amber-600">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-sm truncate">Deal Details</h2>
          <p className="text-[10px] text-amber-100">{entityName}</p>
        </div>
      </div>

      {/* Deal Info Card */}
      <div className="bg-white p-6 border-b border-slate-200">
        <h1 className="text-xl font-bold text-slate-800 mb-4">{deal.title}</h1>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <Target className="w-3.5 h-3.5" /> Stage
            </div>
            <p className="font-bold text-sm text-amber-700">{deal.stage}</p>
          </div>
          
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1">
              <Banknote className="w-3.5 h-3.5" /> Revenue
            </div>
            <p className="font-bold text-sm text-slate-800">{formatCurrency(deal.expected_revenue)}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {deal.sbu_target && (
            <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-md border border-indigo-100">
              SBU: {deal.sbu_target}
            </span>
          )}
        </div>
      </div>

      {/* Quotations List */}
      <div className="p-4 mt-2">
        <div className="flex justify-between items-center mb-4 px-2">
          <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" /> Quotations
          </h3>
          <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
            {quotations.length}
          </span>
        </div>

        <div className="space-y-3">
          {quotations.length === 0 ? (
            <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-300">
              <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-bold text-slate-500">No quotations yet</p>
            </div>
          ) : (
            quotations.map(quote => (
              <Link href={`/portal/sales/quotations/${quote.id}`} key={quote.id} className="block bg-white p-4 rounded-2xl border border-slate-200 shadow-sm active:scale-[0.98] transition-transform">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-slate-800 text-sm">{quote.quote_number}</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">Created: {new Date(quote.created_at).toLocaleDateString('id-ID')}</p>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-md ${
                    quote.status === 'DRAFT' ? 'bg-slate-100 text-slate-600' :
                    quote.status === 'SENT' ? 'bg-blue-100 text-blue-700' :
                    quote.status === 'ACCEPTED' ? 'bg-emerald-100 text-emerald-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {quote.status}
                  </span>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                  <span className="text-xs font-bold text-slate-800">{formatCurrency(quote.total_amount)}</span>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-indigo-600">
                    Open <ArrowRight className="w-3 h-3" />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Floating Action Button for New Quotation */}
      <button 
        onClick={handleCreateQuotation}
        disabled={creatingQuote}
        className="fixed bottom-6 right-6 px-4 h-14 bg-indigo-600 rounded-full shadow-lg shadow-indigo-200 flex items-center justify-center gap-2 text-white active:scale-95 transition-transform z-30 disabled:opacity-50"
      >
        <Plus className="w-5 h-5" />
        <span className="text-sm font-bold pr-1">{creatingQuote ? 'Creating...' : 'New Quote'}</span>
      </button>

    </div>
  );
}
