"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";
import { toast, Toaster } from "react-hot-toast";
import {
  FileText, ChevronLeft, Check, Search, BarChart3, Loader2, Inbox, RefreshCw,
  FileSpreadsheet, Filter, ChevronDown, ChevronLeft as ChevronLeftIcon, ChevronRight as ChevronRightIcon
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";

export default function SBUTruckingReportingPage() {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [allData, setAllData] = useState([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const dropdownRef = useRef(null);
  
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
  const [statusFilter, setStatusFilter] = useState([]);
  const [customerFilter, setCustomerFilter] = useState("");
  const [truckTypeFilter, setTruckTypeFilter] = useState("");
  const [transporterFilter, setTransporterFilter] = useState("all");

  const [customers, setCustomers] = useState([]);
  const [truckTypes, setTruckTypes] = useState([]);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(30);

  // [AI] Client-side pagination: slice allData based on page & pageSize
  const data = useMemo(() => {
    if (pageSize === 999999) return allData;
    const startIdx = (page - 1) * pageSize;
    return allData.slice(startIdx, startIdx + pageSize);
  }, [allData, page, pageSize]);

  const operationalStatuses = ['done', 'rejected'];

  const getMappedStatuses = (filters: string[]) => {
    let expanded = [...filters];
    if (filters.includes('done')) expanded = [...expanded, 'delivered', 'finished'];
    if (filters.includes('on_journey')) expanded = [...expanded, 'accepted', 'picking_up', 'delivering'];
    return expanded.map(s => s.toLowerCase());
  };

  // [AI] Fetch reporting data using exact aliased joins matching the database relations (customer_id -> md_entities, fleet_id -> md_fleets -> md_entities)
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const tenantId = profile?.tenant_id;
      
      let query = supabase
        .from('work_orders')
        .select(`*, customers:md_entities!customer_id (id, name, legal_name), wo_items (*, job_orders (*, fleets:fleet_id (id, plate_number, companies:md_entities (id, name))))`)
        .gte('order_date', startDate).lte('order_date', endDate).order('order_date', { ascending: false });
      
      // [AI] Filter by tenant_id to ensure per-tenant reporting
      if (tenantId) {
        query = query.eq('tenant_id', tenantId);
      }

      const { data: woData, error } = await query;

      if (error) throw error;
      const flattened: any[] = [];
      const activeStatusFilters = getMappedStatuses(statusFilter);

      woData?.forEach((wo: any) => {
        wo.wo_items?.forEach((item: any) => {
          // Lock to SBU Trucking only
          if (item.sbu_type?.toLowerCase() !== 'trucking') return;
          
          if (customerFilter && wo.customer_id !== customerFilter) return;
          
          const itemTruckType = item.item_data?.vehicle_type_name || "-";
          if (truckTypeFilter && itemTruckType !== truckTypeFilter) return;

          const originName = item.item_data?.shipper_name || item.item_data?.origin_name || "TBA";
          const destinationName = item.item_data?.recipient_name || item.item_data?.destination_name || "TBA";
          const routeStr = `${originName} → ${destinationName}`;

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
                ap_total: 0,
                cash_advance: 0,
                total_cost: 0,
                gross_margin: dealPrice,
                truck_type: itemTruckType
              });
            }
            return;
          }

          jos.forEach((jo: any) => {
             const joStatus = jo.status?.toLowerCase();
             if (activeStatusFilters.length > 0 && !activeStatusFilters.includes(joStatus)) return;

             const isInternal = !jo.fleets?.companies || jo.fleets?.companies?.name?.toLowerCase().includes('sentralogis');
             if (transporterFilter !== 'all') {
                if (transporterFilter === 'internal' && !isInternal) return;
                if (transporterFilter === 'vendor' && isInternal) return;
             }

             const cashTotal = Number(jo.advance_amount || 0);
             const apTotal = Number(jo.purchase_price || jo.vendor_price || 0);
             const totalCost = isInternal ? cashTotal : apTotal;
             const grossMargin = dealPrice - totalCost;

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
               ap_total: apTotal,
               cash_advance: cashTotal,
               total_cost: totalCost,
               gross_margin: grossMargin,
               truck_type: itemTruckType
             });
          });
        });
      });
      
      // [AI] Apply pagination after flattening
      const totalRecords = flattened.length;
      setTotalRecords(totalRecords);
      setAllData(flattened);
    } catch (err: unknown) {
      console.error("[AI] Sync error: ", err);
      toast.error("Sync Failed");
    } finally { setLoading(false); }
  }, [startDate, endDate, statusFilter, customerFilter, truckTypeFilter, transporterFilter, profile?.tenant_id]);

  const handleExportExcel = async () => {
    if (data.length === 0) return toast.error("No data to export");
    const tid = toast.loading("Excel Engine Starting...");
    try {
      const XLSX = await import("xlsx");
      const colLabels = selectedCols.map(id => columns.find(c => c.id === id)?.label || id);
      const excelData = data.map(row => {
        const filteredRow: any = {};
        selectedCols.forEach((colId, idx) => { filteredRow[colLabels[idx]] = row[colId]; });
        return filteredRow;
      });
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Trucking Report");
      XLSX.writeFile(workbook, `Trucking_SBU_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
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
      const head = [selectedCols.map(colId => columns.find(c => c.id === colId)?.label || colId)];
      const body = data.map(item => selectedCols.map(colId => {
        const val = item[colId];
        if (typeof val === 'number' && ['ar_total', 'cash_advance', 'ap_total', 'total_cost', 'gross_margin'].includes(colId)) {
          return `Rp ${val.toLocaleString('id-ID')}`;
        }
        return String(val || '-');
      }));
      doc.setFontSize(18); doc.text("SBU TRUCKING OPERATIONAL REPORT", 40, 50);
      doc.setFontSize(9); doc.text(`Generated: ${new Date().toLocaleString()}`, 40, 68);
      autoTable(doc, { headStyles: { fillColor: [15, 23, 42] }, head: head, body: body, startY: 85, theme: 'grid', styles: { fontSize: 8 } });
      doc.save(`Trucking_SBU_Matrix_${new Date().getTime()}.pdf`);
      toast.success("PDF Downloaded", { id: tid });
    } catch (err: unknown) { toast.error(`PDF Error: ${(err as Error).message}`, { id: tid }); }
  };

  useEffect(() => { 
    fetchMasterData(); 
    setPage(1); // Reset to page 1 when filters change
  }, [fetchReportData]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setShowStatusDropdown(false); };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Bottom Summary metrics calculations
  const totalRitase = data.length;
  const totalRevenue = data.reduce((sum, d) => sum + Number(d.ar_total || 0), 0);
  const totalCashAdvance = data.reduce((sum, d) => sum + Number(d.cash_advance || 0), 0);
  const totalVendorCost = data.reduce((sum, d) => sum + Number(d.ap_total || 0), 0);
  const totalCost = data.reduce((sum, d) => sum + Number(d.total_cost || 0), 0);
  const totalGrossMargin = data.reduce((sum, d) => sum + Number(d.gross_margin || 0), 0);
  const marginRatio = totalRevenue > 0 ? (totalGrossMargin / totalRevenue) * 100 : 0;
  
  const totalPages = pageSize === 999999 ? 1 : Math.max(1, Math.ceil(totalRecords / pageSize));
  const startRecord = totalRecords === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRecord = Math.min(page * pageSize, totalRecords);

  return (
    
      
      
      {/* Header Section */}
      
         
            
            
               Trucking SBU Matrix
               Trucking Operational Reporting System
            
         
         
             EXCEL
             PDF
         
      

      {/* Mobile Filter Toggle */}
      
         setShowFilters(!showFilters)} 
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
        >
          
          {showFilters ? 'Sembunyikan Filter' : 'Tampilkan Filter'}
        
      

      
         
         {/* Filter Sidebar */}
         
            
               
                 Time Horizon
                 
                    setStartDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:border-blue-500 transition-all" />
                    setEndDate(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-medium outline-none focus:border-blue-500 transition-all" />
                 
               
               
               
                  Execution Status
                   setShowStatusDropdown(!showStatusDropdown)}>
                     
                       {statusFilter.length > 0 ? `${statusFilter.length} Selected` : "All Statuses"}
                       
                     
                     {showStatusDropdown && (
                        
                           {operationalStatuses.map(s => (
                               { e.stopPropagation(); setStatusFilter(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]); }} className="w-full px-4 py-2.5 text-left text-xs font-semibold uppercase transition-all hover:bg-slate-50 flex items-center justify-between">{s.replace(/_/g, ' ')}{statusFilter.includes(s) && }
                           ))}
                        
                     )}
                  
               
               
               
                  Truck Type
                   setTruckTypeFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none cursor-pointer focus:border-blue-500 transition-all">
                     All Fleet Types
                     {truckTypes.map(t => {t})}
                  
               

               
                  Transporter
                  
                      setTransporterFilter('all')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${transporterFilter === 'all' ? 'bg-white text-slate-900 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-600'}`}>All
                      setTransporterFilter('internal')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${transporterFilter === 'internal' ? 'bg-white text-blue-600 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-600'}`}>Internal
                      setTransporterFilter('vendor')} className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${transporterFilter === 'vendor' ? 'bg-white text-emerald-600 shadow-sm font-bold' : 'text-slate-400 hover:text-slate-600'}`}>Vendor
                  
               

               
                 Account Client
                  setCustomerFilter(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-blue-500 transition-all">
                   All Clients
                   {customers.map(c => {c.legal_name || c.name})}
                 
               
            
         

         {/* Main Contents */}
         
            
            {/* SBU Snapshot Card */}
            
               
                  SBU Snapshot
                  Trucking Performance
                  
                     
                       
                         {totalRitase} Total Ritase
                       
                     
                     
                     
                       
                         Rp {totalRevenue.toLocaleString('id-ID')} Revenue (AR)
                       
                     
                  
                  
                     Driver AllowanceRp {totalCashAdvance.toLocaleString('id-ID')}
                     Vendor APRp {totalVendorCost.toLocaleString('id-ID')}
                     Total CostRp {totalCost.toLocaleString('id-ID')}
                     Net MarginRp {totalGrossMargin.toLocaleString('id-ID')} ({marginRatio.toFixed(1)}%)
                  
               
               
            

            {/* Table Matrix */}
            
               
                 Trucking Operational Matrix
                 {loading && }
               
               
               
                  
                     
                       
                         {selectedCols.map(colId => (
                           
                             {columns.find(c => c.id === colId)?.label || colId}
                           
                         ))}
                       
                     
                     
                       {data.map((row, idx) => (
                         
                           {selectedCols.map(colId => {
                             let val = row[colId];
                             if (colId === 'jo_status') {
                               const color = val?.includes('DONE') || val?.includes('DELIVERED') || val?.includes('FINISHED')
                                 ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                                 : 'bg-slate-100 text-slate-600 border-slate-200';
                               val = {val};
                             }
                             if (['ar_total', 'cash_advance', 'ap_total', 'total_cost', 'gross_margin'].includes(colId)) {
                               val = 
                                 Rp {Number(val || 0).toLocaleString('id-ID')}
                               ;
                             }
                             return (
                               
                                 {val}
                               
                             );
                           })}
                         
                       ))}
                     
                     
                     {/* Summary Footer */}
                     {data.length > 0 && (
                       
                         
                           
                             TOTAL REKAPITULASI
                           
                           
                             {totalRitase} Ritase
                           
                           
                           
                             Rp {totalRevenue.toLocaleString('id-ID')}
                           
                           
                             Rp {totalCashAdvance.toLocaleString('id-ID')}
                           
                           
                             Rp {totalVendorCost.toLocaleString('id-ID')}
                           
                           
                             Rp {totalCost.toLocaleString('id-ID')}
                           
                           
                             Rp {totalGrossMargin.toLocaleString('id-ID')} ({marginRatio.toFixed(1)}%)
                           
                         
                       
                     )}
                   
                   
                   {/* Pagination Controls */}
                   {data.length > 0 && (
                     
                       
                         
                           Showing {startRecord}-{endRecord} of {totalRecords} records
                         
                          {
                             const val = e.target.value;
                             setPageSize(val === 'all' ? 999999 : Number(val));
                             setPage(1);
                           }}
                           className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-[10px] font-bold text-slate-700 outline-none cursor-pointer focus:border-blue-500"
                         >
                           10 / page
                           30 / page
                           All lines
                         
                       
                       
                       
                          setPage(p => Math.max(1, p - 1))}
                           disabled={page === 1}
                           className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                         >
                           
                         
                         
                         
                           {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                             let pageNum: number;
                             if (totalPages = totalPages - 2) {
                               pageNum = totalPages - 4 + i;
                             } else {
                               pageNum = page - 2 + i;
                             }
                             
                             return (
                                setPage(pageNum)}
                                 className={`w-8 h-8 rounded-lg text-[10px] font-bold transition-all ${
                                   page === pageNum 
                                     ? 'bg-blue-600 text-white shadow-md' 
                                     : 'hover:bg-slate-100 text-slate-600'
                                 }`}
                               >
                                 {pageNum}
                               
                             );
                           })}
                         
                         
                          setPage(p => Math.min(totalPages, p + 1))}
                           disabled={page === totalPages}
                           className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                         >
                           
                         
                       
                     
                   )}
                   
                   {data.length === 0 && !loading && (
                     
                       
                       Trucking Matrix Empty
                     
                   )}
               
            
         
      
    
  );
}
