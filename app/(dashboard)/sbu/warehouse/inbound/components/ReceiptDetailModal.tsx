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
  X, Loader2, ArrowRight, Truck, Package, PackageX, PackageCheck, AlertTriangle, User, Calendar, Edit2, CloudDownload, CheckCircle2, Search, ChevronDown, MessageCircle, Plus, MapPin, XCircle
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import ProductFormModal from '@/app/(dashboard)/hq/master-data/products/components/ProductFormModal';
import ContactFormModal from '@/components/master/ContactFormModal';
import BATBGenerator from './BATBGenerator';


const getUomConversion = (productSku: any) => {
  if (!productSku) return null;
  
  let conversions: any[] = [];
  try {
    conversions = typeof productSku.uom_conversions === 'string'
      ? JSON.parse(productSku.uom_conversions)
      : (productSku.uom_conversions || []);
  } catch (e) {
    conversions = productSku.uom_conversions || [];
  }
  
  if (!Array.isArray(conversions) || conversions.length === 0) {
    const multiplier = Number(productSku.conversion_to_base) || 1;
    const currentUnit = String(productSku.unit || 'PCS').toUpperCase();
    const baseUom = String(productSku.base_uom || 'PCS').toUpperCase();
    if (multiplier > 1 && currentUnit !== baseUom) {
      return {
        direction: 'MULTIPLY',
        unit: currentUnit,
        targetUom: baseUom,
        multiplier
      };
    }
    return null;
  }
  
  const currentUnit = String(productSku.unit || 'PCS').toUpperCase();
  const baseUom = String(productSku.base_uom || 'PCS').toUpperCase();
  
  let conv = conversions.find((c: any) => String(c.from_uom).toUpperCase() === currentUnit);
  if (conv) {
    const multiplier = Number(conv.multiplier);
    if (multiplier > 1) {
      return {
        direction: 'MULTIPLY',
        unit: currentUnit,
        targetUom: String(conv.to_uom).toUpperCase(),
        multiplier
      };
    }
  }
  
  conv = conversions.find((c: any) => 
    String(c.to_uom).toUpperCase() === currentUnit || 
    String(c.to_uom).toUpperCase() === baseUom ||
    (currentUnit === 'PCS' && String(c.to_uom).toUpperCase() === 'PACK')
  );
  if (conv) {
    const multiplier = Number(conv.multiplier);
    if (multiplier > 1) {
      return {
        direction: 'DIVIDE',
        unit: String(conv.from_uom).toUpperCase(),
        targetUom: currentUnit,
        multiplier
      };
    }
  }
  
  const multiplier = Number(productSku.conversion_to_base) || 1;
  if (multiplier > 1 && currentUnit !== baseUom) {
    return {
      direction: 'MULTIPLY',
      unit: currentUnit,
      targetUom: baseUom,
      multiplier
    };
  }
  
  return null;
};

