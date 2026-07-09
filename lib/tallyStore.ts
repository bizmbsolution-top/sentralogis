import { set, get, update, del, entries } from 'idb-keyval';
import { supabase } from './supabaseClient';
import { compressImage } from './compression';

// Data usage tracking keys
const DATA_SENT_KEY = 'data_usage_sent';
const DATA_RECEIVED_KEY = 'data_usage_received';

export async function incrementDataSent(bytes: number) {
  await update(DATA_SENT_KEY, (val: number | undefined) => (val || 0) + bytes);
}

export async function incrementDataReceived(bytes: number) {
  await update(DATA_RECEIVED_KEY, (val: number | undefined) => (val || 0) + bytes);
}

export async function getDataUsage(): Promise<{ sent: number; received: number }> {
  const [sent, received] = await Promise.all([
    get(DATA_SENT_KEY),
    get(DATA_RECEIVED_KEY)
  ]);
  return { sent: sent || 0, received: received || 0 };
}

export interface OfflineReceipt {
  id: string;
  receipt_number: string;
  status: string;
  expected_arrival: string | null;
  transporter: string | null;
  fleet: string | null;
  transporter_name_manual: string | null;
  driver_name_manual: string | null;
  driver_phone: string | null;
  vehicle_photo_url: string | null;
  pod_document_url: string | null;
  unloading_start_time: string | null;
  unloading_end_time: string | null;
  _localVehiclePhoto?: File;
  _localPodPhoto?: File;
  _synced: boolean; // false means there are pending offline changes
}

export interface OfflineReceiptItem {
  id: string;
  product_name: string;
  sku_code: string;
  unit: string;
  expected_qty: number;
  actual_good_qty: number;
  quarantine_qty: number;
  rejected_qty: number;
  damage_source?: string;
  damage_condition?: string;
  damage_notes?: string;
  damage_photo_url?: string;
  _localPhotoFile?: File; // For holding the local file before sync
  putaway_records?: OfflinePutawayRecord[];
}

export interface OfflinePutawayRecord {
  id: string;
  location_code: string;
  qty: number;
}

// ----------------------------------------------------
  // 1. Download & Save To Local Device
  // ----------------------------------------------------
export async function downloadReceiptsToDevice(tenantId: string, warehouseId: string): Promise<OfflineReceipt[]> {
    // Fetch active receipts
    const { data: receiptsData, error: recError } = await supabase
      .from('wh_inbound_receipts')
      .select(`
        id, receipt_number, status, expected_arrival,
        transporter:transporter_id(name),
        fleet:fleet_id(plate_number),
        transporter_name_manual, driver_name_manual, driver_phone,
        vehicle_photo_url, pod_document_url, unloading_start_time, unloading_end_time
      `)
      .eq('tenant_id', tenantId)
      .eq('warehouse_id', warehouseId)
      .in('status', ['EXPECTED', 'TRUCK_ARRIVED', 'UNLOADING', 'CHECKING', 'PUTAWAY_IN_PROGRESS']) 
      .order('created_at', { ascending: false });

    if (recError) throw recError;

    const offlineList: OfflineReceipt[] = [];
    let receivedBytes = 0;

    for (const rec of receiptsData || []) {
      // Fetch items for each receipt
      const { data: itemsData, error: itemsError } = await supabase
        .from('wh_inbound_receipt_items')
        .select(`
          id, expected_qty, actual_good_qty, quarantine_qty, rejected_qty,
          damage_source, damage_condition, damage_notes, damage_photo_url,
          product:product_sku_id(name, sku_code, unit)
        `)
        .eq('receipt_id', rec.id);

      if (itemsError) throw itemsError;

      // Track received data (rough estimate of JSON payload)
      receivedBytes += JSON.stringify(rec).length + JSON.stringify(itemsData || []).length;

      const offlineRec: OfflineReceipt = {
        id: rec.id,
        receipt_number: rec.receipt_number,
        status: rec.status,
        expected_arrival: rec.expected_arrival,
        transporter: (rec.transporter as any)?.name || null,
        fleet: (rec.fleet as any)?.plate_number || null,
        transporter_name_manual: rec.transporter_name_manual,
        driver_name_manual: rec.driver_name_manual,
        driver_phone: rec.driver_phone,
        vehicle_photo_url: rec.vehicle_photo_url,
        pod_document_url: rec.pod_document_url,
        unloading_start_time: rec.unloading_start_time,
        unloading_end_time: rec.unloading_end_time,
        _synced: true,
        items: itemsData.map((item: any) => ({
          id: item.id,
          expected_qty: Number(item.expected_qty) || 0,
          actual_good_qty: Number(item.actual_good_qty) || 0,
          quarantine_qty: Number(item.quarantine_qty) || 0,
          rejected_qty: Number(item.rejected_qty) || 0,
          damage_source: item.damage_source,
          damage_condition: item.damage_condition,
          damage_notes: item.damage_notes,
          damage_photo_url: item.damage_photo_url,
          putaway_records: [],
          product_name: item.product?.name || 'Unknown',
          sku_code: item.product?.sku_code || '-',
          unit: item.product?.unit || 'pcs'
        }))
      };

      // Jangan timpa data lokal yang belum tersinkron (offline edits)
      const existing = await get(`receipt_${rec.id}`);
      if (existing && !(existing as OfflineReceipt)._synced) {
        // Keep local dirty version; skip overwrite
        offlineList.push(existing as OfflineReceipt);
        continue;
      }

      offlineList.push(offlineRec);
      
      // Save to IDB using prefix 'receipt_'
      await set(`receipt_${rec.id}`, offlineRec);
    }

    // Track data usage at end of download
    await incrementDataReceived(receivedBytes);
    return offlineList;
  }

