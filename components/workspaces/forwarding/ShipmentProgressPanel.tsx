import React from 'react';
import { CheckCircle2, Clock, Circle, MapPin, ArrowRight } from 'lucide-react';
import { ExecutionLeg } from '@/lib/domain/shipment/types';

interface ShipmentProgressPanelProps {
  legs: ExecutionLeg[];
}

export const ShipmentProgressPanel: React.FC<ShipmentProgressPanelProps> = ({ legs }) => {
  if (legs.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm text-center text-xs text-slate-400">
        No execution legs defined to calculate progress.
      </div>
    );
  }

  const completedCount = legs.filter(l => l.status === 'COMPLETED').length;
  const progressPercent = Math.round((completedCount / legs.length) * 100);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Operational Progress
          </span>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight mt-0.5">
            {completedCount} of {legs.length} Legs Completed ({progressPercent}%)
          </h3>
        </div>
        <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
          {progressPercent}%
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
        <div
          className="bg-blue-600 h-full rounded-full transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Step Sequence List */}
      <div className="space-y-2 pt-2">
        {legs.map((leg, idx) => {
          const isDone = leg.status === 'COMPLETED';
          const isCurrent = leg.status === 'EXECUTING' || leg.status === 'IN_PROGRESS' || leg.status === 'DISPATCHED';

          return (
            <div
              key={leg.id || idx}
              className={`p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                isDone
                  ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                  : isCurrent
                  ? 'bg-blue-50/70 border-blue-300 text-blue-950 font-semibold ring-1 ring-blue-400/30'
                  : 'bg-slate-50/60 border-slate-200 text-slate-600'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : isCurrent ? (
                  <Clock className="w-4 h-4 text-blue-600 shrink-0 animate-spin" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                )}
                <span className="font-mono text-[11px] text-slate-400 font-bold">
                  #{leg.leg_sequence}
                </span>
                <span className="truncate">
                  {leg.origin_location_id} $\rightarrow$ {leg.destination_location_id}
                </span>
              </div>

              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/80 border border-slate-200 shrink-0 uppercase font-bold">
                {leg.transport_mode.split('_')[0]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
