'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import {
  sendTruckArrivedWA,
  sendUnloadingStartWA,
  sendCheckingDoneWA,
  sendPutawayStartWA,
  sendCompletedWA,
} from '@/lib/notifications/warehouseWA';
import { 
  X, Loader2, ArrowRight, Truck, Package, PackageX, PackageCheck, AlertTriangle, User, Calendar, Edit2, CloudDownload, CheckCircle2, Search, ChevronDown, MessageCircle, Plus, MapPin
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import ProductFormModal from '@/app/(dashboard)/hq/master-data/products/components/ProductFormModal';
import ContactFormModal from '@/components/master/ContactFormModal';
import BATBGenerator from './BATBGenerator';


interface ReceiptDetailModalProps {
  receiptId: string;
  onClose: () => void;
}

export default function ReceiptDetailModal({ receiptId, onClose }: ReceiptDetailModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [receipt, setReceipt] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [editProductModalId, setEditProductModalId] = useState<string | null>(null);
  const [fleets, setFleets] = useState<any[]>([]);
  const [fleetSelectOpen, setFleetSelectOpen] = useState(false);
  const [driverSelectOpen, setDriverSelectOpen] = useState(false);
  const [damageRecords, setDamageRecords] = useState<any[]>([]);
  const [quarantineLocations, setQuarantineLocations] = useState<any[]>([]);
  const [isTransporterModalOpen, setIsTransporterModalOpen] = useState(false);
  const [transporters, setTransporters] = useState<any[]>([]);
  const [transporterInput, setTransporterInput] = useState('');
  const [transporterDropdownOpen, setTransporterDropdownOpen] = useState(false);
  const [selectedTransporterId, setSelectedTransporterId] = useState<string | null>(null);
  const [transporterDrivers, setTransporterDrivers] = useState<any[]>([]);
  const transporterDropdownRef = useRef<HTMLDivElement>(null);
  const fleetDropdownRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch Receipt
      const { data: recData, error: recError } = await supabase
        .from('wh_inbound_receipts')
        .select(`
          *,
          transporter:transporter_id(name),
          fleet:fleet_id(plate_number),
          driver:driver_id(name, whatsapp)
        `)
        .eq('id', receiptId)
        .single();
      
      if (recError) throw recError;

      // Fetch warehouse name
      if (recData.warehouse_id) {
        const { data: whData } = await supabase.from('md_warehouses').select('name').eq('id', recData.warehouse_id).single();
        if (whData) recData.warehouse_name = whData.name;
      }

      // Fetch customer name via WO chain
      if (recData.wo_item_id) {
        const { data: joData } = await supabase.from('job_orders').select('wo_item_id').eq('id', recData.wo_item_id).single();
        if (joData?.wo_item_id) {
           const { data: woItemData } = await supabase.from('wo_items').select('wo_id').eq('id', joData.wo_item_id).single();
           if (woItemData?.wo_id) {
              const { data: woData } = await supabase.from('work_orders').select('customer_id').eq('id', woItemData.wo_id).single();
              if (woData?.customer_id) {
                 const { data: custData } = await supabase.from('md_entities').select('name').eq('id', woData.customer_id).single();
                 if (custData) recData.customer_name = custData.name;
              }
           }
        }
      }

      setReceipt(recData);
      // Fetch Items
      const { data: itemsData, error: itemsError } = await supabase
        .from('wh_inbound_receipt_items')
        .select(`
          *,
          product:product_sku_id(name, sku_code, unit)
        `)
        .eq('receipt_id', receiptId)
        .order('created_at', { ascending: true });
        
      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      if (recData.wo_item_id) {
        const { data: assignData } = await supabase
          .from('jo_warehouse_assignments')
          .select(`
             warehouse_location_id,
             quantity,
             location:md_warehouse_locations(code),
             wo_item_manifests!wo_item_manifest_id(product_sku_id)
          `)
          .eq('job_order_id', recData.wo_item_id);
        setAssignments(assignData || []);
      } else {
        setAssignments([]);
      }

      if (['CHECKING_DONE', 'PUTAWAY_IN_PROGRESS', 'COMPLETED'].includes(recData.status)) {
        const { data: damageData } = await supabase
          .from('wh_inbound_damage_records')
          .select('*')
          .eq('receipt_id', receiptId)
          .order('created_at', { ascending: true });
        setDamageRecords(damageData || []);
      }
    } catch (error: any) {
      toast.error('Gagal memuat detail receipt');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [receiptId, onClose]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const sendStatusWA = async (newStatus: string) => {
    try {
      const receiptData = { ...receipt, id: receiptId };
      switch (newStatus) {
        case 'TRUCK_ARRIVED':
          await sendTruckArrivedWA(receiptData);
          break;
        case 'UNLOADING':
          await sendUnloadingStartWA(receiptData);
          break;
        case 'CHECKING_DONE':
          await sendCheckingDoneWA(receiptData, items, damageRecords);
          break;
        case 'PUTAWAY_IN_PROGRESS':
          await sendPutawayStartWA(receiptData);
          break;
        case 'COMPLETED':
          await sendCompletedWA(receiptData, items, damageRecords);
          break;
      }
    } catch (e) {
      console.warn('[WA] Gagal kirim notifikasi:', e);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setSubmitting(true);
    try {
      // Update Receipt Status
      const { error } = await supabase
        .from('wh_inbound_receipts')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', receiptId);

      if (error) throw error;

      // [AI] Sync JO status and WO status if newStatus is COMPLETED
      if (newStatus === 'COMPLETED' && receipt?.wo_item_id) {
        const joId = receipt.wo_item_id;
        
        // 1. Update JO status
        await supabase.from('job_orders').update({ status: 'completed' }).eq('id', joId);

        // 2. Check if all JOs for the parent wo_item are completed
        const { data: joData } = await supabase.from('job_orders').select('wo_item_id').eq('id', joId).single();
        if (joData?.wo_item_id) {
          const parentWoItemId = joData.wo_item_id;
          const { data: siblingJOs } = await supabase.from('job_orders').select('status').eq('wo_item_id', parentWoItemId);
          
          if (siblingJOs) {
            const allCompleted = siblingJOs.every((jo: any) => ['completed', 'done', 'selesai'].includes(jo.status?.toLowerCase()));
            if (allCompleted) {
              await supabase.from('wo_items').update({ status: 'completed' }).eq('id', parentWoItemId);
            }
          }
        }
      }

      // Log Milestone
      await supabase.from('wh_milestone_logs').insert({
        tenant_id: receipt.tenant_id,
        reference_type: 'INBOUND_RECEIPT',
        reference_id: receiptId,
        milestone_event: `Status changed to ${newStatus}`
      });

      // Send WA Notification (async, non-blocking)
      sendStatusWA(newStatus);

      toast.success(`Status diperbarui menjadi ${newStatus}`);
      fetchData(); // Refresh data
    } catch (error: any) {
      toast.error('Gagal memperbarui status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleItemChange = (itemId: string, field: string, value: any) => {
    setItems(items.map(item => item.id === itemId ? { ...item, [field]: value } : item));
  };

  const submitChecking = async () => {
    setSubmitting(true);
    try {
      // Update each item
      for (const item of items) {
        const { error } = await supabase
          .from('wh_inbound_receipt_items')
          .update({
            actual_good_qty: item.actual_good_qty,
            quarantine_qty: item.quarantine_qty,
            rejected_qty: item.rejected_qty,
            damage_source: item.damage_source,
            damage_condition: item.damage_condition,
            damage_notes: item.damage_notes,
          })
          .eq('id', item.id);
        if (error) throw error;
      }

      // Update status to PUTAWAY_IN_PROGRESS
      await handleUpdateStatus('PUTAWAY_IN_PROGRESS');
      toast.success('Pengecekan fisik selesai. Lanjut proses Putaway.');
    } catch (error: any) {
      toast.error('Gagal menyimpan hasil pengecekan');
      setSubmitting(false); // only reset if error, success handled by handleUpdateStatus
    }
  };

  const finishPutaway = async () => {
    setSubmitting(true);
    try {
      // In a real WMS, we would update `wh_inventory` here based on `actual_good_qty` and `quarantine_qty`.
      // Since `location_id` logic needs its own UI, we simulate it for now.
      
      // Mark as completed
      await handleUpdateStatus('COMPLETED');
    } catch (error: any) {
      toast.error('Gagal menyelesaikan Putaway');
      setSubmitting(false);
    }
  };

  const handleUploadBATB = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setSubmitting(true);
    try {
      const fileName = `batb_${receiptId}_${Date.now()}.pdf`;
      const { data, error } = await supabase.storage
        .from('inbound-docs')
        .upload(`documents/${fileName}`, file, { upsert: true });

      if (error) throw error;

      const { data: publicUrlData } = supabase.storage
        .from('inbound-docs')
        .getPublicUrl(`documents/${fileName}`);

      const { error: updateError } = await supabase
        .from('wh_inbound_receipts')
        .update({ batb_document_url: publicUrlData.publicUrl })
        .eq('id', receiptId);

      if (updateError) throw updateError;
      
      toast.success('BATB Berhasil diunggah!');
      fetchData();
    } catch (err: any) {
      console.error(err);
      toast.error('Gagal mengunggah BATB');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadPOD = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setSubmitting(true);
    try {
      const fileName = `pod_${receiptId}_${Date.now()}.pdf`;
      const { data, error } = await supabase.storage
        .from('inbound-docs')
        .upload(`documents/${fileName}`, file, { upsert: true });
      if (error) throw error;
      const { data: publicUrlData } = supabase.storage
        .from('inbound-docs')
        .getPublicUrl(`documents/${fileName}`);
      await supabase.from('wh_inbound_receipts').update({ pod_document_url: publicUrlData.publicUrl }).eq('id', receiptId);
      toast.success('Dokumen POD berhasil diunggah!');
      fetchData();
    } catch (err: any) {
      toast.error('Gagal mengunggah POD');
    } finally {
      setSubmitting(false);
    }
  };

  // [AI] Extracted fetchTransporters so it can be called from onSuccess of TransportersFormModal
  // [AI] No tenant_id filter — matches TransportersTable.tsx pattern (column may not exist on deployed DB)
  const fetchTransporters = useCallback(async () => {
    if (!receipt?.tenant_id) return [];
    
    // Get external vendors
    const { data: vendorData, error: vendorError } = await supabase.from('md_entities')
      .select('id, name')
      .eq('tenant_id', receipt.tenant_id)
      .eq('is_vendor', true)
      .eq('is_active', true)
      .order('name', { ascending: true });
      
    // Get internal HQ (OWN)
    const { data: internalData } = await supabase.from('md_entities')
      .select('id, name')
      .eq('tenant_id', receipt.tenant_id)
      .eq('is_vendor', false)
      .eq('is_active', true)
      .limit(1);

    if (vendorError) {
      console.error('[fetchTransporters] Error:', vendorError.message, '| Code:', vendorError.code, '| Details:', vendorError.details, '| Hint:', vendorError.hint);
      return [];
    }
    
    const combined = [...(internalData || []), ...(vendorData || [])];
    const list = combined.map(e => ({ id: e.id, transporter_name: e.name }));
    setTransporters(list);
    return list;
  }, [receipt?.tenant_id]);

  // Fetch transporters once on mount
  useEffect(() => {
    fetchTransporters();
  }, [fetchTransporters]);

  // [AI] Init transporter input + auto-restore selectedTransporterId by matching name
  useEffect(() => {
    if (receipt && transporters.length > 0) {
      const name = receipt.transporter_name_manual || receipt.transporter?.name || '';
      setTransporterInput(name);
      if (name) {
        const matched = transporters.find((t) => t.transporter_name === name);
        if (matched) {
          setSelectedTransporterId(matched.id);
        }
      }
    }
  }, [receipt, transporters]);

  // Fetch fleets & drivers based on selected transporter
  useEffect(() => {
    if (!receipt?.tenant_id) { setFleets([]); setTransporterDrivers([]); return; }
    if (!selectedTransporterId) {
      setFleets([]);
      setTransporterDrivers([]);
      return;
    }
    Promise.all([
      supabase.from('md_fleets')
        .select('id, plate_number, status')
        .eq('entity_id', selectedTransporterId)
        .eq('is_active', true),
      supabase.from('md_drivers')
        .select('id, name, whatsapp')
        .eq('entity_id', selectedTransporterId)
        .eq('is_active', true),
    ]).then(([fleetsRes, driversRes]) => {
      setFleets(fleetsRes.data || []);
      setTransporterDrivers(driversRes.data || []);
    });
  }, [selectedTransporterId, receipt?.tenant_id]);

  // Fetch quarantine locations
  useEffect(() => {
    if (receipt?.status === 'CHECKING_DONE' && receipt?.warehouse_id) {
      supabase.from('md_warehouse_locations')
        .select('id, code, zone')
        .eq('warehouse_id', receipt.warehouse_id)
        .eq('location_type', 'QUARANTINE')
        .eq('is_active', true)
        .order('code', { ascending: true })
        .then(({ data }) => setQuarantineLocations(data || []));
    }
  }, [receipt?.status, receipt?.warehouse_id]);

  // [AI] Click-outside handler to close transporter dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (transporterDropdownRef.current && !transporterDropdownRef.current.contains(e.target as Node)) {
        setTransporterDropdownOpen(false);
      }
      if (fleetDropdownRef.current && !fleetDropdownRef.current.contains(e.target as Node)) {
        setFleetSelectOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTransporterDropdownOpen(false);
        setFleetSelectOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const handleDamageDecision = async (recordId: string, decision: string) => {
    setSubmitting(true);
    try {
      const updateData: any = {
        decision,
        decision_by: profile?.id,
        decision_at: new Date().toISOString(),
      };
      if (decision === 'ACCEPT_QUARANTINE') {
        const loc = quarantineLocations[0];
        if (!loc) { toast.error('Tidak ada lokasi quarantine tersedia'); setSubmitting(false); return; }
        updateData.quarantine_location_id = loc.id;
      }
      await supabase.from('wh_inbound_damage_records').update(updateData).eq('id', recordId);
      toast.success(`Damage ${decision === 'ACCEPT_QUARANTINE' ? 'diterima ke Quarantine' : 'ditolak (Return)'}`);
      fetchData();
    } catch (err) {
      toast.error('Gagal menyimpan keputusan');
    } finally {
      setSubmitting(false);
    }
  };

  const handleOverageDecision = async (itemId: string, decision: string) => {
    setSubmitting(true);
    try {
      await supabase.from('wh_inbound_receipt_items').update({ over_decision: decision }).eq('id', itemId);
      toast.success(`Kelebihan ${decision === 'ACCEPT_GOOD' ? 'diterima ke stock bagus' : 'ditolak'}`);
      fetchData();
    } catch (err) {
      toast.error('Gagal menyimpan keputusan overage');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveChecking = async () => {
    const pendingDamage = damageRecords.some(r => r.decision === 'PENDING');
    const pendingOverage = items.some(i => {
      const overage = Number(i.actual_good_qty) - Number(i.expected_qty);
      return overage > 0 && i.over_decision === 'PENDING';
    });
    if (pendingDamage || pendingOverage) {
      toast.error('Masih ada keputusan PENDING. Selesaikan semua terlebih dahulu.');
      return;
    }
    await handleUpdateStatus('PUTAWAY_IN_PROGRESS');
  };

  if (loading || !receipt) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  // Determine actions based on status
  const isExpected = receipt.status === 'EXPECTED';
  const isArrived = receipt.status === 'TRUCK_ARRIVED';
  const isUnloading = receipt.status === 'UNLOADING';
  const isChecking = receipt.status === 'CHECKING';
  const isCheckingDone = receipt.status === 'CHECKING_DONE';
  const isPutaway = receipt.status === 'PUTAWAY_IN_PROGRESS';
  const isCompleted = receipt.status === 'COMPLETED';
  const isTransporterFilled = receipt.transporter_name_manual || receipt.transporter?.name;
  const isDriverFilled = receipt.driver_name_manual || receipt.driver?.name;
  const canReadyToUnload = isTransporterFilled && isDriverFilled;



  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-none bg-slate-50">
        {/* Header */}
        <div className="p-6 bg-white border-b border-slate-200 flex flex-col md:flex-row md:items-start justify-between gap-4 sticky top-0 z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
              <CloudDownload size={24} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-black font-mono text-slate-900">{receipt.receipt_number}</h2>
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                  ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                  {receipt.status.replace(/_/g, ' ')}
                </span>

              </div>
              <p className="text-sm text-slate-500 font-medium">Inbound Receipt Details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors self-start">
            <X size={20} className="text-slate-400 hover:text-slate-900" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Workflow Progress */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
            {['EXPECTED', 'TRUCK_ARRIVED', 'UNLOADING', 'CHECKING', 'CHECKING_DONE', 'PUTAWAY_IN_PROGRESS', 'COMPLETED'].map((step, idx, arr) => {
              const passed = arr.indexOf(receipt.status) >= idx;
              const current = receipt.status === step;
              return (
                <div key={step} className="flex items-center gap-2">
                  <div className={`flex items-center gap-2 ${passed ? 'text-blue-600' : ''} ${current ? 'bg-blue-50 px-2 py-1 rounded' : ''}`}>
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 ${passed ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'}`}>
                      {passed ? <CheckCircle2 size={12} /> : idx + 1}
                    </div>
                    <span>{step.replace(/_/g, ' ')}</span>
                  </div>
                  {idx < arr.length - 1 && <ArrowRight size={14} className="opacity-50" />}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Info Cards */}
            <div className="space-y-6 col-span-1">
              <Card className="p-4 border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Truck size={16} className="text-slate-500" /> Logistics Info
                </h3>
              <div className="space-y-3 text-sm">
                <div className="relative" ref={transporterDropdownRef}>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest">Transporter</span>
                  {!isCompleted ? (
                    <div className="flex gap-2 mt-1">
                      <div className="relative flex-1">
                        <div className="relative">
                          <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                          <input
                            type="text"
                            value={transporterInput}
                            onChange={(e) => {
                              setTransporterInput(e.target.value);
                              setTransporterDropdownOpen(true);
                              setSelectedTransporterId(null);
                            }}
                            onFocus={() => setTransporterDropdownOpen(true)}
                            className="w-full border border-slate-200 rounded pl-7 pr-2 py-1 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none text-slate-900 bg-white transition-all"
                            placeholder="Cari transporter..."
                          />
                        </div>
                        {transporterDropdownOpen && (() => {
                          const filtered = transporters.filter((t) =>
                            t.transporter_name.toLowerCase().includes(transporterInput.toLowerCase())
                          );
                          return (
                            <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                              {filtered.length > 0 ? filtered.map((t) => (
                                <div
                                  key={t.id}
                                  onMouseDown={async () => {
                                    setTransporterInput(t.transporter_name);
                                    setTransporterDropdownOpen(false);
                                    setSelectedTransporterId(t.id);
                                    try {
                                      await supabase.from('wh_inbound_receipts').update({ transporter_name_manual: t.transporter_name }).eq('id', receipt.id);
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                  className={`px-3 py-2.5 text-sm cursor-pointer flex items-center justify-between transition-colors ${
                                    selectedTransporterId === t.id
                                      ? 'bg-blue-50 border-l-2 border-blue-600'
                                      : 'hover:bg-slate-50 border-l-2 border-transparent'
                                  }`}
                                >
                                  <span className={`font-medium ${selectedTransporterId === t.id ? 'text-blue-700' : 'text-slate-900'}`}>{t.transporter_name}</span>
                                </div>
                              )) : (
                                <div className="p-3 text-xs text-slate-400 text-center italic">
                                  {transporterInput.trim()
                                    ? <>Tidak ada transporter &quot;{transporterInput}&quot;. Klik <strong>+ Add</strong> untuk tambah baru.</>
                                    : <>Belum ada data transporter. Klik <strong>+ Add</strong> untuk tambah baru.</>
                                  }
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </div>
                      <button
                        onClick={() => setIsTransporterModalOpen(true)}
                        className="px-2.5 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-1 text-xs font-bold shrink-0 shadow-sm"
                        title="Tambah Transporter Baru"
                      >
                        <Plus size={14} /> Add
                      </button>
                    </div>
                  ) : (
                    <span className="font-medium text-slate-900">{receipt.transporter_name_manual || receipt.transporter?.name || '-'}</span>
                  )}
                </div>
                <div ref={fleetDropdownRef}>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest">Fleet / No. Polisi</span>
                  {/* [AI] Show fleet dropdown for all non-completed statuses when transporter has fleets */}
                  {!isCompleted && selectedTransporterId && fleets.length > 0 ? (
                    <div className="relative mt-1">
                      <div
                        onClick={() => setFleetSelectOpen(!fleetSelectOpen)}
                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm cursor-pointer bg-white text-slate-900 flex items-center justify-between hover:border-slate-300 transition-colors"
                      >
                        <span>{receipt.fleet?.plate_number || (receipt as any).fleet_plate_manual || 'Pilih kendaraan...'}</span>
                        <ChevronDown size={14} className={`transition-transform duration-200 ${fleetSelectOpen ? 'rotate-180' : ''}`} />
                      </div>
                      {fleetSelectOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                          {fleets.map((f: any) => (
                            <div
                              key={f.id}
                              onClick={async () => {
                                setFleetSelectOpen(false);
                                setReceipt({ ...receipt, fleet: { plate_number: f.plate_number }, fleet_id: f.id });
                                await supabase.from('wh_inbound_receipts').update({ fleet_id: f.id }).eq('id', receipt.id);
                              }}
                              className={`px-3 py-2.5 text-sm cursor-pointer flex items-center justify-between transition-colors ${
                                receipt.fleet_id === f.id
                                  ? 'bg-blue-50 font-bold text-blue-700 border-l-2 border-blue-600'
                                  : 'hover:bg-slate-50 border-l-2 border-transparent'
                              }`}
                            >
                              <span>{f.plate_number}</span>
                              <span className={`text-[10px] font-bold uppercase tracking-wider ${f.status === 'available' ? 'text-emerald-500' : 'text-slate-300'}`}>{f.status}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="font-medium text-slate-900">{receipt.fleet?.plate_number || '-'}</span>
                  )}
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest">Driver</span>
                  {!isCompleted ? (
                    selectedTransporterId && transporterDrivers.length > 0 ? (
                      <div className="relative mt-1">
                        <div
                          onClick={() => setDriverSelectOpen(!driverSelectOpen)}
                          className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm cursor-pointer bg-white text-slate-900 flex items-center justify-between hover:border-slate-300 transition-colors"
                        >
                          <span>{receipt.driver?.name || receipt.driver_name_manual || 'Pilih driver...'}</span>
                          <ChevronDown size={14} className={`transition-transform duration-200 ${driverSelectOpen ? 'rotate-180' : ''}`} />
                        </div>
                        {driverSelectOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                            {transporterDrivers.map((d: any) => {
                              const displayName = d.name;
                              return (
                                <div
                                  key={d.id}
                                  onClick={async () => {
                                    setDriverSelectOpen(false);
                                    try {
                                      const updatePayload: any = {
                                        driver_name_manual: displayName,
                                        driver_id: d.id,
                                        driver_phone: d.whatsapp || null,
                                      };
                                      await supabase.from('wh_inbound_receipts').update(updatePayload).eq('id', receipt.id);
                                      setReceipt({ ...receipt, ...updatePayload, driver: { name: displayName, whatsapp: d.whatsapp || '' } });
                                    } catch (err) {
                                      console.error(err);
                                    }
                                  }}
                                  className={`px-3 py-2.5 text-sm cursor-pointer flex flex-col transition-colors ${
                                    receipt.driver_id === d.id
                                      ? 'bg-blue-50 font-bold text-blue-700 border-l-2 border-blue-600'
                                      : 'hover:bg-slate-50 border-l-2 border-transparent'
                                  }`}
                                >
                                  <span>{displayName}</span>
                                  {d.whatsapp && <span className="text-xs text-slate-400 font-normal mt-0.5">{d.whatsapp}</span>}
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : (
                      <input 
                        type="text" 
                        defaultValue={receipt.driver_name_manual || receipt.driver?.name || ''}
                        onBlur={async (e) => {
                          const val = e.target.value;
                          if (val !== receipt.driver_name_manual) {
                            try {
                              const { error } = await supabase.from('wh_inbound_receipts').update({ driver_name_manual: val }).eq('id', receipt.id);
                              if (error) throw error;
                            } catch (err) {
                              console.error(err);
                            }
                          }
                        }}
                        className="w-full mt-1 border border-slate-200 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none text-slate-900 bg-white transition-all"
                        placeholder="Input driver..."
                      />
                    )
                  ) : (
                    <>
                      <span className="font-medium text-slate-900">{receipt.driver_name_manual || receipt.driver?.name || '-'}</span>
                      {(receipt.driver_phone || receipt.driver?.whatsapp) && <span className="block text-xs text-emerald-600">WA: {receipt.driver_phone || receipt.driver?.whatsapp}</span>}
                    </>
                  )}
                </div>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest">Expected Arrival</span>
                  <span className="font-medium text-slate-900">{receipt.expected_arrival ? new Date(receipt.expected_arrival).toLocaleString('id-ID') : '-'}</span>
                </div>
              </div>
            </Card>

            {/* Dokumen — hanya muncul saat TRUCK_ARRIVED */}
            {isArrived && (
              <Card className="p-4 border-slate-200 shadow-sm space-y-3">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <CloudDownload size={16} className="text-slate-500" /> Dokumen
                </h3>
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1.5">Scan POD (Proof of Delivery)</span>
                  {receipt.pod_document_url ? (
                    <div className="flex items-center gap-2">
                      <a href={receipt.pod_document_url} target="_blank" rel="noreferrer" className="flex-1 px-3 py-2 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors text-center">
                        Lihat Dokumen POD
                      </a>
                    </div>
                  ) : (
                    <label className="flex items-center justify-center gap-2 px-3 py-3 border-2 border-dashed border-slate-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                      <CloudDownload size={16} className="text-slate-400 rotate-180" />
                      <span className="text-xs font-bold text-slate-500">Upload Scan POD</span>
                      <input type="file" accept="application/pdf,image/*" className="hidden" onChange={handleUploadPOD} disabled={submitting} />
                    </label>
                  )}
                </div>
              </Card>
            )}
          </div>

            {/* Admin Validation Callout — TRUCK_ARRIVED */}
            {isArrived && (
              <div className={`p-4 rounded-xl border-2 flex items-start gap-3 ${canReadyToUnload ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${canReadyToUnload ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                  {canReadyToUnload ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                </div>
                <div>
                  <p className="font-bold text-sm text-slate-900">Validasi Data Transporter</p>
                  <ul className="text-xs text-slate-600 mt-1 space-y-0.5">
                    <li className={isTransporterFilled ? 'text-emerald-600' : 'text-amber-600'}>
                      {isTransporterFilled ? '✓' : '○'} Transporter
                    </li>
                    <li className={isDriverFilled ? 'text-emerald-600' : 'text-amber-600'}>
                      {isDriverFilled ? '✓' : '○'} Driver
                    </li>
                    <li className={receipt.pod_document_url ? 'text-emerald-600' : 'text-amber-600'}>
                      {receipt.pod_document_url ? '✓' : '○'} Dokumen POD
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Items List */}
            <Card className="p-0 border-slate-200 shadow-sm col-span-1 md:col-span-2 overflow-hidden flex flex-col">
              <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                  <Package size={16} className="text-slate-500" /> Item Details
                </h3>
              </div>
              <div className="overflow-x-auto bg-white flex-1">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500">
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider">Produk</th>
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider">Lokasi</th>
                      <th className="px-4 py-3 font-semibold text-right uppercase tracking-wider w-48">Kuantitas</th>
                      <th className="px-4 py-3 font-semibold text-right uppercase tracking-wider w-32">Dimensi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 group/item align-top">
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            {item.product?.name}
                            <button onClick={() => setEditProductModalId(item.product_sku_id)} title="Edit Master Produk" className="text-slate-300 hover:text-indigo-600 transition-colors opacity-0 group-hover/item:opacity-100">
                                <Edit2 size={12} />
                            </button>
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{item.product?.sku_code}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-3">
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Rencana Alokasi</div>
                              {(() => {
                                const assign = assignments.find(a => a.wo_item_manifests?.product_sku_id === item.product_sku_id);
                                if (assign?.location?.code) {
                                  return (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold uppercase tracking-widest border border-blue-200">
                                      <MapPin size={12} /> {assign.location.code}
                                    </span>
                                  );
                                }
                                return <span className="text-xs text-slate-400 italic">TBA</span>;
                              })()}
                            </div>
                            
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Aktual Putaway</div>
                              {(() => {
                                const entries = item.putaway_entries || [];
                                if (entries.length > 0) {
                                  return (
                                    <div className="space-y-1">
                                      {entries.map((ent: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-1">
                                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${ent.status === 'QUARANTINE' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                                            <MapPin size={10} /> {ent.location_id}
                                          </span>
                                          <span className="text-xs font-bold text-slate-500">x{ent.quantity}</span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                                return <span className="text-xs text-slate-400 italic">Belum Putaway</span>;
                              })()}
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-2 items-end">
                            <div className="flex justify-between w-full text-xs items-center">
                              <span className="text-slate-500">Expected:</span>
                              <span className="font-bold text-slate-700">{item.expected_qty} <span className="font-normal text-[10px] text-slate-400">{item.product?.unit}</span></span>
                            </div>
                            
                            {isChecking || isCheckingDone || isPutaway || isCompleted ? (
                              <>
                                <div className="flex justify-between w-full text-xs items-center">
                                  <span className="text-emerald-600/80">Good:</span>
                                  {isChecking ? (
                                    <input type="number" min="0" value={item.actual_good_qty || ''} onChange={(e) => handleItemChange(item.id, 'actual_good_qty', e.target.value)} className="w-16 h-6 px-1 text-right border border-emerald-200 rounded focus:ring-1 focus:ring-emerald-500 outline-none text-emerald-700 font-bold bg-emerald-50" />
                                  ) : (
                                    <span className="font-bold text-emerald-600">{item.actual_good_qty}</span>
                                  )}
                                </div>
                                
                                <div className="flex justify-between w-full text-xs items-center">
                                  <span className="text-amber-600/80">Quar:</span>
                                  {isChecking ? (
                                    <input type="number" min="0" value={item.quarantine_qty || ''} onChange={(e) => handleItemChange(item.id, 'quarantine_qty', e.target.value)} className="w-16 h-6 px-1 text-right border border-amber-200 rounded focus:ring-1 focus:ring-amber-500 outline-none text-amber-700 font-bold bg-amber-50" />
                                  ) : (
                                    <span className="font-bold text-amber-600">{item.quarantine_qty}</span>
                                  )}
                                </div>
                                
                                <div className="flex justify-between w-full text-xs items-center">
                                  <span className="text-rose-600/80">Reject:</span>
                                  {isChecking ? (
                                    <input type="number" min="0" value={item.rejected_qty || ''} onChange={(e) => handleItemChange(item.id, 'rejected_qty', e.target.value)} className="w-16 h-6 px-1 text-right border border-rose-200 rounded focus:ring-1 focus:ring-rose-500 outline-none text-rose-700 font-bold bg-rose-50" />
                                  ) : (
                                    <span className="font-bold text-rose-600">{item.rejected_qty}</span>
                                  )}
                                </div>
                              </>
                            ) : null}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-right">
                          <div className="flex flex-col gap-1 items-end text-xs">
                            <div className="flex items-center gap-1.5"><span className="text-slate-400">CBM:</span><span className="font-bold text-slate-700">{item.actual_cbm || item.expected_cbm || '0.00'}</span></div>
                            <div className="flex items-center gap-1.5"><span className="text-slate-400">KGS:</span><span className="font-bold text-slate-700">{item.actual_kg || item.expected_kg || '0.00'}</span></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {items.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-slate-500 italic">No items found in this receipt.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* CHECKING_DONE: Review Section */}
              {isCheckingDone && (
                <div className="border-t border-slate-200">
                  <div className="p-4 bg-teal-50 border-b border-teal-100">
                    <h4 className="text-sm font-bold text-teal-800 flex items-center gap-2">
                      <CheckCircle2 size={16} /> Review Hasil Tally — Menunggu Keputusan Admin
                    </h4>
                  </div>
                  <div className="p-4 space-y-6">
                    {items.map(item => {
                      const itemDamages = damageRecords.filter(r => r.receipt_item_id === item.id);
                      const overage = Math.max(0, Number(item.actual_good_qty) - Number(item.expected_qty));
                      const pendingCount = itemDamages.filter(r => r.decision === 'PENDING').length;

                      return (
                        <div key={item.id} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-sm text-slate-900">{item.product?.name}</p>
                              <p className="text-[10px] text-slate-500 font-mono">{item.product?.sku_code}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expected</p>
                              <p className="font-bold text-slate-700">{item.expected_qty}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 text-center text-xs font-bold">
                            <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                              <span className="text-emerald-600">Good</span>
                              <p className="text-lg text-emerald-700">{item.actual_good_qty || 0}</p>
                            </div>
                            <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                              <span className="text-amber-600">Damage</span>
                              <p className="text-lg text-amber-700">{itemDamages.reduce((s, r) => s + Number(r.qty), 0)}</p>
                            </div>
                            <div className={`p-2 rounded-lg border ${overage > 0 ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                              <span className={overage > 0 ? 'text-blue-600' : 'text-slate-400'}>Overage</span>
                              <p className={`text-lg ${overage > 0 ? 'text-blue-700' : 'text-slate-400'}`}>{overage}</p>
                            </div>
                          </div>

                          {/* Overage Decision */}
                          {overage > 0 && item.over_decision === 'PENDING' && (
                            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                              <p className="text-[10px] font-bold text-blue-700 uppercase tracking-widest mb-2">
                                ⚠ Kelebihan {overage} dari expected
                              </p>
                              <div className="flex gap-2">
                                <button onClick={() => handleOverageDecision(item.id, 'ACCEPT_GOOD')} disabled={submitting} className="flex-1 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 transition-colors">
                                  Accept → Stock Bagus
                                </button>
                                <button onClick={() => handleOverageDecision(item.id, 'REJECT')} disabled={submitting} className="flex-1 py-2 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors">
                                  Reject
                                </button>
                              </div>
                            </div>
                          )}
                          {overage > 0 && item.over_decision !== 'PENDING' && (
                            <div className={`text-[10px] font-bold uppercase tracking-widest text-center py-1 rounded-lg ${item.over_decision === 'ACCEPT_GOOD' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
                              Overage: {item.over_decision === 'ACCEPT_GOOD' ? '✓ Accepted ke Stock Bagus' : '✗ Rejected'}
                            </div>
                          )}

                          {/* Damage Records */}
                          {itemDamages.map(rec => (
                            <div key={rec.id} className="p-3 bg-white border border-rose-200 rounded-xl space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-widest">Damage: {rec.qty} unit</span>
                                <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                                  rec.decision === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                  rec.decision === 'ACCEPT_QUARANTINE' ? 'bg-emerald-100 text-emerald-700' :
                                  'bg-rose-100 text-rose-700'
                                }`}>{rec.decision.replace(/_/g, ' ')}</span>
                              </div>

                              <div className="grid grid-cols-2 gap-3 text-xs">
                                <div>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">WHY?</p>
                                  <p className="font-semibold text-slate-700">{rec.damage_source === 'TRANSPORTER' ? 'Dari Transporter' : 'Kelalaian Staf'}</p>
                                  {rec.source_notes && <p className="text-slate-500 text-[10px]">{rec.source_notes}</p>}
                                  {rec.source_photo_url && <a href={rec.source_photo_url} target="_blank" rel="noreferrer" className="text-blue-600 underline text-[10px]">Lihat Foto</a>}
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase mb-0.5">WHAT?</p>
                                  <p className="font-semibold text-slate-700">{rec.damage_condition === 'PACKAGE_DAMAGED_INTACT' ? 'Kemasan Rusak, Isi Utuh' : 'Kemasan Rusak, Isi Kurang'}</p>
                                  {rec.condition_notes && <p className="text-slate-500 text-[10px]">{rec.condition_notes}</p>}
                                  {rec.condition_photo_url && <a href={rec.condition_photo_url} target="_blank" rel="noreferrer" className="text-blue-600 underline text-[10px]">Lihat Foto</a>}
                                </div>
                              </div>

                              {/* Decision Buttons */}
                              {rec.decision === 'PENDING' && (
                                <div className="flex gap-2 pt-2 border-t border-slate-100">
                                  <button onClick={() => handleDamageDecision(rec.id, 'ACCEPT_QUARANTINE')} disabled={submitting} className="flex-1 py-2 bg-emerald-600 text-white text-[10px] font-bold rounded-lg hover:bg-emerald-700 transition-colors">
                                    Accept → Quarantine
                                  </button>
                                  <button onClick={() => handleDamageDecision(rec.id, 'REJECT_RETURN')} disabled={submitting} className="flex-1 py-2 bg-rose-600 text-white text-[10px] font-bold rounded-lg hover:bg-rose-700 transition-colors">
                                    Reject → Return
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                          {itemDamages.length === 0 && (
                            <p className="text-xs text-slate-400 italic">Tidak ada catatan kerusakan untuk item ini</p>
                          )}

                          {pendingCount > 0 && (
                            <p className="text-[10px] text-amber-600 font-bold text-center">{pendingCount} keputusan belum dibuat</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between mt-auto">
          <button onClick={onClose} className="px-4 py-2 text-sm font-bold text-slate-500 hover:text-slate-900 transition-colors">
            Tutup
          </button>
          
          <div className="flex gap-3">
            {isExpected && (
              <button 
                onClick={() => handleUpdateStatus('TRUCK_ARRIVED')}
                disabled={submitting}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95"
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                Truk Tiba (Arrived)
              </button>
            )}

            {isArrived && (
              <button 
                onClick={() => handleUpdateStatus('UNLOADING')}
                disabled={submitting || !canReadyToUnload}
                className={`px-6 py-2.5 text-sm font-bold rounded-xl flex items-center gap-2 transition-all active:scale-95 ${
                  canReadyToUnload 
                    ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm shadow-blue-600/20' 
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
                title={!canReadyToUnload ? 'Lengkapi data transporter, driver, dan POD terlebih dahulu' : ''}
              >
                {submitting ? <Loader2 size={16} className="animate-spin" /> : <Truck size={16} />}
                Ready to Unloading
              </button>
            )}

            {isUnloading && (
              <button 
                onClick={() => handleUpdateStatus('CHECKING')}
                disabled={submitting}
                className="px-6 py-2.5 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 shadow-sm shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Selesai Bongkar (Lanjut Cek)
              </button>
            )}

            {isChecking && (
              <button 
                onClick={submitChecking}
                disabled={submitting}
                className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Konfirmasi Hasil Pengecekan
              </button>
            )}

            {isCheckingDone && (
              <button 
                onClick={handleApproveChecking}
                disabled={submitting}
                className="px-6 py-2.5 bg-teal-600 text-white text-sm font-bold rounded-xl hover:bg-teal-700 shadow-sm shadow-teal-600/20 flex items-center gap-2 transition-all active:scale-95"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Approve & Mulai Putaway
              </button>
            )}

            {isPutaway && (
              <button 
                onClick={finishPutaway}
                disabled={submitting}
                className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 flex items-center gap-2 transition-all active:scale-95"
              >
                {submitting && <Loader2 size={16} className="animate-spin" />}
                Selesai Putaway
              </button>
            )}
            
            {['CHECKING_DONE', 'PUTAWAY_IN_PROGRESS', 'COMPLETED'].includes(receipt.status) && (
              <div className="flex items-center gap-3">
                {receipt.batb_document_url ? (
                  <a 
                    href={receipt.batb_document_url} 
                    target="_blank" 
                    rel="noreferrer"
                    className="px-4 py-2 bg-indigo-50 text-indigo-700 text-sm font-bold rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors"
                  >
                    Lihat Scan BATB
                  </a>
                ) : (
                  <label className="px-4 py-2 bg-white text-indigo-600 text-sm font-bold rounded-lg border border-indigo-200 hover:bg-indigo-50 transition-colors cursor-pointer flex items-center gap-2">
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <CloudDownload size={16} className="rotate-180" />}
                    Upload Scan BATB
                    <input type="file" accept="application/pdf,image/*" className="hidden" onChange={handleUploadBATB} disabled={submitting} />
                  </label>
                )}
                
                <BATBGenerator receipt={receipt} items={items} damageRecords={damageRecords} />
              </div>
            )}

            {isCompleted && (
              <div className="px-6 py-2.5 bg-emerald-50 text-emerald-700 text-sm font-bold rounded-xl border border-emerald-100 flex items-center gap-2 ml-auto">
                <CheckCircle2 size={18} /> Receipt Selesai
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Edit Master Product Modal */}
      {editProductModalId && (
        <ProductFormModal 
          editId={editProductModalId}
          onClose={() => setEditProductModalId(null)}
          onSuccess={() => {
            setEditProductModalId(null);
            toast.success("Produk Master berhasil diperbarui!");
            fetchData();
          }}
        />
      )}

      {/* Add Transporter Modal */}
      {/* [AI] onSuccess now refreshes transporters list and auto-selects the new entry */}
      {isTransporterModalOpen && receipt?.tenant_id && (
        <ContactFormModal
          tenantId={receipt.tenant_id}
          onClose={() => setIsTransporterModalOpen(false)}
          onSuccess={async (newContact) => {
            setIsTransporterModalOpen(false);
            toast.success('Transporter baru berhasil ditambahkan!');
            // [AI] Refresh transporters list and auto-select new one if input matches
            const updatedList = await fetchTransporters();
            if (updatedList && updatedList.length > 0) {
              // Auto-select the newly created transporter by ID or fallback to newest
              const newest = updatedList.find(t => t.id === newContact?.id) || updatedList[updatedList.length - 1];
              if (newest) {
                setTransporterInput(newest.transporter_name);
                setSelectedTransporterId(newest.id);
                try {
                  await supabase.from('wh_inbound_receipts').update({ transporter_name_manual: newest.transporter_name }).eq('id', receipt.id);
                } catch (err) {
                  console.error(err);
                }
              }
            }
          }}
        />
      )}
    </div>
  );
}
