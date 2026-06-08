'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { fetchReceiptAdmin, updateReceiptAdmin } from './actions';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Loader2, Truck, PackageCheck, AlertTriangle, CheckCircle2, Clock, Play, Pause, Square, Warehouse, Camera, CloudDownload, ChevronDown, Scan } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import BarcodeScanner from '@/components/scanner/BarcodeScanner';
import { Plus, Trash2 } from 'lucide-react';

export type PutawayEntry = {
  id: string;
  locationCode: string;
  qty: string;
};

export default function WarehouseTaskExecutionPage() {
  const router = useRouter();
  const params = useParams();
  const taskId = params.id as string;
  
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [task, setTask] = useState<any>(null);
  const [receipt, setReceipt] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  const [unloadingSessions, setUnloadingSessions] = useState<any[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [showStopModal, setShowStopModal] = useState(false);
  const [stopReason, setStopReason] = useState('');

  const [damageEntries, setDamageEntries] = useState<any[]>([]);
  const [pinConfirm, setPinConfirm] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [putawayEntries, setPutawayEntries] = useState<Record<string, PutawayEntry[]>>({});
  const [quarantineRecords, setQuarantineRecords] = useState<any[]>([]);
  const [quarantineEntries, setQuarantineEntries] = useState<Record<string, PutawayEntry[]>>({});
  const [activeScanItem, setActiveScanItem] = useState<{itemId: string, entryId: string, type: 'GOOD' | 'QUARANTINE'} | null>(null);
  const [joAssignments, setJoAssignments] = useState<any[]>([]);

  // Security form fields
  const [transporterName, setTransporterName] = useState('');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(null);
  const [selectedFleetId, setSelectedFleetId] = useState('');
  const [fleetSelectOpen, setFleetSelectOpen] = useState(false);
  const [driverSelectOpen, setDriverSelectOpen] = useState(false);
  const [fleets, setFleets] = useState<any[]>([]);
  const [transporters, setTransporters] = useState<any[]>([]);
  const [transporterDropdownOpen, setTransporterDropdownOpen] = useState(false);
  const [selectedTransporterId, setSelectedTransporterId] = useState<string | null>(null);
  const [transporterDrivers, setTransporterDrivers] = useState<any[]>([]);
  const [vehiclePhotoUrl, setVehiclePhotoUrl] = useState('');
  const [podUrl, setPodUrl] = useState('');

  useEffect(() => {
    const storedSession = localStorage.getItem('sentralogis_wh_session');
    if (storedSession) {
      const parsed = JSON.parse(storedSession);
      setSession(parsed);
      fetchTaskDetails(parsed);
    }
  }, [taskId]);

  const fetchTaskDetails = async (sess: any) => {
    setLoading(true);
    try {
      // Fetch Receipt directly using taskId (which is now receipt_id)
      const recData = await fetchReceiptAdmin(taskId as string);
        
      if (!recData) throw new Error('Receipt record not found or inaccessible due to relations (PGRST116 avoided)');
      
      setReceipt(recData);

      // Derive task logic from session role instead of wh_jo_staff_assignments
      const taskData = {
        id: taskId,
        assigned_role: sess.role || 'GUEST',
        receipt_id: taskId
      };
      setTask(taskData);

        if (taskData.assigned_role === 'TALLY') {
          fetchUnloadingSessions(recData.id);
        }

        // Fetch Items if Role is Tally or Putaway
        if (taskData.assigned_role === 'TALLY' || taskData.assigned_role === 'PUTAWAY') {
          // [AI] Tambah storage_rule untuk menentukan tampilan expiry date (FIFO aging / FEFO remaining)
          const { data: itemsData } = await supabase
            .from('wh_inbound_receipt_items')
            .select('*, product:md_product_skus!product_sku_id(name, sku_code, unit, storage_rule), location:md_warehouse_locations!planned_putaway_location_id(code)')
            .eq('receipt_id', taskData.receipt_id)
            .order('created_at', { ascending: true });
          
          let assignmentsData: any[] = [];
          if (recData.wo_item_id) {
             const { data: assignData } = await supabase
               .from('jo_warehouse_assignments')
               .select(`
                  warehouse_location_id,
                  location:md_warehouse_locations(code),
                  wo_item_manifests!wo_item_manifest_id(product_sku_id)
               `)
               .eq('job_order_id', recData.wo_item_id);
             assignmentsData = assignData || [];
             setJoAssignments(assignmentsData);
          }
          
          setItems(itemsData || []);
          if (taskData.assigned_role === 'PUTAWAY' && itemsData) {
            const initialGood: Record<string, PutawayEntry[]> = {};
            itemsData.forEach(item => {
              if (Number(item.actual_good_qty) > 0) {
                initialGood[item.id] = [{
                  id: Math.random().toString(36).substr(2, 9),
                  locationCode: '',
                  qty: item.actual_good_qty.toString()
                }];
              }
            });
            setPutawayEntries(initialGood);
          }
        }

        // Fetch quarantine damage records for PUTAWAY role
        if (taskData.assigned_role === 'PUTAWAY') {
          const { data: damageData } = await supabase
            .from('wh_inbound_damage_records')
            .select('*, location:md_warehouse_locations!planned_quarantine_location_id(code)')
            .eq('receipt_id', taskData.receipt_id)
            .eq('decision', 'ACCEPT_QUARANTINE')
            .order('created_at', { ascending: true });
          setQuarantineRecords(damageData || []);
          
          if (damageData) {
            const initialQrt: Record<string, PutawayEntry[]> = {};
            damageData.forEach(rec => {
              initialQrt[rec.id] = [{
                id: Math.random().toString(36).substr(2, 9),
                locationCode: '',
                qty: rec.qty.toString()
              }];
            });
            setQuarantineEntries(initialQrt);
          }
        }

        if (taskData.assigned_role === 'SECURITY') {
          const { data: vendorData } = await supabase.from('md_entities')
            .select('id, name')
            .eq('tenant_id', recData.tenant_id)
            .eq('is_vendor', true)
            .eq('is_active', true)
            .order('name', { ascending: true });

          const { data: internalData } = await supabase.from('md_entities')
            .select('id, name')
            .eq('tenant_id', recData.tenant_id)
            .eq('is_vendor', false)
            .eq('is_active', true)
            .limit(1);

          const combined = [...(internalData || []), ...(vendorData || [])];
          const mappedList = combined.map(e => ({ id: e.id, transporter_name: e.name, transporter_code: '' }));
          setTransporters(mappedList);

          // If receipt already has a transporter name, try to match it
          const existingName = recData.transporter_name_manual || recData.transporter?.name || '';
          const matched = mappedList.find((t: any) => t.transporter_name === existingName);
          if (matched) {
            setSelectedTransporterId(matched.id);
          }

          setTransporterName(existingName);
          setSelectedDriverId(recData.driver_id || null);
          setDriverName(recData.driver_name_manual || recData.driver?.name || '');
          setDriverPhone(recData.driver_phone || '');
          setSelectedFleetId(recData.fleet_id || '');
          setVehiclePhotoUrl(recData.vehicle_photo_url || '');
          setPodUrl(recData.pod_document_url || '');
        }
      
    } catch (err) {
      console.error(err);
      toast.error('Gagal memuat tugas');
      router.push('/warehouse/portal');
    } finally {
      setLoading(false);
    }
  };

  // Fetch fleets & drivers when transporter is selected
  useEffect(() => {
    if (!receipt?.tenant_id || !selectedTransporterId) {
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
        .select('id, name, phone')
        .eq('entity_id', selectedTransporterId)
        .eq('is_active', true),
    ]).then(([fleetsRes, driversRes]) => {
      setFleets(fleetsRes.data || []);
      setTransporterDrivers(driversRes.data || []);
    });
  }, [selectedTransporterId, receipt?.tenant_id]);

  const handleUpdateStatus = async (newStatus: string) => {
    setSubmitting(true);
    try {
      await updateReceiptAdmin(receipt.id, { status: newStatus });

      toast.success(`Status diperbarui: ${newStatus.replace(/_/g, ' ')}`);
      fetchTaskDetails(session);
    } catch (error: any) {
      toast.error('Gagal memperbarui status');
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleItemChange = (itemId: string, field: string, value: any) => {
    setItems(items.map(item => item.id === itemId ? { ...item, [field]: value } : item));
  };

  // [AI] Updated: tambah expiry_date, batch_number, dan customer_id dari receipt item
  const upsertInventory = async (item: any, locationId: string, quantity: number, status: string) => {
    const productSkuId = item.product_sku_id || item.product?.id;
    if (!productSkuId || !receipt.tenant_id || !receipt.warehouse_id) return;

    // [AI] Ambil expiry_date, batch_number dari receipt item
    const expiryDate = item.expiry_date || null;
    const batchNumber = item.batch_number || null;

    // [AI] Ambil customer_id dari md_product_skus (untuk filter inventory by pelanggan)
    let customerId = null;
    const { data: skuData } = await supabase
      .from('md_product_skus')
      .select('customer_id')
      .eq('id', productSkuId)
      .maybeSingle();
    if (skuData?.customer_id) {
      customerId = skuData.customer_id;
    }

    // Check if inventory record exists for same product + location + status + batch
    const { data: existing, error: checkErr } = await supabase
      .from('wh_inventory')
      .select('id, quantity')
      .eq('product_sku_id', productSkuId)
      .eq('location_id', locationId)
      .eq('status', status)
      .eq('warehouse_id', receipt.warehouse_id)
      .eq('batch_number', batchNumber)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from('wh_inventory')
        .update({ quantity: Number(existing.quantity) + quantity })
        .eq('id', existing.id);
      if (error) throw error;
    } else {
      const { error } = await supabase
        .from('wh_inventory')
        .insert({
          tenant_id: receipt.tenant_id,
          warehouse_id: receipt.warehouse_id,
          location_id: locationId,
          product_sku_id: productSkuId,
          customer_id: customerId, // [AI] Populate customer_id dari md_product_skus
          quantity,
          status,
          received_date: new Date().toISOString().split('T')[0],
          expiry_date: expiryDate,
          batch_number: batchNumber
        });
      if (error) throw error;
    }
  };

  const handleFinishPutaway = async () => {
    const goodItems = items.filter(i => Number(i.actual_good_qty) > 0);
    
    // Validate Good Stock
    for (const item of goodItems) {
      const entries = putawayEntries[item.id] || [];
      const totalQty = entries.reduce((sum, e) => sum + Number(e.qty || 0), 0);
      if (totalQty !== Number(item.actual_good_qty)) {
        toast.error(`Total Qty untuk ${item.product?.name} tidak sesuai! (Harus ${item.actual_good_qty}, diisi ${totalQty})`);
        return;
      }
      if (entries.some(e => !e.locationCode.trim())) {
        toast.error('Semua kolom rak harus diisi. Scan barcode rak untuk setiap baris.');
        return;
      }
    }

    // Validate Quarantine
    for (const rec of quarantineRecords) {
      const entries = quarantineEntries[rec.id] || [];
      const totalQty = entries.reduce((sum, e) => sum + Number(e.qty || 0), 0);
      if (totalQty !== Number(rec.qty)) {
        toast.error(`Total Qty Quarantine tidak sesuai! (Harus ${rec.qty}, diisi ${totalQty})`);
        return;
      }
      if (entries.some(e => !e.locationCode.trim())) {
        toast.error('Semua kolom rak karantina harus diisi.');
        return;
      }
    }

    setSubmitting(true);
    try {
      // 1. Gather all unique location codes scanned
      const allCodes = new Set<string>();
      for (const item of goodItems) {
        (putawayEntries[item.id] || []).forEach(e => allCodes.add(e.locationCode.trim().toUpperCase()));
      }
      for (const rec of quarantineRecords) {
        (quarantineEntries[rec.id] || []).forEach(e => allCodes.add(e.locationCode.trim().toUpperCase()));
      }

      // 2. Fetch their UUIDs
      const { data: locs, error: locErr } = await supabase
        .from('md_warehouse_locations')
        .select('id, code')
        .eq('warehouse_id', receipt.warehouse_id)
        .in('code', Array.from(allCodes));

      if (locErr) throw locErr;
      
      const locMap: Record<string, string> = {};
      locs?.forEach(l => locMap[l.code.toUpperCase()] = l.id);

      // Verify all codes were found
      for (const code of Array.from(allCodes)) {
        if (!locMap[code]) {
          toast.error(`Rak ${code} tidak ditemukan di database! Pastikan kode rak benar.`);
          setSubmitting(false);
          return;
        }
      }

      const itemLogs: Record<string, any[]> = {};
      const firstLocations: Record<string, string> = {};

      // Save good item locations & update inventory
      for (const item of goodItems) {
        const entries = putawayEntries[item.id] || [];
        if (!itemLogs[item.id]) itemLogs[item.id] = [];
        
        for (const entry of entries) {
          const locId = locMap[entry.locationCode.trim().toUpperCase()];
          await upsertInventory(item, locId, Number(entry.qty), 'AVAILABLE');
          itemLogs[item.id].push({ location_id: entry.locationCode, quantity: Number(entry.qty), status: 'AVAILABLE' });
        }
        // Save first location ID just for tracking reference
        if (entries.length > 0) {
          firstLocations[item.id] = locMap[entries[0].locationCode.trim().toUpperCase()];
        }
      }

      // Save quarantine locations & update inventory
      for (const rec of quarantineRecords) {
        const entries = quarantineEntries[rec.id] || [];
        const item = items.find(i => i.id === rec.receipt_item_id);
        if (item) {
          if (!itemLogs[item.id]) itemLogs[item.id] = [];
          for (const entry of entries) {
            const locId = locMap[entry.locationCode.trim().toUpperCase()];
            await upsertInventory(item, locId, Number(entry.qty), 'QUARANTINE');
            itemLogs[item.id].push({ location_id: entry.locationCode, quantity: Number(entry.qty), status: 'QUARANTINE' });
          }
          if (entries.length > 0 && !firstLocations[item.id]) {
            firstLocations[item.id] = locMap[entries[0].locationCode.trim().toUpperCase()];
          }
          if (entries.length > 0) {
            const locId = locMap[entries[0].locationCode.trim().toUpperCase()];
            const { error: dmgErr } = await supabase
              .from('wh_inbound_damage_records')
              .update({ quarantine_location_id: locId })
              .eq('id', rec.id);
            if (dmgErr) throw dmgErr;
          }
        }
      }

      // Update all receipt items with their combined logs
      for (const itemId of Object.keys(itemLogs)) {
        const { error: itmErr } = await supabase
          .from('wh_inbound_receipt_items')
          .update({ 
            putaway_location_id: firstLocations[itemId] || null, 
            putaway_entries: itemLogs[itemId],
            putaway_at: new Date().toISOString() 
          })
          .eq('id', itemId);
        if (itmErr) throw itmErr;
      }

      // Update receipt status to COMPLETED
      const { error: recUpdErr } = await supabase
        .from('wh_inbound_receipts')
        .update({ status: 'COMPLETED' })
        .eq('id', receipt.id);
      if (recUpdErr) throw recUpdErr;

      // Update related JO to completed
      if (receipt.wo_item_id) {
         await supabase.from('job_orders').update({ status: 'completed' }).eq('id', receipt.wo_item_id);
      }

      toast.success('Putaway selesai! Semua barang tersimpan.');
      fetchTaskDetails(session);
    } catch (err) {
      toast.error('Gagal menyimpan data putaway');
    } finally {
      setSubmitting(false);
    }
  };

  const fetchUnloadingSessions = async (receiptId: string) => {
    const { data } = await supabase
      .from('wh_unloading_sessions')
      .select('*')
      .eq('receipt_id', receiptId)
      .order('session_number', { ascending: true });
    setUnloadingSessions(data || []);

    const activeSession = (data || []).find(s => !s.end_time);
    if (activeSession) {
      const runningSince = new Date(activeSession.start_time).getTime();
      setElapsedSeconds(Math.floor((Date.now() - runningSince) / 1000));
      setTimerRunning(true);
    } else {
      const totalSeconds = (data || []).reduce((sum, s) => {
        if (s.end_time) return sum + Math.floor((new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 1000);
        return sum;
      }, 0);
      setElapsedSeconds(totalSeconds);
      setTimerRunning(false);
    }
  };

  useEffect(() => {
    if (!timerRunning) return;
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning]);

  const handleStartUnloading = async () => {
    setSubmitting(true);
    try {
      const nextNumber = unloadingSessions.length + 1;
      const { error } = await supabase.from('wh_unloading_sessions').insert({
        receipt_id: receipt.id,
        session_number: nextNumber,
        start_time: new Date().toISOString(),
      });
      if (error) throw error;

      toast.success('Unloading dimulai');
      await fetchUnloadingSessions(receipt.id);
    } catch (err) {
      toast.error('Gagal memulai unloading');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStopUnloading = async () => {
    if (!stopReason.trim()) {
      toast.error('Isi alasan berhenti');
      return;
    }
    setSubmitting(true);
    try {
      const active = unloadingSessions.find(s => !s.end_time);
      if (!active) throw new Error('No active session');
      const { error } = await supabase
        .from('wh_unloading_sessions')
        .update({ end_time: new Date().toISOString(), pause_reason: stopReason })
        .eq('id', active.id);
      if (error) throw error;

      setShowStopModal(false);
      setStopReason('');
      toast.success('Unloading dijeda');
      await fetchUnloadingSessions(receipt.id);
    } catch (err) {
      toast.error('Gagal menjeda unloading');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishUnloading = async () => {
    setSubmitting(true);
    try {
      const active = unloadingSessions.find(s => !s.end_time);
      if (active) {
        await supabase
          .from('wh_unloading_sessions')
          .update({ end_time: new Date().toISOString() })
          .eq('id', active.id);
      }

      const { data: allSessions } = await supabase
        .from('wh_unloading_sessions')
        .select('start_time, end_time')
        .eq('receipt_id', receipt.id);

      const totalMinutes = (allSessions || []).reduce((sum, s) => {
        if (s.end_time) return sum + (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000;
        return sum;
      }, 0);

      await supabase.from('wh_inbound_receipts')
        .update({ status: 'CHECKING', total_unloading_minutes: Math.round(totalMinutes * 100) / 100 })
        .eq('id', receipt.id);

      await supabase.from('wh_milestone_logs').insert({
        tenant_id: receipt.tenant_id,
        reference_type: 'INBOUND_RECEIPT',
        reference_id: receipt.id,
        milestone_event: `Unloading selesai - ${Math.round(totalMinutes)} menit`
      });

      toast.success(`Unloading selesai (${Math.round(totalMinutes)} menit)`);
      fetchTaskDetails(session);
    } catch (err) {
      toast.error('Gagal menyelesaikan unloading');
    } finally {
      setSubmitting(false);
    }
  };

  const addDamageEntry = (itemId: string) => {
    setDamageEntries(prev => [...prev, {
      tempId: `new_${Date.now()}_${Math.random()}`,
      receipt_item_id: itemId,
      qty: 0,
      damage_source: '',
      source_notes: '',
      source_photo_url: '',
      source_photoFile: null as File | null,
      damage_condition: '',
      condition_notes: '',
      condition_photo_url: '',
      condition_photoFile: null as File | null,
    }]);
  };

  const updateDamageEntry = (tempId: string, field: string, value: any) => {
    setDamageEntries(prev => prev.map(d => d.tempId === tempId ? { ...d, [field]: value } : d));
  };

  const removeDamageEntry = (tempId: string) => {
    setDamageEntries(prev => prev.filter(d => d.tempId !== tempId));
  };

  const handleDamagePhoto = async (tempId: string, field: 'source_photo_url' | 'condition_photo_url', file: File) => {
    setSubmitting(true);
    try {
      const fileName = `damage_${receipt.id}_${tempId}_${field}_${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('inbound-docs')
        .upload(`damage/${fileName}`, file, { upsert: true });
      if (error) throw error;
      const { data: publicUrlData } = supabase.storage.from('inbound-docs').getPublicUrl(`damage/${fileName}`);
      updateDamageEntry(tempId, field, publicUrlData.publicUrl);
      toast.success('Foto terupload');
    } catch (err) {
      toast.error('Gagal upload foto');
    } finally {
      setSubmitting(false);
    }
  };

  const submitChecking = async () => {
    if (!pinConfirm || pinConfirm.length < 4) {
      toast.error('Masukkan PIN untuk konfirmasi');
      return;
    }

    const { data: staffCheck } = await supabase
      .from('md_warehouse_staff')
      .select('pin')
      .eq('id', session.staff_id)
      .single();

    if (!staffCheck || staffCheck.pin !== pinConfirm) {
      toast.error('PIN salah');
      return;
    }

    // [AI] Validate qty before submitting
    for (const item of items) {
      const goodQty = Number(item.actual_good_qty) || 0;
      const damageQty = damageEntries
        .filter(d => d.receipt_item_id === item.id && Number(d.qty) > 0)
        .reduce((sum, d) => sum + Number(d.qty), 0);
      const totalScanned = goodQty + damageQty;
      const expected = Number(item.expected_qty) || 0;

      if (totalScanned === 0 && expected > 0) {
        toast.error(`Item "${item.product?.name}" belum diisi qty!`);
        return;
      }

      if (totalScanned < expected) {
        const shortage = expected - totalScanned;
        toast.error(`Item "${item.product?.name}" kurang ${shortage} pcs! (Isi: ${totalScanned}, Target: ${expected})`, { duration: 5000 });
        return;
      }

      if (totalScanned > expected) {
        const overage = totalScanned - expected;
        toast.error(`Item "${item.product?.name}" lebih ${overage} pcs! (Isi: ${totalScanned}, Target: ${expected}). Hubungi supervisor.`, { duration: 5000 });
        return;
      }
    }

    setSubmitting(true);
    try {
      for (const item of items) {
        const { error } = await supabase
          .from('wh_inbound_receipt_items')
          .update({ actual_good_qty: item.actual_good_qty || 0 })
          .eq('id', item.id);
        if (error) throw error;
      }

      const itemDamageMap: Record<string, { totalQty: number }> = {};
      for (const d of damageEntries) {
        if (Number(d.qty) <= 0) continue;

        if (!d.source_photo_url) { toast.error(`Foto "Why Damage?" wajib diisi`); setSubmitting(false); return; }
        if (!d.condition_photo_url) { toast.error(`Foto "What is Damage?" wajib diisi`); setSubmitting(false); return; }

        const { error } = await supabase.from('wh_inbound_damage_records').insert({
          receipt_id: receipt.id,
          receipt_item_id: d.receipt_item_id,
          qty: d.qty,
          damage_source: d.damage_source,
          source_notes: d.source_notes,
          source_photo_url: d.source_photo_url,
          damage_condition: d.damage_condition,
          condition_notes: d.condition_notes,
          condition_photo_url: d.condition_photo_url,
          reported_by: session.staff_id,
        });
        if (error) throw error;

        if (!itemDamageMap[d.receipt_item_id]) itemDamageMap[d.receipt_item_id] = { totalQty: 0 };
        itemDamageMap[d.receipt_item_id].totalQty += Number(d.qty);
      }

      for (const [itemId, info] of Object.entries(itemDamageMap)) {
        await supabase.from('wh_inbound_receipt_items')
          .update({ rejected_qty: info.totalQty })
          .eq('id', itemId);
      }


      await updateReceiptAdmin(receipt.id, { status: 'CHECKING_DONE' });

      await supabase.from('wh_milestone_logs').insert({
        tenant_id: receipt.tenant_id,
        reference_type: 'INBOUND_RECEIPT',
        reference_id: receipt.id,
        milestone_event: `Tally checking done - ${damageEntries.length} damage records`
      });

      if (damageEntries.length > 0) {
        console.log('[WA PLACEHOLDER] Push damage notification for receipt:', receipt.id);
      }

      toast.success('Pengecekan selesai. Menunggu review Admin.');
      setShowPinModal(false);
      setPinConfirm('');
      fetchTaskDetails(session);
    } catch (error: any) {
      toast.error('Gagal menyimpan pengecekan');
      setSubmitting(false);
    }
  };

  if (loading || !task || !receipt) {
    return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>;
  }

  const role = task.assigned_role;
  const status = receipt.status;

  return (
    <div className="bg-slate-50 min-h-screen pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-3 flex items-center justify-between shadow-sm">
         <button onClick={() => router.push('/warehouse/portal')} className="p-2 -ml-2 text-slate-400 hover:text-slate-900 transition-colors">
            <ChevronLeft size={28} />
         </button>
         <div className="text-center">
            <h2 className="font-black text-lg text-slate-900 tracking-wide">{receipt.receipt_number?.replace(/^RCV-/, '')}</h2>
            <p className="text-sm font-black text-slate-500 uppercase tracking-widest">{status.replace(/_/g, ' ')}</p>
         </div>
         <div className="w-8" />
      </div>

      <div className="p-4 space-y-6">
        {/* Logistics Info (Visible to all) */}
        <Card className="p-5 border-slate-200 shadow-sm bg-white">
           <h3 className="font-black text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-3 mb-3">
             <Truck size={20} className="text-slate-500" /> Info Logistik
           </h3>
           <div className="grid grid-cols-2 gap-4">
              <div>
                 <span className="block text-xs text-slate-400 font-black uppercase tracking-widest">Transporter</span>
                 <span className="text-sm font-bold text-slate-900">{receipt.transporter_name_manual || receipt.transporter?.name || '-'}</span>
              </div>
              <div>
                 <span className="block text-xs text-slate-400 font-black uppercase tracking-widest">Driver</span>
                 <span className="text-sm font-bold text-slate-900">{receipt.driver_name_manual || receipt.driver?.name || '-'}</span>
              </div>
           </div>
        </Card>

        {/* ---------------------------------------------------------------- */}
        {/* ROLE GATING LOGIC */}
        {/* ---------------------------------------------------------------- */}

         {/* ROLE: SECURITY */}
         {role === 'SECURITY' && (
            <div className="space-y-4">
                <div className="bg-rose-50 border border-rose-100 p-5 rounded-xl">
                   <h3 className="text-base font-black text-rose-800 uppercase tracking-widest mb-2">Tugas Anda: Gate Security</h3>
                   <p className="text-sm text-rose-600 font-bold">Harap periksa kecocokan plat nomor dan identitas supir sebelum mengizinkan masuk.</p>
                </div>

               <Card className="p-5 border-slate-200 shadow-sm bg-white">
                  <h3 className="font-black text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-3 mb-3">
                     <Truck size={20} className="text-slate-500" /> Data Kendaraan & Supir
                  </h3>
                  <div className="space-y-4">
                      <div className="relative">
                         <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Transporter / Perusahaan</label>
                         <input
                           type="text"
                           value={transporterName}
                           onChange={(e) => { setTransporterName(e.target.value); setTransporterDropdownOpen(true); setSelectedTransporterId(null); }}
                           onFocus={() => setTransporterDropdownOpen(true)}
                           onBlur={() => setTimeout(() => {
                             setTransporterDropdownOpen(false);
                             const matched = transporters.find((t) => t.transporter_name === transporterName);
                             if (!matched) setSelectedTransporterId(null);
                           }, 200)}
                           className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-rose-500 text-sm font-bold text-slate-900 bg-white"
                           placeholder="Cari atau ketik transporter..."
                           disabled={status !== 'EXPECTED' && status !== 'TRUCK_ARRIVED'}
                         />
                         {transporterDropdownOpen && transporters.length > 0 && (status === 'EXPECTED' || status === 'TRUCK_ARRIVED') && (
                           <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                             {transporters
                               .filter((t) => t.transporter_name.toLowerCase().includes(transporterName.toLowerCase()))
                               .map((t) => (
                                 <div
                                   key={t.id}
                                   onMouseDown={() => { setTransporterName(t.transporter_name); setTransporterDropdownOpen(false); setSelectedTransporterId(t.id); }}
                                   className="px-3 py-3 text-sm cursor-pointer hover:bg-rose-50 flex items-center justify-between"
                                 >
                                   <span className="font-bold text-slate-900">{t.transporter_name}</span>
                                   <span className="text-[10px] text-slate-400 font-mono">{t.transporter_code}</span>
                                 </div>
                               ))}
                             {transporters.filter((t) => t.transporter_name.toLowerCase().includes(transporterName.toLowerCase())).length === 0 && (
                               <div className="p-3 text-xs text-slate-400 text-center italic">
                                 Tidak ada "{transporterName}". Lanjutkan isi manual.
                               </div>
                             )}
                           </div>
                         )}
                      </div>
                     <div>
                        <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Armada / No. Polisi</label>
                        <div className="relative">
                           <div
                             onClick={() => (status === 'EXPECTED' || status === 'TRUCK_ARRIVED') && setFleetSelectOpen(!fleetSelectOpen)}
                             className="w-full h-11 px-3 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer bg-white text-sm font-bold"
                           >
                               <span className={selectedFleetId ? 'text-slate-900' : 'text-slate-400'}>
                                  {fleets.find(f => f.id === selectedFleetId)?.plate_number || (selectedTransporterId ? 'Pilih armada...' : 'Pilih transporter dulu')}
                               </span>
                              <ChevronDown size={16} className={`text-slate-400 transition-transform ${fleetSelectOpen ? 'rotate-180' : ''}`} />
                           </div>
                           {fleetSelectOpen && (
                              <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                 {fleets.length === 0 ? (
                                    <div className="p-3 text-sm text-slate-400 text-center">Tidak ada armada tersedia</div>
                                 ) : fleets.map((f) => (
                                    <div
                                      key={f.id}
                                      onClick={() => { setSelectedFleetId(f.id); setFleetSelectOpen(false); }}
                                      className={`px-3 py-3 text-sm cursor-pointer hover:bg-rose-50 flex items-center justify-between ${selectedFleetId === f.id ? 'bg-rose-50 font-black text-rose-700' : 'text-slate-900'}`}
                                    >
                                       <span className="font-bold">{f.plate_number}</span>
                                       <span className={`text-[10px] font-black uppercase tracking-wider ${f.status === 'available' ? 'text-emerald-500' : 'text-slate-300'}`}>{f.status}</span>
                                    </div>
                                 ))}
                              </div>
                           )}
                        </div>
                     </div>
                      <div className="grid grid-cols-2 gap-3">
                         <div>
                             <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Nama Supir</label>
                             {selectedTransporterId && transporterDrivers.length > 0 ? (
                               <div className="relative">
                                 <div
                                   onClick={() => (status === 'EXPECTED' || status === 'TRUCK_ARRIVED') && setDriverSelectOpen(!driverSelectOpen)}
                                   className="w-full h-11 px-3 border border-slate-200 rounded-xl flex items-center justify-between cursor-pointer bg-white text-sm font-bold"
                                 >
                                    <span className={driverName ? 'text-slate-900' : 'text-slate-400'}>
                                       {driverName || 'Pilih supir...'}
                                    </span>
                                   <ChevronDown size={16} className={`text-slate-400 transition-transform ${driverSelectOpen ? 'rotate-180' : ''}`} />
                                 </div>
                                 {driverSelectOpen && (
                                   <div className="absolute top-full left-0 right-0 mt-1 z-20 bg-white border border-slate-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
                                      {transporterDrivers.map((d: any) => (
                                         <div
                                           key={d.id}
                                           onClick={() => {
                                             setSelectedDriverId(d.id);
                                             setDriverName(d.name);
                                             if (d.phone) setDriverPhone(d.phone);
                                             setDriverSelectOpen(false);
                                           }}
                                           className={`px-3 py-3 text-sm cursor-pointer hover:bg-rose-50 flex flex-col justify-center ${selectedDriverId === d.id ? 'bg-rose-50 font-black text-rose-700' : 'text-slate-900'}`}
                                         >
                                            <span className="font-bold">{d.name}</span>
                                            {d.phone && <span className="text-[10px] text-slate-400 font-mono mt-0.5">{d.phone}</span>}
                                         </div>
                                      ))}
                                   </div>
                                 )}
                               </div>
                            ) : (
                              <input
                                type="text"
                                value={driverName}
                                onChange={(e) => setDriverName(e.target.value)}
                                className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-rose-500 text-sm font-bold text-slate-900 bg-white"
                                placeholder="Nama supir..."
                                disabled={status !== 'EXPECTED' && status !== 'TRUCK_ARRIVED'}
                              />
                            )}
                         </div>
                         <div>
                            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">No. HP Supir</label>
                            <input
                              type="text"
                              value={driverPhone}
                              onChange={(e) => setDriverPhone(e.target.value)}
                              className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none focus:border-rose-500 text-sm font-bold text-slate-900 bg-white"
                              placeholder="08xxx..."
                              disabled={status !== 'EXPECTED' && status !== 'TRUCK_ARRIVED'}
                            />
                         </div>
                      </div>

                     <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                        <div>
                           <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Foto Armada</label>
                           {vehiclePhotoUrl ? (
                              <div className="flex items-center gap-2">
                                 <span className="text-xs font-bold text-emerald-600 truncate flex-1">✓ Foto terupload</span>
                                 <button onClick={() => setVehiclePhotoUrl('')} className="text-xs font-bold text-rose-500 hover:text-rose-700">Hapus</button>
                              </div>
                           ) : (
                              <label className="flex items-center justify-center gap-2 h-11 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-rose-300 transition-colors bg-white">
                                 <Camera size={16} className="text-slate-400" />
                                 <span className="text-xs font-bold text-slate-500">Ambil Foto</span>
                                 <input type="file" accept="image/*" capture="environment" className="hidden"
                                   onChange={async (e) => {
                                     if (!e.target.files || !e.target.files[0]) return;
                                     const file = e.target.files[0];
                                     const ext = file.name.split('.').pop() || 'jpg';
                                     const fileName = `vehicle_${receipt.id}_${Date.now()}.${ext}`;
                                     const { data, error } = await supabase.storage.from('inbound-docs').upload(`documents/${fileName}`, file, { upsert: true });
                                     if (error) { toast.error('Gagal upload foto'); return; }
                                     const { data: publicUrlData } = supabase.storage.from('inbound-docs').getPublicUrl(`documents/${fileName}`);
                                     setVehiclePhotoUrl(publicUrlData.publicUrl);
                                     toast.success('Foto armada terupload');
                                   }}
                                   disabled={status !== 'EXPECTED' && status !== 'TRUCK_ARRIVED'}
                                 />
                              </label>
                           )}
                        </div>
                        <div>
                           <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Dokumen POD</label>
                           {podUrl ? (
                              <div className="flex items-center gap-2">
                                 <a href={podUrl} target="_blank" rel="noreferrer" className="text-xs font-bold text-indigo-600 hover:text-indigo-800 truncate flex-1">Lihat Dokumen</a>
                                 <button onClick={() => setPodUrl('')} className="text-xs font-bold text-rose-500 hover:text-rose-700">Hapus</button>
                              </div>
                           ) : (
                              <label className="flex items-center justify-center gap-2 h-11 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-rose-300 transition-colors bg-white">
                                 <Camera size={16} className="text-slate-400" />
                                 <span className="text-xs font-bold text-slate-500">Ambil Foto POD</span>
                                 <input type="file" accept="image/*" capture="environment" className="hidden"
                                   onChange={async (e) => {
                                     if (!e.target.files || !e.target.files[0]) return;
                                     const file = e.target.files[0];
                                     const ext = file.name.split('.').pop() || 'jpg';
                                     const fileName = `pod_${receipt.id}_${Date.now()}.${ext}`;
                                     const { data, error } = await supabase.storage.from('inbound-docs').upload(`documents/${fileName}`, file, { upsert: true });
                                     if (error) { toast.error('Gagal upload POD'); return; }
                                     const { data: publicUrlData } = supabase.storage.from('inbound-docs').getPublicUrl(`documents/${fileName}`);
                                     setPodUrl(publicUrlData.publicUrl);
                                     toast.success('Dokumen POD terupload');
                                   }}
                                   disabled={status !== 'EXPECTED' && status !== 'TRUCK_ARRIVED'}
                                 />
                              </label>
                           )}
                        </div>
                     </div>
                  </div>
               </Card>

               {status === 'EXPECTED' && (
                  <Button
                    onClick={async () => {
                      // Save form data first
                      await updateReceiptAdmin(receipt.id, {
                        transporter_id: selectedTransporterId || null,
                        transporter_name_manual: transporterName || null,
                        driver_id: selectedDriverId || null,
                        driver_name_manual: driverName || null,
                        driver_phone: driverPhone || null,
                        fleet_id: selectedFleetId || null,
                        vehicle_photo_url: vehiclePhotoUrl || null,
                        pod_document_url: podUrl || null
                      });
                      // Then update status
                      handleUpdateStatus('TRUCK_ARRIVED');
                    }}
                    loading={submitting}
                    className="w-full h-14 !bg-rose-600 hover:!bg-rose-700 text-white rounded-xl shadow-lg shadow-rose-600/30 text-sm font-bold uppercase tracking-wider"
                  >
                    <Truck size={18} /> Konfirmasi Truk Tiba
                  </Button>
               )}

               {status === 'TRUCK_ARRIVED' && (
                  <div className="space-y-3">
                    <Button
                      onClick={async () => {
                        setSubmitting(true);
                        try {
                          await updateReceiptAdmin(receipt.id, {
                            transporter_id: selectedTransporterId || null,
                            transporter_name_manual: transporterName || null,
                            driver_id: selectedDriverId || null,
                            driver_name_manual: driverName || null,
                            driver_phone: driverPhone || null,
                            fleet_id: selectedFleetId || null,
                            vehicle_photo_url: vehiclePhotoUrl || null,
                            pod_document_url: podUrl || null
                          });
                          toast.success('Perubahan data berhasil disimpan');
                        } catch (err) {
                          toast.error('Gagal memperbarui data');
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                      loading={submitting}
                      className="w-full h-14 !bg-emerald-600 hover:!bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/30 text-sm font-bold uppercase tracking-wider"
                    >
                      <CheckCircle2 size={18} /> Simpan Perubahan Data
                    </Button>
                    <div className="p-4 bg-slate-100 text-slate-400 rounded-xl text-center text-xs font-bold uppercase tracking-widest flex flex-col items-center gap-2 border-2 border-dashed border-slate-200">
                       <CheckCircle2 size={20} /> Truk Sudah Dicatat Masuk
                    </div>
                  </div>
               )}

               {status !== 'EXPECTED' && status !== 'TRUCK_ARRIVED' && (
                  <div className="p-6 bg-slate-100 text-slate-400 rounded-xl text-center text-xs font-bold uppercase tracking-widest flex flex-col items-center gap-2 border-2 border-dashed border-slate-200 mt-4">
                     <CheckCircle2 size={24} /> Truk Sudah Masuk & Diproses ke Tahap Selanjutnya
                  </div>
               )}
            </div>
         )}

        {/* ROLE: TALLY */}
        {role === 'TALLY' && (
           <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
                 <h3 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-1">Tugas Anda: Tally Checker</h3>
                 <p className="text-xs text-blue-600 font-medium">Bongkar muat dan hitung fisik barang secara aktual.</p>
              </div>

               {status === 'EXPECTED' && (
                  <div className="p-6 bg-slate-100 text-slate-400 rounded-xl text-center text-xs font-bold flex flex-col items-center gap-2 border-2 border-dashed border-slate-200">
                     <Clock size={24} /> Menunggu Truk Tiba di Gudang
                  </div>
               )}

               {status === 'TRUCK_ARRIVED' && (
                  <div className="p-6 bg-slate-100 text-slate-400 rounded-xl text-center text-xs font-bold flex flex-col items-center gap-2 border-2 border-dashed border-slate-200">
                     <Clock size={24} /> Menunggu Admin Validasi & Ready to Unloading
                  </div>
               )}

               {status === 'UNLOADING' && (
                  <div className="space-y-4">
                     <Card className="p-5 border-blue-200 bg-white shadow-sm">
                        <div className="text-center">
                           <div className="text-5xl font-black font-mono text-slate-900 tabular-nums tracking-wider mb-3">
                              {String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0')}:
                              {String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0')}:
                              {String(elapsedSeconds % 60).padStart(2, '0')}
                           </div>
                           <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                              {timerRunning ? 'SEDANG BERJALAN' : 'TERPAUSE'}
                           </p>
                           <div className="flex gap-3">
                              {!timerRunning ? (
                                 <Button
                                   onClick={handleStartUnloading}
                                   loading={submitting}
                                   className="flex-1 h-14 !bg-blue-600 hover:!bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/30 text-sm font-bold"
                                 >
                                    <Play size={18} /> Mulai
                                 </Button>
                              ) : (
                                 <Button
                                   onClick={() => setShowStopModal(true)}
                                   loading={submitting}
                                   className="flex-1 h-14 !bg-amber-500 hover:!bg-amber-600 text-white rounded-xl shadow-lg shadow-amber-500/30 text-sm font-bold"
                                 >
                                    <Pause size={18} /> Stop
                                 </Button>
                              )}
                              <Button
                                onClick={handleFinishUnloading}
                                loading={submitting}
                                className="flex-1 h-14 !bg-emerald-600 hover:!bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/30 text-sm font-bold"
                              >
                                 <Square size={18} /> Selesai
                              </Button>
                           </div>
                        </div>
                     </Card>

                     {unloadingSessions.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 p-3">
                           <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Log Sesi</h4>
                           <div className="space-y-1.5">
                              {unloadingSessions.map((s, i) => {
                                 const start = new Date(s.start_time);
                                 const end = s.end_time ? new Date(s.end_time) : null;
                                 const dur = end ? Math.round((end.getTime() - start.getTime()) / 60000) : '...';
                                 return (
                                    <div key={s.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-slate-50">
                                       <span className="font-bold text-slate-500">#{s.session_number}</span>
                                       <span className="text-slate-600">{start.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                                       <span className="text-slate-300">→</span>
                                       <span className="text-slate-600">{end ? end.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '...'}</span>
                                       <span className={`font-bold ${s.pause_reason ? 'text-amber-600' : 'text-emerald-600'}`}>
                                          {typeof dur === 'number' ? `${dur}m` : '...'}
                                          {s.pause_reason && ' (pause)'}
                                       </span>
                                    </div>
                                 );
                              })}
                           </div>
                        </div>
                     )}
                  </div>
               )}

                {status === 'CHECKING' && (
                   <div className="space-y-4">
                      <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                         <PackageCheck size={16} className="text-blue-600" /> Form Hitung Fisik
                      </h3>
                      
                      <div className="space-y-4">
                         {items.map(item => {
                           const itemDamages = damageEntries.filter(d => d.receipt_item_id === item.id);
                           const totalDamageQty = itemDamages.reduce((s, d) => s + Number(d.qty || 0), 0);
                           const overageQty = Math.max(0, (Number(item.actual_good_qty) || 0) - Number(item.expected_qty));

                           return (
                             <Card key={item.id} className="p-4 border-slate-200 shadow-sm bg-white">
                               <div className="flex justify-between items-start mb-3 border-b border-slate-100 pb-2">
                                  <div>
                                     <p className="font-bold text-sm text-slate-900">{item.product?.name}</p>
                                     <p className="text-[10px] text-slate-500 font-mono">{item.product?.sku_code}</p>
                                  </div>
                                  <div className="text-right">
                                     <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Expected</p>
                                     <p className="font-bold text-slate-700">{item.expected_qty} <span className="text-xs font-normal">{item.product?.unit}</span></p>
                                  </div>
                               </div>

                               {/* Good Qty */}
                               <div className="mb-4">
                                   <label className="block text-xs font-black text-emerald-600 uppercase tracking-widest mb-1.5">QTY BAGUS DITERIMA</label>
                                  <input
                                    type="number" min="0"
                                    value={item.actual_good_qty ?? ''}
                                    onChange={(e) => handleItemChange(item.id, 'actual_good_qty', e.target.value)}
                                    className="w-full h-12 px-3 border-2 border-emerald-200 bg-emerald-50 text-emerald-800 font-bold text-center text-lg rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                                    placeholder="0"
                                  />
                                  {overageQty > 0 && (
                                    <p className="text-[10px] text-amber-600 font-bold mt-1 text-center">
                                      ⚠ Kelebihan {overageQty} dari expected — akan direview Admin
                                    </p>
                                  )}
                               </div>

                               {/* Damage Entries */}
                               <div className="border-t border-slate-100 pt-3">
                                  <div className="flex items-center justify-between mb-2">
                                     <h4 className="text-xs font-black uppercase tracking-widest text-rose-600">BARANG RUSAK ({totalDamageQty})</h4>
                                     <button onClick={() => addDamageEntry(item.id)} className="text-xs font-bold text-blue-600 hover:text-blue-800 px-2 py-1 rounded hover:bg-blue-50 transition-colors">
                                      + Tambah Baris Rusak
                                    </button>
                                  </div>

                                  {itemDamages.length === 0 && (
                                    <p className="text-xs text-slate-400 italic text-center py-3">Belum ada catatan kerusakan</p>
                                  )}

                                  {itemDamages.map((d, idx) => (
                                    <div key={d.tempId} className="mb-3 p-3 border border-rose-200 rounded-xl bg-rose-50/30 space-y-3">
                                       <div className="flex items-center justify-between">
                                          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-widest">Damage #{idx + 1}</span>
                                          <button onClick={() => removeDamageEntry(d.tempId)} className="text-[10px] font-bold text-rose-400 hover:text-rose-600">Hapus</button>
                                       </div>

                                       {/* Qty */}
                                       <div>
                                         <label className="block text-[9px] font-bold text-rose-600 uppercase tracking-widest mb-1">Jumlah Rusak</label>
                                         <input type="number" min="0" value={d.qty || ''} onChange={(e) => updateDamageEntry(d.tempId, 'qty', e.target.value)} className="w-24 h-9 px-2 border border-rose-200 bg-white rounded-lg text-sm font-bold text-center focus:ring-1 focus:ring-rose-500 outline-none" placeholder="0" />
                                       </div>

                                       {/* Statement 1: WHY DAMAGE? */}
                                       <div className="bg-white rounded-lg p-3 border border-slate-200">
                                         <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">1. WHY DAMAGE? (Kenapa?)</p>
                                         <div className="flex gap-2 mb-2">
                                           {['TRANSPORTER', 'WAREHOUSE_STAFF'].map(src => (
                                             <label key={src} className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${d.damage_source === src ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                               <input type="radio" name={`src_${d.tempId}`} value={src} checked={d.damage_source === src} onChange={(e) => updateDamageEntry(d.tempId, 'damage_source', e.target.value)} className="sr-only" />
                                               {src === 'TRANSPORTER' ? 'Dari Transporter' : 'Kelalaian Staf Gudang'}
                                             </label>
                                           ))}
                                         </div>
                                         <input type="text" value={d.source_notes || ''} onChange={(e) => updateDamageEntry(d.tempId, 'source_notes', e.target.value)} className="w-full h-8 px-2 text-xs border border-slate-200 rounded mb-2 outline-none focus:border-rose-400" placeholder="Catatan kenapa terjadi kerusakan..." />
                                         <div className="flex items-center gap-2">
                                           {d.source_photo_url ? (
                                             <div className="flex items-center gap-2 flex-1">
                                               <img src={d.source_photo_url} alt="why" className="w-10 h-10 rounded object-cover border" />
                                               <span className="text-[9px] text-emerald-600 font-bold">✓ Foto terupload</span>
                                             </div>
                                           ) : (
                                             <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-400 cursor-pointer hover:border-rose-400 hover:text-rose-500 transition-colors">
                                               <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDamagePhoto(d.tempId, 'source_photo_url', f); }} />
                                               📸 Ambil Foto (WAJIB)
                                             </label>
                                           )}
                                         </div>
                                       </div>

                                       {/* Statement 2: WHAT IS DAMAGE? */}
                                       <div className="bg-white rounded-lg p-3 border border-slate-200">
                                         <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">2. WHAT IS DAMAGE? (Apa yang rusak?)</p>
                                         <div className="flex gap-2 mb-2">
                                           {[
                                             { value: 'PACKAGE_DAMAGED_INTACT', label: 'Kemasan Rusak, Isi Utuh' },
                                             { value: 'PACKAGE_DAMAGED_MISSING', label: 'Kemasan Rusak, Isi Kurang' },
                                           ].map(opt => (
                                             <label key={opt.value} className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg border text-xs font-bold cursor-pointer transition-colors ${d.damage_condition === opt.value ? 'border-rose-400 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-500 hover:bg-slate-50'}`}>
                                               <input type="radio" name={`cond_${d.tempId}`} value={opt.value} checked={d.damage_condition === opt.value} onChange={(e) => updateDamageEntry(d.tempId, 'damage_condition', e.target.value)} className="sr-only" />
                                               {opt.label}
                                             </label>
                                           ))}
                                         </div>
                                         <input type="text" value={d.condition_notes || ''} onChange={(e) => updateDamageEntry(d.tempId, 'condition_notes', e.target.value)} className="w-full h-8 px-2 text-xs border border-slate-200 rounded mb-2 outline-none focus:border-rose-400" placeholder="Catatan detail kondisi..." />
                                         <div className="flex items-center gap-2">
                                           {d.condition_photo_url ? (
                                             <div className="flex items-center gap-2 flex-1">
                                               <img src={d.condition_photo_url} alt="what" className="w-10 h-10 rounded object-cover border" />
                                               <span className="text-[9px] text-emerald-600 font-bold">✓ Foto terupload</span>
                                             </div>
                                           ) : (
                                             <label className="flex-1 flex items-center justify-center gap-2 px-3 py-2 border-2 border-dashed border-slate-300 rounded-lg text-xs font-bold text-slate-400 cursor-pointer hover:border-rose-400 hover:text-rose-500 transition-colors">
                                               <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleDamagePhoto(d.tempId, 'condition_photo_url', f); }} />
                                               📸 Ambil Foto (WAJIB)
                                             </label>
                                           )}
                                         </div>
                                       </div>
                                    </div>
                                  ))}
                               </div>
                             </Card>
                           );
                         })}
                      </div>

                      {/* Submit with PIN */}
                      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mt-4">
                        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Konfirmasi PIN untuk Submit</label>
                        <input
                          type="password"
                          maxLength={6}
                          value={pinConfirm}
                          onChange={(e) => setPinConfirm(e.target.value)}
                          className="w-full h-12 px-3 text-center text-lg font-mono tracking-widest border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          placeholder="● ● ● ● ● ●"
                        />
                        <Button
                          onClick={submitChecking}
                          loading={submitting}
                          className="w-full h-14 !bg-emerald-600 hover:!bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/30 text-sm font-bold uppercase tracking-wider mt-3"
                        >
                          {damageEntries.length > 0
                            ? `Submit (${damageEntries.length} catatan kerusakan)`
                            : 'Konfirmasi Semua Barang Bagus'}
                        </Button>
                     </div>
                  </div>
               )}
              
               {['CHECKING_DONE', 'PUTAWAY_IN_PROGRESS', 'COMPLETED'].includes(status) && (
                 <div className="p-6 bg-slate-100 text-slate-400 rounded-xl text-center text-xs font-bold uppercase tracking-widest flex flex-col items-center gap-2 border-2 border-dashed border-slate-200">
                    <CheckCircle2 size={24} /> Tugas Tally Selesai
                 </div>
              )}
           </div>
        )}

         {/* ROLE: ADMIN */}
         {role === 'ADMIN' && (
            <div className="space-y-4">
               <div className="bg-indigo-50 border border-indigo-100 p-5 rounded-xl">
                  <h3 className="text-base font-black text-indigo-800 uppercase tracking-widest mb-2">Tugas Anda: Admin Gudang</h3>
                  <p className="text-sm text-indigo-600 font-bold">Validasi dan kendalikan alur penerimaan barang.</p>
               </div>

              {status === 'EXPECTED' && (
                 <Button
                   onClick={() => handleUpdateStatus('TRUCK_ARRIVED')}
                   loading={submitting}
                   className="w-full h-14 !bg-blue-600 hover:!bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/30 text-sm font-bold uppercase tracking-wider"
                 >
                   <Truck size={18} /> Konfirmasi Truk Tiba
                 </Button>
              )}

              {status === 'TRUCK_ARRIVED' && (
                 <Button
                   onClick={() => handleUpdateStatus('UNLOADING')}
                   loading={submitting}
                   className="w-full h-14 !bg-amber-600 hover:!bg-amber-700 text-white rounded-xl shadow-lg shadow-amber-600/30 text-sm font-bold uppercase tracking-wider"
                 >
                   <PackageCheck size={18} /> Ready to Unloading
                 </Button>
              )}

              {status === 'UNLOADING' && (
                 <Button
                   onClick={() => handleUpdateStatus('CHECKING')}
                   loading={submitting}
                   className="w-full h-14 !bg-blue-600 hover:!bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-600/30 text-sm font-bold uppercase tracking-wider"
                 >
                   <CheckCircle2 size={18} /> Selesai Bongkar (Lanjut Cek)
                 </Button>
              )}

              {status === 'CHECKING' && (
                 <div className="p-6 bg-indigo-50 text-indigo-400 rounded-xl text-center text-sm font-bold flex flex-col items-center gap-2 border-2 border-dashed border-indigo-200">
                    <CheckCircle2 size={24} /> Proses Tally Sedang Berjalan
                 </div>
              )}

              {status === 'CHECKING_DONE' && (
                 <Button
                   onClick={() => handleUpdateStatus('PUTAWAY_IN_PROGRESS')}
                   loading={submitting}
                   className="w-full h-14 !bg-emerald-600 hover:!bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/30 text-sm font-bold uppercase tracking-wider"
                 >
                   <CheckCircle2 size={18} /> Validasi Tally (Mulai Putaway)
                 </Button>
              )}

              {status === 'PUTAWAY_IN_PROGRESS' && (
                 <div className="p-6 bg-emerald-50 text-emerald-500 rounded-xl text-center text-sm font-bold flex flex-col items-center gap-2 border-2 border-dashed border-emerald-200">
                    <Warehouse size={24} /> Barang Sedang Disusun di Rak
                 </div>
              )}

              {status === 'COMPLETED' && (
                 <div className="p-6 bg-slate-100 text-slate-400 rounded-xl text-center text-sm font-bold flex flex-col items-center gap-2 border-2 border-dashed border-slate-200">
                    <CheckCircle2 size={24} /> Proses Selesai
                 </div>
              )}
            </div>
         )}

         {/* ROLE: PUTAWAY */}
         {role === 'PUTAWAY' && (
            <div className="space-y-4">
               <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl">
                  <h3 className="text-xs font-black text-emerald-800 uppercase tracking-widest mb-1">Tugas Anda: Putaway Operator</h3>
                  <p className="text-xs text-emerald-600 font-medium">Pindahkan barang dari Loading Dock ke dalam Rak penyimpanan.</p>
               </div>

               {['EXPECTED', 'TRUCK_ARRIVED', 'UNLOADING', 'CHECKING'].includes(status) && (
                  <div className="p-6 bg-slate-100 text-slate-400 rounded-xl text-center text-xs font-bold flex flex-col items-center gap-2 border-2 border-dashed border-slate-200">
                     <Clock size={24} /> Menunggu Proses Tally Selesai
                  </div>
               )}

               {status === 'CHECKING_DONE' && (
                  <div className="p-6 bg-emerald-50 text-emerald-600 rounded-xl text-center text-xs font-bold flex flex-col items-center gap-2 border-2 border-dashed border-emerald-200">
                     <PackageCheck size={24} /> Barang Siap di-Putaway, Menunggu Admin Start
                  </div>
               )}

               {status === 'PUTAWAY_IN_PROGRESS' && (
                  <div className="space-y-4">
                     {/* Good Stock section */}
                     {items.filter(i => Number(i.actual_good_qty) > 0).length > 0 && (
                        <>
                           <h4 className="text-xs font-black text-emerald-700 uppercase tracking-widest flex items-center gap-2">
                              <PackageCheck size={14} /> Barang Bagus — Disimpan di Rak Penyimpanan
                           </h4>
                           <div className="space-y-3">
                              {items.filter(i => Number(i.actual_good_qty) > 0).map(item => {
                                 const assignment = joAssignments.find(a => a.wo_item_manifests?.product_sku_id === item.product_sku_id);
                                 const locCode = assignment?.location?.code || item.location?.code;
                                 return (
                                 <Card key={item.id} className="p-4 border-emerald-200 shadow-sm bg-white">
                                    <div className="flex justify-between items-center mb-4">
                                       <div>
                                          <p className="font-bold text-sm text-slate-900">{item.product?.name}</p>
                                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{item.product?.sku_code}</p>
                                       </div>
                                       <div className="text-right">
                                          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Qty Bagus</p>
                                          <p className="font-bold text-xl text-emerald-700">{item.actual_good_qty}</p>
                                       </div>
                                    </div>

                                     <div className="bg-blue-50 border-2 border-blue-100 rounded-xl p-3 mb-4 flex items-center justify-between">
                                        <div>
                                           <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-0.5">Alokasi Lokasi</p>
                                           {locCode ? (
                                             <p className="text-2xl font-black font-mono text-blue-800 tracking-wider">{locCode}</p>
                                           ) : (
                                             <p className="text-sm font-bold text-blue-600/70 italic">Belum di-assign dari JO</p>
                                           )}
                                        </div>
                                        <div className="text-right opacity-50">
                                           <PackageCheck size={28} className="text-blue-600" />
                                        </div>
                                     </div>

                                     {/* [AI] Expiry Date Section - selalu tampil dengan info aging/remaining */}
                                     <div className="mb-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                                        <div className="flex items-center justify-between mb-2">
                                           <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
                                              Exp Date
                                           </label>
                                           {/* Info badge berdasarkan storage_rule */}
                                           {item.product?.storage_rule === 'FEFO' && item.expiry_date && (
                                             <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-700">
                                               Sisa {Math.max(0, Math.ceil((new Date(item.expiry_date).getTime() - Date.now()) / 86400000))} hari
                                             </span>
                                           )}
                                           {item.product?.storage_rule === 'FIFO' && (
                                             <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-100 text-blue-700">
                                               Aging {Math.max(0, Math.ceil((Date.now() - new Date(item.received_date || Date.now()).getTime()) / 86400000))} hari
                                             </span>
                                           )}
                                           {item.product?.storage_rule === 'FEFO' && !item.expiry_date && (
                                             <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-red-100 text-red-700">
                                               ⚠️ Wajib diisi untuk FEFO
                                             </span>
                                           )}
                                        </div>
                                        <input 
                                           type="date"
                                           value={item.expiry_date || ''}
                                           onChange={(e) => {
                                              const updatedItems = items.map(i => 
                                                i.id === item.id ? {...i, expiry_date: e.target.value} : i
                                              );
                                              setItems(updatedItems);
                                           }}
                                           className="w-full h-10 px-3 border-2 border-slate-200 rounded-xl outline-none focus:border-blue-500 text-sm font-bold"
                                        />
                                     </div>

                                    <div className="space-y-3">
                                       {(putawayEntries[item.id] || []).map((entry, idx) => (
                                          <div key={entry.id} className="flex gap-2 items-end">
                                             <div className="flex-1">
                                                {idx === 0 && <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">Rak (Scan Barcode)</label>}
                                                <div className="flex gap-2">
                                                   <input 
                                                     type="text" 
                                                     value={entry.locationCode}
                                                     onChange={(e) => {
                                                        const newEntries = [...putawayEntries[item.id]];
                                                        newEntries[idx].locationCode = e.target.value;
                                                        setPutawayEntries({ ...putawayEntries, [item.id]: newEntries });
                                                     }}
                                                     className="flex-1 w-full h-12 px-3 border-2 border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-lg font-bold font-mono placeholder:text-slate-300 placeholder:font-normal placeholder:text-sm"
                                                     placeholder="Ketik/scan rak..." 
                                                   />
                                                   <button 
                                                     onClick={() => setActiveScanItem({ itemId: item.id, entryId: entry.id, type: 'GOOD' })}
                                                     className="h-12 w-12 shrink-0 flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl border-2 border-slate-200 transition-colors"
                                                   >
                                                     <Scan size={20} />
                                                   </button>
                                                </div>
                                             </div>
                                             <div className="w-20 shrink-0">
                                                {idx === 0 && <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 text-center">Qty</label>}
                                                <input 
                                                  type="number"
                                                  value={entry.qty}
                                                  onChange={(e) => {
                                                     const newEntries = [...putawayEntries[item.id]];
                                                     newEntries[idx].qty = e.target.value;
                                                     setPutawayEntries({ ...putawayEntries, [item.id]: newEntries });
                                                  }}
                                                  className="w-full h-12 px-2 border-2 border-slate-200 rounded-xl outline-none focus:border-emerald-500 text-lg font-bold text-center bg-slate-50"
                                                />
                                             </div>
                                             {(putawayEntries[item.id] || []).length > 1 && (
                                                <button 
                                                  onClick={() => {
                                                     const newEntries = putawayEntries[item.id].filter((_, i) => i !== idx);
                                                     setPutawayEntries({ ...putawayEntries, [item.id]: newEntries });
                                                  }}
                                                  className="h-12 w-12 shrink-0 flex items-center justify-center text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
                                                >
                                                   <Trash2 size={20} />
                                                </button>
                                             )}
                                          </div>
                                       ))}
                                    </div>
                                    <button 
                                       onClick={() => {
                                          const newEntries = [...(putawayEntries[item.id] || []), { id: Math.random().toString(36).substr(2, 9), locationCode: '', qty: '' }];
                                          setPutawayEntries({ ...putawayEntries, [item.id]: newEntries });
                                       }}
                                       className="mt-3 flex items-center justify-center gap-2 w-full py-2 border-2 border-dashed border-slate-300 text-slate-500 rounded-xl font-bold text-sm hover:bg-slate-50 transition-colors"
                                    >
                                       <Plus size={16} /> Pecah Lokasi
                                    </button>
                                 </Card>
                                 );
                              })}
                           </div>
                        </>
                     )}

                     {/* Quarantine section */}
                     {quarantineRecords.length > 0 && (
                        <>
                           <h4 className="text-xs font-black text-amber-700 uppercase tracking-widest flex items-center gap-2 mt-4">
                              <AlertTriangle size={14} /> Barang Rusak (Disetujui Quarantine) — Simpan di Zona Quarantine
                           </h4>
                           <div className="space-y-3">
                              {quarantineRecords.map(rec => {
                                 const item = items.find(i => i.id === rec.receipt_item_id);
                                 return (
                                    <Card key={rec.id} className="p-4 border-amber-200 shadow-sm bg-amber-50/30">
                                       <div className="flex justify-between items-center">
                                          <div>
                                             <p className="font-bold text-sm text-slate-900">{item?.product?.name || 'Unknown'}</p>
                                             <p className="text-[10px] text-slate-500 font-mono mt-0.5">{item?.product?.sku_code}</p>
                                          </div>
                                          <div className="text-right">
                                             <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Qty Quarantine</p>
                                             <p className="font-bold text-xl text-amber-700">{rec.qty}</p>
                                          </div>
                                       </div>
                                       <div className="mt-3 grid grid-cols-2 gap-2 text-[10px]">
                                          <div className="p-2 bg-white rounded-lg border border-slate-100">
                                             <span className="font-bold text-slate-400 uppercase tracking-wider text-[8px]">WHY?</span>
                                             <p className="font-semibold text-slate-700">{rec.damage_source}</p>
                                             {rec.source_notes && <p className="text-slate-500">{rec.source_notes}</p>}
                                          </div>
                                          <div className="p-2 bg-white rounded-lg border border-slate-100">
                                             <span className="font-bold text-slate-400 uppercase tracking-wider text-[8px]">WHAT?</span>
                                             <p className="font-semibold text-slate-700">{rec.damage_condition}</p>
                                             {rec.condition_notes && <p className="text-slate-500">{rec.condition_notes}</p>}
                                          </div>
                                       </div>
                                       <div className="mt-4">
                                          <div className="bg-amber-100 border-2 border-amber-200 rounded-xl p-3 mb-4 flex items-center justify-between">
                                             <div>
                                                <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-0.5">Alokasi Zona</p>
                                                {rec.location?.code ? (
                                                  <p className="text-2xl font-black font-mono text-amber-900 tracking-wider">{rec.location.code}</p>
                                                ) : (
                                                  <p className="text-sm font-bold text-amber-700/70 italic">Belum di-assign</p>
                                                )}
                                             </div>
                                             <div className="text-right opacity-50">
                                                <AlertTriangle size={28} className="text-amber-700" />
                                             </div>
                                          </div>
                                          <div className="space-y-3">
                                             {(quarantineEntries[rec.id] || []).map((entry, idx) => (
                                                <div key={entry.id} className="flex gap-2 items-end">
                                                   <div className="flex-1">
                                                      {idx === 0 && <label className="block text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1.5">Rak Karantina</label>}
                                                      <div className="flex gap-2">
                                                         <input 
                                                           type="text" 
                                                           value={entry.locationCode}
                                                           onChange={(e) => {
                                                              const newEntries = [...quarantineEntries[rec.id]];
                                                              newEntries[idx].locationCode = e.target.value;
                                                              setQuarantineEntries({ ...quarantineEntries, [rec.id]: newEntries });
                                                           }}
                                                           className="flex-1 w-full h-12 px-3 border-2 border-amber-200 bg-white rounded-xl outline-none focus:border-amber-500 text-lg font-bold font-mono placeholder:text-slate-300 placeholder:font-normal placeholder:text-sm"
                                                           placeholder="Ketik/scan rak..." 
                                                         />
                                                         <button 
                                                           onClick={() => setActiveScanItem({ itemId: rec.id, entryId: entry.id, type: 'QUARANTINE' })}
                                                           className="h-12 w-12 shrink-0 flex items-center justify-center bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl border-2 border-amber-200 transition-colors"
                                                         >
                                                           <Scan size={20} />
                                                         </button>
                                                      </div>
                                                   </div>
                                                   <div className="w-20 shrink-0">
                                                      {idx === 0 && <label className="block text-[10px] font-black text-amber-700 uppercase tracking-widest mb-1.5 text-center">Qty</label>}
                                                      <input 
                                                        type="number"
                                                        value={entry.qty}
                                                        onChange={(e) => {
                                                           const newEntries = [...quarantineEntries[rec.id]];
                                                           newEntries[idx].qty = e.target.value;
                                                           setQuarantineEntries({ ...quarantineEntries, [rec.id]: newEntries });
                                                        }}
                                                        className="w-full h-12 px-2 border-2 border-amber-200 rounded-xl outline-none focus:border-amber-500 text-lg font-bold text-center bg-white"
                                                      />
                                                   </div>
                                                   {(quarantineEntries[rec.id] || []).length > 1 && (
                                                      <button 
                                                        onClick={() => {
                                                           const newEntries = quarantineEntries[rec.id].filter((_, i) => i !== idx);
                                                           setQuarantineEntries({ ...quarantineEntries, [rec.id]: newEntries });
                                                        }}
                                                        className="h-12 w-12 shrink-0 flex items-center justify-center text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors"
                                                      >
                                                         <Trash2 size={20} />
                                                      </button>
                                                   )}
                                                </div>
                                             ))}
                                          </div>
                                          <button 
                                             onClick={() => {
                                                const newEntries = [...(quarantineEntries[rec.id] || []), { id: Math.random().toString(36).substr(2, 9), locationCode: '', qty: '' }];
                                                setQuarantineEntries({ ...quarantineEntries, [rec.id]: newEntries });
                                             }}
                                             className="mt-3 flex items-center justify-center gap-2 w-full py-2 border-2 border-dashed border-amber-300 text-amber-600 rounded-xl font-bold text-sm hover:bg-amber-50 transition-colors"
                                          >
                                             <Plus size={16} /> Pecah Lokasi
                                          </button>
                                       </div>
                                    </Card>
                                 );
                              })}
                           </div>
                        </>
                     )}

                     <Button 
                       onClick={handleFinishPutaway}
                       loading={submitting}
                       className="w-full h-14 !bg-emerald-600 hover:!bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/30 text-sm font-bold uppercase tracking-wider mt-6"
                     >
                       Konfirmasi Putaway Selesai
                     </Button>
                  </div>
               )}
               {status === 'COMPLETED' && (
                  <div className="p-6 bg-slate-100 text-slate-400 rounded-xl text-center text-xs font-bold uppercase tracking-widest flex flex-col items-center gap-2 border-2 border-dashed border-slate-200">
                     <CheckCircle2 size={24} /> Semua Barang Sudah Disimpan
                  </div>
               )}
            </div>
         )}
      </div>

      {/* STOP Modal */}
      {showStopModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <h3 className="font-black text-sm text-slate-900">Alasan Berhenti (Stop)</h3>
            <p className="text-xs text-slate-500">Timer sedang berjalan. Mengapa ingin berhenti?</p>
            <div className="space-y-2">
              {['Istirahat Shift', 'Mesin Forklift Rusak', 'Menunggu Dokumen', 'Lainnya'].map(opt => (
                <label key={opt} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                  <input type="radio" name="stopReason" value={opt} checked={stopReason === opt} onChange={(e) => setStopReason(e.target.value)} className="accent-blue-600" />
                  <span className="text-sm font-medium text-slate-900">{opt}</span>
                </label>
              ))}
              {stopReason === 'Lainnya' && (
                <input type="text" value={stopReason} onChange={(e) => setStopReason(e.target.value)} placeholder="Jelaskan alasan..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500" autoFocus />
              )}
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setShowStopModal(false); setStopReason(''); }} className="flex-1 py-3 text-sm font-bold text-slate-500 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">Batal</button>
              <button onClick={handleStopUnloading} disabled={submitting || !stopReason.trim()} className={`flex-1 py-3 text-sm font-bold text-white rounded-xl transition-colors ${stopReason.trim() ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-300 cursor-not-allowed'}`}>
                {submitting ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Stop Timer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Scanner Modal */}
      {activeScanItem && (
        <BarcodeScanner
          onClose={() => setActiveScanItem(null)}
          onScanSuccess={(decodedText) => {
            if (activeScanItem.type === 'GOOD') {
              const newEntries = [...(putawayEntries[activeScanItem.itemId] || [])];
              const idx = newEntries.findIndex(e => e.id === activeScanItem.entryId);
              if (idx !== -1) {
                newEntries[idx].locationCode = decodedText;
                setPutawayEntries({ ...putawayEntries, [activeScanItem.itemId]: newEntries });
              }
            } else {
              const newEntries = [...(quarantineEntries[activeScanItem.itemId] || [])];
              const idx = newEntries.findIndex(e => e.id === activeScanItem.entryId);
              if (idx !== -1) {
                newEntries[idx].locationCode = decodedText;
                setQuarantineEntries({ ...quarantineEntries, [activeScanItem.itemId]: newEntries });
              }
            }
            toast.success(`Barcode Rak terscan: ${decodedText}`);
          }}
        />
      )}
    </div>
  );
}
