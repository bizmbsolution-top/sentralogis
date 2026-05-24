'use client';

import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Activity, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import type { WorkflowStep } from './types';

const stepIcon = (status: string) => {
  switch (status) {
    case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
    case 'in_progress': return <Clock className="w-4 h-4 text-blue-500" />;
    case 'stuck': return <AlertTriangle className="w-4 h-4 text-red-500" />;
    default: return <Clock className="w-4 h-4 text-slate-300" />;
  }
};

const statusVariant: Record<string, 'success' | 'warning' | 'danger' | 'default'> = {
  completed: 'success', in_progress: 'warning', stuck: 'danger', pending: 'default',
};

export default function WorkflowTimeline({ workflows, title = 'Workflow Monitor' }: { workflows: WorkflowStep[]; title?: string }) {
  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Activity className="w-5 h-5 text-slate-700" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700">{title}</h2>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y divide-slate-100">
          {workflows.map((step, i) => (
            <div key={i} className="flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors">
              <div className="flex flex-col items-center">
                {stepIcon(step.status)}
                {i < workflows.length - 1 && <div className="w-px h-4 bg-slate-200 mt-1" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{step.step}</span>
                  <Badge variant={statusVariant[step.status]} className="text-[10px]">{step.status.replace('_', ' ')}</Badge>
                </div>
              </div>
              <span className="text-sm font-bold text-slate-700">{step.count}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
