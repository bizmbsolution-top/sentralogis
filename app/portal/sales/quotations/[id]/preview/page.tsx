'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { ChevronLeft, Printer } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function QuotationPrintPreview({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = React.use(params);
  const id = resolvedParams.id;
  const { user } = useAuth();
  const router = useRouter();
  const [quote, setQuote] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && id) {
      fetchQuotation();
    }
  }, [user, id]);

  async function fetchQuotation() {
    setLoading(true);
    try {
      const { data: rawQuoteData } = await (supabase
        .from('crm_quotations' as any) as any)
        .select(`
          *, 
          crm_deals(title, entity_id, md_entities(name, billing_address, phone, email))
        `)
        .eq('id', id)
        .single();
      const quoteData = rawQuoteData as any;
      
      if (quoteData) {
        setQuote(quoteData);

        if (quoteData.tenant_id) {
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('*')
            .or(`id.eq.${quoteData.tenant_id},tenant_code.eq.${quoteData.tenant_id},user_id.eq.${quoteData.tenant_id}`)
            .limit(1);
          
          if (tenantData && tenantData.length > 0) {
            setQuote((prev: any) => ({ ...prev, tenants: tenantData[0] }));
          } else {
            const { data: prof } = await supabase.from('profiles').select('full_name').or(`id.eq.${quoteData.tenant_id},tenant_id.eq.${quoteData.tenant_id}`).limit(1);
            if (prof && prof.length > 0) {
              setQuote((prev: any) => ({ ...prev, tenants: { name: prof[0].full_name || 'PT Sentralogis Nusantara', company_name: prof[0].full_name || 'PT Sentralogis Nusantara' } }));
            } else {
              setQuote((prev: any) => ({ ...prev, tenants: { name: 'PT Sentralogis Nusantara', company_name: 'PT Sentralogis Nusantara' } }));
            }
          }
        }

        // Fetch SBU Sections
        const { data: sectionsData } = await (supabase
          .from('crm_quotation_sections' as any) as any)
          .select('*')
          .eq('quotation_id', id);
        setSections((sectionsData as any[]) || []);

        // Fetch Items
        const { data: itemsData } = await supabase
          .from('crm_quotation_items')
          .select('*')
          .eq('quotation_id', id)
          .order('created_at', { ascending: true });
        setItems(itemsData || []);
      }
    } catch (err) {
      console.warn(err);
    } finally {
      setLoading(false);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Loading Preview...</div>;
  if (!quote) return <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-400">Quotation not found</div>;

  const entity = Array.isArray(quote.crm_deals?.md_entities) ? quote.crm_deals?.md_entities[0] : quote.crm_deals?.md_entities;
  const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(val || 0);
  const tenantName = quote.tenants?.company_name || quote.tenants?.name || quote.tenant_name || 'PT Sentralogis Nusantara';

  // Group items by SBU
  const groupedItems = items.reduce((acc, item) => {
    const cluster = item.sbu_cluster || 'GENERAL';
    if (!acc[cluster]) acc[cluster] = [];
    acc[cluster].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center">
      
      {/* Floating Action Bar (Hidden in Print) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-white px-4 py-3 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-slate-200 z-50 print:hidden">
        <button onClick={() => router.back()} className="w-10 h-10 flex items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="w-px h-6 bg-slate-200"></div>
        <button onClick={handlePrint} className="px-6 h-10 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-bold text-sm flex items-center gap-2 shadow-sm transition-colors">
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      {/* A4 Paper Container */}
      <div className="bg-white w-full max-w-[210mm] min-h-[297mm] shadow-sm my-0 sm:my-8 px-[15mm] py-[20mm] print:m-0 print:shadow-none print:w-[210mm] print:h-auto flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-indigo-600 pb-6 mb-8">
            <div>
              <h1 className="text-3xl font-black text-indigo-900 tracking-tight">QUOTATION</h1>
              <p className="text-sm font-bold text-slate-500 mt-1">{quote.quote_number}</p>
            </div>
            <div className="text-right">
              {quote.tenants?.logo_url ? (
                <img src={quote.tenants.logo_url} alt={tenantName} className="h-10 mb-2 ml-auto object-contain" />
              ) : (
                <img src="/logo2sentralogis.png" alt="Sentralogis" className="h-10 mb-2 ml-auto object-contain" />
              )}
              <p className="text-[10px] text-slate-500 font-medium">{tenantName}</p>
              <p className="text-[10px] text-slate-500 max-w-[200px] ml-auto">{quote.tenants?.company_address || ''}</p>
              {quote.tenants?.company_phone && <p className="text-[10px] text-slate-500">{quote.tenants.company_phone}</p>}
            </div>
          </div>

          {/* Customer & Quote Info */}
          <div className="flex justify-between mb-8">
            <div className="w-1/2 pr-4">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Quotation For</h3>
              <p className="text-sm font-bold text-slate-800">{entity?.name || 'Customer Name'}</p>
              {entity?.billing_address && <p className="text-xs text-slate-500 mt-1 max-w-[90%] leading-relaxed">{entity.billing_address}</p>}
            </div>
            <div className="w-1/3 text-right">
              <div className="mb-3">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Date</h3>
                <p className="text-xs font-bold text-slate-800">{new Date(quote.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
              <div className="mb-3">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Validity</h3>
                <p className="text-xs font-bold text-slate-800">{quote.validity_days || 30} Days from date of issue</p>
              </div>
              <div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Reference</h3>
                <p className="text-xs font-bold text-slate-800">{quote.crm_deals?.title}</p>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="mb-8">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-slate-800">
                  <th className="py-2.5 px-2 text-xs font-bold text-slate-800 w-12">No</th>
                  <th className="py-2.5 px-2 text-xs font-bold text-slate-800">Description</th>
                  <th className="py-2.5 px-2 text-xs font-bold text-slate-800 text-center w-24">Qty</th>
                  <th className="py-2.5 px-2 text-xs font-bold text-slate-800 text-right w-32">Unit Price</th>
                  <th className="py-2.5 px-2 text-xs font-bold text-slate-800 text-right w-32">Total</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(groupedItems).map(([cluster, clusterItems]) => (
                  <React.Fragment key={cluster}>
                    <tr className="bg-slate-50/50">
                      <td colSpan={5} className="py-2 px-2 text-[9px] font-black text-slate-700 uppercase tracking-widest border-b border-slate-200">
                        {cluster} SERVICES
                      </td>
                    </tr>
                    {(clusterItems as any[]).map((item: any, idx: number) => (
                      <tr key={item.id} className="border-b border-slate-100">
                        <td className="py-3 px-2 text-xs text-slate-500 align-top">{idx + 1}</td>
                        <td className="py-3 px-2 text-xs text-slate-800 font-medium align-top">
                          {item.description}
                          {item.tax_percent > 0 && <div className="text-[9px] text-slate-400 mt-0.5 font-normal">+ {item.tax_percent}% PPN Applicable</div>}
                          
                          {item.sbu_cluster === 'TRUCKING' && item.sbu_metadata && (
                            <div className="mt-1.5 p-2 bg-slate-50 border border-slate-100 rounded text-[10px] text-slate-600 space-y-1 font-normal">
                              <div><strong>Vehicle:</strong> {item.sbu_metadata.vehicle_type_name || 'TBA'}</div>
                              {item.sbu_metadata.stops && item.sbu_metadata.stops.length > 0 && (
                                <div className="pl-1 border-l border-slate-355">
                                  <strong>Route:</strong> {item.sbu_metadata.stops.map((s: any) => s.location_name || s.address).join(' → ')}
                                </div>
                              )}
                            </div>
                          )}

                          {item.sbu_cluster === 'WAREHOUSE' && item.sbu_metadata && (
                            <div className="mt-1.5 p-2 bg-slate-50 border border-slate-100 rounded text-[10px] text-slate-600 space-y-1 font-normal">
                              <div><strong>Operation:</strong> {item.sbu_metadata.operation_type || 'INBOUND'} | <strong>Warehouse:</strong> {item.sbu_metadata.warehouse_name || 'TBA'}</div>
                              {item.sbu_metadata.est_volume_cbm > 0 && <span><strong>Volume:</strong> {item.sbu_metadata.est_volume_cbm} CBM </span>}
                              {item.sbu_metadata.est_tonnage > 0 && <span>| <strong>Tonnage:</strong> {item.sbu_metadata.est_tonnage} Ton</span>}
                              {item.sbu_metadata.manifests && item.sbu_metadata.manifests.length > 0 && (
                                <div className="mt-1 border-t border-slate-200 pt-1">
                                  <strong>Items:</strong> {item.sbu_metadata.manifests.map((m: any) => `${m.name} (${m.quantity} ${m.unit})`).join(', ')}
                                </div>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-2 text-xs text-slate-600 text-center align-top">
                          {item.qty} <span className="text-[10px] text-slate-400 ml-0.5">{item.uom}</span>
                        </td>
                        <td className="py-3 px-2 text-xs text-slate-800 text-right font-mono align-top">{formatCurrency(item.unit_price)}</td>
                        <td className="py-3 px-2 text-xs font-bold text-slate-800 text-right font-mono align-top">
                          {formatCurrency(item.total_price)}
                          {item.pricing_type === 'RECURRING_MONTHLY' && (
                            <span className="text-[9px] text-indigo-600 font-bold block">/bulan</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          {/* Totals & Notes */}
          <div className="flex justify-between items-start border-t border-slate-150 pt-6">
            <div className="w-1/2 pr-8 space-y-4">
              {/* SBU Specific Notes */}
              {sections.filter(s => s.sbu_notes).map(sec => (
                <div key={sec.id} className="bg-slate-50 p-3.5 rounded-xl border border-slate-150">
                  <h4 className="text-[9px] font-black text-indigo-900 uppercase tracking-wider mb-1">{sec.sbu_type} Terms & Conditions</h4>
                  <p className="text-[10px] text-slate-600 whitespace-pre-wrap leading-relaxed">{sec.sbu_notes}</p>
                </div>
              ))}

              {/* Global T&C */}
              {quote.notes && (
                <div>
                  <h3 className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1.5">General Terms & Conditions</h3>
                  <p className="text-[10px] text-slate-600 whitespace-pre-wrap leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-150">{quote.notes}</p>
                </div>
              )}
            </div>
            
            <div className="w-5/12 bg-slate-50 p-6 rounded-2xl border border-slate-150 space-y-2.5">
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-500">Subtotal One-Time</span>
                <span className="text-xs font-bold text-slate-800 font-mono">{formatCurrency(quote.onetime_total || 0)}</span>
              </div>
              {quote.recurring_total > 0 && (
                <div className="flex justify-between items-center text-indigo-900">
                  <span className="text-[11px] font-bold text-indigo-600">Subtotal Recurring (Monthly)</span>
                  <span className="text-xs font-black font-mono">{formatCurrency(quote.recurring_total)}/bln</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[11px] font-bold text-slate-500">PPN (Tax)</span>
                <span className="text-xs font-bold text-slate-800 font-mono">{formatCurrency(quote.tax_amount || 0)}</span>
              </div>
              <div className="w-full h-px bg-slate-200 my-1"></div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs font-black text-slate-900">GRAND TOTAL</span>
                <span className="text-base font-black text-indigo-600 font-mono">{formatCurrency(quote.total_amount || 0)}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-16 flex justify-between items-end px-6">
            <div className="text-center">
              <div className="w-40 h-px bg-slate-350 mb-1.5"></div>
              <p className="text-[10px] font-bold text-slate-800">Authorized Signature</p>
              <p className="text-[9px] text-slate-400">{tenantName}</p>
            </div>
            <div className="text-center">
              <div className="w-40 h-px bg-slate-350 mb-1.5"></div>
              <p className="text-[10px] font-bold text-slate-800">Customer Approval</p>
              <p className="text-[9px] text-slate-400">{entity?.name || 'Client'}</p>
            </div>
          </div>
        </div>

      </div>

      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body {
            background: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            margin: 0mm !important;
            size: auto;
          }
        }
      `}} />
    </div>
  );
}
