'use client';

import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Activity, Database, Wifi, Users, AlertTriangle, Timer } from 'lucide-react';
import type { SystemHealth } from './types';

const statusColor: Record<string, 'success' | 'warning' | 'danger'> = {
  online: 'success', healthy: 'success', connected: 'success',
  degraded: 'warning', slow: 'warning', delayed: 'warning',
  down: 'danger', error: 'danger', disconnected: 'danger', stuck: 'danger',
};

const statusIcon = (val: string) => {
  if (val === 'online' || val === 'healthy' || val === 'connected') return '🟢';
  if (val === 'degraded' || val === 'slow' || val === 'delayed') return '🟡';
  return '🔴';
};

export default function HealthCards({ health }: { health: SystemHealth }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1">
            <Activity className="w-4 h-4 text-slate-500" />
            <Badge variant={statusColor[health.api]} className="text-[10px]">{statusIcon(health.api)} {health.api}</Badge>
          </div>
          <p className="text-xs font-semibold text-slate-700">API Status</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1">
            <Database className="w-4 h-4 text-slate-500" />
            <Badge variant={statusColor[health.database]} className="text-[10px]">{statusIcon(health.database)} {health.database}</Badge>
          </div>
          <p className="text-xs font-semibold text-slate-700">Database</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1">
            <Wifi className="w-4 h-4 text-slate-500" />
            <Badge variant={statusColor[health.supabase]} className="text-[10px]">{statusIcon(health.supabase)} {health.supabase}</Badge>
          </div>
          <p className="text-xs font-semibold text-slate-700">Supabase</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1">
            <Users className="w-4 h-4 text-slate-500" />
            <span className="text-lg font-bold text-slate-900">{health.active_users}</span>
          </div>
          <p className="text-xs font-semibold text-slate-700">Active Users</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1">
            <AlertTriangle className="w-4 h-4 text-slate-500" />
            <Badge variant={health.error_rate > 5 ? 'danger' : health.error_rate > 1 ? 'warning' : 'success'} className="text-[10px]">{health.error_rate}%</Badge>
          </div>
          <p className="text-xs font-semibold text-slate-700">Error Rate</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-1">
            <Timer className="w-4 h-4 text-slate-500" />
            <Badge variant={statusColor[health.queue_status]} className="text-[10px]">{statusIcon(health.queue_status)} {health.queue_status}</Badge>
          </div>
          <p className="text-xs font-semibold text-slate-700">Queue Status</p>
        </CardContent>
      </Card>
    </div>
  );
}
