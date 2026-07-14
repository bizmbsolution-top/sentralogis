'use client';

import { Wifi, WifiOff, Signal } from 'lucide-react';
import { useNetworkStatus } from '@/lib/hooks/useNetworkStatus';

export function NetworkIndicator() {
  const { isOnline, quality } = useNetworkStatus();

  if (!isOnline || quality === 'offline') {
    return (
      <div className="fixed top-0 left-0 right-0 z-[60] bg-rose-600 text-white text-[11px] font-bold text-center py-1.5 uppercase tracking-widest flex items-center justify-center gap-2">
        <WifiOff size={14} />
        Mode Offline — Data Tersimpan Lokal
      </div>
    );
  }

  if (quality === 'weak') {
    return (
      <div className="fixed top-0 left-0 right-0 z-[60] bg-amber-500 text-white text-[11px] font-bold text-center py-1.5 uppercase tracking-widest flex items-center justify-center gap-2">
        <Signal size={14} />
        Sinyal Lemah — Mode Hemat (Foto Ditunda)
      </div>
    );
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-[60] bg-emerald-600 text-white text-[11px] font-bold text-center py-1.5 uppercase tracking-widest flex items-center justify-center gap-2">
      <Wifi size={14} />
      Online — Mode Normal
    </div>
  );
}