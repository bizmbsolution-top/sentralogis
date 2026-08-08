import React from 'react';
import { CheckCircle2, XCircle, Clock } from 'lucide-react';

interface ExecutionResultCardProps {
  status: 'SUCCESS' | 'FAILURE';
  message: string;
  durationMs: number;
  timelineUpdates: string[];
}

export default function ExecutionResultCard({ status, message, durationMs, timelineUpdates }: ExecutionResultCardProps) {
  const isSuccess = status === 'SUCCESS';

  return (
    <div className={`border rounded-lg p-4 my-2 w-full max-w-md ${isSuccess ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
      <div className="flex items-center gap-2 mb-3">
        {isSuccess ? <CheckCircle2 className="w-5 h-5 text-emerald-600" /> : <XCircle className="w-5 h-5 text-red-600" />}
        <span className={`font-semibold ${isSuccess ? 'text-emerald-800' : 'text-red-800'}`}>
          {isSuccess ? 'Execution Successful' : 'Execution Failed'}
        </span>
      </div>
      
      <p className={`text-sm mb-4 ${isSuccess ? 'text-emerald-700' : 'text-red-700'}`}>{message}</p>

      {timelineUpdates.length > 0 && (
        <div className="space-y-2 mt-4 pt-4 border-t border-slate-200/50">
          <h4 className="text-xs font-semibold text-slate-500 uppercase">Updates</h4>
          <ul className="space-y-1">
            {timelineUpdates.map((update, idx) => (
              <li key={idx} className="text-sm text-slate-700 flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                {update}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-4 flex items-center gap-1 text-xs text-slate-400">
        <Clock className="w-3 h-3" />
        Executed in {durationMs}ms
      </div>
    </div>
  );
}
