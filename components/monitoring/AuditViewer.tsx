'use client';

import { Card, CardHeader, CardContent } from '@/components/ui/Card';
import { FileText, Search } from 'lucide-react';

export default function AuditViewer({ logs }: { logs: Array<Record<string, unknown>> }) {
  return (
    <Card>
      <CardHeader className="flex items-center gap-2">
        <FileText className="w-5 h-5 text-slate-700" />
        <h2 className="text-sm font-bold uppercase tracking-widest text-slate-700">Audit Trail</h2>
      </CardHeader>
      <CardContent className="p-0">
        {logs.length === 0 ? (
          <div className="p-6 text-center text-sm text-slate-400">
            <Search className="w-8 h-8 mx-auto mb-2 text-slate-300" />
            No audit events yet
          </div>
        ) : (
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {logs.map((log: any) => (
              <div key={log.id} className="p-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-400 font-mono shrink-0">{new Date(log.created_at).toLocaleTimeString()}</span>
                  <span className="font-semibold text-slate-900">{log.action}</span>
                  <span className="text-slate-500">{log.module}</span>
                </div>
                {(log.user_name || log.reference_id) && (
                  <div className="text-[10px] text-slate-400 mt-0.5 ml-14">
                    {log.user_name && <span>by {log.user_name} </span>}
                    {log.reference_id && <span className="font-mono">{log.reference_id}</span>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
