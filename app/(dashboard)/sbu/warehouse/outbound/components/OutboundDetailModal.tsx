'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/lib/hooks/useAuth';
import { toast } from 'react-hot-toast';
import { 
  X, Loader2, ArrowRight, Truck, Package, CheckCircle2, AlertTriangle, User, Calendar, Edit2, Upload, Search, ChevronDown, Plus, MapPin
} from 'lucide-react';
import { Card } from '@/components/ui/Card';

interface OutboundDetailModalProps {
  shipmentId: string;
  onClose: () => void;
}

export default function OutboundDetailModal({ shipmentId, onClose }: OutboundDetailModalProps) {
  const { profile } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shipment, setShipment] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [assignments, setAssignments] = useState<any[]>([]);
  const [damageRecords, setDamageRecords] = useState<any[]>([]);
  const [fleets, setFleets] = useState<any[]>([]);
  const [fleetSelectOpen, setFleetSelectOpen] = useState(false);
  const [driverSelectOpen, setDriverSelectOpen] = useState(false);
  
  const [transporters, setTransporters] = useState<any[]>([]);
  const [transporterInput, setTransporterInput] = useState('');
  const [transporterDropdownOpen, setTransporterDropdownOpen] = useState(false);
  const [selectedTransporterId, setSelectedTransporterId] = useState<string | null>(null);
  const [transporterDrivers, setTransporterDrivers] = useState<any[]>([]);
  
  const transporterDropdownRef = useRef<HTMLDivElement>(null);
  const fleetDropdownRef = useRef<HTMLDivElement>(null);

  // [AI] Contacts Hierarchy State
  const [allEntities, setAllEntities] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedConsigneeId, setSelectedConsigneeId] = useState<string | null>(null);
  const [isUpdatingContacts, setIsUpdatingContacts] = useState(false);

  // Replacement picking state
  const [showReplacementModal, setShowReplacementModal] = useState<any>(null);
  const [replacementLocation, setReplacementLocation] = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: rawShipData, error: shipError } = await (supabase
        .from('wh_outbound_shipments' as any) as any)
        .select(`
          *,
          transporter:transporter_id(name),
          fleet:fleet_id(plate_number),
          driver:driver_id(name, whatsapp),
          customer:customer_id(name),
          consignee:consignee_id(name),
          wo_item:wo_item_id(
             job_orders(jo_number)
          )
        `)
        .eq('id', shipmentId)
        .single();
      
      if (shipError) throw shipError;
      const shipData: any = rawShipData;

      // [AI] Map customer
      if (shipData.customer_id) {
         setSelectedCustomerId(shipData.customer_id);
      } else if (shipData.wo_item_id) {
         const { data: woItemData } = await supabase.from('wo_items').select('wo_id').eq('id', shipData.wo_item_id).single();
         if (woItemData?.wo_id) {
            const { data: woData } = await supabase.from('work_orders').select('customer_id').eq('id', woItemData.wo_id).single();
            if (woData?.customer_id) {
               const { data: custData } = await supabase.from('md_entities').select('name').eq('id', woData.customer_id).single();
               if (custData) {
                  shipData.customer_name = custData.name;
                  setSelectedCustomerId(woData.customer_id);
               }
            }
         }
      }
      if (shipData.consignee_id) setSelectedConsigneeId(shipData.consignee_id);
      setShipment(shipData);

      const { data: itemsData, error: itemsError } = await supabase
        .from('wh_outbound_shipment_items')
        .select(`
          *,
          product:product_sku_id(name, sku_code, unit)
        `)
        .eq('shipment_id', shipmentId)
        .order('created_at', { ascending: true });
        
      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      if (shipData.wo_item_id) {
        const { data: assignData } = await supabase
          .from('jo_warehouse_assignments')
          .select(`
             warehouse_location_id,
             quantity,
             location:md_warehouse_locations(code),
             manifest:wo_item_manifest_id(product_sku_id)
          `)
          .eq('job_order_id', shipData.wo_item_id);
        setAssignments(assignData || []);
      }

      if (['CHECKING', 'READY_FOR_LOADING', 'LOADING', 'READY_FOR_DOCUMENTS', 'COMPLETED'].includes(shipData.status)) {
        const { data: damageData } = await (supabase
          .from('wh_outbound_damage_records' as any) as any)
          .select('*')
          .eq('shipment_id', shipmentId);
        setDamageRecords(damageData || []);
      }
    } catch (error: any) {
      toast.error('Gagal memuat detail shipment');
      onClose();
    } finally {
      setLoading(false);
    }
  }, [shipmentId, onClose]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const fetchTransporters = useCallback(async () => {
    if (!shipment?.tenant_id) return [];
    const { data: vendorData } = await supabase.from('md_entities')
      .select('id, name')
      .eq('tenant_id', shipment.tenant_id)
      .eq('is_vendor', true)
      .eq('is_active', true)
      .order('name', { ascending: true });
      
    const { data: internalData } = await supabase.from('md_entities')
      .select('id, name')
      .eq('tenant_id', shipment.tenant_id)
      .eq('is_vendor', false)
      .eq('is_active', true)
      .limit(1);

    const combined = [...(internalData || []), ...(vendorData || [])];
    const list = combined.map(e => ({ id: e.id, transporter_name: e.name }));
    setTransporters(list);
    return list;
  }, [shipment?.tenant_id]);

  const fetchEntities = useCallback(async () => {
    if (!shipment?.tenant_id) return;
    const { data, error } = await supabase.from('md_entities')
      .select('id, name, parent_id, is_customer')
      .eq('tenant_id', shipment.tenant_id)
      .eq('is_active', true)
      .order('name');
    if (!error) {
      setAllEntities(data || []);
    }
  }, [shipment?.tenant_id]);

  useEffect(() => {
    fetchTransporters();
    fetchEntities();
  }, [fetchTransporters, fetchEntities]);

  useEffect(() => {
    if (shipment && transporters.length > 0) {
      const name = shipment.transporter_name_manual || shipment.transporter?.name || '';
      setTransporterInput(name);
      if (name) {
        const matched = transporters.find((t) => t.transporter_name === name);
        if (matched) setSelectedTransporterId(matched.id);
      }
    }
  }, [shipment, transporters]);

  useEffect(() => {
    if (!selectedTransporterId) {
      setFleets([]); setTransporterDrivers([]); return;
    }
    Promise.all([
      supabase.from('md_fleets').select('id, plate_number, status').eq('entity_id', selectedTransporterId).eq('is_active', true),
      supabase.from('md_drivers').select('id, name, whatsapp').eq('entity_id', selectedTransporterId).eq('is_active', true),
    ]).then(([fRes, dRes]) => {
      setFleets(fRes.data || []);
      setTransporterDrivers(dRes.data || []);
    });
  }, [selectedTransporterId]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (transporterDropdownRef.current && !transporterDropdownRef.current.contains(e.target as Node)) setTransporterDropdownOpen(false);
      if (fleetDropdownRef.current && !fleetDropdownRef.current.contains(e.target as Node)) setFleetSelectOpen(false);
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setTransporterDropdownOpen(false); setFleetSelectOpen(false); }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => { document.removeEventListener('mousedown', handleClickOutside); document.removeEventListener('keydown', handleEscape); };
  }, []);

  const handleUpdateStatus = async (newStatus: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from('wh_outbound_shipments').update({ status: newStatus, updated_at: new Date().toISOString() }).eq('id', shipmentId);
      if (error) throw error;
      
      if (newStatus === 'COMPLETED' && shipment?.wo_item_id) {
        const parentWoItemId = shipment.wo_item_id;
        
        // 1. In Outbound, shipment.wo_item_id actually maps to wo_items.id directly.
        // Update the WO Item to completed, and ALL its job_orders to completed.
        await supabase.from('wo_items').update({ status: 'completed' }).eq('id', parentWoItemId);
        await supabase.from('job_orders').update({ status: 'completed' }).eq('wo_item_id', parentWoItemId);

        // 2. Check if all wo_items for the parent work_order are completed
        const { data: woItemData } = await supabase.from('wo_items').select('wo_id').eq('id', parentWoItemId).single();
        if (woItemData?.wo_id) {
          const parentWoId = woItemData.wo_id;
          const { data: siblingWoItems } = await supabase.from('wo_items').select('status').eq('wo_id', parentWoId);
          
          if (siblingWoItems) {
            const allWoItemsCompleted = siblingWoItems.every((item: any) => ['completed', 'done', 'selesai'].includes(item.status?.toLowerCase()));
            if (allWoItemsCompleted) {
              await supabase.from('work_orders').update({ status: 'done' }).eq('id', parentWoId);
            } else {
              await supabase.from('work_orders').update({ status: 'proses' }).eq('id', parentWoId);
            }
          }
        }
      }

      // [AI] Deduct Inventory physically when COMPLETED
      if (newStatus === 'COMPLETED') {
        const { data: movements } = await supabase.from('wh_inventory_movements')
          .select('inventory_id, quantity')
          .eq('reference_id', shipmentId)
          .eq('reference_type', 'OUTBOUND_SHIPMENT');

        if (movements && movements.length > 0) {
          for (const mov of movements) {
            const { data: lot } = await supabase.from('wh_inventory').select('quantity, reserved_quantity').eq('id', mov.inventory_id).single();
            if (lot) {
               await supabase.from('wh_inventory').update({
                  quantity: Math.max(0, Number(lot.quantity || 0) - Number(mov.quantity || 0)),
                  reserved_quantity: Math.max(0, Number(lot.reserved_quantity || 0) - Number(mov.quantity || 0))
               }).eq('id', mov.inventory_id);
            }
          }
        }
      }

      toast.success(`Status diperbarui menjadi ${newStatus}`);
      fetchData();
    } catch (error: any) {
      toast.error('Gagal memperbarui status');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateContacts = async () => {
    setIsUpdatingContacts(true);
    try {
      const updates: any = {
        customer_id: selectedCustomerId || null,
        consignee_id: selectedConsigneeId || null,
      };

      const { error } = await supabase.from('wh_outbound_shipments').update(updates).eq('id', shipmentId);
      if (error) throw error;
      
      toast.success('Data pelanggan & consignee diperbarui');
      fetchData();
    } catch (e) {
      toast.error('Gagal memperbarui kontak');
    } finally {
      setIsUpdatingContacts(false);
    }
  };

  if (loading || !shipment) {
    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  const isCompleted = shipment.status === 'COMPLETED';
  const isChecking = shipment.status === 'CHECKING';
  const isPicking = shipment.status === 'PICKING';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-6xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-none bg-slate-50 relative">
        {/* Header */}
        <div className="p-6 bg-white border-b border-slate-200 flex flex-col md:flex-row md:items-start justify-between gap-4 sticky top-0 z-10">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl border border-blue-100 flex items-center justify-center text-blue-600 flex-shrink-0">
              <Truck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-2xl font-black font-mono text-slate-900">{shipment.wo_item?.job_orders?.[0]?.jo_number || shipment.shipment_number}</h2>
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider
                  ${isCompleted ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}`}>
                  {shipment.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-sm text-slate-500 font-medium">Outbound Shipment Details</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors self-start">
            <X size={20} className="text-slate-400 hover:text-slate-900" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Workflow Progress */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {['PLANNED', 'PENDING', 'ASSIGNED', 'PICKING', 'READY_FOR_CHECKING', 'CHECKING', 'READY_FOR_LOADING', 'LOADING', 'READY_FOR_DOCUMENTS', 'COMPLETED'].map((step, idx, arr) => {
              const passed = arr.indexOf(shipment.status) >= idx;
              const current = shipment.status === step;
              return (
                <div key={step} className="flex items-center gap-1.5">
                  <div className={`flex items-center gap-1.5 ${passed ? 'text-blue-600' : ''} ${current ? 'bg-blue-50 px-2 py-1 rounded' : ''}`}>
                    <div className={`w-4 h-4 rounded-full flex items-center justify-center border-2 ${passed ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'}`}>
                      {passed ? <CheckCircle2 size={10} /> : ''}
                    </div>
                    <span className="hidden md:inline">{step.replace(/_/g, ' ')}</span>
                  </div>
                  {idx < arr.length - 1 && <ArrowRight size={12} className="opacity-50" />}
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Logistics Info Card */}
            <div className="space-y-6 col-span-1">
              <Card className="p-4 border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-slate-100 pb-2">
                  <Truck size={16} className="text-slate-500" /> Logistics Info
                </h3>
                <div className="space-y-3 text-sm">
                  {/* Transporter */}
                  <div className="relative" ref={transporterDropdownRef}>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest">Transporter</span>
                    {!isCompleted ? (
                      <div className="relative mt-1">
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
                          className="w-full border border-slate-200 rounded pl-7 pr-2 py-1 text-sm focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 outline-none text-slate-900 bg-white"
                          placeholder="Cari transporter..."
                        />
                        {transporterDropdownOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                            {transporters.filter(t => t.transporter_name.toLowerCase().includes(transporterInput.toLowerCase())).map(t => (
                              <div
                                key={t.id}
                                onMouseDown={async () => {
                                  setTransporterInput(t.transporter_name); setTransporterDropdownOpen(false); setSelectedTransporterId(t.id);
                                  supabase.from('wh_outbound_shipments').update({ transporter_id: t.id }).eq('id', shipment.id).then();
                                }}
                                className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-50 border-l-2 border-transparent hover:border-blue-600"
                              >
                                {t.transporter_name}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="font-medium text-slate-900">{shipment.transporter?.name || shipment.transporter_name_manual || '-'}</span>
                    )}
                  </div>
                  {/* Fleet */}
                  <div ref={fleetDropdownRef}>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest">Fleet / No. Polisi</span>
                    {!isCompleted && selectedTransporterId && fleets.length > 0 ? (
                      <div className="relative mt-1">
                        <div onClick={() => setFleetSelectOpen(!fleetSelectOpen)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm cursor-pointer bg-white flex justify-between">
                          <span>{shipment.fleet?.plate_number || 'Pilih kendaraan...'}</span>
                          <ChevronDown size={14} />
                        </div>
                        {fleetSelectOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                            {fleets.map(f => (
                              <div key={f.id} onClick={() => { setFleetSelectOpen(false); setShipment({...shipment, fleet: { plate_number: f.plate_number }, fleet_id: f.id }); supabase.from('wh_outbound_shipments').update({ fleet_id: f.id }).eq('id', shipment.id).then(); }} className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">{f.plate_number}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="font-medium text-slate-900">{shipment.fleet?.plate_number || '-'}</span>
                    )}
                  </div>
                  {/* Driver */}
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest">Driver</span>
                    {!isCompleted && selectedTransporterId ? (
                      <div className="relative mt-1">
                        <div onClick={() => setDriverSelectOpen(!driverSelectOpen)} className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm cursor-pointer bg-white flex justify-between">
                          <span>{shipment.driver?.name || 'Pilih driver...'}</span>
                          <ChevronDown size={14} />
                        </div>
                        {driverSelectOpen && (
                          <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-slate-200 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                            {transporterDrivers.map(d => (
                              <div key={d.id} onClick={() => { setDriverSelectOpen(false); setShipment({...shipment, driver: { name: d.name, whatsapp: d.whatsapp }, driver_id: d.id }); supabase.from('wh_outbound_shipments').update({ driver_id: d.id }).eq('id', shipment.id).then(); }} className="px-3 py-2 text-sm cursor-pointer hover:bg-slate-50">{d.name}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="font-medium text-slate-900">{shipment.driver?.name || '-'}</span>
                    )}
                  </div>
                </div>
              </Card>

              {/* Contact Info Card */}
              <Card className="p-4 border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between border-b border-slate-100 pb-2">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-slate-500" /> Kontak Logistik
                  </div>
                  {!isCompleted && (
                     <button 
                       onClick={handleUpdateContacts} 
                       disabled={isUpdatingContacts}
                       className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-bold hover:bg-indigo-100 transition-colors"
                     >
                       {isUpdatingContacts ? 'Menyimpan...' : 'Simpan Kontak'}
                     </button>
                  )}
                </h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Pelanggan</span>
                    {!isCompleted ? (
                      <select
                        value={selectedCustomerId || ''}
                        onChange={(e) => {
                          setSelectedCustomerId(e.target.value);
                          setSelectedConsigneeId(null);
                        }}
                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 transition-all bg-white text-slate-900"
                      >
                        <option value="">-- Pilih Pelanggan --</option>
                        {allEntities.filter(e => e.is_customer).map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-medium text-slate-900">{shipment.customer?.name || shipment.customer_name || '-'}</span>
                    )}
                  </div>
                  
                  <div>
                    <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Consignee / Penerima</span>
                    {!isCompleted ? (
                      <select
                        value={selectedConsigneeId || ''}
                        onChange={(e) => setSelectedConsigneeId(e.target.value)}
                        disabled={!selectedCustomerId}
                        className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 transition-all bg-white text-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
                      >
                        <option value="">-- Pilih Consignee --</option>
                        {selectedCustomerId && allEntities
                          .filter(e => e.id === selectedCustomerId || e.parent_id === selectedCustomerId)
                          .map(s => (
                            <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="font-medium text-slate-900">{shipment.consignee?.name || '-'}</span>
                    )}
                  </div>
                </div>
              </Card>
            </div>

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
                      <th className="px-4 py-3 font-semibold uppercase tracking-wider">Lokasi Asal</th>
                      <th className="px-4 py-3 font-semibold text-right uppercase tracking-wider w-48">Kuantitas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {items.map((item) => {
                      const dmgs = damageRecords.filter(d => d.shipment_item_id === item.id);
                      const totalDamage = dmgs.reduce((acc, d) => acc + Number(d.qty), 0);
                      const shortage = Number(item.requested_qty) - Number(item.checked_qty);

                      return (
                      <tr key={item.id} className="hover:bg-slate-50/50 group/item align-top">
                        <td className="px-4 py-4">
                          <div className="font-bold text-slate-900">{item.product?.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">{item.product?.sku_code}</div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-3">
                            <div>
                              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Alokasi / Picking</div>
                              {(() => {
                                const entries = item.picking_entries || [];
                                if (entries.length > 0) {
                                  return (
                                    <div className="space-y-1">
                                      {entries.map((ent: any, idx: number) => (
                                        <div key={idx} className="flex items-center gap-1">
                                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border bg-blue-50 text-blue-700 border-blue-200">
                                            <MapPin size={10} /> {ent.location_code}
                                          </span>
                                          <span className="text-xs font-bold text-slate-500">x{ent.qty}</span>
                                          {ent.is_replacement && <span className="text-[9px] text-amber-600 bg-amber-100 px-1 rounded ml-1 font-bold">REPLACEMENT</span>}
                                        </div>
                                      ))}
                                    </div>
                                  );
                                }
                                return <span className="text-xs text-slate-400 italic">Belum di-pick</span>;
                              })()}
                            </div>
                          </div>
                        </td>
                        
                        <td className="px-4 py-4">
                          <div className="flex flex-col gap-2 items-end">
                            <div className="flex justify-between w-full text-xs items-center">
                              <span className="text-slate-500">Target JO:</span>
                              <span className="font-bold text-slate-700">{item.requested_qty}</span>
                            </div>
                            
                            <div className="flex justify-between w-full text-xs items-center border-t border-slate-100 pt-1 mt-1">
                              <span className="text-blue-600/80 font-bold">Picked:</span>
                              <span className="font-bold text-blue-600">{item.picked_qty}</span>
                            </div>

                            {(isChecking || ['READY_FOR_LOADING', 'LOADING', 'READY_FOR_DOCUMENTS', 'COMPLETED'].includes(shipment.status)) && (
                              <>
                                <div className="flex justify-between w-full text-xs items-center mt-2 border-t border-emerald-100 pt-2">
                                  <span className="text-emerald-600/80 font-bold">Good / Checked:</span>
                                  <span className="font-black text-emerald-600">{item.checked_qty || 0}</span>
                                </div>
                                <div className="flex justify-between w-full text-xs items-center">
                                  <span className="text-rose-600/80 font-bold">Damaged:</span>
                                  <span className="font-black text-rose-600">{totalDamage}</span>
                                </div>

                                {isChecking && shortage > 0 && (
                                   <div className="mt-2 w-full text-right">
                                      <button 
                                        onClick={() => setShowReplacementModal({ itemId: item.id, skuId: item.product_sku_id, skuName: item.product?.name, qtyToPick: shortage })}
                                        className="text-[10px] bg-blue-600 text-white px-2 py-1 rounded shadow hover:bg-blue-700 font-bold w-full"
                                      >
                                        + Picking Pengganti ({shortage})
                                      </button>
                                   </div>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>

        {/* Action Buttons Footer */}
        {shipment.status !== 'COMPLETED' && (
           <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3 sticky bottom-0">
             {shipment.status === 'READY_FOR_CHECKING' && (
                <button onClick={() => handleUpdateStatus('CHECKING')} disabled={submitting} className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center gap-2">Mulai Checking</button>
             )}
             {shipment.status === 'READY_FOR_LOADING' && (
                <button onClick={() => handleUpdateStatus('LOADING')} disabled={submitting} className="px-6 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 flex items-center gap-2">Mulai Loading</button>
             )}
             {['READY_FOR_DOCUMENTS', 'COMPLETED'].includes(shipment.status) && (
                <button onClick={() => window.open(`/sbu/warehouse/outbound/print-bast/${shipmentId}`, '_blank')} className="px-6 py-2.5 bg-white text-blue-700 border border-blue-200 font-bold rounded-xl shadow-sm hover:bg-blue-50 flex items-center gap-2">
                   Cetak / Preview BAST
                </button>
             )}
             {shipment.status === 'READY_FOR_DOCUMENTS' && (
                <button onClick={() => handleUpdateStatus('COMPLETED')} disabled={submitting} className="px-6 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 flex items-center gap-2 shadow-sm shadow-emerald-200">
                   Selesaikan & Tutup JO
                </button>
             )}
           </div>
        )}

        {/* If Completed, still show the print button but no other actions */}
        {shipment.status === 'COMPLETED' && (
           <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3 sticky bottom-0">
              <button onClick={() => window.open(`/sbu/warehouse/outbound/print-bast/${shipmentId}`, '_blank')} className="px-6 py-2.5 bg-white text-blue-700 border border-blue-200 font-bold rounded-xl shadow-sm hover:bg-blue-50 flex items-center gap-2">
                 Cetak / Preview BAST
              </button>
           </div>
        )}
      </Card>

      {/* Replacement Picking Modal */}
      {showReplacementModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-slate-100">
            <div className="p-6">
              <h3 className="font-black text-xl text-slate-900 mb-1">Picking Pengganti</h3>
              <p className="text-sm text-slate-500 mb-6 leading-relaxed">Ambil stok tambahan untuk menutupi barang rusak tanpa terkena validasi kuota JO awal.</p>
              
              <div className="space-y-4 mb-8">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Produk</label>
                  <div className="font-bold text-slate-900 text-sm">{showReplacementModal.skuName}</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
                  <label className="text-[10px] font-black text-blue-400 uppercase tracking-widest block mb-1">Kuantitas Diambil</label>
                  <div className="text-2xl font-black text-blue-600">{showReplacementModal.qtyToPick} PCS</div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1 ml-1">Lokasi Rak Pengambilan</label>
                  <input 
                    type="text" 
                    value={replacementLocation} 
                    onChange={e => setReplacementLocation(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:bg-blue-50/50 outline-none font-mono font-bold text-slate-700 transition-colors"
                    placeholder="Contoh: RAK-A1"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => { setShowReplacementModal(null); setReplacementLocation(''); }} className="flex-1 py-3.5 text-sm font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 active:scale-95 transition-all">Batal</button>
                <button 
                  disabled={submitting || !replacementLocation.trim()}
                  onClick={async () => {
                     setSubmitting(true);
                     try {
                        const targetItem = shipment.items.find((i: any) => i.id === showReplacementModal.itemId);
                        if (!targetItem) throw new Error("Item tidak ditemukan");
                        
                        const newEntries = [...(targetItem.picking_entries || []), {
                           id: Date.now().toString(),
                           location_code: replacementLocation.trim(),
                           sku_id: showReplacementModal.skuId,
                           sku_name: showReplacementModal.skuName,
                           qty: showReplacementModal.qtyToPick,
                           is_replacement: true
                        }];
                        const newPickedQty = targetItem.picked_qty + showReplacementModal.qtyToPick;
                        
                        const { error } = await supabase.from('wh_outbound_shipment_items').update({
                           picked_qty: newPickedQty,
                           picking_entries: newEntries
                        }).eq('id', targetItem.id);
                        if (error) throw error;
                        
                        toast.success('Picking pengganti berhasil disimpan!');
                        setShowReplacementModal(null);
                        setReplacementLocation('');
                        fetchData();
                     } catch (err: any) {
                        toast.error(err.message);
                     } finally {
                        setSubmitting(false);
                     }
                  }}
                  className="flex-[1.5] py-3.5 text-sm font-bold text-white bg-blue-600 rounded-xl hover:bg-blue-700 disabled:opacity-50 active:scale-95 transition-all flex justify-center items-center gap-2"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : 'Simpan Picking'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
