import { useEffect, useRef, useCallback } from 'react';

const ACTIVE_STATUSES = [
  'IN_PROGRESS', 'DALAM PERJALANAN', 'ON ROAD', 'ON JOURNEY', 'ON_ROAD',
  'START JOURNEY', 'STARTED', 'LOADING', 'UNLOADING', 'DELIVERING',
  'MENUNGGU SELESAI', 'MENUNGGU BERANGKAT', 'PICKING_UP',
  'ORDER DITERIMA', 'ACCEPTED',
];

const DONE_STATUSES = [
  'COMPLETED', 'PEKERJAAN SELESAI', 'SELESAI', 'DONE', 'INVOICED', 'PAID',
  'VERIFIED', 'READY_FOR_BILLING', 'AWAITING_AUDIT',
];

const INACTIVE_STATUSES = ['REJECTED', 'CANCELLED', 'DRAFT', 'PENDING'];

export function isActiveTransitStatus(status?: string): boolean {
  const s = (status || '').toUpperCase();
  if (!s || DONE_STATUSES.includes(s) || INACTIVE_STATUSES.includes(s)) return false;
  return (
    ACTIVE_STATUSES.includes(s) ||
    s.startsWith('MENUJU') ||
    s.startsWith('TIBA DI')
  );
}

const GPS_PING_INTERVAL_MS = 10_000; // 10 Seconds (10,000 ms)

export interface GeofenceArrivalEvent {
  geofence_triggered: boolean;
  arrived_stop: string | null;
  distance_m: number | null;
}

export function useDriverGpsPing(
  token: string | null | undefined,
  status: string | undefined,
  enabled = true,
  onGeofenceArrival?: (event: GeofenceArrivalEvent) => void
) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<any>(null);
  const isPingingRef = useRef<boolean>(false);

  const requestWakeLock = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        if (wakeLockRef.current) {
          try { await wakeLockRef.current.release(); } catch {}
        }
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
        console.log('[WakeLock] Screen wake lock acquired for active transit.');
      }
    } catch (err) {
      console.warn('[WakeLock] Could not acquire screen wake lock:', err);
    }
  }, []);

  const ping = useCallback(async () => {
    if (!enabled || !token || !isActiveTransitStatus(status) || isPingingRef.current) return;
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;

    isPingingRef.current = true;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 15_000,
          maximumAge: 30_000,
        });
      });

      const response = await fetch(`/api/jo/${token}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'gps_ping',
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result && result.geofence_triggered) {
          console.log('📍 [Geofence Triggered]', result);
          
          // 1. Haptic Vibration (Android/PWA)
          if (typeof navigator !== 'undefined' && navigator.vibrate) {
            navigator.vibrate([400, 150, 400, 150, 600]);
          }

          // 2. Audio Voice Prompt (SpeechSynthesis in Indonesian)
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            try {
              const msg = `Sentra Logis memberi tahu: Anda telah terdeteksi tiba di ${result.arrived_stop || 'titik rute pengiriman'}. Status rute otomatis diperbarui.`;
              const utterance = new SpeechSynthesisUtterance(msg);
              utterance.lang = 'id-ID';
              utterance.rate = 1.0;
              window.speechSynthesis.speak(utterance);
            } catch (err) {
              console.warn('[Speech] Voice synthesis error:', err);
            }
          }

          // 3. Callback to UI & Custom DOM Event
          if (onGeofenceArrival) {
            onGeofenceArrival(result);
          }
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('sentralogis:geofence_arrival', { detail: result }));
          }
        }
      }
    } catch (e) {
      console.warn('[GPS Ping] failed:', e);
    } finally {
      isPingingRef.current = false;
    }
  }, [token, status, enabled, onGeofenceArrival]);

  useEffect(() => {
    if (!enabled || !token || !isActiveTransitStatus(status)) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (wakeLockRef.current) {
        try { wakeLockRef.current.release(); } catch {}
        wakeLockRef.current = null;
      }
      return;
    }

    // Acquire wake lock & trigger initial ping right when active transit starts
    requestWakeLock();
    ping();
    intervalRef.current = setInterval(ping, GPS_PING_INTERVAL_MS);

    // Visibility change listener: when tab is refocused or screen unlocks, wake lock again and catch-up ping
    const handleVisibilityChange = () => {
      if (typeof document !== 'undefined' && !document.hidden && isActiveTransitStatus(status)) {
        requestWakeLock();
        ping();
      }
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      if (wakeLockRef.current) {
        try { wakeLockRef.current.release(); } catch {}
        wakeLockRef.current = null;
      }
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [token, status, enabled, ping, requestWakeLock]);
}
