'use client';

import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Clock, Play, RefreshCw } from 'lucide-react';
import type { CronJobStatus } from './types';

export default function CronStatus({ crons, onRun }: { crons: CronJobStatus[]; onRun?: (name: string) => void }) {
  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Clock className="w-5 h-5 text-slate-700" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700">Cron Jobs</h2>
      </CardHeader>
      <CardContent className="p-0">
        {crons.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">
            <RefreshCw className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No cron jobs tracked yet
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {crons.map((cron) => (
              <div key={cron.name} className="flex items-center justify-between p-3 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${cron.status === 'success' ? 'bg-green-500' : cron.status === 'running' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                  <div>
                    <p className="text-xs font-semibold text-slate-900">{cron.name}</p>
                    <p className="text-[10px] text-slate-400">{new Date(cron.last_run).toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={cron.status === 'success' ? 'success' : cron.status === 'running' ? 'warning' : 'danger'} className="text-[10px]">{cron.status}</Badge>
                  {onRun && (
                    <button onClick={() => onRun(cron.name)} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
