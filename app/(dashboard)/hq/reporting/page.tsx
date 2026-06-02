"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/useAuth";
import { toast, Toaster } from "react-hot-toast";
import {
  FileText, ChevronLeft, Check, Search, BarChart3, Loader2, Inbox, RefreshCw,
  FileSpreadsheet, Filter, ChevronDown
} from "lucide-react";

export default function HQReportingPage() {
  const { profile } = useAuth();
  const tenantId = profile?.tenant_id;
  const [loading, setLoading] = useState(false);
  const [reportMode, setReportMode] = useState<"operation" | "financial">("operation");
  const [data, setData] = useState<any[]>([]);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
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

  // [AI] Fetch master data from md_entities (customers and vendors) and md_locations to resolve non-existent tables
  const fetchMasterData = async () => {
    if (!tenantId) return;
    try {
      const [{ data: ct }, { data: lt }, { data: vt }, { data: tt }] = await Promise.all([
        supabase.from('md_entities').select('id, name, legal_name').eq('is_customer', true).eq('tenant_id', tenantId).order('name'),
        supabase.from('md_locations').select('id, name').eq('is_active', true).eq('tenant_id', tenantId).order('name'),
        supabase.from('md_entities').select('id, name, legal_name').eq('is_vendor', true).eq('tenant_id', tenantId).order('name'),
        supabase.from('wo_items').select('item_data').eq('sbu_type', 'TRUCKING').eq('tenant_id', tenantId)
      ]);
      setCustomers(ct || []); setLocations(lt || []); setVendors(vt || []);
      const types = (tt || []).map((t: any) => t.item_data?.vehicle_type_name).filter(Boolean);
      setTruckTypes(Array.from(new Set(types)) as string[]);
    } catch (e) {}
  };

  // [AI] Fetch reporting data using exact aliased joins matching the database relations (customer_id -> md_entities, fleet_id -> md_fleets -> md_entities)
  const fetchReportData = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const { data: woData, error } = await supabase
        .from('work_orders')
        .select(`*, customers:md_entities!customer_id (id, name, legal_name), wo_items (*, job_orders (*, fleets:fleet_id (id, plate_number, companies:md_entities (id, name))))`)
        .eq('tenant_id', tenantId)
        .gte('order_date', startDate).lte('order_date', endDate).order('order_date', { ascending: false });

      if (error) throw error;
      const flattened: any[] = [];
      const activeStatusFilters = getMappedStatuses(statusFilter);

      woData?.forEach((wo: any) => {
        wo.wo_items?.forEach((item: any) => {
          if (customerFilter && wo.customer_id !== customerFilter) return;
          if (sbuFilter !== 'all' && item.sbu_type?.toLowerCase() !== sbuFilter.toLowerCase()) return;
          
          const itemTruckType = item.item_data?.vehicle_type_name || "-";
          if (truckTypeFilter && itemTruckType !== truckTypeFilter) return;

          const originName = item.item_data?.shipper_name || item.item_data?.origin_name || "TBA";
          const destinationName = item.item_data?.recipient_name || item.item_data?.destination_name || "TBA";
          const routeStr = `${originName} → ${destinationName}`;
          
          if (sbuFilter === 'clearance' && clearanceTypeFilter !== 'all') {
             const itmType = item.service_type?.toLowerCase() || '';
             if (!itmType.includes(clearanceTypeFilter)) return;
          }

          const jos = item.job_orders || [];
          const rawItemStatus = item.status?.toLowerCase();
          const rawWoStatus = wo.status?.toLowerCase();
          const isRejected = rawItemStatus === 'rejected' || rawWoStatus === 'rejected';
          
          const dealPrice = Number(item.total_revenue || item.item_data?.deal_price || 0);

          if (jos.length === 0) {
            if (activeStatusFilters.length > 0 && !activeStatusFilters.includes('rejected')) {
              if (!isRejected) return;
            }
            if (isRejected || activeStatusFilters.length === 0) {
              flattened.push({
                id: `item-${item.id}`,
                wo_number: wo.wo_number,
                jo_number: "REJECTED_WO",
                company_name: wo.customers?.legal_name || wo.customers?.name || "-",
                jo_status: "REJECTED",
                route: routeStr,
                fleet_info: "N/A (Rejected)",
                vendor_name: "N/A",
                ar_total: dealPrice,
                ar_outstanding: 0,
                ap_total: 0,
                ap_outstanding: 0,
                gross_margin: dealPrice,
                sbu_type: item.sbu_type,
                truck_type: itemTruckType,
                cash_advance: 0
              });
            }
            return;
          }

          jos.forEach((jo: any) => {
             const joStatus = jo.status?.toLowerCase();
             if (activeStatusFilters.length > 0 && !activeStatusFilters.includes(joStatus)) return;
             if (vendorFilter && jo.fleets?.companies?.id !== vendorFilter) return;

             const cashTotal = Number(jo.advance_amount || 0);

             const isInternal = !jo.fleets?.companies || jo.fleets?.companies?.name?.toLowerCase().includes('sentralogis');
             if (sbuFilter === 'trucking' && transporterFilter !== 'all') {
                if (transporterFilter === 'internal' && !isInternal) return;
                if (transporterFilter === 'vendor' && isInternal) return;
             }

             const apTotal = Number(jo.purchase_price || jo.vendor_price || 0);

             flattened.push({
               id: jo.id,
               wo_number: wo.wo_number,
               jo_number: jo.jo_number,
               company_name: wo.customers?.legal_name || wo.customers?.name || "-",
               jo_status: jo.status?.toUpperCase(),
               route: routeStr,
               fleet_info: jo.fleets?.plate_number || "Internal",
               vendor_name: jo.fleets?.companies?.name || "N/A",
               ar_total: dealPrice,
               ar_outstanding: wo.billing_status === 'paid' ? 0 : dealPrice,
               ap_total: apTotal,
               cash_advance: cashTotal,
               ap_outstanding: apTotal - cashTotal,
               gross_margin: dealPrice - apTotal,
               sbu_type: item.sbu_type,
               truck_type: itemTruckType
             });
          });
        });
      });
      setData(flattened);
    } catch (err: unknown) {
      console.error("[AI] Sync error: ", err);
      toast.error("Sync Failed");
    } finally { setLoading(false); }
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
    } catch (err: unknown) { toast.error(`Excel Error: ${(err as Error).message}`, { id: tid }); }
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
      doc.setFontSize(18); doc.text("SENTRALOGIS INTELLIGENCE REPORT", 40, 50);
      doc.setFontSize(9); doc.text(`Matrix Type: ${reportMode.toUpperCase()} | Generated: ${new Date().toLocaleString()}`, 40, 68);
      autoTable(doc, { headStyles: { fillColor: [15, 23, 42] }, head: head, body: body, startY: 85, theme: 'grid', styles: { fontSize: 8 } });
      doc.save(`Sentralogis_Matrix_${new Date().getTime()}.pdf`);
      toast.success("PDF Downloaded", { id: tid });
    } catch (err: unknown) { toast.error(`PDF Error: ${(err as Error).message}`, { id: tid }); }
  };

  useEffect(() => { if (tenantId) { fetchMasterData(); fetchReportData(); } }, [fetchReportData, reportMode, tenantId]);

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
    <div className="min-h-screen bg-[#F8FAFC] p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto pb-24">
      <Toaster position="top-right" />
      
      {/* Header Section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
         <div className="flex items-center gap-4">
            <Link href="/hq/ops-dashboard" className="p-2.5 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all"><ChevronLeft className="w-5 h-5 text-slate-700"/></Link>
            <div>
               <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">Intelligence Matrix</h1>
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">Cross-SBU Operational Gateway</p>
            </div>
         </div>
         <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex p-0.5 bg-slate-100 rounded-xl border border-slate-200 mr-auto md:mr-0">
               <button onClick={() => setReportMode('operation')} className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${reportMode === 'operation' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>Operations</button>
               <button onClick={() => setReportMode('financial')} className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wide transition-all ${reportMode === 'financial' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>Financials</button>
            </div>
            <button onClick={handleExportExcel} className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-bold tracking-wide text-xs flex items-center gap-2 shadow-sm hover:bg-emerald-700 transition-all active:scale-95"><FileSpreadsheet className="w-4 h-4"/> EXCEL</button>
            <button onClick={handleExportPDF} className="bg-rose-600 text-white px-4 py-2.5 rounded-xl font-bold tracking-wide text-xs flex items-center gap-2 shadow-sm hover:bg-rose-700 transition-all active:scale-95"><FileText className="w-4 h-4"/> PDF</button>
         </div>
      </header>

      {/* Mobile Filter Button */}
      <div className="xl:hidden mb-4">
        <button 
          onClick={() => setShowFilters(!showFilters)} 
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
        >
          <Filter size={14} className="text-slate-500" />
          {showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6 items-start">
         
         {/* Filter Sidebar */}
         <aside className={`${showFilters ? 'block' : 'hidden'} xl:block space-y-4`}>
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-5">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Time Horizon</label>
                  <div className="grid grid-cols-2 gap-2">
                     <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:border-blue-500 transition-all" />
                     <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:border-blue-500 transition-all" />
                  </div>
               </div>
               
               <div className="space-y-1.5" ref={dropdownRef}>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Execution Status</label>
                  <div className="relative cursor-pointer" onClick={() => setShowStatusDropdown(!showStatusDropdown)}>
                     <div className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 flex justify-between items-center select-none">
                       <span>{statusFilter.length > 0 ? `${statusFilter.length} Selected` : "All Statuses"}</span>
                       <ChevronDown size={14} className="text-slate-400" />
                     </div>
                     {showStatusDropdown && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden max-h-48 overflow-y-auto">
                           {operationalStatuses.map(s => (
                              <button key={s} onClick={(e) => { e.stopPropagation(); setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]); }} className="w-full px-4 py-2.5 text-left text-xs font-semibold uppercase transition-all hover:bg-slate-50 flex items-center justify-between">{s.replace(/_/g, ' ')}{statusFilter.includes(s) && <Check className="w-4 h-4 text-blue-600"/>}</button>
                           ))}
                        </div>
                     )}
                  </div>
               </div>
               
               {reportMode === 'operation' && (
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SBU Category</label>
                     <select value={sbuFilter} onChange={e => setSbuFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500 transition-all">
                        <option value="all">Unified View</option>
                        <option value="trucking">Trucking Armada</option>
                        <option value="clearance">Customs Clearance</option>
                     </select>
                  </div>
               )}

               {reportMode === 'financial' && (
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">SBU Fiscal Category</label>
                     <select value={sbuFilter} onChange={e => setSbuFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500 transition-all">
                        <option value="all">All SBU Ledger</option>
                        <option value="trucking">Trucking Revenue</option>
                        <option value="clearance">Clearance Revenue</option>
                     </select>
                  </div>
               )}

               {reportMode === 'operation' && sbuFilter === 'trucking' && (
                  <>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Truck Type</label>
                        <select value={truckTypeFilter} onChange={e => setTruckTypeFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500 transition-all">
                           <option value="">All Fleet Types</option>
                           {truckTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Transporter</label>
                        <div className="flex bg-slate-50 p-0.5 rounded-xl border border-slate-200">
                           <button onClick={() => setTransporterFilter('all')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${transporterFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>All</button>
                           <button onClick={() => setTransporterFilter('internal')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${transporterFilter === 'internal' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Internal</button>
                           <button onClick={() => setTransporterFilter('vendor')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${transporterFilter === 'vendor' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Vendor</button>
                        </div>
                     </div>
                  </>
               )}

               {sbuFilter === 'clearance' && (
                  <div className="space-y-1.5">
                     <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Clearance Mode</label>
                     <div className="flex bg-slate-50 p-0.5 rounded-xl border border-slate-200">
                        <button onClick={() => setClearanceTypeFilter('all')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${clearanceTypeFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>All</button>
                        <button onClick={() => setClearanceTypeFilter('import')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${clearanceTypeFilter === 'import' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Import</button>
                        <button onClick={() => setClearanceTypeFilter('export')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${clearanceTypeFilter === 'export' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Export</button>
                     </div>
                  </div>
               )}

               <div className="space-y-1.5">
                 <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Account Client</label>
                 <select value={customerFilter} onChange={e => setCustomerFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 transition-all">
                   <option value="">All Clients</option>
                   {customers.map(c => <option key={c.id} value={c.id}>{c.legal_name || c.name}</option>)}
                 </select>
               </div>
            </div>
         </aside>

         {/* Main Contents */}
         <main className="xl:col-span-3 space-y-6">
            
            {/* Snapshot Card */}
            <div className="bg-slate-900 rounded-2xl p-5 md:p-6 text-white shadow-md relative overflow-hidden">
               <div className="relative z-10">
                  <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Operation Snapshot</p>
                  <h3 className="text-lg font-bold uppercase text-white mb-4">{opSummary.sbu} Overview</h3>
                  <div className="flex items-center gap-8">
                     <div className="flex flex-col">
                       <p className="text-2xl sm:text-3xl font-extrabold text-blue-400 leading-none">
                         {opSummary.totalWO} <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold block sm:inline sm:ml-1">Work Order</span>
                       </p>
                     </div>
                     <div className="w-px h-8 bg-white/10"></div>
                     <div className="flex flex-col">
                       <p className="text-2xl sm:text-3xl font-extrabold text-emerald-400 leading-none">
                         {opSummary.totalQty} <span className="text-[10px] text-white/40 uppercase tracking-wider font-bold block sm:inline sm:ml-1">Job Order</span>
                       </p>
                     </div>
                  </div>
                  {reportMode === 'financial' && (
                    <div className="mt-6 flex flex-wrap gap-4 border-t border-white/5 pt-4">
                       <div className="px-4 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20"><p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider mb-0.5">Total Receivables</p><p className="text-base font-extrabold text-emerald-300">Rp {opSummary.totalAR.toLocaleString('id-ID')}</p></div>
                       <div className="px-4 py-2 bg-rose-500/10 rounded-xl border border-rose-500/20"><p className="text-[9px] font-bold text-rose-400 uppercase tracking-wider mb-0.5">Total Outstanding</p><p className="text-base font-extrabold text-rose-300">Rp {opSummary.totalOutstanding.toLocaleString('id-ID')}</p></div>
                    </div>
                  )}
               </div>
               <div className="absolute -bottom-12 -right-12 opacity-5 pointer-events-none transition-transform rotate-12"><BarChart3 className="w-48 h-48"/></div>
            </div>

            {/* Table Matrix */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden flex flex-col min-h-[500px]">
               <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-40">
                 <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wide">{reportMode === 'operation' ? 'Execution Matrix' : 'Fiscal Matrix'}</h3>
                 {loading && <Loader2 className="w-5 h-5 animate-spin text-blue-600" />}
               </div>
               <div className="overflow-x-auto w-full">
                  <table className="w-full text-left border-collapse">
                     <thead>
                       <tr className="bg-slate-50 border-b border-slate-200">
                         { (reportMode === 'operation' ? selectedOpCols : selectedFinCols).map(colId => (
                           <th key={colId} className="px-4 py-3 text-[9px] font-bold text-slate-500 uppercase tracking-wider">
                             {availableColumns[reportMode].find((c:any) => c.id === colId)?.label || colId}
                           </th>
                         )) }
                       </tr>
                     </thead>
                     <tbody className="divide-y divide-slate-100">
                       {data.map((row, idx) => (
                         <tr key={idx} className="hover:bg-slate-50/50 transition-all">
                           {(reportMode === 'operation' ? selectedOpCols : selectedFinCols).map(colId => { 
                             let val = row[colId]; 
                             if (colId === 'jo_status') { 
                               const color = val?.includes('DONE') || val?.includes('DELIVERED') || val?.includes('FINISHED')
                                 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                 : 'bg-slate-100 text-slate-600 border-slate-200'; 
                               val = <span className={`px-2.5 py-1 border rounded-lg font-bold text-[9px] uppercase tracking-wide ${color}`}>{val}</span>; 
                             } 
                             if (colId.includes('total') || colId === 'gross_margin' || colId === 'ar_outstanding' || colId === 'ap_total' || colId === 'ap_outstanding') { 
                               val = <span className={`font-semibold ${colId === 'gross_margin' ? 'text-blue-600' : 'text-slate-800'} whitespace-nowrap text-xs`}>
                                 Rp {Number(val || 0).toLocaleString('id-ID')}
                               </span>; 
                             } 
                             return (
                               <td key={colId} className="px-4 py-3 text-xs font-medium text-slate-700 whitespace-nowrap">
                                 {val}
                               </td>
                             ); 
                           })}
                         </tr>
                       ))}
                     </tbody>
                  </table>
                  {data.length === 0 && !loading && (
                    <div className="py-24 text-center opacity-25 grayscale flex flex-col items-center justify-center">
                      <Inbox className="w-16 h-16 mb-2 text-slate-400"/>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Protocol Matrix Empty</p>
                    </div>
                  )}
               </div>
            </div>
         </main>
      </div>
    </div>
  );
}
