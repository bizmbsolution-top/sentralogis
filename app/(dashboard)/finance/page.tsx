"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { supabase as supabaseRaw } from "@/lib/supabase/client";
const supabase = supabaseRaw as any;
import { toast, Toaster } from "react-hot-toast";
import {
  FileText, Download, ChevronLeft, ChevronRight, Calendar, Filter, 
  CheckCircle2, HardHat, Truck, Ship, Warehouse, 
  Table, List, Check, Search, BarChart3, TrendingUp, Package, Loader2, Activity, Banknote, Inbox, X, ChevronDown, MapPin, Building2, RefreshCw,
  FileSpreadsheet, Printer, ArrowRight, ShieldCheck, AlertCircle, Wallet, CreditCard, Receipt, Upload, Trash2, Image as ImageIcon,
  ArrowUpRight, Target, Clock, Coins, FileJson, Layers, FileSignature, PlusCircle, Sparkles, User, Info, Edit3, Eye, RotateCcw, LogOut
} from "lucide-react";

export default function FinanceDashboard() {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"AR" | "AP">("AR");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [data, setData] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [tenant, setTenant] = useState<any>(null);
  
  const [arStats, setArStats] = useState({
    awaiting_doc: { total: 0, count: 0 },
    awaiting_invoice: { total: 0, count: 0 },
    awaiting_payment: { total: 0, count: 0 },
    total_revenue: { total: 0, count: 0 }
  });

  const [apStats, setApStats] = useState({
    awaiting_settlement: { total: 0, count: 0 },
    outstanding_payables: { total: 0, count: 0 }
  });

  const [selectedJO, setSelectedJO] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [transferProofUrl, setTransferProofUrl] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [taxRate, setTaxRate] = useState(11); 
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [rejectionNote, setRejectionNote] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setCurrentUser(profile || { full_name: user.email?.split('@')[0] || 'ADM' });
        
        if (profile?.organization_id) {
           const { data: org } = await supabase.from('organizations').select('*').eq('id', profile.organization_id).single();
           setTenant(org);
        }
      }
    };
    getUser();
  }, []);

  const fetchFinanceData = useCallback(async () => {
    if (!currentUser?.organization_id) return;
    setLoading(true);
    try {
      const { data: jos, error } = await supabase
        .from('job_orders')
        .select(`
          *, 
          work_order_items (
            *, 
            work_orders (
              *, 
              customers (*)
            ),
            origin_location:origin_location_id (*),
            destination_location:destination_location_id (*)
          ), 
          cash_advances (*), 
          extra_costs (*), 
          documents (*),
          drivers (*),
          fleets (
            *,
            companies (*)
          )
        `)
        .eq('organization_id', currentUser.organization_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      const validJos = jos || [];
      setData(validJos);
      
      const calcArTotal = (j: any) => {
          const base = j.work_order_items?.deal_price || 0;
          const extras = j.extra_costs?.reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0) || 0;
          const tax = base * (taxRate / 100);
          return base + extras + tax;
      };

      const calcApTotal = (j: any) => {
          const cas = j.cash_advances?.reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0) || 0;
          const extras = j.extra_costs?.reduce((sum: number, c: any) => sum + (Number(c.amount) || 0), 0) || 0;
          return cas + extras;
      };

      const ar_awaiting_doc = validJos.filter((j: any) => j.status === 'done' && !j.physical_doc_received);
      const ar_awaiting_invoice = validJos.filter((j: any) => j.status === 'done' && j.physical_doc_received && j.billing_status !== 'invoiced');
      const ar_awaiting_payment = validJos.filter((j: any) => j.billing_status === 'invoiced' && j.finance_status !== 'paid');
      const ar_total_rev = validJos.filter((j: any) => ['done', 'invoiced'].includes(j.status) || j.billing_status === 'invoiced');

      setArStats({
        awaiting_doc: { total: ar_awaiting_doc.reduce((acc, j) => acc + calcArTotal(j), 0), count: ar_awaiting_doc.length },
        awaiting_invoice: { total: ar_awaiting_invoice.reduce((acc, j) => acc + calcArTotal(j), 0), count: ar_awaiting_invoice.length },
        awaiting_payment: { total: ar_awaiting_payment.reduce((acc, j) => acc + calcArTotal(j), 0), count: ar_awaiting_payment.length },
        total_revenue: { total: ar_total_rev.reduce((acc, j) => acc + (j.work_order_items?.deal_price || 0), 0), count: ar_total_rev.length }
      });

      const ap_awaiting_settlement = validJos.filter((j: any) => (j.cash_advances?.length > 0 || j.extra_costs?.length > 0) && j.finance_status !== 'paid');
      const ap_outstanding = validJos.filter((j: any) => j.finance_status !== 'paid' && (j.vendor_invoice_number || j.cash_advances?.length > 0));

      setApStats({
        awaiting_settlement: { total: ap_awaiting_settlement.reduce((acc, j) => acc + calcApTotal(j), 0), count: ap_awaiting_settlement.length },
        outstanding_payables: { total: ap_outstanding.reduce((acc, j) => acc + calcApTotal(j), 0), count: ap_outstanding.length }
      });

    } catch (err) {
      console.error(err);
      toast.error("Data Sync Failed");
    } finally {
      setLoading(false);
    }
  }, [taxRate, currentUser?.organization_id]);

  useEffect(() => { fetchFinanceData(); }, [fetchFinanceData]);

  const handleRejectToSBU = async () => {
    if (!rejectionNote) { toast.error("Please provide a reason for rejection"); return; }
    setIsSubmitting(true);
    try {
        const { error } = await supabase
            .from('job_orders')
            .update({ 
                billing_status: 'rejected',
                finance_status: null,
                rejection_note: rejectionNote
            })
            .eq('id', selectedJO.id);
        if (error) throw error;
        toast.success("Job returned to SBU Trucking for revision");
        setShowDetailModal(false);
        setRejectionNote("");
        setShowRejectForm(false);
        fetchFinanceData();
    } catch (error: any) {
        toast.error(error.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const generateAutoInvoiceNumber = async () => {
    if (!selectedJO) return;
    const userInit = (currentUser?.full_name || 'ADM').split(' ').map((n: string) => n[0]).join('').toUpperCase();
    const custName = selectedJO.work_order_items?.work_orders?.customers?.company_name || 'CUST';
    const custInit = custName.split(' ').filter((w: string) => !['PT', 'CV', 'UD'].includes(w.toUpperCase())).map((n: string) => n[0]).join('').substring(0, 3).toUpperCase();
    const sbuCode = 'TR'; 
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yy = String(now.getFullYear()).substring(2);
    const dateCode = `${mm}${yy}`;
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
    const { count } = await supabase
        .from('job_orders')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', currentUser.organization_id)
        .not('ar_invoice_number', 'is', null)
        .gte('invoiced_at', startOfMonth);
    const seq = String((count || 0) + 1).padStart(4, '0');
    const finalNumber = `INV/${userInit}-${custInit}/${sbuCode}-${dateCode}/${seq}`;
    setInvoiceNumber(finalNumber);
    toast.success("Reference Number Generated");
  };

  const handleCreateInvoice = async () => {
    if (!invoiceNumber) { toast.error("Invoice ID Required"); return; }
    setIsSubmitting(true);
    try {
        const base = selectedJO.work_order_items?.deal_price || 0;
        const tax = base * (taxRate / 100);
        const { error } = await supabase
            .from('job_orders')
            .update({ 
                finance_status: 'invoiced',
                ar_invoice_number: invoiceNumber,
                invoiced_at: new Date().toISOString(),
                tax_amount: tax,
                tax_rate: taxRate,
                billing_status: 'invoiced'
            })
            .eq('id', selectedJO.id);
        if (error) throw error;
        toast.success("Document Authenticated & Saved");
        setShowDetailModal(false);
        setShowReviewModal(false);
        fetchFinanceData();
    } catch (error: any) {
        toast.error(error.message);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleTRUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedJO) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `finance-receipts/${selectedJO.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath);

      setTransferProofUrl(publicUrl);
      toast.success("Payment receipt synchronized");
    } catch (error: any) {
        toast.error("Upload failed: " + error.message);
    } finally {
        setUploading(false);
    }
  };

  const filteredData = data.filter(jo => {
    const searchStr = `${jo.jo_number} ${jo.ar_invoice_number || ''} ${jo.work_order_items?.work_orders?.customers?.company_name || ''}`.toLowerCase();
    const searchMatch = searchStr.includes(searchTerm.toLowerCase());
    if (!searchMatch) return false;

    if (activeTab === 'AP') {
        const hasAwaitingAP = (jo.cash_advances?.length > 0 || jo.extra_costs?.length > 0) && jo.finance_status !== 'paid';
        const isOutstandingAP = jo.finance_status !== 'paid' && (jo.vendor_invoice_number || jo.cash_advances?.length > 0);
        
        if (activeCategory === 'awaiting_settlement') return hasAwaitingAP;
        if (activeCategory === 'outstanding_payables') return isOutstandingAP;
        return (jo.vendor_invoice_number || jo.cash_advances?.length > 0);
    }

    if (activeCategory === 'all') return true;
    if (activeCategory === 'awaiting_doc') return (jo.status === 'done' && !jo.physical_doc_received);
    if (activeCategory === 'awaiting_invoice') return (jo.status === 'done' && jo.physical_doc_received && jo.billing_status !== 'invoiced');
    if (activeCategory === 'awaiting_payment') return (jo.billing_status === 'invoiced' && jo.finance_status !== 'paid');
    if (activeCategory === 'total_revenue') return ['done', 'invoiced'].includes(jo.status) || jo.billing_status === 'invoiced';
    return true;
  });

  const categories = activeTab === 'AR' ? [
    { id: 'awaiting_doc', label: 'Awaiting Document', desc: 'WO Done Incomplete', count: arStats.awaiting_doc.count, total: arStats.awaiting_doc.total, icon: Clock, color: 'text-orange-500', dot: 'bg-orange-500', border: 'border-orange-500' },
    { id: 'awaiting_invoice', label: 'Awaiting Invoice', desc: 'Docs Completed', count: arStats.awaiting_invoice.count, total: arStats.awaiting_invoice.total, icon: FileText, color: 'text-blue-500', dot: 'bg-blue-500', border: 'border-blue-500' },
    { id: 'awaiting_payment', label: 'Outstanding Payment', desc: 'Invoice Submitted', count: arStats.awaiting_payment.count, total: arStats.awaiting_payment.total, icon: AlertCircle, color: 'text-rose-500', dot: 'bg-rose-500', border: 'border-rose-500' },
    { id: 'total_revenue', label: 'Total Revenue', desc: 'Basic Price Deal', count: arStats.total_revenue.count, total: arStats.total_revenue.total, icon: BarChart3, color: 'text-emerald-500', dot: 'bg-emerald-500', border: 'border-emerald-500' }
  ] : [
    { id: 'awaiting_settlement', label: 'Awaiting Settlement', desc: 'CA, Costs & Vendor', count: apStats.awaiting_settlement.count, total: apStats.awaiting_settlement.total, icon: Wallet, color: 'text-amber-500', dot: 'bg-amber-500', border: 'border-amber-500' },
    { id: 'outstanding_payables', label: 'Outstanding Payables', desc: 'Total Debt', count: apStats.outstanding_payables.count, total: apStats.outstanding_payables.total, icon: List, color: 'text-slate-500', dot: 'bg-slate-500', border: 'border-slate-500' }
  ];

  const basePrice = selectedJO?.work_order_items?.deal_price || 0;
  const extraTotal = selectedJO?.extra_costs?.reduce((acc: number, c: any) => acc + (Number(c.amount) || 0), 0) || 0;
  const taxAmount = basePrice * (taxRate / 100);
  const arTotal = basePrice + extraTotal + taxAmount;
  const apTotal = selectedJO?.cash_advances?.reduce((acc: number, c: any) => acc + (Number(c.amount) || 0), 0) || 0;
  const grandTotal = activeTab === 'AR' ? arTotal : apTotal;

  return (
    <div className="min-h-screen bg-[#F8FAFC] font-sans">
      <Toaster position="top-right" />
      <div className="max-w-[1500px] mx-auto px-6 py-6 md:px-12 md:py-8 space-y-8">
        <header className="flex justify-between items-center px-10 py-5 bg-white/90 backdrop-blur-md sticky top-0 z-[100] border-b border-slate-100 no-print">
           <div className="flex items-center gap-4">
              <Link href="/admin" className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-white shadow-xl hover:bg-emerald-600 transition-all mr-2">
                 <ChevronLeft className="w-5 h-5" />
              </Link>
              <div className="w-11 h-11 bg-slate-100 rounded-xl flex items-center justify-center text-slate-900 shadow-sm overflow-hidden border border-slate-200">
                 <div className="font-black italic text-sm">SL</div>
              </div>
              <div>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">FISCAL TERMINAL</p>
                 <h1 className="text-sm font-black italic tracking-tighter text-slate-900 uppercase leading-none">{tenant?.name || 'CENTRAL SYSTEM'}</h1>
              </div>
           </div>

           <div className="flex items-center gap-6">
              <div className="hidden lg:flex items-center gap-2.5 bg-slate-50 px-4 py-2.5 rounded-xl border border-slate-100 shadow-inner">
                 <div className="w-8 h-8 bg-amber-500 rounded-lg flex items-center justify-center text-white shadow-lg shadow-amber-200"><Wallet className="w-4 h-4" /></div>
                 <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none mb-0.5">CREDITS</p>
                    <p className="text-[12px] font-black italic text-slate-900 tracking-tighter leading-none uppercase">{tenant?.mission_credits || 0} <span className="text-[8px] text-slate-400 not-italic ml-0.5 font-bold">TOKENS</span></p>
                 </div>
              </div>

              <div className="relative group hidden md:block">
                 <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                 <input 
                    type="text" 
                    placeholder="FIND OPERATIONS..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 pr-6 py-2.5 w-60 bg-slate-100/50 border border-transparent rounded-xl text-[9px] font-black uppercase tracking-widest focus:bg-white focus:border-slate-200 focus:ring-4 focus:ring-slate-50 transition-all outline-none text-slate-900 placeholder:text-slate-400"
                 />
              </div>

              <div className="flex items-center gap-2.5 border-l border-slate-100 pl-6">
                 <button className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all"><Printer className="w-4 h-4"/></button>
                 <button 
                   onClick={async () => { await supabase.auth.signOut(); window.location.href = '/'; }}
                   className="flex items-center gap-2 px-5 py-3 bg-rose-50 text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-rose-100 group shadow-lg shadow-rose-100/10"
                 >
                    <LogOut className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-[9px] font-black uppercase tracking-widest hidden lg:inline">Logout</span>
                 </button>
              </div>
           </div>
        </header>

        <div className="px-10 py-8 space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
           {/* 🧬 MISSION COMMAND HERO (COMPACT) */}
           <div className="bg-gradient-to-br from-[#020617] via-[#0F172A] to-[#020617] rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl border border-white/5">
              <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-emerald-500/5 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 opacity-50" />
              
              <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-6">
                 <div className="flex items-center gap-8">
                    <div className="w-20 h-20 bg-emerald-500/10 rounded-[1.8rem] flex items-center justify-center border border-emerald-500/20 shadow-inner backdrop-blur-xl">
                       <BarChart3 className="w-9 h-9 text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]" />
                    </div>
                    <div>
                       <div className="flex items-center gap-2.5 mb-2">
                          <span className="text-[9px] font-black text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-md uppercase tracking-widest italic border border-emerald-400/10">COCKPIT V2.0</span>
                          <div className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                       </div>
                       <h2 className="text-3xl font-black italic tracking-tighter uppercase leading-none mb-2 drop-shadow-md">{tenant?.name || 'SENTRALOGIS UTAMA'}</h2>
                       <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] italic opacity-80">COMMAND & FINANCE INTELLIGENCE ENVIRONMENT</p>
                    </div>
                 </div>

                 <div className="flex items-center gap-3">
                    <div className="bg-white/5 backdrop-blur-xl px-5 py-3.5 rounded-2xl border border-white/5 flex items-center gap-4 shadow-xl">
                       <div className="w-9 h-9 bg-amber-500/10 rounded-xl flex items-center justify-center text-amber-500"><Wallet className="w-5 h-5"/></div>
                       <div>
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest leading-none mb-0.5">AVAILABILITY</p>
                          <p className="text-lg font-black italic tracking-tighter uppercase">{tenant?.mission_credits || 0} <span className="text-[8px] text-slate-500 not-italic ml-0.5">TOKENS</span></p>
                       </div>
                    </div>
                    <div className="flex items-center gap-2 px-5 py-3 bg-emerald-500/5 rounded-full border border-emerald-500/10">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                       <span className="text-[9px] font-black text-emerald-400 uppercase tracking-widest italic opacity-60 px-1">SECURED</span>
                    </div>
                 </div>
              </div>
           </div>

           {/* 📊 MISSION OVERVIEW - REFINED GRID */}
           <div className="space-y-6">
              <div className="flex justify-between items-end px-2">
                 <h3 className="text-sm font-black italic uppercase tracking-tighter text-slate-900 border-l-4 border-slate-900 pl-4">MISSION OVERVIEW</h3>
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{filteredData.length} LIVE OPS</p>
              </div>

              <div className="flex gap-2.5 p-1.5 bg-slate-100 rounded-2xl w-full max-w-[360px] shadow-inner">
                 <button onClick={() => { setActiveTab('AR'); setActiveCategory('all'); }} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2.5 ${activeTab === 'AR' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><ArrowUpRight className="w-3.5 h-3.5"/> Revenue Hub</button>
                 <button onClick={() => { setActiveTab('AP'); setActiveCategory('all'); }} className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2.5 ${activeTab === 'AP' ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}><Coins className="w-3.5 h-3.5"/> Payout Hub</button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 {categories.map((cat) => (
                    <button key={cat.id} onClick={() => setActiveCategory(cat.id)} className={`relative p-8 rounded-[2rem] border transition-all text-left group overflow-hidden ${activeCategory === cat.id ? `${cat.border} bg-white shadow-xl -translate-y-1.5` : 'bg-white border-slate-100 hover:border-slate-200 hover:shadow-lg'}`}>
                       <div className="flex justify-between items-start mb-6">
                          <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${activeCategory === cat.id ? 'bg-slate-900 text-white shadow-lg' : 'bg-slate-50 text-slate-300 group-hover:bg-slate-900 group-hover:text-white'}`}><cat.icon className="w-5 h-5" /></div>
                          <p className={`text-4xl font-black italic tracking-tighter leading-none ${activeCategory === cat.id ? 'text-slate-900' : 'text-slate-100'}`}>{cat.count}</p>
                       </div>
                       <div>
                          <div className="flex items-center gap-1.5 mb-1.5">
                             <div className={`w-1.5 h-1.5 rounded-full ${cat.dot}`} />
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">{cat.label}</p>
                          </div>
                          <h4 className="text-[13px] font-black italic tracking-tighter text-slate-900 uppercase leading-none mb-1 opacity-80">{cat.desc}</h4>
                          <p className={`text-2xl font-black italic tracking-tighter leading-none mt-3 ${cat.color}`}>Rp {cat.total.toLocaleString('id-ID')}</p>
                       </div>
                    </button>
                 ))}
              </div>
           </div>

           <div className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden flex flex-col relative min-h-[500px]">

           <div className="flex-1 p-8 overflow-x-auto custom-scrollbar">
              <div className="min-w-[1000px] space-y-3">
                 {filteredData.map((jo, idx) => {
                    const baseWeight = jo.work_order_items?.deal_price || 0;
                    const taxWeight = jo.tax_amount || (baseWeight * (taxRate / 100));
                    const extraWeight = jo.extra_costs?.reduce((s:number,c:any)=>s+Number(c.amount),0) || 0;
                    const arSum = baseWeight + extraWeight + taxWeight;
                    const apSum = jo.cash_advances?.reduce((s:number,c:any)=>s+Number(c.amount),0) || 0;
                    
                    const displayAmt = activeTab === 'AR' ? arSum : apSum;
                    const title = activeTab === 'AR' ? jo.work_order_items?.work_orders?.customers?.company_name : (jo.fleets?.companies?.name || jo.drivers?.name || jo.external_driver_name || "Driver (Individual)");
                    const isRejected = jo.billing_status === 'rejected';
                    const isPaid = jo.finance_status === 'paid';
                    
                    const origin = jo.work_order_items?.origin_location?.name || 'TBA';
                    const destination = jo.work_order_items?.destination_location?.name || 'TBA';
                    
                    const rawDate = jo.work_order_items?.work_orders?.execution_date;
                    const d = rawDate ? new Date(rawDate) : new Date();
                    const day = d.getDate().toString().padStart(2, '0');
                    const month = d.toLocaleString('en-US', { month: 'short' }).toUpperCase();

                    return (
                       <div key={idx} className={`bg-white border border-slate-100 rounded-3xl flex items-center px-8 py-5 transition-all hover:bg-slate-50 hover:border-slate-200 group relative ${isPaid ? 'opacity-60 grayscale-[0.5]' : ''}`}>
                          <div className="flex-[3] flex gap-8 items-center">
                             {/* Date Badge */}
                             <div className="flex flex-col items-center justify-center min-w-[50px] py-1 border-r border-slate-100 pr-6">
                                <span className="text-xl font-black italic text-slate-900 leading-none">{day}</span>
                                <span className="text-[9px] font-black text-slate-400 tracking-widest leading-none mt-1">{month}</span>
                             </div>

                             {/* Profile Icon */}
                             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black italic border shadow-sm flex-shrink-0 ${isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-500' : (isRejected ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-900 text-white border-slate-800')}`}>{title?.charAt(0)}</div>
                             
                             <div className="max-w-[280px]">
                                <p className="text-[13px] font-black text-slate-900 uppercase italic leading-none truncate mb-2 tracking-tighter">{title}</p>
                                <div className="flex items-center gap-2">
                                   <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase italic border border-blue-100 leading-none">JO#{jo.jo_number?.split('-').pop()}</span>
                                   <span className="text-[9px] font-black text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md uppercase italic border border-slate-100 leading-none">WO#{jo.work_order_items?.work_orders?.wo_number?.split('/').pop()}</span>
                                </div>
                             </div>
                          </div>

                          {/* Route Display */}
                          <div className="flex-[2] flex flex-col items-center justify-center px-4">
                             <div className="flex items-center gap-3 w-full">
                                <div className="flex-1 text-right truncate"><p className="text-[10px] font-black text-slate-900 uppercase italic leading-none">{origin}</p></div>
                                <div className="flex flex-col items-center gap-1 group/route">
                                   <div className="w-8 h-px bg-slate-200 group-hover/route:bg-emerald-400 transition-colors" />
                                   <ArrowRight className="w-3 h-3 text-slate-300 group-hover/route:text-emerald-500 transition-colors" />
                                </div>
                                <div className="flex-1 truncate"><p className="text-[10px] font-black text-slate-900 uppercase italic leading-none">{destination}</p></div>
                             </div>
                             <p className="text-[9px] font-black text-slate-400 uppercase italic tracking-widest mt-2 opacity-50">{jo.work_order_items?.truck_type} • {jo.work_order_items?.weight_kg || 0}KG</p>
                          </div>

                          {/* Money Section */}
                          <div className="flex-1 text-right px-8">
                             <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 opacity-60">{activeTab === 'AR' ? 'BILLING TOTAL' : 'DISBURSEMENT'}</p>
                             <h4 className={`text-xl font-black italic tracking-tighter leading-none ${isPaid ? 'text-emerald-600' : 'text-slate-900'}`}>Rp {displayAmt.toLocaleString('id-ID')}</h4>
                          </div>

                          {/* Status Section */}
                          <div className="flex-1 flex flex-col items-center justify-center">
                             <div className={`px-4 py-2 rounded-xl border flex items-center gap-2 transition-all ${isPaid ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : (isRejected ? 'bg-rose-50 text-rose-600 border-rose-100 animate-pulse' : (jo.finance_status === 'invoiced' ? 'bg-blue-50 text-blue-600 border-blue-100 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-100'))}`}>
                                <ShieldCheck className={`w-3.5 h-3.5 ${isPaid ? 'animate-bounce' : ''}`} />
                                <span className="text-[9px] font-black uppercase italic tracking-widest">{isRejected ? 'REV. NEEDED' : (jo.finance_status?.toUpperCase() || 'WAITING')}</span>
                             </div>
                             {isPaid && <p className="text-[8px] font-bold text-emerald-500 uppercase italic mt-1.5 tracking-tighter">Settled Successfully</p>}
                          </div>

                          {/* Actions */}
                          <div className="w-[140px] text-right">
                             <button onClick={() => { 
                                 setSelectedJO(jo); 
                                 setShowDetailModal(true); 
                                 setInvoiceNumber(jo.ar_invoice_number || ""); 
                                 setTaxRate(jo.tax_rate || 11); 
                                 setTransferProofUrl("");
                                 setShowRejectForm(false); 
                             }} className={`w-full py-4 rounded-xl text-white text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2 ${isPaid ? 'bg-emerald-600 shadow-emerald-200/50' : (isRejected ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-200/50' : 'bg-[#0F172A] hover:bg-emerald-600 shadow-slate-300/50')}`}>{isPaid ? 'AUDIT TRAIL' : (isRejected ? 'E-REVISION' : 'TERMINAL')} <ArrowRight className="w-4 h-4"/></button>
                          </div>
                       </div>
                    );
                 })}
              </div>
           </div>
        </div>
      </div>

      {/* 🧬 FINANCE DETAIL MODAL */}
      {showDetailModal && selectedJO && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-[500] p-4 animate-in fade-in duration-300 no-print">
           <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[92vh] border border-white/20 animate-in zoom-in-95 duration-500">
              <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                 <div className="flex items-center gap-6">
                    <div className="w-14 h-14 bg-slate-900 rounded-[1.5rem] flex items-center justify-center text-emerald-400 shadow-2xl font-black italic text-xl">SL</div>
                    <div><h3 className="text-2xl font-black italic uppercase tracking-tighter text-slate-900 leading-none">Fiscal Terminal</h3><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2 italic opacity-70">AR Audit & Disbursement</p></div>
                 </div>
                 <button onClick={() => setShowDetailModal(false)} className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all hover:bg-rose-50"><X className="w-6 h-6"/></button>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-10 custom-scrollbar bg-slate-50/20">
                  <div className="bg-[#0F172A] rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-2xl">
                    <div className="relative z-10 grid grid-cols-2 gap-8">
                        <div className="space-y-4">
                          <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">{activeTab === 'AR' ? 'Client Profile' : 'Payout Target'}</p><p className="text-lg font-black italic text-white uppercase tracking-tighter leading-none truncate">{activeTab === 'AR' ? (selectedJO.work_order_items?.work_orders?.customers?.company_name) : (selectedJO.fleets?.companies?.name || selectedJO.drivers?.name || selectedJO.external_driver_name || 'Authorized Personnel')}</p></div>
                          <div className="flex gap-4">
                             <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">WO Ref</p><p className="text-[12px] font-black text-emerald-400 italic">#{selectedJO.work_order_items?.work_orders?.wo_number?.split('/').pop()}</p></div>
                             <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest italic">JO Ref</p><p className="text-[12px] font-black text-blue-400 italic">#{selectedJO.jo_number?.split('-').pop()}</p></div>
                          </div>
                        </div>
                        <div className="text-right space-y-4">
                          <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 italic">{activeTab === 'AR' ? 'Grand Total' : 'Uang Jalan (CA)'}</p><p className="text-3xl font-black italic text-emerald-400 tracking-tighter leading-none">Rp {grandTotal.toLocaleString('id-ID')}</p></div>
                        </div>
                    </div>
                  </div>

                  {activeTab === 'AR' && (
                    <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                        {/* REJECTION ALERT IF APPLICABLE */}
                        {selectedJO.billing_status === 'rejected' && (
                           <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl flex gap-4 items-start">
                              <AlertCircle className="w-6 h-6 text-rose-500 flex-shrink-0" />
                              <div className="space-y-1">
                                 <p className="text-[12px] font-black text-rose-900 uppercase italic">Return Reasoning:</p>
                                 <p className="text-[13px] font-medium text-rose-700 italic">"{selectedJO.rejection_note || 'No specific note provided.'}"</p>
                              </div>
                           </div>
                        )}

                        {/* 💎 COMPREHENSIVE BILLING COMPUTATION */}
                        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
                           <div className="flex justify-between items-center mb-10">
                              <div className="flex items-center gap-3"><Receipt className="w-6 h-6 text-emerald-500" /><h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest italic leading-none">Matrix Computation</h4></div>
                           </div>
                           <div className="space-y-6">
                              <div className="flex justify-between items-center pb-6 border-b border-slate-100/50">
                                 <div><p className="text-[12px] font-black text-slate-900 uppercase tracking-widest italic">Base Service (Taxable)</p></div>
                                 <p className="text-2xl font-black italic text-slate-900 tracking-tighter uppercase">Rp {basePrice.toLocaleString('id-ID')}</p>
                              </div>
                              {selectedJO.extra_costs?.map((c: any, i: number) => (
                                 <div key={i} className="flex justify-between items-start py-4 border-b border-slate-100/50">
                                    <div><p className="text-[12px] font-black text-blue-600 uppercase italic tracking-tighter truncate max-w-[200px]">{c.cost_type}</p></div>
                                    <p className="text-xl font-black italic text-slate-900 tracking-tighter uppercase leading-none">Rp {(c.amount || 0).toLocaleString('id-ID')}</p>
                                 </div>
                              ))}
                              <div className="pt-10 flex justify-between items-end">
                                 <h4 className="text-4xl font-black italic text-slate-900 tracking-tighter leading-none">Total: Rp {grandTotal.toLocaleString('id-ID')}</h4>
                              </div>
                           </div>
                        </div>

                        {/* 📋 ACTION TERMINAL */}
                        {!showRejectForm ? (
                          <div className={`p-10 rounded-[2.5rem] space-y-8 border-2 ${selectedJO.finance_status === 'invoiced' ? 'bg-emerald-50 border-emerald-100' : 'bg-blue-50 border-dashed border-blue-200'}`}>
                             <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4"><FileSignature className="w-7 h-7 text-blue-600" /><div><h4 className="text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">Document ID</h4></div></div>
                                {selectedJO.finance_status !== 'invoiced' && <button onClick={generateAutoInvoiceNumber} className="flex items-center gap-2 px-6 py-3 bg-slate-900 text-emerald-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-xl active:scale-95"><Sparkles className="w-4 h-4"/> Auto-Gen</button>}
                             </div>
                             <div className="group relative">
                                <div className="flex items-center gap-4 bg-white border border-blue-100 p-5 rounded-[1.5rem] shadow-sm">
                                   <FileText className="w-6 h-6 text-blue-200" /><input type="text" placeholder="INV-ID" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} disabled={selectedJO.finance_status === 'invoiced'} className="bg-transparent border-none text-base font-black uppercase tracking-tight outline-none w-full text-slate-900 font-mono" />
                                </div>
                             </div>
                             <div className="flex flex-col gap-4">
                                <button onClick={() => setShowReviewModal(true)} disabled={!invoiceNumber} className="w-full py-5 bg-slate-900 text-white rounded-3xl text-[12px] font-black uppercase tracking-widest shadow-2xl hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 active:scale-95"><Eye className="w-5 h-5" /> REVIEW & PRINT INVOICE</button>
                                {selectedJO.finance_status !== 'invoiced' && (
                                   <button onClick={() => setShowRejectForm(true)} className="w-full py-4 text-rose-500 bg-rose-50 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] italic border border-rose-100 hover:bg-rose-100 transition-all flex items-center justify-center gap-2 shadow-sm"><RotateCcw className="w-4 h-4" /> Reject & Return to SBU Trucking</button>
                                )}
                             </div>
                          </div>
                        ) : (
                          <div className="p-10 rounded-[2.5rem] bg-rose-50 border-2 border-rose-200 flex flex-col gap-6 animate-in slide-in-from-top-2">
                             <div className="flex items-center gap-3"><RotateCcw className="w-6 h-6 text-rose-600" /><h4 className="text-sm font-black text-slate-900 uppercase tracking-widest italic leading-none">Rejection Gateway</h4></div>
                             <textarea placeholder="Specify why this JO is rejected (e.g. Price mismatch, missing evidence)..." value={rejectionNote} onChange={(e) => setRejectionNote(e.target.value)} className="w-full h-32 px-5 py-4 rounded-2xl border border-rose-200 text-sm italic font-medium text-rose-900 placeholder:text-rose-300 focus:ring-4 focus:ring-rose-500/10 outline-none" />
                             <div className="flex gap-4">
                                <button onClick={() => setShowRejectForm(false)} className="flex-1 py-4 bg-white text-slate-500 rounded-xl text-[10px] font-black uppercase border border-slate-200">Cancel</button>
                                <button onClick={handleRejectToSBU} disabled={isSubmitting || !rejectionNote} className="flex-[2] py-4 bg-rose-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-rose-700 disabled:bg-rose-200 disabled:shadow-none flex items-center justify-center gap-2">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin"/> : <RotateCcw className="w-4 h-4"/>} Confirm Rejection</button>
                             </div>
                          </div>
                        )}
                    </div>
                  )}

                  {activeTab === 'AP' && (
                    <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-10">
                        {/* 💎 CASH ADVANCE BREAKDOWN */}
                        <div className="bg-white border border-slate-200 rounded-[2.5rem] p-10 shadow-sm relative overflow-hidden">
                           <div className="flex justify-between items-center mb-8">
                              <div className="flex items-center gap-3"><Wallet className="w-6 h-6 text-emerald-500" /><h4 className="text-[12px] font-black text-slate-900 uppercase tracking-widest italic leading-none">Uang Jalan (Cash Advance)</h4></div>
                           </div>
                           <div className="space-y-4">
                              {selectedJO.cash_advances?.length > 0 ? (
                                selectedJO.cash_advances.map((ca: any, i: number) => (
                                  <div key={i} className="flex justify-between items-center py-4 border-b border-slate-50">
                                    <div>
                                      <p className="text-[11px] font-black text-slate-900 uppercase italic leading-none mb-1">{ca.description || 'General Cash Advance'}</p>
                                      <p className="text-[10px] font-bold text-slate-400 uppercase italic">Status: {ca.status}</p>
                                    </div>
                                    <p className="text-xl font-black italic text-slate-900 tracking-tighter">Rp {Number(ca.amount || 0).toLocaleString('id-ID')}</p>
                                  </div>
                                ))
                              ) : (
                                <div className="text-center py-10">
                                  <p className="text-xs font-black text-slate-300 uppercase tracking-widest italic">No pending cash advances detected</p>
                                </div>
                              )}
                              <div className="pt-6 flex justify-between items-end border-t border-slate-900/10">
                                 <h4 className="text-3xl font-black italic text-slate-900 tracking-tighter leading-none">Payout: Rp {apTotal.toLocaleString('id-ID')}</h4>
                              </div>
                           </div>
                        </div>

                        <div className="bg-emerald-50 border border-emerald-100 p-10 rounded-[3rem] space-y-8">
                           <input type="file" hidden ref={fileInputRef} accept="image/*,application/pdf" onChange={handleTRUpload} />
                           {transferProofUrl ? (
                             <div className="bg-white p-6 rounded-3xl border flex justify-between items-center shadow-sm font-black"><span className="text-[12px] italic uppercase">Evidence Stored</span><a href={transferProofUrl} target="_blank" className="p-4 bg-slate-900 text-emerald-400 rounded-2xl hover:bg-emerald-600 transition-all shadow-lg"><Download className="w-5 h-5"/></a></div>
                           ) : (
                             <button onClick={() => fileInputRef.current?.click()} className="w-full p-20 border-3 border-dashed border-emerald-200 rounded-[2.5rem] text-slate-400 hover:text-emerald-500 font-black uppercase text-[10px]">Click to Upload Receipt</button>
                           )}
                        </div>
                    </div>
                  )}
              </div>

              <div className="px-10 py-8 border-t border-slate-100 bg-white flex gap-6 sticky bottom-0 z-10">
                 <button onClick={() => setShowDetailModal(false)} className="px-10 py-5 rounded-2xl bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">Cancel</button>
                 {activeTab === 'AR' && selectedJO.finance_status === 'invoiced' && (
                    <button disabled={isSubmitting} onClick={async () => {
                          setIsSubmitting(true);
                          try { await supabase.from('job_orders').update({ finance_status: 'paid' }).eq('id', selectedJO.id); toast.success("Mission Settled (LUNAS)"); setShowDetailModal(false); fetchFinanceData(); } catch (err) {} finally { setIsSubmitting(false); }
                       }} className="flex-1 py-5 bg-emerald-600 text-white rounded-[1.5rem] text-[12px] font-black uppercase tracking-widest shadow-2xl hover:bg-emerald-700 transition-all flex items-center justify-center gap-4 active:scale-95 shadow-emerald-500/10">SETTLE PAYMENT (LUNAS)</button>
                 )}
                 {activeTab === 'AP' && (
                    <button disabled={isSubmitting || (selectedJO.finance_status === 'paid')} onClick={async () => {
                         setIsSubmitting(true);
                         try { 
                            // 1. Update JO status to paid
                            const { error: joErr } = await supabase.from('job_orders').update({ finance_status: 'paid' }).eq('id', selectedJO.id); 
                            if (joErr) throw joErr;

                            // 2. Update ALL PENDING cash advances for this JO to approved
                            const { error: caErr } = await supabase.from('cash_advances')
                                .update({ 
                                    status: 'approved', 
                                    transfer_proof_url: transferProofUrl, 
                                    settled_at: new Date().toISOString() 
                                })
                                .eq('job_order_id', selectedJO.id)
                                .eq('status', 'pending');
                            
                            if (caErr) throw caErr;

                            toast.success("Liquidity Released & JO Settled"); 
                            setShowDetailModal(false); 
                            fetchFinanceData(); 
                         } catch (err: any) {
                            toast.error("Process Failed: " + err.message);
                         } finally { 
                            setIsSubmitting(false); 
                         }
                      }} className="flex-1 py-5 bg-slate-900 text-white rounded-[1.5rem] text-[12px] font-black uppercase tracking-widest shadow-2xl hover:bg-emerald-600 transition-all active:scale-95 disabled:bg-slate-200">{selectedJO.finance_status === 'paid' ? 'DOCUMENT SETTLED' : 'VERIFY & RELEASE FUNDS'}</button>
                 )}
              </div>
           </div>
        </div>
      )}

      {/* 🔴 PROFESSIONAL INVOICE PDF REVIEW MODAL */}
      {showReviewModal && selectedJO && (
        <div className="fixed inset-0 bg-slate-100/90 backdrop-blur-3xl flex items-center justify-center z-[600] p-4 animate-in fade-in duration-300">
           <div className="bg-white w-full max-w-5xl rounded-[3rem] shadow-[0_50px_100px_rgba(15,23,42,0.15)] overflow-hidden flex flex-col max-h-[96vh] border border-white relative font-sans">
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  @page { size: A4; margin: 20mm; }
                  body * { visibility: hidden; -webkit-print-color-adjust: exact; }
                  #printable-invoice, #printable-invoice * { visibility: visible; }
                  #printable-invoice { position: absolute; left: 0; top: 0; width: 100%; border: none !important; box-shadow: none !important; padding: 0 !important; }
                  .no-print { display: none !important; }
                }
              `}} />
              <div className="px-12 py-6 border-b border-slate-100 flex justify-between items-center no-print bg-white/80 backdrop-blur-md">
                 <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-emerald-400 font-bold">SL</div>
                    <p className="text-[12px] font-black uppercase tracking-widest">Document Preview Hub</p>
                 </div>
                 <div className="flex gap-4">
                    <button onClick={() => window.print()} className="px-8 py-3 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl shadow-slate-900/10"><Printer className="w-4 h-4"/> Get PDF / Print</button>
                    <button onClick={() => setShowReviewModal(false)} className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all"><X className="w-6 h-6"/></button>
                 </div>
              </div>

              <div className="flex-1 overflow-y-auto p-12 bg-slate-50/40 custom-scrollbar dark-scrollbar">
                 <div id="printable-invoice" className="bg-white p-[60px] mx-auto w-full max-w-[800px] shadow-[0_20px_50px_rgba(15,23,42,0.05)] border border-slate-100 text-slate-900">
                    <div className="flex justify-between items-start mb-24">
                       <div className="space-y-6">
                          <h1 className="text-3xl font-black italic tracking-tighter uppercase text-slate-950">SENTRALOGIS<span className="text-emerald-500">.</span></h1>
                          <div className="space-y-1 opacity-70">
                             <p className="text-[10px] font-black uppercase tracking-widest">Mutiara Gading Court Unit F.18, Kelapa Gading Barat, Jakarta Utara</p>
                             <p className="text-[12px] font-medium">+62 (21) 1234 5678 | info@sentralogis.com</p>
                          </div>
                       </div>
                       <div className="text-right space-y-8">
                          <div className="space-y-1"><h2 className="text-5xl font-black tracking-tighter uppercase text-slate-950 mb-4 opacity-10 leading-none">INVOICE</h2><div className="bg-slate-900 h-1 w-full ml-auto mb-6" /><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Invoice Number</p><p className="text-[16px] font-black text-slate-950 font-mono tracking-tighter uppercase">{invoiceNumber}</p></div>
                          <div className="space-y-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing Date</p><p className="text-[16px] font-black text-slate-950 tracking-tighter">{new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).toUpperCase()}</p></div>
                       </div>
                    </div>
                    <div className="grid grid-cols-2 gap-20 mb-20 text-left">
                       <div className="space-y-6"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Bill To</p><div className="space-y-2"><h4 className="text-xl font-black italic text-slate-950 uppercase tracking-tight leading-none">{selectedJO.work_order_items?.work_orders?.customers?.company_name}</h4><p className="text-[12px] font-medium opacity-70 leading-relaxed uppercase">Operation: {selectedJO.work_order_items?.truck_type}</p><p className="text-[12px] font-medium opacity-70 uppercase">Ref: JO#{selectedJO.jo_number?.split('-').pop()} / WO#{selectedJO.work_order_items?.work_orders?.wo_number?.split('/').pop()}</p></div></div>
                       <div className="space-y-6"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-2">Due Date</p><p className="text-[14px] font-black text-slate-950 tracking-tighter">IMMEDIATE UPON RECEIPT</p></div>
                    </div>
                    <div className="mb-24">
                       <div className="grid grid-cols-12 gap-0 border-y-2 border-slate-950/10 py-4 mb-2">
                          <div className="col-span-1 text-[10px] font-black uppercase text-slate-400 italic">No.</div><div className="col-span-7 text-[10px] font-black uppercase text-slate-400 italic">Description Total</div><div className="col-span-4 text-right text-[10px] font-black uppercase text-slate-400 italic px-4">Amount (IDR)</div>
                       </div>
                       <div className="grid grid-cols-12 gap-0 py-8 border-b border-slate-100/50">
                          <div className="col-span-1 text-[12px] font-bold text-slate-950">01.</div>
                          <div className="col-span-7 space-y-1 text-left"><p className="text-[14px] font-black text-slate-950 uppercase italic tracking-tighter">Freight Logistics Service</p><p className="text-[11px] font-medium text-slate-500 uppercase leading-relaxed max-w-[340px]">Base transport tariff</p><div className="pt-2"><span className="text-[9px] font-black px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded uppercase tracking-widest leading-none">Taxable ({taxRate}%)</span></div></div>
                          <div className="col-span-4 text-right py-1 px-4"><p className="text-[18px] font-black text-slate-950 italic tracking-tighter">{basePrice.toLocaleString('id-ID')}</p></div>
                       </div>
                       {selectedJO.extra_costs?.map((c: any, i: number) => (
                       <div key={i} className="grid grid-cols-12 gap-0 py-8 border-b border-slate-100/50 grayscale opacity-80">
                          <div className="col-span-1 text-[12px] font-bold text-slate-950">{String(i + 2).padStart(2, '0')}.</div>
                          <div className="col-span-7 space-y-1 text-left"><p className="text-[14px] font-bold text-slate-950 uppercase italic tracking-tighter">{c.cost_type}</p><p className="text-[11px] font-medium text-slate-500 uppercase">{c.description || 'Reimbursement'}</p><div className="pt-2"><span className="text-[9px] font-black px-2 py-0.5 bg-slate-100 text-slate-400 rounded uppercase tracking-widest leading-none">Non-Tax</span></div></div>
                          <div className="col-span-4 text-right py-1 px-4"><p className="text-[18px] font-black text-slate-950 italic tracking-tighter">{(c.amount || 0).toLocaleString('id-ID')}</p></div>
                       </div>
                       ))}
                    </div>
                    <div className="flex justify-end mb-24">
                       <div className="w-[320px] space-y-4">
                          <div className="flex justify-between items-center py-2 text-slate-400"><p className="text-[11px] font-black uppercase tracking-widest italic">Sub-Total Net</p><p className="text-[16px] font-black italic text-slate-700">{(basePrice + extraTotal).toLocaleString('id-ID')}</p></div>
                          <div className="flex justify-between items-center py-4 text-emerald-600 border-t border-slate-100"><p className="text-[11px] font-black uppercase tracking-widest italic">Tax (VAT {taxRate}%)</p><p className="text-[16px] font-black italic">{taxAmount.toLocaleString('id-ID')}</p></div>
                          <div className="flex justify-between items-center pt-6 mt-4 border-t-4 border-slate-950"><p className="text-[13px] font-black uppercase text-slate-400 italic">Total Claim</p><p className="text-4xl font-black italic text-slate-950 uppercase whitespace-nowrap leading-none px-2">IDR {grandTotal.toLocaleString('id-ID')}</p></div>
                       </div>
                    </div>
                    <div className="grid grid-cols-12 gap-20">
                       <div className="col-span-7 space-y-8 text-left"><div className="p-8 bg-slate-50 border border-slate-100 rounded-3xl"><p className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest italic border-b border-slate-200 pb-2">Virtual Account Reference</p><div className="space-y-1"><p className="text-[12px] font-black text-slate-950 italic">PT SENTRA LOGISTIK UTAMA</p><p className="text-[12px] font-bold text-slate-500 uppercase">Bank Central Asia (BCA)</p><p className="text-[16px] font-black text-slate-950 font-mono italic tracking-tighter mt-4">ACC NO : 123 - 456 - 7890</p></div></div></div>
                       <div className="col-span-5 text-center flex flex-col justify-end"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-20 italic">AUTHORIZED FINANCE MANAGER</p><div className="h-[2px] w-full bg-slate-900 mb-4" /><p className="text-[14px] font-black text-slate-950 uppercase italic tracking-tighter">{currentUser?.full_name || 'MANAGER'}</p></div>
                    </div>
                 </div>
              </div>

              <div className="px-12 py-8 border-t border-slate-100 bg-white no-print flex gap-6">
                 <button onClick={() => setShowReviewModal(false)} className="px-10 py-5 rounded-2xl bg-white border border-slate-200 text-slate-500 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 flex items-center gap-3 transition-all active:scale-95"><Edit3 className="w-5 h-5"/> Back to Hub</button>
                 {selectedJO.finance_status !== 'invoiced' && (
                    <button onClick={handleCreateInvoice} disabled={isSubmitting} className="flex-1 py-5 bg-blue-600 text-white rounded-2xl text-[12px] font-black uppercase shadow-2xl hover:bg-slate-900 flex items-center justify-center gap-4 transition-all active:scale-95 shadow-blue-500/10"><ShieldCheck className="w-6 h-6"/> FINALIZE & SUBMIT AR</button>
                 )}
              </div>
           </div>
        </div>
      )}
      </div>
    </div>
  );
}
