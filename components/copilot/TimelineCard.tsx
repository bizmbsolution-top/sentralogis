import React from 'react';

interface TimelineEvent {
  time: string;
  title: string;
  status: 'DONE' | 'ACTIVE' | 'PENDING';
}

interface TimelineCardProps {
  events: TimelineEvent[];
}

export default function TimelineCard({ events }: TimelineCardProps) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4 w-full max-w-md my-2">
      <h3 className="text-sm font-semibold text-slate-900 mb-3">Live Timeline</h3>
      <div className="relative border-l border-slate-200 ml-2 space-y-4">
        {events.map((evt, idx) => {
          let dotColor = 'bg-slate-300';
          let textColor = 'text-slate-500';
          
          if (evt.status === 'DONE') {
            dotColor = 'bg-emerald-500 ring-4 ring-emerald-50';
            textColor = 'text-slate-700 font-medium';
          } else if (evt.status === 'ACTIVE') {
            dotColor = 'bg-blue-500 ring-4 ring-blue-50';
            textColor = 'text-blue-700 font-semibold';
          }

          return (
            <div key={idx} className="relative pl-5">
              <div className={`absolute -left-[5px] top-1.5 w-2 h-2 rounded-full ${dotColor}`} />
              <div className="flex justify-between items-start">
                <span className={`text-sm ${textColor}`}>{evt.title}</span>
                <span className="text-xs text-slate-400 tabular-nums">{evt.time}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
