/**
 * ============================================================================
 * SENTRALOGIS UNIVERSAL OFFLINE-FIRST PWA SYNC ENGINE
 * ============================================================================
 * Dedicated architecture for field operational portals (Warehouse Touch/PIN & Driver Telemetry).
 * Handles:
 * 1. Local PIN Authentication (IndexedDB staff auth cache for 0.1s offline login).
 * 2. Mission/Job Pre-caching (Prefetch active Job Orders/Work Orders for zero-signal operation).
 * 3. Store-and-Forward Outbox Queue (Queues mutations when offline and syncs via FIFO when online).
 * ============================================================================
 */

import { set, get, update, del, entries } from 'idb-keyval';
import { supabase } from '../supabaseClient';

// Storage Keys
const STAFF_PIN_CACHE_KEY = 'offline_staff_pin_hashes';
const ACTIVE_MISSIONS_CACHE_KEY = 'offline_active_missions';
const MUTATION_OUTBOX_KEY = 'offline_mutation_outbox';
const LAST_SYNC_TIMESTAMP_KEY = 'offline_last_sync_ts';

export interface StaffAuthCache {
  id: string;
  full_name: string;
  role: string;
  tenant_id: string;
  pin_hash: string; // SHA-256 or bcrypt hash of 6-digit PIN
  sbu_access: string[]; // e.g. ['WAREHOUSE', 'TRUCKING']
  cached_at: string;
}

export interface CachedMission {
  id: string;
  jo_number: string;
  status: string;
  sbu_type: string;
  customer_name?: string;
  plate_number?: string;
  driver_name?: string;
  origin?: string;
  destination?: string;
  items?: any[];
  updated_at: string;
}

export interface MutationAction {
  id: string; // UUID of mutation
  type: 'SCAN_ITEM' | 'UPDATE_JO_STATUS' | 'UPLOAD_POD' | 'STOCK_OPNAME_COUNT' | 'UPDATE_MILESTONE' | 'GPS_PING';
  payload: Record<string, any>;
  tenant_id: string;
  user_id?: string;
  created_at: string;
  status: 'PENDING' | 'SYNCING' | 'FAILED';
  retry_count: number;
  error_message?: string;
}

export interface GpsPing {
  id: string;
  client_ping_id: string;
  job_order_id: string;
  lat: number;
  lng: number;
  timestamp: string;
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  retry_count: number;
  source?: string;
  battery?: number;
  speed?: number;
  accuracy?: number;
}

const GPS_PING_QUEUE_KEY = 'offline_gps_ping_queue';

const GPS_SYNC_SESSION_ID = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
if (typeof window !== 'undefined') {
  console.info(`[GPS_SYNC_FORENSIC] SESSION_START id=${GPS_SYNC_SESSION_ID}`);
}

/**
 * ----------------------------------------------------------------------------
 * 1. LOCAL PIN AUTHENTICATION CACHE
 * ----------------------------------------------------------------------------
 */
export async function cacheStaffPinAuth(staffList: StaffAuthCache[]): Promise<void> {
  try {
    const map: Record<string, StaffAuthCache> = {};
    staffList.forEach(s => {
      map[s.pin_hash] = s;
    });
    await set(STAFF_PIN_CACHE_KEY, map);
    console.info(`[OfflineSyncEngine] Cached ${staffList.length} staff PIN credentials locally.`);
  } catch (err) {
    console.error('[OfflineSyncEngine] Failed to cache staff credentials:', err);
  }
}

export async function verifyStaffPinLocal(inputPinHash: string): Promise<StaffAuthCache | null> {
  try {
    const map: Record<string, StaffAuthCache> | undefined = await get(STAFF_PIN_CACHE_KEY);
    if (!map) return null;
    return map[inputPinHash] || null;
  } catch (err) {
    console.error('[OfflineSyncEngine] Local PIN verification error:', err);
    return null;
  }
}

/**
 * ----------------------------------------------------------------------------
 * 2. MISSION & JOB PREFETCHING CACHE
 * ----------------------------------------------------------------------------
 */
export async function cacheActiveMissions(missions: CachedMission[]): Promise<void> {
  try {
    await set(ACTIVE_MISSIONS_CACHE_KEY, missions);
    await set(LAST_SYNC_TIMESTAMP_KEY, new Date().toISOString());
  } catch (err) {
    console.error('[OfflineSyncEngine] Failed to cache active missions:', err);
  }
}

export async function getCachedActiveMissions(): Promise<CachedMission[]> {
  try {
    const missions: CachedMission[] | undefined = await get(ACTIVE_MISSIONS_CACHE_KEY);
    return missions || [];
  } catch (err) {
    console.error('[OfflineSyncEngine] Failed to retrieve cached missions:', err);
    return [];
  }
}

