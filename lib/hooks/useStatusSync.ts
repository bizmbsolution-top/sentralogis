import { useState, useEffect, useCallback } from 'react';

interface SyncResult {
  success: boolean;
  summary?: {
    drivers_reset: number;
    drivers_reset_with_shift: number;
    fleets_reset: number;
    total_resets: number;
  };
  current_status?: {
    on_duty_drivers: number;
    on_road_fleets: number;
    active_jobs: number;
    stuck_drivers: number;
    stuck_fleets: number;
  };
  error?: string;
}

/**
 * Hook for periodic driver/fleet status synchronization.
 * 
 * Usage:
 * - In dashboard pages to keep status in sync
 * - Auto-syncs every 5 minutes by default
 * - Can trigger manual sync
 * 
 * @param options.autoSync - Enable automatic periodic sync (default: true)
 * @param options.intervalMs - Sync interval in milliseconds (default: 300000 = 5 min)
 * @param options.enabled - Enable/disable the hook (default: true)
 */
export function useStatusSync(options: { autoSync?: boolean; intervalMs?: number; enabled?: boolean } = {}) {
  const { autoSync = true, intervalMs = 300000, enabled = true } = options;
  
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const syncStatus = useCallback(async (dryRun = false): Promise<SyncResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/sync-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun })
      });

      const result = await response.json();
      
      if (!result.success) {
        setError(result.error || 'Sync failed');
        setLastResult({ success: false, error: result.error });
        return { success: false, error: result.error };
      }

      setLastSync(new Date());
      setLastResult(result);
      return result;
    } catch (err: any) {
      const errorMsg = err.message || 'Network error during sync';
      setError(errorMsg);
      setLastResult({ success: false, error: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  const getStatus = useCallback(async (): Promise<SyncResult> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/admin/sync-status');
      const result = await response.json();
      
      if (!result.success) {
        setError(result.error || 'Failed to get status');
        setLastResult({ success: false, error: result.error });
        return { success: false, error: result.error };
      }

      setLastSync(new Date());
      setLastResult(result);
      return result;
    } catch (err: any) {
      const errorMsg = err.message || 'Network error';
      setError(errorMsg);
      setLastResult({ success: false, error: errorMsg });
      return { success: false, error: errorMsg };
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-sync on interval
  useEffect(() => {
    if (!enabled || !autoSync) return;

    // Initial sync
    getStatus();

    const interval = setInterval(() => {
      getStatus();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [enabled, autoSync, intervalMs, getStatus]);

  return {
    loading,
    lastSync,
    lastResult,
    error,
    syncStatus,
    getStatus
  };
}
