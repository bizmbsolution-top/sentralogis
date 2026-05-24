'use client';

import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Bug, TrendingUp, TrendingDown, Minus, ArrowUpRight } from 'lucide-react';
import type { ErrorEntry } from './types';

const trendIcon = (trend: string) => {
  switch (trend) {
    case 'up': return <TrendingUp className="w-4 h-4 text-red-500" />;
    case 'down': return <TrendingDown className="w-4 h-4 text-green-500" />;
    default: return <Minus className="w-4 h-4 text-slate-400" />;
  }
};

export default function ErrorCenter({ errors }: { errors: ErrorEntry[] }) {
  const total = errors.reduce((s, e) => s + e.count, 0);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Bug className="w-5 h-5 text-red-500" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700">Error Center</h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="font-bold text-red-600">{total}</span> total
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {errors.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">No errors recorded</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {errors.map((err) => (
              <div key={err.id} className="flex items-center gap-3 p-3 hover:bg-slate-50 transition-colors">
                <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                  <Bug className="w-4 h-4 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-900 truncate">{err.message}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400">
                    <span className="font-medium text-slate-600">{err.module}</span>
                    <span>{err.count}x</span>
                    <span>{new Date(err.last_seen).toLocaleTimeString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {trendIcon(err.trend)}
                  <ArrowUpRight className="w-3 h-3 text-slate-300" />
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