// ----------------------------------------------------
// 3. Save Tally Work (Offline)
// ----------------------------------------------------
export async function saveTallyLocally(receiptId: string, updatedItems: OfflineReceiptItem[], nextStatus: string, metadata?: Partial<OfflineReceipt>): Promise<void> {
  await update(`receipt_${receiptId}`, (val) => {
    if (!val) return val;
    const rec = val as OfflineReceipt;
    rec.items = updatedItems;
    rec.status = nextStatus;
    
    if (metadata) {
      Object.assign(rec, metadata);
    }
    
    rec._synced = false; // Mark as dirty
    return rec;
  });
}

// ----------------------------------------------------
// 4. Sync Dirty Data to Cloud
// ----------------------------------------------------
export async function syncTalliesToCloud(): Promise<number> {
  const allEntries = await entries();
  const dirtyReceipts = allEntries
    .filter(([key, val]) => (key as string).startsWith('receipt_') && !(val as OfflineReceipt)._synced)
    .map(([, val]) => val as OfflineReceipt);

  let successCount = 0;

  for (const rec of dirtyReceipts) {
    try {
      // 0. Upload photos if exist
      if (rec._localVehiclePhoto) {
        const url = await uploadPhotoToCloud(rec._localVehiclePhoto, `vehicle_${rec.id}_${Date.now()}.jpg`);
        if (url) rec.vehicle_photo_url = url;
      }
      if (rec._localPodPhoto) {
        const url = await uploadPhotoToCloud(rec._localPodPhoto, `pod_${rec.id}_${Date.now()}.jpg`);
        if (url) rec.pod_document_url = url;
      }

      // 1. Update items
      let sentBytes = 0;
      for (const item of rec.items) {
        if (item._localPhotoFile) {
          const url = await uploadPhotoToCloud(item._localPhotoFile, `damage_${item.id}_${Date.now()}.jpg`);
          if (url) item.damage_photo_url = url;
        }

        const payload = JSON.stringify({
          actual_good_qty: item.actual_good_qty,
          quarantine_qty: item.quarantine_qty,
          rejected_qty: item.rejected_qty,
          damage_source: item.damage_source,
          damage_condition: item.damage_condition,
          damage_notes: item.damage_notes,
          damage_photo_url: item.damage_photo_url,
        });
        sentBytes += payload.length;

        const { error: itemErr } = await supabase
          .from('wh_inbound_receipt_items')
          .update({
            actual_good_qty: item.actual_good_qty,
            quarantine_qty: item.quarantine_qty,
            rejected_qty: item.rejected_qty,
            damage_source: item.damage_source,
            damage_condition: item.damage_condition,
            damage_notes: item.damage_notes,
            damage_photo_url: item.damage_photo_url,
          })
          .eq('id', item.id);
        if (itemErr) throw itemErr;

        // Note: Putaway records syncing (inserting to wh_inventory) would require an RPC call or complex logic 
        // to handle finding/creating location_id from location_code, updating inventory, and movement logs.
        // For MVP, we pass them if a backend endpoint exists, otherwise we just record them in metadata if needed.
      }

      // 2. Update receipt status & metadata
      const recPayload = JSON.stringify({
        status: rec.status,
        updated_at: new Date().toISOString(),
        transporter_name_manual: rec.transporter_name_manual,
        driver_name_manual: rec.driver_name_manual,
        driver_phone: rec.driver_phone,
        vehicle_photo_url: rec.vehicle_photo_url,
        pod_document_url: rec.pod_document_url,
        unloading_start_time: rec.unloading_start_time,
        unloading_end_time: rec.unloading_end_time
      });
      sentBytes += recPayload.length;
      await incrementDataSent(sentBytes);

      const { error: recErr } = await supabase
        .from('wh_inbound_receipts')
        .update({ 
          status: rec.status, 
          updated_at: new Date().toISOString(),
          transporter_name_manual: rec.transporter_name_manual,
          driver_name_manual: rec.driver_name_manual,
          driver_phone: rec.driver_phone,
          vehicle_photo_url: rec.vehicle_photo_url,
          pod_document_url: rec.pod_document_url,
          unloading_start_time: rec.unloading_start_time,
          unloading_end_time: rec.unloading_end_time
        })
        .eq('id', rec.id);
      
      if (recErr) throw recErr;

      // 3. Mark synced locally
      await update(`receipt_${rec.id}`, (val) => {
        const r = val as OfflineReceipt;
        r._synced = true;
        return r;
      });

      successCount++;
    } catch (err) {
      console.error(`Failed to sync receipt ${rec.receipt_number}`, err);
    }
  }

  return successCount;
}

