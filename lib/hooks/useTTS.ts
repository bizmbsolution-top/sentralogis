import { useRef, useState } from 'react';
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

export function useTTS() {
  const spokenRef = useRef<boolean>(false);
  const [hasSpoken, setHasSpoken] = useState<boolean>(false);

  const speak = async (text: string, isNative: boolean | null) => {
    if (spokenRef.current) return;
    
    spokenRef.current = true;
    setHasSpoken(true);

    try {
      if (isNative) {
        await NativeGps.speakText({ text, lang: 'id-ID' });
      } else {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'id-ID';
          window.speechSynthesis.speak(utterance);
        } else {
          console.warn('TTS not supported in browser');
          console.log("[TTS] spoken=false");
          return;
        }
      }
      console.log("[TTS] spoken=true");
    } catch (e) {
      console.warn('Error speaking text', e);
      console.log("[TTS] spoken=false");
    }
  };

  return { speak, hasSpoken };
}
