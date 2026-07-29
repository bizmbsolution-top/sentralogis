'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPendingMutations, syncGpsPingsFirst, getGpsPingQueueLength } from '../offline/offlineSyncEngine';

export interface OfflineStatus {
  isOnline: boolean;
  pendingCount: number;
  gpsQueueLength: number;
  isSyncing: boolean;
  lastSyncResult: { syncedGps: number; syncedMutations: number; failedCount: number } | null;
  syncNow: () => Promise<void>;
  refreshQueueCount: () => Promise<void>;
}

export function useOfflineStatus(): OfflineStatus {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [gpsQueueLength, setGpsQueueLength] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ syncedGps: number; syncedMutations: number; failedCount: number } | null>(null);

  const refreshQueueCount = useCallback(async () => {
    try {
      const pending = await getPendingMutations();
      setPendingCount(pending.length);
      const gpsLen = await getGpsPingQueueLength();
      setGpsQueueLength(gpsLen);
    } catch (err) {
      console.error('[useOfflineStatus] Failed to refresh queue count:', err);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (isSyncing || typeof window === 'undefined' || !window.navigator.onLine) return;
    setIsSyncing(true);
    try {
      const result = await syncGpsPingsFirst();
      setLastSyncResult(result);
      await refreshQueueCount();
    } catch (err) {
      console.error('[useOfflineStatus] Manual sync trigger failed:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, refreshQueueCount]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    setIsOnline(window.navigator.onLine);
    refreshQueueCount();

    const handleOnline = () => {
      console.info('[useOfflineStatus] Network online detected. Triggering GPS-first auto-sync...');
      setIsOnline(true);
      syncNow();
    };

    const handleOffline = () => {
      console.warn('[useOfflineStatus] Network offline detected. GPS pings will be queued locally.');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // GPS queue checked more frequently (every 15s), full sync every 30s
    const gpsIntervalId = setInterval(() => {
      refreshQueueCount();
    }, 15000);

    const syncIntervalId = setInterval(() => {
      if (window.navigator.onLine) {
        syncNow();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(gpsIntervalId);
      clearInterval(syncIntervalId);
    };
  }, [refreshQueueCount, syncNow]);

  return {
    isOnline,
    pendingCount,
    gpsQueueLength,
    isSyncing,
    lastSyncResult,
    syncNow,
    refreshQueueCount
  };
}
