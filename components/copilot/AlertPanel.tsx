import React from 'react';
import { Bell } from 'lucide-react';

export default function AlertPanel() {
  const alerts = [
    { title: 'GPS Mismatch', entity: 'JO-991', time: '10m ago' },
    { title: 'Missing POD', entity: 'JO-882', time: '1h ago' }
  ];

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5" /> Unread Alerts
        </h3>
        <span className="bg-rose-100 text-rose-600 text-[10px] px-1.5 py-0.5 rounded-full font-bold">2</span>
      </div>
      <div className="space-y-2">
        {alerts.map((a, i) => (
          <div key={i} className="bg-rose-50 border border-rose-100 rounded-md p-2 flex justify-between items-center cursor-pointer hover:bg-rose-100/50 transition-colors">
            <div>
              <p className="text-xs font-semibold text-rose-800">{a.title}</p>
              <p className="text-[10px] text-rose-600">{a.entity}</p>
            </div>
            <span className="text-[10px] text-rose-500">{a.time}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
