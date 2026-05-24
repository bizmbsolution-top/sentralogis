'use client';

import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Gauge, TrendingUp } from 'lucide-react';
import type { PerformanceMetric } from './types';

export default function PerformancePanel({ metrics }: { metrics: PerformanceMetric[] }) {
  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Gauge className="w-5 h-5 text-slate-700" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700">Performance</h2>
      </CardHeader>
      <CardContent className="p-0">
        {metrics.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No performance data yet
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {metrics.map((m, i) => (
              <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50">
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 truncate">{m.endpoint}</p>
                  <p className="text-[10px] text-slate-400">{m.calls} calls</p>
                </div>
                <div className="flex items-center gap-3 text-xs text-right shrink-0">
                  <div>
                    <p className="text-slate-400">Avg</p>
                    <p className="font-semibold text-slate-900">{m.avg_response_ms}ms</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Errors</p>
                    <Badge variant={m.error_count > 0 ? 'danger' : 'success'} className="text-[10px]">{m.error_count}</Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
