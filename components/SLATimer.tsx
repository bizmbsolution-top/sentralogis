'use client';

import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';

interface SLATimerProps {
  assignedAt: string | null;
  slaMinutes?: number;
  compact?: boolean;
}

export default function SLATimer({ assignedAt, slaMinutes = 30, compact = false }: SLATimerProps) {
  const [remaining, setRemaining] = useState<number>(0);
  const [breached, setBreached] = useState(false);

  useEffect(() => {
    if (!assignedAt) {
      setRemaining(0);
      return;
    }

    const calculate = () => {
      const assigned = new Date(assignedAt).getTime();
      const deadline = assigned + slaMinutes * 60 * 1000;
      const now = Date.now();
      const diff = deadline - now;
      setRemaining(diff);
      setBreached(diff < 0);
    };

    calculate();
    const interval = setInterval(calculate, 1000);
    return () => clearInterval(interval);
  }, [assignedAt, slaMinutes]);

  if (!assignedAt) return null;

  const totalSeconds = Math.abs(Math.floor(remaining / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const percentage = Math.min(100, Math.max(0, (remaining / (slaMinutes * 60 * 1000)) * 100));

  const getColor = () => {
    if (breached) return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-300', bar: 'bg-red-500', label: 'text-red-500' };
    if (percentage < 17) return { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-300', bar: 'bg-orange-500', label: 'text-orange-500' };
    if (percentage < 50) return { bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-300', bar: 'bg-yellow-500', label: 'text-yellow-500' };
    return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300', bar: 'bg-emerald-500', label: 'text-emerald-500' };
  };

  const colors = getColor();

  if (compact) {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold ${colors.bg} ${colors.text} border ${colors.border}`}>
        {breached ? <AlertTriangle size={10} className="animate-pulse" /> : <Clock size={10} />}
        {breached ? `+${minutes}:${String(seconds).padStart(2, '0')}` : `${minutes}:${String(seconds).padStart(2, '0')}`}
      </div>
    );
  }

  return (
    <div className={`rounded-xl p-3 border ${colors.bg} ${colors.border}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          {breached ? (
            <AlertTriangle size={14} className={`${colors.text} animate-pulse`} />
          ) : (
            <Clock size={14} className={colors.text} />
          )}
          <span className={`text-xs font-bold ${colors.label} uppercase tracking-wider`}>
            {breached ? 'SLA BREACHED' : 'SLA Response'}
          </span>
        </div>
        <span className={`text-lg font-black ${colors.text} font-mono`}>
          {breached && '+'}{minutes}:{String(seconds).padStart(2, '0')}
        </span>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1.5 bg-white/60 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${colors.bar}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="flex justify-between mt-1.5">
        <span className="text-[10px] text-slate-400">0 min</span>
        <span className="text-[10px] text-slate-400">{slaMinutes} min</span>
      </div>
    </div>
  );
}
