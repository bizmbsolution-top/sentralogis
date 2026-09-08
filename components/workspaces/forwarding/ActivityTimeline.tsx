import React from 'react';
import { Clock, CheckCircle2, MapPin, ShieldCheck, Flag } from 'lucide-react';
import { Milestone } from '@/lib/domain/shipment/types';

interface ActivityTimelineProps {
  milestones: Milestone[];
}

export const ActivityTimeline: React.FC<ActivityTimelineProps> = ({ milestones }) => {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Operational Audit Timeline
          </span>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight mt-0.5">
            Milestone History ({milestones.length})
          </h3>
        </div>
      </div>

      {milestones.length === 0 ? (
        <div className="bg-slate-50 border border-dashed border-slate-300 rounded-xl p-8 text-center text-xs text-slate-400">
          No operational milestones recorded yet.
        </div>
      ) : (
        <div className="relative pl-6 border-l-2 border-slate-200 space-y-6 my-2">
          {milestones.map((m, idx) => (
            <div key={m.id || idx} className="relative group">
              {/* Timeline Pin Indicator */}
              <div className="absolute -left-[31px] top-0.5 w-4 h-4 rounded-full bg-white border-2 border-blue-600 flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600" />
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900 font-mono">
                    {m.milestone_code}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    {new Date(m.occurred_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed">
                  {m.milestone_label || 'Milestone event recorded.'}
                </p>

                {m.recorded_by && (
                  <span className="text-[10px] text-slate-400 font-mono block">
                    Recorded by: {m.recorded_by}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
