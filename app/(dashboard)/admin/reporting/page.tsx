"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { supabase as supabaseRaw } from "@/lib/supabase/client";
const supabase = supabaseRaw as any;
import { toast, Toaster } from "react-hot-toast";
import {
  FileText, Download, ChevronLeft, Calendar, Filter, 
  CheckCircle2, HardHat, Truck, Ship, Warehouse, 
  Table, List, Check, Search, BarChart3, TrendingUp, Package, Loader2, Activity, Banknote, Inbox, X, ChevronDown, MapPin, Building2, RefreshCw,
  FileSpreadsheet, Printer
} from "lucide-react";

export default function ReportingPage() {
  const [loading, setLoading] = useState(false);
  const [reportMode, setReportMode] = useState<"operation" | "financial">("operation");
  const [data, setData] = useState<any[]>([]);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [sbuFilter, setSbuFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [customerFilter, setCustomerFilter] = useState("");
  const [routeFilter, setRouteFilter] = useState({ origin: "", destination: "" });
  const [vendorFilter, setVendorFilter] = useState("");
  const [truckTypeFilter, setTruckTypeFilter] = useState("");
  const [transporterFilter, setTransporterFilter] = useState("all"); // internal, vendor
  const [clearanceTypeFilter, setClearanceTypeFilter] = useState("all"); // import, export

  const [customers, setCustomers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [truckTypes, setTruckTypes] = useState<string[]>([]);

  const operationalStatuses = ['done', 'rejected'];

  const getMappedStatuses = (filters: string[]) => {
    let expanded = [...filters];
    if (filters.includes('done')) expanded = [...expanded, 'delivered', 'finished'];
    if (filters.includes('on_journey')) expanded = [...expanded, 'accepted', 'picking_up', 'delivering'];
    return expanded.map(s => s.toLowerCase());
  };

  const availableColumns = {
    operation: [
      { id: 'wo_number', label: 'WO Number' },
      { id: 'jo_number', label: 'JO Number' },
      { id: 'company_name', label: 'Pelanggan' },
      { id: 'jo_status', label: 'Execution Status' },
      { id: 'route', label: 'Route' },
      { id: 'truck_type', label: 'Truck Type' },
      { id: 'fleet_info', label: 'Fleet/Plate' },
      { id: 'vendor_name', label: 'Vendor' },
    ],
    financial: [
      { id: 'wo_number', label: 'WO Number' },
      { id: 'company_name', label: 'Pelanggan (AR)' },
      { id: 'ar_total', label: 'Invoice Amount' },
      { id: 'ar_outstanding', label: 'AR Outstanding' },
      { id: 'vendor_name', label: 'Vendor (AP)' },
      { id: 'ap_total', label: 'Vendor Price' },
      { id: 'cash_advance', label: 'Cash Advance' },
      { id: 'ap_outstanding', label: 'AP Balance' },
      { id: 'gross_margin', label: 'Gross Margin' },
    ]
  };

  const selectedOpCols = ['wo_number', 'jo_number', 'company_name', 'jo_status', 'route', 'truck_type', 'fleet_info'];
  const selectedFinCols = ['wo_number', 'company_name', 'ar_total', 'ar_outstanding', 'vendor_name', 'ap_total', 'cash_advance', 'ap_outstanding', 'gross_margin'];

  const fetchMasterData = async () => {
    try {
      const [{ data: ct }, { data: lt }, { data: vt }, { data: tt }] = await Promise.all([
        supabase.from('customers').select('id, name, company_name').order('company_name'),
        supabase.from('locations').select('id, name').order('name'),
        supabase.from('companies').select('id, name').order('name'),
        supabase.from('work_order_items').select('truck_type')
      ]);
      setCustomers(ct || []); setLocations(lt || []); setVendors(vt || []);
      setTruckTypes(Array.from(new Set((tt || []).map((t: any) => t.truck_type).filter(Boolean))) as string[]);
    } catch (e) {}
  };

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: woData, error } = await supabase
        .from('work_orders')
        .select(`*, customers (*), work_order_items (*, origin_location:origin_location_id (name), destination_location:destination_location_id (name), job_orders (*, cash_advances (*), fleets (id, plate_number, companies (id, name))))`)
        .gte('order_date', startDate).lte('order_date', endDate).order('order_date', { ascending: false });

      if (error) throw error;
      const flattened: any[] = [];
      const activeStatusFilters = getMappedStatuses(statusFilter);

      woData?.forEach((wo: any) => {
        wo.work_order_items?.forEach((item: any) => {
          if (customerFilter && wo.customer_id !== customerFilter) return;
          if (sbuFilter !== 'all' && item.sbu_type !== sbuFilter) return;
          if (truckTypeFilter && item.truck_type !== truckTypeFilter) return;
          if (routeFilter.origin && item.origin_location_id !== routeFilter.origin) return;
          if (routeFilter.destination && item.destination_location_id !== routeFilter.destination) return;
          
          if (sbuFilter === 'clearance' && clearanceTypeFilter !== 'all') {
             const itmType = item.service_type?.toLowerCase() || '';
             if (!itmType.includes(clearanceTypeFilter)) return;
          }

          const jos = item.job_orders || [];
          const rawItemStatus = item.status?.toLowerCase();
          const rawWoStatus = wo.status?.toLowerCase();
          const isRejected = rawItemStatus === 'rejected' || rawWoStatus === 'rejected';
          
          if (jos.length === 0) {
            if (activeStatusFilters.length > 0 && !activeStatusFilters.includes('rejected')) {
              if (!isRejected) return;
            }
            if (isRejected || activeStatusFilters.length === 0) {
              flattened.push({
                id: `item-${item.id}`,
                wo_number: wo.wo_number,
                jo_number: "REJECTED_WO",
                company_name: wo.customers?.company_name || wo.customers?.name || "-",
                jo_status: "REJECTED",
                route: `${item.origin_location?.name || 'TBA'} → ${item.destination_location?.name || 'TBA'}`,
                fleet_info: "N/A (Rejected)",
                vendor_name: "N/A",
                ar_total: item.deal_price || 0,
                ar_outstanding: 0,
                ap_total: 0,
                ap_outstanding: 0,
                gross_margin: item.deal_price || 0,
                sbu_type: item.sbu_type,
                truck_type: item.truck_type || "-",
                cash_advance: 0
              });
            }
            return;
          }

          jos.forEach((jo: any) => {
             const joStatus = jo.status?.toLowerCase();
             if (activeStatusFilters.length > 0 && !activeStatusFilters.includes(joStatus)) return;
             if (vendorFilter && jo.fleets?.companies?.id !== vendorFilter) return;

             const cashTotal = (jo.cash_advances || []).reduce((acc: number, ca: any) => acc + Number(ca.amount || 0), 0);

             const isInternal = !jo.fleets?.companies || jo.fleets?.companies?.name?.toLowerCase().includes('sentralogis');
             if (sbuFilter === 'trucking' && transporterFilter !== 'all') {
                if (transporterFilter === 'internal' && !isInternal) return;
                if (transporterFilter === 'vendor' && isInternal) return;
             }

             flattened.push({
               id: jo.id,
               wo_number: wo.wo_number,
               jo_number: jo.jo_number,
               company_name: wo.customers?.company_name || wo.customers?.name || "-",
               jo_status: jo.status?.toUpperCase(),
               route: `${item.origin_location?.name || 'TBA'} → ${item.destination_location?.name || 'TBA'}`,
               fleet_info: jo.fleets?.plate_number || "Internal",
               vendor_name: jo.fleets?.companies?.name || "N/A",
               ar_total: item.deal_price || 0,
               ar_outstanding: wo.billing_status === 'paid' ? 0 : (item.deal_price || 0),
               ap_total: Number(jo.vendor_price || 0),
               cash_advance: cashTotal,
               ap_outstanding: (Number(jo.vendor_price || 0)) - cashTotal,
               gross_margin: (item.deal_price || 0) - Number(jo.vendor_price || 0),
               sbu_type: item.sbu_type,
               truck_type: item.truck_type || "-"
             });
          });
        });
      });
      setData(flattened);
    } catch (err: any) { toast.error("Sync Failed"); } finally { setLoading(false); }
  }, [startDate, endDate, sbuFilter, statusFilter, customerFilter, vendorFilter, truckTypeFilter, routeFilter, transporterFilter, clearanceTypeFilter]);

  const handleExportExcel = async () => {
    if (data.length === 0) return toast.error("No data");
    const tid = toast.loading("Excel Engine Starting...");
    try {
      const XLSX = await import("xlsx");
      const activeCols = reportMode === 'operation' ? selectedOpCols : selectedFinCols;
      const colLabels = activeCols.map(id => availableColumns[reportMode].find(c => c.id === id)?.label || id);
      const excelData = data.map(row => {
        const filteredRow: any = {};
        activeCols.forEach((colId, idx) => { filteredRow[colLabels[idx]] = row[colId]; });
        return filteredRow;
      });
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Atlas Report");
      XLSX.writeFile(workbook, `Atlas_Export_${reportMode}_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success("Excel Ready", { id: tid });
    } catch (err: any) { toast.error(`Excel Error: ${err.message}`, { id: tid }); }
  };

  const handleExportPDF = async () => {
    if (data.length === 0) return toast.error("No records found");
    const tid = toast.loading("PDF Matrix Rendering...");
    try {
      const { jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");
      const doc = new jsPDF('l', 'pt');
      const activeCols = reportMode === 'operation' ? selectedOpCols : selectedFinCols;
      const head = [activeCols.map(colId => availableColumns[reportMode].find(c => c.id === colId)?.label || colId)];
      const body = data.map(item => activeCols.map(colId => String(item[colId] || '-')));
      doc.setFontSize(22); doc.text("SENTRALOGIS INTELLIGENCE", 40, 50);
      doc.setFontSize(10); doc.text(`Matrix Type: ${reportMode.toUpperCase()} | Generated: ${new Date().toLocaleString()}`, 40, 70);
      autoTable(doc, { headStyle: { fillColor: [15, 23, 42] }, head: head, body: body, startY: 90, theme: 'grid', styles: { fontSize: 8 } });
      doc.save(`Sentralogis_Matrix_${new Date().getTime()}.pdf`);
      toast.success("PDF Downloaded", { id: tid });
    } catch (err: any) { toast.error(`PDF Error: ${err.message}`, { id: tid }); }
  };

  useEffect(() => { fetchMasterData(); fetchReportData(); }, [fetchReportData, reportMode]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowStatusDropdown(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const opSummary = {
     sbu: sbuFilter === 'all' ? 'Unified Logistics' : sbuFilter.toUpperCase(),
     totalQty: data.length,
     totalWO: Array.from(new Set(data.map(d => d.wo_number))).length,
     totalAR: data.reduce((sum, d) => sum + d.ar_total, 0),
     totalOutstanding: data.reduce((sum, d) => sum + d.ar_outstanding, 0)
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 lg:p-12 pb-32">
      <Toaster position="top-right" />
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 mb-12">
         <div className="flex items-center gap-6">
            <Link href="/admin" className="p-4 bg-white border border-slate-200 rounded-2xl hover:shadow-md"><ChevronLeft className="w-6 h-6"/></Link>
            <div>
               <h1 className="text-3xl font-black italic uppercase tracking-tighter text-[#0F172A]">Intelligence Matrix<span className="text-blue-600">.</span></h1>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Cross-SBU Operational Gateway</p>
            </div>
         </div>
         <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
            <button onClick={() => setReportMode('operation')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportMode === 'operation' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>Operations</button>
            <button onClick={() => setReportMode('financial')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${reportMode === 'financial' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}>Financials</button>
         </div>
         <div className="flex flex-wrap items-center gap-3">
            <button onClick={handleExportExcel} className="bg-emerald-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center gap-3 shadow-lg hover:bg-emerald-700 transition-all active:scale-95"><FileSpreadsheet className="w-5 h-5"/> EXCEL</button>
            <button onClick={handleExportPDF} className="bg-rose-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] flex items-center gap-3 shadow-lg hover:bg-rose-700 transition-all active:scale-95"><FileText className="w-5 h-5"/> PDF</button>
         </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-12">
         <aside className="space-y-10">
            <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 shadow-sm space-y-10">
               <div className="space-y-3"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Time Horizon</label><div className="space-y-2"><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-bold outline-none" /><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-bold outline-none" /></div></div>
               
               <div className="space-y-3" ref={dropdownRef}>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Execution Status</label>
                  <div className="relative cursor-pointer" onClick={() => setShowStatusDropdown(!showStatusDropdown)}>
                     <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-bold text-[#0F172A]">{statusFilter.length > 0 ? `${statusFilter.length} Selected` : "All Execution Progres"}</div>
                     {showStatusDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-3 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden max-h-60 overflow-y-auto">
                           {operationalStatuses.map(s => (
                              <button key={s} onClick={(e) => { e.stopPropagation(); setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]); }} className="w-full px-5 py-4 text-left text-[11px] font-bold uppercase transition-all hover:bg-slate-50 flex items-center justify-between">{s.replace(/_/g, ' ')}{statusFilter.includes(s) && <Check className="w-4 h-4 text-blue-600"/>}</button>
                           ))}
                        </div>
                     )}
                  </div>
               </div>
               
               {reportMode === 'operation' && (
                  <div className="space-y-3">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">SBU Category</label>
                     <select value={sbuFilter} onChange={e => setSbuFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-bold outline-none cursor-pointer">
                        <option value="all">Unlimited View</option>
                        <option value="trucking">Trucking Armada</option>
                        <option value="clearance">Customs Clearance</option>
                     </select>
                  </div>
               )}

               {reportMode === 'financial' && (
                  <div className="space-y-3">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">SBU Fiscal Category</label>
                     <select value={sbuFilter} onChange={e => setSbuFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-bold outline-none cursor-pointer">
                        <option value="all">All SBU Ledger</option>
                        <option value="trucking">Trucking Revenue</option>
                        <option value="clearance">Clearance Revenue</option>
                     </select>
                  </div>
               )}

               {reportMode === 'operation' && sbuFilter === 'trucking' && (
                  <>
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Truck Type</label>
                        <select value={truckTypeFilter} onChange={e => setTruckTypeFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-bold outline-none cursor-pointer">
                           <option value="">All Fleet Types</option>
                           {truckTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                     </div>
                     <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Transporter</label>
                        <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                           <button onClick={() => setTransporterFilter('all')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${transporterFilter === 'all' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>All</button>
                           <button onClick={() => setTransporterFilter('internal')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${transporterFilter === 'internal' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>Internal</button>
                           <button onClick={() => setTransporterFilter('vendor')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${transporterFilter === 'vendor' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>Vendor</button>
                        </div>
                     </div>
                  </>
               )}

               {sbuFilter === 'clearance' && (
                  <div className="space-y-3">
                     <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Clearance Mode</label>
                     <div className="flex bg-slate-50 p-1 rounded-xl border border-slate-100">
                        <button onClick={() => setClearanceTypeFilter('all')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${clearanceTypeFilter === 'all' ? 'bg-white shadow-sm' : 'text-slate-400'}`}>All</button>
                        <button onClick={() => setClearanceTypeFilter('import')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${clearanceTypeFilter === 'import' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}>Import</button>
                        <button onClick={() => setClearanceTypeFilter('export')} className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all ${clearanceTypeFilter === 'export' ? 'bg-white shadow-sm text-emerald-600' : 'text-slate-400'}`}>Export</button>
                     </div>
                  </div>
               )}

               <div className="space-y-3"><label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Account Client</label><select value={customerFilter} onChange={e => setCustomerFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-100 rounded-xl p-4 text-xs font-bold outline-none"><option value="">All Clients</option>{customers.map(c => <option key={c.id} value={c.id}>{c.company_name || c.name}</option>)}</select></div>
            </div>
         </aside>

         <main className="xl:col-span-3 space-y-10">
            <div className="bg-[#0F172A] rounded-[2.5rem] p-8 md:p-10 text-white shadow-2xl relative overflow-hidden">
               <div className="relative z-10">
                  <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mb-4">Operation Snapshot</p>
                  <h3 className="text-2xl md:text-3xl font-black italic uppercase tracking-tighter leading-none mb-6">{opSummary.sbu} Overview</h3>
                  <div className="flex items-center gap-6 md:gap-10">
                     <div className="flex flex-col"><p className="text-5xl md:text-6xl font-black italic tracking-tighter text-blue-400 leading-none">{opSummary.totalWO} <span className="text-sm md:text-base text-white/20 uppercase tracking-widest font-black non-italic">Work Order</span></p></div>
                     <div className="w-px h-12 bg-white/10 hidden md:block"></div>
                     <div className="flex flex-col"><p className="text-5xl md:text-6xl font-black italic tracking-tighter text-emerald-400 leading-none">{opSummary.totalQty} <span className="text-sm md:text-base text-white/20 uppercase tracking-widest font-black non-italic">Job Order</span></p></div>
                  </div>
                  {reportMode === 'financial' && (
                    <div className="mt-10 flex flex-wrap gap-6 pr-4 border-t border-white/5 pt-8">
                       <div className="px-6 py-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 shadow-inner"><p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest mb-1">Total Receivables</p><p className="text-xl font-black italic text-emerald-300">Rp {opSummary.totalAR.toLocaleString('id-ID')}</p></div>
                       <div className="px-6 py-4 bg-rose-500/10 rounded-2xl border border-rose-500/20 shadow-inner"><p className="text-[9px] font-black text-rose-400 uppercase tracking-widest mb-1">Total Outstanding</p><p className="text-xl font-black italic text-rose-300">Rp {opSummary.totalOutstanding.toLocaleString('id-ID')}</p></div>
                    </div>
                  )}
               </div>
               <div className="absolute -bottom-16 -right-16 opacity-5 pointer-events-none transition-transform rotate-12"><BarChart3 className="w-72 h-72"/></div>
            </div>

            <div className="bg-white border border-slate-200 rounded-[3rem] shadow-sm overflow-hidden flex flex-col min-h-[600px]">
               <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-40"><h3 className="text-2xl font-black italic uppercase tracking-tighter text-[#0F172A]">{reportMode === 'operation' ? 'Execution Matrix' : 'Fiscal Matrix'}</h3>{loading && <Loader2 className="w-8 h-8 animate-spin text-blue-600" />}</div>
               <div className="overflow-x-auto">
                  <table className="w-full text-left">
                     <thead><tr className="bg-slate-50 border-b border-slate-100">{ (reportMode === 'operation' ? selectedOpCols : selectedFinCols).map(colId => (<th key={colId} className="p-8 text-[10px] font-black text-slate-500 uppercase tracking-widest">{availableColumns[reportMode].find((c:any) => c.id === colId)?.label || colId}</th>)) }</tr></thead>
                     <tbody className="divide-y divide-slate-50/50">{data.map((row, idx) => (<tr key={idx} className="hover:bg-slate-50 transition-all">{(reportMode === 'operation' ? selectedOpCols : selectedFinCols).map(colId => { let val = row[colId]; if (colId === 'jo_status') { const color = val?.includes('DONE') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-100 text-slate-600'; val = <span className={`px-4 py-2 border rounded-xl font-black italic text-[9px] uppercase ${color}`}>{val}</span>; } if (colId.includes('total') || colId === 'gross_margin' || colId === 'ar_outstanding' || colId === 'ap_total' || colId === 'ap_outstanding') { val = <span className={`font-black italic ${colId === 'gross_margin' ? 'text-blue-600' : 'text-slate-900'} whitespace-nowrap`}>Rp {Number(val || 0).toLocaleString('id-ID')}</span>; } return <td key={colId} className="p-8 text-[11px] font-bold text-slate-700 whitespace-nowrap">{val}</td>; })}</tr>))}</tbody>
                  </table>
                  {data.length === 0 && !loading && (<div className="py-40 text-center opacity-20 grayscale flex flex-col items-center"><Inbox className="w-24 h-24 mb-4"/><p className="text-[11px] font-black uppercase tracking-widest">Protocol Matrix Empty</p></div>)}
               </div>
            </div>
         </main>
      </div>
    </div>
  );
}
