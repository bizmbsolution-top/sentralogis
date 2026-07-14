import { useState, useEffect } from 'react';

export type NetworkQuality = 'online' | 'weak' | 'offline';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );
  const [quality, setQuality] = useState<NetworkQuality>('online');

  useEffect(() => {
    const updateOnlineStatus = () => {
      const online = navigator.onLine;
      setIsOnline(online);
      if (!online) {
        setQuality('offline');
      } else {
        // Detect weak connection via Network Information API (Android/Chrome)
        const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
        if (conn) {
          const isWeak = conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g' || conn.saveData;
          setQuality(isWeak ? 'weak' : 'online');
        } else {
          setQuality('online');
        }
      }
    };

    const handleOnline = () => updateOnlineStatus();
    const handleOffline = () => updateOnlineStatus();
    const handleConnectionChange = () => updateOnlineStatus();

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    const conn = (navigator as any).connection;
    if (conn) {
      conn.addEventListener('change', handleConnectionChange);
    }

    updateOnlineStatus();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (conn) {
        conn.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return { isOnline, quality };
}