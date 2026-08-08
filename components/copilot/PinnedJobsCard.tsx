import React from 'react';
import { Pin } from 'lucide-react';

export default function PinnedJobsCard() {
  const jobs = [
    { id: 'JO-1102', customer: 'PT Berkah Abadi', status: 'IN TRANSIT' },
    { id: 'JO-1105', customer: 'Global Logistik', status: 'LOADING' }
  ];

  return (
    <div className="mb-6">
      <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
        <Pin className="w-3.5 h-3.5" /> Pinned Jobs
      </h3>
      <div className="space-y-2">
        {jobs.map((j, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-md p-2 hover:border-slate-300 cursor-pointer transition-colors shadow-sm">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-indigo-700">{j.id}</span>
              <span className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded font-medium">{j.status}</span>
            </div>
            <p className="text-[10px] text-slate-500 truncate">{j.customer}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
