import React from 'react';
import { CheckSquare } from 'lucide-react';

export default function RecentExecutionCard() {
  const executions = [
    { title: 'Driver Budi Assigned', entity: 'JO-2309-112', time: '2m ago' },
    { title: 'Container TGHU123 Updated', entity: 'JO-2309-108', time: '15m ago' }
  ];

  return (
    <div className="mb-6">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <CheckSquare className="w-3.5 h-3.5" /> Recent Executions
      </h3>
      <div className="space-y-3 relative border-l border-slate-200 ml-1.5 pl-3">
        {executions.map((e, i) => (
          <div key={i} className="relative">
            <div className="absolute -left-[17px] top-1.5 w-2 h-2 rounded-full bg-slate-300" />
            <p className="text-xs font-medium text-slate-700 leading-tight">{e.title}</p>
            <p className="text-[10px] text-slate-400 mt-0.5">{e.entity} • {e.time}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
