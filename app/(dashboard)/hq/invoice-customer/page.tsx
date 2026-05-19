'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  FileText, Search, Filter, 
  ArrowRight, Loader2, 
  Banknote, Receipt, Download,
  Printer, ShieldCheck, X,
  ExternalLink, FileCheck, Check,
  AlertCircle,
  TrendingUp,
  CreditCard,
  Building,
  User,
  MapPin,
  ChevronRight,
  MoreVertical,
  Zap,
  Clock,
  ArrowLeft,
  Calendar,
  Layers,
  CheckCircle2,
  Phone,
  MessageSquare,
  BadgeCheck,
  Activity
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { toast, Toaster } from 'react-hot-toast';
import { supabase } from '@/lib/supabase/client';
import { useAuth } from '@/lib/hooks/useAuth';
import { sendNotification } from '@/lib/supabase/notifications';



// ---------------------------------------------------------
// UTILS
// ---------------------------------------------------------
const formatRupiah = (amount: number) => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0
  }).format(amount);
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('id-ID', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
};

// ---------------------------------------------------------
// INVOICE REVIEW MODAL (Moved Outside to prevent re-render reset)
// ---------------------------------------------------------
const InvoiceReviewModal = ({ jo, onClose, profile, onRefresh, onGenerate, initialPrintMode = false }: { jo: any; onClose: () => void; profile: any; onRefresh: () => Promise<void>; onGenerate: (id: string) => Promise<void>; initialPrintMode?: boolean }) => {
  const [taxOptions, setTaxOptions] = useState<any[]>([
    { id: 'fallback-ppn-1.1', name: 'PPN 1.1%', rate: 1.1 },
    { id: 'fallback-ppn-11', name: 'PPN 11%', rate: 11 },
    { id: 'fallback-pph-23', name: 'PPH 23 (2%)', rate: -2 },
    { id: 'fallback-non-tax', name: 'NON-TAX', rate: 0 }
  ]);
  
  const [showPrintPreview, setShowPrintPreview] = useState(initialPrintMode);
  const [editableItems, setEditableItems] = useState<any[]>([]);

  useEffect(() => {
    const fetchTaxes = async () => {
      try {
        console.log('[Modal] Fetching taxes from DB...');
        const { data, error } = await supabase.from('md_taxes').select('*').order('rate', { ascending: false });
        
        if (error) {
          console.error('Database Tax Fetch Error:', error);
          toast.error(`Database Error: ${error.message}`);
          return;
        }

        if (data && data.length > 0) {
          const hasNonTax = data.some(t => t.rate === 0);
          const finalData = [...data];
          if (!hasNonTax) {
            finalData.push({ id: 'fallback-non-tax', name: 'NON-TAX', rate: 0, is_active: true });
          }
          setTaxOptions(finalData);
          console.log('[Modal] Taxes loaded from DB:', data.length, 'items');
        } else {
          console.warn('[Modal] No taxes found in database, using fallback options.');
        }
      } catch (err: any) {
        console.error('Fetch Taxes Critical Error:', err);
        toast.error(`Critical Error: ${err.message}`);
      }
    };
    fetchTaxes();
  }, []);

  useEffect(() => {
    if (!jo || taxOptions.length === 0) return;
    
    const execDate = jo.wo_item?.wo?.execution_date;
    const itemData = jo.wo_item?.item_data || {};
    const origin = itemData.shipper_name || itemData.origin_name || itemData.origin || 'NPCT1 Port';
    const destination = itemData.recipient_name || itemData.destination_name || itemData.destination || 'GUDANG TOP';
    
    let defaultTaxId = taxOptions.find(t => t.rate === 1.1)?.id || taxOptions[0]?.id;
    let isTaxable = true;
    
    if (jo.tax_id) {
      const existingTax = taxOptions.find(t => t.id === jo.tax_id);
      if (existingTax) {
        defaultTaxId = jo.tax_id;
        isTaxable = existingTax.rate !== 0;
      }
    }

    const items = [
      {
        id: 'base',
        date: execDate,
        description: `${itemData.vehicle_type_name || (jo.fleet as any)?.fleet_type?.type_name || 'Trucking Service'}`,
        route: `${origin} → ${destination}`,
        qty: 1, 
        price: Number(jo.base_price), 
        taxRate: isTaxable ? (taxOptions.find(t => t.id === defaultTaxId)?.rate || 0) : 0,
        isTaxable: isTaxable,
        taxId: defaultTaxId
      }
    ];

    if (jo.extra_costs) {
      jo.extra_costs.forEach((cost: any) => {
        let costTaxId = defaultTaxId;
        let costIsTaxable = isTaxable;
        
        if (cost.tax_id) {
          const costTax = taxOptions.find(t => t.id === cost.tax_id);
          if (costTax) {
            costTaxId = cost.tax_id;
            costIsTaxable = costTax.rate !== 0;
          } else if (cost.tax_id === 'non-tax') {
             costTaxId = 'fallback-non-tax';
             costIsTaxable = false;
          }
        }
        
        items.push({
          id: cost.id,
          date: execDate,
          description: (cost.description || cost.cost_type).replace(/_/g, ' ').toUpperCase(),
          route: '', 
          qty: 1, 
          price: Number(cost.amount), 
          taxRate: costIsTaxable ? (taxOptions.find(t => t.id === costTaxId)?.rate || 0) : 0,
          isTaxable: costIsTaxable,
          taxId: costTaxId
        });
      });
    }
    setEditableItems(items);
  }, [jo, taxOptions]);

  const [customerInfo, setCustomerInfo] = useState({
    billTo: jo.wo_item?.wo?.customer?.legal_name || jo.wo_item?.wo?.customer?.name || '',
    billToAddress: jo.wo_item?.wo?.customer?.billing_address || '',
    billToCity: jo.wo_item?.wo?.customer?.billing_city || '',
    woNumber: jo.wo_item?.wo?.wo_number || '',
    orderDate: jo.wo_item?.wo?.created_at || '',
    executionDate: jo.wo_item?.wo?.execution_date || '',
  });

  const totals = useMemo(() => {
    let subtotal = 0;
    let totalTax = 0;
    editableItems.forEach(item => {
      const itemTotal = item.qty * item.price;
      subtotal += itemTotal;
      
      const currentTax = taxOptions.find(t => t.id === item.taxId);
      if (currentTax && item.isTaxable && currentTax.rate !== 0) {
        totalTax += itemTotal * (currentTax.rate / 100);
      }
    });
    return { subtotal, totalTax, grandTotal: subtotal + totalTax };
  }, [editableItems, taxOptions]);

  if (showPrintPreview) {
    return (
      <div className="fixed inset-0 bg-white z-[100] flex flex-col p-10 font-sans text-slate-900 overflow-y-auto animate-in fade-in duration-500">
         <div className="max-w-4xl mx-auto w-full">
            <div className="flex items-center justify-between mb-12 pb-6 border-b border-slate-100 no-print">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white"><Printer size={20} /></div>
                  <h2 className="text-sm font-black uppercase tracking-widest italic">Invoice Preview</h2>
                </div>
                <div className="flex items-center gap-3">
                  <Button onClick={() => window.print()} className="bg-slate-900 hover:bg-black text-white rounded-2xl h-14 px-8 text-[11px] font-black uppercase tracking-widest shadow-xl shadow-slate-900/10">
                      PRINT INVOICE
                  </Button>
                  <Button onClick={() => setShowPrintPreview(false)} className="bg-slate-900 text-white rounded-2xl h-14 px-8 text-[11px] font-black uppercase tracking-widest hover:bg-black transition-all">
                      EDIT DATA
                  </Button>
                </div>
            </div>

            {/* Formal Invoice Layout */}
            <div className="p-0 leading-relaxed text-slate-900">
              <div className="flex justify-between items-start mb-20">
                 <div className="w-1/2">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mb-4 italic">Bill To</p>
                    <h3 className="text-3xl font-black italic uppercase tracking-tighter mb-4">{customerInfo.billTo}</h3>
                    <div className="text-[11px] font-bold text-slate-500 space-y-1 uppercase tracking-wider max-w-sm">
                      <p>{customerInfo.billToAddress}</p>
                      <p>{customerInfo.billToCity}</p>
                      <p>Indonesia</p>
                    </div>
                 </div>
                 <div className="w-1/2 text-right">
                    <div className="mb-8">
                      <h2 className="text-4xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
                         {profile?.tenants?.name || 'SENTRALOGIS'}
                      </h2>
                      <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.4em] mt-3 italic">Intelligence Supply Chain</p>
                    </div>
                    <div className="text-[10px] font-bold text-slate-500 space-y-1 uppercase tracking-widest">
                      <p>Jakarta Selatan, Indonesia</p>
                      <p>NPWP: 01.234.567.8-910.111</p>
                      <div className="mt-8">
                        <p className="font-black text-slate-900 mb-1">Payment Method</p>
                        <p className="text-indigo-600">Bank Central Asia (BCA)</p>
                        <p className="text-indigo-600">Acc: 889-012-3456</p>
                        <p className="text-slate-900">A.N: {profile?.tenants?.name || 'PT SENTRA LOGISTIK'}</p>
                      </div>
                    </div>
                 </div>
              </div>

              <div className="mb-16">
                 <h1 className="text-5xl font-black italic tracking-tighter uppercase mb-10 border-b-8 border-slate-900 inline-block">Invoice</h1>
                 <div className="grid grid-cols-2 gap-10">
                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Invoice Number</span> <span className="text-xs font-black italic">{customerInfo.woNumber.replace('WO', 'INV')}</span></div>
                      <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Reference</span> <span className="text-xs font-black italic">{customerInfo.woNumber}</span></div>
                    </div>
                    <div className="space-y-3">
                      <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Issued Date</span> <span className="text-xs font-black italic">{formatDate(customerInfo.orderDate)}</span></div>
                      <div className="flex justify-between border-b border-slate-50 pb-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">Due Date</span> <span className="text-xs font-black italic">{formatDate(customerInfo.executionDate)}</span></div>
                    </div>
                 </div>
              </div>

              <table className="w-full mb-16">
                <thead>
                  <tr className="bg-slate-900 text-white">
                    <th className="text-left p-4 text-[9px] font-black uppercase tracking-widest italic">Description</th>
                    <th className="text-center p-4 text-[9px] font-black uppercase tracking-widest italic">Qty</th>
                    <th className="text-right p-4 text-[9px] font-black uppercase tracking-widest italic">Unit Price</th>
                    <th className="text-right p-4 text-[9px] font-black uppercase tracking-widest italic">VAT</th>
                    <th className="text-right p-4 text-[9px] font-black uppercase tracking-widest italic">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {editableItems.map((item) => (
                    <tr key={item.id} className="text-xs font-bold uppercase italic">
                      <td className="p-5">
                        <p className="font-black text-slate-900 leading-none mb-1">{item.description}</p>
                        {item.route && <p className="text-[9px] text-slate-400 tracking-wider font-bold not-italic">{item.route}</p>}
                      </td>
                      <td className="p-5 text-center">{item.qty}</td>
                      <td className="p-5 text-right">{formatRupiah(item.price).replace('Rp', '')}</td>
                      <td className="p-5 text-right">
                         {(() => {
                            const currentTax = taxOptions.find(t => t.id === item.taxId);
                            return currentTax ? currentTax.name : '-';
                         })()}
                      </td>
                      <td className="p-5 text-right font-black">{formatRupiah(item.qty * item.price).replace('Rp', '')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="flex justify-end pt-8">
                 <div className="w-80 space-y-4">
                    <div className="flex justify-between items-center text-[11px] font-black uppercase italic text-slate-400">
                       <span>Subtotal</span>
                       <span>{formatRupiah(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between items-center text-[11px] font-black uppercase italic text-indigo-500">
                       <span>Tax Liability</span>
                       <span>+{formatRupiah(totals.totalTax)}</span>
                    </div>
                    <div className="pt-6 border-t-8 border-slate-900 text-right">
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">Amount Due:</p>
                       <h3 className="text-4xl font-black text-slate-900 italic tracking-tighter leading-none">{formatRupiah(totals.grandTotal)}</h3>
                    </div>
                 </div>
              </div>

              <div className="mt-32 text-[9px] font-bold text-slate-400 uppercase tracking-widest space-y-4 border-t border-slate-100 pt-10">
                 <p>Note: Please ensure payment is made within 14 days of invoice issuance. Quote invoice number for all bank transfers.</p>
                 <p>© {new Date().getFullYear()} {profile?.tenants?.name || 'SENTRALOGIS'} Intelligence Tower Finance</p>
              </div>
            </div>
         </div>
         <style>{`@media print { .no-print { display: none !important; } body { padding: 0 !important; margin: 0 !important; } }`}</style>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh] animate-in zoom-in-95 duration-500">
         {/* Modal Header */}
         <div className="px-10 py-8 bg-white border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-6">
               <div className="w-14 h-14 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-xl shadow-slate-900/20">
                  <Receipt size={28} />
               </div>
               <div>
                  <h2 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">Drafting: {customerInfo.woNumber.replace('WO', 'INV')}</h2>
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] mt-2 italic flex items-center gap-2">
                    <Zap size={12} /> Live Billing Structure Generator
                  </p>
               </div>
            </div>
            <button onClick={onClose} className="w-12 h-12 bg-slate-50 hover:bg-slate-100 rounded-full flex items-center justify-center transition-all">
               <X size={24} className="text-slate-400 hover:text-slate-900" />
            </button>
         </div>

         <div className="flex-1 overflow-y-auto p-10 bg-white">
            <div className="flex justify-between items-start mb-20 px-4">
               <div className="w-1/2 space-y-6">
                  <p className="text-[10px] text-slate-600 font-black uppercase tracking-[0.2em] italic">Bill To / Target Entity</p>
                  <input 
                     value={customerInfo.billTo} 
                     onChange={(e) => setCustomerInfo({...customerInfo, billTo: e.target.value})} 
                     className="w-full bg-slate-50 hover:bg-white focus:bg-white border-b-4 border-transparent focus:border-slate-900 px-6 py-6 text-3xl font-black italic transition-all outline-none rounded-t-2xl"
                     placeholder="Corporate Name..."
                  />
                  <p className="text-[11px] font-bold text-slate-600 uppercase tracking-widest pl-6">
                     {customerInfo.billToAddress} • {customerInfo.billToCity}
                  </p>
               </div>
               <div className="w-1/2 text-right">
                  <div className="mb-6">
                     <h2 className="text-3xl font-black italic tracking-tighter uppercase text-slate-900 leading-none">
                        {profile?.tenants?.name || 'SENTRALOGIS'}
                     </h2>
                     <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.3em] mt-2 italic">Intelligence Supply Chain</p>
                  </div>
                  <Badge className="bg-slate-100 text-slate-600 border-none font-black text-[9px] uppercase tracking-widest px-4 py-2">FINANCE OPS ACTIVE</Badge>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-12 mb-16 bg-slate-50/50 p-10 rounded-2xl border border-slate-50 mx-4">
               <div className="space-y-6">
                  <div className="flex items-center gap-6">
                     <span className="w-32 text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Inv Serial:</span>
                     <input value={customerInfo.woNumber.replace('WO', 'INV')} disabled className="bg-white/80 border-none rounded-xl px-4 py-2 text-xs font-black italic w-full text-slate-600" />
                  </div>
                  <div className="flex items-center gap-6">
                     <span className="w-32 text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Issue Date:</span>
                     <input type="date" value={customerInfo.orderDate?.split('T')[0]} onChange={(e) => setCustomerInfo({...customerInfo, orderDate: e.target.value})} className="bg-white border-2 border-slate-100 focus:border-slate-900 rounded-xl px-4 py-2 text-xs font-black italic w-full transition-all outline-none" />
                  </div>
               </div>
               <div className="space-y-6">
                  <div className="flex items-center gap-6">
                     <span className="w-32 text-[10px] font-black text-slate-600 uppercase tracking-widest italic">PO / Ref:</span>
                     <input value={customerInfo.woNumber} onChange={(e) => setCustomerInfo({...customerInfo, woNumber: e.target.value})} className="bg-white border-2 border-slate-100 focus:border-slate-900 rounded-xl px-4 py-2 text-xs font-black italic w-full transition-all outline-none" />
                  </div>
                  <div className="flex items-center gap-6">
                     <span className="w-32 text-[10px] font-black text-slate-600 uppercase tracking-widest italic">Deadline:</span>
                     <input type="date" value={customerInfo.executionDate?.split('T')[0]} onChange={(e) => setCustomerInfo({...customerInfo, executionDate: e.target.value})} className="bg-white border-2 border-slate-100 focus:border-slate-900 rounded-xl px-4 py-2 text-xs font-black italic w-full transition-all outline-none" />
                  </div>
               </div>
            </div>

            <div className="mx-4">
              <table className="w-full text-left">
                <thead className="bg-slate-900 text-white">
                  <tr>
                    <th className="p-4 w-32 rounded-tl-3xl text-[10px] font-bold uppercase tracking-wider text-slate-300">Execution</th>
                    <th className="p-4 text-[10px] font-bold uppercase tracking-wider text-slate-300">Mission / Extra Service</th>
                    <th className="p-4 w-24 text-center text-[10px] font-bold uppercase tracking-wider text-slate-300">Qty</th>
                    <th className="p-4 w-32 text-right text-[10px] font-bold uppercase tracking-wider text-slate-300">Rate</th>
                    <th className="p-4 w-24 text-center text-[10px] font-bold uppercase tracking-wider text-slate-300">VAT %</th>
                    <th className="p-4 w-32 text-right text-[10px] font-bold uppercase tracking-wider text-slate-300">VAT Amt</th>
                    <th className="p-4 w-40 text-right rounded-tr-3xl pr-8 text-[10px] font-bold uppercase tracking-wider text-slate-300">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 border-x border-b border-slate-100 rounded-b-3xl">
                  {editableItems.map((item, idx) => (
                    <tr key={item.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="p-4 align-top">
                         <p className="text-[10px] font-bold text-slate-500 mt-2">{formatDate(customerInfo.executionDate)}</p>
                      </td>
                      <td className="p-4 space-y-2">
                        <input 
                           value={item.description} 
                           onChange={(e) => { const newItems = [...editableItems]; newItems[idx].description = e.target.value; setEditableItems(newItems); }} 
                           className="w-full bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-slate-900 text-[11px] font-bold text-slate-800 transition-all outline-none py-1 uppercase"
                        />
                        {idx === 0 && (
                          <input 
                             value={item.route} 
                             onChange={(e) => { const newItems = [...editableItems]; newItems[idx].route = e.target.value; setEditableItems(newItems); }} 
                             className="w-full bg-transparent text-[9px] font-semibold text-slate-500 uppercase tracking-wider outline-none"
                          />
                        )}
                      </td>
                      <td className="p-4 align-top">
                        <input 
                           type="number" 
                           value={item.qty} 
                           onChange={(e) => { const newItems = [...editableItems]; newItems[idx].qty = Number(e.target.value); setEditableItems(newItems); }} 
                           className="w-full bg-slate-50 rounded-lg py-2 text-center text-[11px] font-bold text-slate-800 outline-none border border-transparent focus:border-slate-200 mt-1"
                        />
                      </td>
                      <td className="p-4 align-top">
                        <input 
                           type="text" 
                           value={new Intl.NumberFormat('id-ID').format(item.price || 0)} 
                           onChange={(e) => { 
                             const rawVal = e.target.value.replace(/\D/g, '');
                             const newItems = [...editableItems]; 
                             newItems[idx].price = Number(rawVal); 
                             setEditableItems(newItems); 
                           }} 
                           className="w-full bg-slate-50 rounded-lg py-2 text-right px-3 text-[11px] font-bold text-slate-800 outline-none border border-transparent focus:border-slate-200 mt-1"
                        />
                      </td>
                      <td className="p-4 align-top text-center">
                        <select 
                           value={item.taxId}
                           onChange={(e) => {
                              const newItems = [...editableItems];
                              const selectedId = e.target.value;
                              const selectedTax = taxOptions.find(t => t.id === selectedId);
                              
                              newItems[idx].taxId = selectedId;
                              newItems[idx].isTaxable = selectedTax ? selectedTax.rate !== 0 : false;
                              newItems[idx].taxRate = selectedTax ? selectedTax.rate : 0;
                              
                              setEditableItems(newItems);
                           }}
                           className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-2 text-[10px] font-bold text-slate-700 outline-none transition-all focus:border-indigo-500 mt-1"
                        >
                           {taxOptions.map(tax => (
                             <option key={tax.id} value={tax.id}>{tax.name}</option>
                           ))}
                        </select>
                      </td>
                      <td className="p-4 align-top text-right text-[10px] font-bold text-indigo-600 pt-6">
                         {(() => {
                            const currentTax = taxOptions.find(t => t.id === item.taxId);
                            if (!currentTax || currentTax.rate === 0 || !item.isTaxable) {
                              return '-';
                            }
                            const val = (item.qty * item.price * (currentTax.rate / 100));
                            return formatRupiah(val).replace('Rp', '');
                         })()}
                      </td>
                      <td className="p-4 align-top text-right pr-8 text-[11px] font-bold text-slate-900 pt-6">
                         {formatRupiah(item.qty * item.price).replace('Rp', '')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-between items-start mt-16 px-4 gap-24">
               <div className="flex-1">
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-6 italic">Additional Terms & Notes</p>
                  <textarea 
                     placeholder="Enter special instructions for client billing..."
                     className="w-full bg-slate-50 border-2 border-slate-100 focus:border-slate-900 rounded-[2rem] p-8 text-xs font-bold text-slate-600 h-40 transition-all outline-none"
                  />
               </div>
               <div className="w-80 space-y-6">
                  <div className="flex justify-between items-center text-[11px] font-black uppercase italic text-slate-600">
                     <span>Subtotal Balance</span>
                     <span>{formatRupiah(totals.subtotal)}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px] font-black uppercase italic text-blue-500">
                     <span>Total Tax Liability</span>
                     <span className="font-black">+{formatRupiah(totals.totalTax)}</span>
                  </div>
                  <div className="pt-8 border-t-8 border-slate-900 text-right">
                     <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2 italic">Consolidated Total Due:</p>
                     <h3 className="text-4xl font-black text-slate-900 italic tracking-tighter leading-none">{formatRupiah(totals.grandTotal)}</h3>
                  </div>

                  <div className="flex flex-col gap-4 pt-8">
                     <Button 
                        onClick={() => setShowPrintPreview(true)} 
                        className="w-full h-16 border border-slate-700 bg-slate-900 text-white hover:bg-black rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg shadow-slate-900/20"
                     >
                        <Printer size={18} /> PREVIEW INVOICE
                     </Button>
                     <Button 
                        onClick={async () => {
                           try {
                             // 1. Update Base Price & Tax
                             const baseItem = editableItems.find(i => i.id === 'base');
                             if (baseItem) {
                               const { error: joErr } = await supabase.from('job_orders').update({ 
                                 base_price: baseItem.price,
                                 tax_id: baseItem.taxId?.includes('fallback') ? null : baseItem.taxId 
                               }).eq('id', jo.id);
                               if (joErr) throw joErr;
                             }
                             // 2. Update Extra Costs & Tax
                             for (const item of editableItems) {
                               if (item.id !== 'base') {
                                 const { error: costErr } = await supabase.from('extra_costs').update({ 
                                   amount: item.price,
                                   description: item.description,
                                   tax_id: item.taxId?.includes('fallback') ? null : item.taxId
                                 }).eq('id', item.id);
                                 if (costErr) throw costErr;
                               }
                             }
                             toast.success('Draft Saved Successfully');
                             await onRefresh();
                           } catch (err: any) {
                             console.error('Save Draft Error:', err);
                             toast.error(`Gagal menyimpan: ${err.message || 'Unknown error'}`);
                           }
                        }} 
                        className="w-full h-20 bg-slate-900 text-white hover:bg-black rounded-2xl font-black text-[12px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-lg shadow-slate-900/20"
                     >
                        <Check size={20} /> SAVE TO DRAFT
                     </Button>
                     <Button 
                        onClick={() => onGenerate(jo.id)} 
                        className="w-full h-20 bg-slate-900 text-white hover:bg-black rounded-2xl font-black text-[12px] uppercase tracking-widest shadow-2xl shadow-slate-900/20 transition-all flex items-center justify-center gap-3"
                     >
                        {jo.status === 'invoiced' ? (
                           <>CONFIRM PAYMENT & CLOSE <CheckCircle2 size={20} /></>
                        ) : (
                           <>GENERATE & LOCK <CheckCircle2 size={20} /></>
                        )}
                     </Button>
                  </div>
               </div>
            </div>
         </div>
      </div>
    </div>
  );
};

export default function HQInvoiceCustomerPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const [reviewingJo, setReviewingJo] = useState<any | null>(null);
  const [showPrintPreview, setShowPrintPreview] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const { data: jos, error: joError } = await supabase
        .from('job_orders')
        .select(`
          id, jo_number, status, base_price, driver_phone, tax_id,
          updated_at, created_at,
          transporter:transporter_id(name),
          fleet:md_fleets(plate_number, fleet_type:md_fleet_types(type_name)),
          wo_item:wo_items(
            id, item_data,
            wo:work_orders(
              id, wo_number, created_at, execution_date,
              customer:md_entities!customer_id(id, name, legal_name, billing_method, billing_address, billing_city, phone)
            )
          )
        `)
        .in('status', ['pekerjaan selesai', 'PEKERJAAN SELESAI', 'completed', 'COMPLETED', 'done', 'DONE', 'awaiting_audit', 'AWAITING_AUDIT', 'ready_for_billing', 'READY_FOR_BILLING', 'invoiced', 'INVOICED', 'paid', 'PAID'])
        .order('updated_at', { ascending: false });

      if (joError) throw joError;

      const joIds = jos?.map(j => j.id) || [];
      const { data: costs, error: costError } = await supabase
        .from('extra_costs')
        .select('*')
        .eq('status', 'approved')
        .in('jo_id', joIds);

      if (costError) throw costError;

      const hydrated = (jos || []).map(j => {
        const joCosts = (costs || []).filter(c => c.jo_id === j.id);
        const totalAddCost = joCosts.reduce((sum, c) => sum + Number(c.amount), 0);
        return {
          ...j,
          total_billing: Number(j.base_price) + totalAddCost,
          extra_costs: joCosts
        };
      });

      setData(hydrated);
    } catch (err: any) {
      console.error('Fetch Error Detail:', err);
      if (err.code === 'PGRST204' || err.message?.includes('column "tax_id" does not exist')) {
        toast.error('Database belum siap: Silakan jalankan file SQL add_tax_id_to_orders.sql di Supabase.');
      } else {
        toast.error('Gagal mengambil data penagihan');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const customerName = item.wo_item?.wo?.customer?.legal_name || item.wo_item?.wo?.customer?.name || '';
      const matchesSearch = item.jo_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          customerName.toLowerCase().includes(searchTerm.toLowerCase());
      
      let matchesTab = false;
      if (activeTab === 'sbu_processing') matchesTab = !['ready_for_billing', 'invoiced', 'paid'].includes(item.status);
      else if (activeTab === 'pending') matchesTab = item.status === 'ready_for_billing';
      else if (activeTab === 'invoiced') matchesTab = item.status === 'invoiced';
      else if (activeTab === 'paid') matchesTab = item.status === 'paid';

      return matchesSearch && matchesTab;
    });
  }, [data, searchTerm, activeTab]);

  const stats = useMemo(() => {
    const processing = data.filter(d => !['ready_for_billing', 'invoiced', 'paid'].includes(d.status));
    const pending = data.filter(d => d.status === 'ready_for_billing');
    const invoiced = data.filter(d => d.status === 'invoiced');
    const paid = data.filter(d => d.status === 'paid');
    
    return {
      processingCount: processing.length,
      processingTotal: processing.reduce((sum, d) => sum + d.total_billing, 0),
      pendingCount: pending.length,
      pendingTotal: pending.reduce((sum, d) => sum + d.total_billing, 0),
      invoicedCount: invoiced.length,
      invoicedTotal: invoiced.reduce((sum, d) => sum + d.total_billing, 0),
      paidCount: paid.length,
      paidTotal: paid.reduce((sum, d) => sum + d.total_billing, 0),
    };
  }, [data]);

  const handleGenerateInvoice = async (joId: string) => {
     try {
       const targetJo = data.find(j => j.id === joId);
       const nextStatus = targetJo?.status === 'invoiced' ? 'paid' : 'invoiced';

       const { error } = await supabase.from('job_orders').update({ status: nextStatus }).eq('id', joId);
       if (error) throw error;
       
       // Sync with wo_items
       if (targetJo?.wo_item?.id) {
         await supabase.from('wo_items').update({ status: nextStatus }).eq('id', targetJo.wo_item.id);
       }

       // Trigger Notification for SBU
       await sendNotification(profile?.tenant_id || '', {
         title: nextStatus === 'paid' ? 'Payment Confirmed' : 'Invoice Generated',
         message: (targetJo?.jo_number || '') + ' status is now ' + nextStatus.toUpperCase(),
         link: '/sbu/trucking/assignments?q=' + (targetJo?.jo_number || ''),
         role: 'SBU_OPS'
       });

       toast.success(nextStatus === 'paid' ? 'Mission successfully marked as PAID' : 'Invoice Generated Successfully');
       setReviewingJo(null); fetchData();
     } catch (err) { toast.error('Gagal memperbarui status penagihan'); }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6 lg:p-12 font-sans">
      <Toaster position="top-right" />
      {reviewingJo && (
        <InvoiceReviewModal 
          jo={reviewingJo} 
          onClose={() => { setReviewingJo(null); setShowPrintPreview(false); }} 
          profile={profile}
          onRefresh={fetchData}
          onGenerate={handleGenerateInvoice}
          initialPrintMode={showPrintPreview}
        />
      )}
      
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div className="flex items-center gap-8">
            <div className="w-16 h-16 bg-slate-900 rounded-[1.5rem] flex items-center justify-center shadow-2xl rotate-3">
              <Banknote size={32} className="text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black text-slate-900 italic uppercase tracking-tighter leading-none mb-3">INVOICE CUSTOMER</h1>
              <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em] flex items-center gap-2 italic">
                <ShieldCheck size={14} /> HQ Collections & AR Ledger
              </p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-5">
             <div className="relative group min-w-[320px]">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-slate-900 transition-colors" size={20} />
                <input 
                  type="text" 
                  placeholder="Find Customer or JO#..." 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                  className="h-16 w-full bg-white rounded-3xl pl-16 pr-8 text-[11px] font-black uppercase tracking-widest shadow-lg shadow-slate-200/50 border-none focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none" 
                />
             </div>
             <div className="flex items-center gap-2 bg-white p-2 rounded-[2rem] shadow-lg shadow-slate-200/50 border border-slate-50">
                 {['sbu_processing', 'pending', 'invoiced', 'paid'].map(tab => (
                  <button 
                    key={tab} 
                    onClick={() => setActiveTab(tab)} 
                    className={"px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 " + (
                      activeTab === tab ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-900 hover:bg-slate-50'
                    )}
                  >
                    {tab === 'pending' ? 'READY INVOICE' : tab === 'sbu_processing' ? 'DOC PENDING' : tab}
                    <Badge className={(activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'bg-slate-50 text-slate-400') + ' border-none text-[8px] px-2 py-0.5'}>
                       {tab === 'sbu_processing' ? stats.processingCount : tab === 'pending' ? stats.pendingCount : tab === 'invoiced' ? stats.invoicedCount : stats.paidCount}
                    </Badge>
                  </button>
                ))}
             </div>
          </div>
        </div>

        {/* Dynamic Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
           <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/40 p-8 bg-white group hover:scale-[1.02] transition-all border-l-8 border-amber-400">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-2">Awaiting Generation</p>
              <h3 className="text-3xl font-black text-amber-500 italic tracking-tighter mb-4">{formatRupiah(stats.pendingTotal)}</h3>
              <Badge className="bg-amber-50 text-amber-600 border-none font-black text-[9px] px-3 py-1 uppercase">{stats.pendingCount} MISSIONS</Badge>
           </Card>
           <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/40 p-8 bg-white group hover:scale-[1.02] transition-all border-l-8 border-blue-400">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-2">Total Open Receivables</p>
              <h3 className="text-3xl font-black text-blue-600 italic tracking-tighter mb-4">{formatRupiah(stats.invoicedTotal)}</h3>
              <Badge className="bg-blue-50 text-blue-600 border-none font-black text-[9px] px-3 py-1 uppercase">{stats.invoicedCount} ACTIVE INVOICES</Badge>
           </Card>
           <Card className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/40 p-8 bg-white group hover:scale-[1.02] transition-all border-l-8 border-emerald-400">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-2">Real-time Collections</p>
              <h3 className="text-3xl font-black text-emerald-600 italic tracking-tighter mb-4">{formatRupiah(stats.paidTotal)}</h3>
              <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px] px-3 py-1 uppercase">{stats.paidCount} PAID SETTLED</Badge>
           </Card>
           <Button className="h-full bg-slate-900 hover:bg-black text-white rounded-[2.5rem] p-10 flex flex-col items-start justify-center gap-2 group transition-all shadow-xl shadow-slate-900/20">
              <Layers size={24} className="mb-2 group-hover:rotate-12 transition-transform text-white/50 group-hover:text-white" />
              <p className="text-[11px] font-black uppercase tracking-widest italic">Consolidate All</p>
              <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
           </Button>
        </div>

        {/* Data List Section */}
        <div className="space-y-6">
           {loading ? (
             <div className="h-[400px] flex flex-col items-center justify-center gap-6">
                <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest animate-pulse">Syncing Global Ledger...</p>
             </div>
           ) : filteredData.length === 0 ? (
             <Card className="h-[400px] rounded-[3rem] border-4 border-dashed border-slate-100 bg-white flex flex-col items-center justify-center">
                <BadgeCheck size={80} className="text-slate-100 mb-6" />
                <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest italic">All Missions Accounted For</p>
             </Card>
           ) : (
             <div className="grid grid-cols-1 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                {filteredData.map((item) => (
                  <Card 
                    key={item.id} 
                    className="rounded-[2.5rem] border-none shadow-xl shadow-slate-200/50 bg-white hover:scale-[1.01] transition-all cursor-pointer group"
                  >
                    <div className="flex flex-col lg:flex-row min-h-[160px]">
                       <div className="flex-1 p-8 flex items-center gap-8">
                          <div className="w-16 h-16 bg-slate-50 text-slate-400 group-hover:text-slate-900 rounded-[1.25rem] flex items-center justify-center transition-colors">
                             <Receipt size={32} />
                          </div>
                          <div className="flex-1">
                             <div className="flex items-center gap-4 mb-3">
                                <h2 className="text-2xl font-black text-slate-900 italic tracking-tighter uppercase leading-none">{item.jo_number}</h2>
                                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">WO: {item.wo_item?.wo?.wo_number}</span>
                             </div>
                             <div className="flex flex-wrap items-center gap-8">
                                <div>
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Target Account</p>
                                   <p className="text-sm font-black text-indigo-600 uppercase italic truncate max-w-[200px]">{item.wo_item?.wo?.customer?.legal_name || item.wo_item?.wo?.customer?.name}</p>
                                </div>
                                <div className="h-8 w-[1px] bg-slate-100 hidden md:block"></div>
                                <div>
                                   <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Mission Route</p>
                                   <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest italic flex flex-wrap items-center gap-2">
                                      {item.wo_item?.item_data?.origin_name || item.wo_item?.item_data?.shipper_name || item.wo_item?.item_data?.shipper_city || 'Origin'} <ChevronRight size={10} /> {item.wo_item?.item_data?.destination_name || item.wo_item?.item_data?.recipient_name || item.wo_item?.item_data?.recipient_city || 'Dest'}
                                   </p>
                                   <div className="flex flex-col gap-1 mt-1 opacity-0 h-0 group-hover:opacity-100 group-hover:h-auto transition-all duration-300">
                                      <p className="text-[9px] text-slate-500 font-medium whitespace-normal">
                                         <span className="font-bold text-slate-700">Origin:</span> {item.wo_item?.item_data?.shipper_name || 'N/A'} - {item.wo_item?.item_data?.shipper_address || 'No Address'}
                                      </p>
                                      <p className="text-[9px] text-slate-500 font-medium whitespace-normal">
                                         <span className="font-bold text-slate-700">Dest:</span> {item.wo_item?.item_data?.recipient_name || 'N/A'} - {item.wo_item?.item_data?.recipient_address || 'No Address'}
                                      </p>
                                   </div>
                                   {item.wo_item?.item_data?.locations && item.wo_item.item_data.locations.length > 2 && (
                                     <div className="flex items-center gap-1.5 mt-1">
                                        <Activity size={10} className="text-orange-500" />
                                        <p className="text-[9px] font-bold text-orange-500 uppercase italic">Multi-Stop ({item.wo_item.item_data.locations.length} Stops)</p>
                                     </div>
                                   )}
                                </div>
                             </div>
                          </div>
                       </div>
                       
                       <div className="lg:w-96 bg-slate-50/50 p-8 flex items-center justify-between border-l border-slate-50 group-hover:bg-indigo-50/30 transition-colors">
                          <div className="text-right flex-1 pr-10">
                             <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-1">Billing Value</p>
                             <p className="text-2xl font-black text-slate-900 italic tracking-tighter">{formatRupiah(item.total_billing)}</p>
                          </div>
                          <div>
                             {activeTab === 'sbu_processing' ? (
                                <Badge className="bg-slate-100 text-slate-500 font-black px-4 py-2 border-none">WAITING DOC/COST</Badge>
                             ) : item.status === 'ready_for_billing' ? (
                                <Button onClick={() => setReviewingJo(item)} className="h-14 w-14 bg-slate-900 text-white hover:bg-black rounded-2xl flex items-center justify-center shadow-xl shadow-slate-900/10">
                                   <ArrowRight size={24} />
                                </Button>
                             ) : (
                                <div className="flex items-center gap-3">
                                   <button 
                                       onClick={async (e) => { 
                                          e.stopPropagation(); 
                                          if(confirm('Mark this invoice as PAID?')) {
                                             try { 
                                                const { error } = await supabase.from('job_orders').update({ status: 'paid' }).eq('id', item.id); 
                                                if (error) throw error; 

                                                if (item.wo_item?.id) {
                                                  await supabase.from('wo_items').update({ status: 'paid' }).eq('id', item.wo_item.id);
                                                }

                                                toast.success('Invoice marked as PAID'); 
                                                fetchData(); 
                                             } catch (err) { toast.error('Gagal update status'); } 
                                          }
                                       }} 
                                       className="w-12 h-12 bg-white border-2 border-slate-200 text-slate-400 hover:text-emerald-500 hover:border-emerald-500 rounded-xl flex items-center justify-center transition-all"
                                       title="Mark as Paid"
                                    >
                                       <CheckCircle2 size={18} />
                                    </button>
                                   <button onClick={() => { setReviewingJo(item); setShowPrintPreview(true); }} className="w-12 h-12 bg-white border-2 border-slate-200 text-slate-400 hover:text-indigo-600 hover:border-indigo-600 rounded-xl flex items-center justify-center transition-all" title="Print Invoice"><Printer size={18} /></button>
                                   <button onClick={async (e) => { e.stopPropagation(); try { const { error } = await supabase.from('job_orders').update({ status: 'ready_for_billing' }).eq('id', item.id); if (error) throw error; toast.success('Reverted to Draft'); fetchData(); } catch (err) { toast.error('Gagal revert'); } }} className="w-12 h-12 bg-white border-2 border-slate-200 text-slate-400 hover:text-rose-500 hover:border-rose-500 rounded-xl flex items-center justify-center transition-all" title="Revert to Draft"><Clock size={18} /></button>
                                </div>
                             )}
                          </div>
                       </div>
                    </div>
                  </Card>
                ))}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
