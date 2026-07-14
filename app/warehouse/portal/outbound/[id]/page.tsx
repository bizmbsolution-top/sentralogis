'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Loader2, Truck, PackageCheck, AlertTriangle, CheckCircle2, ChevronDown, Clock, Play, Pause, Square, FileUp, ScanLine, Camera, Trash2, ArrowLeftRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import BarcodeScanner from '@/components/scanner/BarcodeScanner';

export default function OutboundTaskExecutionPage() {
  const router = useRouter();
  const params = useParams();
  const shipmentId = params.id as string;
  
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [shipment, setShipment] = useState<any>(null);
  const [assignments, setAssignments] = useState<any[]>([]);

  // Picker state
  const [pickingEntries, setPickingEntries] = useState<any[]>([]);
  const [scanLocation, setScanLocation] = useState('');
  const [scanSkuId, setScanSkuId] = useState('');
  const [scanQty, setScanQty] = useState('');
  const [showScanner, setShowScanner] = useState<'LOCATION' | 'SKU' | null>(null);

  // Tally state
  const [pinConfirm, setPinConfirm] = useState('');
  const [showPinModal, setShowPinModal] = useState(false);
  
  // Checking State
  const [checkingItems, setCheckingItems] = useState<any[]>([]);
  const [damageEntries, setDamageEntries] = useState<any[]>([]);
  
  // Replacement Picking State
  const [showReplacementModal, setShowReplacementModal] = useState<any>(null);
  const [replacementLocation, setReplacementLocation] = useState('');
  
  // Security state
  const [transporterName, setTransporterName] = useState('');
  const [driverName, setDriverName] = useState('');
  const [transporters, setTransporters] = useState<any[]>([]);
  const [fleets, setFleets] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [selectedTransporterId, setSelectedTransporterId] = useState<string | null>(null);
  const [selectedFleetId, setSelectedFleetId] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [transporterDropdownOpen, setTransporterDropdownOpen] = useState(false);
  
  // Loading sessions
  const [loadingSessions, setLoadingSessions] = useState<any[]>([]);
  const [timerRunning, setTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [showStopModal, setShowStopModal] = useState(false);
  const [stopReason, setStopReason] = useState('');
  const [customStopReason, setCustomStopReason] = useState('');

  // Docs
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [truckArrivalDoc, setTruckArrivalDoc] = useState<File | null>(null);

  useEffect(() => {
    const storedSession = localStorage.getItem('sentralogis_wh_session');
    if (storedSession) {
      const parsed = JSON.parse(storedSession);
      setSession(parsed);
      fetchShipmentDetails(parsed);
    }
  }, [shipmentId]);

  const fetchShipmentDetails = async (sess: any) => {
    setLoading(true);
    try {
      const { data: shipmentData, error: shipErr } = await supabase
        .from('wh_outbound_shipments')
        .select(`
          id, tenant_id, warehouse_id, shipment_number, status, notes,
          driver_id, fleet_id, transporter_id,
          driver:md_drivers(name, phone),
          transporter:transporter_id(name),
          fleet:md_fleets(plate_number),
          surat_jalan_url, bast_url,
          wo_item_id, transfer_id,
          wo_item:wo_items(
            id,
            job_orders(id, jo_number)
          ),
          items:wh_outbound_shipment_items(
            id, product_sku_id, requested_qty, picked_qty, picking_entries, md_product_skus(name, sku_code)
          )
        `)
        .eq('id', shipmentId)
        .single();
        
      if (shipErr || !shipmentData) {
        console.error('Fetch Shipment Error:', shipErr);
        throw new Error(shipErr?.message || 'Shipment not found');
      }
      setShipment(shipmentData);

      // Fetch transfer order context if this is a transfer
      if (shipmentData.transfer_id) {
        const { data: trData } = await supabase
          .from('wh_transfer_orders')
          .select('id, transfer_number, from_warehouse:from_warehouse_id(name), to_warehouse:to_warehouse_id(name)')
          .eq('id', shipmentData.transfer_id)
          .single();
        if (trData) setShipment((prev: any) => ({ ...prev, transfer_order: trData }));
      }

      const role = sess?.role;

      if ((role === 'PUTAWAY' || role === 'PICKER') && shipmentData.wo_item?.job_orders?.[0]?.id) {
        const { data: assignData } = await supabase
          .from('jo_warehouse_assignments')
          .select(`
             id, quantity,
             warehouse_location_id,
             location:md_warehouse_locations(code),
             manifest:wo_item_manifests(
               id, md_product_skus(id, name, sku_code)
             )
          `)
          .eq('job_order_id', shipmentData.wo_item.job_orders[0].id);
        
        const arr = assignData || [];
        setAssignments(arr);

        // Init picking entries from saved DB if available
        if (['PLANNED', 'PENDING', 'ASSIGNED', 'PICKING'].includes(shipmentData.status)) {
           let loadedPicks: any[] = [];
           const dbItems = shipmentData.items || [];
           dbItems.forEach((itm: any) => {
             const pe = itm.picking_entries || [];
             pe.forEach((p: any) => {
                loadedPicks.push({ ...p, sku_id: itm.product_sku_id, sku_name: itm.md_product_skus?.name });
             });
           });
           setPickingEntries(loadedPicks);
        }
      }

      if ((role === 'SECURITY' || role === 'ADMIN') && shipmentData.tenant_id) {
        const { data: vendorData } = await supabase.from('md_entities')
          .select('id, name').eq('tenant_id', shipmentData.tenant_id).eq('is_vendor', true).eq('is_active', true);
        const { data: internalData } = await supabase.from('md_entities')
          .select('id, name').eq('tenant_id', shipmentData.tenant_id).eq('is_vendor', false).eq('is_active', true).limit(1);
        
        setTransporters([...(internalData || []), ...(vendorData || [])]);
        setTransporterName(shipmentData.transporter?.name || '');
        setSelectedTransporterId(shipmentData.transporter_id || null);
        setDriverName(shipmentData.driver?.name || '');
        setSelectedDriverId(shipmentData.driver_id || '');
        setSelectedFleetId(shipmentData.fleet_id || '');
      }

      if (role === 'TALLY') {
        fetchLoadingSessions(shipmentId);
        
        if (['READY_FOR_CHECKING', 'CHECKING'].includes(shipmentData.status)) {
           const initChecking = (shipmentData.items || []).map((itm: any) => ({
             ...itm,
             checked_qty: itm.checked_qty > 0 ? itm.checked_qty : itm.picked_qty
           }));
           setCheckingItems(initChecking);
        }
      }

    } catch (err: any) {
      console.error(err);
      toast.error('Gagal memuat shipment: ' + err.message);
      router.push('/warehouse/portal');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!shipment?.tenant_id || !selectedTransporterId) {
      setFleets([]); setDrivers([]); return;
    }
    Promise.all([
      supabase.from('md_fleets').select('id, plate_number').eq('entity_id', selectedTransporterId).eq('is_active', true),
      supabase.from('md_drivers').select('id, name').eq('entity_id', selectedTransporterId).eq('is_active', true),
    ]).then(([fRes, dRes]) => {
      setFleets(fRes.data || []); setDrivers(dRes.data || []);
    });
  }, [selectedTransporterId, shipment?.tenant_id]);

  const fetchLoadingSessions = async (id: string) => {
    const { data } = await supabase.from('wh_loading_sessions').select('*').eq('shipment_id', id).order('session_number', { ascending: true });
    setLoadingSessions(data || []);
    
    // Hitung total detik dari sesi-sesi sebelumnya yang sudah selesai
    const pastSessionsSeconds = (data || []).reduce((acc: number, s: any) => {
      if (s.end_time) {
        return acc + Math.floor((new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 1000);
      }
      return acc;
    }, 0);

    const active = (data || []).find((s: any) => !s.end_time);
    if (active) {
      const activeMs = Date.now() - new Date(active.start_time).getTime();
      setElapsedSeconds(pastSessionsSeconds + Math.floor(activeMs / 1000));
      setTimerRunning(true);
    } else {
      setElapsedSeconds(pastSessionsSeconds);
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

  const handleUpdateStatus = async (newStatus: string) => {
    setSubmitting(true);
    try {
      const { error } = await supabase.from('wh_outbound_shipments').update({ status: newStatus }).eq('id', shipmentId);
      if (error) throw error;

      if (newStatus === 'COMPLETED') {
        let transferDetailsPayloads: any[] = [];
        // Stock Deduction Logic uses picking_entries saved by the Picker
        const { data: finalItems } = await supabase.from('wh_outbound_shipment_items').select('id, product_sku_id, picking_entries').eq('shipment_id', shipmentId);
        
        if (finalItems && finalItems.length > 0) {
           // Find quarantine location
           const { data: qLoc } = await supabase.from('md_warehouse_locations').select('id').eq('warehouse_id', shipment.warehouse_id).eq('location_type', 'QUARANTINE').limit(1).maybeSingle();
           const quarantineLocationId = qLoc?.id || null;

           // Fetch damages
           const { data: damages } = await supabase.from('wh_outbound_damage_records').select('shipment_item_id, damage_qty').eq('shipment_id', shipmentId);

           for (const itm of finalItems) {
              const skuId = itm.product_sku_id;
              
              // 1. Deduct picked items from source racks
              const entries = itm.picking_entries || [];
              for (const pe of entries) {
                 if (skuId && pe.location_id) {
                    const { data: invData } = await supabase.from('wh_inventory')
                       .select('id, quantity, reserved_quantity').eq('product_sku_id', skuId).eq('location_id', pe.location_id).eq('status', 'AVAILABLE').maybeSingle();
                    if (invData) {
                       const nQ = Math.max(0, invData.quantity - pe.qty);
                       const nR = Math.max(0, invData.reserved_quantity - pe.qty);
                       await supabase.from('wh_inventory').update({ quantity: nQ, reserved_quantity: nR }).eq('id', invData.id);
                        
                       if (shipment?.transfer_id) {
                          transferDetailsPayloads.push({
                             tenant_id: shipment.tenant_id,
                             transfer_id: shipment.transfer_id,
                             inventory_id: invData.id,
                             product_sku_id: skuId,
                             quantity: pe.qty,
                             from_location_id: pe.location_id,
                             status: 'SHIPPED'
                          });
                       }
                    }
                 }
              }

              // 2. Move damaged items to Quarantine zone
              const itemDamages = damages?.filter((d: any) => d.shipment_item_id === itm.id) || [];
              const totalDamagedQty = itemDamages.reduce((acc: number, d: any) => acc + Number(d.damage_qty), 0);
              
              if (totalDamagedQty > 0 && skuId) {
                 let qQuery = supabase.from('wh_inventory').select('id, quantity').eq('product_sku_id', skuId).eq('status', 'QUARANTINE');
                 if (quarantineLocationId) qQuery = qQuery.eq('location_id', quarantineLocationId);
                 else qQuery = qQuery.is('location_id', null);
                 const { data: qInv } = await qQuery.limit(1).maybeSingle();

                 let qInvId;
                 if (qInv) {
                    await supabase.from('wh_inventory').update({ quantity: qInv.quantity + totalDamagedQty }).eq('id', qInv.id);
                    qInvId = qInv.id;
                 } else {
                    const { data: nInv } = await supabase.from('wh_inventory').insert({
                       tenant_id: shipment.tenant_id,
                       warehouse_id: shipment.warehouse_id,
                       product_sku_id: skuId,
                       location_id: quarantineLocationId,
                       quantity: totalDamagedQty,
                       reserved_quantity: 0,
                       available_quantity: totalDamagedQty,
                       status: 'QUARANTINE',
                       created_by: session?.user?.id || null
                    }).select('id').single();
                    qInvId = nInv?.id;
                 }

                 if (qInvId) {
                    await supabase.from('wh_inventory_movements').insert({
                       tenant_id: shipment.tenant_id,
                       inventory_id: qInvId,
                       movement_type: 'QUARANTINE_TRANSFER',
                       quantity: totalDamagedQty,
                       reference_type: 'OUTBOUND_SHIPMENT',
                       reference_id: shipment.id,
                       to_location_id: quarantineLocationId,
                       notes: 'Pindah ke quarantine akibat damage saat outbound checking',
                       created_by: session?.user?.id || null
                    });
                 }
              }
           }
        }

        if (shipment?.transfer_id) {
           if (transferDetailsPayloads.length > 0) {
              await supabase.from('wh_transfer_details').insert(transferDetailsPayloads);
           }
           await supabase.from('wh_transfer_orders').update({ status: 'SHIPPED' }).eq('id', shipment.transfer_id);
        }

        if (shipment?.wo_item?.job_orders?.length > 0) {
          const joId = shipment.wo_item.job_orders[0].id;
          await supabase.from('job_orders').update({ status: 'completed' }).eq('id', joId);
        }
        router.push('/warehouse/portal');
        return;
      }

      toast.success(`Status: ${newStatus}`);
      fetchShipmentDetails(session);
    } catch (err: any) {
      toast.error(err.message || 'Gagal mengubah status');
    } finally {
      setSubmitting(false);
      setShowPinModal(false);
      setPinConfirm('');
    }
  };

  // ==========================
  // PICKING LOGIC
  // ==========================
  const getAvailableSkus = () => {
    let filtered = assignments;
    if (scanLocation.trim()) {
      filtered = assignments.filter(a => a.location?.code?.toUpperCase() === scanLocation.toUpperCase());
    }
    const skus = new Map();
    filtered.forEach(a => {
      const s = a.manifest?.md_product_skus;
      if (s) skus.set(s.id, s);
    });
    return Array.from(skus.values());
  };

  const handleScanQtyChange = (e: any) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) {
      setScanQty(''); return;
    }
    setScanQty(new Intl.NumberFormat('en-US').format(Number(raw)));
  };

  const handleAddPick = () => {
    if (!scanLocation.trim() || !scanSkuId || !scanQty) {
      toast.error('Lengkapi Lokasi, Produk, dan Qty!'); return;
    }
    const qtyNum = parseInt(scanQty.replace(/,/g, ''), 10);
    if (isNaN(qtyNum) || qtyNum <= 0) { toast.error('Qty tidak valid!'); return; }

    const matchingAssignments = assignments.filter(a => 
      a.location?.code?.toUpperCase() === scanLocation.toUpperCase() && 
      a.manifest?.md_product_skus?.id === scanSkuId
    );

    if (matchingAssignments.length === 0) {
       toast.error('Lokasi atau Produk tidak sesuai dengan rencana JO! Cek kembali.', { duration: 4000 });
       return;
    }

    const targetQty = matchingAssignments.reduce((sum, a) => sum + a.quantity, 0);
    const currentPicked = pickingEntries.filter(p => p.sku_id === scanSkuId && p.location_code === scanLocation.toUpperCase()).reduce((s,p) => s + Number(p.qty), 0);
    
    if (currentPicked + qtyNum > targetQty) {
       toast.error(`Kelebihan Qty! Target dari rak ini: ${targetQty}. Sudah di-pick: ${currentPicked}.`, { duration: 4000 });
       return;
    }

    const skuObj = getAvailableSkus().find(s => s.id === scanSkuId);

    setPickingEntries([...pickingEntries, {
      id: Date.now().toString(),
      location_code: scanLocation.toUpperCase(),
      sku_id: scanSkuId,
      sku_name: skuObj?.name || 'Unknown Produk',
      qty: qtyNum
    }]);

    toast.success('Baris ditambahkan');
    setScanSkuId('');
    setScanQty('');
  };

  const removePickEntry = (id: string) => {
    setPickingEntries(pickingEntries.filter(p => p.id !== id));
  };

  const submitPicking = async () => {
    if (pickingEntries.length === 0) {
      toast.error('Belum ada data aktual picking yang diinput!'); return;
    }

    // Validate if total picked matches total assignments (JO)
    const skuTargets: Record<string, number> = {};
    assignments.forEach(a => {
       const sId = a.manifest?.md_product_skus?.id;
       if (sId) skuTargets[sId] = (skuTargets[sId] || 0) + a.quantity;
    });
    
    const skuActuals: Record<string, number> = {};
    pickingEntries.forEach(p => {
       skuActuals[p.sku_id] = (skuActuals[p.sku_id] || 0) + Number(p.qty);
    });

    let hasError = false;
    for (const sId of Object.keys(skuTargets)) {
       const t = skuTargets[sId];
       const a = skuActuals[sId] || 0;
       if (a < t) {
          toast.error(`Kurang Picking! SKU belum mencapai target total JO (${a} dari ${t}).`);
          hasError = true;
       }
       if (a > t) {
          toast.error(`Kelebihan Picking untuk suatu SKU (${a} dari target ${t}).`);
          hasError = true;
       }
    }
    if (hasError) return;

    setSubmitting(true);
    try {
      // Validate location codes
      const locCodes = [...new Set(pickingEntries.map(pe => pe.location_code.trim().toUpperCase()))];
      const { data: locs, error: locErr } = await supabase.from('md_warehouse_locations').select('id, code').in('code', locCodes);
      if (locErr) throw locErr;
      const locMap = Object.fromEntries((locs || []).map(l => [l.code.toUpperCase(), l.id]));
      
      const groupedBySku: Record<string, any[]> = {};
      pickingEntries.forEach(pe => {
         if (!groupedBySku[pe.sku_id]) groupedBySku[pe.sku_id] = [];
         groupedBySku[pe.sku_id].push({
            location_id: locMap[pe.location_code.trim().toUpperCase()],
            location_code: pe.location_code.trim().toUpperCase(),
            qty: Number(pe.qty)
         });
      });

      // Update wh_outbound_shipment_items with picking evidence
      for (const item of shipment.items || []) {
         const entries = groupedBySku[item.product_sku_id] || [];
         const totalPicked = entries.reduce((sum, e) => sum + e.qty, 0);
         const { error: itmErr } = await supabase.from('wh_outbound_shipment_items').update({
            picked_qty: totalPicked,
            picking_entries: entries
         }).eq('id', item.id);
         if (itmErr) throw itmErr;
      }

      await handleUpdateStatus('READY_FOR_CHECKING');
    } catch (err) {
      toast.error('Gagal memproses picking');
      setSubmitting(false);
    }
  };

  // ==========================
  // SECURITY & TALLY LOGIC
  // ==========================
  const handleSecuritySubmit = async () => {
    if (!selectedTransporterId || !selectedFleetId || !selectedDriverId) {
      toast.error('Pilih transporter, armada, dan supir terlebih dahulu'); return;
    }
    if (!truckArrivalDoc) {
      toast.error('Upload foto/dokumen kedatangan truk terlebih dahulu'); return;
    }
    
    setSubmitting(true);
    try {
      // 1. Upload Doc
      const { data: fileData, error: fileErr } = await supabase.storage.from('warehouse_documents').upload(`arrival/${shipmentId}_${Date.now()}`, truckArrivalDoc);
      if (fileErr) throw fileErr;
      const fileUrl = supabase.storage.from('warehouse_documents').getPublicUrl(fileData.path).data.publicUrl;

      // 2. Update DB
      const updates = { 
        transporter_id: selectedTransporterId, 
        driver_id: selectedDriverId, 
        fleet_id: selectedFleetId,
        surat_jalan_url: fileUrl,
        status: 'READY_FOR_LOADING'
      };
      
      const { error } = await supabase.from('wh_outbound_shipments').update(updates).eq('id', shipmentId);
      if (error) throw error;
      
      toast.success('Kedatangan truk tercatat, siap untuk Loading!');
      fetchShipmentDetails(session);
    } catch (err) {
      toast.error('Gagal mencatat kedatangan truk');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckingItemChange = (itemId: string, field: string, value: any) => {
    setCheckingItems(checkingItems.map(item => item.id === itemId ? { ...item, [field]: value } : item));
  };

  const addDamageEntry = (itemId: string) => {
    setDamageEntries(prev => [...prev, {
      tempId: `new_${Date.now()}_${Math.random()}`,
      shipment_item_id: itemId,
      qty: 0,
      damage_source: '',
      damage_condition: '',
      damage_notes: '',
      photo_url: '',
      photoFile: null as File | null,
    }]);
  };

  const updateDamageEntry = (tempId: string, field: string, value: any) => {
    setDamageEntries(prev => prev.map(d => d.tempId === tempId ? { ...d, [field]: value } : d));
  };

  const removeDamageEntry = (tempId: string) => {
    setDamageEntries(prev => prev.filter(d => d.tempId !== tempId));
  };

  const handleDamagePhoto = async (tempId: string, file: File) => {
    setSubmitting(true);
    try {
      const fileName = `outbound_damage_${shipmentId}_${tempId}_${Date.now()}.jpg`;
      const { data, error } = await supabase.storage
        .from('warehouse_documents')
        .upload(`damage/${fileName}`, file, { upsert: true });
      if (error) throw error;
      const { data: publicUrlData } = supabase.storage.from('warehouse_documents').getPublicUrl(`damage/${fileName}`);
      updateDamageEntry(tempId, 'photo_url', publicUrlData.publicUrl);
      toast.success('Foto terupload');
    } catch (err) {
      toast.error('Gagal upload foto');
    } finally {
      setSubmitting(false);
    }
  };

  const submitChecking = async () => {
    if (!pinConfirm || pinConfirm.length < 4) { toast.error('Masukkan PIN'); return; }
    
    setSubmitting(true);
    try {
      const { data: staff } = await supabase.from('md_warehouse_staff').select('pin').eq('id', session.staff_id).single();
      if (!staff || staff.pin !== pinConfirm) { toast.error('PIN salah'); return; }
      
      // Update wh_outbound_shipment_items checked_qty & damage_qty
      for (const item of checkingItems) {
         const dmgs = damageEntries.filter(d => d.shipment_item_id === item.id);
         const dmgQty = dmgs.reduce((acc, d) => acc + Number(d.qty), 0);
         const { error: updErr } = await supabase.from('wh_outbound_shipment_items')
            .update({ checked_qty: item.checked_qty, damage_qty: dmgQty })
            .eq('id', item.id);
         if (updErr) throw updErr;
      }
      
      // Insert damage records
      const damageToInsert = damageEntries.map(d => ({
         shipment_item_id: d.shipment_item_id,
         damage_qty: Number(d.qty),
         damage_source: d.damage_source || 'OTHER',
         damage_condition: d.damage_condition || 'TOTAL_DAMAGE',
         damage_notes: d.damage_notes || '',
         photo_url: d.photo_url || ''
      }));
      if (damageToInsert.length > 0) {
         const { error: insDmgErr } = await supabase.from('wh_outbound_damage_records').insert(damageToInsert);
         if (insDmgErr) throw insDmgErr;
      }

      await handleUpdateStatus('READY_FOR_LOADING');
    } catch (err: any) {
      toast.error('Gagal menyimpan hasil checking: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartLoading = async () => {
    setSubmitting(true);
    try {
      const nextNum = loadingSessions.length + 1;
      const { error: insertErr } = await supabase.from('wh_loading_sessions').insert({ shipment_id: shipmentId, session_number: nextNum, start_time: new Date().toISOString() });
      if (insertErr) throw insertErr;
      
      const { error: updateErr } = await supabase.from('wh_outbound_shipments').update({ status: 'LOADING' }).eq('id', shipmentId);
      if (updateErr) throw updateErr;
      
      toast.success('Loading dimulai');
      await fetchLoadingSessions(shipmentId);
      await fetchShipmentDetails(session);
    } catch (err) { toast.error('Gagal memulai loading'); } finally { setSubmitting(false); }
  };

  const handleStopLoading = async () => {
    if (!stopReason.trim()) { toast.error('Isi alasan berhenti'); return; }
    setSubmitting(true);
    try {
      const { data: active } = await supabase.from('wh_loading_sessions').select('*').eq('shipment_id', shipmentId).is('end_time', null).single();
      const finalReason = stopReason === 'Lainnya' ? customStopReason : stopReason;
      if (active) {
         const { error } = await supabase.from('wh_loading_sessions').update({ end_time: new Date().toISOString(), pause_reason: finalReason }).eq('id', active.id);
         if (error) throw error;
      }
      
      await fetchLoadingSessions(shipmentId);
      setShowStopModal(false);
      setStopReason('');
      setCustomStopReason('');
      toast.success('Loading dihentikan sementara');
    } catch (err) { toast.error('Gagal menjeda'); } finally { setSubmitting(false); }
  };

  const handleFinishLoading = async () => {
    setSubmitting(true);
    try {
      const active = loadingSessions.find((s: any) => !s.end_time);
      if (active) {
         const { error } = await supabase.from('wh_loading_sessions').update({ end_time: new Date().toISOString() }).eq('id', active.id);
         if (error) throw error;
      }
      
      await fetchLoadingSessions(shipmentId);
      
      const { data: all } = await supabase.from('wh_loading_sessions').select('*').eq('shipment_id', shipmentId);
      const mins = (all || []).reduce((sum, s) => s.end_time ? sum + (new Date(s.end_time).getTime() - new Date(s.start_time).getTime()) / 60000 : sum, 0);
      
      await supabase.from('wh_outbound_shipments').update({ status: 'READY_FOR_DOCUMENTS', total_loading_minutes: Math.round(mins * 100) / 100 }).eq('id', shipmentId);
      toast.success('Loading selesai');
      fetchShipmentDetails(session);
    } catch (err) { toast.error('Gagal selesai loading'); } finally { setSubmitting(false); }
  };

  const handleUploadDocsAndFinish = async () => {
    setUploadingDoc(true);
    try {
      let bastUrl = shipment.bast_url;
      let sjUrl = shipment.surat_jalan_url;
      if (documentFile) {
         const { data, error } = await supabase.storage.from('warehouse_documents').upload(`bast/${shipmentId}_${Date.now()}.pdf`, documentFile);
         if (error) throw error;
         bastUrl = supabase.storage.from('warehouse_documents').getPublicUrl(data.path).data.publicUrl;
      }
      if (bastUrl || sjUrl) {
         await supabase.from('wh_outbound_shipments').update({ bast_url: bastUrl, surat_jalan_url: sjUrl }).eq('id', shipmentId);
      }
      handleUpdateStatus('COMPLETED');
    } catch (err) { toast.error('Gagal upload'); } finally { setUploadingDoc(false); }
  };

  if (loading || !shipment) {
    return <div className="p-10 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-slate-300" /></div>;
  }

  const role = session?.role;
  const status = shipment.status;

  return (
    <div className="bg-slate-50 min-h-screen pb-32">
      {showScanner && (
        <BarcodeScanner
          onClose={() => setShowScanner(null)}
          onScanSuccess={(decodedText) => {
             if (showScanner === 'LOCATION') {
               setScanLocation(decodedText);
             } else if (showScanner === 'REPLACEMENT') {
               setReplacementLocation(decodedText);
               setShowScanner(null);
             } else if (showScanner === 'SKU') {
               // Check if scanned text matches an SKU Code
               const skus = getAvailableSkus();
               const match = skus.find(s => s.sku_code === decodedText);
               if (match) {
                 setScanSkuId(match.id);
                 toast.success('Produk ditemukan');
               } else {
                 toast.error('Barcode Produk tidak ditemukan untuk lokasi ini');
               }
             }
             setShowScanner(null);
          }}
        />
      )}

      <div className="bg-white border-b border-slate-200 sticky top-0 z-40 px-4 py-3 flex items-center justify-between shadow-sm">
         <button onClick={() => router.push('/warehouse/portal')} className="p-2 -ml-2 text-slate-400 hover:text-slate-900"><ChevronLeft size={28} /></button>
         <div className="text-center">
            <h2 className="font-black text-lg text-slate-900 tracking-wide">{shipment.transfer_order?.transfer_number || shipment.wo_item?.job_orders?.[0]?.jo_number || shipment.shipment_number}</h2>
            <p className="text-sm font-black text-amber-500 uppercase tracking-widest">{status.replace(/_/g, ' ')}</p>
         </div>
         <div className="w-8" />
      </div>

      <div className="p-4 space-y-6">
        {/* Logistics Info (Visible to all) */}
        <Card className="p-5 border-slate-200 shadow-sm bg-white">
           <h3 className="font-black text-slate-900 text-base flex items-center gap-2 border-b border-slate-100 pb-3 mb-3"><Truck size={20} className="text-slate-500" /> Info Armada</h3>
           <div className="grid grid-cols-2 gap-4">
              <div><span className="block text-xs text-slate-400 font-black uppercase tracking-widest">Transporter</span><span className="text-sm font-bold text-slate-900">{shipment.transporter?.name || '-'}</span></div>
              <div><span className="block text-xs text-slate-400 font-black uppercase tracking-widest">Driver</span><span className="text-sm font-bold text-slate-900">{shipment.driver?.name || '-'}</span></div>
           </div>
        </Card>

        {/* Transfer Info */}
        {shipment.transfer_order && (
          <Card className="p-5 border-violet-200 shadow-sm bg-violet-50">
            <h3 className="font-black text-violet-900 text-base flex items-center gap-2"><ArrowLeftRight size={20} /> Transfer Order</h3>
            <div className="grid grid-cols-2 gap-4 mt-3">
              <div><span className="block text-xs text-violet-500 font-black uppercase tracking-widest">Dari</span><span className="text-sm font-bold text-violet-900">{shipment.transfer_order.from_warehouse?.name || '-'}</span></div>
              <div><span className="block text-xs text-violet-500 font-black uppercase tracking-widest">Ke</span><span className="text-sm font-bold text-violet-900">{shipment.transfer_order.to_warehouse?.name || '-'}</span></div>
            </div>
          </Card>
        )}

        {/* ROLE: SECURITY */}
        {(role === 'SECURITY' || role === 'ADMIN') && ['PLANNED', 'PENDING', 'ASSIGNED', 'PICKING', 'READY_FOR_CHECKING', 'CHECKING', 'READY_FOR_LOADING', 'LOADING'].includes(status) && (
          <Card className="p-5 border-slate-200 shadow-sm bg-white">
             <h3 className="font-black text-slate-900 text-base mb-4">Pencatatan Truk Datang</h3>
             <div className="space-y-4">
                 <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Transporter</label>
                    <select value={selectedTransporterId || ''} onChange={e => { setSelectedTransporterId(e.target.value); setSelectedFleetId(''); setSelectedDriverId(''); }} className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none bg-white">
                      <option value="">Pilih Transporter...</option>
                      {transporters.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Armada / No. Polisi</label>
                    <select value={selectedFleetId} onChange={e => setSelectedFleetId(e.target.value)} disabled={!selectedTransporterId} className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none bg-white disabled:opacity-50">
                      <option value="">Pilih Armada...</option>
                      {fleets.map(f => <option key={f.id} value={f.id}>{f.plate_number}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Supir</label>
                    <select value={selectedDriverId} onChange={e => setSelectedDriverId(e.target.value)} disabled={!selectedTransporterId} className="w-full h-11 px-3 border border-slate-200 rounded-xl outline-none bg-white disabled:opacity-50">
                      <option value="">Pilih Supir...</option>
                      {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                 </div>
                 <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1">Foto / Bukti Kedatangan (Wajib)</label>
                    <input type="file" accept="image/*,.pdf" onChange={e => setTruckArrivalDoc(e.target.files?.[0] || null)} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-rose-50 file:text-rose-700 font-bold" />
                 </div>
                 <button onClick={handleSecuritySubmit} disabled={submitting || !truckArrivalDoc} className="mt-4 w-full h-12 bg-rose-600 text-white rounded-xl font-black shadow-lg flex items-center justify-center">
                    {submitting ? <Loader2 className="animate-spin w-5 h-5" /> : 'Submit Truck Arrival'}
                 </button>
             </div>
          </Card>
        )}

        {/* ROLE: DOCUMENTS (Security/Admin) */}
        {(role === 'SECURITY' || role === 'ADMIN') && status === 'READY_FOR_DOCUMENTS' && (
          <Card className="p-5 border-slate-200 shadow-sm bg-white">
             <h3 className="font-black text-slate-900 text-base mb-4">Penyelesaian Dokumen Outbound</h3>
             
             <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
               <h4 className="text-xs font-black text-blue-800 uppercase tracking-widest mb-2">1. Cetak Berita Acara</h4>
               <p className="text-xs text-blue-600 mb-3 font-medium">Silakan cetak Berita Acara Serah Terima (BAST) untuk ditandatangani oleh Admin Gudang dan Supir Truk.</p>
               <button 
                 onClick={() => window.open(`/sbu/warehouse/outbound/print-bast/${shipmentId}`, '_blank')}
                 className="w-full py-3 bg-white text-blue-700 font-bold rounded-lg shadow-sm border border-blue-200 hover:bg-blue-600 hover:text-white transition-colors"
               >
                 Cetak / Preview BAST
               </button>
             </div>

             <div className="space-y-4 border-t border-slate-100 pt-4">
                <div>
                   <label className="block text-sm font-bold text-slate-900 mb-2">2. Upload BAST yang Ditandatangani</label>
                   <input type="file" accept="image/*,.pdf" onChange={e => setDocumentFile(e.target.files?.[0] || null)} className="w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:bg-blue-50 file:text-blue-700 font-bold" />
                </div>
                <button onClick={handleUploadDocsAndFinish} disabled={uploadingDoc || submitting} className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl shadow-lg">
                   {uploadingDoc ? <Loader2 className="animate-spin inline mr-2" /> : <CheckCircle2 className="inline mr-2" />} Selesaikan Outbound
                </button>
             </div>
          </Card>
        )}

        {/* ROLE: PUTAWAY (Picker) */}
        {role === 'PUTAWAY' && ['PLANNED', 'PENDING', 'ASSIGNED', 'PICKING'].includes(status) && (
          <Card className="p-5 border-slate-200 shadow-sm bg-white border-t-4 border-amber-400">
             <h3 className="font-black text-slate-900 text-base flex items-center gap-2 mb-3 border-b border-slate-100 pb-3"><PackageCheck size={20} className="text-amber-500" /> Tugas Picking (JO Plan)</h3>

             {/* Header Table: All WO Items */}
             <div className="overflow-x-auto mb-5">
               <table className="w-full text-xs">
                 <thead>
                   <tr className="bg-slate-100 text-slate-500 uppercase tracking-widest font-black">
                     <th className="text-left px-3 py-2.5 rounded-l-lg w-8">#</th>
                     <th className="text-left px-3 py-2.5">Produk</th>
                     <th className="text-left px-3 py-2.5">SKU</th>
                     <th className="text-center px-3 py-2.5">Qty Target</th>
                     <th className="text-left px-3 py-2.5">Area / Lokasi</th>
                     <th className="text-center px-3 py-2.5 rounded-r-lg">Status</th>
                   </tr>
                 </thead>
                 <tbody>
                   {assignments.length === 0 ? (
                     <tr><td colSpan={6} className="text-center py-6 text-slate-400 italic">Belum ada alokasi lokasi dari sistem.</td></tr>
                   ) : assignments.map((a: any, i: number) => {
                     const skuId = a.manifest?.md_product_skus?.id;
                     const locCode = (a.location?.code || '').toUpperCase();
                     const pickedSum = pickingEntries
                       .filter(pe => pe.sku_id === skuId && pe.location_code === locCode)
                       .reduce((sum, pe) => sum + Number(pe.qty), 0);
                     const targetQty = Number(a.quantity) || 0;
                     const isComplete = pickedSum >= targetQty;

                     return (
                       <tr key={a.id} className={`border-b border-slate-100 transition-colors ${isComplete ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}>
                         <td className="px-3 py-2.5 font-bold text-slate-400">{i + 1}</td>
                         <td className={`px-3 py-2.5 font-bold ${isComplete ? 'text-emerald-800 line-through opacity-60' : 'text-slate-900'}`}>
                           {a.manifest?.md_product_skus?.name || '-'}
                         </td>
                         <td className="px-3 py-2.5 text-slate-500 font-mono">{a.manifest?.md_product_skus?.sku_code || '-'}</td>
                         <td className={`px-3 py-2.5 text-center font-black ${isComplete ? 'text-emerald-600' : 'text-blue-600'}`}>
                           {Intl.NumberFormat('en-US').format(targetQty)} PCS
                         </td>
                         <td className="px-3 py-2.5">
                           <span className="inline-block bg-slate-100 text-slate-700 font-bold px-2 py-1 rounded-md text-[10px] tracking-wider">
                             {locCode || 'TBA'}
                           </span>
                         </td>
                         <td className="px-3 py-2.5 text-center">
                           {isComplete ? (
                             <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-100 px-2 py-1 rounded-md font-black text-[10px]">
                               <CheckCircle2 size={12} /> DONE
                             </span>
                           ) : (
                             <span className="inline-flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded-md font-black text-[10px]">
                               {pickedSum > 0 ? `${Intl.NumberFormat('en-US').format(pickedSum)}/${Intl.NumberFormat('en-US').format(targetQty)}` : 'BELUM'}
                             </span>
                           )}
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>

             {/* Dynamic Scan Form */}
             <div className="p-4 bg-white border-2 border-slate-200 rounded-2xl shadow-sm space-y-4 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                <h4 className="font-black text-sm text-slate-700 uppercase tracking-widest">Form Aktual Picking</h4>
                
                {/* Field 1: Location */}
                <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">1. Lokasi</label>
                   <div className="flex gap-2">
                     <input 
                       type="text" 
                       placeholder="Contoh: RAK-A1"
                       value={scanLocation}
                       onChange={e => setScanLocation(e.target.value)}
                       className="flex-1 h-12 px-3 border-2 border-slate-200 rounded-xl font-bold uppercase text-sm outline-none focus:border-blue-500"
                     />
                     <button onClick={() => setShowScanner('LOCATION')} className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100"><Camera size={20}/></button>
                   </div>
                </div>

                {/* Field 2: Product */}
                <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">2. Produk</label>
                   <div className="flex gap-2">
                     <select 
                       value={scanSkuId}
                       onChange={e => setScanSkuId(e.target.value)}
                       className="flex-1 h-12 px-3 border-2 border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-blue-500 bg-white"
                     >
                        <option value="">-- Pilih Produk --</option>
                        {getAvailableSkus().map((s: any) => (
                           <option key={s.id} value={s.id}>{s.name} ({s.sku_code})</option>
                        ))}
                     </select>
                     <button onClick={() => setShowScanner('SKU')} className="w-12 h-12 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100"><Camera size={20}/></button>
                   </div>
                </div>

                {/* Field 3: Qty */}
                <div>
                   <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">3. Qty Diambil (PCS)</label>
                   <input 
                     type="text" 
                     inputMode="numeric"
                     placeholder="1,000"
                     value={scanQty}
                     onChange={handleScanQtyChange}
                     className="w-full h-12 px-3 border-2 border-slate-200 rounded-xl font-black text-lg text-blue-600 outline-none focus:border-blue-500"
                   />
                </div>

                <button onClick={handleAddPick} className="w-full h-12 bg-slate-900 text-white font-black rounded-xl shadow-md">
                   + Simpan Baris Ini
                </button>
             </div>

             {/* Actual Picks List */}
             {pickingEntries.length > 0 && (
               <div className="mt-6">
                 <h4 className="font-black text-xs text-slate-500 uppercase tracking-widest mb-3">Daftar Picking Tersimpan</h4>
                 <div className="space-y-2 mb-6">
                    {pickingEntries.map((pe, i) => (
                       <div key={pe.id || `pe_${i}`} className="flex justify-between items-center p-3 bg-emerald-50 border border-emerald-100 rounded-xl text-sm relative pr-12">
                          <div>
                            <span className="font-bold text-slate-800 block">{pe.sku_name}</span>
                            <span className="text-[10px] font-black tracking-widest text-slate-500">DARI: {pe.location_code}</span>
                          </div>
                          <span className="font-black text-emerald-700 text-lg">{pe.qty} <span className="text-xs font-bold">PCS</span></span>
                          <button onClick={() => removePickEntry(pe.id)} className="absolute right-3 p-2 text-rose-400 hover:text-rose-600">
                            <Trash2 size={16} />
                          </button>
                       </div>
                    ))}
                 </div>
               </div>
             )}

             <button onClick={submitPicking} disabled={submitting || pickingEntries.length === 0} className="w-full mt-2 py-4 bg-emerald-600 text-white font-black rounded-xl shadow-lg flex items-center justify-center gap-2">
                {submitting ? <Loader2 className="animate-spin" /> : <CheckCircle2 />} Selesaikan Semua Picking
             </button>
          </Card>
        )}

        {/* ROLE: TALLY (Checking) */}
        {role === 'TALLY' && ['READY_FOR_CHECKING', 'CHECKING'].includes(status) && (
          <Card className="p-5 border-slate-200 shadow-sm bg-white border-l-4 border-blue-400">
             <h3 className="font-black text-slate-900 text-base mb-4"><ScanLine size={20} className="inline mr-2 text-blue-500" /> Verifikasi Barang (Checking)</h3>
             
             {status === 'READY_FOR_CHECKING' ? (
                <div className="space-y-4">
                  <div className="space-y-2 mb-6">
                     {shipment.items?.map((item: any) => (
                        <div key={item.id} className="flex justify-between p-3 bg-slate-50 border border-slate-100 rounded-xl text-sm">
                          <span className="font-bold text-slate-700">{item.md_product_skus?.name}</span>
                          <span className="font-black text-blue-600">{item.picked_qty} PCS</span>
                        </div>
                     ))}
                  </div>
                  <button onClick={() => handleUpdateStatus('CHECKING')} className="w-full py-4 bg-blue-600 text-white font-black rounded-xl shadow-lg">Mulai Checking</button>
                </div>
             ) : (
                <div className="space-y-6">
                   {checkingItems.map(item => {
                      const dmgs = damageEntries.filter(d => d.shipment_item_id === item.id);
                      const totalDamage = dmgs.reduce((acc, d) => acc + Number(d.qty), 0);
                      const totalChecked = Number(item.checked_qty) + totalDamage;
                      const discrepancy = totalChecked < item.picked_qty;
                      const shortage = Number(item.requested_qty) - Number(item.checked_qty);

                      return (
                         <div key={item.id} className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-3">
                           <div className="flex justify-between items-start">
                             <div>
                               <div className="font-bold text-slate-800">{item.md_product_skus?.name}</div>
                               <div className="text-xs font-black text-slate-500 tracking-widest mt-1">DARI PICKING: {item.picked_qty} PCS</div>
                             </div>
                           </div>

                           <div className="pt-3 border-t border-slate-200 grid grid-cols-2 gap-3">
                             <div>
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Kuantitas Bagus</label>
                               <input 
                                 type="number" min="0" 
                                 className="w-full h-10 px-3 mt-1 border-2 border-emerald-100 rounded-xl font-bold focus:border-emerald-500 outline-none"
                                 value={item.checked_qty} 
                                 onChange={e => handleCheckingItemChange(item.id, 'checked_qty', e.target.value)} 
                               />
                             </div>
                             <div>
                               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Kuantitas Rusak</label>
                               {dmgs.length > 0 ? (
                                  <div className="h-10 px-3 bg-rose-50 border-2 border-rose-100 rounded-xl font-bold text-rose-600 flex items-center justify-between">
                                    {totalDamage} PCS
                                  </div>
                               ) : (
                                  <button onClick={() => addDamageEntry(item.id)} className="w-full h-10 border-2 border-dashed border-slate-300 text-slate-500 rounded-xl text-xs font-bold hover:bg-slate-100">
                                    + Lapor Rusak
                                  </button>
                               )}
                             </div>
                           </div>

                           {dmgs.length > 0 && (
                             <div className="mt-2 space-y-2">
                               {dmgs.map((d, i) => (
                                 <div key={d.tempId} className="p-3 bg-white border border-rose-100 rounded-xl relative">
                                    <h5 className="text-[10px] font-black text-rose-500 uppercase tracking-widest mb-2">Laporan Kerusakan #{i+1}</h5>
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                      <input type="number" placeholder="Qty Rusak" className="w-full text-xs p-2 border rounded-lg" value={d.qty} onChange={e => updateDamageEntry(d.tempId, 'qty', e.target.value)} />
                                      <select className="w-full text-xs p-2 border rounded-lg" value={d.damage_source} onChange={e => updateDamageEntry(d.tempId, 'damage_source', e.target.value)}>
                                        <option value="">-- Sumber --</option>
                                        <option value="PICKING">Saat Picking</option>
                                        <option value="WAREHOUSE_STAFF">Staff Gudang</option>
                                        <option value="OTHER">Lainnya</option>
                                      </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mb-2">
                                      <select className="w-full text-xs p-2 border rounded-lg" value={d.damage_condition} onChange={e => updateDamageEntry(d.tempId, 'damage_condition', e.target.value)}>
                                        <option value="">-- Kondisi --</option>
                                        <option value="TOTAL_DAMAGE">Rusak Total</option>
                                        <option value="DAMAGED_PACKAGE_FULL_CONTENT">Kemasan Rusak, Isi Utuh</option>
                                        <option value="GOOD_PACKAGE_MISSING_CONTENT">Kemasan Utuh, Isi Kurang</option>
                                      </select>
                                      <input type="text" placeholder="Catatan" className="w-full text-xs p-2 border rounded-lg" value={d.damage_notes} onChange={e => updateDamageEntry(d.tempId, 'damage_notes', e.target.value)} />
                                    </div>
                                    <div className="mt-2 flex items-center justify-between">
                                      <div className="relative overflow-hidden inline-block">
                                        <button className="text-xs bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1 font-bold">
                                          <Camera size={14} /> {d.photo_url ? 'Foto Terupload' : 'Upload Foto'}
                                        </button>
                                        <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={e => e.target.files?.[0] && handleDamagePhoto(d.tempId, e.target.files[0])} />
                                      </div>
                                      <button onClick={() => removeDamageEntry(d.tempId)} className="text-xs text-rose-500 font-bold hover:underline">Hapus</button>
                                    </div>
                                 </div>
                               ))}
                               <button onClick={() => addDamageEntry(item.id)} className="w-full text-xs py-2 text-slate-500 border border-dashed rounded-lg font-bold hover:bg-slate-50">+ Tambah Laporan Kerusakan Lain</button>
                             </div>
                           )}

                           {discrepancy && (
                             <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs font-bold text-amber-800">
                               <AlertTriangle size={14} className="inline mr-1" />
                               Ada selisih {item.picked_qty - totalChecked} PCS dari jumlah yang dipicking. Selisih ini hanya tampil untuk Admin.
                             </div>
                           )}

                           {shortage > 0 && Number(item.checked_qty) > 0 && (
                             <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between shadow-sm">
                               <div>
                                 <p className="text-xs font-bold text-blue-800 mb-0.5">Kurang {shortage} PCS Bagus dari Target JO</p>
                                 <p className="text-[10px] text-blue-600 font-medium">Bagus: {item.checked_qty} / JO: {item.requested_qty}</p>
                               </div>
                               <button 
                                 onClick={() => setShowReplacementModal({ itemId: item.id, skuId: item.product_sku_id, skuName: item.md_product_skus?.name, qtyToPick: shortage })}
                                 className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold shadow-sm hover:bg-blue-700 active:scale-95 transition-all"
                               >
                                 + Picking Pengganti ({shortage})
                               </button>
                             </div>
                           )}
                         </div>
                      );
                   })}

                   <div className="space-y-3 mt-4">
                     <button onClick={() => setShowPinModal(true)} className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl shadow-lg">Selesaikan Checking</button>
                     <button onClick={() => handleUpdateStatus('PICKING')} className="w-full py-4 bg-rose-50 text-rose-600 border border-rose-200 font-black rounded-xl hover:bg-rose-100 transition-colors">
                        Kembalikan ke Picker (Minta Tambahan)
                     </button>
                   </div>
                </div>
             )}
          </Card>
        )}

        {/* ROLE: TALLY (Loading) */}
        {role === 'TALLY' && ['READY_FOR_LOADING', 'LOADING'].includes(status) && (
          <div className="space-y-4">
             <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl">
                <h3 className="text-xs font-black text-purple-800 uppercase tracking-widest mb-1"><Truck size={14} className="inline mr-1" /> Tugas Anda: Tally Checker</h3>
                <p className="text-xs text-purple-600 font-medium">Proses muat (loading) barang ke dalam armada.</p>
             </div>

             {!shipment.driver_id ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-900 font-bold text-sm">
                   <AlertTriangle className="shrink-0" /> Menunggu truk datang di gate (Hubungi Gate Control)
                </div>
             ) : (
                <div className="space-y-4">
                   <Card className="p-5 border-purple-200 bg-white shadow-sm">
                      <div className="text-center">
                         <div className="text-5xl font-black font-mono text-slate-900 tabular-nums tracking-wider mb-3">
                            {String(Math.floor(elapsedSeconds / 3600)).padStart(2, '0')}:
                            {String(Math.floor((elapsedSeconds % 3600) / 60)).padStart(2, '0')}:
                            {String(elapsedSeconds % 60).padStart(2, '0')}
                         </div>
                         <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                            {timerRunning ? 'SEDANG BERJALAN' : 'TERPAUSE / MENUNGGU'}
                         </p>
                         <div className="flex gap-3">
                            {!timerRunning ? (
                               <Button
                                 onClick={handleStartLoading}
                                 loading={submitting}
                                 className="flex-1 h-14 !bg-purple-600 hover:!bg-purple-700 text-white rounded-xl shadow-lg shadow-purple-600/30 text-sm font-bold"
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
                              onClick={handleFinishLoading}
                              loading={submitting}
                              className="flex-1 h-14 !bg-emerald-600 hover:!bg-emerald-700 text-white rounded-xl shadow-lg shadow-emerald-600/30 text-sm font-bold"
                            >
                               <Square size={18} /> Selesai
                            </Button>
                         </div>
                      </div>
                   </Card>

                   {/* Loading Sessions Log */}
                   {loadingSessions.length > 0 && (
                      <div className="bg-white rounded-xl border border-slate-200 p-3">
                         <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 px-1">Log Sesi Loading</h4>
                         <div className="space-y-1.5">
                            {loadingSessions.map((s, i) => {
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
          </div>
        )}
      </div>

      {showPinModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="p-6 text-center">
              <h3 className="font-black text-xl text-slate-900 mb-1">Konfirmasi PIN</h3>
              <p className="text-sm text-slate-500 mb-6">Masukkan PIN Anda untuk menyetujui hasil checking fisik.</p>
              <input type="password" value={pinConfirm} onChange={e => setPinConfirm(e.target.value)} maxLength={6} className="w-40 mx-auto text-center text-4xl font-black tracking-widest py-3 border-b-2 border-slate-300 focus:border-blue-600 outline-none mb-8" placeholder="••••" />
              <div className="flex gap-3">
                <button onClick={() => setShowPinModal(false)} className="flex-1 py-4 text-sm font-bold text-slate-500 bg-slate-100 rounded-xl active:scale-95 transition-transform">Batal</button>
                <button onClick={submitChecking} disabled={submitting} className="flex-1 py-4 text-sm font-bold text-white bg-emerald-600 rounded-xl active:scale-95 transition-transform">Konfirmasi</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Replacement Picking Modal */}
      {showReplacementModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl">
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
                  <div className="relative">
                    <input 
                      type="text" 
                      value={replacementLocation} 
                      onChange={e => setReplacementLocation(e.target.value.toUpperCase())}
                      className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:border-blue-600 focus:bg-blue-50/50 outline-none font-mono font-bold text-slate-700 transition-colors"
                      placeholder="Contoh: RAK-A1"
                      autoFocus
                    />
                    <button onClick={() => setShowScanner('REPLACEMENT')} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-colors">
                      <Camera size={16} />
                    </button>
                  </div>
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
                        fetchShipmentDetails(session);
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

      {showStopModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4">
            <h3 className="font-black text-xl text-slate-900">Jeda Loading</h3>
            <p className="text-sm text-slate-500">Timer sedang berjalan. Mengapa ingin berhenti?</p>
            <div className="space-y-2">
              {['Istirahat Shift', 'Mesin Forklift Rusak', 'Menunggu Dokumen', 'Lainnya'].map(opt => (
                <label key={opt} className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 has-[:checked]:border-blue-500 has-[:checked]:bg-blue-50">
                  <input type="radio" name="stopReason" value={opt} checked={stopReason === opt} onChange={(e) => setStopReason(e.target.value)} className="accent-blue-600" />
                  <span className="text-sm font-medium text-slate-900">{opt}</span>
                </label>
              ))}
              {stopReason === 'Lainnya' && (
                <input type="text" value={customStopReason} onChange={(e) => setCustomStopReason(e.target.value)} placeholder="Jelaskan alasan..." className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl outline-none focus:border-blue-500 mt-2" autoFocus />
              )}
            </div>
            <div className="flex gap-3 pt-4">
               <button onClick={() => { setShowStopModal(false); setStopReason(''); setCustomStopReason(''); }} className="flex-1 py-4 text-sm font-bold text-slate-500 bg-slate-100 rounded-xl active:scale-95 transition-transform hover:bg-slate-200">Batal</button>
               <button onClick={handleStopLoading} disabled={submitting || !stopReason.trim() || (stopReason === 'Lainnya' && !customStopReason.trim())} className={`flex-1 py-4 text-sm font-bold text-white rounded-xl active:scale-95 transition-transform ${stopReason.trim() ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-300 cursor-not-allowed'}`}>Simpan Jeda</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
