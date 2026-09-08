import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { ShipmentException } from '@/lib/domain/shipment/types';

interface ExceptionPanelProps {
  exceptions: ShipmentException[];
  onResolveException?: (exceptionId: string) => void;
}

export const ExceptionPanel: React.FC<ExceptionPanelProps> = ({
  exceptions,
  onResolveException
}) => {
  if (exceptions.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Operational Exceptions
          </span>
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>OPERATING HEALTHY</span>
          </span>
        </div>
        <p className="text-xs text-slate-500">Zero active operational exceptions. Journey proceeding according to planned execution.</p>
      </div>
    );
  }

  // Sort: Unresolved first, then CRITICAL -> HIGH -> MEDIUM -> LOW
  const sorted = [...exceptions].sort((a, b) => {
    if (a.is_resolved !== b.is_resolved) return a.is_resolved ? 1 : -1;
    const severityMap: Record<string, number> = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
    return (severityMap[a.severity] ?? 4) - (severityMap[b.severity] ?? 4);
  });

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Operational Exceptions
          </span>
          <h3 className="text-sm font-extrabold text-slate-900 tracking-tight mt-0.5">
            Exception Log ({exceptions.length})
          </h3>
        </div>
      </div>

      <div className="space-y-2.5">
        {sorted.map(ex => {
          const isCritical = ex.severity === 'CRITICAL' || ex.severity === 'HIGH';

          return (
            <div
              key={ex.id}
              className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2 transition-all ${
                ex.is_resolved
                  ? 'bg-slate-50 border-slate-200 opacity-70'
                  : isCritical
                  ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                  : 'bg-amber-50/70 border-amber-200 text-amber-950'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-2">
                  {isCritical ? (
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <span className="text-xs font-bold font-mono">{ex.exception_type}</span>
                    <p className="text-xs mt-0.5 leading-relaxed">{ex.description}</p>
                  </div>
                </div>

                <span className="text-[10px] font-bold px-2 py-0.5 rounded uppercase border font-mono shrink-0">
                  {ex.severity}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px]">
                <span className="text-slate-500 font-mono">
                  {new Date(ex.created_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' })}
                </span>

                {ex.is_resolved ? (
                  <span className="inline-flex items-center gap-1 text-emerald-700 font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Resolved</span>
                  </span>
                ) : (
                  onResolveException && (
                    <button
                      type="button"
                      onClick={() => onResolveException(ex.id)}
                      className="text-xs font-bold text-blue-600 hover:text-blue-700 underline"
                    >
                      Resolve Exception
                    </button>
                  )
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
