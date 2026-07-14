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
        const { data: joData, error: joErr } = await supabase
          .from('job_orders')
          .select('*')
          .eq('id', exception.reference_id)
          .single();
        
        if (joErr) throw joErr;

        if (joData) {
          // 2. Fetch WO Item
          const { data: woItem } = await supabase
            .from('wo_items')
            .select('*')
            .eq('id', joData.wo_item_id)
            .single();

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
            const { data: tu } = await supabase.from('tenant_users').select('full_name').eq('user_id', wo.created_by).single();
            if (tu) adminName = tu.full_name;
          }

          if (joData.updated_by) {
            const { data: upd } = await supabase.from('tenant_users').select('full_name').eq('user_id', joData.updated_by).single();
            if (upd) updaterName = upd.full_name;
          }

          if (joData.transporter_id) {
            const { data: t } = await supabase.from('md_entities').select('name').eq('id', joData.transporter_id).single();
            if (t) executorName = t.name;
          } else if (joData.driver_id) {
            const { data: d } = await supabase.from('md_drivers').select('name, phone_number').eq('id', joData.driver_id).single();
            if (d) {
              executorName = d.name;
              executorContact = d.phone_number || 'No Phone';
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
      } else {
        // Fallback for non-SLA exceptions (finance, hrd, etc)
        setDetails({
          type: 'GENERIC',
          message: 'Advanced RCA view is currently optimized for SLA Deadlock (Job Orders). This exception type will be supported soon.'
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
                Root Cause Analysis
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
              <div className="bg-white p-6 rounded-xl border text-slate-600 shadow-sm">
                {details.message}
              </div>
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
          ) : (
            <div className="flex-1 flex items-center justify-center text-white/50">
              <p>Loading Chat...</p>
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
