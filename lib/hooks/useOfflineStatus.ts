'use client';

import { useState, useEffect, useCallback } from 'react';
import { getPendingMutations, syncOutboxQueueToCloud } from '../offline/offlineSyncEngine';

export interface OfflineStatus {
  isOnline: boolean;
  pendingCount: number;
  isSyncing: boolean;
  lastSyncResult: { syncedCount: number; failedCount: number } | null;
  syncNow: () => Promise<void>;
  refreshQueueCount: () => Promise<void>;
}

export function useOfflineStatus(): OfflineStatus {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncResult, setLastSyncResult] = useState<{ syncedCount: number; failedCount: number } | null>(null);

  const refreshQueueCount = useCallback(async () => {
    try {
      const pending = await getPendingMutations();
      setPendingCount(pending.length);
    } catch (err) {
      console.error('[useOfflineStatus] Failed to refresh queue count:', err);
    }
  }, []);

  const syncNow = useCallback(async () => {
    if (isSyncing || typeof window === 'undefined' || !window.navigator.onLine) return;
    setIsSyncing(true);
    try {
      const result = await syncOutboxQueueToCloud();
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

    // Initial check
    setIsOnline(window.navigator.onLine);
    refreshQueueCount();

    const handleOnline = () => {
      console.info('[useOfflineStatus] Network online detected. Triggering auto-sync...');
      setIsOnline(true);
      syncNow();
    };

    const handleOffline = () => {
      console.warn('[useOfflineStatus] Network offline detected. Switching to local outbox mode.');
      setIsOnline(false);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic poll of queue count and auto-sync every 30 seconds if online
    const intervalId = setInterval(() => {
      refreshQueueCount();
      if (window.navigator.onLine) {
        syncNow();
      }
    }, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, [refreshQueueCount, syncNow]);

  return {
    isOnline,
    pendingCount,
    isSyncing,
    lastSyncResult,
    syncNow,
    refreshQueueCount
  };
}