const formatQtyWithConversion = (qty: number, productSku: any) => {
  if (!productSku) return `${qty.toLocaleString()}`;
  
  const conv = getUomConversion(productSku);
  if (conv) {
    if (conv.direction === 'MULTIPLY') {
      const baseQty = qty * conv.multiplier;
      return `${qty.toLocaleString()} ${conv.unit}, ${baseQty.toLocaleString()} ${conv.targetUom}`;
    } else {
      const largerQty = qty / conv.multiplier;
      const formattedLarger = Number(largerQty.toFixed(2)).toLocaleString();
      return `${formattedLarger} ${conv.unit}, ${qty.toLocaleString()} ${conv.targetUom}`;
    }
  }
  
  return `${qty.toLocaleString()} ${productSku.unit || 'PCS'}`;
};

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

  // [AI] Contacts Hierarchy State
  const [allEntities, setAllEntities] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedShipperId, setSelectedShipperId] = useState<string | null>(null);
  const [isUpdatingContacts, setIsUpdatingContacts] = useState(false);

  // Putaway Location Allocation
  const [putawayZones, setPutawayZones] = useState<any[]>([]);
  const [putawayLocations, setPutawayLocations] = useState<any[]>([]);
  const [putawayData, setPutawayData] = useState<Record<string, any[]>>({});

  const transporterDropdownRef = useRef<HTMLDivElement>(null);
  const fleetDropdownRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch Receipt
      const { data: rawRecData, error: recError } = await (supabase
        .from('wh_inbound_receipts' as any) as any)
        .select(`
          *,
          transporter:transporter_id(name),
          fleet:fleet_id(plate_number),
          driver:driver_id(name, whatsapp),
          customer:customer_id(name),
          shipper:shipper_id(name)
        `)
        .eq('id', receiptId)
        .single();
      
      if (recError) throw recError;
      const recData: any = rawRecData;

      // Fetch warehouse name
      if (recData.warehouse_id) {
        const { data: whData } = await supabase.from('md_warehouses').select('name').eq('id', recData.warehouse_id).single();
        if (whData) recData.warehouse_name = whData.name;
      }

      if (recData.customer_id) {
         setSelectedCustomerId(recData.customer_id);
      } else if (recData.wo_item_id) {
        // [AI] Fetch customer name via WO chain if not directly set
        const { data: woItemData } = await supabase.from('wo_items').select('wo_id').eq('id', recData.wo_item_id).single();
        if (woItemData?.wo_id) {
           const { data: woData } = await supabase.from('work_orders').select('customer_id').eq('id', woItemData.wo_id).single();
           if (woData?.customer_id) {
              const { data: custData } = await supabase.from('md_entities').select('name').eq('id', woData.customer_id).single();
              if (custData) {
                 recData.customer_name = custData.name;
                 setSelectedCustomerId(woData.customer_id);
              }
           }
        }
      }

      if (recData.shipper_id) setSelectedShipperId(recData.shipper_id);

      setReceipt(recData);
      // Fetch Items
      const { data: itemsData, error: itemsError } = await supabase
        .from('wh_inbound_receipt_items')
        .select(`
          *,
          product:product_sku_id(id, name, sku_code, unit, base_uom, conversion_to_base, uom_conversions)
        `)
        .eq('receipt_id', receiptId)
        .order('created_at', { ascending: true });
        
      if (itemsError) throw itemsError;
      setItems(itemsData || []);

      if (recData.wo_item_id) {
        const { data: joData } = await supabase
          .from('job_orders')
          .select('id')
          .eq('wo_item_id', recData.wo_item_id)
          .maybeSingle();
        if (joData) {
          const { data: assignData } = await supabase
            .from('jo_warehouse_assignments')
            .select(`
               warehouse_location_id,
               quantity,
               location:md_warehouse_locations(code),
               wo_item_manifests!wo_item_manifest_id(product_sku_id)
            `)
            .eq('job_order_id', joData.id);
          setAssignments(assignData || []);
        }
      } else {
        setAssignments([]);
      }

      if (['CHECKING_DONE', 'PUTAWAY_IN_PROGRESS', 'COMPLETED'].includes(recData.status)) {
        const { data: damageData } = await (supabase
          .from('wh_inbound_damage_records' as any) as any)
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
        const parentWoItemId = receipt.wo_item_id;
        
        // 1. Update JO status
        await supabase.from('job_orders').update({ status: 'completed' }).eq('wo_item_id', parentWoItemId);

        // 2. Check if all JOs for the parent wo_item are completed
        const { data: siblingJOs } = await supabase.from('job_orders').select('status').eq('wo_item_id', parentWoItemId);
        
        if (siblingJOs) {
          const allCompleted = siblingJOs.every((jo: any) => ['completed', 'done', 'selesai'].includes(jo.status?.toLowerCase()));
          if (allCompleted) {
            await supabase.from('wo_items').update({ status: 'completed' }).eq('id', parentWoItemId);
            
            // 3. Check if all wo_items for the parent work_order are completed
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
          } else {
            await supabase.from('wo_items').update({ status: 'in_progress' }).eq('id', parentWoItemId);
            const { data: woItemData } = await supabase.from('wo_items').select('wo_id').eq('id', parentWoItemId).single();
            if (woItemData?.wo_id) {
               await supabase.from('work_orders').update({ status: 'proses' }).eq('id', woItemData.wo_id);
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
    // [AI] Validate qty before submitting
    for (const item of items) {
      const goodQty = Number(item.actual_good_qty) || 0;
      const quarantineQty = Number(item.quarantine_qty) || 0;
      const rejectedQty = Number(item.rejected_qty) || 0;
      const totalScanned = goodQty + quarantineQty + rejectedQty;
      const expected = Number(item.expected_qty) || 0;

      if (totalScanned === 0 && expected > 0) {
        toast.error(`Item "${item.product_name || item.sku_code}" belum diisi qty!`);
        return;
      }

      if (totalScanned < expected) {
        const shortage = expected - totalScanned;
        toast.error(`Item "${item.product_name || item.sku_code}" kurang ${shortage} pcs! (Isi: ${totalScanned}, Target: ${expected})`, { duration: 5000 });
        return;
      }

      if (totalScanned > expected) {
        const overage = totalScanned - expected;
        toast.error(`Item "${item.product_name || item.sku_code}" lebih ${overage} pcs! (Isi: ${totalScanned}, Target: ${expected}). Hubungi supervisor.`, { duration: 5000 });
        return;
      }
    }

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

  const addPutawayEntry = (itemId: string) => {
    setPutawayData(prev => ({
      ...prev,
      [itemId]: [...(prev[itemId] || []), { location_id: '', quantity: '', _key: Date.now() + Math.random() }],
    }));
  };

  const updatePutawayEntry = (itemId: string, key: number, field: string, value: any) => {
    setPutawayData(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || []).map((e: any) =>
        e._key === key ? { ...e, [field]: value } : e
      ),
    }));
  };

  const removePutawayEntry = (itemId: string, key: number) => {
    setPutawayData(prev => ({
      ...prev,
      [itemId]: (prev[itemId] || []).filter((e: any) => e._key !== key),
    }));
  };

  const finishPutaway = async () => {
    setSubmitting(true);
    try {
      const entries: Record<string, any[]> = {};
      let hasEmpty = false;
      for (const item of items) {
        const itemEntries = putawayData[item.id] || [];
        if (itemEntries.length === 0) continue;
        const valid = itemEntries.filter((e: any) => e.location_id && Number(e.quantity) > 0);
        if (valid.length > 0) {
          entries[item.id] = valid.map((e: any) => ({
            location_id: e.location_id,
            quantity: Number(e.quantity),
            status: 'STORAGE',
          }));
        } else {
          hasEmpty = true;
        }
      }
      if (hasEmpty) {
        toast.error('Ada item dengan data putaway tidak lengkap (pilih lokasi & isi qty).');
        setSubmitting(false);
        return;
      }
      if (Object.keys(entries).length === 0) {
        toast.error('Belum ada alokasi putaway. Tambahkan minimal satu lokasi.');
        setSubmitting(false);
        return;
      }

      // Save putaway_entries to each receipt item
      for (const item of items) {
        const itemEntries = entries[item.id];
        if (!itemEntries?.length) continue;
        const { error: updErr } = await supabase
          .from('wh_inbound_receipt_items')
          .update({ putaway_entries: itemEntries })
          .eq('id', item.id);
        if (updErr) throw updErr;

        // Create wh_inventory records
        for (const entry of itemEntries) {
          const invPayload = {
            tenant_id: profile?.tenant_id,
            warehouse_id: receipt.warehouse_id,
            location_id: entry.location_id,
            product_sku_id: item.product_sku_id,
            quantity: Number(entry.quantity),
            received_date: new Date().toISOString().slice(0, 10),
            status: entry.status === 'QUARANTINE' ? 'QUARANTINE' : 'AVAILABLE',
            batch_number: item.batch_number || null,
            expiry_date: item.expiry_date || null,
          };
          const { error: invErr } = await supabase.from('wh_inventory').insert(invPayload as any);
          if (invErr) throw invErr;
        }
      }

      await handleUpdateStatus('COMPLETED');
    } catch (error: any) {
      toast.error('Gagal menyelesaikan Putaway: ' + error.message);
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

  const handleUpdateLogistics = async () => {
    setSubmitting(true);
    try {
      const updates: any = {};
      
      if (selectedTransporterId) {
        updates.transporter_id = selectedTransporterId;
        updates.transporter_name_manual = null; // Clear manual if ID selected
      } else if (transporterInput) {
        updates.transporter_name_manual = transporterInput;
        updates.transporter_id = null;
      }
      
      const fleetId = (document.getElementById('fleetSelect') as HTMLSelectElement)?.value;
      const driverId = (document.getElementById('driverSelect') as HTMLSelectElement)?.value;
      
      if (fleetId) updates.fleet_id = fleetId;
      if (driverId) updates.driver_id = driverId;

      const { error } = await supabase.from('wh_inbound_receipts').update(updates).eq('id', receiptId);
      if (error) throw error;
      
      toast.success('Info logistik berhasil diperbarui');
      fetchData();
    } catch (e) {
      toast.error('Gagal memperbarui info logistik');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdateContacts = async () => {
    setIsUpdatingContacts(true);
    try {
      const updates: any = {
        customer_id: selectedCustomerId || null,
        shipper_id: selectedShipperId || null,
      };

      const { error } = await supabase.from('wh_inbound_receipts').update(updates).eq('id', receiptId);
      if (error) throw error;
      
      toast.success('Data pelanggan & pengirim diperbarui');
      fetchData();
    } catch (e) {
      toast.error('Gagal memperbarui kontak');
    } finally {
      setIsUpdatingContacts(false);
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

  // [AI] Fetch all entities for hierarchy
  const fetchEntities = useCallback(async () => {
    if (!receipt?.tenant_id) return;
    const { data, error } = await supabase.from('md_entities')
      .select('id, name, parent_id, is_customer')
      .eq('tenant_id', receipt.tenant_id)
      .eq('is_active', true)
      .order('name');
    if (error) {
      console.error('[fetchEntities] Error:', error);
    } else {
      setAllEntities(data || []);
    }
  }, [receipt?.tenant_id]);

  // Fetch transporters and entities once on mount
  useEffect(() => {
    fetchTransporters();
    fetchEntities();
  }, [fetchTransporters, fetchEntities]);

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

  // Fetch all zones and locations for putaway
  useEffect(() => {
    if (receipt?.status === 'PUTAWAY_IN_PROGRESS' && receipt?.warehouse_id) {
      supabase.from('md_warehouse_areas')
        .select('id, area_code, area_name')
        .eq('warehouse_id', receipt.warehouse_id)
        .order('area_name', { ascending: true })
        .then(({ data }) => setPutawayZones(data || []));

      supabase.from('md_warehouse_locations')
        .select('id, code, area_id, location_type, storage_method')
        .eq('warehouse_id', receipt.warehouse_id)
        .eq('is_active', true)
        .order('code', { ascending: true })
        .then(({ data }) => setPutawayLocations(data || []));
      
      // Init putawayData from existing putaway_entries
      setPutawayData(prev => {
        const next = { ...prev };
        items.forEach(item => {
          if (item.putaway_entries?.length > 0) {
            next[item.id] = item.putaway_entries.map((e: any) => ({
              ...e,
              _key: Date.now() + Math.random(),
            }));
          } else if (!next[item.id]) {
            next[item.id] = [];
          }
        });
        return next;
      });
    }
  }, [receipt?.status, receipt?.warehouse_id, items.length]);

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
                <h2 className="text-2xl font-black font-mono text-slate-900">{receipt.receipt_number?.replace(/^RCV-/, '')}</h2>
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

            {/* Contact Info */}
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
                        setSelectedShipperId(null);
                      }}
                      className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 transition-all bg-white text-slate-900"
                    >
                      <option value="">-- Pilih Pelanggan --</option>
                      {allEntities.filter(e => e.is_customer).map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-medium text-slate-900">{receipt.customer?.name || receipt.customer_name || '-'}</span>
                  )}
                </div>
                
                <div>
                  <span className="block text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Shipper / Supplier</span>
                  {!isCompleted ? (
                    <select
                      value={selectedShipperId || ''}
                      onChange={(e) => setSelectedShipperId(e.target.value)}
                      disabled={!selectedCustomerId}
                      className="w-full border border-slate-200 rounded px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/30 transition-all bg-white text-slate-900 disabled:bg-slate-50 disabled:text-slate-400"
                    >
                      <option value="">-- Pilih Shipper --</option>
                      {selectedCustomerId && allEntities
                        .filter(e => e.id === selectedCustomerId || e.parent_id === selectedCustomerId)
                        .map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  ) : (
                    <span className="font-medium text-slate-900">{receipt.shipper?.name || '-'}</span>
                  )}
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
              <div className="overflow-y-auto bg-slate-50/50 flex-1 p-4 space-y-4">
                {items.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                    <PackageX size={32} className="text-slate-300 mb-2" />
                    <p className="text-slate-500 font-medium">Belum ada item product di receipt ini.</p>
                  </div>
                ) : (
                  items.map((item) => (
                    <div key={item.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md hover:border-blue-200 transition-all group/item flex flex-col md:flex-row gap-4">
                      {/* Product Info & Locations */}
                      <div className="flex-1 space-y-3">
                        <div>
                          <div className="font-black text-slate-900 text-sm flex items-center gap-2">
                            {item.product?.name}
                            <button onClick={() => setEditProductModalId(item.product_sku_id)} title="Edit Master Produk" className="text-slate-300 hover:text-indigo-600 transition-colors opacity-0 group-hover/item:opacity-100">
                                <Edit2 size={12} />
                            </button>
                          </div>
                          <div className="text-[9px] text-slate-400 font-mono font-bold mt-0.5 tracking-wider bg-slate-100 inline-block px-2 py-0.5 rounded-md">{item.product?.sku_code}</div>
                        </div>

                        <div className="flex flex-wrap gap-3">
                          {/* Rencana Alokasi */}
                          <div className="bg-blue-50/50 rounded-xl p-2.5 border border-blue-100 flex-1 min-w-[140px]">
                            <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                              <MapPin size={10} /> Rencana Alokasi
                            </div>
                            {(() => {
                              const assign = assignments.find(a => a.wo_item_manifests?.product_sku_id === item.product_sku_id);
                              if (assign?.location?.code) {
                                return (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-white text-blue-700 text-xs font-bold shadow-sm border border-blue-100">
                                    {assign.location.code}
                                  </span>
                                );
                              }
                              return <span className="text-[10px] text-slate-400 font-bold italic">TBA</span>;
                            })()}
                          </div>

                          {/* Aktual Putaway */}
                          <div className="bg-indigo-50/50 rounded-xl p-2.5 border border-indigo-100 flex-[2] min-w-[200px]">
                            <div className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                              <ArrowRight size={10} /> Aktual Putaway
                            </div>
                            {isPutaway ? (
                              <div className="space-y-2">
                                {(putawayData[item.id] || []).map((entry: any) => {
                                  const whZone = putawayZones.find(z => z.id === putawayLocations.find((l: any) => l.id === entry.location_id)?.area_id);
                                  const locCode = putawayLocations.find((l: any) => l.id === entry.location_id)?.code || '';
                                  return (
                                    <div key={entry._key} className="flex flex-wrap items-center gap-1.5 bg-white p-1.5 rounded-lg border border-indigo-100/50 shadow-sm">
                                      <select
                                        value={entry.location_id}
                                        onChange={(e) => updatePutawayEntry(item.id, entry._key, 'location_id', e.target.value)}
                                        className="flex-1 min-w-[120px] px-1.5 py-1 border-none rounded text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500 bg-transparent text-indigo-900"
                                      >
                                        <option value="">Pilih Lokasi</option>
                                        {putawayZones.map(zone => {
                                          const zoneLocs = putawayLocations.filter((l: any) => l.area_id === zone.id && l.location_type !== 'QUARANTINE');
                                          if (zoneLocs.length === 0) return null;
                                          return (
                                            <optgroup key={zone.id} label={`${zone.area_code} - ${zone.area_name}`}>
                                              {zoneLocs.map((loc: any) => (
                                                <option key={loc.id} value={loc.id}>{loc.code}</option>
                                              ))}
                                            </optgroup>
                                          );
                                        })}
                                      </select>
                                      <div className="w-[1px] h-4 bg-indigo-100"></div>
                                      <input
                                        type="number" min="0" placeholder="Qty"
                                        value={entry.quantity}
                                        onChange={(e) => updatePutawayEntry(item.id, entry._key, 'quantity', e.target.value)}
                                        className="w-14 px-1.5 py-1 border-none rounded text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500 text-center bg-transparent text-indigo-900"
                                      />
                                      <button
                                        onClick={() => removePutawayEntry(item.id, entry._key)}
                                        className="p-1 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-colors ml-1"
                                      >
                                        <X size={12} />
                                      </button>
                                    </div>
                                  );
                                })}
                                <button
                                  onClick={() => addPutawayEntry(item.id)}
                                  className="text-[10px] font-black text-indigo-500 hover:text-white hover:bg-indigo-500 border border-indigo-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all w-full justify-center shadow-sm bg-white"
                                >
                                  <Plus size={12} /> Tambah Lokasi Putaway
                                </button>
                              </div>
                            ) : (
                              (() => {
                                const entries = item.putaway_entries || [];
                                if (entries.length > 0) {
                                  return (
                                    <div className="flex flex-wrap gap-2">
                                      {entries.map((ent: any, idx: number) => {
                                        const locCode = putawayLocations.find((l: any) => l.id === ent.location_id)?.code || ent.location_id.slice(0, 8);
                                        return (
                                          <div key={idx} className="flex items-center gap-1.5 bg-white px-2 py-1 rounded shadow-sm border border-indigo-100">
                                            <span className={`inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest ${ent.status === 'QUARANTINE' ? 'text-amber-600' : 'text-emerald-600'}`}>
                                              <MapPin size={10} /> {locCode}
                                            </span>
                                            <div className="w-[1px] h-3 bg-indigo-100"></div>
                                            <span className="text-xs font-black text-slate-700">{formatQtyWithConversion(Number(ent.quantity) || 0, item.product)}</span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  );
                                }
                                return <span className="text-[10px] text-slate-400 font-bold italic">Belum Putaway</span>;
                              })()
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Divider for mobile */}
                      <div className="h-[1px] w-full bg-slate-100 md:hidden block"></div>

                      {/* Quantities & Dimensions */}
                      <div className="flex flex-col md:w-64 space-y-3 shrink-0 bg-slate-50/50 p-3 rounded-xl border border-slate-100">
                        {/* Expected */}
                        <div className="flex items-center justify-between pb-2 border-b border-slate-200/50">
                          <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Expected Qty</span>
                          <span className="text-base font-black text-slate-800 italic">
                            {formatQtyWithConversion(Number(item.expected_qty) || 0, item.product)}
                          </span>
                        </div>

                        {/* Checking Inputs / Actuals */}
                        {(isChecking || isCheckingDone || isPutaway || isCompleted) && (
                          <div className="space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                <CheckCircle2 size={10} /> Good
                              </span>
                              {isChecking ? (
                                <div className="flex items-center gap-1.5 bg-white border border-emerald-200 rounded-lg px-1 py-0.5 focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all shadow-sm">
                                  <input type="number" min="0" value={item.actual_good_qty || ''} onChange={(e) => handleItemChange(item.id, 'actual_good_qty', e.target.value)} className="w-14 h-6 text-right border-none outline-none text-emerald-700 font-black text-xs bg-transparent" />
                                  <span className="text-[8px] text-slate-400 font-black uppercase pr-1">{item.product?.default_inbound_uom || item.product?.unit || 'PCS'}</span>
                                </div>
                              ) : (
                                <span className="font-black text-emerald-600 text-xs bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">{formatQtyWithConversion(Number(item.actual_good_qty) || 0, item.product)}</span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1">
                                <AlertTriangle size={10} /> Quar
                              </span>
                              {isChecking ? (
                                <div className="flex items-center gap-1.5 bg-white border border-amber-200 rounded-lg px-1 py-0.5 focus-within:border-amber-500 focus-within:ring-2 focus-within:ring-amber-100 transition-all shadow-sm">
                                  <input type="number" min="0" value={item.quarantine_qty || ''} onChange={(e) => handleItemChange(item.id, 'quarantine_qty', e.target.value)} className="w-14 h-6 text-right border-none outline-none text-amber-700 font-black text-xs bg-transparent" />
                                  <span className="text-[8px] text-slate-400 font-black uppercase pr-1">{item.product?.default_inbound_uom || item.product?.unit || 'PCS'}</span>
                                </div>
                              ) : (
                                <span className="font-black text-amber-600 text-xs bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100">{formatQtyWithConversion(Number(item.quarantine_qty) || 0, item.product)}</span>
                              )}
                            </div>
                            
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest flex items-center gap-1">
                                <XCircle size={10} /> Reject
                              </span>
                              {isChecking ? (
                                <div className="flex items-center gap-1.5 bg-white border border-rose-200 rounded-lg px-1 py-0.5 focus-within:border-rose-500 focus-within:ring-2 focus-within:ring-rose-100 transition-all shadow-sm">
                                  <input type="number" min="0" value={item.rejected_qty || ''} onChange={(e) => handleItemChange(item.id, 'rejected_qty', e.target.value)} className="w-14 h-6 text-right border-none outline-none text-rose-700 font-black text-xs bg-transparent" />
                                  <span className="text-[8px] text-slate-400 font-black uppercase pr-1">{item.product?.default_inbound_uom || item.product?.unit || 'PCS'}</span>
                                </div>
                              ) : (
                                <span className="font-black text-rose-600 text-xs bg-rose-50 px-2 py-0.5 rounded-md border border-rose-100">{formatQtyWithConversion(Number(item.rejected_qty) || 0, item.product)}</span>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Dimensions */}
                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/50">
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white border border-slate-200 px-1.5 py-0.5 rounded">CBM</span>
                            <span className="font-bold text-slate-700 text-xs ml-1">{item.actual_cbm || item.expected_cbm || '0.00'}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest bg-white border border-slate-200 px-1.5 py-0.5 rounded">KGS</span>
                            <span className="font-bold text-slate-700 text-xs ml-1">{item.actual_kg || item.expected_kg || '0.00'}</span>
                          </div>
                        </div>

                      </div>
                    </div>
                  ))
                )}
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
                              <p className="font-bold text-slate-700">{formatQtyWithConversion(Number(item.expected_qty) || 0, item.product)}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3 text-center text-xs font-bold">
                            <div className="p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                              <span className="text-emerald-600">Good</span>
                              <p className="text-xs text-emerald-700 font-bold mt-1">{formatQtyWithConversion(Number(item.actual_good_qty) || 0, item.product)}</p>
                            </div>
                            <div className="p-2 bg-amber-50 rounded-lg border border-amber-100">
                              <span className="text-amber-600">Damage</span>
                              <p className="text-xs text-amber-700 font-bold mt-1">{formatQtyWithConversion(itemDamages.reduce((s, r) => s + Number(r.qty), 0), item.product)}</p>
                            </div>
                            <div className={`p-2 rounded-lg border ${overage > 0 ? 'bg-blue-50 border-blue-100' : 'bg-slate-50 border-slate-100'}`}>
                              <span className={overage > 0 ? 'text-blue-600' : 'text-slate-400'}>Overage</span>
                              <p className={`text-xs font-bold mt-1 ${overage > 0 ? 'text-blue-700' : 'text-slate-400'}`}>{formatQtyWithConversion(overage, item.product)}</p>
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
                                <span className="text-[10px] font-bold text-rose-700 uppercase tracking-widest">Damage: {formatQtyWithConversion(Number(rec.qty) || 0, item.product)}</span>
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
