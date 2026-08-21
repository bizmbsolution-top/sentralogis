'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Loader2, X, AlertTriangle, AlertCircle, MessageSquare, Send, User, Clock, FileText, Truck } from 'lucide-react';
import { formatDistanceToNow, differenceInHours, isPast, parseISO } from 'date-fns';
import { useAuth } from '@/lib/hooks/useAuth';

import { useChat } from '@/lib/contexts/ChatContext';
import ChatPanel from '@/components/chat/ChatPanel';

interface ExceptionInvestigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  exception: any; 
}

export default function ExceptionInvestigationModal({ isOpen, onClose, exception }: ExceptionInvestigationModalProps) {
  const [loading, setLoading] = useState(false);
  const [details, setDetails] = useState<any>(null);
  const { profile } = useAuth();
  const { sendMessage, activeChannel } = useChat();

  useEffect(() => {
    if (isOpen && exception) {
      fetchDetails();
    }
  }, [isOpen, exception]);

  async function fetchDetails() {
    setLoading(true);
    setDetails(null);
    try {
      if (exception.anomaly_type === 'SLA_DEADLOCK') {
        // 1. Fetch Job Order
        const { data: joDataRaw, error: joErr } = await (supabase
          .from('job_orders' as any) as any)
          .select('*')
          .eq('id', exception.reference_id)
          .single();
        const joData = joDataRaw as any;
        
        if (joErr) throw joErr;

        if (joData) {
          // 2. Fetch WO Item
          const { data: woItemRaw } = await (supabase
            .from('wo_items' as any) as any)
            .select('*')
            .eq('id', joData.wo_item_id)
            .single();
          const woItem = woItemRaw as any;

          // 3. Fetch Work Order
          let wo: any = null;
          if (woItem?.wo_id) {
            const { data: woData } = await supabase
              .from('work_orders')
              .select('*')
              .eq('id', woItem.wo_id)
              .single();
            wo = woData;
          }

          // 4. Fetch Relations (Customer, Driver, Fleet, Transporter, Admin, Updater)
          let customerName = 'Unknown Customer';
          let executorName = 'Not Assigned';
          let executorContact = 'No Contact Available';
          let fleetPlate = 'No Fleet';
          let adminName = 'SBU Ops / Admin';
          let updaterName = '';

          if (wo?.customer_id) {
            const { data: c } = await supabase.from('md_entities').select('name').eq('id', wo.customer_id).single();
            if (c) customerName = c.name;
          }
          
          if (wo?.created_by) {
            const { data: tu } = await (supabase.from('tenant_users' as any) as any).select('full_name').eq('user_id', wo.created_by).single();
            if (tu) adminName = tu.full_name;
          }

          if (joData.updated_by) {
            const { data: upd } = await (supabase.from('tenant_users' as any) as any).select('full_name').eq('user_id', joData.updated_by).single();
            if (upd) updaterName = upd.full_name;
          }

          if (joData.transporter_id) {
            const { data: t } = await supabase.from('md_entities').select('name').eq('id', joData.transporter_id).single();
            if (t) executorName = t.name;
          } else if (joData.driver_id) {
            const { data: d } = await (supabase.from('md_drivers' as any) as any).select('name, phone').eq('id', joData.driver_id).single();
            if (d) {
              executorName = d.name;
              executorContact = d.phone || 'No Phone';
            }
          }

          if (joData.fleet_id) {
            const { data: f } = await supabase.from('md_fleets').select('plate_number').eq('id', joData.fleet_id).single();
            if (f) fleetPlate = f.plate_number;
          }

          // If no formal executor (driver/transporter) is found, use the last updater (or admin) as the executor
          if (executorName === 'Not Assigned') {
             executorName = updaterName || adminName;
             executorContact = 'Internal System User';
          }
          
          // 5. Parse specs and translate warehouse_id
          let specsObj: any = null;
          try {
             specsObj = typeof woItem?.item_data === 'string' ? JSON.parse(woItem.item_data) : woItem?.item_data;
             if (specsObj && specsObj.warehouse_id) {
                const { data: wh } = await supabase.from('md_warehouses').select('name').eq('id', specsObj.warehouse_id).single();
                if (wh) {
                   specsObj.warehouse_name = wh.name;
                   delete specsObj.warehouse_id; // Remove raw ID for display
                }
             }
          } catch (e) {
             specsObj = woItem?.item_data;
          }
          
          setDetails({
            type: 'SLA_RCA',
            wo: {
              id: wo?.id,
              customer: customerName,
              woNumber: wo?.wo_number,
              orderDate: wo?.order_date,
              executionDate: wo?.execution_date,
              remarks: wo?.notes || 'No special remarks'
            },
            item: {
              sbu: woItem?.sbu_type || joData.sbu_type,
              specs: specsObj || 'Standard service'
            },
            jo: {
              id: joData.id,
              joNumber: joData.jo_number,
              status: joData.status,
              executor: executorName,
              executorContact: executorContact,
              fleet: fleetPlate,
              updatedAt: joData.updated_at,
              notes: joData.notes,
              adminName: adminName
            }
          });
        }
      } else if (exception.anomaly_type === 'VENDOR_ANOMALY') {
        // 1. Fetch Job Order
        const { data: joDataRaw } = await (supabase
          .from('job_orders' as any) as any)
          .select('*')
          .eq('id', exception.reference_id)
          .single();
        const joData = joDataRaw as any;

        let vendorName = 'External Vendor';
        if (joData?.vendor_id) {
          const { data: v } = await supabase.from('md_entities').select('name').eq('id', joData.vendor_id).single();
          if (v) vendorName = v.name;
        }

        // 2. Fetch currently idle internal fleets for this tenant
        const { data: idleFleets } = await supabase
          .from('md_fleets')
          .select('id, plate_number, fleet_type, status')
          .eq('tenant_id', exception.tenant_id)
          .eq('status', 'available')
          .eq('is_active', true)
          .limit(6);

        setDetails({
          type: 'VENDOR_RCA',
          jo: {
            id: joData?.id || exception.reference_id,
            joNumber: joData?.jo_number || exception.reference_number,
            status: joData?.status || 'assigned',
            vendorName,
            basePrice: joData?.base_price || 0,
            purchasePrice: joData?.purchase_price || 0,
            createdAt: joData?.created_at || exception.detected_at
          },
          idleFleets: idleFleets || []
        });
      } else if (exception.anomaly_type === 'CLEARANCE_DEMURRAGE_RISK') {
        const { data: joDataRaw } = await (supabase
          .from('job_orders' as any) as any)
          .select('*')
          .eq('id', exception.reference_id)
          .single();
        const joData = joDataRaw as any;

        let woItemSpecs: any = {};
        if (joData?.wo_item_id) {
          const { data: wi } = await (supabase.from('wo_items' as any) as any).select('item_data, sbu_type').eq('id', joData.wo_item_id).single();
          if (wi?.item_data) {
            try {
              woItemSpecs = typeof wi.item_data === 'string' ? JSON.parse(wi.item_data) : wi.item_data;
            } catch (e) { woItemSpecs = { notes: wi.item_data }; }
          }
        }

        const dwellHours = joData?.created_at ? differenceInHours(new Date(), new Date(joData.created_at)) : 75;
        const dwellDays = Math.max(1, parseFloat((dwellHours / 24).toFixed(1)));
        const estimatedDemurrage = Math.max(0, Math.ceil(Number(dwellDays) - 3) * 750000); // Rp 750,000 / container / day past 3 free days

        setDetails({
          type: 'CLEARANCE_RCA',
          jo: {
            id: joData?.id || exception.reference_id,
            joNumber: joData?.jo_number || exception.reference_number,
            status: joData?.status || 'in_progress',
            createdAt: joData?.created_at || exception.detected_at,
            notes: joData?.notes || 'Customs PPJK Clearance Document in process'
          },
          specs: woItemSpecs,
          dwellHours,
          dwellDays,
          estimatedDemurrage
        });
      } else if (exception.anomaly_type === 'WAREHOUSE_STAGNATION' || exception.anomaly_type === 'INVENTORY_DISCREPANCY') {
        if (exception.anomaly_type === 'WAREHOUSE_STAGNATION') {
          const { data: taskDataRaw } = await (supabase
            .from('wh_tasks' as any) as any)
            .select('*, md_warehouses(name)')
            .eq('id', exception.reference_id)
            .single();
          const taskData = taskDataRaw as any;

          setDetails({
            type: 'WAREHOUSE_RCA',
            anomalyType: exception.anomaly_type,
            task: {
              id: taskData?.id || exception.reference_id,
              taskNumber: taskData?.task_number || exception.reference_number,
              taskType: taskData?.task_type || 'PUTAWAY',
              status: taskData?.status || 'PENDING',
              priority: taskData?.priority || 'HIGH',
              warehouseName: taskData?.md_warehouses?.name || 'Gudang Utama',
              createdAt: taskData?.created_at || exception.detected_at,
              notes: taskData?.notes || 'Task execution delayed > 48 hours'
            }
          });
        } else {
          const { data: invDataRaw } = await (supabase
            .from('wh_inventory' as any) as any)
            .select('*, md_warehouses(name), md_product_skus(sku_code, sku_name)')
            .eq('id', exception.reference_id)
            .single();
          const invData = invDataRaw as any;

          setDetails({
            type: 'WAREHOUSE_RCA',
            anomalyType: exception.anomaly_type,
            inventory: {
              id: invData?.id || exception.reference_id,
              skuCode: invData?.md_product_skus?.sku_code || 'SKU-UNKNOWN',
              skuName: invData?.md_product_skus?.sku_name || exception.reference_number,
              quantity: invData?.quantity || 0,
              status: invData?.status || 'DAMAGED',
              warehouseName: invData?.md_warehouses?.name || 'Gudang Utama',
              batchNumber: invData?.batch_number || 'N/A',
              updatedAt: invData?.updated_at || exception.detected_at
            }
          });
        }
      } else {
        // Fallback for generic/other cluster exceptions
        setDetails({
          type: 'GENERIC',
          message: `RCA Diagnostic Summary for ${exception.anomaly_type}: ${exception.description}`
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  const handleForwardRca = (hoursStuck: number) => {
    if (!activeChannel) {
      alert("Chat channel is still loading. Please wait a moment.");
      return;
    }
    const message = `⚠️ [DIRECTOR ALERT - SLA VIOLATION]
JO Number: ${details.jo.joNumber}
SBU: ${details.item.sbu}
Issue: Status tertahan di "${details.jo.status}" selama ${hoursStuck} Jam.
Action Required: Mohon segera beri klarifikasi dan update status!`;
    
    sendMessage(message);
  };

  const handleCustomsEscalation = () => {
    if (!activeChannel) {
      alert("Chat channel is still loading. Please wait a moment.");
      return;
    }
    const message = `🚨 [DIRECTOR ALERT - CUSTOMS DEMURRAGE RISK]
JO Clearance: ${details.jo.joNumber}
Port Dwell Time: ${details.dwellDays} Hari (${details.dwellHours} Jam)
Est. Demurrage Exposure: Rp ${details.estimatedDemurrage.toLocaleString('id-ID')}
Action Required: PPJK Lead mohon segera cek status SPPB & percepat pengeluaran kontainer!`;
    sendMessage(message);
    alert("Escalation sent to active chat channel!");
  };

  const handleVendorAuditTrigger = () => {
    if (!activeChannel) {
      alert("Chat channel is still loading. Please wait a moment.");
      return;
    }
    const message = `🚨 [DIRECTOR AUDIT - VENDOR ALLOCATION ANOMALY]
JO Number: ${details.jo.joNumber} (Assigned to Vendor: ${details.jo.vendorName})
Issue: Order dialokasikan ke vendor luar padahal terdapat ${details.idleFleets.length} Armada Internal dalam status Idle/Available di garasi!
Action Required: Dispatcher mohon beri pertanggungjawaban atau tarik kembali (Recall) ke Armada Internal!`;
    sendMessage(message);
    alert("Audit trigger broadcasted to operational team!");
  };

  const handleWarehouseAuditTrigger = () => {
    if (!activeChannel) {
      alert("Chat channel is still loading. Please wait a moment.");
      return;
    }
    const refText = details.task ? details.task.taskNumber : `${details.inventory?.skuCode} (${details.inventory?.status})`;
    const message = `🚨 [DIRECTOR AUDIT - WAREHOUSE EXCEPTION]
Reference: ${refText} (${details.anomalyType})
Location: ${details.task?.warehouseName || details.inventory?.warehouseName || 'Gudang'}
Issue: ${details.task ? 'Task tertahan > 48 Jam tanpa penyelesaian.' : 'Discrepancy / Karantina stok memerlukan penyesuaian Stock Opname segera.'}
Action Required: Warehouse Manager mohon segera lakukan audit fisik & penyelesaian!`;
    sendMessage(message);
    alert("Warehouse priority alert sent to WMS channel!");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col md:flex-row">
        
        {/* LEFT COLUMN: RCA & Analytics (65%) */}
        <div className="w-full md:w-[65%] flex flex-col border-r h-full overflow-hidden bg-slate-50">
          <div className="flex items-center justify-between p-5 bg-white border-b shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-red-600" />
                Root Cause Analysis ({exception.anomaly_type.replace(/_/g, ' ')})
              </h2>
              <p className="text-sm text-slate-500 mt-1">Diagnostic view for: {exception.reference_number}</p>
            </div>
            {/* Mobile close button only */}
            <button onClick={onClose} className="md:hidden p-2 hover:bg-slate-100 rounded-lg text-slate-500">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 overflow-y-auto grow space-y-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-10 h-10 animate-spin text-red-500 mb-4" />
                <p className="text-slate-500 font-medium">Extracting hierarchical data...</p>
              </div>
            ) : !details ? (
              <div className="text-center py-10 text-slate-500">Data tidak ditemukan.</div>
            ) : details.type === 'GENERIC' ? (
              <div className="bg-white p-6 rounded-xl border text-slate-700 font-medium shadow-sm flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <span>{details.message}</span>
              </div>
            ) : details.type === 'VENDOR_RCA' ? (
              <>
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden border-l-4 border-l-orange-500">
                  <div className="bg-orange-50 px-4 py-3 border-b border-orange-100 flex justify-between items-center">
                    <h3 className="font-semibold text-orange-900 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-orange-600" />
                      1. Vendor Allocation Diagnosis
                    </h3>
                    <span className="text-xs font-mono bg-orange-100 px-2 py-1 rounded text-orange-800 font-bold">{details.jo.joNumber}</span>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <DetailItem label="Assigned Vendor" value={<span className="font-bold text-orange-700">{details.jo.vendorName}</span>} />
                      <DetailItem label="Order Status" value={<span className="uppercase font-semibold">{details.jo.status}</span>} />
                      <DetailItem label="Vendor Cost (COGS)" value={`Rp ${Number(details.jo.purchasePrice || 0).toLocaleString('id-ID')}`} />
                      <DetailItem label="Order Revenue" value={`Rp ${Number(details.jo.basePrice || 0).toLocaleString('id-ID')}`} />
                    </div>
                    <div className="bg-orange-50/80 border border-orange-200 rounded-lg p-3 flex gap-3 items-start">
                      <AlertCircle className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-orange-900">Asset Utilization & Margin Leakage Risk</p>
                        <p className="text-xs text-orange-800 mt-0.5">Menggunakan vendor luar saat armada sendiri menganggur menyebabkan kerugian beban penyusutan armada ganda (*double depreciation loss*).</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <div className="bg-slate-100 px-4 py-3 border-b flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-emerald-600" />
                      2. Internal Fleets Sitting Idle ({details.idleFleets.length} Units Available)
                    </h3>
                  </div>
                  <div className="p-4 space-y-3">
                    {details.idleFleets.length === 0 ? (
                      <p className="text-sm text-slate-500 italic">No idle fleets recorded right now.</p>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {details.idleFleets.map((f: any) => (
                          <div key={f.id} className="p-3 bg-emerald-50/60 border border-emerald-200 rounded-lg flex items-center justify-between">
                            <div>
                              <span className="font-extrabold text-slate-900 text-sm">{f.plate_number}</span>
                              <span className="block text-[11px] text-slate-500 uppercase">{f.fleet_type || 'Truck'}</span>
                            </div>
                            <span className="text-[10px] bg-emerald-600 text-white font-bold px-2 py-0.5 rounded-full uppercase">Idle / Ready</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <button 
                      onClick={handleVendorAuditTrigger}
                      className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold rounded-xl shadow transition-colors w-full justify-center"
                    >
                      <Send className="w-4 h-4" />
                      Recall to Internal Fleet & Trigger Dispatch Audit
                    </button>
                  </div>
                </div>
              </>
            ) : details.type === 'CLEARANCE_RCA' ? (
              <>
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden border-l-4 border-l-red-600">
                  <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex justify-between items-center">
                    <h3 className="font-semibold text-red-900 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-red-600" />
                      1. Port Dwell Time & Demurrage Exposure
                    </h3>
                    <span className="text-xs font-mono bg-red-100 px-2 py-1 rounded text-red-800 font-bold">{details.jo.joNumber}</span>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-3 gap-4 bg-red-50/50 p-3 rounded-xl border border-red-100 text-center">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Current Dwell Time</span>
                        <p className="text-xl font-black text-red-700">{details.dwellDays} <span className="text-xs font-normal">Hari</span></p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Free Time Quota</span>
                        <p className="text-xl font-black text-slate-700">3 <span className="text-xs font-normal">Hari</span></p>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Est. Demurrage Cost</span>
                        <p className="text-xl font-black text-red-600">Rp {Number(details.estimatedDemurrage).toLocaleString('id-ID')}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <DetailItem label="Status Kepabeanan" value={<span className="font-bold uppercase text-indigo-700">{details.jo.status}</span>} />
                      <DetailItem label="Tanggal Submit / Entry" value={new Date(details.jo.createdAt).toLocaleString('id-ID')} />
                      <DetailItem label="PPJK / Field Notes" value={details.jo.notes} className="col-span-2" />
                    </div>

                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3.5 flex gap-3 items-start">
                      <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-bold text-amber-900">Risiko Jalur Merah & Penumpukan Peti Kemas</p>
                        <p className="text-xs text-amber-800 mt-0.5">Segera minta tim kepabeanan (PPJK) untuk melampirkan respons CEISA terbaru (Notul / SPPB) guna memitigasi pembengkakan denda harian.</p>
                      </div>
                    </div>

                    <button 
                      onClick={handleCustomsEscalation}
                      className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl shadow transition-colors w-full justify-center"
                    >
                      <Send className="w-4 h-4" />
                      Escalate to PPJK Lead & Request Urgent SPPB Release
                    </button>
                  </div>
                </div>
              </>
            ) : details.type === 'WAREHOUSE_RCA' ? (
              <>
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden border-l-4 border-l-amber-500">
                  <div className="bg-amber-50 px-4 py-3 border-b border-amber-100 flex justify-between items-center">
                    <h3 className="font-semibold text-amber-900 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-amber-600" />
                      1. Warehouse Operations RCA ({details.anomalyType})
                    </h3>
                  </div>
                  <div className="p-4 space-y-4">
                    {details.task ? (
                      <div className="grid grid-cols-2 gap-4">
                        <DetailItem label="Task Number" value={details.task.taskNumber} />
                        <DetailItem label="Task Type" value={<span className="font-bold text-indigo-700">{details.task.taskType}</span>} />
                        <DetailItem label="Current Status" value={<span className="uppercase font-bold text-amber-700">{details.task.status}</span>} />
                        <DetailItem label="Warehouse Location" value={details.task.warehouseName} />
                        <DetailItem label="Task Notes" value={details.task.notes} className="col-span-2" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-4">
                        <DetailItem label="SKU Code & Name" value={<span className="font-bold text-slate-900">{details.inventory?.skuCode} - {details.inventory?.skuName}</span>} className="col-span-2" />
                        <DetailItem label="Quantity Affected" value={<span className="font-black text-red-600 text-base">{details.inventory?.quantity} Units</span>} />
                        <DetailItem label="Inventory Status" value={<span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded text-xs uppercase">{details.inventory?.status}</span>} />
                        <DetailItem label="Warehouse Location" value={details.inventory?.warehouseName} />
                        <DetailItem label="Batch / Lot Number" value={details.inventory?.batchNumber} />
                      </div>
                    )}

                    <div className="bg-slate-100 p-3.5 rounded-lg border flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-600">Performa Gudang & Audit Fisik Diperlukan</span>
                      <button 
                        onClick={handleWarehouseAuditTrigger}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow transition-colors"
                      >
                        Trigger WMS Audit Priority
                      </button>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <>
                {/* LEVEL 1: Work Order Context */}
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <div className="bg-slate-100 px-4 py-3 border-b flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-500" />
                      1. Work Order Context
                    </h3>
                    <span className="text-xs font-mono bg-slate-200 px-2 py-1 rounded text-slate-700">{details.wo.woNumber}</span>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <DetailItem label="Customer" value={details.wo.customer} />
                      <DetailItem label="Remarks" value={details.wo.remarks} />
                      <DetailItem label="Order Date" value={details.wo.orderDate} />
                      <DetailItem label="Target Execution" value={details.wo.executionDate} />
                    </div>
                    {/* SLA Logic WO */}
                    {details.wo.executionDate && isPast(parseISO(details.wo.executionDate)) && details.jo.status !== 'completed' && (
                      <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 flex gap-3 items-start">
                        <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-red-800">SLA Violation: Execution Delayed</p>
                          <p className="text-sm text-red-700 mt-0.5">Eksekusi tertunda melewati jadwal yang dijanjikan ({details.wo.executionDate}). Pelanggan berisiko komplain.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* LEVEL 2: Service Level */}
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                  <div className="bg-slate-100 px-4 py-3 border-b flex justify-between items-center">
                    <h3 className="font-semibold text-slate-800 flex items-center gap-2">
                      <Truck className="w-4 h-4 text-slate-500" />
                      2. Service Requirement
                    </h3>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <DetailItem label="SBU / Service" value={<span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">{details.item.sbu}</span>} />
                      
                      <div className="col-span-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Specifications</p>
                        {(() => {
                          try {
                            const specs = typeof details.item.specs === 'string' ? JSON.parse(details.item.specs) : details.item.specs;
                            if (typeof specs === 'object' && specs !== null) {
                              return (
                                <div className="bg-slate-50 p-3 rounded-lg border text-sm grid grid-cols-2 gap-y-2 gap-x-4">
                                  {Object.entries(specs).map(([k, v]) => (
                                    <div key={k} className="flex flex-col">
                                      <span className="text-xs text-slate-400 capitalize">{k.replace(/_/g, ' ')}</span>
                                      <span className="font-medium text-slate-700">{String(v)}</span>
                                    </div>
                                  ))}
                                </div>
                              );
                            }
                            return <div className="text-sm font-medium text-slate-900 mt-1">{details.item.specs}</div>;
                          } catch (e) {
                            return <div className="text-sm font-medium text-slate-900 mt-1">{details.item.specs}</div>;
                          }
                        })()}
                      </div>
                    </div>
                    {/* SLA Logic Service */}
                    {details.jo.executor === 'Not Assigned' && details.item.sbu === 'TRUCKING' && (
                      <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-3 items-start">
                        <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-bold text-amber-800">SLA Warning: Resource Not Allocated</p>
                          <p className="text-sm text-amber-700 mt-0.5">Transporter atau Armada belum dialokasikan untuk layanan TRUCKING ini. Hubungi tim Ops Dispatcher segera.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* LEVEL 3: Job Order Execution */}
                <div className="bg-white rounded-xl border shadow-sm overflow-hidden border-l-4 border-l-red-500">
                  <div className="bg-red-50 px-4 py-3 border-b border-red-100 flex justify-between items-center">
                    <h3 className="font-semibold text-red-900 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      3. Job Order Execution (STUCK)
                    </h3>
                    <span className="text-xs font-mono bg-red-100 px-2 py-1 rounded text-red-800">{details.jo.joNumber}</span>
                  </div>
                  <div className="p-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <DetailItem label="Current Status" value={<span className="uppercase font-bold">{details.jo.status}</span>} />
                      <DetailItem label="Last Updated" value={new Date(details.jo.updatedAt).toLocaleString()} />
                      <DetailItem label="Executor" value={details.jo.executor} />
                      <DetailItem label="Executor Contact" value={details.jo.executorContact} />
                      <DetailItem label="Field Notes" value={details.jo.notes || 'No remarks from field'} className="col-span-2" />
                    </div>
                    {/* SLA Logic JO */}
                    {(() => {
                      const hoursStuck = differenceInHours(new Date(), new Date(details.jo.updatedAt));
                      if (hoursStuck > 24) {
                        return (
                          <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-4 flex flex-col gap-3">
                            <div className="flex gap-3 items-start">
                              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-sm font-bold text-red-800">SLA Violation: Process Deadlock</p>
                                <p className="text-sm text-red-700 mt-0.5">Status tertahan di "{details.jo.status}" selama {hoursStuck} Jam. Staf operasional tidak memperbarui data, kemungkinan armada bermasalah di lapangan.</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => handleForwardRca(hoursStuck)}
                              className="mt-2 self-start flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                            >
                              <MessageSquare className="w-4 h-4" />
                              Forward Analysis to Chat
                            </button>
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Chat Panel (35%) */}
        <div className="w-full md:w-[35%] flex flex-col h-full bg-[#0a0e27] relative">
          <div className="absolute right-4 top-4 z-10">
            <button onClick={onClose} className="hidden md:block p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
          
          {details?.jo?.id && profile?.id ? (
            <ChatPanel 
              channelType="job_order" 
              entityId={details.jo.id} 
              userId={profile.id} 
              tenantId={profile.tenant_id}
            />
          ) : details?.task?.id && profile?.id ? (
            <ChatPanel 
              channelType="job_order" 
              entityId={details.task.id} 
              userId={profile.id} 
              tenantId={profile.tenant_id}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-white/50 p-6 text-center">
              <MessageSquare className="w-10 h-10 mb-3 text-white/30" />
              <p className="text-sm font-medium text-white/70">Escalation & Team Chat</p>
              <p className="text-xs text-white/40 mt-1">Gunakan tombol trigger di panel kiri untuk menyiarkan eskalasi langsung ke kanal operasional aktif.</p>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}

function DetailItem({ label, value, className = '' }: { label: string, value: React.ReactNode, className?: string }) {
  return (
    <div className={className}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{label}</p>
      <div className="text-sm font-medium text-slate-900 mt-1">{value || '-'}</div>
    </div>
  );
}
