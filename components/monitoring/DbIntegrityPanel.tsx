'use client';

import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Database, AlertTriangle } from 'lucide-react';
import type { DbIntegrityIssue } from './types';

const severityVariant: Record<string, 'danger' | 'warning' | 'default'> = {
  high: 'danger', medium: 'warning', low: 'default',
};

export default function DbIntegrityPanel({ issues }: { issues: DbIntegrityIssue[] }) {
  const total = issues.reduce((s, i) => s + i.count, 0);
  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <Database className="w-5 h-5 text-slate-700" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700">DB Integrity</h2>
      </CardHeader>
      <CardContent className="p-0">
        {issues.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">No integrity issues found</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {issues.map((issue, i) => (
              <div key={i} className="flex items-center justify-between p-3 hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  <div>
                    <p className="text-xs font-semibold text-slate-900 capitalize">{issue.type.replace('_', ' ')}</p>
                    <p className="text-[10px] text-slate-400">{issue.table}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-slate-700">{issue.count}</span>
                  <Badge variant={severityVariant[issue.severity]} className="text-[10px]">{issue.severity}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