// ----------------------------------------------------
// 5. Clear Local Storage (Logout/Reset)
// ----------------------------------------------------
export async function clearLocalTallies() {
  const allEntries = await entries();
  for (const [key] of allEntries) {
    if ((key as string).startsWith('receipt_')) {
      await del(key);
    }
  }
}

// ----------------------------------------------------
// Helper: Upload photo to Supabase Storage with compression
// ----------------------------------------------------
async function uploadPhotoToCloud(file: File, filename: string): Promise<string | null> {
  try {
    // Determine compression settings based on network
    const conn = (navigator as any).connection;
    let quality = 0.8;
    let maxWidth = 1200;
    let maxHeight = 1200;
    if (conn) {
      const saveData = !!conn.saveData;
      const effectiveType = (conn.effectiveType || '').toLowerCase();
      if (saveData || effectiveType.includes('2g')) {
        quality = 0.3;
        maxWidth = 800;
        maxHeight = 800;
      } else if (effectiveType.includes('3g')) {
        quality = 0.5;
        maxWidth = 1000;
        maxHeight = 1000;
      }
      // else keep defaults for 4g+
    }

    // Compress image
    const compressedFile = await compressImage(file, maxWidth, maxHeight, quality);
    const sentBytes = compressedFile.size; // track after compression

    const { data, error } = await supabase.storage
      .from('inbound-docs')
      .upload(`photos/${filename}`, compressedFile, { upsert: true });

    if (error) {
      console.error("Upload error", error);
      return null;
    }

    // Track sent bytes (compressed size)
    await incrementDataSent(sentBytes);

    const { data: publicUrlData } = supabase.storage
      .from('inbound-docs')
      .getPublicUrl(`photos/${filename}`);

    return publicUrlData.publicUrl;
  } catch (err) {
    console.error("Upload failed:", err);
    return null;
  }
}
    
    // Track sent bytes (file size)
    const sentBytes = file.size;
    await incrementDataSent(sentBytes);

    const { data: publicUrlData } = supabase.storage
      .from('inbound-docs')
      .getPublicUrl(`photos/${filename}`);

    return publicUrlData.publicUrl;
  } catch (err) {
    return null;
  }
}

