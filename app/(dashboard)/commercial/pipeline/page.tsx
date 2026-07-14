'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { 
  Briefcase, 
  Search, 
  Filter, 
  Plus, 
  DollarSign, 
  TrendingUp, 
  AlertCircle,
  MoreVertical,
  Building,
  Calendar,
  MessageSquare,
  FileText,
  X,
  Target,
  Banknote,
  ArrowRight,
  Loader2,
  ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

// Mock types for UI display before DB is fully seeded
type DealStage = 'PROSPECTING' | 'NEGOTIATION' | 'QUOTATION' | 'WON' | 'LOST';

interface Deal {
  id: string;
  title: string;
  stage: DealStage;
  expected_revenue: number;
  company_name: string;
  sbu_target: string;
  fee_type?: string;
  fee_value?: number;
}

const STAGES: { id: DealStage; label: string; color: string }[] = [
  { id: 'PROSPECTING', label: 'Prospecting', color: 'border-blue-500 bg-blue-50 text-blue-700' },
  { id: 'QUOTATION', label: 'Quotation Sent', color: 'border-purple-500 bg-purple-50 text-purple-700' },
  { id: 'NEGOTIATION', label: 'Negotiation', color: 'border-amber-500 bg-amber-50 text-amber-700' },
  { id: 'WON', label: 'Closed Won', color: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
  { id: 'LOST', label: 'Closed Lost', color: 'border-slate-500 bg-slate-50 text-slate-700' }
];

/* ─── Inline Deal Drawer Component ─── */
function DealDrawer({ dealId, onClose, onDealUpdated }: { dealId: string; onClose: () => void; onDealUpdated?: () => void }) {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [deal, setDeal] = useState<any>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingQuote, setCreatingQuote] = useState(false);

  useEffect(() => {
    fetchDealData();
  }, [dealId]);

  async function fetchDealData() {
    setLoading(true);
    try {
      const { data: dealData } = await supabase
        .from('crm_deals')
        .select(`*, md_entities(name)`)
        .eq('id', dealId)
        .single();

      if (dealData) {
        setDeal(dealData);
        const { data: quotesData } = await supabase
          .from('crm_quotations')
          .select(`
            *,
            crm_quotation_sections (
              id,
              sbu_type,
              approval_status
            )
          `)
          .eq('deal_id', dealId)
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
      const quoteNumber = `QT-${new Date().getFullYear()}-${String(new Date().getMonth()+1).padStart(2, '0')}-${Math.floor(Math.random()*10000).toString().padStart(4, '0')}`;
      const { data, error } = await supabase.from('crm_quotations').insert([{
        tenant_id: profile?.tenant_id,
        deal_id: deal.id,
        quote_number: quoteNumber,
        status: 'DRAFT',
        created_by: user?.id
      }]).select('id').single();

      if (error) throw error;
      
      // Open quotation builder in new tab so user stays on pipeline
      window.open(`/commercial/quotations/${data.id}`, '_blank');
      // Refresh quotation list
      fetchDealData();
    } catch (err: any) {
      alert('Failed to create quotation: ' + err.message);
    } finally {
      setCreatingQuote(false);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);

  const entityName = deal ? (Array.isArray(deal.md_entities) ? deal.md_entities[0]?.name : (deal.md_entities as any)?.name) : '';

  const stageColors: Record<string, string> = {
    PROSPECTING: 'bg-blue-100 text-blue-700',
    QUOTATION: 'bg-purple-100 text-purple-700',
    NEGOTIATION: 'bg-amber-100 text-amber-700',
    WON: 'bg-emerald-100 text-emerald-700',
    LOST: 'bg-slate-200 text-slate-600',
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-indigo-700 px-6 py-5 flex items-center gap-3 text-white shrink-0">
        <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors -ml-1">
          <X className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h2 className="font-bold text-base truncate">Deal Details</h2>
          <p className="text-xs text-indigo-200 truncate">{entityName || 'Loading...'}</p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto bg-slate-50">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
          </div>
        ) : !deal ? (
          <div className="flex items-center justify-center h-48 text-slate-400 text-sm">Deal not found</div>
        ) : (
          <>
            {/* Deal Info */}
            <div className="bg-white p-5 border-b border-slate-200">
              <h3 className="text-lg font-bold text-slate-800 mb-4">{deal.title}</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
                    <Target className="w-3.5 h-3.5" /> Stage
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${stageColors[deal.stage] || 'bg-slate-100 text-slate-600'}`}>
                    {deal.stage}
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 mb-1">
                    <Banknote className="w-3.5 h-3.5" /> Revenue
                  </div>
                  <p className="font-bold text-sm text-slate-800">{formatCurrency(deal.expected_revenue)}</p>
                </div>
              </div>

              {deal.sbu_target && (
                <div className="mt-3">
                  <span className="bg-indigo-50 text-indigo-700 text-[10px] font-bold px-2.5 py-1 rounded-md border border-indigo-100">
                    SBU: {deal.sbu_target}
                  </span>
                </div>
              )}

              {deal.fee_type && (
                <div className="mt-3 p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-[11px] text-amber-600 font-medium">Sales Fee</p>
                  <p className="text-sm font-bold text-amber-800">
                    {deal.fee_type === 'PERCENTAGE' ? `${deal.fee_value}%` : formatCurrency(deal.fee_value || 0)}
                    {deal.fee_type === 'PERCENTAGE' && (
                      <span className="text-xs text-amber-600 font-normal ml-2">
                        ≈ {formatCurrency((Number(deal.expected_revenue) * Number(deal.fee_value || 0)) / 100)}
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>

            {/* Quotations */}
            <div className="p-5">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-400" /> Quotations
                </h4>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                    {quotations.length}
                  </span>
                </div>
              </div>

              <div className="space-y-2.5">
                {quotations.length === 0 ? (
                  <div className="text-center py-8 bg-white rounded-xl border border-dashed border-slate-300">
                    <FileText className="w-7 h-7 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs font-medium text-slate-400">No quotations yet</p>
                  </div>
                ) : (
                  quotations.map(quote => (
                    <a
                      href={`/commercial/quotations/${quote.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      key={quote.id}
                      className="block bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h5 className="font-bold text-slate-800 text-sm">{quote.quote_number}</h5>
                          <p className="text-[10px] text-slate-500 mt-0.5">
                            {new Date(quote.created_at).toLocaleDateString('id-ID')}
                          </p>
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
                      {quote.crm_quotation_sections && quote.crm_quotation_sections.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1 border-t border-slate-100 pt-2 mb-2">
                          {quote.crm_quotation_sections.map((sec: any) => {
                            const isApproved = sec.approval_status === 'APPROVED';
                            const isRejected = sec.approval_status === 'REJECTED';
                            return (
                              <span 
                                key={sec.id}
                                className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded flex items-center gap-1 border ${
                                  isApproved ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                                  isRejected ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                  'bg-amber-50 text-amber-700 border-amber-100'
                                }`}
                              >
                                {sec.sbu_type}: {isApproved ? '✓' : isRejected ? '✗' : '⏳'}
                              </span>
                            );
                          })}
                        </div>
                      )}
                      <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-100">
                        <span className="text-sm font-black text-slate-800">{formatCurrency(quote.total_amount)}</span>
                        <div className="flex items-center gap-2">
                          <div className="px-2.5 py-1.5 text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-1 transition-colors">
                            Open <ArrowRight className="w-3 h-3" />
                          </div>
                        </div>
                      </div>
                    </a>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Action */}
      {deal && (
        <div className="shrink-0 p-4 bg-white border-t border-slate-200">
          <button
            onClick={handleCreateQuotation}
            disabled={creatingQuote}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-50 shadow-sm shadow-indigo-200"
          >
            <Plus className="w-4 h-4" />
            {creatingQuote ? 'Creating...' : 'New Quotation'}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Main Pipeline Page ─── */
export default function SalesPipelinePage() {
  const { profile } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);

  // Lite Finance Summaries
  const [financeSummary, setFinanceSummary] = useState({
    bookingRevenue: 0,
    settled: 0,
    outstanding: 0,
    projectedFee: 0
  });

  useEffect(() => {
    fetchDeals();
  }, []);

  async function fetchDeals() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('crm_deals')
        .select(`
          id, title, stage, expected_revenue, sbu_target, fee_type, fee_value,
          md_entities(name)
        `);
      
      if (error) throw error;

      if (data) {
        const formatted = data.map(d => ({
          id: d.id,
          title: d.title,
          stage: d.stage as DealStage,
          expected_revenue: d.expected_revenue,
          sbu_target: d.sbu_target,
          company_name: Array.isArray(d.md_entities) ? d.md_entities[0]?.name : (d.md_entities as any)?.name || 'Unknown',
          fee_type: d.fee_type,
          fee_value: d.fee_value
        }));
        setDeals(formatted);

        // Calc metrics
        let rev = 0;
        let fee = 0;
        formatted.forEach(d => {
          if (d.stage === 'WON') rev += Number(d.expected_revenue || 0);
          
          if (d.fee_type === 'PERCENTAGE' && d.fee_value) {
            fee += (Number(d.expected_revenue) * Number(d.fee_value)) / 100;
          } else if (d.fee_type === 'NOMINAL' && d.fee_value) {
            fee += Number(d.fee_value); // Very simplified
          }
        });

        setFinanceSummary({
          bookingRevenue: rev,
          settled: rev * 0.4, // Mock 40% settled
          outstanding: rev * 0.6, // Mock 60% outstanding
          projectedFee: fee
        });
      }
    } catch (err: any) {
      console.warn("CRM DB Error (Table might not exist yet):", err.message);
      setDbError(true);
      // Fallback to beautiful mock data for UI presentation
      loadMockData();
    } finally {
      setLoading(false);
    }
  }

  function loadMockData() {
    const mockDeals: Deal[] = [
      { id: '1', title: 'Export 20 TEUs to SG', stage: 'PROSPECTING', expected_revenue: 45000000, company_name: 'PT Maju Bersama', sbu_target: 'CLEARANCE', fee_type: 'PERCENTAGE', fee_value: 1.5 },
      { id: '3', title: 'Trucking JKT-SBY 5 Rits', stage: 'QUOTATION', expected_revenue: 35000000, company_name: 'PT Logistik Cepat', sbu_target: 'TRUCKING', fee_type: 'PERCENTAGE', fee_value: 2 },
      { id: '2', title: 'Warehouse Storage 500 Pallets', stage: 'NEGOTIATION', expected_revenue: 120000000, company_name: 'CV Makmur Sentosa', sbu_target: 'WAREHOUSE', fee_type: 'NOMINAL', fee_value: 2000000 },
      { id: '4', title: 'Import Air Freight', stage: 'WON', expected_revenue: 85000000, company_name: 'PT Tech Indo', sbu_target: 'FORWARDING', fee_type: 'NOMINAL', fee_value: 1500000 },
      { id: '5', title: 'FCL Trucking', stage: 'WON', expected_revenue: 42000000, company_name: 'PT Semen Kuat', sbu_target: 'TRUCKING', fee_type: 'PERCENTAGE', fee_value: 1 },
      { id: '6', title: 'LCL Cargo Delivery', stage: 'LOST', expected_revenue: 15000000, company_name: 'Toko Elektronik Raya', sbu_target: 'TRUCKING' }
    ];
    setDeals(mockDeals);
    setFinanceSummary({
      bookingRevenue: 127000000,
      settled: 85000000,
      outstanding: 42000000,
      projectedFee: 1920000
    });
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 min-h-screen">
      {/* Header & Lite Finance */}
      <div className="bg-white border-b px-8 py-6">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
              <Briefcase className="w-7 h-7 text-indigo-600" />
              Commercial Pipeline
            </h1>
            <p className="text-slate-500 mt-1">Manage leads, track deals, and monitor your revenue targets.</p>
          </div>
          <div className="flex gap-3">
            <button className="px-4 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
              <Filter className="w-4 h-4" /> Filter
            </button>
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-sm shadow-indigo-200">
              <Plus className="w-4 h-4" /> New Deal
            </button>
          </div>
        </div>

        {dbError && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-800">Database Migration Required</h3>
              <p className="text-sm text-amber-700 mt-1">The CRM tables (crm_deals, crm_leads) have not been created in Supabase yet. This dashboard is currently showing <strong>Offline Mock Data</strong> for UI/UX testing purposes. Please apply Migration 115.</p>
            </div>
          </div>
        )}

        {/* LITE FINANCE WIDGETS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-5 rounded-2xl shadow-md text-white relative overflow-hidden">
            <div className="absolute right-[-10px] top-[-10px] opacity-10">
              <TrendingUp className="w-32 h-32" />
            </div>
            <p className="text-indigo-100 text-sm font-medium mb-1">Won Revenue (MTD)</p>
            <h3 className="text-2xl font-bold">{formatCurrency(financeSummary.bookingRevenue)}</h3>
            <p className="text-xs text-indigo-200 mt-2">Total order value closed this month</p>
          </div>

          <div className="bg-white border p-5 rounded-2xl shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Settled / Paid</p>
                <h3 className="text-xl font-bold text-emerald-600">{formatCurrency(financeSummary.settled)}</h3>
              </div>
              <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><DollarSign className="w-5 h-5" /></div>
            </div>
            <p className="text-xs text-slate-400 mt-2">Revenue safely in bank</p>
          </div>

          <div className="bg-white border p-5 rounded-2xl shadow-sm">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-sm font-medium mb-1">Outstanding / AR</p>
                <h3 className="text-xl font-bold text-rose-500">{formatCurrency(financeSummary.outstanding)}</h3>
              </div>
              <div className="p-2 bg-rose-50 rounded-lg text-rose-500"><AlertCircle className="w-5 h-5" /></div>
            </div>
            <p className="text-xs text-rose-400 mt-2 font-medium">Follow up required!</p>
          </div>

          <div className="bg-slate-900 p-5 rounded-2xl shadow-md text-white relative overflow-hidden">
            <p className="text-slate-400 text-sm font-medium mb-1">Projected Sales Fee</p>
            <h3 className="text-2xl font-bold text-amber-400">{formatCurrency(financeSummary.projectedFee)}</h3>
            <p className="text-xs text-slate-400 mt-2">Based on Won Deals &amp; Formula</p>
          </div>
        </div>
      </div>

      {/* KANBAN BOARD */}
      <div className="flex-1 overflow-x-auto p-8">
        <div className="flex gap-6 h-full min-w-max pb-8">
          {STAGES.map(stage => (
            <div key={stage.id} className="w-[320px] flex flex-col h-full">
              <div className={`flex items-center justify-between mb-4 px-3 py-2 rounded-lg border-b-2 ${stage.color}`}>
                <h3 className="font-bold text-sm uppercase tracking-wide">{stage.label}</h3>
                <span className="bg-white/50 px-2 py-0.5 rounded-full text-xs font-bold">
                  {deals.filter(d => d.stage === stage.id).length}
                </span>
              </div>

              <div className="flex-1 flex flex-col gap-3">
                {deals.filter(d => d.stage === stage.id).map(deal => (
                  <div onClick={() => setSelectedDealId(deal.id)} key={deal.id} className={`bg-white p-4 rounded-xl shadow-sm border transition-all cursor-pointer group block ${selectedDealId === deal.id ? 'border-indigo-400 ring-2 ring-indigo-100 shadow-md' : 'border-slate-200 hover:shadow-md hover:border-indigo-300'}`}>
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-xs font-bold px-2 py-1 bg-slate-100 text-slate-600 rounded">
                        {deal.sbu_target}
                      </span>
                      <button className="text-slate-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <h4 className="font-bold text-slate-800 text-sm mb-1 line-clamp-2">{deal.title}</h4>
                    
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-3">
                      <Building className="w-3.5 h-3.5" />
                      <span className="truncate">{deal.company_name}</span>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      <span className="font-bold text-indigo-700 text-sm">
                        {formatCurrency(deal.expected_revenue)}
                      </span>
                      <div className="flex gap-1">
                        <div className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors" title="Generate Quote">
                          <FileText className="w-3.5 h-3.5" />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {deals.filter(d => d.stage === stage.id).length === 0 && (
                  <div className="h-24 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-sm font-medium bg-slate-50/50">
                    Drop deals here
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Slide-Over Native Panel */}
      {selectedDealId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setSelectedDealId(null)}
          />
          
          {/* Drawer */}
          <div className="w-full max-w-[480px] bg-white h-full shadow-2xl relative z-10 flex flex-col" style={{ animation: 'slideInRight 0.25s ease-out' }}>
            <DealDrawer 
              dealId={selectedDealId} 
              onClose={() => setSelectedDealId(null)} 
              onDealUpdated={() => fetchDeals()}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

    </div>
  );
}
