'use client';

import { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { AlertTriangle, CheckCircle2, Eye, User as UserIcon } from 'lucide-react';
import type { CriticalAlert } from './types';

const severityVariant: Record<string, 'danger' | 'warning' | 'default'> = {
  critical: 'danger', high: 'warning', medium: 'default', low: 'default',
};

const statusVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  resolved: 'success', acknowledged: 'warning', open: 'danger',
};

export default function AlertTable({ alerts }: { alerts: CriticalAlert[] }) {
  const [filter, setFilter] = useState<string>('all');

  const filtered = filter === 'all' ? alerts : alerts.filter((a) => a.severity === filter);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700">Critical Alerts</h2>
        </div>
        <div className="flex gap-1">
          {['all', 'critical', 'high', 'medium'].map((s) => (
            <button key={s} onClick={() => setFilter(s)}
              className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors ${filter === s ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
              {s === 'all' ? 'All' : s}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">
            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-400" />
            No critical alerts right now
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtered.map((alert) => (
              <div key={alert.id} className="p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={severityVariant[alert.severity]}>{alert.severity}</Badge>
                      <span className="text-sm font-semibold text-slate-900 truncate">{alert.title}</span>
                    </div>
                    <p className="text-xs text-slate-600 mb-1">{alert.message}</p>
                    <div className="flex items-center gap-3 text-[10px] text-slate-400">
                      <span>{alert.module}</span>
                      <span>{new Date(alert.timestamp).toLocaleString()}</span>
                      {alert.assigned_to && <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" />{alert.assigned_to}</span>}
                      {alert.correlation_id && <span className="font-mono">{alert.correlation_id}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={statusVariant[alert.status]} className="text-[10px]">{alert.status}</Badge>
                    <button className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
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