/**
 * ----------------------------------------------------------------------------
 * 3. STORE-AND-FORWARD MUTATION OUTBOX QUEUE
 * ----------------------------------------------------------------------------
 */
export async function enqueueMutation(
  type: MutationAction['type'],
  payload: Record<string, any>,
  tenant_id: string,
  user_id?: string
): Promise<MutationAction> {
  const mutation: MutationAction = {
    id: `mut_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    type,
    payload,
    tenant_id,
    user_id,
    created_at: new Date().toISOString(),
    status: 'PENDING',
    retry_count: 0
  };

  await update(MUTATION_OUTBOX_KEY, (queue: MutationAction[] | undefined) => {
    const currentQueue = queue || [];
    return [...currentQueue, mutation];
  });

  console.info(`[OfflineSyncEngine] Enqueued offline mutation [${type}] ID: ${mutation.id}`);
  return mutation;
}

export async function getPendingMutations(): Promise<MutationAction[]> {
  try {
    const queue: MutationAction[] | undefined = await get(MUTATION_OUTBOX_KEY);
    return (queue || []).filter(m => m.status === 'PENDING' || m.status === 'FAILED');
  } catch (err) {
    console.error('[OfflineSyncEngine] Error retrieving pending mutations:', err);
    return [];
  }
}

export async function clearCompletedMutations(): Promise<void> {
  await update(MUTATION_OUTBOX_KEY, (queue: MutationAction[] | undefined) => {
    if (!queue) return [];
    return queue.filter(m => m.status !== 'SYNCING' && m.status !== 'PENDING');
  });
}

/**
 * ----------------------------------------------------------------------------
 * 4. CLOUD SYNCHRONIZATION EXECUTOR (FIFO PROCESSOR)
 * ----------------------------------------------------------------------------
 */
export async function syncOutboxQueueToCloud(): Promise<{ syncedCount: number; failedCount: number }> {
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    console.warn('[OfflineSyncEngine] Device is offline. Skipping sync queue execution.');
    return { syncedCount: 0, failedCount: 0 };
  }

  const pending = await getPendingMutations();
  if (pending.length === 0) {
    return { syncedCount: 0, failedCount: 0 };
  }

  console.info(`[OfflineSyncEngine] Starting background sync for ${pending.length} mutations...`);
  let syncedCount = 0;
  let failedCount = 0;

  for (const item of pending) {
    try {
      // Mark as syncing
      await updateMutationStatus(item.id, 'SYNCING');

      // Execute payload to Supabase based on type
      let resultError: any = null;

      if (item.type === 'UPDATE_JO_STATUS') {
        const { error } = await supabase
          .from('job_orders')
          .update({ status: item.payload.status, updated_at: new Date().toISOString() })
          .eq('id', item.payload.jo_id);
        resultError = error;
      } else if (item.type === 'SCAN_ITEM') {
        const { error } = await supabase
          .from('wh_inventory_items')
          .update({ actual_qty: item.payload.actual_qty })
          .eq('id', item.payload.item_id);
        resultError = error;
      } else if (item.type === 'UPDATE_MILESTONE') {
        const { error } = await supabase
          .from('jo_milestones')
          .insert({
            jo_id: item.payload.jo_id,
            milestone_type: item.payload.milestone_type,
            notes: item.payload.notes,
            created_at: item.created_at
          });
        resultError = error;
      }

      if (resultError) {
        throw resultError;
      }

      // Remove or mark success
      await removeMutationFromQueue(item.id);
      syncedCount++;
      console.info(`[OfflineSyncEngine] Successfully synced mutation ${item.id}`);
    } catch (err: any) {
      console.error(`[OfflineSyncEngine] Failed to sync mutation ${item.id}:`, err);
      failedCount++;
      await updateMutationStatus(item.id, 'FAILED', err?.message || 'Unknown network error');
    }
  }

  await set(LAST_SYNC_TIMESTAMP_KEY, new Date().toISOString());
  return { syncedCount, failedCount };
}

async function updateMutationStatus(id: string, status: MutationAction['status'], errorMsg?: string): Promise<void> {
  await update(MUTATION_OUTBOX_KEY, (queue: MutationAction[] | undefined) => {
    if (!queue) return [];
    return queue.map(m => m.id === id ? { ...m, status, error_message: errorMsg, retry_count: m.retry_count + (status === 'FAILED' ? 1 : 0) } : m);
  });
}

async function removeMutationFromQueue(id: string): Promise<void> {
  await update(MUTATION_OUTBOX_KEY, (queue: MutationAction[] | undefined) => {
    if (!queue) return [];
    return queue.filter(m => m.id !== id);
  });
}

/**
 * ----------------------------------------------------------------------------
 * 5. GPS PING QUEUE (Offline GPS Store-and-Forward)
 * ----------------------------------------------------------------------------
 */
export async function enqueueGpsPing(
  jobOrderId: string,
  lat: number,
  lng: number,
  source?: string,
  battery?: number,
  speed?: number,
  accuracy?: number,
): Promise<GpsPing> {
  const clientPingId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `uuid_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const ping: GpsPing = {
    id: clientPingId,
    client_ping_id: clientPingId,
    job_order_id: jobOrderId,
    lat,
    lng,
    timestamp: new Date().toISOString(),
    status: 'PENDING',
    retry_count: 0,
    source,
    battery,
    speed,
    accuracy,
  };

  await update(GPS_PING_QUEUE_KEY, (queue: GpsPing[] | undefined) => {
    const current = queue || [];
    return [...current, ping];
  });

  const caller = new Error().stack?.split('\n')[2]?.trim() || 'unknown caller';
  console.info(`[GPS_SYNC_FORENSIC] ENQUEUE local_id=${ping.id} client_ping_id=${ping.client_ping_id} canonical_ping_id=${clientPingId} source=${source || 'unknown'} caller="${caller}" recorded_at=${ping.timestamp}`);
  return ping;
}

export async function getPendingGpsPings(): Promise<GpsPing[]> {
  try {
    const queue: GpsPing[] | undefined = await get(GPS_PING_QUEUE_KEY);

    const pending = (queue || []).filter(
      p =>
        p.status === 'PENDING' ||
        p.status === 'FAILED' ||
        p.status === 'SYNCING'
    );

    if (pending.length > 0) {
      const ids = pending
        .map(p => p.client_ping_id || p.id)
        .join(',');

      console.info(
        `[GPS_SYNC_FORENSIC] READ_PENDING ` +
        `queue_storage_source=indexeddb ` +
        `pending_count=${pending.length} ` +
        `ids=${ids}`
      );
    }

    return pending;
  } catch (err) {
    console.error(
      '[OfflineSyncEngine] Error retrieving GPS pings:',
      err
    );
    return [];
  }
}

export async function getGpsPingQueueLength(): Promise<number> {
  try {
    const queue: GpsPing[] | undefined = await get(GPS_PING_QUEUE_KEY);
    return (queue || []).length;
  } catch {
    return 0;
  }
}

async function removeGpsPingFromQueue(id: string): Promise<void> {
  await update(GPS_PING_QUEUE_KEY, (queue: GpsPing[] | undefined) => {
    if (!queue) return [];
    return queue.filter(p => p.id !== id);
  });
}

async function updateGpsPingStatus(id: string, status: GpsPing['status']): Promise<void> {
  await update(GPS_PING_QUEUE_KEY, (queue: GpsPing[] | undefined) => {
    if (!queue) return [];
    return queue.map(p => p.id === id ? { ...p, status, retry_count: p.retry_count + (status === 'FAILED' ? 1 : 0) } : p);
  });
}

/**
 * ----------------------------------------------------------------------------
 * 6. GPS-PRIORITY SYNC: GPS pings first, then other mutations
 * ----------------------------------------------------------------------------
 */
export async function syncGpsPingsFirst(): Promise<{ syncedGps: number; syncedMutations: number; failedCount: number }> {
  if (typeof window !== 'undefined' && !window.navigator.onLine) {
    return { syncedGps: 0, syncedMutations: 0, failedCount: 0 };
  }

  // Step 1: Sync GPS pings first (highest priority)
  // Use the PATCH API endpoint to get full processing: debounce, job_tracking, fleet_gps_status, geofence
  const gpsPings = await getPendingGpsPings();
  let syncedGps = 0;
  let failedCount = 0;

  if (gpsPings.length > 0) {
    const batch = gpsPings.slice(0, 50);
    const grouped: Record<string, GpsPing[]> = {};
    for (const p of batch) {
      if (!grouped[p.job_order_id]) grouped[p.job_order_id] = [];
      grouped[p.job_order_id].push(p);
    }

    for (const [joId, pings] of Object.entries(grouped)) {
      try {
        const pingIds = pings.map(p => p.id);
        const canonicalIds = pings.map(p => p.client_ping_id || p.id).join(',');
        
        let oldest = pings[0].timestamp;
        let newest = pings[0].timestamp;
        pings.forEach(p => {
          if (new Date(p.timestamp) < new Date(oldest)) oldest = p.timestamp;
          if (new Date(p.timestamp) > new Date(newest)) newest = p.timestamp;
        });

        console.info(`[GPS_SYNC_FORENSIC] QUEUE_SNAPSHOT_BEFORE count=${pings.length} ids=[${canonicalIds}] recorded_at_range=${oldest}_TO_${newest} oldest_recorded_at=${oldest} newest_recorded_at=${newest}`);

        await update(GPS_PING_QUEUE_KEY, (queue: GpsPing[] | undefined) => {
          if (!queue) return [];
          return queue.map(p => pingIds.includes(p.id) ? { ...p, status: 'SYNCING' } : p);
        });

        // Need driverId for strict auth
        const driverId = localStorage.getItem('sentralogis_driver_id') || '';

        const payload = {
          action: 'gps_ping_batch',
          pings: pings.map(p => {
            const canonicalPingId = p.client_ping_id || p.id;
            console.info(`[GPS_SYNC_FORENSIC] payload canonical_ping_id: ${canonicalPingId}, job_order_id: ${joId}, recorded_at: ${p.timestamp}`);
            return {
              client_ping_id: canonicalPingId,
              latitude: p.lat,
            longitude: p.lng,
            recorded_at: p.timestamp,
            source: p.source || 'pwa_batch',
            battery: p.battery,
            speed: p.speed,
            accuracy: p.accuracy
            };
          }),
          internet_connected: true,
          background_running: true
        };

        const response = await fetch(`/api/jo/${joId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'ngrok-skip-browser-warning': 'true',
            'x-driver-id': driverId
          },
          body: JSON.stringify(payload),
        });

        console.info(`[GPS_SYNC_FORENSIC] request_start: PATCH /api/jo/${joId}, batch_count: ${pings.length}`);


        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`API ${response.status}: ${errText}`);
        }

        const resData = await response.json();
        console.info(`[GPS_SYNC_FORENSIC] http_status: ${response.status}, response_ok: ${response.ok}`);
        
        if (resData.success) {
           const acceptedIds = [...(resData.ack?.accepted || []), ...(resData.ack?.duplicates || [])];
           console.info(`[GPS_SYNC_FORENSIC] QUEUE_SNAPSHOT_AFTER_ACK count=${acceptedIds.length} ids=[${acceptedIds.join(',')}]`);
           
           await update(GPS_PING_QUEUE_KEY, (queue: GpsPing[] | undefined) => {
             if (!queue) return [];
             const remaining = queue.filter(p => {
               const canonicalPingId = p.client_ping_id || p.id;
               return !acceptedIds.includes(canonicalPingId);
             });
             
             const remainingIds = remaining.map(p => p.client_ping_id || p.id).join(',');
             console.info(`[GPS_SYNC_FORENSIC] FILTER_QUEUE mark_synced=${acceptedIds.length} remain_pending=${remaining.length} remaining_ids=[${remainingIds}]`);
             return remaining;
           });
           
           const queueAfter: GpsPing[] | undefined = await get(GPS_PING_QUEUE_KEY);
           const pendingAfter = (queueAfter || []).filter(
             p =>
               p.status === 'PENDING' ||
               p.status === 'FAILED' ||
               p.status === 'SYNCING'
           );
           console.info(`[GPS_SYNC_FORENSIC] INDEXEDDB_RE_READ count=${pendingAfter.length} ids=[${pendingAfter.map(p => p.client_ping_id || p.id).join(',')}]`);
           syncedGps += acceptedIds.length;
           
           if (resData.geofence_triggered && typeof window !== 'undefined') {
             window.dispatchEvent(
               new CustomEvent("sentralogis:geofence_arrival", {
                 detail: resData,
               })
             );
           }
           if (resData.jo_status && typeof window !== 'undefined') {
             window.dispatchEvent(
               new CustomEvent("sentralogis:jo_completed", {
                 detail: { status: resData.jo_status },
               })
             );
           }
        } else {
           throw new Error(resData.error || 'Batch failed');
        }
      } catch (err: any) {
        console.error(`[OfflineSyncEngine] GPS ping batch failed for JO ${joId}:`, err);
        failedCount += pings.length;
        await update(GPS_PING_QUEUE_KEY, (queue: GpsPing[] | undefined) => {
          if (!queue) return [];
          return queue.map(p => pings.some(ping => ping.id === p.id) ? { ...p, status: 'PENDING' } : p);
        });
      }
    }
  }

  // Step 2: Sync remaining mutations (FIFO)
  const mutations = await syncOutboxQueueToCloud();

  return { syncedGps, syncedMutations: mutations.syncedCount, failedCount: failedCount + mutations.failedCount };
}
