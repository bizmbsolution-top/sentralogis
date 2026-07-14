'use client';

import { useEffect, useState } from 'react';
import { getDataUsage, incrementDataSent, incrementDataReceived } from '@/lib/tallyStore';
import { Wifi, WifiOff, HardDrive, RotateCcw } from 'lucide-react';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function DataUsageCard() {
  const [usage, setUsage] = useState<{ sent: number; received: number } | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const data = await getDataUsage();
      setUsage(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleReset = async () => {
    await incrementDataSent(-(usage?.sent || 0));
    await incrementDataReceived(-(usage?.received || 0));
    setUsage({ sent: 0, received: 0 });
  };

  if (loading) {
    return (
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm animate-pulse h-24" />
    );
  }

  const total = (usage?.sent || 0) + (usage?.received || 0);

  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2">
          <HardDrive size={16} className="text-slate-400" />
          Pemakaian Data
        </h3>
        <button
          onClick={handleReset}
          className="text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-rose-500 flex items-center gap-1"
        >
          <RotateCcw size={12} /> Reset
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-blue-500 mb-1 flex items-center gap-1">
            <Wifi size={12} /> Terkirim (Upload)
          </p>
          <p className="text-lg font-black text-blue-700">{formatBytes(usage?.sent || 0)}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1 flex items-center gap-1">
            <WifiOff size={12} /> Terdownload (Download)
          </p>
          <p className="text-lg font-black text-emerald-700">{formatBytes(usage?.received || 0)}</p>
        </div>
      </div>

      <p className="text-[10px] text-slate-400 mt-2 text-center font-medium">
        Total: {formatBytes(total)} — Hemat di sinyal lemah
      </p>
    </div>
  );
}