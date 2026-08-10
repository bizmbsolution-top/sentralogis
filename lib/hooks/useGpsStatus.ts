import { useState, useEffect } from 'react';
import { Capacitor, registerPlugin } from '@capacitor/core';

interface NativeGpsPlugin {
  startTracking(options: { jobId: string; apiUrl: string }): Promise<void>;
  stopTracking(): Promise<void>;
  openBatterySettings(): Promise<void>;
  getDeviceInfo(): Promise<{ manufacturer: string; brand: string; model: string; batteryOptimizationIgnored: boolean }>;
  isGpsEnabled(): Promise<{ enabled: boolean }>;
  openLocationSettings(): Promise<void>;
  speakText(options: { text: string; lang: string }): Promise<void>;
  addListener(eventName: 'onLocationUpdate', listenerFunc: (data: any) => void): Promise<any>;
}

const NativeGps = registerPlugin<NativeGpsPlugin>('NativeGps');

export function useGpsStatus(isNative: boolean | null) {
  const [gpsEnabled, setGpsEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const checkStatus = async () => {
      try {
        if (isNative) {
          const result = await NativeGps.isGpsEnabled();
          setGpsEnabled(result.enabled);
        } else {
          if (typeof navigator !== 'undefined' && 'permissions' in navigator) {
            const perm = await navigator.permissions.query({ name: 'geolocation' });
            setGpsEnabled(perm.state === 'granted' || perm.state === 'prompt');
          } else {
            setGpsEnabled(false);
          }
        }
      } catch (e) {
        console.warn('Error checking GPS status', e);
      }
    };

    checkStatus();
    intervalId = setInterval(checkStatus, 2000);

    return () => clearInterval(intervalId);
  }, [isNative]);

  const openLocationSettings = async () => {
    try {
      if (isNative) {
        await NativeGps.openLocationSettings();
      } else {
        alert('Mohon aktifkan GPS atau izinkan akses lokasi pada browser Anda.');
      }
    } catch (e) {
      console.warn('Error opening location settings', e);
    }
  };

  return { gpsEnabled, openLocationSettings };
}
