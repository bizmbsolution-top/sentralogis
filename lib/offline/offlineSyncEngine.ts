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
  job_order_id: string;
  lat: number;
  lng: number;
  timestamp: string;
  status: 'PENDING' | 'SYNCED' | 'FAILED';
  retry_count: number;
}

const GPS_PING_QUEUE_KEY = 'offline_gps_ping_queue';

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
  lng: number
): Promise<GpsPing> {
  const ping: GpsPing = {
    id: `gps_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    job_order_id: jobOrderId,
    lat,
    lng,
    timestamp: new Date().toISOString(),
    status: 'PENDING',
    retry_count: 0,
  };

  await update(GPS_PING_QUEUE_KEY, (queue: GpsPing[] | undefined) => {
    const current = queue || [];
    return [...current, ping];
  });

  console.info(`[OfflineSyncEngine] Enqueued GPS ping: ${ping.id} for JO ${jobOrderId}`);
  return ping;
}

export async function getPendingGpsPings(): Promise<GpsPing[]> {
  try {
    const queue: GpsPing[] | undefined = await get(GPS_PING_QUEUE_KEY);
    return (queue || []).filter(p => p.status === 'PENDING' || p.status === 'FAILED');
  } catch (err) {
    console.error('[OfflineSyncEngine] Error retrieving GPS pings:', err);
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
  const gpsPings = await getPendingGpsPings();
  let syncedGps = 0;
  let failedCount = 0;

  for (const ping of gpsPings) {
    try {
      await updateGpsPingStatus(ping.id, 'SYNCED');
      const { error } = await supabase
        .from('job_tracking')
        .insert({
          job_order_id: ping.job_order_id,
          status_update: 'GPS_PING',
          latitude: ping.lat,
          longitude: ping.lng,
          notes: 'Offline GPS ping (queued)',
          created_at: ping.timestamp,
        });
      if (error) throw error;
      await removeGpsPingFromQueue(ping.id);
      syncedGps++;
    } catch (err: any) {
      console.error(`[OfflineSyncEngine] GPS ping sync failed:`, err);
      failedCount++;
      await updateGpsPingStatus(ping.id, 'FAILED');
    }
  }

  // Step 2: Sync remaining mutations (FIFO)
  const mutations = await syncOutboxQueueToCloud();

  return { syncedGps, syncedMutations: mutations.syncedCount, failedCount: failedCount + mutations.failedCount };
}
